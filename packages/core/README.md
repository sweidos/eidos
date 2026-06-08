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

> **Vite users** — automate this with the [Vite plugin snippet](#vite-plugin).

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
  { reliability: 'neverLose', name: 'createOrder' },
)
```

### 5. Use in components

```tsx
// TanStack Query
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

---

### `replayQueue()`

Manually trigger queue replay. Called automatically on reconnect when `autoReplay: true`.

```ts
import { replayQueue } from '@sweidos/eidos'

// Manual trigger — e.g. after a user clicks "Retry"
await replayQueue()
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
import { useEidosStatus, useEidosResource, useEidosQueue } from '@sweidos/eidos'

// Online status + SW lifecycle — cheap subscription, safe in headers
const { isOnline, swStatus, swError } = useEidosStatus()

// Live cache state for a single resource URL
const entry = useEidosResource('/api/products')
// entry → { status, cacheHits, cacheMisses, cachedAt, strategy, config, ... }

// The full action queue, reactive
const queue = useEidosQueue()

// Full Zustand store — use sparingly
const state = useEidos()
```

---

### `setOfflineSimulation(enabled)`

Toggle offline simulation without physically disconnecting the network.

```ts
import { setOfflineSimulation } from '@sweidos/eidos'

setOfflineSimulation(true)   // SW serves only cached responses
setOfflineSimulation(false)  // restore normal behaviour
```

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
│  Strategy derivation · Zustand store         │
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
│   │       ├── store.ts        Zustand store
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

Automatically copy `eidos-sw.js` into `public/` on build:

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
| GET-only caching | SW intercepts `GET` only. `POST`/`PUT`/`DELETE` are not cached (but *are* queued via `action()`). |
| Pathname matching | Resources match by pathname. `/api/products?page=2` and `/api/products` share the same SW rule but are cached separately. |
| Module-scope actions | `action()` must be called at module scope so functions are registered before a page reload triggers queue replay. |
| Single SW | `EidosProvider` assumes one SW at `/eidos-sw.js`. Multiple registrations are unsupported. |

---

## Roadmap

- [x] Cache TTL / `maxAge` expiration
- [x] Exponential backoff with jitter for queue replay
- [x] Per-resource `cacheName` override
- [x] `resource.unregister()` for cleanup
- [ ] URL pattern matching (wildcards, regex)
- [ ] Cross-origin resource support
- [ ] Background Sync API integration
- [ ] Vite plugin (first-class, published separately)
- [ ] Vue / Svelte bindings
- [ ] TanStack Query integration package

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
