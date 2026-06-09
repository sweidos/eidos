/**
 * @sweidos/eidos/query
 *
 * TanStack Query (React Query) integration for Eidos.
 *
 * @example
 * ```ts
 * // Register once (e.g. alongside new QueryClient())
 * import { withEidosQueryClient } from '@sweidos/eidos/query'
 * withEidosQueryClient(queryClient)
 *
 * // In components
 * import { useEidosQuery, useEidosMutation } from '@sweidos/eidos/query'
 *
 * const { data, isPending } = useEidosQuery(products)
 *
 * const mutation = useEidosMutation(createOrder, {
 *   invalidates: [products],
 * })
 * ```
 */
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import type {
  UseQueryOptions,
  UseQueryResult,
  UseMutationOptions,
  UseMutationResult,
  QueryClient,
} from '@tanstack/react-query'
// Import from the main package (external at build-time) so all code shares
// the same module instance — required for the setQueryInvalidator bridge to work.
import { setQueryInvalidator } from '@sweidos/eidos'
import type { ResourceHandle, ActionHandle, QueuedResult } from '@sweidos/eidos'

// ── Global QueryClient reference ──────────────────────────────────────────────

let _globalClient: QueryClient | null = null

/**
 * Register a QueryClient with Eidos.
 *
 * Once called, `handle.invalidate()` will also call
 * `queryClient.invalidateQueries({ queryKey: ['eidos', url] })`, keeping
 * TanStack Query's cache in sync with Eidos's Cache Storage.
 *
 * Call this once, before rendering — e.g. alongside `new QueryClient()`.
 *
 * @example
 * ```ts
 * const queryClient = new QueryClient()
 * withEidosQueryClient(queryClient)
 *
 * // Wrap your app as usual
 * <QueryClientProvider client={queryClient}>
 *   <App />
 * </QueryClientProvider>
 * ```
 */
export function withEidosQueryClient(client: QueryClient): void {
  _globalClient = client
  setQueryInvalidator((queryKey: [string, string]) => {
    client.invalidateQueries({ queryKey })
  })
}

// ── useEidosQuery ─────────────────────────────────────────────────────────────

type EidosQueryOptions<T> = Omit<
  UseQueryOptions<T, Error, T, [string, string]>,
  'queryKey' | 'queryFn'
>

/**
 * Wraps `useQuery` with Eidos-smart defaults.
 *
 * Key differences from plain `useQuery`:
 * - `networkMode: 'always'` — Eidos owns offline logic; queries run even when
 *   `navigator.onLine` is false (the SW cache or IndexedDB serves the data).
 * - `retry: false` — Eidos handles retries at the SW / replay layer; TQ
 *   retrying on top would double-fire and fight Eidos's backoff.
 *
 * @example
 * ```ts
 * const products = resource('/api/products', { offline: true })
 *
 * // Automatically typed as UseQueryResult<Product[]>
 * const { data, isPending, isError } = useEidosQuery<Product[]>(products)
 *
 * // Override any TQ option
 * const { data } = useEidosQuery(products, { staleTime: 30_000 })
 * ```
 */
export function useEidosQuery<T>(
  handle: ResourceHandle<T>,
  options?: EidosQueryOptions<T>,
): UseQueryResult<T, Error> {
  return useQuery<T, Error, T, [string, string]>({
    networkMode: 'always',
    retry: false,
    ...options,
    ...handle.query(),
  })
}

// ── useEidosMutation ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyResourceHandle = ResourceHandle<any>

export interface EidosMutationOptions<TArg, TData>
  extends Omit<
    UseMutationOptions<TData | QueuedResult, Error, TArg>,
    'mutationFn' | 'networkMode'
  > {
  /**
   * Resource handles to invalidate (Cache Storage + TanStack Query) after
   * every successful mutation — including offline-queued ones.
   */
  invalidates?: AnyResourceHandle[]
}

/**
 * Wraps `useMutation` for a single-argument Eidos action handle.
 *
 * Key differences from plain `useMutation`:
 * - `networkMode: 'always'` — action executes (or queues) even when offline.
 * - `invalidates` — shorthand to clear resource caches on success. Triggers
 *   both Eidos Cache Storage and TanStack Query invalidation (requires
 *   `withEidosQueryClient` for the TQ half).
 * - Return type is `TData | QueuedResult`. Narrow with `'queued' in data` to
 *   detect the offline-queued case.
 *
 * @example
 * ```ts
 * const mutation = useEidosMutation(createOrder, {
 *   invalidates: [products],
 *   onSuccess(data) {
 *     if ('queued' in data) toast('Saved offline — will sync when back online')
 *     else toast(`Order #${data.id} created!`)
 *   },
 * })
 *
 * // Trigger
 * mutation.mutate({ productId: 1, qty: 2 })
 * ```
 */
export function useEidosMutation<TArg, TData>(
  handle: ActionHandle<[TArg], TData>,
  options?: EidosMutationOptions<TArg, TData>,
): UseMutationResult<TData | QueuedResult, Error, TArg> {
  // Attempt to get the QueryClient from context. May throw if there is no
  // QueryClientProvider in the tree. Fall back to _globalClient only.
  let contextClient: QueryClient | null = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    contextClient = useQueryClient()
  } catch {
    // No QueryClientProvider — _globalClient only.
  }

  const { invalidates, onSuccess, ...rest } = options ?? {}

  return useMutation<TData | QueuedResult, Error, TArg>({
    networkMode: 'always',
    ...rest,
    mutationFn: (arg: TArg) =>
      handle(arg as Parameters<typeof handle>[0]),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSuccess: async (...args: any[]) => {
      const [data] = args
      if (invalidates?.length) {
        // Clears Eidos Cache Storage. Also calls _queryInvalidator if
        // withEidosQueryClient() was registered — so TQ cache is invalidated too.
        await Promise.all(invalidates.map((h) => h.invalidate()))

        // If _globalClient is NOT set (bridge not registered) but we have a
        // context client, still invalidate TQ queries directly.
        if (!_globalClient && contextClient) {
          invalidates.forEach((h) => {
            contextClient!.invalidateQueries({ queryKey: h.query().queryKey })
          })
        }
      }
      // Forward all args to the caller's onSuccess (TQ v5 passes 4 args).
      if (onSuccess) await (onSuccess as (...a: unknown[]) => unknown)(...args)
      void data // used above for narrowing
    },
  })
}
