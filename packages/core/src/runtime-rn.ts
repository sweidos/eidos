import {
  setQueueStorage,
  AsyncStorageQueueStorage,
  useEidosStore,
  subscribeReplayOnReconnect,
} from '@sweidos/eidos';
import type { AsyncStorageLike } from '@sweidos/eidos';

export interface EidosRNConfig {
  /** AsyncStorage singleton (or any AsyncStorageLike key-value store). */
  storage: AsyncStorageLike;
  /** Replay the queue automatically when the app comes back online. Default: true. */
  autoReplay?: boolean;
}

let _initialized = false;
let _unsubscribe: (() => void) | null = null;

/**
 * Initialize Eidos for React Native.
 * Call this once at app startup (outside any component) before rendering.
 *
 * @example
 * import AsyncStorage from '@react-native-async-storage/async-storage'
 * await initEidosRN({ storage: AsyncStorage })
 */
export async function initEidosRN(config: EidosRNConfig): Promise<void> {
  if (_initialized) return;
  _initialized = true;

  const { storage, autoReplay = true } = config;
  const queueStorage = new AsyncStorageQueueStorage(storage);

  // Register the storage adapter so action() uses it instead of IndexedDB
  setQueueStorage(queueStorage);

  // Restore persisted queue from storage on startup
  try {
    const persisted = await queueStorage.getAll();
    if (persisted.length > 0) {
      useEidosStore.getState().hydrateQueue(persisted);
    }
  } catch {
    // Storage read failed — start with empty in-memory queue
  }

  if (autoReplay) {
    _unsubscribe = subscribeReplayOnReconnect();
  }
}

export function _resetEidosRN(): void {
  _unsubscribe?.();
  _unsubscribe = null;
  _initialized = false;
}
