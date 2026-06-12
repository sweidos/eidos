// ─────────────────────────────────────────────────────────────────────────────
// Eidos Core Types
// ─────────────────────────────────────────────────────────────────────────────

export type CacheStrategy = 'cache-first' | 'stale-while-revalidate' | 'network-first';

// ── Resource ─────────────────────────────────────────────────────────────────

export interface ResourceConfig {
  /** Make this resource available when the device is offline. */
  offline: boolean;
  /** Override the auto-selected caching strategy. */
  strategy?: CacheStrategy;
  /** Custom cache bucket name. Defaults to 'eidos-resources-v1'. */
  cacheName?: string;
  /** Max age of cached response in milliseconds. Expired entries trigger a network fetch. */
  maxAge?: number;
}

export interface GeneratedStrategy {
  name: string;
  swStrategy: CacheStrategy;
  cacheName: string;
  /** One-line rationale for why this strategy was chosen. */
  reasoning: string;
  /** Human-readable description of each behavioral step. */
  behavior: string[];
  /** Pseudocode showing the equivalent Workbox config. */
  equivalentCode: string;
}

export interface ResourceEntry {
  url: string;
  config: ResourceConfig;
  strategy: GeneratedStrategy;
  status: 'idle' | 'fetching' | 'fresh' | 'stale' | 'error' | 'offline';
  cachedAt?: number;
  fetchedAt?: number;
  cacheHits: number;
  cacheMisses: number;
  lastEvent?: 'cache-hit' | 'cache-updated' | 'network-error' | 'cache-cleared';
}

export interface ResourceHandle<T = unknown> {
  readonly url: string;
  readonly config: ResourceConfig;
  readonly strategy: GeneratedStrategy;
  fetch: () => Promise<Response>;
  json: () => Promise<T>;
  /** Returns a TanStack Query-compatible options object. */
  query: () => { queryKey: [string, string]; queryFn: () => Promise<T> };
  prefetch: () => Promise<void>;
  invalidate: () => Promise<void>;
  /** Remove from registry and SW. Required before re-registering the same URL with different config. */
  unregister: () => void;
}

/** Summary returned by warmCache(). */
export interface WarmCacheResult {
  /** Resources that were prefetched successfully. */
  warmed: number;
  /** Resources whose prefetch threw (network error, offline, etc.). */
  failed: number;
  /** The raw errors, in input order, for failed handles. */
  errors: unknown[];
}

// ── Action ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ActionConfig<TArgs extends any[] = any[]> {
  /**
   * - `best-effort`: call directly, no persistence on failure.
   * - `neverLose`: persist to IndexedDB before executing; replay on reconnect.
   */
  reliability: 'best-effort' | 'neverLose';
  /** Max retry attempts before marking as failed. Default: 3. */
  maxRetries?: number;
  /** Human-readable name for the action (used in devtools). */
  name?: string;
  /**
   * Prefixes the registered action id (`namespace::name`). Use to avoid
   * collisions when two actions share a name (e.g. across micro-frontends,
   * or two `createOrder` actions in different modules) — without a
   * namespace, the second registration silently overwrites the first.
   */
  namespace?: string;
  /**
   * Replay order when multiple queued actions are pending.
   * `'high'` items replay before `'normal'`, which replay before `'low'`.
   * Each tier completes fully before the next tier begins.
   * Default: `'normal'`.
   */
  priority?: 'high' | 'normal' | 'low';
  /**
   * Called immediately before the async function executes, with the same args
   * plus a trailing `ActionContext`. Use to apply an optimistic UI update (add
   * item, mark as pending, etc.) and to capture `idempotencyKey` for later
   * `handle.cancel(idempotencyKey)` calls. Called on every invocation —
   * online, offline, and during queue replay.
   */
  onOptimistic?: (...args: [...TArgs, ActionContext]) => void;
  /**
   * Called when the action permanently fails and will not be retried.
   * - `best-effort`: called on first throw.
   * - `neverLose`: called when `maxRetries` is exhausted (status → `'failed'`).
   * Use to revert the optimistic update.
   */
  onRollback?: (...args: [...TArgs, ActionContext]) => void;
  /**
   * Called during queue replay when the server responds with a 4xx status code
   * (client error — conflict, gone, unprocessable, etc.).
   *
   * Return `'retry'` to keep the item in the queue and retry per normal backoff.
   * Return `'skip'` to silently remove the item without triggering `onRollback`.
   *
   * If not provided, 4xx errors are treated identically to other errors (retried
   * until `maxRetries` is exhausted, then `onRollback` is called).
   *
   * The `error` argument is whatever `fn` threw — typically a `Response` object
   * or a custom error with a `.status` property.
   */
  /**
   * @deprecated Use `conflict` instead. If both are set, `conflict` wins.
   * Return `'retry'` to keep the item in the queue and retry per normal
   * backoff, or `'skip'` to silently remove the item.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onConflict?: (error: unknown, args: any[]) => 'retry' | 'skip';
  /**
   * Declarative conflict-resolution strategy used during queue replay when
   * the server responds with a 4xx status (conflict, gone, unprocessable,
   * etc.). Replaces `onConflict` for new code — see `ConflictConfig`.
   */
  conflict?: ConflictConfig;
  /**
   * When `true`, each invocation gets an `AbortController` whose `signal` is
   * passed via `ActionContext.signal`. Forward it to `fetch`/etc. so
   * `handle.cancel(idempotencyKey)` can abort an in-flight call, or remove a
   * not-yet-replayed queued item.
   */
  cancellable?: boolean;
}

/**
 * Passed to `ConflictConfig.resolve` (for `'merge'`/`'custom'` strategies)
 * when a queued action's replay receives a 4xx response.
 */
export interface ConflictContext {
  /** Whatever `fn` threw — typically a `Response` or an error with `.status`. */
  error: unknown;
  /** The original arguments the action was queued with. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any[];
  /** Number of replay attempts so far (0 on first replay). */
  attempt: number;
  idempotencyKey: string;
}

/**
 * Outcome of `ConflictConfig.resolve`:
 * - `'retry'`: keep the item queued, retry per normal backoff.
 * - `'skip'`: silently remove the item (no `onRollback`).
 * - `{ resolved: args }`: replace the queued args and retry immediately
 *   on the next replay pass.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ConflictResolution = 'retry' | 'skip' | { resolved: any[] };

export interface ConflictConfig {
  /**
   * - `'serverWins'`: drop the queued item, keeping the server's state.
   * - `'clientWins'`: keep retrying — the client's write should eventually
   *   be accepted (e.g. once the server-side conflict is cleared).
   * - `'lastWriteWins'`: same as `'clientWins'` for now — requires a
   *   server-supplied timestamp contract to compare against `queuedAt`
   *   (see Phase 3 of the roadmap). Treated as `'clientWins'` until then.
   * - `'merge'` / `'custom'`: call `resolve` to decide.
   */
  strategy: 'serverWins' | 'clientWins' | 'lastWriteWins' | 'merge' | 'custom';
  /** Required for `'merge'` and `'custom'`. */
  resolve?: (ctx: ConflictContext) => ConflictResolution;
}

/** Bump when ActionQueueItem's shape changes. Used to migrate items persisted by older versions. */
export const CURRENT_QUEUE_SCHEMA_VERSION = 2;

export interface ActionQueueItem {
  /** Shape version this item was persisted with. Items from before v2 are migrated on load. */
  schemaVersion: number;
  id: string;
  /** ID of the registered action (maps to the function in the registry). */
  actionId: string;
  actionName: string;
  /**
   * Stable per-invocation key, generated once and reused across every retry/replay
   * of this item. Pass to your server as an idempotency key so retries that reach
   * the server after a dropped response don't double-execute.
   */
  idempotencyKey: string;
  args: unknown[];
  queuedAt: number;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'replaying' | 'succeeded' | 'failed';
  /** Replay priority. High items replay before normal, normal before low. Default: 'normal'. */
  priority?: 'high' | 'normal' | 'low';
  error?: string;
  completedAt?: number;
  /** Earliest timestamp at which this item should be retried (exponential backoff). */
  nextRetryAt?: number;
}

export interface QueuedResult {
  readonly queued: true;
  readonly id: string;
  readonly message: string;
}

/** Summary returned by replayQueue(). */
export interface ReplayResult {
  /** Items where the registered function was found and called. */
  attempted: number;
  /** Items that resolved successfully. */
  succeeded: number;
  /** Items that failed and have no retries remaining (status: 'failed'). */
  failed: number;
  /** Items that failed but will be retried later (nextRetryAt set). */
  retrying: number;
  /** Items whose actionId had no registered function — likely not yet imported. */
  skipped: number;
  /** Items that received a 4xx response and were dropped via `onConflict: () => 'skip'`. */
  conflicted: number;
  /** Items removed via `handle.cancel(idempotencyKey)` before/during replay. */
  cancelled: number;
}

/**
 * Passed as an extra argument after the declared params to `neverLose` actions,
 * on every invocation (initial call, offline queue, and replay). The same
 * `idempotencyKey` is reused across all retries of one logical invocation —
 * forward it to your server (e.g. as an `Idempotency-Key` header) so a retry
 * that reaches the server after a dropped response doesn't double-execute.
 */
export interface ActionContext {
  idempotencyKey: string;
  /** 0 on the first attempt, incremented on each replay retry. */
  attempt: number;
  /** Set when `config.cancellable` is true. Forward to `fetch`/etc. for cancellation support. */
  signal?: AbortSignal;
}

/**
 * Every action function receives its declared args plus a trailing
 * `ActionContext` — on every invocation (online, offline, and replay).
 */
export type ActionFn<TArgs extends unknown[], TReturn> = (
  ...args: [...TArgs, ActionContext]
) => Promise<TReturn>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ActionHandle<TArgs extends any[], TReturn> {
  (...args: TArgs): Promise<TReturn | QueuedResult>;
  readonly id: string;
  readonly config: ActionConfig;
  /**
   * Cancel an invocation by its `idempotencyKey` (from `ActionContext` /
   * `onOptimistic`). Aborts the in-flight call if `cancellable: true` and
   * still running, otherwise removes a not-yet-replayed queued item.
   * Returns `true` if something was cancelled/removed.
   */
  cancel: (idempotencyKey: string) => Promise<boolean>;
}

// ── Global State ─────────────────────────────────────────────────────────────

export interface EidosState {
  isOnline: boolean;
  swStatus: 'idle' | 'registering' | 'active' | 'error' | 'unsupported';
  swError?: string;
  resources: Record<string, ResourceEntry>;
  queue: ActionQueueItem[];
}

export interface QueueStatusCounts {
  [key: string]: number;
  pending: number;
  failed: number;
  replaying: number;
  total: number;
}

/** Single pass over the queue — avoids separate .filter() calls per status. */
export function countQueueByStatus(queue: ActionQueueItem[]): QueueStatusCounts {
  let pending = 0,
    failed = 0,
    replaying = 0;
  for (const q of queue) {
    if (q.status === 'pending') pending++;
    else if (q.status === 'failed') failed++;
    else if (q.status === 'replaying') replaying++;
  }
  return { pending, failed, replaying, total: queue.length };
}
