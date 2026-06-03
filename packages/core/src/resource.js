import { useEidosStore } from './store';
import { sendToWorker } from './sw-bridge';
// Module-level registry survives across re-renders
const _registry = new Map();
export function resource(url, config) {
    if (_registry.has(url)) {
        return _registry.get(url);
    }
    const strategy = deriveStrategy(url, config);
    const entry = {
        url,
        config,
        strategy,
        status: 'idle',
        cacheHits: 0,
        cacheMisses: 0,
    };
    // Persist to Zustand store (drives devtools)
    useEidosStore.getState().registerResource(url, entry);
    // Inform the service worker
    sendToWorker({
        type: 'EIDOS_REGISTER_RESOURCE',
        url,
        strategy: strategy.swStrategy,
        cacheName: strategy.cacheName,
    });
    const handle = {
        url,
        config,
        strategy,
        fetch: async () => {
            useEidosStore.getState().updateResource(url, {
                status: 'fetching',
                fetchedAt: Date.now(),
            });
            try {
                const res = await fetch(url);
                useEidosStore.getState().updateResource(url, {
                    status: res.ok ? 'fresh' : 'error',
                });
                return res;
            }
            catch (err) {
                useEidosStore.getState().updateResource(url, { status: 'error' });
                throw err;
            }
        },
        json: async () => {
            const res = await handle.fetch();
            return res.json();
        },
        query: () => ({
            queryKey: ['eidos', url],
            queryFn: () => handle.json(),
        }),
        prefetch: async () => {
            await handle.fetch();
        },
        invalidate: async () => {
            sendToWorker({ type: 'EIDOS_CLEAR_CACHE', url });
            useEidosStore.getState().updateResource(url, {
                status: 'stale',
                cachedAt: undefined,
                lastEvent: 'cache-cleared',
            });
        },
    };
    _registry.set(url, handle);
    return handle;
}
// ─────────────────────────────────────────────────────────────────────────────
// Strategy derivation — this is the core value proposition.
// Intent → deterministic caching strategy.
// ─────────────────────────────────────────────────────────────────────────────
function deriveStrategy(url, config) {
    const explicit = config.strategy;
    if (config.offline) {
        // offline: true → prefer freshness-with-resilience over pure speed
        return buildStrategy(explicit ?? 'stale-while-revalidate', url);
    }
    return buildStrategy(explicit ?? 'network-first', url);
}
const STRATEGY_META = {
    'stale-while-revalidate': {
        name: 'StaleWhileRevalidate',
        reasoning: 'offline: true signals resilience. SWR returns cached data instantly while revalidating in the background — the best tradeoff between speed and freshness for offline-capable resources.',
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
        reasoning: 'cache-first maximises speed and offline availability. Network is consulted only on cache miss. Best for static or infrequently-updated data.',
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
        reasoning: 'network-first prioritises fresh data. Cache acts as a safety net when offline. Best for frequently-updated resources where stale data causes problems.',
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
function buildStrategy(swStrategy, _url) {
    return {
        ...STRATEGY_META[swStrategy],
        swStrategy,
        cacheName: 'eidos-resources-v1',
    };
}
