/**
 * Framework-agnostic reactive stores — compatible with Svelte's store protocol,
 * Vue's watchEffect, RxJS, and vanilla JS. Zero framework dependencies.
 *
 * Svelte: use the `$` prefix — `$eidosQueue`, `$eidosStatus`, etc.
 * Vue:    call `.subscribe()` inside a composable with `onUnmounted` cleanup.
 * Vanilla: call `.subscribe(run)` directly; the return value unsubscribes.
 *
 * Each store calls its subscriber whenever any part of the Eidos state changes.
 * For fine-grained subscriptions, use `.getState()` to read the current snapshot
 * and compare manually in the subscriber callback.
 */

import { useEidosStore } from './store'
import type { EidosStore } from './store'
import type { ActionQueueItem, ResourceEntry } from './types'

// ── Readable<T> — compatible with Svelte's Readable interface ─────────────────

export interface EidosReadable<T> {
  /** Subscribe to value changes. Returns an unsubscribe function. */
  subscribe(run: (value: T) => void): () => void
  /** Read the current value synchronously without subscribing. */
  getState(): T
}

function readable<T>(selector: (s: EidosStore) => T): EidosReadable<T> {
  return {
    subscribe(run) {
      // Emit current value immediately (Svelte store contract)
      run(selector(useEidosStore.getState()))
      return useEidosStore.subscribe(() => run(selector(useEidosStore.getState())))
    },
    getState() {
      return selector(useEidosStore.getState())
    },
  }
}

// ── Static stores (created once at module scope) ──────────────────────────────

/** Full Eidos state snapshot. Prefer the narrower stores below. */
export const eidosStore: EidosReadable<EidosStore> = readable((s) => s)

/** The action queue. Re-notifies on every queue mutation. */
export const eidosQueue: EidosReadable<ActionQueueItem[]> = readable((s) => s.queue)

/**
 * Online status + SW lifecycle.
 * Object identity changes on every notification — destructure or compare fields
 * in the subscriber if you need to avoid unnecessary work.
 */
export const eidosStatus: EidosReadable<{
  isOnline: boolean
  swStatus: EidosStore['swStatus']
  swError: string | undefined
}> = readable((s) => ({
  isOnline: s.isOnline,
  swStatus: s.swStatus,
  swError: s.swError,
}))

/**
 * Queue counts. Re-notifies on any queue mutation — compare values inside the
 * subscriber callback to skip work when counts haven't changed.
 */
export const eidosQueueStats: EidosReadable<{
  pending: number
  failed: number
  replaying: number
  total: number
}> = readable((s) => ({
  pending:   s.queue.filter((q) => q.status === 'pending').length,
  failed:    s.queue.filter((q) => q.status === 'failed').length,
  replaying: s.queue.filter((q) => q.status === 'replaying').length,
  total:     s.queue.length,
}))

// ── Dynamic stores (created per URL / ID) ─────────────────────────────────────

/**
 * Live cache state for a single registered resource URL.
 * @example
 *   // Svelte
 *   const entry = eidosResource('/api/products')
 *   $: hits = $entry?.cacheHits ?? 0
 */
export function eidosResource(url: string): EidosReadable<ResourceEntry | undefined> {
  return readable((s) => s.resources[url])
}

/**
 * Live state for a single queue item by ID. Returns `undefined` once the item
 * is removed from the queue (after a successful replay or `clearQueue()`).
 * @example
 *   // Svelte
 *   const item = eidosAction(queuedResult.id)
 *   $: status = $item?.status  // 'pending' | 'replaying' | 'succeeded' | 'failed' | undefined
 */
export function eidosAction(id: string): EidosReadable<ActionQueueItem | undefined> {
  return readable((s) => s.queue.find((item) => item.id === id))
}
