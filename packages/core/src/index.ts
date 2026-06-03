// ─────────────────────────────────────────────────────────────────────────────
// Vardi — describe intent, the runtime figures out how.
// ─────────────────────────────────────────────────────────────────────────────

// Public API
export { resource } from './resource'
export { action, replayQueue } from './action'
export { initVardi } from './runtime'

// React bindings
export { VardiProvider } from './react/Provider'
export { useVardi, useVardiResource, useVardiQueue, useVardiStatus } from './react/hooks'

// Devtools helpers
export { setOfflineSimulation } from './sw-bridge'
export { useVardiStore } from './store'

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
  VardiState,
  CacheStrategy,
} from './types'
