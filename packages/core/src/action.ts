import { useEidosStore } from './store';
import { getSwRegistration } from './sw-bridge';
import { idbQueueStorage } from './idb';
import { _getQueueStorage } from './queue-storage';
import { broadcastQueueSync } from './queue-sync';
import type { QueueStorage } from './queue-storage';
import { CURRENT_QUEUE_SCHEMA_VERSION } from './types';
import type {
  ActionConfig,
  ActionContext,
  ActionHandle,
  ActionFn,
  ActionQueueItem,
  ConflictConfig,
  ConflictContext,
  ConflictResolution,
  QueuedResult,
  ReplayResult,
} from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _actionRegistry = new Map<string, ActionFn<any[], any>>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _rollbackRegistry = new Map<string, (...args: any[]) => void>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _conflictRegistry = new Map<string, (error: unknown, args: any[]) => 'retry' | 'skip'>();
const _conflictConfigRegistry = new Map<string, ConflictConfig>();
const _configRegistry = new Map<string, ActionConfig>();

// In-flight AbortControllers for `cancellable` actions, keyed by idempotencyKey.
// Populated for direct calls and replays alike; removed once the call settles.
const _inflightControllers = new Map<string, AbortController>();

function qs(): QueueStorage {
  // idbQueueStorage is the default browser fallback when no custom storage is set.
  return _getQueueStorage() ?? idbQueueStorage;
}

function uid() {
  return crypto.randomUUID();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function callWithContext<TArgs extends any[], TReturn>(
  fn: ActionFn<TArgs, TReturn>,
  args: TArgs,
  ctx: ActionContext,
): Promise<TReturn> {
  return fn(...args, ctx);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function action<TArgs extends any[], TReturn>(
  fn: ActionFn<TArgs, TReturn>,
  config: ActionConfig<TArgs>,
): ActionHandle<TArgs, TReturn> {
  // || not ?? — fn.name can be '' (anonymous arrow fn) which ?? treats as a
  // valid value, causing all anonymous actions to share actionId ''.
  const baseId = config.name || fn.name || uid();
  const actionId = config.namespace ? `${config.namespace}::${baseId}` : baseId;

  if (import.meta.env.DEV && config.reliability === 'neverLose' && !config.name && !fn.name) {
    console.warn(
      `[eidos] action() registered with neverLose but no stable name was found (fn.name="${fn.name}"). Pass config.name so queued items survive a page reload and can be replayed.`,
    );
  }

  if (import.meta.env.DEV && _actionRegistry.has(actionId)) {
    console.error(
      `[eidos] duplicate action id "${actionId}" — a previously registered action will be overwritten. Pass a unique config.name or config.namespace.`,
    );
  }

  // Registering here means the function is available for replay after
  // the user refreshes the page (actions are defined at module scope).
  _actionRegistry.set(actionId, fn as ActionFn<unknown[], unknown>);
  _configRegistry.set(actionId, config as ActionConfig);

  if (config.onRollback) {
    _rollbackRegistry.set(actionId, config.onRollback);
  }

  if (config.onConflict) {
    _conflictRegistry.set(actionId, config.onConflict);
  }

  if (config.conflict) {
    if (
      import.meta.env.DEV &&
      (config.conflict.strategy === 'merge' || config.conflict.strategy === 'custom') &&
      !config.conflict.resolve
    ) {
      console.error(
        `[eidos] action "${actionId}" has conflict.strategy "${config.conflict.strategy}" but no resolve() — items will retry indefinitely on 4xx.`,
      );
    }
    _conflictConfigRegistry.set(actionId, config.conflict);
  }

  const wrapped = async (...args: TArgs): Promise<TReturn | QueuedResult> => {
    const { isOnline } = useEidosStore.getState();

    // Generated for every invocation — reused across every retry/replay of a
    // neverLose item, and used to key handle.cancel() for in-flight cancellable calls.
    const idempotencyKey = uid();

    let signal: AbortSignal | undefined;
    if (config.cancellable) {
      const controller = new AbortController();
      _inflightControllers.set(idempotencyKey, controller);
      signal = controller.signal;
    }

    const ctx: ActionContext = { idempotencyKey, attempt: 0, signal };

    config.onOptimistic?.(...args, ctx);

    try {
      if (config.reliability === 'neverLose') {
        if (!isOnline) {
          return persistAndQueue(actionId, actionId, args, config, idempotencyKey);
        }
        // Online + neverLose: execute, queue on failure
        try {
          return await callWithContext(fn, args, ctx);
        } catch (err) {
          if (isAbortError(err)) throw err;
          return persistAndQueue(actionId, actionId, args, config, idempotencyKey);
        }
      }

      // best-effort: execute directly, rollback on failure
      try {
        return await callWithContext(fn, args, ctx);
      } catch (err) {
        config.onRollback?.(...args, ctx);
        throw err;
      }
    } finally {
      if (config.cancellable) _inflightControllers.delete(idempotencyKey);
    }
  };

  const cancel = async (idempotencyKey: string): Promise<boolean> => {
    const controller = _inflightControllers.get(idempotencyKey);
    if (controller) {
      controller.abort();
      return true;
    }

    // Not in flight — check for a not-yet-replayed queued item with this key.
    const items = await qs().getAll();
    const item = items.find((i) => i.idempotencyKey === idempotencyKey && i.status === 'pending');
    if (!item) return false;

    useEidosStore.getState().removeQueueItem(item.id);
    broadcastQueueSync({ type: 'remove', id: item.id });
    await qs().remove(item.id);
    return true;
  };

  Object.defineProperty(wrapped, 'id', { value: actionId, writable: false });
  Object.defineProperty(wrapped, 'config', { value: config, writable: false });
  Object.defineProperty(wrapped, 'cancel', { value: cancel, writable: false });

  return wrapped as unknown as ActionHandle<TArgs, TReturn>;
}

function isJsonSerializable(value: unknown): boolean {
  try {
    JSON.stringify(value);
    return true;
  } catch {
    return false;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function persistAndQueue<TArgs extends any[]>(
  actionId: string,
  actionName: string,
  args: TArgs,
  config: ActionConfig<TArgs>,
  idempotencyKey: string,
): Promise<QueuedResult> {
  if (import.meta.env.DEV && !isJsonSerializable(args)) {
    console.warn(
      `[eidos] action "${actionName}" queued with non-JSON-serializable args. These args will be lost after a page reload. Use plain JSON values for neverLose actions.`,
      args,
    );
  }

  const id = uid();
  const item: ActionQueueItem = {
    schemaVersion: CURRENT_QUEUE_SCHEMA_VERSION,
    id,
    actionId,
    actionName,
    idempotencyKey,
    args,
    queuedAt: Date.now(),
    retryCount: 0,
    maxRetries: config.maxRetries ?? 3,
    status: 'pending',
    priority: config.priority ?? 'normal',
  };

  await qs().add(item);
  useEidosStore.getState().addQueueItem(item);

  // Register Background Sync tag so the browser can wake up open clients
  // when connectivity returns, even if the user navigated away briefly.
  // Graceful no-op when Background Sync is unsupported.
  try {
    const reg = getSwRegistration();
    if (reg && 'sync' in reg) {
      await (reg as unknown as { sync: { register(tag: string): Promise<void> } }).sync.register(
        'eidos-queue-replay',
      );
    }
  } catch {
    // Background Sync not available — online-event replay remains the fallback
  }

  return {
    queued: true,
    id,
    message: `"${actionName}" queued — will execute when online`,
  };
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

function isClientError(err: unknown): boolean {
  if (err instanceof Response) return err.status >= 400 && err.status < 500;
  if (typeof err === 'object' && err !== null) {
    const s = (err as Record<string, unknown>).status;
    if (typeof s === 'number') return s >= 400 && s < 500;
  }
  return false;
}

// Base delay 2s, doubles per retry, capped at 5 minutes, ±20% jitter
function backoffMs(retryCount: number): number {
  const base = Math.min(2000 * 2 ** retryCount, 300_000);
  return base * (0.8 + Math.random() * 0.4);
}

function emptyReplayResult(): ReplayResult {
  return {
    attempted: 0,
    succeeded: 0,
    failed: 0,
    retrying: 0,
    skipped: 0,
    conflicted: 0,
    cancelled: 0,
  };
}

let _replaying = false;
const REPLAY_LOCK_NAME = 'eidos-queue-replay';

export async function replayQueue(): Promise<ReplayResult> {
  const store = useEidosStore.getState();
  if (!store.isOnline) return emptyReplayResult();

  // Web Locks coordinate replay across tabs sharing the same IndexedDB queue —
  // only the lock holder replays; other tabs no-op rather than re-executing
  // the same queued actions in parallel.
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request(REPLAY_LOCK_NAME, { ifAvailable: true }, async (lock) => {
      if (!lock) return emptyReplayResult();
      return _doReplayQueue(store);
    });
  }

  // Fallback for environments without the Web Locks API (older Safari, React
  // Native, test runners) — guards against concurrent replay within this tab only.
  if (_replaying) return emptyReplayResult();
  _replaying = true;
  try {
    return await _doReplayQueue(store);
  } finally {
    _replaying = false;
  }
}

type ItemOutcome = 'succeeded' | 'failed' | 'retrying' | 'skipped' | 'conflicted' | 'cancelled';

async function _markSucceeded(
  item: ActionQueueItem,
  store: ReturnType<typeof useEidosStore.getState>,
): Promise<void> {
  const completedAt = Date.now();
  store.updateQueueItem(item.id, { status: 'succeeded', completedAt });
  broadcastQueueSync({ type: 'update', id: item.id, update: { status: 'succeeded', completedAt } });
  await qs().update(item.id, { status: 'succeeded', completedAt });

  // Remove from queue after a short delay so UI can show the success state briefly
  setTimeout(() => {
    store.removeQueueItem(item.id);
    broadcastQueueSync({ type: 'remove', id: item.id });
    qs().remove(item.id);
  }, 3000);
}

/**
 * Resolves a 4xx error against the action's conflict strategy.
 * Returns 'conflicted' if the item was dropped, undefined if normal
 * retry/fail logic should run (possibly with `item.args` rewritten by `merge`).
 */
async function _resolveConflict(
  item: ActionQueueItem,
  store: ReturnType<typeof useEidosStore.getState>,
  err: unknown,
): Promise<ItemOutcome | undefined> {
  const conflictConfig = _conflictConfigRegistry.get(item.actionId);
  let resolution: ConflictResolution | undefined;

  if (conflictConfig) {
    switch (conflictConfig.strategy) {
      case 'serverWins':
        resolution = 'skip';
        break;
      case 'clientWins':
      case 'lastWriteWins':
        resolution = 'retry';
        break;
      case 'merge':
      case 'custom': {
        const ctx: ConflictContext = {
          error: err,
          args: item.args as unknown[],
          attempt: item.retryCount,
          idempotencyKey: item.idempotencyKey,
        };
        resolution = conflictConfig.resolve?.(ctx) ?? 'retry';
        break;
      }
    }
  } else {
    const onConflict = _conflictRegistry.get(item.actionId);
    if (onConflict) resolution = onConflict(err, item.args as unknown[]);
  }

  if (resolution === 'skip') {
    store.removeQueueItem(item.id);
    broadcastQueueSync({ type: 'remove', id: item.id });
    await qs().remove(item.id);
    return 'conflicted';
  }
  if (resolution && typeof resolution === 'object') {
    item.args = resolution.resolved;
    store.updateQueueItem(item.id, { args: resolution.resolved });
    broadcastQueueSync({ type: 'update', id: item.id, update: { args: resolution.resolved } });
    await qs().update(item.id, { args: resolution.resolved });
  }
  // 'retry' (or merged args) falls through to normal retry/fail logic
  return undefined;
}

async function _scheduleRetryOrFail(
  item: ActionQueueItem,
  store: ReturnType<typeof useEidosStore.getState>,
  err: unknown,
): Promise<ItemOutcome> {
  const retryCount = item.retryCount + 1;
  if (retryCount >= item.maxRetries) {
    const update = { status: 'failed' as const, error: String(err), retryCount };
    store.updateQueueItem(item.id, update);
    broadcastQueueSync({ type: 'update', id: item.id, update });
    await qs().update(item.id, update);
    const ctx: ActionContext = { idempotencyKey: item.idempotencyKey, attempt: retryCount };
    _rollbackRegistry.get(item.actionId)?.(...(item.args as unknown[]), ctx);
    return 'failed';
  }

  const nextRetryAt = Date.now() + backoffMs(retryCount);
  const update = { status: 'pending' as const, retryCount, nextRetryAt };
  store.updateQueueItem(item.id, update);
  broadcastQueueSync({ type: 'update', id: item.id, update });
  await qs().update(item.id, update);
  return 'retrying';
}

async function _replayItem(
  item: ActionQueueItem,
  store: ReturnType<typeof useEidosStore.getState>,
): Promise<ItemOutcome> {
  const fn = _actionRegistry.get(item.actionId);
  if (!fn) return 'skipped';

  const cancellable = _configRegistry.get(item.actionId)?.cancellable;
  let signal: AbortSignal | undefined;
  if (cancellable) {
    const controller = new AbortController();
    _inflightControllers.set(item.idempotencyKey, controller);
    signal = controller.signal;
  }

  const ctx: ActionContext = {
    idempotencyKey: item.idempotencyKey,
    attempt: item.retryCount,
    signal,
  };

  try {
    await callWithContext(fn, item.args as unknown[], ctx);
    await _markSucceeded(item, store);
    return 'succeeded';
  } catch (err) {
    // Cancelled via handle.cancel(idempotencyKey) — drop the item, no rollback/retry.
    if (isAbortError(err)) {
      store.removeQueueItem(item.id);
      broadcastQueueSync({ type: 'remove', id: item.id });
      await qs().remove(item.id);
      return 'cancelled';
    }

    // 4xx: give the conflict strategy a chance to decide before normal retry/fail logic
    if (isClientError(err)) {
      const outcome = await _resolveConflict(item, store, err);
      if (outcome) return outcome;
    }

    return _scheduleRetryOrFail(item, store, err);
  } finally {
    if (cancellable) _inflightControllers.delete(item.idempotencyKey);
  }
}

async function _replayTier(
  items: ActionQueueItem[],
  store: ReturnType<typeof useEidosStore.getState>,
  result: ReplayResult,
): Promise<void> {
  if (items.length === 0) return;

  // Batch 'replaying' status update — N items → 1 store notify.
  // IDB write is fire-and-forget: on reload items stay 'pending', safe to re-replay.
  const replayable = items.filter((item) => _actionRegistry.has(item.actionId));
  result.skipped += items.length - replayable.length;

  if (replayable.length > 0) {
    const updates = replayable.map((item) => ({
      id: item.id,
      update: { status: 'replaying' as const },
    }));
    store.batchUpdateQueueItems(updates);
    broadcastQueueSync({ type: 'batchUpdate', updates });
    for (const item of replayable) {
      qs().update(item.id, { status: 'replaying' });
    }
  }

  const outcomes = await Promise.allSettled(replayable.map((item) => _replayItem(item, store)));

  for (const o of outcomes) {
    const outcome = o.status === 'fulfilled' ? o.value : 'failed';
    if (outcome === 'skipped') {
      result.skipped++;
    } else if (outcome === 'conflicted') {
      result.conflicted++;
    } else if (outcome === 'cancelled') {
      result.cancelled++;
    } else {
      result.attempted++;
      result[outcome]++;
    }
  }
}

async function _doReplayQueue(
  store: ReturnType<typeof useEidosStore.getState>,
): Promise<ReplayResult> {
  const candidates = await qs().getPending();
  const now = Date.now();
  // getPending() includes 'failed' items (for UI/queue-stats visibility), but
  // items that already exhausted maxRetries must not be auto-replayed again —
  // otherwise every reconnect re-executes the action and re-fires onRollback.
  // Those items stay 'failed' until the host app explicitly clears/re-queues them.
  const pending = candidates.filter(
    (item) => item.retryCount < item.maxRetries && (!item.nextRetryAt || item.nextRetryAt <= now),
  );

  const result: ReplayResult = emptyReplayResult();

  // Process tiers sequentially: high items complete before normal, normal before low.
  // Within each tier items run in parallel via Promise.allSettled.
  for (const tier of ['high', 'normal', 'low'] as const) {
    const tierItems = pending.filter((item) => (item.priority ?? 'normal') === tier);
    await _replayTier(tierItems, store, result);
  }

  return result;
}

/** Remove all items from the action queue (storage + in-memory store). */
export async function clearQueue(): Promise<void> {
  await qs().clear();
  useEidosStore.getState().hydrateQueue([]);
}
