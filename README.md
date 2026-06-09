# Eidos

[![npm](https://img.shields.io/npm/v/@sweidos/eidos)](https://www.npmjs.com/package/@sweidos/eidos)
[![CI](https://github.com/iamadi11/eidos/actions/workflows/deploy.yml/badge.svg)](https://github.com/iamadi11/eidos/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> Describe intent. The runtime figures out how.

Eidos is a small, opinionated abstraction layer for building offline-first web apps. Instead of configuring Service Workers, Cache API strategies, and IndexedDB queues by hand, you declare **what you want** and the runtime handles the rest.

```ts
import { resource, action } from '@sweidos/eidos'

// "I want this resource available offline."
const products = resource('/api/products', { offline: true })

// "I never want to lose this action."
const createOrder = action(orderApi.create, { reliability: 'neverLose' })
```

No service worker file to write. No cache strategy to configure. No retry logic to implement.

**[→ Live playground](https://playground-iamadi11s-projects.vercel.app)**

---

## The Problem

Building offline-capable apps today requires deep knowledge of:

- Service Worker registration and lifecycle management
- Cache API strategies (cache-first, network-first, stale-while-revalidate)
- Fetch event interception and URL routing
- IndexedDB schema design for persistent queues
- Exponential backoff and retry logic
- Cache versioning and stale entry cleanup

Every team re-implements this surface area from scratch.

## The Solution

```ts
// Before — workbox-config.js + service-worker.js (40+ lines)
registerRoute(
  ({ url }) => url.pathname === '/api/products',
  new StaleWhileRevalidate({ cacheName: 'api-cache', plugins: [...] }),
)
self.addEventListener('sync', event => {
  if (event.tag === 'create-order') event.waitUntil(replayOrders())
})

// After — eidos (2 lines)
resource('/api/products', { offline: true })
action(createOrder, { reliability: 'neverLose' })
```

---

## Quick Start

### 1. Install

```bash
npm install @sweidos/eidos
# or
pnpm add @sweidos/eidos
```

### 2. Add the service worker

```bash
cp node_modules/@sweidos/eidos/dist/eidos-sw.js public/eidos-sw.js
```

> **Vite users** — use the [first-class Vite plugin](#vite-plugin) to automate this.

### 3. Wrap your app

```tsx
import { EidosProvider } from '@sweidos/eidos'
import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')!).render(
  <EidosProvider swPath="/eidos-sw.js">
    <App />
  </EidosProvider>
)
```

### 4. Declare resources and actions at module scope

```ts
// src/lib/eidos.ts
// Module scope is required — actions must be registered before page reload
// for queue replay to work.
import { resource, action } from '@sweidos/eidos'

export const products = resource('/api/products', {
  offline: true,           // → StaleWhileRevalidate auto-selected
  maxAge: 5 * 60 * 1000,  // optional: treat cache as stale after 5 min
})

export const createOrder = action(
  async (payload: OrderPayload) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return res.json()
  },
  {
    reliability: 'neverLose',
    name: 'createOrder',
    onOptimistic: (payload) => {
      // Called immediately — update UI before the server responds
      addOptimisticOrder(payload)
    },
    onRollback: (payload) => {
      // Called only if maxRetries exhausted — revert the optimistic change
      removeOptimisticOrder(payload)
    },
    onConflict: (error, [payload]) => {
      // Called during replay when the server returns a 4xx (conflict, gone, etc.)
      // Return 'skip' to silently drop the item, or 'retry' to keep retrying.
      if (error instanceof Response && error.status === 409) {
        removeOptimisticOrder(payload) // revert UI
        return 'skip'                  // drop from queue — already handled server-side
      }
      return 'retry'
    },
  },
)
```

### 5. Use in components

```tsx
// TanStack Query — first-class hooks
import { useEidosQuery, useEidosMutation } from '@sweidos/eidos/query'

const { data, isPending } = useEidosQuery<Product[]>(products)

const mutation = useEidosMutation(createOrder, {
  invalidates: [products], // clears cache + refetches on success
})

// Or with plain useQuery
const { data } = useQuery(products.query<Product[]>())

// Or plain async
const data = await products.json<Product[]>()

// Actions work identically online and offline
const result = await createOrder({ productId: 1, qty: 2 })

if ('queued' in result) {
  // Persisted to IndexedDB — will replay automatically on reconnect
  console.log(result.message)
}
```

---

## API Reference

### `resource(url, config)`

Registers a URL as an offline-capable resource. Returns a `ResourceHandle`.

```ts
const handle = resource('/api/products', {
  offline: true,           // required — enables SW interception
  strategy?: 'cache-first' | 'stale-while-revalidate' | 'network-first',
  cacheName?: string,      // custom Cache Storage bucket (default: 'eidos-resources-v1')
  maxAge?: number,         // TTL in ms — expired entries are re-fetched from network
})

// URL patterns — SW intercepts all matching requests automatically
resource('/api/products/*',   { offline: true })  // single segment: /api/products/123
resource('/api/products/**',  { offline: true })  // multi-segment:  /api/products/123/reviews
resource('/api/users/:id',    { offline: true })  // named segment:  /api/users/abc

// Cross-origin resources — pass the full URL (including origin)
resource('https://api.example.com/products', { offline: true })
resource('https://cdn.example.com/assets/*', { offline: true })  // patterns work too
```

**Auto-selected strategy:**

| Config | Strategy | When to use |
|--------|----------|-------------|
| `offline: true` | `StaleWhileRevalidate` | Default — instant response + background refresh |
| `offline: true, strategy: 'cache-first'` | `CacheFirst` | Static assets, rarely-changing data |
| `offline: true, strategy: 'network-first'` | `NetworkFirst` | Always-fresh data with offline fallback |

**Handle methods:**

```ts
handle.fetch()       // Promise<Response> — fetches, respects maxAge
handle.json<T>()     // Promise<T> — fetch() + response.json()
handle.query<T>()    // { queryKey, queryFn } — TanStack Query compatible
handle.prefetch()    // Promise<void> — warm the cache
handle.invalidate()  // Promise<void> — evict cached entries
handle.unregister()  // void — remove from SW registry (required to re-register with different config)
```

**Handle properties:**

```ts
handle.url           // '/api/products'
handle.config        // the config you passed in
handle.strategy      // { name, swStrategy, cacheName, reasoning, behavior, equivalentCode }
```

---

### `action(fn, config)`

Wraps any async function with reliability guarantees. The wrapped function is a drop-in replacement.

```ts
const createOrder = action(
  async (payload: OrderPayload): Promise<Order> => { /* your fn */ },
  {
    reliability: 'neverLose',  // persist to IndexedDB + replay on reconnect
    maxRetries?: number,        // default: 3
    name?: string,              // label in devtools
    priority?: 'high' | 'normal' | 'low', // replay order (default: 'normal')
    onOptimistic?: (...args) => void,  // called immediately — update UI optimistically
    onRollback?: (...args) => void,    // called on permanent failure — revert UI
    onConflict?: (error, args) => 'retry' | 'skip', // called on 4xx during replay
  }
)

const result = await createOrder(payload)
// → Order when successful
// → { queued: true, id, message } when offline or network fails
```

**Reliability modes:**

| Mode | Behaviour |
|------|-----------|
| `best-effort` | Execute directly. No persistence, no retry. |
| `neverLose` | Persist args to IndexedDB before executing. Replay on reconnect with exponential backoff. |

**Exponential backoff:** `neverLose` actions that fail are retried with `2s × 2^retryCount` delay (capped at 5 min, ±20% jitter). Items not yet due are skipped on each replay pass.

**Conflict resolution:** when a 4xx HTTP response occurs during replay, `onConflict` is called with the thrown error and the original args. Return `'skip'` to silently remove the item from the queue without calling `onRollback`, or `'retry'` to continue normal retry/backoff behaviour.

A 4xx is detected when the thrown value is a `Response` with `status` in [400, 499], or any object with a `.status` property in that range.

```ts
onConflict: (error, [payload]) => {
  if (error instanceof Response && error.status === 409) {
    // already created server-side — safe to drop and revert UI
    removeOptimisticOrder(payload)
    return 'skip'
  }
  return 'retry' // keep in queue for everything else
}
```

**Queue prioritization:** `priority` controls the replay order when multiple queued actions are pending. `'high'` items all complete before `'normal'` items start; `'normal'` all complete before `'low'` items start. Within each tier, items run in parallel. Default: `'normal'`.

```ts
// Critical write — replays before any normal/low actions
const saveDocument = action(api.saveDocument, {
  reliability: 'neverLose',
  priority: 'high',
})

// Background analytics — replays last, after user-visible writes
const logEvent = action(api.logEvent, {
  reliability: 'neverLose',
  priority: 'low',
})
```

---

### `replayQueue()`

Manually trigger queue replay. Called automatically on reconnect when `autoReplay: true`. Returns a `ReplayResult` summary.

```ts
import { replayQueue } from '@sweidos/eidos'
import type { ReplayResult } from '@sweidos/eidos'

// Manual trigger — e.g. after a user clicks "Retry"
const result: ReplayResult = await replayQueue()
// { attempted: 3, succeeded: 2, failed: 0, retrying: 1, skipped: 0, conflicted: 0 }
//
// attempted  — items where the fn was found and called
// succeeded  — resolved successfully
// failed     — maxRetries exceeded, stays in queue
// retrying   — failed, will retry later (nextRetryAt set)
// skipped    — fn not in registry (module not imported yet)
// conflicted — 4xx response, onConflict returned 'skip', removed from queue
```

---

### `clearQueue()`

Remove all items from the action queue (IndexedDB + in-memory store). Useful for "clear all failed" UI controls and test teardown.

```ts
import { clearQueue } from '@sweidos/eidos'

await clearQueue()
```

---

### `EidosProvider`

React root component. Registers the SW and initialises the runtime.

```tsx
<EidosProvider
  swPath="/eidos-sw.js"  // default
  autoReplay={true}      // replay queue on reconnect, default: true
>
  <App />
</EidosProvider>
```

---

### React Hooks

```ts
import { useEidosStatus, useEidosResource, useEidosQueue, useEidosQueueStats, useEidosAction, useEidosOnDrain } from '@sweidos/eidos'

// Online status + SW lifecycle — cheap subscription, safe in headers
const { isOnline, swStatus, swError } = useEidosStatus()

// Live cache state for a single resource URL
const entry = useEidosResource('/api/products')
// entry → { status, cacheHits, cacheMisses, cachedAt, strategy, config, ... }

// The full action queue, reactive
const queue = useEidosQueue()

// Queue counts — only re-renders when a count changes, not on every mutation
const { pending, failed, replaying, total } = useEidosQueueStats()

// Live state for a single queue item — only re-renders when that item changes
const result = await createOrder(payload) // { queued: true, id: 'abc123', ... }
const item = useEidosAction(result.id)
// item → ActionQueueItem | undefined
// item?.status → 'pending' | 'replaying' | 'succeeded' | 'failed'

// Fire callback when queue drains to empty — for "all synced!" toasts
useEidosOnDrain(() => toast.success('All offline actions synced!'))

// Full store snapshot — use sparingly, prefer the narrower hooks above
const state = useEidos()
```

---

### Vue / Svelte / Vanilla JS Stores

Framework-agnostic reactive stores — no React dependency, zero extra peer deps. These implement the [Svelte store contract](https://svelte.dev/docs/svelte-components#script-4-prefix-stores-with-$-to-access-their-values) (`subscribe(run): unsubscribe`) so they work natively with Svelte's `$` prefix. They also wire up cleanly in Vue composables and plain JS.

```ts
import {
  eidosQueue, eidosStatus, eidosQueueStats,
  eidosResource, eidosAction, eidosStore,
} from '@sweidos/eidos'
```

**Svelte:**

```svelte
<script>
  import { eidosQueue, eidosStatus, eidosQueueStats, eidosResource } from '@sweidos/eidos'
  // Use $ prefix — Svelte auto-subscribes and unsubscribes
</script>

<p>Online: {$eidosStatus.isOnline}</p>
<p>Pending: {$eidosQueueStats.pending}</p>
<p>Cache hits: {$eidosResource('/api/products')?.cacheHits ?? 0}</p>

{#each $eidosQueue as item}
  <div>{item.actionName} — {item.status}</div>
{/each}
```

**Vue (Composition API):**

```ts
import { ref, onUnmounted } from 'vue'
import { eidosStatus, eidosQueue } from '@sweidos/eidos'

export function useEidosStatusVue() {
  const status = ref(eidosStatus.getState())
  const unsub  = eidosStatus.subscribe((v) => { status.value = v })
  onUnmounted(unsub)
  return status
}

export function useEidosQueueVue() {
  const queue = ref(eidosQueue.getState())
  const unsub = eidosQueue.subscribe((v) => { queue.value = v })
  onUnmounted(unsub)
  return queue
}
```

**Vanilla JS:**

```ts
import { eidosStatus, eidosResource } from '@sweidos/eidos'

const unsub = eidosStatus.subscribe(({ isOnline }) => {
  document.title = isOnline ? 'App' : 'App (offline)'
})

// Read current value once without subscribing
const hits = eidosResource('/api/products').getState()?.cacheHits ?? 0
```

| Store | Type | Emits when |
|-------|------|-----------|
| `eidosQueue` | `ActionQueueItem[]` | Any queue mutation |
| `eidosStatus` | `{ isOnline, swStatus, swError }` | Online or SW status changes |
| `eidosQueueStats` | `{ pending, failed, replaying, total }` | Any queue mutation |
| `eidosResource(url)` | `ResourceEntry \| undefined` | Resource registered or updated |
| `eidosAction(id)` | `ActionQueueItem \| undefined` | Item status changes or removal |
| `eidosStore` | `EidosStore` | Any state change |

---

### `warmCache(handles[])`

Bulk-prefetch an array of resource handles concurrently — warms the cache for all of them in one call. Useful on login or app init when you know which resources the user will need offline.

Pattern handles (containing `*`, `**`, or `:param`) are counted as failed — they match multiple URLs so there is no single URL to prefetch.

```ts
import { warmCache } from '@sweidos/eidos'
import type { WarmCacheResult } from '@sweidos/eidos'

// After login — warm the cache with the user's likely-needed data
const result: WarmCacheResult = await warmCache([products, userProfile, settings])
// { warmed: 3, failed: 0, errors: [] }
//
// warmed  — handles prefetched successfully
// failed  — handles that threw (network error, offline, pattern handle, etc.)
// errors  — the raw thrown values for failed handles
```

In development, a `console.warn` is printed for each failed handle.

---

### `setOfflineSimulation(enabled)`

Toggle offline simulation without physically disconnecting the network.

```ts
import { setOfflineSimulation } from '@sweidos/eidos'

setOfflineSimulation(true)   // SW serves only cached responses
setOfflineSimulation(false)  // restore normal behaviour
```

---

### `isBgSyncSupported()`

Returns `true` when the active SW registration supports the Background Sync API (Chrome 49+, Edge 79+, Safari 16+). Use to conditionally surface sync status in your UI.

```ts
import { isBgSyncSupported } from '@sweidos/eidos'

if (isBgSyncSupported()) {
  // browser will fire 'eidos-queue-replay' sync tag when connectivity returns,
  // even if the user briefly navigated away from the page
}
```

---

## Performance

Performance is a first-class concern in Eidos. Every design decision optimises for low overhead.

| Metric | Value | How |
|--------|-------|-----|
| **Bundle size** | 5.0 kB gzip | Zero runtime dependencies — not even a state library |
| **Re-renders** | Minimal | `useSyncExternalStore` with per-field selectors; components only re-render when their field changes |
| **Queue replay** | Parallel | `Promise.allSettled` — N pending actions replay concurrently, not serially |
| **IDB reads** | Index scan | `replayQueue` queries only `pending`/`failed` items via the status index — no full table scan |
| **Network timeout** | 3 s | `NetworkFirst` strategy aborts fetch after 3 s and falls back to cache — no hanging requests |
| **Pre-activation buffer** | Zero drops | Messages sent before the SW is active are buffered and flushed on activation |
| **Concurrency safety** | Lock-guarded | `_replaying` flag prevents duplicate replay passes from concurrent online events |
| **Request deduplication** | 1 request / N callers | Concurrent `handle.fetch()` calls for the same URL share one in-flight network request; each caller gets a cloned `Response` |

### Bundle comparison

| Version | Raw | Gzip | Change |
|---------|-----|------|--------|
| 1.0.5 (with zustand) | 35.0 kB | 7.9 kB | — |
| 1.0.6 (zero deps) | 18.6 kB | 5.0 kB | −47% |
| **1.0.21** (minified + dedup) | **19.0 kB** | **5.8 kB** | +0.5% raw vs 1.0.6 (dedup code), smaller than zustand baseline |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  Application Layer                           │
│  resource() · action() · EidosProvider       │  ← you write this
└────────────────┬────────────────────────────┘
                 │ EIDOS_REGISTER_RESOURCE (postMessage)
┌────────────────▼────────────────────────────┐
│  Runtime Layer  (@sweidos/eidos)             │
│  Strategy derivation · reactive store        │
│  SW bridge · IDB queue · exponential backoff │
└────────────────┬────────────────────────────┘
                 │ fetch intercept
┌────────────────▼────────────────────────────┐
│  Worker Layer   (eidos-sw.js)                │
│  CacheFirst · StaleWhileRevalidate           │
│  NetworkFirst · Offline simulation           │
└────────────────┬────────────────────────────┘
                 │ Cache API · IndexedDB
┌────────────────▼────────────────────────────┐
│  Storage Layer                               │
│  Cache Storage · IndexedDB (action queue)    │
└─────────────────────────────────────────────┘
```

### SW message protocol

**App → SW:**

| Message | Purpose |
|---------|---------|
| `EIDOS_REGISTER_RESOURCE` | Register a fetch-intercept rule |
| `EIDOS_UNREGISTER_RESOURCE` | Remove a rule |
| `EIDOS_CLEAR_CACHE` | Evict cache entries for a URL |
| `EIDOS_SIMULATE_OFFLINE` | Toggle offline simulation mode |
| `EIDOS_PING` | Health check |

**SW → App:**

| Message | Purpose |
|---------|---------|
| `EIDOS_CACHE_HIT` | Cached response was served |
| `EIDOS_CACHE_UPDATED` | Cache entry refreshed from network |
| `EIDOS_NETWORK_ERROR` | Network request failed |
| `EIDOS_CACHE_CLEARED` | Cache was cleared |
| `EIDOS_BACKGROUND_SYNC` | Browser fired `sync` event — runtime calls `replayQueue()` |

---

## Repository Structure

```
eidos/
├── api/                    Vercel serverless functions (demo endpoints)
├── packages/
│   ├── core/               @sweidos/eidos npm package
│   │   └── src/
│   │       ├── types.ts
│   │       ├── resource.ts     resource() — caching + handle
│   │       ├── action.ts       action() + exponential backoff queue replay
│   │       ├── runtime.ts      initEidos + SW registration
│   │       ├── store.ts        reactive store (useSyncExternalStore)
│   │       ├── sw-bridge.ts    postMessage channel
│   │       ├── idb.ts          IndexedDB CRUD wrapper
│   │       └── react/          EidosProvider + hooks
│   └── worker/             SW typed source
│       └── src/sw.ts       → compiles to eidos-sw.js
├── apps/
│   └── playground/         Interactive demo dashboard
│       └── public/
│           └── eidos-sw.js compiled service worker
└── .github/workflows/      CI/CD — deploy + npm release on push to main
```

---

## Vite Plugin

`@sweidos/eidos` ships a first-class Vite plugin via the `@sweidos/eidos/vite` subpath. It automatically copies `eidos-sw.js` from the installed package into your `public/` directory on every build and dev-server start — keeping the SW in sync with the installed version.

```ts
// vite.config.ts
import { eidos } from '@sweidos/eidos/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [eidos()],
})
```

**Options:**

```ts
eidos({
  swDest: 'public/eidos-sw.js', // default — relative to project root
})
```

No more manual `cp` step. The plugin runs on `buildStart` (prod builds) and `configureServer` (dev).

---

## TanStack Query Integration

`@sweidos/eidos/query` provides first-class hooks for [TanStack Query v5](https://tanstack.com/query/latest). Requires `@tanstack/react-query` — already optional in Eidos, just install it.

### Setup (once)

```ts
// main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { withEidosQueryClient } from '@sweidos/eidos/query'

const queryClient = new QueryClient()
withEidosQueryClient(queryClient) // bridges handle.invalidate() → TQ cache

root.render(
  <QueryClientProvider client={queryClient}>
    <EidosProvider swPath="/eidos-sw.js">
      <App />
    </EidosProvider>
  </QueryClientProvider>
)
```

### `useEidosQuery(handle, options?)`

Wraps `useQuery` with Eidos-smart defaults:
- `networkMode: 'always'` — Eidos owns offline; queries run even when `navigator.onLine` is false
- `retry: false` — Eidos handles retries at the SW/replay layer

```tsx
import { useEidosQuery } from '@sweidos/eidos/query'

function ProductList() {
  const { data, isPending, isError } = useEidosQuery<Product[]>(products)
  // ...
}
```

### `useEidosMutation(handle, options?)`

Wraps `useMutation` for a single-argument action handle:
- `networkMode: 'always'` — action queues offline automatically
- `invalidates` — clears Eidos cache + invalidates TQ entries on success

```tsx
import { useEidosMutation } from '@sweidos/eidos/query'

function OrderForm() {
  const mutation = useEidosMutation(createOrder, {
    invalidates: [products],           // refetch product list after order
    onSuccess(data) {
      if ('queued' in data) toast('Saved offline — will sync when back online')
      else toast(`Order #${data.id} created!`)
    },
  })

  return <button onClick={() => mutation.mutate({ productId: 1, qty: 2 })}>Buy</button>
}
```

### `withEidosQueryClient(client)`

Registers a `QueryClient` with Eidos. After calling this:
- `handle.invalidate()` also calls `queryClient.invalidateQueries({ queryKey: ['eidos', url] })`
- Both systems stay in sync automatically, even when cache is cleared outside of mutations

---

## Testing Utilities

`@sweidos/eidos/testing` provides first-class helpers for Vitest, Jest, and Playwright. Import only in test files.

```ts
import {
  mockOffline, mockOnline,
  drainQueue, waitForQueueDrain,
  getCachedEntry, clearEidosCache,
  resetEidos, getEidosState,
} from '@sweidos/eidos/testing'
```

### `resetEidos()` — `beforeEach` cleanup

```ts
beforeEach(async () => {
  await resetEidos()
  // ✓ queue cleared, resources cleared, online restored, _initialized reset
})
```

### Testing offline queuing

```ts
it('queues action while offline', async () => {
  mockOffline()
  await savePost({ title: 'Draft' })

  expect(getEidosState().queue).toHaveLength(1)
  expect(getEidosState().isOnline).toBe(false)
})
```

### Testing queue replay

```ts
it('replays queue on reconnect', async () => {
  mockOffline()
  await savePost({ title: 'Draft' })

  const result = await drainQueue()   // forces online + replays
  expect(result.succeeded).toBe(1)
})
```

### Testing cache state

```ts
it('caches the resource after first fetch', async () => {
  const products = resource('/api/products', { offline: true })
  await products.fetch()

  const cached = await getCachedEntry('/api/products')
  expect(cached).toBeDefined()
  const body = await cached!.json()
  expect(body).toEqual([...])
})
```

### API summary

| Helper | Description |
|--------|-------------|
| `mockOffline(opts?)` | Set `isOnline = false`. Pass `{ stubFetch: true }` to also make `fetch()` throw. |
| `mockOnline()` | Restore `isOnline = true`. Removes fetch stub if present. |
| `drainQueue()` | Force-replay queue now. Returns `ReplayResult`. |
| `waitForQueueDrain(opts?)` | Wait until no pending/replaying items. Timeout default 5s. |
| `getCachedEntry(url, name?)` | Read a `Response` from Cache Storage. Returns `undefined` if missing. |
| `clearEidosCache(name?)` | Delete an entire cache namespace (default: `eidos-resources-v1`). |
| `resetEidos()` | Full teardown: queue, resources, SW status, online state, runtime flag. |
| `getEidosState()` | Plain-object snapshot of store state (no store methods). |

---

## OpenAPI Codegen

`eidos-gen` is a standalone CLI that reads an OpenAPI 3.x spec (JSON or YAML) and generates a fully-typed Eidos declarations file — `resource()` for every GET endpoint, `action()` for every POST / PUT / PATCH / DELETE.

```bash
npx eidos-gen openapi.json
# → writes eidos.generated.ts
```

**Example output** (from a Store API spec):

```ts
// Generated by eidos-gen — edit function bodies freely, re-run to refresh declarations.
import { resource, action } from '@sweidos/eidos'

export interface Product { id: string; name: string; price: number; inStock?: boolean }
export interface CreateProductRequest { name: string; price: number }

// Resources (GET)
export const listProducts = resource('/api/products', { offline: true })
export const getProduct   = resource('/api/products/:id', { offline: true })

// Actions (POST / PUT / PATCH / DELETE)
export const createProduct = action(
  async (payload: CreateProductRequest): Promise<Product> => {
    const res = await fetch('/api/products', { method: 'POST', ... })
    return res.json()
  },
  { reliability: 'neverLose', name: 'createProduct' },
)
export const deleteProduct = action(
  async (payload: { id: string }): Promise<void> => {
    const res = await fetch(`/api/products/${payload.id}`, { method: 'DELETE' })
    ...
  },
  { reliability: 'neverLose', name: 'deleteProduct' },
)
```

`eidos-gen` handles:
- **Path params** — `{id}` → `:id` on resources; `{ id: string } & RequestBody` on actions with template-literal URL interpolation
- **Type generation** — interfaces from `components/schemas` (objects, enums, unions, arrays)
- **`$ref` resolution** — schema references inline as type names
- **Response types** — `200`/`201`/`202` response body type used as the action return type
- **DELETE with no body** — omits `Content-Type` / `body`, handles 204 no-content

**Options:**

```bash
npx eidos-gen <spec>                   # JSON or YAML
npx eidos-gen <spec> --out src/lib/eidos.ts
npx eidos-gen <spec> --no-offline       # set offline:false on resources
npx eidos-gen <spec> --eidos ./my-fork  # custom import path
```

---

## SSR Adapters

Eidos is browser-only — Service Workers, Cache API, and IndexedDB are not available in Node.js. The runtime already no-ops safely when `window` is undefined, but two subpath exports make integration with SSR frameworks seamless.

### Next.js App Router (`@sweidos/eidos/nextjs`)

Imports from this subpath are pre-marked `'use client'`, so you can use `EidosProvider` and all hooks directly in your App Router layout without creating your own wrapper file.

```tsx
// app/providers.tsx  ← no 'use client' needed here
import { EidosProvider, useEidosStatus } from '@sweidos/eidos/nextjs'

export function Providers({ children }: { children: React.ReactNode }) {
  return <EidosProvider swPath="/eidos-sw.js">{children}</EidosProvider>
}
```

The `'use client'` boundary is on the published `dist/nextjs.js` — Next.js recognises it and marks everything imported through that entry as client code.

### SvelteKit (`@sweidos/eidos/sveltekit`)

Use `initEidosSvelteKit()` inside `onMount` in your root `+layout.svelte`. The helper returns an `onMount`-compatible callback that defers init to the browser, keeping SSR clean.

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { onMount } from 'svelte'
  import { initEidosSvelteKit } from '@sweidos/eidos/sveltekit'

  onMount(initEidosSvelteKit({ swPath: '/eidos-sw.js', autoReplay: true }))
</script>

<slot />
```

Use the framework-agnostic stores (`eidosQueue`, `eidosStatus`, etc.) from the main `@sweidos/eidos` import in your Svelte components — they work with Svelte's `$` auto-subscribe prefix out of the box.

### React Native (`@sweidos/eidos/react-native`)

The React Native subpath swaps the browser-specific backends (IndexedDB, Service Worker, Cache API) for a pluggable `AsyncStorage`-backed queue while keeping the same `action()` / `resource()` API surface.

**Setup**

```bash
# peer deps
npm install @react-native-async-storage/async-storage @react-native-community/netinfo
```

```ts
// index.js — before rendering anything
import AsyncStorage from '@react-native-async-storage/async-storage'
import { initEidosRN } from '@sweidos/eidos/react-native'

await initEidosRN({ storage: AsyncStorage })
```

```tsx
// App.tsx
import { useNetInfo } from '@react-native-community/netinfo'
import { EidosProviderRN } from '@sweidos/eidos/react-native'

export function App() {
  const { isConnected } = useNetInfo()
  return (
    <EidosProviderRN isConnected={isConnected ?? true}>
      <Navigation />
    </EidosProviderRN>
  )
}
```

```ts
// Declare actions exactly as you would in a web app
import { action } from '@sweidos/eidos'

export const createOrder = action(
  async (payload: CreateOrderInput) => {
    const res = await fetch('/api/orders', { method: 'POST', body: JSON.stringify(payload) })
    if (!res.ok) throw res
    return res.json()
  },
  { reliability: 'neverLose', name: 'createOrder' },
)
```

Actions queued while offline are persisted to AsyncStorage and replayed automatically when the device reconnects.

**Custom storage**

`AsyncStorageLike` accepts any key-value store that implements `getItem` / `setItem` / `removeItem` — you can use MMKV or SQLite instead of AsyncStorage:

```ts
import { MMKV } from 'react-native-mmkv'
import { AsyncStorageQueueStorage, setQueueStorage } from '@sweidos/eidos/react-native'

const mmkv = new MMKV()
setQueueStorage(new AsyncStorageQueueStorage({
  getItem: async (key) => mmkv.getString(key) ?? null,
  setItem: async (key, value) => mmkv.set(key, value),
  removeItem: async (key) => mmkv.delete(key),
}))
```

**What works in RN vs web**

| Feature | Web | React Native |
|---------|-----|--------------|
| `action()` queue + replay | ✅ IndexedDB | ✅ AsyncStorage |
| Offline-aware (auto-queue) | ✅ | ✅ |
| `resource()` in-memory caching | ✅ | ✅ (in-memory only — no SW) |
| `resource()` offline persistence | ✅ Cache API + SW | ❌ (fetch from API when online) |
| `useEidos`, `useEidosQueue` hooks | ✅ | ✅ |
| Background Sync | ✅ | ❌ (App must be foregrounded) |

---

## Devtools

`@sweidos/eidos/devtools` exports a floating panel component you can drop into any React app during development. It shows live queue state, cache entries, SW registration status, and lets you toggle offline simulation — all without leaving your app.

```tsx
import { EidosDevtools } from '@sweidos/eidos/devtools'

// Add anywhere in your component tree (bottom-right by default)
export default function App() {
  return (
    <>
      <YourApp />
      {process.env.NODE_ENV === 'development' && <EidosDevtools />}
    </>
  )
}
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `position` | `'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left'` | `'bottom-right'` | Corner to anchor the panel |
| `defaultOpen` | `boolean` | `false` | Start expanded |

**Panel features:**
- **Status bar** — online/offline indicator, SW registration status, offline simulation toggle (`setOfflineSimulation`)
- **Queue tab** — all queue items with status badges (`pending` / `replaying` / `succeeded` / `failed`), priority, retry count, plus Replay and Clear buttons
- **Cache tab** — all registered resources with cache status, strategy name, hit/miss counts, and last cached timestamp

The component is self-contained with inline styles — no CSS import needed, no style conflicts.

---

## Known Limitations

| Limitation | Detail |
|------------|--------|
| GET-only caching | SW intercepts `GET` only. `POST`/`PUT`/`DELETE` are not cached (but *are* queued via `action()`). |
| Query string ignored | Resources match by pathname (or full URL for cross-origin). `/api/products?page=2` and `/api/products` share the same SW rule but are cached as separate entries. |
| Module-scope actions | `action()` must be called at module scope so functions are registered before a page reload triggers queue replay. |
| Single SW | `EidosProvider` assumes one SW at `/eidos-sw.js`. Multiple registrations are unsupported. |
| React in main bundle | ~~Fixed in v1.0.22~~ — ESM output uses `preserveModules`; Vue/Svelte/vanilla consumers only pull in the modules they import. React is isolated to `dist/react/hooks.js` and `dist/react/Provider.js`. |

---

## Roadmap

- [x] Cache TTL / `maxAge` expiration
- [x] Exponential backoff with jitter for queue replay
- [x] Per-resource `cacheName` override
- [x] `resource.unregister()` for cleanup
- [x] URL pattern matching (`*`, `**`, `:param`)
- [x] Cross-origin resource support
- [x] Background Sync API integration
- [x] Vite plugin (`@sweidos/eidos/vite` subpath — ships in the main package)
- [x] Vue / Svelte bindings (framework-agnostic reactive stores)
- [x] TanStack Query integration (`@sweidos/eidos/query` subpath — `useEidosQuery`, `useEidosMutation`, `withEidosQueryClient`)

**Core reliability**
- [x] Optimistic updates — `onOptimistic` / `onRollback` callbacks on `action()` for instant UI feedback before server confirms
- [x] Conflict resolution hook — `onConflict` callback when replaying a queued action returns 4xx; decide per-item: retry or skip
- [x] Queue prioritization — `priority: 'high' | 'normal' | 'low'` on `action()`; high-priority items replay first

**DX / Tooling**
- [x] Devtools panel component — drop-in `<EidosDevtools />` showing cache entries, queue state, replay status, and offline toggle
- [x] Testing utilities (`@sweidos/eidos/testing`) — `mockOffline()`, `mockOnline()`, `drainQueue()`, `waitForQueueDrain()`, `getCachedEntry(url)`, `clearEidosCache()`, `resetEidos()`, `getEidosState()` for Vitest / Playwright
- [x] SvelteKit / Next.js adapters — SSR-aware init helpers that skip SW registration server-side

**Performance**
- [x] Request deduplication — multiple simultaneous `resource.fetch()` calls share one in-flight network request; each caller gets an independent cloned `Response`
- [x] Cache warming — `warmCache(handles[])` bulk-prefetches a list of resources on init (e.g. on login)

**Ecosystem**
- [x] React Native support — `@sweidos/eidos/react-native`; AsyncStorage-backed queue, same `action()` API surface; `EidosProviderRN` syncs NetInfo connectivity into the replay loop
- [x] OpenAPI codegen CLI — `npx eidos-gen ./openapi.json` generates typed `resource()` and `action()` declarations

---

## Contributing

```bash
pnpm install          # install all workspace deps
pnpm dev              # run playground at localhost:3000
pnpm type-check       # typecheck all packages
pnpm --filter @sweidos/eidos build   # build core package
```

The project uses pnpm workspaces. TypeScript strict mode throughout.

---

## License

MIT © Aditya Raj
