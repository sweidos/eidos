// eidos-sw.js — Eidos Service Worker v0.1.0
// Auto-generated runtime. Developers never write this file directly.
// Edit packages/worker/src/sw.ts and run `pnpm build:worker` to regenerate.

const CACHE_VERSION = 'v1'
const CACHE_PREFIX = 'eidos'

const runtimeConfig = {
  resources: new Map(),
  simulateOffline: false,
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith(CACHE_PREFIX) && !k.endsWith(CACHE_VERSION))
            .map((k) => caches.delete(k)),
        ),
      ),
    ]),
  )
})

// ── Message channel ───────────────────────────────────────────────────────────

self.addEventListener('message', (event) => {
  const data = event.data
  if (!data?.type) return

  switch (data.type) {
    case 'EIDOS_REGISTER_RESOURCE':
      runtimeConfig.resources.set(data.url, {
        strategy: data.strategy,
        cacheName: data.cacheName ?? `${CACHE_PREFIX}-resources-${CACHE_VERSION}`,
      })
      event.source?.postMessage({ type: 'EIDOS_RESOURCE_REGISTERED', url: data.url })
      break

    case 'EIDOS_UNREGISTER_RESOURCE':
      runtimeConfig.resources.delete(data.url)
      break

    case 'EIDOS_SIMULATE_OFFLINE':
      runtimeConfig.simulateOffline = data.enabled
      break

    case 'EIDOS_CLEAR_CACHE': {
      const cacheName = `${CACHE_PREFIX}-resources-${CACHE_VERSION}`
      caches.open(cacheName).then(async (cache) => {
        if (data.url) {
          const keys = await cache.keys()
          await Promise.all(
            keys
              .filter((req) => new URL(req.url).pathname === data.url)
              .map((req) => cache.delete(req)),
          )
        } else {
          const keys = await cache.keys()
          await Promise.all(keys.map((k) => cache.delete(k)))
        }
        notifyClients({ type: 'EIDOS_CACHE_CLEARED', url: data.url })
      })
      break
    }

    case 'EIDOS_PING':
      event.source?.postMessage({ type: 'EIDOS_PONG' })
      break
  }
})

// ── Fetch interception ────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const pathname = new URL(event.request.url).pathname
  const reg = runtimeConfig.resources.get(pathname)
  if (!reg) return

  event.respondWith(handleFetch(event.request, pathname, reg))
})

async function handleFetch(request, pathname, reg) {
  if (runtimeConfig.simulateOffline) {
    return serveOffline(request, pathname, reg.cacheName)
  }
  switch (reg.strategy) {
    case 'cache-first':         return cacheFirst(request, pathname, reg.cacheName)
    case 'stale-while-revalidate': return staleWhileRevalidate(request, pathname, reg.cacheName)
    case 'network-first':       return networkFirst(request, pathname, reg.cacheName)
    default:                    return fetch(request)
  }
}

// ── Strategies ────────────────────────────────────────────────────────────────

async function cacheFirst(request, pathname, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) {
    notifyClients({ type: 'EIDOS_CACHE_HIT', url: pathname, strategy: 'cache-first' })
    return cached
  }
  try {
    const response = await fetch(request)
    if (response.ok) {
      await cache.put(request, response.clone())
      notifyClients({ type: 'EIDOS_CACHE_UPDATED', url: pathname, strategy: 'cache-first' })
    }
    return response
  } catch {
    notifyClients({ type: 'EIDOS_NETWORK_ERROR', url: pathname })
    return offlineErrorResponse(pathname)
  }
}

async function staleWhileRevalidate(request, pathname, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  const revalidate = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone())
        notifyClients({ type: 'EIDOS_CACHE_UPDATED', url: pathname, strategy: 'stale-while-revalidate' })
      }
      return response
    })
    .catch(() => {
      notifyClients({ type: 'EIDOS_NETWORK_ERROR', url: pathname })
      return null
    })

  if (cached) {
    notifyClients({ type: 'EIDOS_CACHE_HIT', url: pathname, strategy: 'stale-while-revalidate' })
    return cached
  }

  const fresh = await revalidate
  return fresh ?? offlineErrorResponse(pathname)
}

async function networkFirst(request, pathname, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response.ok) {
      await cache.put(request, response.clone())
      notifyClients({ type: 'EIDOS_CACHE_UPDATED', url: pathname, strategy: 'network-first' })
    }
    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) {
      notifyClients({ type: 'EIDOS_CACHE_HIT', url: pathname, strategy: 'network-first' })
      return cached
    }
    notifyClients({ type: 'EIDOS_NETWORK_ERROR', url: pathname })
    return offlineErrorResponse(pathname)
  }
}

async function serveOffline(request, pathname, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) {
    notifyClients({ type: 'EIDOS_CACHE_HIT', url: pathname, strategy: 'offline-simulation', simulated: true })
    return cached
  }
  return offlineErrorResponse(pathname)
}

function offlineErrorResponse(pathname) {
  return new Response(
    JSON.stringify({ error: 'offline', message: `No cached response for ${pathname}`, eidos: true }),
    { status: 503, headers: { 'Content-Type': 'application/json', 'X-Eidos-Offline': 'true' } },
  )
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true })
  clients.forEach((client) => client.postMessage(message))
}
