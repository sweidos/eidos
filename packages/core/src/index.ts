// ─────────────────────────────────────────────────────────────────────────────
// Eidos — describe intent, the runtime figures out how.
// ─────────────────────────────────────────────────────────────────────────────

// Public API
export { resource, resourcePattern, warmCache, setQueryInvalidator } from './resource';
export { action, replayQueue, clearQueue, cancelByIdempotencyKey, requeueItem } from './action';
export { initEidos, _resetEidos } from './runtime';
export type { EidosConfig } from './runtime';
export { subscribeReplayOnReconnect } from './replay';

// Pluggable queue storage (used by React Native adapter and custom backends)
export { setQueueStorage, _getQueueStorage } from './queue-storage';
export type { QueueStorage } from './queue-storage';
export { AsyncStorageQueueStorage } from './async-storage-adapter';
export type { AsyncStorageLike } from './async-storage-adapter';

// React bindings
export { EidosProvider } from './react/Provider';
export {
  useEidos,
  useEidosResources,
  useEidosResource,
  useEidosQueue,
  useEidosAction,
  useEidosQueueStats,
  useEidosStatus,
  useEidosOnDrain,
  useEidosReliabilityStats,
} from './react/hooks';

// Package version — exported so host apps can display it without importing package.json
export { VERSION } from './version';

// Devtools helpers
export {
  setOfflineSimulation,
  isBgSyncSupported,
  getSwRegistration,
  sendToWorker,
  registerPushCallbacks,
  triggerSwUpdate,
} from './sw-bridge';
export { eidosDebug } from './debug';
export type { EidosDebugSnapshot } from './debug';
export { useEidosStore } from './store';
export type { EidosStore } from './store';

// Framework-agnostic reactive stores (Svelte / Vue / vanilla JS)
export {
  eidosStore,
  eidosQueue,
  eidosStatus,
  eidosQueueStats,
  eidosResource,
  eidosAction,
  onQueueDrain,
  eidosReliabilityStats,
} from './stores';
export type { EidosReadable } from './stores';

// Types
export type {
  ResourceConfig,
  ResourceHandle,
  PatternResourceHandle,
  AnyResourceHandle,
  ResourceEntry,
  GeneratedStrategy,
  WarmCacheResult,
  ActionConfig,
  ActionContext,
  ActionFn,
  ActionHandle,
  ActionQueueItem,
  QueuedResult,
  ReplayResult,
  EidosState,
  ReliabilityStats,
  ConflictContext,
  ConflictResolution,
  ConflictConfig,
  CacheStrategy,
} from './types';
