import { registerServiceWorker } from './sw-bridge'
import { replayQueue } from './action'
import { useVardiStore } from './store'
import { idbGetQueue } from './idb'

export interface VardiConfig {
  /** Path to the vardi service worker. Defaults to '/vardi-sw.js'. */
  swPath?: string
  /** Automatically replay the action queue on reconnect. Default: true. */
  autoReplay?: boolean
}

let _initialized = false

export async function initVardi(config: VardiConfig = {}): Promise<void> {
  if (_initialized) return
  _initialized = true

  const swPath = config.swPath ?? '/vardi-sw.js'
  const autoReplay = config.autoReplay ?? true

  // Restore persisted queue from IndexedDB on startup so devtools can show it
  try {
    const persisted = await idbGetQueue()
    if (persisted.length > 0) {
      useVardiStore.getState().hydrateQueue(persisted)
    }
  } catch {
    // IndexedDB unavailable (e.g. Firefox private browsing) — silent fallback
  }

  try {
    await registerServiceWorker(swPath)
  } catch {
    // SW registration failed; app continues without offline support
  }

  if (autoReplay) {
    window.addEventListener('online', () => {
      // Short delay: let the connection stabilise before attempting replay
      setTimeout(replayQueue, 800)
    })
  }

  if (import.meta.env.DEV) {
    const store = useVardiStore.getState()
    console.groupCollapsed('%c⚡ Vardi', 'color:#818cf8;font-weight:bold')
    console.log('SW path:', swPath)
    console.log('Auto-replay:', autoReplay)
    console.log('SW status:', store.swStatus)
    console.groupEnd()
  }
}

/** Reset internal state — intended for testing only. */
export function _resetVardi() {
  _initialized = false
}
