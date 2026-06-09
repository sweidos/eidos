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

/** All registered resources — only re-renders when the resources map changes, not on queue mutations. */
export function useEidosResources() {
  return useStore((s) => s.resources)
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
 * Queue counts — single subscription, single loop. Re-renders only when a
 * count changes, not on every queue mutation. Use for badges and status bars
 * instead of `useEidosQueue()` when you only need numbers, not full items.
 */
export function useEidosQueueStats() {
  // Encode as a comma-separated string so useSyncExternalStore's Object.is
  // comparison bails out correctly when counts haven't changed. One loop,
  // one subscription — cheaper than four separate filter() passes.
  const encoded = useStore((s) => {
    let pending = 0, failed = 0, replaying = 0
    for (const q of s.queue) {
      if (q.status === 'pending') pending++
      else if (q.status === 'failed') failed++
      else if (q.status === 'replaying') replaying++
    }
    return `${pending},${failed},${replaying},${s.queue.length}`
  })
  const [p, f, r, t] = encoded.split(',')
  return { pending: +p, failed: +f, replaying: +r, total: +t }
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
