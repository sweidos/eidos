// ─────────────────────────────────────────────────────────────────────────────
// Eidos Service Worker
//
// This file is the typed source. The compiled output (eidos-sw.js) is what
// actually gets registered in user apps. Developers never write SW code
// directly — Eidos generates the required behaviour from intent declarations.
// ─────────────────────────────────────────────────────────────────────────────

import { urlBase64ToUint8Array } from './internal/url-base64';

declare const self: ServiceWorkerGlobalScope;

const CACHE_VERSION = 'v1';
const CACHE_PREFIX = 'eidos';

interface ResourceRegistration {
  strategy: 'cache-first' | 'stale-while-revalidate' | 'network-first';
  cacheName: string;
  /** Compiled from the URL pattern sent by the app; undefined for exact-URL registrations. */
  pattern?: RegExp;
  /** Max age in ms; entries older than this are treated as cache misses. */
  maxAge?: number;
  /** Max cache entries (FIFO eviction on cache.put when exceeded). */
  maxEntries?: number;
  /** How long (ms) to wait for the network before falling back to cache. Default: 3000. */
  networkTimeoutMs?: number;
}

const runtimeConfig = {
  resources: new Map<string, ResourceRegistration>(),
  simulateOffline: false,
};

// ── Lifecycle ─────────────────────────────────────────────────────────────────

self.addEventListener('install', () => {
  // Do not call self.skipWaiting() here. The page sends EIDOS_SKIP_WAITING when
  // it is ready to activate the new SW — immediately for the default skipWaiting: true
  // config, or after the user confirms an "app updated" toast for skipWaiting: false.
  // This gives the page control over whether in-flight requests/replays are interrupted.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Purge stale caches from previous versions
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((k) => k.startsWith(CACHE_PREFIX) && !k.endsWith(CACHE_VERSION))
              .map((k) => caches.delete(k)),
          ),
        ),
    ]),
  );
});

// ── Message channel (receives runtime config from the app) ────────────────────

self.addEventListener('message', (event) => {
  const data = event.data as { type: string; [k: string]: unknown };
  if (!data?.type) return;

  switch (data.type) {
    case 'EIDOS_REGISTER_RESOURCE': {
      const url = data.url as string;
      const patternSrc = data.pattern as string | undefined;
      runtimeConfig.resources.set(url, {
        strategy: data.strategy as ResourceRegistration['strategy'],
        cacheName: (data.cacheName as string) ?? `${CACHE_PREFIX}-resources-${CACHE_VERSION}`,
        ...(patternSrc !== undefined && { pattern: new RegExp(patternSrc) }),
        ...(data.maxAge !== undefined && { maxAge: data.maxAge as number }),
        ...(data.maxEntries !== undefined && { maxEntries: data.maxEntries as number }),
        ...(data.networkTimeoutMs !== undefined && {
          networkTimeoutMs: data.networkTimeoutMs as number,
        }),
      });
      event.source?.postMessage({ type: 'EIDOS_RESOURCE_REGISTERED', url });
      break;
    }
    case 'EIDOS_UNREGISTER_RESOURCE': {
      runtimeConfig.resources.delete(data.url as string);
      break;
    }
    case 'EIDOS_SIMULATE_OFFLINE': {
      runtimeConfig.simulateOffline = data.enabled as boolean;
      break;
    }
    case 'EIDOS_CLEAR_CACHE': {
      const targetUrl = data.url as string | undefined;
      // Use per-resource cacheName if registered; fall back to default bucket
      const reg = targetUrl ? runtimeConfig.resources.get(targetUrl) : undefined;
      const cacheName = reg?.cacheName ?? `${CACHE_PREFIX}-resources-${CACHE_VERSION}`;
      caches.open(cacheName).then(async (cache) => {
        if (targetUrl) {
          const keys = await cache.keys();
          const isCrossOrigin = targetUrl.startsWith('http');
          await Promise.all(
            keys
              .filter((req) => {
                const reqUrl = req.url;
                const p = new URL(reqUrl).pathname;
                if (reg?.pattern) {
                  // Cross-origin patterns compile from absolute URL; test against full URL.
                  // Same-origin patterns compile from pathname; test against pathname.
                  return reg.pattern.test(isCrossOrigin ? reqUrl : p);
                }
                return isCrossOrigin ? reqUrl === targetUrl : p === targetUrl;
              })
              .map((req) => cache.delete(req)),
          );
        } else {
          await cache.keys().then((keys) => Promise.all(keys.map((k) => cache.delete(k))));
        }
        notifyClients({ type: 'EIDOS_CACHE_CLEARED', url: targetUrl });
      });
      break;
    }
    case 'EIDOS_SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'EIDOS_PING':
      event.source?.postMessage({ type: 'EIDOS_PONG' });
      break;
    case 'EIDOS_CACHE_VAPID_KEY': {
      // Persisted to IDB (not just memory) so pushsubscriptionchange can
      // resubscribe even after the SW has been restarted.
      idbSet('vapidPublicKey', data.key as string);
      break;
    }
  }
});

// ── Fetch interception ────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = event.request.url;
  const pathname = new URL(requestUrl).pathname;

  // Fast path: try full URL (cross-origin) then pathname (same-origin) — O(1)
  let reg = runtimeConfig.resources.get(requestUrl) ?? runtimeConfig.resources.get(pathname);

  // Slow path: pattern match — iterate registrations with compiled regexes
  if (!reg) {
    for (const [key, registration] of runtimeConfig.resources) {
      if (!registration.pattern) continue;
      // Cross-origin patterns are keyed by absolute URL; match against full request URL.
      // Same-origin patterns are keyed by pathname; match against pathname only.
      const target = key.startsWith('http') ? requestUrl : pathname;
      if (registration.pattern.test(target)) {
        reg = registration;
        break;
      }
    }
  }

  if (!reg) return;

  if (reg.strategy === 'stale-while-revalidate' && !runtimeConfig.simulateOffline) {
    // Pass event so SWR can call event.waitUntil() on background revalidation
    event.respondWith(staleWhileRevalidate(event, event.request, pathname, reg));
    return;
  }

  event.respondWith(handleFetch(event.request, pathname, reg));
});

async function handleFetch(
  request: Request,
  pathname: string,
  reg: ResourceRegistration,
): Promise<Response> {
  if (runtimeConfig.simulateOffline) {
    return serveOffline(request, pathname, reg.cacheName);
  }

  switch (reg.strategy) {
    case 'cache-first':
      return cacheFirst(request, pathname, reg);
    case 'stale-while-revalidate':
      return staleWhileRevalidate(null, request, pathname, reg);
    case 'network-first':
      return networkFirst(request, pathname, reg);
    default:
      return fetch(request);
  }
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

const CACHED_AT_HEADER = 'X-Eidos-Cached-At';

/**
 * Puts a response into cache with a `X-Eidos-Cached-At` timestamp header so
 * the SW can enforce `maxAge` on subsequent cache hits.
 * Caller must pass a clone of the response — `response.body` is consumed here.
 */
async function putCached(cache: Cache, request: Request, response: Response): Promise<void> {
  const headers = new Headers(response.headers);
  headers.set(CACHED_AT_HEADER, String(Date.now()));
  await cache.put(
    request,
    new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    }),
  );
}

/** Returns true if the cached response has exceeded `maxAge`. */
function isExpired(cached: Response, maxAge: number | undefined): boolean {
  if (maxAge === undefined) return false;
  const cachedAt = Number(cached.headers.get(CACHED_AT_HEADER) ?? '0');
  // Entries without a timestamp (pre-patch cache) are treated as fresh to
  // avoid a thundering herd on upgrade — they expire naturally on next put.
  return cachedAt > 0 && Date.now() - cachedAt > maxAge;
}

/** Evicts the oldest (first-inserted) entries when the cache exceeds `maxEntries`. */
async function evictIfNeeded(cache: Cache, maxEntries: number | undefined): Promise<void> {
  if (maxEntries === undefined) return;
  const keys = await cache.keys();
  const overflow = keys.length - maxEntries;
  if (overflow > 0) {
    await Promise.all(keys.slice(0, overflow).map((k) => cache.delete(k)));
  }
}

// ── Strategies ────────────────────────────────────────────────────────────────

async function cacheFirst(
  request: Request,
  pathname: string,
  reg: ResourceRegistration,
): Promise<Response> {
  const { cacheName, maxAge, maxEntries } = reg;
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached && !isExpired(cached, maxAge)) {
    notifyClients({ type: 'EIDOS_CACHE_HIT', url: pathname, strategy: 'cache-first' });
    return cached;
  }

  // Evict expired entry so the cache doesn't grow stale
  if (cached) await cache.delete(request);

  try {
    const response = await fetch(request);
    if (response.ok) {
      await putCached(cache, request, response.clone());
      await evictIfNeeded(cache, maxEntries);
      notifyClients({ type: 'EIDOS_CACHE_UPDATED', url: pathname, strategy: 'cache-first' });
    }
    return response;
  } catch {
    notifyClients({ type: 'EIDOS_NETWORK_ERROR', url: pathname });
    return offlineErrorResponse(pathname);
  }
}

async function staleWhileRevalidate(
  event: FetchEvent | null,
  request: Request,
  pathname: string,
  reg: ResourceRegistration,
): Promise<Response> {
  const { cacheName, maxAge, maxEntries } = reg;
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Treat expired entries as cache misses — don't serve stale beyond maxAge
  const expired = cached ? isExpired(cached, maxAge) : false;
  if (expired) await cache.delete(request);
  const effectiveCached = expired ? null : cached;

  // Always revalidate in background
  const revalidatePromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await putCached(cache, request, response.clone());
        await evictIfNeeded(cache, maxEntries);
        notifyClients({
          type: 'EIDOS_CACHE_UPDATED',
          url: pathname,
          strategy: 'stale-while-revalidate',
        });
      }
      return response;
    })
    .catch(() => {
      notifyClients({
        type: 'EIDOS_NETWORK_ERROR',
        url: pathname,
        strategy: 'stale-while-revalidate',
      });
    });

  if (effectiveCached) {
    // Ensure background revalidation completes even if SW is about to terminate
    event?.waitUntil(revalidatePromise);
    notifyClients({
      type: 'EIDOS_CACHE_HIT',
      url: pathname,
      strategy: 'stale-while-revalidate',
    });
    return effectiveCached;
  }

  const fresh = await revalidatePromise;
  return fresh ?? offlineErrorResponse(pathname);
}

async function networkFirst(
  request: Request,
  pathname: string,
  reg: ResourceRegistration,
): Promise<Response> {
  const { cacheName, maxAge, maxEntries, networkTimeoutMs = 3000 } = reg;
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request, { signal: AbortSignal.timeout(networkTimeoutMs) });
    if (response.ok) {
      await putCached(cache, request, response.clone());
      await evictIfNeeded(cache, maxEntries);
      notifyClients({ type: 'EIDOS_CACHE_UPDATED', url: pathname, strategy: 'network-first' });
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached && !isExpired(cached, maxAge)) {
      notifyClients({ type: 'EIDOS_CACHE_HIT', url: pathname, strategy: 'network-first' });
      return cached;
    }
    notifyClients({ type: 'EIDOS_NETWORK_ERROR', url: pathname });
    return offlineErrorResponse(pathname);
  }
}

async function serveOffline(
  request: Request,
  pathname: string,
  cacheName: string,
): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    notifyClients({
      type: 'EIDOS_CACHE_HIT',
      url: pathname,
      strategy: 'offline-simulation',
      simulated: true,
    });
    return cached;
  }

  return offlineErrorResponse(pathname);
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
  );
}

async function notifyClients(message: Record<string, unknown>): Promise<void> {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach((client) => client.postMessage(message));
}

// ── Background Sync ───────────────────────────────────────────────────────────

interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
  readonly lastChance: boolean;
}

// When the browser fires the 'eidos-queue-replay' sync tag (which the main
// thread registers after queueing a neverLose action), notify all open clients
// so they can call replayQueue(). The actual function execution always runs in
// the main thread — the SW is only responsible for the wake-up signal.
self.addEventListener('sync', (event) => {
  const syncEvent = event as unknown as SyncEvent;
  if (syncEvent.tag === 'eidos-queue-replay') {
    syncEvent.waitUntil(notifyClients({ type: 'EIDOS_BACKGROUND_SYNC' }));
  }
});

// ── Push Notifications ────────────────────────────────────────────────────────

interface PushPayload {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

self.addEventListener('push', (event) => {
  let payload: PushPayload | null = null;
  try {
    payload = event.data?.json() as PushPayload;
  } catch {
    // Malformed/non-JSON payload — nothing to show.
    return;
  }
  if (!payload?.title) return;

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      data: payload.data,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = (event.notification.data ?? {}) as { url?: string; [k: string]: unknown };

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const client = clients[0];
      if (client) {
        client.focus();
        client.postMessage({ type: 'EIDOS_NOTIFICATION_CLICK', data });
        return;
      }
      if (data.url) return self.clients.openWindow(data.url);
    }),
  );
});

// Browser silently rotated the subscription (e.g. expired key). Resubscribe
// with the last-known VAPID key so the app can re-send it to the backend.
self.addEventListener('pushsubscriptionchange', (event) => {
  const psEvent = event as unknown as ExtendableEvent & {
    oldSubscription?: PushSubscription;
    newSubscription?: PushSubscription;
  };

  psEvent.waitUntil(
    (async () => {
      const vapidPublicKey = await idbGet('vapidPublicKey');
      if (!vapidPublicKey) return;

      const subscription =
        psEvent.newSubscription ??
        (await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
        }));

      await notifyClients({
        type: 'EIDOS_SUBSCRIPTION_EXPIRED',
        subscription: subscription.toJSON(),
      });
    })(),
  );
});

// ── Tiny key-value IDB store (survives SW restarts) ─────────────────────────────

const META_DB = 'eidos-sw-meta';
const META_STORE = 'kv';

function openMetaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(META_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(META_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: string): Promise<void> {
  const db = await openMetaDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readwrite');
    tx.objectStore(META_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbGet(key: string): Promise<string | undefined> {
  const db = await openMetaDb();
  const value = await new Promise<string | undefined>((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readonly');
    const req = tx.objectStore(META_STORE).get(key);
    req.onsuccess = () => resolve(req.result as string | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return value;
}

export {};
