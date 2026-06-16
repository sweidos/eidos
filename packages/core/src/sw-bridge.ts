import { useEidosStore } from './store';

let _registration: ServiceWorkerRegistration | null = null;
// Messages sent before the SW activates are buffered here and flushed once
// the SW is ready. Covers resource registrations, cache clears, offline
// simulation — anything sent at module scope before EidosProvider mounts.
let _pendingMessages: Record<string, unknown>[] = [];

export function getSwRegistration() {
  return _registration;
}

interface SwRegistrationOptions {
  skipWaiting: boolean;
  onUpdateAvailable?: (registration: ServiceWorkerRegistration) => void;
}

export async function registerServiceWorker(
  swPath: string,
  options: SwRegistrationOptions = { skipWaiting: true },
): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    useEidosStore.getState().setSwStatus('unsupported');
    if (import.meta.env.DEV) {
      console.warn(
        '[eidos] Service workers are not supported in this context. ' +
          'Offline support and SW-side caching are disabled. ' +
          'Service workers require a modern browser with a secure context (HTTPS or localhost).',
      );
    }
    return;
  }

  // Warn early when the browser will reject registration regardless — saves a round-trip
  // and gives a clearer message than the browser's generic SecurityError.
  if (import.meta.env.DEV && typeof window !== 'undefined' && !window.isSecureContext) {
    console.warn(
      `[eidos] Service workers require a secure context (HTTPS or localhost). ` +
        `initEidos() was called on "${window.location.origin}" — ` +
        `the browser will silently disable offline support. ` +
        `Switch to localhost for development or deploy to HTTPS.`,
    );
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

    // Handle SW updates — the new SW waits for EIDOS_SKIP_WAITING from the page.
    _watchForUpdate(_registration, options);
  } catch (err) {
    store.setSwStatus('error', String(err));
    if (import.meta.env.DEV) {
      const errMsg = String(err).toLowerCase();
      const isNotFound =
        errMsg.includes('404') ||
        errMsg.includes('bad http response') ||
        errMsg.includes('not found') ||
        errMsg.includes('failed to load');
      if (isNotFound) {
        console.warn(
          `[eidos] Service worker file not found at "${swPath}". ` +
            `Did you add the eidos() plugin to your vite.config.ts? ` +
            `If you're not using Vite, copy the file manually: ` +
            `node_modules/@sweidos/eidos/dist/eidos-sw.js → public/eidos-sw.js`,
        );
      } else {
        console.warn(`[eidos] Service worker registration failed: ${err}`);
      }
    }
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

interface PushHandlers {
  onNotificationClick?: (data: unknown) => void;
  onSubscriptionExpired?: (sub: PushSubscriptionJSON) => void;
}

let _pushHandlers: PushHandlers = {};

export function registerPushCallbacks(handlers: PushHandlers): void {
  _pushHandlers = handlers;
}

function onSwMessage(event: MessageEvent): void {
  const data = event.data as {
    type: string;
    url?: string;
    strategy?: string;
    data?: unknown;
    subscription?: unknown;
  };
  if (!data?.type) return;

  const store = useEidosStore.getState();
  const { type, url } = data;

  if (type === 'EIDOS_BACKGROUND_SYNC') {
    _bgSyncHandler?.();
    return;
  }

  if (type === 'EIDOS_NOTIFICATION_CLICK') {
    _pushHandlers.onNotificationClick?.(data.data);
    return;
  }

  if (type === 'EIDOS_SUBSCRIPTION_EXPIRED') {
    _pushHandlers.onSubscriptionExpired?.(data.subscription as PushSubscriptionJSON);
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

function _watchForUpdate(reg: ServiceWorkerRegistration, options: SwRegistrationOptions): void {
  const notify = (r: ServiceWorkerRegistration) => {
    if (options.skipWaiting) {
      r.waiting?.postMessage({ type: 'EIDOS_SKIP_WAITING' });
    } else {
      options.onUpdateAvailable?.(r);
    }
  };

  // A SW may already be waiting on startup (installed across a previous page load
  // but blocked because another tab held the old SW active).
  if (reg.waiting && navigator.serviceWorker.controller) {
    notify(reg);
  }

  reg.addEventListener('updatefound', () => {
    const newSw = reg.installing;
    if (!newSw) return;
    newSw.addEventListener('statechange', () => {
      if (newSw.state === 'installed' && navigator.serviceWorker.controller) {
        notify(reg);
      }
    });
  });
}

/**
 * Tells the waiting service worker to activate immediately, then reloads the page.
 * Only relevant when `skipWaiting: false` — call this after the user confirms
 * a "reload to update" toast shown via `onUpdateAvailable`.
 */
export function triggerSwUpdate(): void {
  _registration?.waiting?.postMessage({ type: 'EIDOS_SKIP_WAITING' });
}

/** Test-only: resets module-level state between test cases. */
export function _resetSwBridgeForTests(): void {
  _registration = null;
  _pendingMessages = [];
  _bgSyncHandler = null;
  _pushHandlers = {};
}
