import { registerServiceWorker, registerBgSyncHandler } from './sw-bridge'
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
let _unsubscribe: (() => void) | null = null

export async function initEidos(config: EidosConfig = {}): Promise<void> {
  // Skip silently during SSR — SW, IndexedDB, and window are browser-only.
  if (typeof window === 'undefined') return
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

  // When the SW fires the Background Sync tag, replay the queue in the main thread.
  // This path runs even if the user briefly navigated away and back — the browser
  // triggers the sync event on the SW, which wakes up all open clients.
  registerBgSyncHandler(() => {
    if (useEidosStore.getState().isOnline) {
      setTimeout(replayQueue, 200)
    }
  })

  if (autoReplay) {
    // ── Subscribe to the store instead of window.addEventListener('online')
    //
    // WHY: setOfflineSimulation() updates the store directly but never fires a
    // real browser `online` event. Watching the store catches both:
    //   • Real network reconnects (sw-bridge updates store on window.online)
    //   • Simulation toggled off (setOfflineSimulation(false) → store.setOnline(true))
    //
    let prevIsOnline = useEidosStore.getState().isOnline

    _unsubscribe = useEidosStore.subscribe(() => {
      const { isOnline } = useEidosStore.getState()
      const justCameOnline = isOnline && !prevIsOnline
      prevIsOnline = isOnline

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
    console.groupCollapsed('%c⚡ Eidos', 'color:#22C55E;font-weight:bold')
    console.log('SW path    :', swPath)
    console.log('Auto-replay:', autoReplay)
    console.log('SW status  :', store.swStatus)
    console.groupEnd()
  }
}

export function _resetEidos() {
  _unsubscribe?.()
  _unsubscribe = null
  _initialized = false
}
