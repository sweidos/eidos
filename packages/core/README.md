# Eidos

[![npm version](https://img.shields.io/npm/v/@sweidos/eidos?color=22C55E&label=npm)](https://www.npmjs.com/package/@sweidos/eidos)
[![npm downloads](https://img.shields.io/npm/dm/@sweidos/eidos?color=22C55E)](https://www.npmjs.com/package/@sweidos/eidos)
[![bundle size](https://deno.bundlejs.com/badge?q=@sweidos/eidos&badge=detailed&color=22C55E)](https://bundlejs.com/?q=@sweidos/eidos)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-22C55E)](https://www.typescriptlang.org/)
[![CI](https://github.com/sweidos/eidos/actions/workflows/deploy.yml/badge.svg)](https://github.com/sweidos/eidos/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E.svg)](LICENSE)

> **Never lose a write.**

Declare what your app needs offline. Eidos picks the cache strategy, registers the Service Worker, and persists your action queue to IndexedDB — with idempotency keys and cross-tab replay locks built in, so a queued mutation runs exactly once.

```ts
import { resource, action } from '@sweidos/eidos';

const products = resource('/api/products', { offline: true });
const createOrder = action(orderApi.create, { reliability: 'neverLose' });
```

No service worker file to write. No cache strategy to configure. No retry logic to implement.

**[→ Documentation](https://sweidos.vercel.app/overview)** · **[→ Live playground](https://sweidos.vercel.app)** · **[→ npm](https://www.npmjs.com/package/@sweidos/eidos)**

---

## The problem

Every offline-first app re-implements the same surface area:

```ts
// Before — workbox-config.js + sw.js + queue.ts (100+ lines across 3 files)
registerRoute(
  ({ url }) => url.pathname === '/api/products',
  new StaleWhileRevalidate({ cacheName: 'api-cache', plugins: [...] }),
)
self.addEventListener('sync', (event) => {
  if (event.tag === 'create-order') event.waitUntil(replayOrders())
})
// + IndexedDB schema, retry logic, backoff math, reconnect listener...

// After — eidos (2 lines)
resource('/api/products', { offline: true })
action(createOrder, { reliability: 'neverLose' })
```

---

## Quick start

### 1. Install

```bash
npm install @sweidos/eidos
# pnpm add @sweidos/eidos
# yarn add @sweidos/eidos
```

### 2. Register the Vite plugin (auto-copies the service worker)

```ts
// vite.config.ts
import { eidos } from '@sweidos/eidos/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [eidos()],
});
```

> **Without Vite** — copy manually: `cp node_modules/@sweidos/eidos/dist/eidos-sw.js public/`

### 3. Wrap your app and declare resources

```tsx
// main.tsx
import { EidosProvider } from '@sweidos/eidos';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <EidosProvider swPath="/eidos-sw.js">
    <App />
  </EidosProvider>,
);
```

```ts
// src/lib/eidos.ts  ← module scope required for queue replay after reload
import { resource, action } from '@sweidos/eidos';

export const products = resource('/api/products', { offline: true });

export const createOrder = action(
  async (payload: OrderPayload) => {
    const res = await fetch('/api/orders', { method: 'POST', body: JSON.stringify(payload) });
    return res.json();
  },
  { reliability: 'neverLose', name: 'createOrder' },
);
```

```tsx
// In components — works the same online and offline
const result = await createOrder({ productId: 1, qty: 2 });

if ('queued' in result) {
  // Saved to IndexedDB — replays automatically on reconnect
  console.log(result.message);
}
```

---

## What you get

| Feature                     | Description                                                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Auto strategy selection** | `offline: true` → StaleWhileRevalidate. No config needed. Override when you want.                                           |
| **Persistent action queue** | Failed writes go to IndexedDB and replay with exponential backoff on reconnect.                                             |
| **Request deduplication**   | Concurrent `resource.fetch()` calls share one in-flight request.                                                            |
| **Optimistic updates**      | `onOptimistic` / `onRollback` callbacks for instant UI feedback.                                                            |
| **Conflict resolution**     | `conflict: { strategy: 'serverWins' \| 'clientWins' \| 'merge' \| 'custom' }` on 4xx replay responses.                      |
| **Idempotent replay**       | Stable `idempotencyKey` per invocation, forwarded to `fn` via `ActionContext` — safe retries even after a dropped response. |
| **Cancellable actions**     | `cancellable: true` → `AbortSignal` per call, plus `handle.cancel(idempotencyKey)`.                                         |
| **Queue prioritization**    | `priority: 'high' \| 'normal' \| 'low'` — high items replay before normal.                                                  |
| **Cache warming**           | `warmCache(handles[])` bulk-prefetches resources on login/init.                                                             |
| **URL patterns**            | `/api/products/*`, `/api/users/:id`, `**` wildcards — SW intercepts all matches.                                            |
| **Background Sync**         | Registers a `sync` tag so queued actions replay even after tab close.                                                       |
| **Devtools panel**          | `<EidosDevtools />` — live queue, cache state, offline toggle, no CSS import.                                               |
| **Testing helpers**         | `mockOffline`, `drainQueue`, `resetEidos`, `getCachedEntry` for Vitest/Jest.                                                |
| **OpenAPI codegen**         | `npx eidos-gen openapi.json` generates typed `resource()` + `action()` declarations.                                        |

---

## Framework support

| Framework                  | Import path                   | Notes                                                          |
| -------------------------- | ----------------------------- | -------------------------------------------------------------- |
| **React**                  | `@sweidos/eidos`              | Hooks + `EidosProvider`                                        |
| **Next.js App Router**     | `@sweidos/eidos/nextjs`       | Pre-marked `'use client'` — no wrapper needed                  |
| **Next.js Server Actions** | `@sweidos/next`               | `serverAction()` neverLose wrapper + idempotency context       |
| **SvelteKit**              | `@sweidos/eidos/sveltekit`    | `initEidosSvelteKit()` in `onMount`, framework-agnostic stores |
| **Vue**                    | `@sweidos/eidos`              | Framework-agnostic stores via `eidosStatus.subscribe()`        |
| **React Native**           | `@sweidos/eidos/react-native` | AsyncStorage-backed queue, same `action()` API                 |
| **Vanilla JS**             | `@sweidos/eidos`              | `eidosStatus`, `eidosQueue`, `eidosQueueStats` stores          |
| **Vite**                   | `@sweidos/eidos/vite`         | Plugin auto-copies `eidos-sw.js` on every build                |
| **CRDT merge (Yjs)**       | `@sweidos/crdt-yjs`           | `createYjsMergeResolver()` for `conflict.strategy: 'merge'`    |
| **TanStack Query**         | `@sweidos/eidos/query`        | `useEidosQuery`, `useEidosMutation`, `withEidosQueryClient`    |
| **Tauri / Electron**       | `@sweidos/sqlite-storage`     | SQLite-backed `QueueStorage`, same `action()` API              |

---

## Core API

Full reference at **[sweidos.vercel.app/overview](https://sweidos.vercel.app/overview)**.

### `resource(url, config)`

```ts
const products = resource('/api/products', {
  offline: true,      // enable SW interception + caching
  strategy?: 'cache-first' | 'stale-while-revalidate' | 'network-first',
  cacheName?: string, // custom cache bucket
  maxAge?: number,    // TTL in ms — enforced by the SW on all requests (not just handle.fetch())
  maxEntries?: number, // max cache entries; oldest evicted (FIFO) when exceeded
  networkTimeoutMs?: number, // ms before falling back to cache (network-first & SWR). Default: 3000
  version?: string | number, // bump when the response shape changes —
                              // appended to cacheName (e.g. 'eidos-resources-v1-v2')
                              // so old-shaped cache entries aren't served.
                              // NOTE: this is separate from the SW-internal CACHE_VERSION
                              // (bumped only on Eidos releases to purge old cache buckets).
                              // Bump `version` for your data shape; Eidos bumps CACHE_VERSION.
})

await products.fetch()          // Promise<Response>
await products.json<Product[]>() // Promise<T>
await products.prefetch()        // fire-and-forget warm
await products.invalidate()      // clear cache + notify TanStack Query
products.query()                 // { queryKey, queryFn } for useQuery
```

**Auto-selected strategy:**

| Config                                     | Strategy             | Use when                            |
| ------------------------------------------ | -------------------- | ----------------------------------- |
| `offline: true`                            | StaleWhileRevalidate | Default — fast + background refresh |
| `offline: true, strategy: 'cache-first'`   | CacheFirst           | Static assets, config data          |
| `offline: true, strategy: 'network-first'` | NetworkFirst         | Always-fresh with offline fallback  |

### `resourcePattern(pattern, config)`

For URL patterns — `/api/products/*`, `/api/users/:id`, `**` — the SW intercepts
all matching requests automatically, so there's no single URL to fetch. Use
`resourcePattern()` instead of `resource()`; it returns a handle with only
`invalidate()` and `unregister()`:

```ts
const productPattern = resourcePattern('/api/products/*', { offline: true });

await productPattern.invalidate(); // clear all cached entries matching the pattern
productPattern.unregister();
```

| Token    | Matches                                                      |
| -------- | ------------------------------------------------------------ |
| `*`      | One path segment — `/api/products/*` ↔ `/api/products/4`     |
| `**`     | Any number of segments — `https://cdn.example.com/assets/**` |
| `:param` | A named segment — `/api/users/:id/orders`                    |

Pass the full URL (including origin) for cross-origin resources, e.g.
`resourcePattern('https://cdn.example.com/assets/**', { offline: true })`.

See it live in the [playground docs → Examples → URL patterns, one
registration per
family](https://sweidos.vercel.app/docs/examples#url-patterns-one-registration-per-family).

### `action(fn, config)`

```ts
const createOrder = action(async (payload: OrderPayload, ctx: ActionContext) => { ... }, {
  reliability: 'neverLose', // persist to IDB + replay on reconnect
  name: 'createOrder',      // stable name for post-reload replay
  namespace?: string,       // prefix actionId — avoids collisions across modules
  maxRetries?: number,      // default: 3
  priority?: 'high' | 'normal' | 'low',
  cancellable?: boolean,    // adds AbortSignal to ctx, enables handle.cancel(key)
  onOptimistic?: (...args) => void, // instant UI update
  onRollback?: (...args) => void,   // revert on permanent failure
  conflict?: {               // 4xx replay handling
    strategy: 'serverWins' | 'clientWins' | 'merge' | 'custom',
    resolve?: (ctx) => 'retry' | 'skip' | { resolved: args },
  },
})

// ctx.idempotencyKey is stable across retries — forward as e.g. an
// `Idempotency-Key` header so the server can dedupe replayed writes.

// Module-level helpers (used by the devtools queue inspector, and usable
// directly): cancel/remove a queue item by idempotency key, or reset a
// 'failed' item back to 'pending' for the next replayQueue().
import { cancelByIdempotencyKey, requeueItem } from '@sweidos/eidos'
await cancelByIdempotencyKey(idempotencyKey) // true if cancelled/removed
await requeueItem(queueItemId)               // true if it was 'failed'
```

### Conflict resolution

A `neverLose` action can sit in the queue for a while — by the time it
replays, the world may have moved on (the requested stock sold out, the
record was deleted, etc.). `conflict` decides what happens when a replay gets
a 4xx response, instead of retrying forever or silently dropping the write:

```ts
class StockConflictError extends Error {
  status = 409;
  constructor(public available: number) {
    super('insufficient stock');
  }
}

export const reserveStock = action(
  async (payload: { productId: number; quantity: number }) => {
    const res = await fetch('/api/inventory', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.status === 409) {
      const { available } = await res.json();
      throw new StockConflictError(available);
    }
    if (!res.ok) throw new Error('Reservation failed');
    return res.json();
  },
  {
    reliability: 'neverLose',
    name: 'reserveStock',
    conflict: {
      strategy: 'custom',
      resolve: ({ error, args, attempt }) => {
        if (error instanceof StockConflictError && error.available > 0) {
          const [payload] = args;
          // Rewrite the queued args and retry with what's actually available
          return { resolved: [{ ...payload, quantity: error.available }] };
        }
        return 'skip'; // nothing left to reserve — drop the write
      },
    },
  },
);
```

| Strategy     | Behavior on 4xx replay                                                |
| ------------ | --------------------------------------------------------------------- |
| `serverWins` | Drop the queued item — the server's current state is authoritative.   |
| `clientWins` | Keep retrying — the write should eventually succeed.                  |
| `merge`      | Call `resolve(ctx)`; typically used to combine client + server state. |
| `custom`     | Call `resolve(ctx)`; return `'retry'`, `'skip'`, or `{ resolved }`.   |

See it live in the [playground docs → Examples → Conflict resolution on
replay](https://sweidos.vercel.app/docs/examples#conflict-resolution-on-replay).

### React hooks

```ts
const { isOnline, swStatus } = useEidosStatus();
const { pending, failed } = useEidosQueueStats();
const entry = useEidosResource('/api/products');
const item = useEidosAction(queuedResult.id);
useEidosOnDrain(() => toast('All offline actions synced!'));

// Cumulative neverLose outcome counters (queued/succeeded/failed/retried/conflicted/cancelled)
const { queued, succeeded, failed: failedCount } = useEidosReliabilityStats();
```

### Framework-agnostic stores

```ts
// Svelte, Vue, vanilla — no React dependency
eidosStatus.subscribe(({ isOnline }) => { ... })
eidosQueue.subscribe((queue) => { ... })
eidosQueueStats.getState() // { pending, failed, replaying, total }
eidosResource('/api/products').getState() // ResourceEntry | undefined
onQueueDrain(() => toast('All offline actions synced!')) // returns unsubscribe
eidosReliabilityStats.getState() // { queued, succeeded, failed, retried, conflicted, cancelled }
```

### Reliability telemetry

Opt in to periodic reporting of cumulative `neverLose` queue outcomes — wire it
up to your analytics backend:

```ts
initEidos({
  onReliabilityReport: (stats) => analytics.track('eidos_reliability', stats),
  reliabilityReportInterval: 60_000, // default
});
```

The same counters are visible live in `<EidosDevtools />` under the
"Reliability" tab.

### Handling SW updates

By default, when a new service worker is available it activates immediately
(`skipWaiting: true`). This matches standard PWA behaviour but can interrupt
in-flight requests on pages that are mid-navigation.

Opt into the **toast-then-reload** pattern with `skipWaiting: false`:

```ts
import { initEidos, triggerSwUpdate } from '@sweidos/eidos';

initEidos({
  skipWaiting: false,
  onUpdateAvailable: (_registration) => {
    // Show a toast, banner, or dialog — then call triggerSwUpdate() when the
    // user confirms they're ready to reload.
    showToast({
      message: 'App update ready',
      action: { label: 'Reload', onClick: triggerSwUpdate },
    });
  },
});
```

`triggerSwUpdate()` tells the waiting service worker to activate, then the
browser reloads the page. With `skipWaiting: true` (default) `onUpdateAvailable`
is never called and `triggerSwUpdate()` is not needed.

> **Tip**: avoid calling `triggerSwUpdate()` while `neverLose` actions are
> mid-replay. The replay coordination (BroadcastChannel + Web Locks) survives
> SW activation, but triggering an update during an active replay pass adds
> unnecessary churn. Wait until the queue drains or use `waitForQueueDrain()`
> from `@sweidos/eidos/testing` in tests.

### Queue management

Inspect and manage the offline action queue directly — handy for "pending
changes" panels, manual retry buttons, or a "discard my offline edits" action:

```ts
import {
  useEidosQueue,
  cancelByIdempotencyKey,
  requeueItem,
  clearQueue,
  replayQueue,
} from '@sweidos/eidos';

function QueuePanel() {
  const queue = useEidosQueue(); // live list of pending/replaying/failed items

  return queue.map((item) => (
    <li key={item.id}>
      {item.actionName} — {item.status}

      {/* Drop a write before it ever reaches the server */}
      {item.status === 'pending' && (
        <button onClick={() => cancelByIdempotencyKey(item.idempotencyKey)}>
          Cancel
        </button>
      )}

      {/* Reset a failed item to 'pending' and replay it */}
      {item.status === 'failed' && (
        <button onClick={() => requeueItem(item.id)}>Retry</button>
      )}
    </li>
  ));
}

// Drop every queued write — e.g. on "discard offline changes"
await clearQueue();

// Force a replay pass — normally triggered automatically on reconnect
await replayQueue();
```

See it live in the [playground docs → Examples → Queue management &
reliability stats](https://sweidos.vercel.app/docs/examples#queue-management-reliability-stats).

---

## TanStack Query

```ts
// main.tsx — register once
withEidosQueryClient(queryClient);

// In components
const { data, isPending } = useEidosQuery<Product[]>(products);

const mutation = useEidosMutation(createOrder, {
  invalidates: [products], // clears cache + invalidates TQ on success
  onSuccess(data) {
    if ('queued' in data) toast('Saved offline');
    else toast(`Order #${data.id} created`);
  },
});
```

---

## Push Notifications

Headless, framework-agnostic Web Push. Tree-shaken via a separate subpath — adds zero bytes unless imported.

**1. Generate VAPID keys (one-time):**

```sh
npx @sweidos/eidos generate-vapid-keys
```

Detects your framework (Vite/Next/SvelteKit/Nuxt) and writes a correctly-prefixed
public key + an unprefixed private key to `.env.local`:

```
VITE_EIDOS_VAPID_PUBLIC_KEY=...
EIDOS_VAPID_PRIVATE_KEY=...
```

Give `EIDOS_VAPID_PRIVATE_KEY` (and the public key) to your backend. What the
backend does with them — language, storage, send timing — is entirely its own
concern; Eidos never talks to it directly.

**2. Register handlers once at app init (any tab, no permission prompt):**

```ts
import { registerPushHandlers } from '@sweidos/eidos/push';

registerPushHandlers({
  onNotificationClick: (data) => router.push(data.url),
  onSubscriptionExpired: (sub) =>
    fetch('/api/push-subscribe', { method: 'POST', body: JSON.stringify(sub) }),
});
```

**3. Subscribe from a user gesture (e.g. an "Enable notifications" button):**

```ts
import { subscribeToPush, isPushSupported, getPushPermissionState } from '@sweidos/eidos/push';

async function onEnableClick() {
  const result = await subscribeToPush({
    vapidPublicKey: import.meta.env.VITE_EIDOS_VAPID_PUBLIC_KEY,
    onSubscribe: (sub) =>
      fetch('/api/push-subscribe', { method: 'POST', body: JSON.stringify(sub) }),
  });

  if (result.status === 'subscribed') toast('Notifications enabled');
  else if (result.status === 'denied') toast('Permission denied');
}
```

`isPushSupported()` / `getPushPermissionState()` / `getPushUnsupportedReason()`
let you hide the button when push is unavailable (e.g. iOS Safari outside an
installed PWA returns `'ios-not-installed'`).

### Server payload schema

The service worker shows whatever your server sends — Eidos never renders UI:

```json
{
  "title": "Order shipped",
  "body": "Your order #1234 is on its way",
  "icon": "/icon.png",
  "badge": "/badge.png",
  "tag": "order-1234",
  "data": { "url": "/orders/1234" }
}
```

Click behavior: if the app is open, `data` is delivered to `onNotificationClick`
for client-side routing; otherwise the SW opens `data.url` directly.

---

## Testing

`@sweidos/eidos/testing` runs entirely at the JS layer — no real Service
Worker needed — and gives Vitest/Jest/Playwright direct control over online
state, the action queue, and the resource cache.

```ts
import {
  mockOffline,
  mockOnline,
  drainQueue,
  waitForQueueDrain,
  getCachedEntry,
  clearEidosCache,
  resetEidos,
  getEidosState,
} from '@sweidos/eidos/testing';

beforeEach(() => resetEidos());

it('queues action while offline', async () => {
  mockOffline({ stubFetch: true });
  await createOrder({ productId: 1, quantity: 2 });
  expect(getEidosState().queue).toHaveLength(1);
  expect(getEidosState().queue[0].actionName).toBe('createOrder');
});

it('replays on reconnect', async () => {
  mockOffline();
  await createOrder({ productId: 1, quantity: 2 });

  // Forces isOnline = true and replays immediately
  const result = await drainQueue();
  expect(result.succeeded).toBe(1);

  // ...or for code that replays itself on the 'online' event:
  await waitForQueueDrain({ timeout: 2000 });
  expect(getEidosState().queue).toHaveLength(0);
});

it('caches GET responses for offline use', async () => {
  await products.json();
  const cached = await getCachedEntry('/api/products');
  expect(cached).toBeDefined();
});

afterEach(() => clearEidosCache());
```

---

## OpenAPI codegen

`eidos-gen` reads an OpenAPI 3.x spec (JSON or YAML) and writes typed
`resource()` + `action()` declarations — request/response interfaces from
`$ref` schemas, `{id}` → `:id` path-param conversion, and DELETE body
omission.

```bash
npx eidos-gen openapi.json --out src/lib/eidos.generated.ts

eidos-gen: reading openapi.json
eidos-gen: wrote src/lib/eidos.generated.ts
           2 resource(s), 2 action(s)
           2 type(s)
```

```ts
// eidos.generated.ts
import { resource, action } from '@sweidos/eidos';

export interface Product {
  id: number;
  name: string;
  tags?: string[];
}

export const listProducts = resource('/products', { offline: true });

export const createProduct = action(
  async (payload: Product): Promise<Product> => {
    const res = await fetch('/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
  { reliability: 'neverLose', name: 'createProduct' },
);
```

| Flag           | Effect                                                       |
| -------------- | ------------------------------------------------------------ |
| `--out, -o`    | Output file path (default: `eidos.generated.ts`)             |
| `--no-offline` | Set `offline: false` on every generated `resource()`         |
| `--eidos`      | Import path for `@sweidos/eidos` (default: `@sweidos/eidos`) |

---

## Devtools

```tsx
import { EidosDevtools } from '@sweidos/eidos/devtools';

// Drop anywhere — bottom-right floating panel, no CSS import
{
  process.env.NODE_ENV === 'development' && <EidosDevtools />;
}
```

Panel shows: live queue state · cache entries · SW status · offline simulation toggle.

### `eidosDebug()`

Returns a plain-object snapshot of the full Eidos runtime state — safe to `JSON.stringify`, useful for bug reports or attaching to error-tracking breadcrumbs:

```ts
import { eidosDebug } from '@sweidos/eidos';

// Print for a bug report
console.log(JSON.stringify(eidosDebug(), null, 2));

// Attach to a Sentry breadcrumb
Sentry.addBreadcrumb({ data: eidosDebug() });
```

Snapshot includes: `version`, `swStatus`, `isOnline`, `resourceCount`, `resources` (per-URL status/hits/cachedAt), `queue` (item list with idempotencyKey/retryCount), `reliability` counters, and `swRegistration` state.

---

## Troubleshooting

Eidos emits plain-English `console.warn` messages in development (`import.meta.env.DEV`) for common setup problems:

| Warning                                             | Cause                                        | Fix                                                                                                                             |
| --------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `Service workers require a secure context`          | `initEidos()` called on HTTP (non-localhost) | Use `localhost` for dev or deploy to HTTPS                                                                                      |
| `Service worker file not found at "/eidos-sw.js"`   | SW file missing from `public/`               | Add `eidos()` to `vite.config.ts` plugins, or copy `node_modules/@sweidos/eidos/dist/eidos-sw.js → public/eidos-sw.js` manually |
| `Service worker registration failed: …`             | Unexpected registration error                | Check `eidosDebug().swError` for the full browser error message                                                                 |
| `Service workers are not supported in this context` | Old browser, or SW API absent                | No fix needed — Eidos degrades gracefully; only SW-side caching is disabled                                                     |

---

## SSR adapters

**Next.js** — import from `@sweidos/eidos/nextjs`. Pre-marked `'use client'`, works in App Router layouts without a wrapper.

**Next.js Server Actions** — `@sweidos/next`'s `serverAction()` wraps a `'use server'` function with `action()` (`reliability: 'neverLose'` by default), keyed by `config.name` + `config.namespace`. `getActionContext()` / `idempotencyHeaders()` recover the `idempotencyKey`/`attempt` inside the action body.

**SvelteKit** — `initEidosSvelteKit()` inside `onMount`. Framework-agnostic stores (`$eidosQueue`, `$eidosStatus`) work with Svelte's `$` auto-subscribe.

**React Native** — `@sweidos/eidos/react-native` with AsyncStorage-backed queue. Same `action()` API surface, no Service Worker dependency.

**Tauri / Electron** — `@sweidos/sqlite-storage` with a SQLite-backed `QueueStorage`. Pass a `@tauri-apps/plugin-sql` `Database` directly, or wrap `better-sqlite3` with the `SqliteLike` interface. Same `action()` API surface, no Service Worker dependency.

**CRDT merge (Yjs)** — `@sweidos/crdt-yjs`'s `createYjsMergeResolver()` builds a `conflict.resolve` for the `'merge'`/`'custom'` strategy that applies the server's Yjs state and the queued local update to a `Y.Doc`, then rewrites the queued args with the merged update — automatic, loss-free reconciliation of concurrent edits instead of a hand-written `resolve()`.

---

## Known limitations

| Limitation             | Detail                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| GET-only caching       | SW intercepts `GET` only. Mutations go through `action()`.                                      |
| Module-scope actions   | `action()` must be at module scope so functions are registered before a reload triggers replay. |
| Single SW              | Assumes one SW at the configured `swPath`.                                                      |
| React Native resources | In-memory only — no Cache API or SW in RN. Action queue fully persists.                         |

---

## How it compares

|                       | **Eidos**                                             | Workbox                      | RTK Query / TanStack Query |
| --------------------- | ----------------------------------------------------- | ---------------------------- | -------------------------- |
| Service worker setup  | Generated from `resource()`/`action()` declarations   | Hand-written routing config  | None — no SW               |
| Caching strategy      | Auto-derived from intent, inspectable via devtools    | Manually chosen per route    | `staleTime`/`gcTime` only  |
| Offline writes        | IndexedDB queue, auto-replay + backoff via `action()` | Background Sync, you wire it | No built-in mutation queue |
| Framework support     | React, Svelte, Vue, Next.js, React Native, vanilla JS | Framework-agnostic (SW only) | Per-library                |
| TanStack Query bridge | `@sweidos/eidos/query` adapter                        | —                            | Native                     |
| Bundle size (core)    | ~6.7 kB brotli                                        | ~3-6 kB (modular)            | ~13 kB                     |

Not a TanStack Query replacement — `@sweidos/eidos/query` is a thin adapter so
you keep TQ's cache/devtools while Eidos owns the offline layer. Workbox is a
lower-level toolkit; Eidos picks and configures strategies for you instead of
hand-written `workbox-*` config.

---

## Contributing

```bash
pnpm install          # install all workspace deps
pnpm dev              # run playground at localhost:3000
pnpm --filter @sweidos/eidos build   # build core package
pnpm --filter @sweidos/eidos test    # run unit tests
pnpm type-check       # typecheck all packages
```

The project uses pnpm workspaces. TypeScript strict mode throughout. Please open an issue before large PRs.

---

## License

MIT © [Aditya Raj](https://github.com/iamadi11)
