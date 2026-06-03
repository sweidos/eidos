import { useEidosStore } from './store';
let _registration = null;
export function getSwRegistration() {
    return _registration;
}
export async function registerServiceWorker(swPath) {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
        useEidosStore.getState().setSwStatus('unsupported');
        return;
    }
    const store = useEidosStore.getState();
    store.setSwStatus('registering');
    try {
        _registration = await navigator.serviceWorker.register(swPath, { scope: '/' });
        await waitForActivation(_registration);
        store.setSwStatus('active');
        // Receive messages from SW
        navigator.serviceWorker.addEventListener('message', onSwMessage);
        // Track online/offline
        window.addEventListener('online', () => store.setOnline(true));
        window.addEventListener('offline', () => store.setOnline(false));
        // resource() is called at module scope — before the SW is ready.
        // Re-send every registration now that the SW is active so it can
        // start intercepting fetches immediately.
        flushResourceRegistrations();
    }
    catch (err) {
        store.setSwStatus('error', String(err));
    }
}
function waitForActivation(reg) {
    return new Promise((resolve) => {
        if (reg.active) {
            resolve();
            return;
        }
        const sw = reg.installing ?? reg.waiting;
        if (!sw) {
            resolve();
            return;
        }
        sw.addEventListener('statechange', function handler() {
            if (sw.state === 'activated') {
                sw.removeEventListener('statechange', handler);
                resolve();
            }
        });
    });
}
export function sendToWorker(message) {
    const sw = _registration?.active;
    if (sw)
        sw.postMessage(message);
}
function onSwMessage(event) {
    const data = event.data;
    if (!data?.type)
        return;
    const store = useEidosStore.getState();
    const { type, url } = data;
    if (!url)
        return;
    switch (type) {
        case 'EIDOS_CACHE_HIT': {
            const current = store.resources[url];
            store.updateResource(url, {
                status: 'fresh',
                lastEvent: 'cache-hit',
                cacheHits: (current?.cacheHits ?? 0) + 1,
            });
            break;
        }
        case 'EIDOS_CACHE_UPDATED': {
            store.updateResource(url, {
                status: 'fresh',
                lastEvent: 'cache-updated',
                cachedAt: Date.now(),
            });
            break;
        }
        case 'EIDOS_NETWORK_ERROR': {
            store.updateResource(url, {
                status: 'error',
                lastEvent: 'network-error',
            });
            break;
        }
    }
}
export function setOfflineSimulation(enabled) {
    sendToWorker({ type: 'EIDOS_SIMULATE_OFFLINE', enabled });
    useEidosStore.getState().setOnline(!enabled);
}
// Sends EIDOS_REGISTER_RESOURCE for every resource already in the store.
// Called once after the SW activates to handle the common case where
// resource() is declared at module scope before the SW is ready.
function flushResourceRegistrations() {
    const { resources } = useEidosStore.getState();
    Object.values(resources).forEach((entry) => {
        sendToWorker({
            type: 'EIDOS_REGISTER_RESOURCE',
            url: entry.url,
            strategy: entry.strategy.swStrategy,
            cacheName: entry.strategy.cacheName,
        });
    });
}
