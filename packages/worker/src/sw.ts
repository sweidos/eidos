// ─────────────────────────────────────────────────────────────────────────────
// Eidos Service Worker
//
// This file is the typed source. The compiled output (eidos-sw.js) is what
// actually gets registered in user apps. Developers never write SW code
// directly — Eidos generates the required behaviour from intent declarations.
// ─────────────────────────────────────────────────────────────────────────────

declare const self: ServiceWorkerGlobalScope

const CACHE_VERSION = 'v1'
const CACHE_PREFIX = 'eidos'

interface ResourceRegistration {
  strategy: 'cache-first' | 'stale-while-revalidate' | 'network-first'
  cacheName: string
  /** Compiled from the URL pattern sent by the app; undefined for exact-URL registrations. */
  pattern?: RegExp
}

const runtimeConfig = {
  resources: new Map<string, ResourceRegistration>(),
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
      // Purge stale caches from previous versions
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

// ── Message channel (receives runtime config from the app) ────────────────────

self.addEventListener('message', (event) => {
  const data = event.data as { type: string; [k: string]: unknown }
  if (!data?.type) return

  switch (data.type) {
    case 'EIDOS_REGISTER_RESOURCE': {
      const url = data.url as string
      const patternSrc = data.pattern as string | undefined
      runtimeConfig.resources.set(url, {
        strategy: data.strategy as ResourceRegistration['strategy'],
        cacheName: (data.cacheName as string) ?? `${CACHE_PREFIX}-resources-${CACHE_VERSION}`,
        ...(patternSrc !== undefined && { pattern: new RegExp(patternSrc) }),
      })
      event.source?.postMessage({ type: 'EIDOS_RESOURCE_REGISTERED', url })
      break
    }
    case 'EIDOS_UNREGISTER_RESOURCE': {
      runtimeConfig.resources.delete(data.url as string)
      break
    }
    case 'EIDOS_SIMULATE_OFFLINE': {
      runtimeConfig.simulateOffline = data.enabled as boolean
      break
    }
    case 'EIDOS_CLEAR_CACHE': {
      const targetUrl = data.url as string | undefined
      // Use per-resource cacheName if registered; fall back to default bucket
      const reg = targetUrl ? runtimeConfig.resources.get(targetUrl) : undefined
      const cacheName = reg?.cacheName ?? `${CACHE_PREFIX}-resources-${CACHE_VERSION}`
      caches.open(cacheName).then(async (cache) => {
        if (targetUrl) {
          const keys = await cache.keys()
          const isCrossOrigin = targetUrl.startsWith('http')
          await Promise.all(
            keys
              .filter((req) => {
                const reqUrl = req.url
                const p = new URL(reqUrl).pathname
                if (reg?.pattern) {
                  // Cross-origin patterns compile from absolute URL; test against full URL.
                  // Same-origin patterns compile from pathname; test against pathname.
                  return reg.pattern.test(isCrossOrigin ? reqUrl : p)
                }
                return isCrossOrigin ? reqUrl === targetUrl : p === targetUrl
              })
              .map((req) => cache.delete(req)),
          )
        } else {
          await cache.keys().then((keys) => Promise.all(keys.map((k) => cache.delete(k))))
        }
        notifyClients({ type: 'EIDOS_CACHE_CLEARED', url: targetUrl })
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

  const requestUrl = event.request.url
  const pathname = new URL(requestUrl).pathname

  // Fast path: try full URL (cross-origin) then pathname (same-origin) — O(1)
  let reg = runtimeConfig.resources.get(requestUrl) ?? runtimeConfig.resources.get(pathname)

  // Slow path: pattern match — iterate registrations with compiled regexes
  if (!reg) {
    for (const [key, registration] of runtimeConfig.resources) {
      if (!registration.pattern) continue
      // Cross-origin patterns are keyed by absolute URL; match against full request URL.
      // Same-origin patterns are keyed by pathname; match against pathname only.
      const target = key.startsWith('http') ? requestUrl : pathname
      if (registration.pattern.test(target)) {
        reg = registration
        break
      }
    }
  }

  if (!reg) return

  if (reg.strategy === 'stale-while-revalidate' && !runtimeConfig.simulateOffline) {
    // Pass event so SWR can call event.waitUntil() on background revalidation
    event.respondWith(staleWhileRevalidate(event, event.request, pathname, reg.cacheName))
    return
  }

  event.respondWith(handleFetch(event.request, pathname, reg))
})

async function handleFetch(
  request: Request,
  pathname: string,
  reg: ResourceRegistration,
): Promise<Response> {
  if (runtimeConfig.simulateOffline) {
    return serveOffline(request, pathname, reg.cacheName)
  }

  switch (reg.strategy) {
    case 'cache-first':
      return cacheFirst(request, pathname, reg.cacheName)
    case 'stale-while-revalidate':
      return staleWhileRevalidate(null, request, pathname, reg.cacheName)
    case 'network-first':
      return networkFirst(request, pathname, reg.cacheName)
    default:
      return fetch(request)
  }
}

// ── Strategies ────────────────────────────────────────────────────────────────

async function cacheFirst(
  request: Request,
  pathname: string,
  cacheName: string,
): Promise<Response> {
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

async function staleWhileRevalidate(
  event: FetchEvent | null,
  request: Request,
  pathname: string,
  cacheName: string,
): Promise<Response> {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  // Always revalidate in background
  const revalidatePromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone())
        notifyClients({
          type: 'EIDOS_CACHE_UPDATED',
          url: pathname,
          strategy: 'stale-while-revalidate',
        })
      }
      return response
    })
    .catch(() => {
      notifyClients({ type: 'EIDOS_NETWORK_ERROR', url: pathname, strategy: 'stale-while-revalidate' })
    })

  if (cached) {
    // Ensure background revalidation completes even if SW is about to terminate
    event?.waitUntil(revalidatePromise)
    notifyClients({
      type: 'EIDOS_CACHE_HIT',
      url: pathname,
      strategy: 'stale-while-revalidate',
    })
    return cached
  }

  const fresh = await revalidatePromise
  return fresh ?? offlineErrorResponse(pathname)
}

async function networkFirst(
  request: Request,
  pathname: string,
  cacheName: string,
): Promise<Response> {
  const cache = await caches.open(cacheName)

  try {
    // 3s timeout matches the networkTimeoutSeconds advertised in the strategy
    // metadata — slow/stalled requests fall back to cache instead of hanging.
    const response = await fetch(request, { signal: AbortSignal.timeout(3000) })
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

async function serveOffline(
  request: Request,
  pathname: string,
  cacheName: string,
): Promise<Response> {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  if (cached) {
    notifyClients({ type: 'EIDOS_CACHE_HIT', url: pathname, strategy: 'offline-simulation', simulated: true })
    return cached
  }

  return offlineErrorResponse(pathname)
}

function offlineErrorResponse(pathname: string): Response {
  return new Response(
    JSON.stringify({
      error: 'offline',
      message: `No cached response available for ${pathname}`,
      eidos: true,
    }),
    {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'X-Eidos-Offline': 'true',
      },
    },
  )
}

async function notifyClients(message: Record<string, unknown>): Promise<void> {
  const clients = await self.clients.matchAll({ includeUncontrolled: true })
  clients.forEach((client) => client.postMessage(message))
}

export {}
