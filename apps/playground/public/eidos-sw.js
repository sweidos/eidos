// eidos-sw.js — Eidos Service Worker v0.1.0
// Two responsibilities:
//   1. App shell caching — dashboard works offline after first visit
//   2. API resource caching — strategies declared via resource()

const CACHE_VERSION = 'v1'
const SHELL_CACHE   = `eidos-shell-${CACHE_VERSION}`
const API_CACHE     = `eidos-resources-${CACHE_VERSION}`

const runtimeConfig = {
  resources: new Map(),   // pathname → { strategy, cacheName }
  simulateOffline: false,
}

// ── Install ───────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

// ── Activate ──────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('eidos') && k !== SHELL_CACHE && k !== API_CACHE)
            .map((k) => caches.delete(k))
        )
      ),
    ])
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
        cacheName: data.cacheName ?? API_CACHE,
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
      caches.open(API_CACHE).then(async (cache) => {
        if (data.url) {
          const keys = await cache.keys()
          await Promise.all(
            keys.filter((r) => new URL(r.url).pathname === data.url).map((r) => cache.delete(r))
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

  const url      = new URL(event.request.url)
  const pathname = url.pathname

  // 1. Registered API resources
  const reg = runtimeConfig.resources.get(pathname)
  if (reg) {
    event.respondWith(handleApiResource(event.request, pathname, reg))
    return
  }

  // 2. App shell — same-origin non-API assets (HTML, JS, CSS, fonts, images)
  //    Stale-while-revalidate: serve from cache instantly, refresh in background.
  if (url.origin === self.location.origin && !pathname.startsWith('/api/')) {
    event.respondWith(appShell(event.request))
  }
})

// ── App shell strategy ────────────────────────────────────────────────────────

async function appShell(request) {
  const cache  = await caches.open(SHELL_CACHE)
  const cached = await cache.match(request)

  const refresh = fetch(request)
    .then((resp) => {
      if (resp.ok) cache.put(request, resp.clone())
      return resp
    })
    .catch(() => null)

  if (cached) {
    refresh // update in background
    return cached
  }

  const fresh = await refresh
  return fresh ?? new Response(
    '<html><body><h2>Offline</h2><p>Visit this page while online first.</p></body></html>',
    { status: 503, headers: { 'Content-Type': 'text/html' } }
  )
}

// ── API caching strategies ────────────────────────────────────────────────────

async function handleApiResource(request, pathname, reg) {
  if (runtimeConfig.simulateOffline) return serveOffline(request, pathname, reg.cacheName)

  switch (reg.strategy) {
    case 'cache-first':            return cacheFirst(request, pathname, reg.cacheName)
    case 'stale-while-revalidate': return staleWhileRevalidate(request, pathname, reg.cacheName)
    case 'network-first':          return networkFirst(request, pathname, reg.cacheName)
    default:                       return fetch(request)
  }
}

async function cacheFirst(request, pathname, cacheName) {
  const cache  = await caches.open(cacheName)
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
  const cache  = await caches.open(cacheName)
  const cached = await cache.match(request)

  const revalidate = fetch(request)
    .then(async (resp) => {
      if (resp.ok) {
        await cache.put(request, resp.clone())
        notifyClients({ type: 'EIDOS_CACHE_UPDATED', url: pathname, strategy: 'stale-while-revalidate' })
      }
      return resp
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
  const cache  = await caches.open(cacheName)
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
    { status: 503, headers: { 'Content-Type': 'application/json', 'X-Eidos-Offline': 'true' } }
  )
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true })
  clients.forEach((c) => c.postMessage(message))
}
