//#region src/internal/url-base64.ts
/** Decodes a base64url string (e.g. a VAPID public key) into raw bytes. */
function urlBase64ToUint8Array(base64Url) {
	const base64 = (base64Url + "=".repeat((4 - base64Url.length % 4) % 4)).replace(/-/g, "+").replace(/_/g, "/");
	const raw = atob(base64);
	return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
//#endregion
//#region src/sw.ts
var CACHE_VERSION = "v1";
var CACHE_PREFIX = "eidos";
var runtimeConfig = {
	resources: /* @__PURE__ */ new Map(),
	simulateOffline: false
};
self.addEventListener("install", () => {});
self.addEventListener("activate", (event) => {
	event.waitUntil(Promise.all([self.clients.claim(), caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && !k.endsWith(CACHE_VERSION)).map((k) => caches.delete(k))))]));
});
self.addEventListener("message", (event) => {
	const data = event.data;
	if (!data?.type) return;
	switch (data.type) {
		case "EIDOS_REGISTER_RESOURCE": {
			const url = data.url;
			const patternSrc = data.pattern;
			runtimeConfig.resources.set(url, {
				strategy: data.strategy,
				cacheName: data.cacheName ?? `${CACHE_PREFIX}-resources-${CACHE_VERSION}`,
				...patternSrc !== void 0 && { pattern: new RegExp(patternSrc) },
				...data.maxAge !== void 0 && { maxAge: data.maxAge },
				...data.maxEntries !== void 0 && { maxEntries: data.maxEntries },
				...data.networkTimeoutMs !== void 0 && { networkTimeoutMs: data.networkTimeoutMs }
			});
			event.source?.postMessage({
				type: "EIDOS_RESOURCE_REGISTERED",
				url
			});
			break;
		}
		case "EIDOS_UNREGISTER_RESOURCE":
			runtimeConfig.resources.delete(data.url);
			break;
		case "EIDOS_SIMULATE_OFFLINE":
			runtimeConfig.simulateOffline = data.enabled;
			break;
		case "EIDOS_CLEAR_CACHE": {
			const targetUrl = data.url;
			const reg = targetUrl ? runtimeConfig.resources.get(targetUrl) : void 0;
			const cacheName = reg?.cacheName ?? `${CACHE_PREFIX}-resources-${CACHE_VERSION}`;
			caches.open(cacheName).then(async (cache) => {
				if (targetUrl) {
					const keys = await cache.keys();
					const isCrossOrigin = targetUrl.startsWith("http");
					await Promise.all(keys.filter((req) => {
						const reqUrl = req.url;
						const p = new URL(reqUrl).pathname;
						if (reg?.pattern) return reg.pattern.test(isCrossOrigin ? reqUrl : p);
						return isCrossOrigin ? reqUrl === targetUrl : p === targetUrl;
					}).map((req) => cache.delete(req)));
				} else await cache.keys().then((keys) => Promise.all(keys.map((k) => cache.delete(k))));
				notifyClients({
					type: "EIDOS_CACHE_CLEARED",
					url: targetUrl
				});
			});
			break;
		}
		case "EIDOS_SKIP_WAITING":
			self.skipWaiting();
			break;
		case "EIDOS_PING":
			event.source?.postMessage({ type: "EIDOS_PONG" });
			break;
		case "EIDOS_CACHE_VAPID_KEY":
			idbSet("vapidPublicKey", data.key);
			break;
	}
});
self.addEventListener("fetch", (event) => {
	if (event.request.method !== "GET") return;
	const requestUrl = event.request.url;
	const pathname = new URL(requestUrl).pathname;
	let reg = runtimeConfig.resources.get(requestUrl) ?? runtimeConfig.resources.get(pathname);
	if (!reg) for (const [key, registration] of runtimeConfig.resources) {
		if (!registration.pattern) continue;
		const target = key.startsWith("http") ? requestUrl : pathname;
		if (registration.pattern.test(target)) {
			reg = registration;
			break;
		}
	}
	if (!reg) return;
	if (reg.strategy === "stale-while-revalidate" && !runtimeConfig.simulateOffline) {
		event.respondWith(staleWhileRevalidate(event, event.request, pathname, reg));
		return;
	}
	event.respondWith(handleFetch(event.request, pathname, reg));
});
async function handleFetch(request, pathname, reg) {
	if (runtimeConfig.simulateOffline) return serveOffline(request, pathname, reg.cacheName);
	switch (reg.strategy) {
		case "cache-first": return cacheFirst(request, pathname, reg);
		case "stale-while-revalidate": return staleWhileRevalidate(null, request, pathname, reg);
		case "network-first": return networkFirst(request, pathname, reg);
		default: return fetch(request);
	}
}
var CACHED_AT_HEADER = "X-Eidos-Cached-At";
/**
* Puts a response into cache with a `X-Eidos-Cached-At` timestamp header so
* the SW can enforce `maxAge` on subsequent cache hits.
* Caller must pass a clone of the response — `response.body` is consumed here.
*/
async function putCached(cache, request, response) {
	const headers = new Headers(response.headers);
	headers.set(CACHED_AT_HEADER, String(Date.now()));
	await cache.put(request, new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	}));
}
/** Returns true if the cached response has exceeded `maxAge`. */
function isExpired(cached, maxAge) {
	if (maxAge === void 0) return false;
	const cachedAt = Number(cached.headers.get(CACHED_AT_HEADER) ?? "0");
	return cachedAt > 0 && Date.now() - cachedAt > maxAge;
}
/** Evicts the oldest (first-inserted) entries when the cache exceeds `maxEntries`. */
async function evictIfNeeded(cache, maxEntries) {
	if (maxEntries === void 0) return;
	const keys = await cache.keys();
	const overflow = keys.length - maxEntries;
	if (overflow > 0) await Promise.all(keys.slice(0, overflow).map((k) => cache.delete(k)));
}
async function cacheFirst(request, pathname, reg) {
	const { cacheName, maxAge, maxEntries } = reg;
	const cache = await caches.open(cacheName);
	const cached = await cache.match(request);
	if (cached && !isExpired(cached, maxAge)) {
		notifyClients({
			type: "EIDOS_CACHE_HIT",
			url: pathname,
			strategy: "cache-first"
		});
		return cached;
	}
	if (cached) await cache.delete(request);
	try {
		const response = await fetch(request);
		if (response.ok) {
			await putCached(cache, request, response.clone());
			await evictIfNeeded(cache, maxEntries);
			notifyClients({
				type: "EIDOS_CACHE_UPDATED",
				url: pathname,
				strategy: "cache-first"
			});
		}
		return response;
	} catch {
		notifyClients({
			type: "EIDOS_NETWORK_ERROR",
			url: pathname
		});
		return offlineErrorResponse(pathname);
	}
}
async function staleWhileRevalidate(event, request, pathname, reg) {
	const { cacheName, maxAge, maxEntries } = reg;
	const cache = await caches.open(cacheName);
	const cached = await cache.match(request);
	const expired = cached ? isExpired(cached, maxAge) : false;
	if (expired) await cache.delete(request);
	const effectiveCached = expired ? null : cached;
	const revalidatePromise = fetch(request).then(async (response) => {
		if (response.ok) {
			await putCached(cache, request, response.clone());
			await evictIfNeeded(cache, maxEntries);
			notifyClients({
				type: "EIDOS_CACHE_UPDATED",
				url: pathname,
				strategy: "stale-while-revalidate"
			});
		}
		return response;
	}).catch(() => {
		notifyClients({
			type: "EIDOS_NETWORK_ERROR",
			url: pathname,
			strategy: "stale-while-revalidate"
		});
	});
	if (effectiveCached) {
		event?.waitUntil(revalidatePromise);
		notifyClients({
			type: "EIDOS_CACHE_HIT",
			url: pathname,
			strategy: "stale-while-revalidate"
		});
		return effectiveCached;
	}
	return await revalidatePromise ?? offlineErrorResponse(pathname);
}
async function networkFirst(request, pathname, reg) {
	const { cacheName, maxAge, maxEntries, networkTimeoutMs = 3e3 } = reg;
	const cache = await caches.open(cacheName);
	try {
		const response = await fetch(request, { signal: AbortSignal.timeout(networkTimeoutMs) });
		if (response.ok) {
			await putCached(cache, request, response.clone());
			await evictIfNeeded(cache, maxEntries);
			notifyClients({
				type: "EIDOS_CACHE_UPDATED",
				url: pathname,
				strategy: "network-first"
			});
		}
		return response;
	} catch {
		const cached = await cache.match(request);
		if (cached && !isExpired(cached, maxAge)) {
			notifyClients({
				type: "EIDOS_CACHE_HIT",
				url: pathname,
				strategy: "network-first"
			});
			return cached;
		}
		notifyClients({
			type: "EIDOS_NETWORK_ERROR",
			url: pathname
		});
		return offlineErrorResponse(pathname);
	}
}
async function serveOffline(request, pathname, cacheName) {
	const cached = await (await caches.open(cacheName)).match(request);
	if (cached) {
		notifyClients({
			type: "EIDOS_CACHE_HIT",
			url: pathname,
			strategy: "offline-simulation",
			simulated: true
		});
		return cached;
	}
	return offlineErrorResponse(pathname);
}
function offlineErrorResponse(pathname) {
	return new Response(JSON.stringify({
		error: "offline",
		message: `No cached response available for ${pathname}`,
		eidos: true
	}), {
		status: 503,
		headers: {
			"Content-Type": "application/json",
			"X-Eidos-Offline": "true"
		}
	});
}
async function notifyClients(message) {
	(await self.clients.matchAll({ includeUncontrolled: true })).forEach((client) => client.postMessage(message));
}
self.addEventListener("sync", (event) => {
	const syncEvent = event;
	if (syncEvent.tag === "eidos-queue-replay") syncEvent.waitUntil(notifyClients({ type: "EIDOS_BACKGROUND_SYNC" }));
});
self.addEventListener("push", (event) => {
	let payload = null;
	try {
		payload = event.data?.json();
	} catch {
		return;
	}
	if (!payload?.title) return;
	event.waitUntil(self.registration.showNotification(payload.title, {
		body: payload.body,
		icon: payload.icon,
		badge: payload.badge,
		tag: payload.tag,
		data: payload.data
	}));
});
self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const data = event.notification.data ?? {};
	event.waitUntil(self.clients.matchAll({
		type: "window",
		includeUncontrolled: true
	}).then((clients) => {
		const client = clients[0];
		if (client) {
			client.focus();
			client.postMessage({
				type: "EIDOS_NOTIFICATION_CLICK",
				data
			});
			return;
		}
		if (data.url) return self.clients.openWindow(data.url);
	}));
});
self.addEventListener("pushsubscriptionchange", (event) => {
	const psEvent = event;
	psEvent.waitUntil((async () => {
		const vapidPublicKey = await idbGet("vapidPublicKey");
		if (!vapidPublicKey) return;
		await notifyClients({
			type: "EIDOS_SUBSCRIPTION_EXPIRED",
			subscription: (psEvent.newSubscription ?? await self.registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
			})).toJSON()
		});
	})());
});
var META_DB = "eidos-sw-meta";
var META_STORE = "kv";
function openMetaDb() {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(META_DB, 1);
		req.onupgradeneeded = () => req.result.createObjectStore(META_STORE);
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}
async function idbSet(key, value) {
	const db = await openMetaDb();
	await new Promise((resolve, reject) => {
		const tx = db.transaction(META_STORE, "readwrite");
		tx.objectStore(META_STORE).put(value, key);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
	db.close();
}
async function idbGet(key) {
	const db = await openMetaDb();
	const value = await new Promise((resolve, reject) => {
		const req = db.transaction(META_STORE, "readonly").objectStore(META_STORE).get(key);
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
	db.close();
	return value;
}
//#endregion
