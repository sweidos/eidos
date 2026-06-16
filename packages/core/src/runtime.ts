import { registerServiceWorker, registerBgSyncHandler } from './sw-bridge';
import { replayQueue } from './action';
import { useEidosStore } from './store';
import { idbGetQueue, idbQueueStorage } from './idb';
import { _getQueueStorage } from './queue-storage';
import { subscribeReplayOnReconnect } from './replay';
import { subscribeQueueSync } from './queue-sync';
import { CURRENT_QUEUE_SCHEMA_VERSION } from './types';
import type { ActionQueueItem, ReliabilityStats } from './types';

// Items persisted before idempotencyKey/schemaVersion existed (v1) are migrated
// in place: assign a fresh idempotencyKey and bump schemaVersion. A fresh key on
// first replay after upgrade is correct — these items were never sent with one.
async function migrateQueueItem(item: ActionQueueItem): Promise<ActionQueueItem> {
  if (item.schemaVersion === CURRENT_QUEUE_SCHEMA_VERSION && item.idempotencyKey) {
    return item;
  }
  const migrated: ActionQueueItem = {
    ...item,
    schemaVersion: CURRENT_QUEUE_SCHEMA_VERSION,
    idempotencyKey: item.idempotencyKey ?? crypto.randomUUID(),
  };
  const storage = _getQueueStorage() ?? idbQueueStorage;
  await storage
    .update(migrated.id, {
      schemaVersion: migrated.schemaVersion,
      idempotencyKey: migrated.idempotencyKey,
    })
    .catch(() => {
      // Best-effort persist — item still gets the migrated shape in memory this session
    });
  return migrated;
}

export interface EidosConfig {
  /** Path to the eidos service worker. Defaults to '/eidos-sw.js'. */
  swPath?: string;
  /** Automatically replay the action queue on reconnect. Default: true. */
  autoReplay?: boolean;
  /**
   * When `true` (default), the new service worker activates immediately when an
   * update is available — matching the pre-v2.3 behaviour. Set to `false` to opt
   * into a toast-then-reload pattern: `onUpdateAvailable` fires instead and you
   * call `triggerSwUpdate()` when the user confirms the reload.
   *
   * Note: avoid calling `triggerSwUpdate()` while `neverLose` actions are mid-replay
   * — the BroadcastChannel/Web-Locks replay coordination survives SW activation, but
   * triggering an update during an active replay pass is unnecessary churn.
   */
  skipWaiting?: boolean;
  /**
   * Called when a new service worker version has installed and is waiting to
   * activate. Use this to show a "reload to update" toast. Only fires when
   * `skipWaiting: false`; with the default `skipWaiting: true` the update
   * applies automatically and this callback is never needed.
   *
   * Call `triggerSwUpdate()` when the user confirms the reload — it tells the
   * waiting SW to activate, then reload the page.
   */
  onUpdateAvailable?: (registration: ServiceWorkerRegistration) => void;
  /**
   * Opt-in reliability telemetry. Called with a snapshot of cumulative
   * `neverLose` queue outcome counters (`ReliabilityStats`) every
   * `reliabilityReportInterval` ms — wire this up to your analytics backend.
   * Not called if omitted.
   */
  onReliabilityReport?: (stats: ReliabilityStats) => void;
  /** Interval (ms) between `onReliabilityReport` calls. Default: 60000. */
  reliabilityReportInterval?: number;
}

let _initialized = false;
let _unsubscribe: (() => void) | null = null;
let _unsubscribeQueueSync: (() => void) | null = null;
let _reliabilityReportTimer: ReturnType<typeof setInterval> | null = null;

export async function initEidos(config: EidosConfig = {}): Promise<void> {
  // Skip silently during SSR — SW, IndexedDB, and window are browser-only.
  if (typeof window === 'undefined') return;
  if (_initialized) return;
  _initialized = true;

  const swPath = config.swPath ?? '/eidos-sw.js';
  const autoReplay = config.autoReplay ?? true;
  const skipWaiting = config.skipWaiting ?? true;

  // Restore persisted queue from IndexedDB on startup
  try {
    const persisted = await idbGetQueue();
    if (persisted.length > 0) {
      const migrated = await Promise.all(persisted.map(migrateQueueItem));
      useEidosStore.getState().hydrateQueue(migrated);
    }
  } catch {
    // IndexedDB unavailable (Firefox private browsing) — silent fallback
  }

  try {
    await registerServiceWorker(swPath, {
      skipWaiting,
      onUpdateAvailable: config.onUpdateAvailable,
    });
  } catch {
    // SW registration failed; app continues without offline support
  }

  // When the SW fires the Background Sync tag, replay the queue in the main thread.
  // This path runs even if the user briefly navigated away and back — the browser
  // triggers the sync event on the SW, which wakes up all open clients.
  registerBgSyncHandler(() => {
    if (useEidosStore.getState().isOnline) {
      setTimeout(replayQueue, 200);
    }
  });

  if (autoReplay) {
    _unsubscribe = subscribeReplayOnReconnect();
  }

  // Apply queue-item status changes broadcast by the replay-lock holder so
  // non-leader tabs reflect live status without waiting for re-hydration.
  _unsubscribeQueueSync = subscribeQueueSync();

  if (config.onReliabilityReport) {
    const interval = config.reliabilityReportInterval ?? 60_000;
    const report = config.onReliabilityReport;
    _reliabilityReportTimer = setInterval(() => {
      report(useEidosStore.getState().reliability);
    }, interval);
  }

  if (import.meta.env.DEV) {
    const store = useEidosStore.getState();
    console.groupCollapsed('%c⚡ Eidos', 'color:#22C55E;font-weight:bold');
    console.log('SW path    :', swPath);
    console.log('Auto-replay:', autoReplay);
    console.log('SW status  :', store.swStatus);
    console.groupEnd();
  }
}

export function _resetEidos() {
  _unsubscribe?.();
  _unsubscribe = null;
  _unsubscribeQueueSync?.();
  _unsubscribeQueueSync = null;
  if (_reliabilityReportTimer) clearInterval(_reliabilityReportTimer);
  _reliabilityReportTimer = null;
  _initialized = false;
}
