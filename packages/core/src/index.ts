// ─────────────────────────────────────────────────────────────────────────────
// Eidos — describe intent, the runtime figures out how.
// ─────────────────────────────────────────────────────────────────────────────

// Public API
export { resource, setQueryInvalidator } from './resource'
export { action, replayQueue, clearQueue } from './action'
export { initEidos } from './runtime'

// React bindings
export { EidosProvider } from './react/Provider'
export { useEidos, useEidosResource, useEidosQueue, useEidosAction, useEidosQueueStats, useEidosStatus, useEidosOnDrain } from './react/hooks'

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
  ActionConfig,
  ActionHandle,
  ActionQueueItem,
  QueuedResult,
  ReplayResult,
  EidosState,
  CacheStrategy,
} from './types'
