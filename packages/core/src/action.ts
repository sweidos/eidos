import { useEidosStore } from './store'
import {
  idbAddToQueue,
  idbGetQueue,
  idbUpdateQueueItem,
  idbRemoveFromQueue,
} from './idb'
import type {
  ActionConfig,
  ActionHandle,
  ActionFn,
  ActionQueueItem,
  QueuedResult,
} from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _actionRegistry = new Map<string, ActionFn<any[], any>>()

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function action<TArgs extends any[], TReturn>(
  fn: ActionFn<TArgs, TReturn>,
  config: ActionConfig,
): ActionHandle<TArgs, TReturn> {
  const actionId = config.name ?? fn.name ?? uid()

  // Registering here means the function is available for replay after
  // the user refreshes the page (actions are defined at module scope).
  _actionRegistry.set(actionId, fn as ActionFn<unknown[], unknown>)

  const wrapped = async (...args: TArgs): Promise<TReturn | QueuedResult> => {
    const { isOnline } = useEidosStore.getState()

    if (config.reliability === 'neverLose') {
      if (!isOnline) {
        return persistAndQueue(actionId, fn.name || actionId, args, config)
      }
      // Online + neverLose: execute, queue on failure
      try {
        return await fn(...args)
      } catch {
        return persistAndQueue(actionId, fn.name || actionId, args, config)
      }
    }

    // best-effort: execute directly, no queuing
    return fn(...args)
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
  }

  await idbAddToQueue(item)
  useEidosStore.getState().addQueueItem(item)

  return {
    queued: true,
    id,
    message: `"${actionName}" queued — will execute when online`,
  }
}

// Base delay 2s, doubles per retry, capped at 5 minutes, ±20% jitter
function backoffMs(retryCount: number): number {
  const base = Math.min(2000 * 2 ** retryCount, 300_000)
  return base * (0.8 + Math.random() * 0.4)
}

export async function replayQueue(): Promise<void> {
  const store = useEidosStore.getState()
  if (!store.isOnline) return

  const queue = await idbGetQueue()
  const now = Date.now()
  const pending = queue.filter(
    (item) =>
      (item.status === 'pending' || item.status === 'failed') &&
      (!item.nextRetryAt || item.nextRetryAt <= now),
  )

  for (const item of pending) {
    const fn = _actionRegistry.get(item.actionId)
    if (!fn) continue

    store.updateQueueItem(item.id, { status: 'replaying' })
    await idbUpdateQueueItem(item.id, { status: 'replaying' })

    try {
      await fn(...(item.args as unknown[]))
      const completedAt = Date.now()
      store.updateQueueItem(item.id, { status: 'succeeded', completedAt })
      await idbUpdateQueueItem(item.id, { status: 'succeeded', completedAt })

      // Remove from queue after a delay so the UI can show the success state
      setTimeout(() => {
        store.removeQueueItem(item.id)
        idbRemoveFromQueue(item.id)
      }, 3000)
    } catch (err) {
      const retryCount = item.retryCount + 1
      if (retryCount >= item.maxRetries) {
        store.updateQueueItem(item.id, {
          status: 'failed',
          error: String(err),
          retryCount,
        })
        await idbUpdateQueueItem(item.id, {
          status: 'failed',
          error: String(err),
          retryCount,
        })
      } else {
        const nextRetryAt = Date.now() + backoffMs(retryCount)
        store.updateQueueItem(item.id, { status: 'pending', retryCount, nextRetryAt })
        await idbUpdateQueueItem(item.id, { status: 'pending', retryCount, nextRetryAt })
      }
    }
  }
}
