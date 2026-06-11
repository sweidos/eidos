import { useEidosStore } from './store';
import { replayQueue } from './action';

/**
 * Subscribe to online/offline transitions and trigger replayQueue() on
 * reconnect, plus replay any pending items left over from a previous session.
 *
 * Shared by the web (runtime.ts) and React Native (runtime-rn.ts) init paths.
 *
 * WHY subscribe to the store instead of window.addEventListener('online'):
 * setOfflineSimulation() updates the store directly but never fires a real
 * browser `online` event. Watching the store catches both:
 *   • Real network reconnects (sw-bridge updates store on window.online)
 *   • Simulation toggled off (setOfflineSimulation(false) → store.setOnline(true))
 *
 * Returns an unsubscribe function.
 */
export function subscribeReplayOnReconnect(): () => void {
  let prevIsOnline = useEidosStore.getState().isOnline;

  const unsubscribe = useEidosStore.subscribe(() => {
    const { isOnline } = useEidosStore.getState();
    const justCameOnline = isOnline && !prevIsOnline;
    prevIsOnline = isOnline;

    if (justCameOnline) {
      // Small delay so the connection (or simulation reset) settles first
      setTimeout(replayQueue, 600);
    }
  });

  // Replay any pending items that survived a reload/restart.
  // 'failed' items have already exhausted maxRetries and are never
  // re-replayed (see _doReplayQueue), so they don't count here.
  const store = useEidosStore.getState();
  const hasPending = store.queue.some((q) => q.status === 'pending');
  if (store.isOnline && hasPending) {
    setTimeout(replayQueue, 1200);
  }

  return unsubscribe;
}
