# Eidos

> Describe intent. The runtime figures out how.

Eidos is a small, opinionated abstraction layer for building offline-first web applications. Instead of configuring Service Workers, Cache API strategies, and IndexedDB queues directly, you declare **what you want** and the runtime generates the required behaviour.

```ts
import { resource, action } from 'eidos'

// "I want this resource to work offline."
const products = resource('/api/products', {
  offline: true,
})

// "I never want to lose this action."
const createOrder = action(orderApi.create, {
  reliability: 'neverLose',
})
```

That's it. No service worker file to write. No cache strategy to configure. No retry logic to implement.

---

## The Problem

Building offline-capable web apps today requires a working knowledge of:

- Service Worker registration and lifecycle management
- Cache API and caching strategies (cache-first, network-first, SWR)
- Fetch event interception and URL routing
- IndexedDB schema design for persistent action queues
- Background Sync API and exponential retry logic
- Cache versioning and stale entry cleanup

This is a large surface area, separate from your application logic, that every team re-implements from scratch.

## The Vision

Developers should describe **what they want**, not **how the browser should implement it**.

```ts
// Before Eidos
// workbox-config.js
registerRoute(
  ({ url }) => url.pathname === '/api/products',
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 60 })],
  }),
)

// service-worker.js
self.addEventListener('sync', (event) => {
  if (event.tag === 'create-order') {
    event.waitUntil(replayOrders())
  }
})

// After Eidos
resource('/api/products', { offline: true })
action(createOrder, { reliability: 'neverLose' })
```

---

## Quick Start

### Install

```bash
npm install eidos
# or
pnpm add eidos
```

### Add the service worker

Copy `eidos-sw.js` to your project's `public/` directory:

```bash
cp node_modules/eidos/dist/eidos-sw.js public/eidos-sw.js
```

> **Vite users** — you can also add a plugin to do this automatically. See [setup guide](#vite-plugin).

### Wrap your app

```tsx
import { EidosProvider } from 'eidos'

createRoot(document.getElementById('root')!).render(
  <EidosProvider swPath="/eidos-sw.js">
    <App />
  </EidosProvider>
)
```

### Declare resources and actions

```ts
// src/lib/eidos.ts — module scope, so replay survives page reload
import { resource, action } from 'eidos'

export const products = resource('/api/products', {
  offline: true,
})

export const createOrder = action(
  async (payload: OrderPayload) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return res.json()
  },
  { reliability: 'neverLose' },
)
```

### Use in components

```tsx
// With TanStack Query
const { data } = useQuery(products.query())

// Or plain
const data = await products.json()

// Actions work identically online and offline
const result = await createOrder({ productId: 1, qty: 2 })

if ('queued' in result) {
  console.log(result.message) // "createOrder queued — will execute when online"
}
```

---

## API Reference

### `resource(url, config)`

Registers a URL as an offline-capable resource. Returns a handle for fetching and cache management.

```ts
const products = resource('/api/products', {
  offline: true,           // required: enables SW interception
  strategy?: 'cache-first' | 'stale-while-revalidate' | 'network-first',
  cacheName?: string,      // custom cache bucket
})

// Handle methods
products.fetch()           // → Promise<Response>
products.json<T>()         // → Promise<T>
products.query()           // → { queryKey, queryFn } for TanStack Query
products.prefetch()        // → Promise<void>
products.invalidate()      // → Promise<void> — clears SW cache entry

// Handle properties
products.url               // '/api/products'
products.strategy          // generated GeneratedStrategy object
products.config            // the config you passed in
```

**Strategy selection:**

| Intent | Generated Strategy | Reasoning |
|---|---|---|
| `offline: true` | `StaleWhileRevalidate` | Best balance of speed and freshness for resilient resources |
| `offline: true, strategy: 'cache-first'` | `CacheFirst` | Maximum speed, data rarely changes |
| `offline: true, strategy: 'network-first'` | `NetworkFirst` | Freshness critical, cache as fallback only |

### `action(fn, config)`

Wraps an async function with reliability guarantees. The wrapped function is a drop-in replacement — calling it is identical whether you're online or offline.

```ts
const createOrder = action(
  async (payload: OrderPayload): Promise<Order> => {
    // your existing async function, unchanged
  },
  {
    reliability: 'neverLose', // persist to IndexedDB if call fails or offline
    maxRetries?: number,       // default: 3
    name?: string,             // label shown in devtools
  }
)

// Returns TReturn when successful, QueuedResult when queued
const result = await createOrder(payload)
```

**Reliability modes:**

| Mode | Behaviour |
|---|---|
| `best-effort` | Call directly. No persistence, no retry. |
| `neverLose` | Persist args to IndexedDB before executing. Replay on reconnect. |

### `replayQueue()`

Manually trigger queue replay. Called automatically on the `online` event when `autoReplay: true` (the default).

```ts
import { replayQueue } from 'eidos'

window.addEventListener('online', replayQueue)
```

### `EidosProvider`

Root provider that registers the SW and initialises the runtime.

```tsx
<EidosProvider
  swPath="/eidos-sw.js"   // default
  autoReplay={true}       // replay queue on reconnect, default: true
>
  <App />
</EidosProvider>
```

### React Hooks

```ts
import { useEidosStatus, useEidosResource, useEidosQueue } from 'eidos'

// Online + SW status — cheap, safe in headers
const { isOnline, swStatus } = useEidosStatus()

// Live state for a single resource
const entry = useEidosResource('/api/products')
// → { status, cacheHits, cachedAt, strategy, ... }

// The full action queue
const queue = useEidosQueue()

// Full store (use sparingly)
const state = useEidos()
```

### `setOfflineSimulation(enabled)`

Toggle offline simulation from devtools or tests. Sends a message to the SW to serve only cached responses.

```ts
import { setOfflineSimulation } from 'eidos'

setOfflineSimulation(true)   // force offline
setOfflineSimulation(false)  // restore normal
```

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  Application Layer                           │
│  resource() · action() · EidosProvider       │  ← you write this
└────────────────┬────────────────────────────┘
                 │ postMessage(EIDOS_REGISTER_RESOURCE)
┌────────────────▼────────────────────────────┐
│  Runtime Layer (packages/core)               │
│  Strategy derivation · Zustand store         │  ← eidos npm package
│  SW bridge · IDB queue                       │
└────────────────┬────────────────────────────┘
                 │ fetch intercept
┌────────────────▼────────────────────────────┐
│  Worker Layer (eidos-sw.js)                  │
│  CacheFirst · StaleWhileRevalidate           │  ← generated SW
│  NetworkFirst · Offline simulation           │
└────────────────┬────────────────────────────┘
                 │ Cache API · IndexedDB
┌────────────────▼────────────────────────────┐
│  Storage Layer                               │
│  Cache Storage · IndexedDB (action queue)    │  ← browser APIs
└─────────────────────────────────────────────┘
```

### Service Worker protocol

The runtime communicates with `eidos-sw.js` via `postMessage`. Messages sent from the app:

| Message | Purpose |
|---|---|
| `EIDOS_REGISTER_RESOURCE` | Add a fetch-intercept rule |
| `EIDOS_UNREGISTER_RESOURCE` | Remove a rule |
| `EIDOS_CLEAR_CACHE` | Evict cache entries |
| `EIDOS_SIMULATE_OFFLINE` | Toggle offline simulation |
| `EIDOS_PING` | Health check |

Messages received from the SW:

| Message | Purpose |
|---|---|
| `EIDOS_CACHE_HIT` | A cached response was served |
| `EIDOS_CACHE_UPDATED` | Cache entry was refreshed from network |
| `EIDOS_NETWORK_ERROR` | Network request failed |
| `EIDOS_CACHE_CLEARED` | Cache was cleared |

---

## Repository Structure

```
eidos/
├── packages/
│   ├── core/           eidos npm package
│   │   └── src/
│   │       ├── types.ts
│   │       ├── resource.ts     resource() implementation
│   │       ├── action.ts       action() + queue replay
│   │       ├── runtime.ts      init + SW registration
│   │       ├── store.ts        Zustand store
│   │       ├── sw-bridge.ts    postMessage channel
│   │       ├── idb.ts          IndexedDB wrapper
│   │       └── react/          EidosProvider + hooks
│   └── worker/         SW typed source
│       └── src/sw.ts   → compiles to eidos-sw.js
├── apps/
│   └── playground/     interactive demo dashboard
│       └── public/
│           └── eidos-sw.js   compiled service worker
└── examples/           (planned)
```

---

## Dev Dashboard

The playground at `apps/playground` is a full interactive dashboard that demonstrates every feature:

```bash
pnpm dev   # → http://localhost:3000
```

It includes:

- **Overview** — live status + interactive products/orders demos
- **Resources** — every registered resource with cache stats and strategy detail
- **Action Queue** — live queue with per-item status and replay controls
- **Intent Inspector** — step-by-step trace from intent declaration to SW rule
- **How It Works** — architecture diagrams and lifecycle walkthroughs

---

## Vite Plugin

To automatically copy `eidos-sw.js` into `public/` during dev and build, add this to your `vite.config.ts`:

```ts
import { copyFileSync } from 'fs'
import { resolve } from 'path'

function eidosPlugin() {
  return {
    name: 'eidos-sw',
    buildStart() {
      copyFileSync(
        resolve('./node_modules/eidos/dist/eidos-sw.js'),
        resolve('./public/eidos-sw.js'),
      )
    },
  }
}
```

---

## Known Limitations

These are real limitations in v0.1. They are documented so you know exactly what you're getting.

| Limitation | Detail |
|---|---|
| GET-only caching | The SW only intercepts `GET` requests. `POST`/`PUT`/`DELETE` are never cached. |
| Pathname matching | Resources match by pathname only. Cross-origin URLs require the full URL to be registered. |
| Module-scope actions | `action()` must be called at module scope for replay to work after a page reload. |
| No TTL | Cached resources do not expire automatically. Call `resource.invalidate()` to clear. |
| Single SW | `EidosProvider` assumes `/eidos-sw.js`. Multiple SW registrations in one app are unsupported. |

---

## Roadmap

- [ ] URL pattern matching (wildcards, regex)
- [ ] Cache TTL / expiration
- [ ] Cross-origin resource support
- [ ] Background Sync integration (native browser API)
- [ ] Vite plugin (first-class, published separately)
- [ ] React Native / Expo adapter
- [ ] TanStack Query integration package

---

## Contributing

```bash
# Install
pnpm install

# Run the playground
pnpm dev

# Type-check everything
pnpm type-check

# Build the core package
pnpm build:core
```

The project uses pnpm workspaces. TypeScript strict mode is enabled everywhere.

The naming (`Eidos`) is a placeholder. All references are easy to find/replace — the package name, SW filename, and message prefix are the only places the name appears.

---

## License

MIT © Aditya Raj
