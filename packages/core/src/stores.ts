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

import { useEidosStore } from './store';
import type { EidosStore } from './store';
import type { ActionQueueItem, ResourceEntry } from './types';

// ── Readable<T> — compatible with Svelte's Readable interface ─────────────────

export interface EidosReadable<T> {
  /** Subscribe to value changes. Returns an unsubscribe function. */
  subscribe(run: (value: T) => void): () => void;
  /** Read the current value synchronously without subscribing. */
  getState(): T;
}

function shallowEqual<T extends Record<string, unknown>>(a: T, b: T): boolean {
  const keys = Object.keys(a) as (keyof T)[];
  if (keys.length !== Object.keys(b).length) return false;
  for (const k of keys) if (a[k] !== b[k]) return false;
  return true;
}

// Typed comparator alias so call sites don't need inline casts.
function shallowEq<T extends Record<string, unknown>>(a: T, b: T): boolean {
  return shallowEqual(a, b);
}

function readable<T>(
  selector: (s: EidosStore) => T,
  equal: (a: T, b: T) => boolean = Object.is,
): EidosReadable<T> {
  return {
    subscribe(run) {
      // Emit current value immediately (Svelte store contract)
      let last = selector(useEidosStore.getState());
      run(last);
      return useEidosStore.subscribe(() => {
        const next = selector(useEidosStore.getState());
        if (!equal(last, next)) {
          last = next;
          run(next);
        }
      });
    },
    getState() {
      return selector(useEidosStore.getState());
    },
  };
}

// ── Static stores (created once at module scope) ──────────────────────────────

/** Full Eidos state snapshot. Prefer the narrower stores below. */
export const eidosStore: EidosReadable<EidosStore> = readable((s) => s);

/** The action queue. Re-notifies on every queue mutation. */
export const eidosQueue: EidosReadable<ActionQueueItem[]> = readable((s) => s.queue);

/**
 * Online status + SW lifecycle.
 * Only re-emits when isOnline, swStatus, or swError actually changes.
 */
export const eidosStatus: EidosReadable<{
  isOnline: boolean;
  swStatus: EidosStore['swStatus'];
  swError: string | undefined;
}> = readable(
  (s) => ({ isOnline: s.isOnline, swStatus: s.swStatus, swError: s.swError }),
  shallowEq,
);

/**
 * Queue counts. Re-emits only when a count actually changes, not on every
 * queue mutation (e.g. a status transition that doesn't change counts is skipped).
 */
export const eidosQueueStats: EidosReadable<{
  pending: number;
  failed: number;
  replaying: number;
  total: number;
}> = readable((s) => {
  // Single pass over the queue — avoids three separate .filter() calls.
  let pending = 0,
    failed = 0,
    replaying = 0;
  for (const q of s.queue) {
    if (q.status === 'pending') pending++;
    else if (q.status === 'failed') failed++;
    else if (q.status === 'replaying') replaying++;
  }
  return { pending, failed, replaying, total: s.queue.length };
}, shallowEq);

// ── Dynamic stores (created per URL / ID) ─────────────────────────────────────

/**
 * Live cache state for a single registered resource URL.
 * @example
 *   // Svelte
 *   const entry = eidosResource('/api/products')
 *   $: hits = $entry?.cacheHits ?? 0
 */
export function eidosResource(url: string): EidosReadable<ResourceEntry | undefined> {
  return readable((s) => s.resources[url]);
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
  return readable((s) => s.queue.find((item) => item.id === id));
}
