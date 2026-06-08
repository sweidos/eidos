import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useEidosStore } from '../store'
import type { EidosStore } from '../store'

function useStore(): EidosStore
function useStore<T>(selector: (state: EidosStore) => T): T
function useStore<T = EidosStore>(selector?: (state: EidosStore) => T): T {
  const fn = selector ?? ((s: EidosStore) => s as unknown as T)
  return useSyncExternalStore(useEidosStore.subscribe, () => fn(useEidosStore.getState()))
}

/** Full Eidos store — prefer the narrower hooks below for performance. */
export function useEidos() {
  return useStore()
}

/** Live state for a single registered resource URL. */
export function useEidosResource(url: string) {
  return useStore((s) => s.resources[url])
}

/** The current action queue. */
export function useEidosQueue() {
  return useStore((s) => s.queue)
}

/**
 * Live state for a single queue item by ID. Only re-renders when that specific
 * item changes — cheaper than `useEidosQueue().find(id)` which re-renders on
 * any queue mutation.
 */
export function useEidosAction(id: string) {
  return useStore((s) => s.queue.find((item) => item.id === id))
}

/**
 * Online + SW status — cheap subscription, safe to use in header components.
 * Three separate primitive selectors so each only triggers a re-render when
 * its own value changes (no object-reference churn from a combined selector).
 */
export function useEidosStatus() {
  const isOnline = useStore((s) => s.isOnline)
  const swStatus = useStore((s) => s.swStatus)
  const swError = useStore((s) => s.swError)
  return { isOnline, swStatus, swError }
}

/**
 * Queue counts — four independent primitive selectors. Re-renders only when a
 * count changes, not on every queue mutation. Use for badges and status bars
 * instead of `useEidosQueue()` when you only need numbers, not full items.
 */
export function useEidosQueueStats() {
  const pending   = useStore((s) => s.queue.filter((q) => q.status === 'pending').length)
  const failed    = useStore((s) => s.queue.filter((q) => q.status === 'failed').length)
  const replaying = useStore((s) => s.queue.filter((q) => q.status === 'replaying').length)
  const total     = useStore((s) => s.queue.length)
  return { pending, failed, replaying, total }
}

/**
 * Calls `callback` once each time the action queue drains from non-empty → 0.
 * Stable callback reference not required — always calls the latest version.
 * Use for "all offline actions synced!" toasts.
 *
 * @example
 * useEidosOnDrain(() => toast.success('All offline actions synced!'))
 */
export function useEidosOnDrain(callback: () => void) {
  const total    = useStore((s) => s.queue.length)
  const prevRef  = useRef(0)
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (prevRef.current > 0 && total === 0) {
      callbackRef.current()
    }
    prevRef.current = total
  }, [total])
}
