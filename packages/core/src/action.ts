import { useEidosStore } from './store'
import { getSwRegistration } from './sw-bridge'
import {
  idbAddToQueue,
  idbGetPendingItems,
  idbUpdateQueueItem,
  idbRemoveFromQueue,
  idbClearQueue,
} from './idb'
import type {
  ActionConfig,
  ActionHandle,
  ActionFn,
  ActionQueueItem,
  QueuedResult,
  ReplayResult,
} from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _actionRegistry = new Map<string, ActionFn<any[], any>>()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _rollbackRegistry = new Map<string, (...args: any[]) => void>()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _conflictRegistry = new Map<string, (error: unknown, args: any[]) => 'retry' | 'skip'>()

function uid() {
  return crypto.randomUUID()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function action<TArgs extends any[], TReturn>(
  fn: ActionFn<TArgs, TReturn>,
  config: ActionConfig,
): ActionHandle<TArgs, TReturn> {
  // || not ?? — fn.name can be '' (anonymous arrow fn) which ?? treats as a
  // valid value, causing all anonymous actions to share actionId ''.
  const actionId = config.name || fn.name || uid()

  if (import.meta.env.DEV && config.reliability === 'neverLose' && !config.name && !fn.name) {
    console.warn(
      `[eidos] action() registered with neverLose but no stable name was found (fn.name="${fn.name}"). Pass config.name so queued items survive a page reload and can be replayed.`,
    )
  }

  // Registering here means the function is available for replay after
  // the user refreshes the page (actions are defined at module scope).
  _actionRegistry.set(actionId, fn as ActionFn<unknown[], unknown>)

  if (config.onRollback) {
    _rollbackRegistry.set(actionId, config.onRollback)
  }

  if (config.onConflict) {
    _conflictRegistry.set(actionId, config.onConflict)
  }

  const wrapped = async (...args: TArgs): Promise<TReturn | QueuedResult> => {
    const { isOnline } = useEidosStore.getState()

    config.onOptimistic?.(...args)

    if (config.reliability === 'neverLose') {
      if (!isOnline) {
        return persistAndQueue(actionId, actionId, args, config)
      }
      // Online + neverLose: execute, queue on failure
      try {
        return await fn(...args)
      } catch {
        return persistAndQueue(actionId, actionId, args, config)
      }
    }

    // best-effort: execute directly, rollback on failure
    try {
      return await fn(...args)
    } catch (err) {
      config.onRollback?.(...args)
      throw err
    }
  }

  Object.defineProperty(wrapped, 'id', { value: actionId, writable: false })
  Object.defineProperty(wrapped, 'config', { value: config, writable: false })

  return wrapped as unknown as ActionHandle<TArgs, TReturn>
}

function isJsonSerializable(value: unknown): boolean {
  try {
    JSON.stringify(value)
    return true
  } catch {
    return false
  }
}

async function persistAndQueue(
  actionId: string,
  actionName: string,
  args: unknown[],
  config: ActionConfig,
): Promise<QueuedResult> {
  if (import.meta.env.DEV && !isJsonSerializable(args)) {
    console.warn(
      `[eidos] action "${actionName}" queued with non-JSON-serializable args. These args will be lost after a page reload. Use plain JSON values for neverLose actions.`,
      args,
    )
  }

  const id = uid()
  const item: ActionQueueItem = {
    id,
    actionId,
    actionName,
    args,
    queuedAt: Date.now(),
    retryCount: 0,
    maxRetries: config.maxRetries ?? 3,
    status: 'pending',
    priority: config.priority ?? 'normal',
  }

  await idbAddToQueue(item)
  useEidosStore.getState().addQueueItem(item)

  // Register Background Sync tag so the browser can wake up open clients
  // when connectivity returns, even if the user navigated away briefly.
  // Graceful no-op when Background Sync is unsupported.
  try {
    const reg = getSwRegistration()
    if (reg && 'sync' in reg) {
      await (reg as unknown as { sync: { register(tag: string): Promise<void> } }).sync.register('eidos-queue-replay')
    }
  } catch {
    // Background Sync not available — online-event replay remains the fallback
  }

  return {
    queued: true,
    id,
    message: `"${actionName}" queued — will execute when online`,
  }
}

function isClientError(err: unknown): boolean {
  if (err instanceof Response) return err.status >= 400 && err.status < 500
  if (typeof err === 'object' && err !== null) {
    const s = (err as Record<string, unknown>).status
    if (typeof s === 'number') return s >= 400 && s < 500
  }
  return false
}

// Base delay 2s, doubles per retry, capped at 5 minutes, ±20% jitter
function backoffMs(retryCount: number): number {
  const base = Math.min(2000 * 2 ** retryCount, 300_000)
  return base * (0.8 + Math.random() * 0.4)
}

let _replaying = false

export async function replayQueue(): Promise<ReplayResult> {
  const store = useEidosStore.getState()
  if (!store.isOnline || _replaying) {
    return { attempted: 0, succeeded: 0, failed: 0, retrying: 0, skipped: 0, conflicted: 0 }
  }
  _replaying = true
  try {
    return await _doReplayQueue(store)
  } finally {
    _replaying = false
  }
}

type ItemOutcome = 'succeeded' | 'failed' | 'retrying' | 'skipped' | 'conflicted'

async function _replayItem(
  item: ActionQueueItem,
  store: ReturnType<typeof useEidosStore.getState>,
): Promise<ItemOutcome> {
  const fn = _actionRegistry.get(item.actionId)
  if (!fn) return 'skipped'

  try {
    await fn(...(item.args as unknown[]))
    const completedAt = Date.now()
    store.updateQueueItem(item.id, { status: 'succeeded', completedAt })
    await idbUpdateQueueItem(item.id, { status: 'succeeded', completedAt })

    // Remove from queue after a short delay so UI can show the success state briefly
    setTimeout(() => {
      store.removeQueueItem(item.id)
      idbRemoveFromQueue(item.id)
    }, 3000)
    return 'succeeded'
  } catch (err) {
    // 4xx: give onConflict a chance to decide before normal retry/fail logic
    if (isClientError(err)) {
      const onConflict = _conflictRegistry.get(item.actionId)
      if (onConflict) {
        const resolution = onConflict(err, item.args as unknown[])
        if (resolution === 'skip') {
          store.removeQueueItem(item.id)
          await idbRemoveFromQueue(item.id)
          return 'conflicted'
        }
        // 'retry' falls through to normal retry/fail logic below
      }
    }

    const retryCount = item.retryCount + 1
    if (retryCount >= item.maxRetries) {
      store.updateQueueItem(item.id, { status: 'failed', error: String(err), retryCount })
      await idbUpdateQueueItem(item.id, { status: 'failed', error: String(err), retryCount })
      _rollbackRegistry.get(item.actionId)?.(...(item.args as unknown[]))
      return 'failed'
    } else {
      const nextRetryAt = Date.now() + backoffMs(retryCount)
      store.updateQueueItem(item.id, { status: 'pending', retryCount, nextRetryAt })
      await idbUpdateQueueItem(item.id, { status: 'pending', retryCount, nextRetryAt })
      return 'retrying'
    }
  }
}

async function _replayTier(
  items: ActionQueueItem[],
  store: ReturnType<typeof useEidosStore.getState>,
  result: ReplayResult,
): Promise<void> {
  if (items.length === 0) return

  // Batch 'replaying' status update — N items → 1 store notify.
  // IDB write is fire-and-forget: on reload items stay 'pending', safe to re-replay.
  const replayable = items.filter((item) => _actionRegistry.has(item.actionId))
  result.skipped += items.length - replayable.length

  if (replayable.length > 0) {
    store.batchUpdateQueueItems(replayable.map((item) => ({ id: item.id, update: { status: 'replaying' } })))
    for (const item of replayable) {
      idbUpdateQueueItem(item.id, { status: 'replaying' })
    }
  }

  const outcomes = await Promise.allSettled(replayable.map((item) => _replayItem(item, store)))

  for (const o of outcomes) {
    const outcome = o.status === 'fulfilled' ? o.value : 'failed'
    if (outcome === 'skipped') { result.skipped++ }
    else if (outcome === 'conflicted') { result.conflicted++ }
    else { result.attempted++; result[outcome]++ }
  }
}

async function _doReplayQueue(store: ReturnType<typeof useEidosStore.getState>): Promise<ReplayResult> {
  const candidates = await idbGetPendingItems()
  const now = Date.now()
  const pending = candidates.filter((item) => !item.nextRetryAt || item.nextRetryAt <= now)

  const result: ReplayResult = { attempted: 0, succeeded: 0, failed: 0, retrying: 0, skipped: 0, conflicted: 0 }

  // Process tiers sequentially: high items complete before normal, normal before low.
  // Within each tier items run in parallel via Promise.allSettled.
  for (const tier of ['high', 'normal', 'low'] as const) {
    const tierItems = pending.filter((item) => (item.priority ?? 'normal') === tier)
    await _replayTier(tierItems, store, result)
  }

  return result
}

/** Remove all items from the action queue (IDB + in-memory store). */
export async function clearQueue(): Promise<void> {
  await idbClearQueue()
  useEidosStore.getState().hydrateQueue([])
}
