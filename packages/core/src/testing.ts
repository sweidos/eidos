/**
 * @sweidos/eidos/testing
 *
 * Test helpers for Vitest, Jest, and Playwright.
 * Import only in test files — never in production code.
 *
 * All helpers work at the JS layer (no real SW or Cache API required).
 * Provide a `caches` mock when using getCachedEntry / clearEidosCache in jsdom.
 */

import { _resetEidos, clearQueue, replayQueue, useEidosStore } from '@sweidos/eidos'
import type { EidosState, ReplayResult } from '@sweidos/eidos'

// ── Offline simulation ────────────────────────────────────────────────────────

export interface MockOfflineOptions {
  /**
   * Also stub `globalThis.fetch` to throw a TypeError (simulates a hard
   * network failure for code that calls fetch directly, outside the Eidos
   * resource layer). Default: false.
   */
  stubFetch?: boolean
}

let _originalFetch: typeof globalThis.fetch | null = null

/**
 * Put Eidos into offline mode. Actions with `reliability: 'neverLose'` will
 * be queued instead of executed. Call `mockOnline()` to restore.
 *
 * @example
 * beforeEach(() => mockOffline())
 * afterEach(() => mockOnline())
 */
export function mockOffline(options: MockOfflineOptions = {}): void {
  useEidosStore.getState().setOnline(false)

  if (options.stubFetch && _originalFetch === null) {
    _originalFetch = globalThis.fetch
    globalThis.fetch = () =>
      Promise.reject(
        new TypeError('Network request failed (stubbed by @sweidos/eidos/testing)'),
      )
  }
}

/**
 * Restore online mode. Removes any fetch stub installed by `mockOffline`.
 */
export function mockOnline(): void {
  useEidosStore.getState().setOnline(true)

  if (_originalFetch !== null) {
    globalThis.fetch = _originalFetch
    _originalFetch = null
  }
}

// ── Queue helpers ─────────────────────────────────────────────────────────────

/**
 * Replay the action queue immediately and return the result.
 * Forces `isOnline = true` first so the replay is never skipped.
 *
 * @example
 * mockOffline()
 * await savePost(draft)        // queued
 * const result = await drainQueue()
 * expect(result.succeeded).toBe(1)
 */
export async function drainQueue(): Promise<ReplayResult> {
  useEidosStore.getState().setOnline(true)
  return replayQueue()
}

export interface WaitForQueueDrainOptions {
  /** Maximum wait in milliseconds. Default: 5000. */
  timeout?: number
  /** Poll interval in milliseconds. Default: 50. */
  interval?: number
}

/**
 * Wait until the action queue contains no pending or replaying items.
 * Resolves immediately if the queue is already clear.
 * Rejects with a timeout error if items remain after `timeout` ms.
 *
 * @example
 * mockOnline()
 * await waitForQueueDrain()
 * expect(getEidosState().queue).toHaveLength(0)
 */
export function waitForQueueDrain(options: WaitForQueueDrainOptions = {}): Promise<void> {
  const timeout = options.timeout ?? 5_000
  const interval = options.interval ?? 50
  const deadline = Date.now() + timeout

  return new Promise<void>((resolve, reject) => {
    function check() {
      const { queue } = useEidosStore.getState()
      const active = queue.filter(
        (q) => q.status === 'pending' || q.status === 'replaying',
      )
      if (active.length === 0) {
        resolve()
        return
      }
      if (Date.now() >= deadline) {
        reject(
          new Error(
            `[eidos/testing] waitForQueueDrain timed out after ${timeout}ms. ` +
              `${active.length} item(s) still active (statuses: ${active.map((q) => q.status).join(', ')}).`,
          ),
        )
        return
      }
      setTimeout(check, interval)
    }
    check()
  })
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

/** Default Eidos cache namespace written by the service worker. */
export const EIDOS_CACHE_NAME = 'eidos-resources-v1'

/**
 * Read a cached Response for a URL from Eidos Cache Storage.
 * Returns `undefined` if the entry is not cached.
 *
 * Requires the Cache API (`caches` global). In jsdom, provide a mock (e.g.
 * `vitest-fetch-mock`, `jest-fetch-mock`, or a custom `setupFiles` polyfill).
 *
 * @example
 * const res = await getCachedEntry('/api/user/1')
 * expect(res).toBeDefined()
 * expect(await res!.json()).toMatchObject({ id: 1 })
 */
export async function getCachedEntry(
  url: string,
  cacheName = EIDOS_CACHE_NAME,
): Promise<Response | undefined> {
  if (typeof caches === 'undefined') return undefined
  const cache = await caches.open(cacheName)
  const match = await cache.match(url)
  return match ?? undefined
}

/**
 * Delete all entries from an Eidos cache namespace.
 * Call in `afterEach` to prevent cache state leaking between tests.
 *
 * @example
 * afterEach(() => clearEidosCache())
 */
export async function clearEidosCache(cacheName = EIDOS_CACHE_NAME): Promise<void> {
  if (typeof caches === 'undefined') return
  await caches.delete(cacheName)
}

// ── Full reset ────────────────────────────────────────────────────────────────

/**
 * Full reset — call in `beforeEach` to start each test from a clean slate.
 *
 * - Resets runtime initialisation flag (`_resetEidos`) so `initEidos()` can
 *   be called again without the duplicate-init guard firing.
 * - Clears IDB action queue and in-memory store queue.
 * - Restores online state and removes any fetch stub from `mockOffline`.
 * - Clears registered resource entries and resets SW status.
 *
 * @example
 * beforeEach(async () => {
 *   await resetEidos()
 * })
 */
export async function resetEidos(): Promise<void> {
  // 1. Unsubscribe store listener and clear _initialized flag
  _resetEidos()

  // 2. Clear action queue — IDB + in-memory store
  await clearQueue()

  // 3. Restore online state + remove any fetch stub
  mockOnline()

  // 4. Reset resource entries and SW status to initial values
  useEidosStore.setState((s) => ({
    ...s,
    resources: {},
    swStatus: 'idle',
    swError: undefined,
  }))
}

// ── State snapshot ────────────────────────────────────────────────────────────

/**
 * Return a plain-object snapshot of the current Eidos store state.
 * Useful for assertions without importing `useEidosStore` directly.
 *
 * @example
 * expect(getEidosState().isOnline).toBe(false)
 * expect(getEidosState().queue).toHaveLength(1)
 */
export function getEidosState(): EidosState {
  const { isOnline, swStatus, swError, resources, queue } = useEidosStore.getState()
  return { isOnline, swStatus, swError, resources, queue }
}
