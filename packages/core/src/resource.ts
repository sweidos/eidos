import { useEidosStore } from './store';
import { sendToWorker } from './sw-bridge';
import type {
  ResourceConfig,
  ResourceHandle,
  PatternResourceHandle,
  ResourceEntry,
  GeneratedStrategy,
  CacheStrategy,
  WarmCacheResult,
} from './types';

const _registry = new Map<string, ResourceHandle | PatternResourceHandle>();

// ── Request deduplication ─────────────────────────────────────────────────────
// If multiple callers invoke handle.fetch() simultaneously for the same URL,
// only one network request is made. Each caller gets its own cloned Response.
// Keyed by URL; entry is deleted when the request settles.
const _inflightRequests = /* @__PURE__ */ new Map<string, Promise<Response>>();

// ── TanStack Query bridge (optional) ─────────────────────────────────────────
// Set by @sweidos/eidos/query when withEidosQueryClient() is called.
// Lets handle.invalidate() also invalidate the matching TQ cache entry.
type QueryInvalidator = (queryKey: [string, string]) => void;
let _queryInvalidator: QueryInvalidator | null = null;

/** @internal Called by @sweidos/eidos/query. */
export function setQueryInvalidator(fn: QueryInvalidator): void {
  _queryInvalidator = fn;
}

// ── URL pattern helpers ───────────────────────────────────────────────────────

/** Returns true if `url` contains wildcard or :param segments. */
function isPattern(url: string): boolean {
  return url.includes('*') || /:[^/]+/.test(url);
}

/**
 * Converts a URL pattern to a regex source string for SW fetch matching.
 *  `**`     → multi-segment wildcard  (`.+`)
 *  `*`      → single-segment wildcard (`[^/]+`)
 *  `:param` → named single segment    (`[^/]+`)
 *
 * Special regex characters in the pattern (e.g. `.`) are escaped first so
 * they match literally.
 *
 * @example
 *   patternToRegexStr('/api/products/*')      // '^/api/products/[^/]+$'
 *   patternToRegexStr('/api/products/**')     // '^/api/products/.+$'
 *   patternToRegexStr('/api/users/:id')       // '^/api/users/[^/]+$'
 */
function patternToRegexStr(pattern: string): string {
  // Escape all regex-special chars except `*`, `/`, `:` (handled below)
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  return (
    '^' +
    escaped
      .replace(/\*\*/g, '.+') // ** → multi-segment wildcard
      .replace(/\*/g, '[^/]+') // * → single-segment wildcard
      .replace(/:[^/]+/g, '[^/]+') + // :param → single-segment wildcard
    '$'
  );
}

/** Shared setup for resource()/resourcePattern(): strategy derivation, store + SW registration. */
function _register(
  url: string,
  config: ResourceConfig,
): { strategy: GeneratedStrategy; regexStr: string | undefined } {
  const strategy = deriveStrategy(config);
  const regexStr = isPattern(url) ? patternToRegexStr(url) : undefined;

  const entry: ResourceEntry = {
    url,
    config,
    strategy,
    status: 'idle',
    cacheHits: 0,
    cacheMisses: 0,
  };

  useEidosStore.getState().registerResource(url, entry);

  sendToWorker({
    type: 'EIDOS_REGISTER_RESOURCE',
    url,
    strategy: strategy.swStrategy,
    cacheName: strategy.cacheName,
    ...(regexStr !== undefined && { pattern: regexStr }),
  });

  return { strategy, regexStr };
}

function _invalidate(
  url: string,
  strategy: GeneratedStrategy,
  regexStr: string | undefined,
): () => Promise<void> {
  return async () => {
    sendToWorker({ type: 'EIDOS_CLEAR_CACHE', url });
    const cache = await caches.open(strategy.cacheName).catch(() => null);
    if (cache) {
      const keys = await cache.keys();
      const patternRe = regexStr ? new RegExp(regexStr) : null;
      const isCrossOrigin = url.startsWith('http');
      await Promise.all(
        keys
          .filter((r) => {
            const rUrl = r.url;
            const p = new URL(rUrl).pathname;
            if (patternRe) {
              // Cross-origin patterns were compiled from absolute URLs; test full URL.
              return patternRe.test(isCrossOrigin ? rUrl : p);
            }
            return isCrossOrigin ? rUrl === url : rUrl === url || p === url;
          })
          .map((r) => cache.delete(r)),
      );
    }
    // For exact-URL resources update the store entry; patterns don't have a
    // single entry to update (individual URLs are not tracked per-pattern).
    if (!isPattern(url)) {
      useEidosStore.getState().updateResource(url, {
        status: 'stale',
        cachedAt: undefined,
        lastEvent: 'cache-cleared',
        cacheHits: 0,
        cacheMisses: 0,
      });
    }
    // Notify TanStack Query bridge if registered.
    _queryInvalidator?.(['eidos', url]);
  };
}

function _unregister(url: string): () => void {
  return () => {
    _registry.delete(url);
    sendToWorker({ type: 'EIDOS_UNREGISTER_RESOURCE', url });
    useEidosStore.getState().unregisterResource(url);
  };
}

function _warnIfReregisteredWithDifferentConfig(
  url: string,
  existing: ResourceHandle | PatternResourceHandle,
  config: ResourceConfig,
  factoryName: string,
): void {
  if (!import.meta.env.DEV) return;
  const existingCfg = existing.config;
  if (
    existingCfg.offline !== config.offline ||
    existingCfg.strategy !== config.strategy ||
    existingCfg.cacheName !== config.cacheName
  ) {
    console.warn(
      `[eidos] ${factoryName}('${url}') already registered with a different config — returning cached handle. Call handle.unregister() first to re-register.`,
      { registered: existingCfg, ignored: config },
    );
  }
}

// ── resource() ────────────────────────────────────────────────────────────────

/**
 * Registers a concrete-URL resource. For URL patterns (`/api/products/*`,
 * `/api/users/:id`, `**`), use `resourcePattern()` instead.
 */
export function resource<T = unknown>(url: string, config: ResourceConfig): ResourceHandle<T> {
  if (isPattern(url)) {
    throw new Error(
      `[eidos] resource('${url}') is a URL pattern — use resourcePattern('${url}', config) instead. ` +
        `Pattern handles only support invalidate()/unregister(); the SW intercepts matching requests automatically.`,
    );
  }

  if (_registry.has(url)) {
    const existing = _registry.get(url)!;
    _warnIfReregisteredWithDifferentConfig(url, existing, config, 'resource');
    return existing as ResourceHandle<T>;
  }

  const { strategy } = _register(url, config);

  const handle: ResourceHandle<T> = {
    url,
    config,
    strategy,

    fetch: async () => {
      // ── Deduplication: coalesce concurrent fetches for the same URL ─────
      // If a request is already in-flight, piggyback on it and return a clone
      // so each caller gets an independent readable Response body.
      const existing = _inflightRequests.get(url);
      if (existing) return existing.then((r) => r.clone());

      // Store the raw-response promise. All callers (including the primary)
      // receive a clone — the raw response stays unconsumed in the map so
      // any caller arriving while the promise is still pending can clone it.
      const task = _fetchResource(url, config, strategy);
      _inflightRequests.set(url, task);
      // .catch() silences the unhandled-rejection on the cleanup promise;
      // the error still propagates to callers via task.then() below.
      task.finally(() => _inflightRequests.delete(url)).catch(() => {});
      return task.then((r) => r.clone());
    },

    json: async () => {
      const res = await handle.fetch();
      return res.json() as Promise<T>;
    },

    query: () => ({
      queryKey: ['eidos', url] as [string, string],
      queryFn: () => handle.json(),
    }),

    prefetch: async () => {
      await handle.fetch();
    },

    invalidate: _invalidate(url, strategy, undefined),
    unregister: _unregister(url),
  };

  _registry.set(url, handle);
  return handle;
}

// ── resourcePattern() ────────────────────────────────────────────────────────

/**
 * Registers a URL pattern (`/api/products/*`, `/api/users/:id`, `**`). The SW
 * intercepts all matching requests automatically — there is no single URL to
 * fetch/cache directly, so the returned handle only supports cache management
 * (`invalidate`/`unregister`). For a fetchable resource, use `resource()`.
 */
export function resourcePattern(url: string, config: ResourceConfig): PatternResourceHandle {
  if (!isPattern(url)) {
    throw new Error(
      `[eidos] resourcePattern('${url}') is not a URL pattern — use resource('${url}', config) instead.`,
    );
  }

  if (_registry.has(url)) {
    const existing = _registry.get(url)!;
    _warnIfReregisteredWithDifferentConfig(url, existing, config, 'resourcePattern');
    return existing as PatternResourceHandle;
  }

  const { strategy, regexStr } = _register(url, config);

  const handle: PatternResourceHandle = {
    url,
    config,
    strategy,
    invalidate: _invalidate(url, strategy, regexStr),
    unregister: _unregister(url),
  };

  _registry.set(url, handle);
  return handle;
}

// ── _fetchResource ─────────────────────────────────────────────────────────────
// The actual network/cache implementation. Separated from handle.fetch() so the
// deduplication wrapper can store the Promise and share it across concurrent callers.
// Returns the raw (unconsumed) Response — callers MUST .clone() before reading body.
async function _fetchResource(
  url: string,
  config: ResourceConfig,
  strategy: GeneratedStrategy,
): Promise<Response> {
  const store = useEidosStore.getState();
  store.updateResource(url, { status: 'fetching', fetchedAt: Date.now() });

  // Open cache once and reuse across try/catch — avoids a redundant
  // caches.open() call in the error fallback path.
  const cache = await caches.open(strategy.cacheName).catch(() => null);

  try {
    // ── network-first: skip cache check, go straight to network ─────────
    // For cache-first / SWR the cache check below is correct. For
    // network-first, reading cache first and returning early would
    // contradict the strategy — fresh data is the priority.
    if (strategy.swStrategy !== 'network-first') {
      // ── Direct Cache API check ─────────────────────────────────────────
      // We read the cache in the main thread rather than waiting for
      // an async SW postMessage. This gives instant, reliable status
      // updates regardless of SW message timing.
      const cached = cache ? await cache.match(url).catch(() => null) : null;

      // Treat cache as miss if maxAge exceeded
      const current = useEidosStore.getState().resources[url];
      const expired =
        config.maxAge !== undefined &&
        current?.cachedAt !== undefined &&
        Date.now() - current.cachedAt > config.maxAge;

      if (cached && !expired) {
        store.updateResource(url, {
          status: 'fresh',
          lastEvent: 'cache-hit',
          cacheHits: (current?.cacheHits ?? 0) + 1,
        });

        // Background revalidation for SWR (stale-while-revalidate)
        if (strategy.swStrategy === 'stale-while-revalidate') {
          fetch(url, { signal: AbortSignal.timeout(5000) })
            .then(async (resp) => {
              if (resp.ok && cache) {
                await cache.put(url, resp.clone());
                useEidosStore.getState().updateResource(url, {
                  cachedAt: Date.now(),
                  lastEvent: 'cache-updated',
                });
              }
            })
            .catch(() => {
              /* offline or timed out — cached version stays valid */
            });
        }

        return cached;
      }

      // Cache miss (or expired)
      const storeEntry = useEidosStore.getState().resources[url];
      store.updateResource(url, {
        cacheMisses: (storeEntry?.cacheMisses ?? 0) + 1,
      });
    }

    const response = await fetch(url);

    if (response.ok) {
      if (cache) await cache.put(url, response.clone());
      store.updateResource(url, {
        status: 'fresh',
        cachedAt: Date.now(),
        lastEvent: 'cache-updated',
      });
      return response;
    }

    // Non-2xx response (e.g. 503 from offline SW) — update status and throw
    // so callers get a proper error instead of a plain-object body they can't use.
    store.updateResource(url, { status: response.status === 503 ? 'offline' : 'error' });

    // Check if the SW tagged this as an offline response
    const isOffline = response.headers.get('X-Eidos-Offline') === 'true';
    throw new Error(
      isOffline
        ? `offline: no cached response for ${url}`
        : `${response.status} ${response.statusText}`,
    );
  } catch (err) {
    // Network failure — try cache one more time as fallback
    const fallback = cache ? await cache.match(url).catch(() => null) : null;

    if (fallback) {
      const current = useEidosStore.getState().resources[url];
      store.updateResource(url, {
        status: 'fresh',
        lastEvent: 'cache-hit',
        cacheHits: (current?.cacheHits ?? 0) + 1,
      });
      return fallback;
    }

    store.updateResource(url, { status: 'error' });
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Strategy derivation — intent → deterministic caching strategy
// ─────────────────────────────────────────────────────────────────────────────

function deriveStrategy(config: ResourceConfig): GeneratedStrategy {
  const explicit = config.strategy;
  if (config.offline) return buildStrategy(explicit ?? 'stale-while-revalidate', config.cacheName);
  return buildStrategy(explicit ?? 'network-first', config.cacheName);
}

// Strategy display names — always included (tiny, used by devtools).
const STRATEGY_NAMES: Record<CacheStrategy, string> = {
  'stale-while-revalidate': 'StaleWhileRevalidate',
  'cache-first': 'CacheFirst',
  'network-first': 'NetworkFirst',
};

// Heavy descriptive strings — stripped from production bundles by Vite's
// import.meta.env.DEV dead-code elimination. Only the names above ship in prod.
type StrategyDevInfo = Pick<GeneratedStrategy, 'reasoning' | 'behavior' | 'equivalentCode'>;
const _STRATEGY_DEV_META: Record<CacheStrategy, StrategyDevInfo> = {
  'stale-while-revalidate': {
    reasoning:
      'offline: true signals resilience. SWR returns cached data instantly while revalidating in the background — the best tradeoff between speed and freshness for offline-capable resources.',
    behavior: [
      'Cache hit → return immediately, kick off background revalidation',
      'Cache miss → fetch from network, cache the response, return it',
      'Offline → return cached version if available, 503 if not',
      'Reconnect → next request triggers a background refresh',
    ],
    equivalentCode: `// Workbox equivalent
new StaleWhileRevalidate({
  cacheName: 'eidos-resources-v1',
  plugins: [new ExpirationPlugin({ maxEntries: 60 })],
})`,
  },
  'cache-first': {
    reasoning:
      'cache-first maximises speed and offline availability. Network is consulted only on cache miss. Best for static or infrequently-updated data.',
    behavior: [
      'Cache hit → return immediately, no network request made',
      'Cache miss → fetch from network, cache the response, return it',
      'Offline → return cached version, 503 if cache is empty',
      'Cache never expires unless explicitly invalidated',
    ],
    equivalentCode: `// Workbox equivalent
new CacheFirst({
  cacheName: 'eidos-resources-v1',
  plugins: [new ExpirationPlugin({ maxEntries: 60 })],
})`,
  },
  'network-first': {
    reasoning:
      'network-first prioritises fresh data. Cache acts as a safety net when offline. Best for frequently-updated resources where stale data causes problems.',
    behavior: [
      'Always try network first',
      'Network success → update cache, return fresh response',
      'Network failure → fall back to cached version',
      'Offline with empty cache → return 503 error response',
    ],
    equivalentCode: `// Workbox equivalent
new NetworkFirst({
  cacheName: 'eidos-resources-v1',
  networkTimeoutSeconds: 3,
})`,
  },
};

function buildStrategy(swStrategy: CacheStrategy, cacheName?: string): GeneratedStrategy {
  const meta = _STRATEGY_DEV_META[swStrategy];
  return {
    name: STRATEGY_NAMES[swStrategy],
    swStrategy,
    cacheName: cacheName ?? 'eidos-resources-v1',
    // reasoning + behavior are rendered by the playground UI from live ResourceEntry objects —
    // keep them in all builds. equivalentCode is a static code block only used in DEV tools.
    reasoning: meta.reasoning,
    behavior: meta.behavior,
    equivalentCode: import.meta.env.DEV ? meta.equivalentCode : '',
  };
}

// ── warmCache ─────────────────────────────────────────────────────────────────

/**
 * Bulk-prefetch an array of resource handles concurrently, warming the cache
 * for each one. Useful on login / app init when you know which resources the
 * user will need offline.
 *
 * Pattern handles (containing `*`, `**`, or `:param`) are silently skipped —
 * they match multiple URLs so there is no single URL to prefetch.
 *
 * @example
 * import { warmCache } from '@sweidos/eidos'
 *
 * // In EidosProvider's onReady, or after login:
 * const { warmed, failed } = await warmCache([products, userProfile, settings])
 */
export async function warmCache(handles: ResourceHandle[]): Promise<WarmCacheResult> {
  const results = await Promise.allSettled(handles.map((h) => h.prefetch()));
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r) => r.reason);

  if (import.meta.env.DEV && errors.length > 0) {
    console.warn(`[eidos] warmCache: ${errors.length} handle(s) failed to prefetch`, errors);
  }

  return {
    warmed: results.filter((r) => r.status === 'fulfilled').length,
    failed: errors.length,
    errors,
  };
}
