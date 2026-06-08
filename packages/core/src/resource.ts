import { useEidosStore } from './store'
import { sendToWorker } from './sw-bridge'
import type {
  ResourceConfig,
  ResourceHandle,
  ResourceEntry,
  GeneratedStrategy,
  CacheStrategy,
} from './types'

const _registry = new Map<string, ResourceHandle>()

export function resource<T = unknown>(
  url: string,
  config: ResourceConfig,
): ResourceHandle<T> {
  if (_registry.has(url)) {
    if (import.meta.env.DEV) {
      const existing = _registry.get(url)!
      const existingCfg = existing.config
      if (
        existingCfg.offline !== config.offline ||
        existingCfg.strategy !== config.strategy ||
        existingCfg.cacheName !== config.cacheName
      ) {
        console.warn(
          `[eidos] resource('${url}') already registered with a different config — returning cached handle. Call resource.unregister() first to re-register.`,
          { registered: existingCfg, ignored: config },
        )
      }
    }
    return _registry.get(url) as ResourceHandle<T>
  }

  const strategy = deriveStrategy(url, config)

  const entry: ResourceEntry = {
    url,
    config,
    strategy,
    status: 'idle',
    cacheHits: 0,
    cacheMisses: 0,
  }

  useEidosStore.getState().registerResource(url, entry)

  sendToWorker({
    type: 'EIDOS_REGISTER_RESOURCE',
    url,
    strategy: strategy.swStrategy,
    cacheName: strategy.cacheName,
  })

  const handle: ResourceHandle<T> = {
    url,
    config,
    strategy,

    fetch: async () => {
      const store = useEidosStore.getState()
      store.updateResource(url, { status: 'fetching', fetchedAt: Date.now() })

      // Open cache once and reuse across try/catch — avoids a redundant
      // caches.open() call in the error fallback path.
      const cache = await caches.open(strategy.cacheName).catch(() => null)

      try {
        // ── network-first: skip cache check, go straight to network ───
        // For cache-first / SWR the cache check below is correct. For
        // network-first, reading cache first and returning early would
        // contradict the strategy — fresh data is the priority.
        if (strategy.swStrategy !== 'network-first') {
          // ── Direct Cache API check ───────────────────────────────────
          // We read the cache in the main thread rather than waiting for
          // an async SW postMessage. This gives instant, reliable status
          // updates regardless of SW message timing.
          const cached = cache ? await cache.match(url).catch(() => null) : null

          // Treat cache as miss if maxAge exceeded
          const current = useEidosStore.getState().resources[url]
          const expired =
            config.maxAge !== undefined &&
            current?.cachedAt !== undefined &&
            Date.now() - current.cachedAt > config.maxAge

          if (cached && !expired) {
            store.updateResource(url, {
              status: 'fresh',
              lastEvent: 'cache-hit',
              cacheHits: (current?.cacheHits ?? 0) + 1,
            })

            // Background revalidation for SWR (stale-while-revalidate)
            if (strategy.swStrategy === 'stale-while-revalidate') {
              fetch(url)
                .then(async (resp) => {
                  if (resp.ok && cache) {
                    await cache.put(url, resp.clone())
                    useEidosStore.getState().updateResource(url, {
                      cachedAt: Date.now(),
                      lastEvent: 'cache-updated',
                    })
                  }
                })
                .catch(() => {
                  /* offline — cached version stays valid */
                })
            }

            return cached
          }

          // Cache miss (or expired)
          const storeEntry = useEidosStore.getState().resources[url]
          store.updateResource(url, {
            cacheMisses: (storeEntry?.cacheMisses ?? 0) + 1,
          })
        }

        const response = await fetch(url)

        if (response.ok) {
          if (cache) await cache.put(url, response.clone())
          store.updateResource(url, {
            status: 'fresh',
            cachedAt: Date.now(),
            lastEvent: 'cache-updated',
          })
          return response
        }

        // Non-2xx response (e.g. 503 from offline SW) — update status and throw
        // so callers get a proper error instead of a plain-object body they can't use.
        store.updateResource(url, { status: response.status === 503 ? 'offline' : 'error' })

        // Check if the SW tagged this as an offline response
        const isOffline = response.headers.get('X-Eidos-Offline') === 'true'
        throw new Error(
          isOffline ? `offline: no cached response for ${url}` : `${response.status} ${response.statusText}`,
        )
      } catch (err) {
        // Network failure — try cache one more time as fallback
        const fallback = cache ? await cache.match(url).catch(() => null) : null

        if (fallback) {
          const current = useEidosStore.getState().resources[url]
          store.updateResource(url, {
            status: 'fresh',
            lastEvent: 'cache-hit',
            cacheHits: (current?.cacheHits ?? 0) + 1,
          })
          return fallback
        }

        store.updateResource(url, { status: 'error' })
        throw err
      }
    },

    json: async () => {
      const res = await handle.fetch()
      return res.json() as Promise<T>
    },

    query: () => ({
      queryKey: ['eidos', url] as [string, string],
      queryFn: () => handle.json(),
    }),

    prefetch: async () => {
      await handle.fetch()
    },

    invalidate: async () => {
      sendToWorker({ type: 'EIDOS_CLEAR_CACHE', url })
      const cache = await caches.open(strategy.cacheName).catch(() => null)
      if (cache) {
        const keys = await cache.keys()
        await Promise.all(
          keys
            .filter((r) => r.url === url || new URL(r.url).pathname === url)
            .map((r) => cache.delete(r)),
        )
      }
      useEidosStore.getState().updateResource(url, {
        status: 'stale',
        cachedAt: undefined,
        lastEvent: 'cache-cleared',
        cacheHits: 0,
        cacheMisses: 0,
      })
    },

    unregister: () => {
      _registry.delete(url)
      sendToWorker({ type: 'EIDOS_UNREGISTER_RESOURCE', url })
      useEidosStore.getState().unregisterResource(url)
    },
  }

  _registry.set(url, handle)
  return handle
}

// ─────────────────────────────────────────────────────────────────────────────
// Strategy derivation — intent → deterministic caching strategy
// ─────────────────────────────────────────────────────────────────────────────

function deriveStrategy(url: string, config: ResourceConfig): GeneratedStrategy {
  const explicit = config.strategy
  if (config.offline) return buildStrategy(explicit ?? 'stale-while-revalidate', url, config.cacheName)
  return buildStrategy(explicit ?? 'network-first', url, config.cacheName)
}

const STRATEGY_META: Record<CacheStrategy, Omit<GeneratedStrategy, 'swStrategy' | 'cacheName'>> = {
  'stale-while-revalidate': {
    name: 'StaleWhileRevalidate',
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
    name: 'CacheFirst',
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
    name: 'NetworkFirst',
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
}

function buildStrategy(swStrategy: CacheStrategy, _url: string, cacheName?: string): GeneratedStrategy {
  return {
    ...STRATEGY_META[swStrategy],
    swStrategy,
    cacheName: cacheName ?? 'eidos-resources-v1',
  }
}
