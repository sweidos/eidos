import { registerServiceWorker } from './sw-bridge'
import { replayQueue } from './action'
import { useEidosStore } from './store'
import { idbGetQueue } from './idb'

export interface EidosConfig {
  /** Path to the eidos service worker. Defaults to '/eidos-sw.js'. */
  swPath?: string
  /** Automatically replay the action queue on reconnect. Default: true. */
  autoReplay?: boolean
}

let _initialized = false

export async function initEidos(config: EidosConfig = {}): Promise<void> {
  if (_initialized) return
  _initialized = true

  const swPath = config.swPath ?? '/eidos-sw.js'
  const autoReplay = config.autoReplay ?? true

  // Restore persisted queue from IndexedDB on startup
  try {
    const persisted = await idbGetQueue()
    if (persisted.length > 0) {
      useEidosStore.getState().hydrateQueue(persisted)
    }
  } catch {
    // IndexedDB unavailable (Firefox private browsing) — silent fallback
  }

  try {
    await registerServiceWorker(swPath)
  } catch {
    // SW registration failed; app continues without offline support
  }

  if (autoReplay) {
    // ── Subscribe to the Zustand store instead of window.addEventListener('online')
    //
    // WHY: setOfflineSimulation() updates the store directly but never fires a
    // real browser `online` event. Watching the store means we catch both:
    //   • Real network reconnects (sw-bridge updates store on window.online)
    //   • Simulation toggled off (setOfflineSimulation(false) → store.setOnline(true))
    //
    let prevIsOnline = useEidosStore.getState().isOnline

    useEidosStore.subscribe((state) => {
      const justCameOnline = state.isOnline && !prevIsOnline
      prevIsOnline = state.isOnline

      if (justCameOnline) {
        // Small delay so the connection (or simulation reset) settles first
        setTimeout(replayQueue, 600)
      }
    })

    // Replay any pending items that survived a page reload
    const store = useEidosStore.getState()
    const hasPending = store.queue.some((q) => q.status === 'pending' || q.status === 'failed')
    if (store.isOnline && hasPending) {
      setTimeout(replayQueue, 1200)
    }
  }

  if (import.meta.env.DEV) {
    const store = useEidosStore.getState()
    console.groupCollapsed('%c⚡ Eidos', 'color:#38bdf8;font-weight:bold')
    console.log('SW path    :', swPath)
    console.log('Auto-replay:', autoReplay)
    console.log('SW status  :', store.swStatus)
    console.groupEnd()
  }
}

export function _resetEidos() {
  _initialized = false
}
