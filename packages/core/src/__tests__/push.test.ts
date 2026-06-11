import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isPushSupported,
  getPushUnsupportedReason,
  getPushPermissionState,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentPushSubscription,
  registerPushHandlers,
} from '../push';
import { registerServiceWorker, _resetSwBridgeForTests } from '../sw-bridge';

// Base64url-encoded 65-byte uncompressed EC point (dummy, just needs to decode).
const VAPID_KEY = 'B' + 'A'.repeat(86);

function makeSubscription(overrides: Partial<PushSubscription> = {}): PushSubscription {
  return {
    endpoint: 'https://push.example/abc',
    options: { applicationServerKey: new Uint8Array(65).buffer },
    toJSON: () => ({ endpoint: 'https://push.example/abc', keys: { p256dh: 'x', auth: 'y' } }),
    unsubscribe: vi.fn().mockResolvedValue(true),
    ...overrides,
  } as unknown as PushSubscription;
}

function stubBrowserSupport(
  opts: { pushManager?: boolean; notification?: boolean; ua?: string } = {},
) {
  const { pushManager = true, notification = true, ua = 'Mozilla/5.0' } = opts;

  Object.defineProperty(globalThis, 'window', {
    value: globalThis.window ?? {},
    configurable: true,
    writable: true,
  });
  if (pushManager) (globalThis.window as unknown as Record<string, unknown>).PushManager = class {};
  else delete (globalThis.window as unknown as Record<string, unknown>).PushManager;

  if (notification) {
    (globalThis as unknown as { Notification: unknown }).Notification = {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    };
    (globalThis.window as unknown as Record<string, unknown>).Notification = (
      globalThis as unknown as { Notification: unknown }
    ).Notification;
  } else {
    delete (globalThis as unknown as Record<string, unknown>).Notification;
    delete (globalThis.window as unknown as Record<string, unknown>).Notification;
  }

  Object.defineProperty(globalThis.navigator, 'userAgent', { value: ua, configurable: true });
  Object.defineProperty(globalThis.navigator, 'standalone', {
    value: undefined,
    configurable: true,
  });
}

describe('push support detection', () => {
  beforeEach(() => stubBrowserSupport());

  it('reports supported when serviceWorker, PushManager, Notification exist', () => {
    expect(isPushSupported()).toBe(true);
    expect(getPushUnsupportedReason()).toBeNull();
  });

  it('reports no-push-api when PushManager missing', () => {
    stubBrowserSupport({ pushManager: false });
    expect(isPushSupported()).toBe(false);
    expect(getPushUnsupportedReason()).toBe('no-push-api');
  });

  it('reports ios-not-installed on iOS Safari outside a PWA', () => {
    stubBrowserSupport({ ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' });
    expect(getPushUnsupportedReason()).toBe('ios-not-installed');
    expect(isPushSupported()).toBe(false);
  });

  it('getPushPermissionState reflects Notification.permission when supported', () => {
    expect(getPushPermissionState()).toBe('default');
  });

  it('getPushPermissionState returns unsupported when push unavailable', () => {
    stubBrowserSupport({ pushManager: false });
    expect(getPushPermissionState()).toBe('unsupported');
  });
});

describe('subscribeToPush', () => {
  beforeEach(() => {
    stubBrowserSupport();
    _resetSwBridgeForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns unsupported when push APIs are unavailable', async () => {
    stubBrowserSupport({ pushManager: false });
    const result = await subscribeToPush({ vapidPublicKey: VAPID_KEY });
    expect(result.status).toBe('unsupported');
  });

  it('returns denied when permission is not granted', async () => {
    (
      globalThis as unknown as { Notification: { requestPermission: () => Promise<string> } }
    ).Notification.requestPermission = vi.fn().mockResolvedValue('denied');
    const result = await subscribeToPush({ vapidPublicKey: VAPID_KEY });
    expect(result.status).toBe('denied');
  });

  it('returns sw-not-ready when no SW registration exists', async () => {
    const result = await subscribeToPush({ vapidPublicKey: VAPID_KEY });
    expect(result.status).toBe('sw-not-ready');
  });

  it('subscribes and calls onSubscribe on success', async () => {
    const subscription = makeSubscription();
    const pushManager = {
      getSubscription: vi.fn().mockResolvedValue(null),
      subscribe: vi.fn().mockResolvedValue(subscription),
    };
    await registerWithPushManager(pushManager);

    const onSubscribe = vi.fn();
    const result = await subscribeToPush({ vapidPublicKey: VAPID_KEY, onSubscribe });

    expect(result.status).toBe('subscribed');
    expect(pushManager.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true }),
    );
    expect(onSubscribe).toHaveBeenCalledWith(subscription.toJSON());
  });

  it('resubscribes when an existing subscription has a stale VAPID key', async () => {
    const stale = makeSubscription({
      options: { applicationServerKey: new Uint8Array(65).buffer },
    });
    const fresh = makeSubscription();
    const pushManager = {
      getSubscription: vi.fn().mockResolvedValue(stale),
      subscribe: vi.fn().mockResolvedValue(fresh),
    };
    await registerWithPushManager(pushManager);

    const result = await subscribeToPush({ vapidPublicKey: VAPID_KEY });

    expect(stale.unsubscribe).toHaveBeenCalled();
    expect(pushManager.subscribe).toHaveBeenCalled();
    expect(result.status).toBe('subscribed');
  });
});

describe('unsubscribeFromPush / getCurrentPushSubscription', () => {
  beforeEach(() => {
    stubBrowserSupport();
    _resetSwBridgeForTests();
  });

  it('returns null subscription when no SW registered', async () => {
    expect(await getCurrentPushSubscription()).toBeNull();
    await expect(unsubscribeFromPush()).resolves.toBeUndefined();
  });

  it('unsubscribes the active subscription', async () => {
    const subscription = makeSubscription();
    const pushManager = {
      getSubscription: vi.fn().mockResolvedValue(subscription),
      subscribe: vi.fn(),
    };
    await registerWithPushManager(pushManager);

    expect(await getCurrentPushSubscription()).toEqual(subscription.toJSON());
    await unsubscribeFromPush();
    expect(subscription.unsubscribe).toHaveBeenCalled();
  });
});

describe('registerPushHandlers', () => {
  beforeEach(() => {
    stubBrowserSupport();
    _resetSwBridgeForTests();
  });

  it('routes notification-click and subscription-expiry messages from the SW', async () => {
    await registerServiceWorker('/eidos-sw.js');

    const onNotificationClick = vi.fn();
    const onSubscriptionExpired = vi.fn();
    registerPushHandlers({ onNotificationClick, onSubscriptionExpired });

    const handler = (
      globalThis.navigator.serviceWorker.addEventListener as ReturnType<typeof vi.fn>
    ).mock.calls.find(([type]) => type === 'message')?.[1] as (e: MessageEvent) => void;

    handler?.({
      data: { type: 'EIDOS_NOTIFICATION_CLICK', data: { url: '/orders/1' } },
    } as MessageEvent);
    handler?.({
      data: { type: 'EIDOS_SUBSCRIPTION_EXPIRED', subscription: { endpoint: 'x' } },
    } as MessageEvent);

    expect(onNotificationClick).toHaveBeenCalledWith({ url: '/orders/1' });
    expect(onSubscriptionExpired).toHaveBeenCalledWith({ endpoint: 'x' });
  });
});

// Helper: drives registerServiceWorker so getSwRegistration() returns a
// registration backed by the given pushManager mock.
async function registerWithPushManager(pushManager: unknown): Promise<void> {
  (globalThis.navigator.serviceWorker.register as ReturnType<typeof vi.fn>).mockResolvedValue({
    active: { postMessage: vi.fn(), state: 'activated' },
    installing: null,
    waiting: null,
    addEventListener: vi.fn(),
    pushManager,
  });
  await registerServiceWorker('/eidos-sw.js');
}
