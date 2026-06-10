import { useEidosStore } from './store';

let _registration: ServiceWorkerRegistration | null = null;
// Messages sent before the SW activates are buffered here and flushed once
// the SW is ready. Covers resource registrations, cache clears, offline
// simulation — anything sent at module scope before EidosProvider mounts.
let _pendingMessages: Record<string, unknown>[] = [];

export function getSwRegistration() {
  return _registration;
}

export async function registerServiceWorker(swPath: string): Promise<void> {
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

    flushPendingMessages();
  } catch (err) {
    store.setSwStatus('error', String(err));
  }
}

function waitForActivation(reg: ServiceWorkerRegistration): Promise<void> {
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

    // Resolve after 10s regardless — another tab may be blocking activation
    const timer = setTimeout(resolve, 10_000);

    sw.addEventListener('statechange', function handler() {
      if (sw.state === 'activated') {
        clearTimeout(timer);
        sw.removeEventListener('statechange', handler);
        resolve();
      }
    });
  });
}

export function sendToWorker(message: Record<string, unknown>): void {
  const sw = _registration?.active;
  if (sw) {
    sw.postMessage(message);
  } else {
    _pendingMessages.push(message);
  }
}

let _bgSyncHandler: (() => void) | null = null;

export function registerBgSyncHandler(fn: () => void): void {
  _bgSyncHandler = fn;
}

export function isBgSyncSupported(): boolean {
  try {
    return (
      typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator &&
      _registration !== null &&
      'sync' in _registration
    );
  } catch {
    return false;
  }
}

function onSwMessage(event: MessageEvent): void {
  const data = event.data as { type: string; url?: string; strategy?: string };
  if (!data?.type) return;

  const store = useEidosStore.getState();
  const { type, url } = data;

  if (type === 'EIDOS_BACKGROUND_SYNC') {
    _bgSyncHandler?.();
    return;
  }

  if (!url) return;

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

export function setOfflineSimulation(enabled: boolean): void {
  sendToWorker({ type: 'EIDOS_SIMULATE_OFFLINE', enabled });
  useEidosStore.getState().setOnline(!enabled);
}

function flushPendingMessages(): void {
  const sw = _registration?.active;
  if (!sw) return;
  for (const msg of _pendingMessages) sw.postMessage(msg);
  _pendingMessages = [];
}
