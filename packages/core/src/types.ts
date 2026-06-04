// ─────────────────────────────────────────────────────────────────────────────
// Eidos Core Types
// ─────────────────────────────────────────────────────────────────────────────

export type CacheStrategy =
  | 'cache-first'
  | 'stale-while-revalidate'
  | 'network-first'

// ── Resource ─────────────────────────────────────────────────────────────────

export interface ResourceConfig {
  /** Make this resource available when the device is offline. */
  offline: boolean
  /** Override the auto-selected caching strategy. */
  strategy?: CacheStrategy
  /** Custom cache bucket name. Defaults to 'eidos-resources-v1'. */
  cacheName?: string
  /** Max age of cached response in milliseconds. Expired entries trigger a network fetch. */
  maxAge?: number
}

export interface GeneratedStrategy {
  name: string
  swStrategy: CacheStrategy
  cacheName: string
  /** One-line rationale for why this strategy was chosen. */
  reasoning: string
  /** Human-readable description of each behavioral step. */
  behavior: string[]
  /** Pseudocode showing the equivalent Workbox config. */
  equivalentCode: string
}

export interface ResourceEntry {
  url: string
  config: ResourceConfig
  strategy: GeneratedStrategy
  status: 'idle' | 'fetching' | 'fresh' | 'stale' | 'error' | 'offline'
  cachedAt?: number
  fetchedAt?: number
  cacheHits: number
  cacheMisses: number
  lastEvent?: 'cache-hit' | 'cache-updated' | 'network-error' | 'cache-cleared'
}

export interface ResourceHandle<T = unknown> {
  readonly url: string
  readonly config: ResourceConfig
  readonly strategy: GeneratedStrategy
  fetch: () => Promise<Response>
  json: () => Promise<T>
  /** Returns a TanStack Query-compatible options object. */
  query: () => { queryKey: [string, string]; queryFn: () => Promise<T> }
  prefetch: () => Promise<void>
  invalidate: () => Promise<void>
}

// ── Action ───────────────────────────────────────────────────────────────────

export interface ActionConfig {
  /**
   * - `best-effort`: call directly, no persistence on failure.
   * - `neverLose`: persist to IndexedDB before executing; replay on reconnect.
   */
  reliability: 'best-effort' | 'neverLose'
  /** Max retry attempts before marking as failed. Default: 3. */
  maxRetries?: number
  /** Human-readable name for the action (used in devtools). */
  name?: string
}

export interface ActionQueueItem {
  id: string
  /** ID of the registered action (maps to the function in the registry). */
  actionId: string
  actionName: string
  args: unknown[]
  queuedAt: number
  retryCount: number
  maxRetries: number
  status: 'pending' | 'replaying' | 'succeeded' | 'failed'
  error?: string
  completedAt?: number
  /** Earliest timestamp at which this item should be retried (exponential backoff). */
  nextRetryAt?: number
}

export interface QueuedResult {
  readonly queued: true
  readonly id: string
  readonly message: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ActionFn<TArgs extends any[], TReturn> = (...args: TArgs) => Promise<TReturn>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ActionHandle<TArgs extends any[], TReturn> {
  (...args: TArgs): Promise<TReturn | QueuedResult>
  readonly id: string
  readonly config: ActionConfig
}

// ── Global State ─────────────────────────────────────────────────────────────

export interface EidosState {
  isOnline: boolean
  swStatus: 'idle' | 'registering' | 'active' | 'error' | 'unsupported'
  swError?: string
  resources: Record<string, ResourceEntry>
  queue: ActionQueueItem[]
}
