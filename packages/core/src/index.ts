// ─────────────────────────────────────────────────────────────────────────────
// Eidos — describe intent, the runtime figures out how.
// ─────────────────────────────────────────────────────────────────────────────

// Public API
export { resource, warmCache, setQueryInvalidator } from './resource'
export { action, replayQueue, clearQueue } from './action'
export { initEidos, _resetEidos } from './runtime'
export type { EidosConfig } from './runtime'

// Pluggable queue storage (used by React Native adapter and custom backends)
export { setQueueStorage, _getQueueStorage } from './queue-storage'
export type { QueueStorage } from './queue-storage'
export { AsyncStorageQueueStorage } from './async-storage-adapter'
export type { AsyncStorageLike } from './async-storage-adapter'

// React bindings
export { EidosProvider } from './react/Provider'
export { useEidos, useEidosResources, useEidosResource, useEidosQueue, useEidosAction, useEidosQueueStats, useEidosStatus, useEidosOnDrain } from './react/hooks'

// Package version — exported so host apps can display it without importing package.json
export { VERSION } from './version'

// Devtools helpers
export { setOfflineSimulation, isBgSyncSupported } from './sw-bridge'
export { useEidosStore } from './store'
export type { EidosStore } from './store'

// Framework-agnostic reactive stores (Svelte / Vue / vanilla JS)
export { eidosStore, eidosQueue, eidosStatus, eidosQueueStats, eidosResource, eidosAction } from './stores'
export type { EidosReadable } from './stores'

// Types
export type {
  ResourceConfig,
  ResourceHandle,
  ResourceEntry,
  GeneratedStrategy,
  WarmCacheResult,
  ActionConfig,
  ActionHandle,
  ActionQueueItem,
  QueuedResult,
  ReplayResult,
  EidosState,
  CacheStrategy,
} from './types'
