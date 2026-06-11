/**
 * @sweidos/eidos/push
 *
 * Web Push integration. Framework-agnostic: register click/expiry handlers
 * once at app init (any tab), and trigger subscription from a user gesture.
 *
 * @example
 * ```ts
 * import { registerPushHandlers, subscribeToPush } from '@sweidos/eidos/push'
 *
 * // App init — every tab, no permission prompt
 * registerPushHandlers({
 *   onNotificationClick: (data) => router.push(data.url),
 *   onSubscriptionExpired: (sub) => fetch('/api/push-subscribe', { method: 'POST', body: JSON.stringify(sub) }),
 * })
 *
 * // User gesture (button click)
 * const result = await subscribeToPush({
 *   vapidPublicKey: import.meta.env.VITE_EIDOS_VAPID_PUBLIC_KEY,
 *   onSubscribe: (sub) => fetch('/api/push-subscribe', { method: 'POST', body: JSON.stringify(sub) }),
 * })
 * ```
 */
// Imported from the main package (external at build-time) so push.js shares
// the same sw-bridge module instance as the host app's main bundle.
import { getSwRegistration, sendToWorker, registerPushCallbacks } from '@sweidos/eidos';
import { urlBase64ToUint8Array } from './internal/url-base64';

export interface PushHandlers {
  /** Fired when the user clicks a notification while a tab is open. */
  onNotificationClick?: (data: unknown) => void;
  /** Fired when the browser silently rotates the push subscription. Re-send to your backend. */
  onSubscriptionExpired?: (sub: PushSubscriptionJSON) => void;
}

export interface PushConfig {
  /** Base64url-encoded VAPID public key. Generate with `npx @sweidos/eidos generate-vapid-keys`. */
  vapidPublicKey: string;
  /** Called with the new subscription right after a successful subscribe. Send this to your backend. */
  onSubscribe?: (sub: PushSubscriptionJSON) => void;
}

export type PushResult =
  | { status: 'subscribed'; subscription: PushSubscriptionJSON }
  | { status: 'denied' | 'unsupported' | 'sw-not-ready' | 'error'; error?: unknown };

export type PushUnsupportedReason = 'no-push-api' | 'ios-not-installed' | null;

// ── Support detection ──────────────────────────────────────────────────────────

/** Why push is unavailable on this device, or null if it's supported. */
export function getPushUnsupportedReason(): PushUnsupportedReason {
  if (typeof window === 'undefined') return 'no-push-api';

  const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
  // iOS Safari exposes PushManager even outside an installed PWA, but
  // subscribe() throws unless the app was added to the home screen.
  if (isIos && !(navigator as unknown as { standalone?: boolean }).standalone) {
    return 'ios-not-installed';
  }

  if (
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) {
    return 'no-push-api';
  }

  return null;
}

export function isPushSupported(): boolean {
  return getPushUnsupportedReason() === null;
}

export function getPushPermissionState(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

// ── Handlers (call at app init, any tab) ─────────────────────────────────────────

export function registerPushHandlers(handlers: PushHandlers): void {
  registerPushCallbacks(handlers);
}

// ── Subscription (call from a user gesture) ───────────────────────────────────────

export async function subscribeToPush(config: PushConfig): Promise<PushResult> {
  if (!isPushSupported()) return { status: 'unsupported' };

  let permission: NotificationPermission;
  try {
    permission = await Notification.requestPermission();
  } catch (error) {
    return { status: 'error', error };
  }
  if (permission !== 'granted') return { status: 'denied' };

  const registration = getSwRegistration();
  if (!registration) return { status: 'sw-not-ready' };

  try {
    const applicationServerKey = urlBase64ToUint8Array(config.vapidPublicKey);
    let subscription = await registration.pushManager.getSubscription();

    if (subscription && !subscriptionKeyMatches(subscription, config.vapidPublicKey)) {
      await subscription.unsubscribe();
      subscription = null;
    }

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      });
    }

    // Let the SW persist the key so it can resubscribe after pushsubscriptionchange,
    // even if this tab/SW instance is later terminated.
    sendToWorker({ type: 'EIDOS_CACHE_VAPID_KEY', key: config.vapidPublicKey });

    const json = subscription.toJSON() as PushSubscriptionJSON;
    config.onSubscribe?.(json);
    return { status: 'subscribed', subscription: json };
  } catch (error) {
    return { status: 'error', error };
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  const registration = getSwRegistration();
  if (!registration) return;
  const subscription = await registration.pushManager.getSubscription();
  await subscription?.unsubscribe();
}

export async function getCurrentPushSubscription(): Promise<PushSubscriptionJSON | null> {
  const registration = getSwRegistration();
  if (!registration) return null;
  const subscription = await registration.pushManager.getSubscription();
  return subscription ? (subscription.toJSON() as PushSubscriptionJSON) : null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

function uint8ArrayToUrlBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Compares an existing subscription's key against the configured VAPID public key. */
function subscriptionKeyMatches(subscription: PushSubscription, vapidPublicKey: string): boolean {
  const key = subscription.options.applicationServerKey;
  if (!key) return false;
  const existing = uint8ArrayToUrlBase64(new Uint8Array(key));
  const expected = uint8ArrayToUrlBase64(urlBase64ToUint8Array(vapidPublicKey));
  return existing === expected;
}
