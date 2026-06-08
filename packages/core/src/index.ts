// ─────────────────────────────────────────────────────────────────────────────
// Eidos — describe intent, the runtime figures out how.
// ─────────────────────────────────────────────────────────────────────────────

// Public API
export { resource } from './resource'
export { action, replayQueue, clearQueue } from './action'
export { initEidos } from './runtime'

// React bindings
export { EidosProvider } from './react/Provider'
export { useEidos, useEidosResource, useEidosQueue, useEidosStatus } from './react/hooks'

// Package version — exported so host apps can display it without importing package.json
export { VERSION } from './version'

// Devtools helpers
export { setOfflineSimulation } from './sw-bridge'
export { useEidosStore } from './store'
export type { EidosStore } from './store'

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
  EidosState,
  CacheStrategy,
} from './types'
