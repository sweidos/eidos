# @sweidos/eidos

[![npm](https://img.shields.io/npm/v/@sweidos/eidos)](https://www.npmjs.com/package/@sweidos/eidos)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/iamadi11/eidos/blob/main/LICENSE)

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

**[→ Live playground](https://playground-iamadi11s-projects.vercel.app)** · **[GitHub](https://github.com/iamadi11/eidos)**

---

## Install

```bash
npm install @sweidos/eidos
# or
pnpm add @sweidos/eidos
```

Then copy the compiled service worker into your `public/` directory:

```bash
cp node_modules/@sweidos/eidos/dist/eidos-sw.js public/eidos-sw.js
```

---

## Quick Start

**1. Wrap your app:**

```tsx
import { EidosProvider } from '@sweidos/eidos'
import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')!).render(
  <EidosProvider swPath="/eidos-sw.js">
    <App />
  </EidosProvider>
)
```

**2. Declare resources and actions at module scope:**

```ts
// src/lib/eidos.ts
// Module scope is required — actions must register before page reload for replay.
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
  { reliability: 'neverLose', name: 'createOrder' },
)
```

**3. Use in components:**

```tsx
// TanStack Query
const { data } = useQuery(products.query<Product[]>())

// Or plain async
const data = await products.json<Product[]>()

// Actions work identically online and offline
const result = await createOrder({ productId: 1, qty: 2 })

if ('queued' in result) {
  // Persisted to IndexedDB — replays automatically on reconnect
  console.log(result.message)
}
```

---

## API Reference

### `resource(url, config)`

```ts
const handle = resource('/api/products', {
  offline: true,           // required — enables SW interception
  strategy?: 'cache-first' | 'stale-while-revalidate' | 'network-first',
  cacheName?: string,      // custom Cache Storage bucket (default: 'eidos-resources-v1')
  maxAge?: number,         // TTL in ms — expired entries are re-fetched from network
})
```

**Auto-selected strategy:**

| Config | Strategy | When to use |
|--------|----------|-------------|
| `offline: true` | `StaleWhileRevalidate` | Default — instant response + background refresh |
| `offline: true, strategy: 'cache-first'` | `CacheFirst` | Static assets, rarely-changing data |
| `offline: true, strategy: 'network-first'` | `NetworkFirst` | Always-fresh data with offline fallback |

**Handle methods:**

```ts
handle.fetch()       // Promise<Response>
handle.json<T>()     // Promise<T>
handle.query<T>()    // { queryKey, queryFn } — TanStack Query compatible
handle.prefetch()    // Promise<void>
handle.invalidate()  // Promise<void> — evict cached entries
handle.unregister()  // void — remove from SW + registry
```

---

### `action(fn, config)`

```ts
const createOrder = action(
  async (payload: OrderPayload): Promise<Order> => { /* your fn */ },
  {
    reliability: 'neverLose',  // or 'best-effort'
    maxRetries?: number,        // default: 3
    name?: string,              // explicit registry key — required for anonymous fns
  }
)

const result = await createOrder(payload)
// → Order  when online and successful
// → { queued: true, id, message }  when offline or network fails (neverLose only)
```

**Reliability modes:**

| Mode | Behaviour |
|------|-----------|
| `best-effort` | Call directly. No persistence, no retry. |
| `neverLose` | Persist to IndexedDB before executing. Replay on reconnect with exponential backoff. |

**Exponential backoff:** Failed `neverLose` actions are retried at `2s × 2^retryCount` intervals (capped at 5 min, ±20% jitter). Items not yet due are skipped on each replay pass.

---

### `replayQueue()`

```ts
import { replayQueue } from '@sweidos/eidos'

await replayQueue()
// Skips items where nextRetryAt > Date.now() (backoff not yet expired)
```

Called automatically on reconnect when `autoReplay: true` (the default).

---

### `EidosProvider`

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
import { useEidosStatus, useEidosResource, useEidosQueue } from '@sweidos/eidos'

const { isOnline, swStatus, swError } = useEidosStatus()

const entry = useEidosResource('/api/products')
// → { status, cacheHits, cacheMisses, cachedAt, strategy, config, ... }

const queue = useEidosQueue()
// → ActionQueueItem[] — reactive, updates on every status change
```

---

### `setOfflineSimulation(enabled)`

```ts
import { setOfflineSimulation } from '@sweidos/eidos'

setOfflineSimulation(true)   // SW serves only cached responses, isOnline = false
setOfflineSimulation(false)  // restore — triggers replayQueue() after 600ms
```

---

## Vite Plugin

Auto-copy the SW on build:

```ts
// vite.config.ts
import { copyFileSync } from 'fs'
import { resolve } from 'path'

function eidosPlugin() {
  return {
    name: 'eidos-sw',
    buildStart() {
      copyFileSync(
        resolve('./node_modules/@sweidos/eidos/dist/eidos-sw.js'),
        resolve('./public/eidos-sw.js'),
      )
    },
  }
}
```

---

## Known Limitations

| Limitation | Detail |
|------------|--------|
| GET-only caching | SW intercepts `GET` only. `POST`/`PUT`/`DELETE` are not cached (but are queued via `action()`). |
| Pathname matching | Resources match by pathname. `/api/products?page=2` uses the same SW rule as `/api/products` but caches separately. |
| Module-scope actions | `action()` must run at module scope so functions are registered before a page reload triggers replay. |
| Single SW | `EidosProvider` assumes one SW at `/eidos-sw.js`. |
| Main-thread replay | Queue replay runs in the main thread, not Background Sync API. The page must be open for replay to fire. |

---

## License

MIT © Aditya Raj
