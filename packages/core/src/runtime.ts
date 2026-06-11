import { registerServiceWorker, registerBgSyncHandler } from './sw-bridge';
import { replayQueue } from './action';
import { useEidosStore } from './store';
import { idbGetQueue, idbQueueStorage } from './idb';
import { _getQueueStorage } from './queue-storage';
import { subscribeReplayOnReconnect } from './replay';
import { subscribeQueueSync } from './queue-sync';
import { CURRENT_QUEUE_SCHEMA_VERSION } from './types';
import type { ActionQueueItem } from './types';

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
}

let _initialized = false;
let _unsubscribe: (() => void) | null = null;
let _unsubscribeQueueSync: (() => void) | null = null;

export async function initEidos(config: EidosConfig = {}): Promise<void> {
  // Skip silently during SSR — SW, IndexedDB, and window are browser-only.
  if (typeof window === 'undefined') return;
  if (_initialized) return;
  _initialized = true;

  const swPath = config.swPath ?? '/eidos-sw.js';
  const autoReplay = config.autoReplay ?? true;

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
    await registerServiceWorker(swPath);
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
  _initialized = false;
}
