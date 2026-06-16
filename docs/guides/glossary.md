# Eidos Glossary

Plain-language definitions for terms that appear in the Eidos docs and API.

---

## Service Worker

A JavaScript file the browser runs in the background, separate from your app's tab. It can intercept every `fetch()` request your page makes and decide whether to return a cached response, go to the network, or do both.

Eidos ships a pre-built service worker (`eidos-sw.js`) so you don't have to write one. The Vite plugin copies it into your `public/` folder automatically.

**Why you'd care**: without a service worker, your app stops working the moment the user goes offline. The SW is what makes cached data available when there's no network.

→ Config: `swPath` in `EidosProvider` / `EidosConfig.swPath`

---

## Cache Strategy

The rule the service worker follows when it intercepts a request. Eidos picks one automatically based on your config, but you can override it.

| Strategy                 | Short version                                               | When to use                                             |
| ------------------------ | ----------------------------------------------------------- | ------------------------------------------------------- |
| **StaleWhileRevalidate** | Show cache immediately; refresh in background               | Default for `offline: true` — fast UI, eventually fresh |
| **CacheFirst**           | Serve from cache; never go to network unless cache is empty | Static assets, rarely-changing config                   |
| **NetworkFirst**         | Try network first; fall back to cache if offline or slow    | Data that must be fresh, with offline fallback          |

**Why you'd care**: choosing the wrong strategy means either stale data or slow loads. The default (`stale-while-revalidate`) is the right choice for most API responses.

→ Config: `strategy` field on `resource()`

---

## Resource

An Eidos handle for a URL you want to cache. You create one with `resource(url, config)` and it tells the service worker to intercept requests to that URL.

```ts
const products = resource('/api/products', { offline: true });
await products.json<Product[]>(); // returns cached data immediately if available
```

Resources are idempotent — calling `resource()` twice with the same URL returns the same handle.

→ Docs: [`resource()` API reference](../../README.md#resourceurl-config)

---

## Action

An Eidos handle for a write operation (POST, PUT, DELETE, etc.) that should survive network failures. You create one with `action(fn, config)`.

When `reliability: 'neverLose'` is set, a failed call is saved to IndexedDB and replayed automatically when the network returns — even after the tab is closed and reopened.

```ts
const createOrder = action(myFetchFn, { reliability: 'neverLose', name: 'createOrder' });
```

→ Docs: [`action()` API reference](../../README.md#actionfn-config)

---

## Replay Queue

The list of unsynced writes stored in IndexedDB. When an action fails due to a network error, Eidos adds it to this queue. On reconnect, Eidos processes the queue in order, retrying each item with exponential backoff.

You can inspect the queue in real time with `<EidosDevtools />` or from code:

```ts
import { eidosDebug } from '@sweidos/eidos';
console.log(eidosDebug().queue);
```

The queue persists across page loads. If the user closes their laptop mid-form-submit, the queued write is still there when they reopen it.

→ Hooks: `useEidosQueueStats()`, `useEidosOnDrain()`

---

## Idempotency Key

A unique, stable identifier assigned to each action invocation. The same key is used on every retry of the same call.

If you forward the key to your server as an `Idempotency-Key` header, the server can detect and discard duplicate requests — which means a slow network that causes a retry can't result in a duplicate write (e.g. a double charge).

```ts
const createOrder = action(
  async (payload, ctx) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Idempotency-Key': ctx.idempotencyKey }, // ← stable across retries
    });
    return res.json();
  },
  { reliability: 'neverLose', name: 'createOrder' },
);
```

**Why you'd care**: without idempotency, a queued write that retries three times could create three orders. With it, the server sees the same key each time and only processes it once.

→ Config: `name` on `action()` (used to generate stable keys across reloads)

---

## Hydration

When a React component first renders on the client, it "hydrates" — attaches event handlers and syncs state with what was on screen. In Eidos's context, "hydration" refers to the moment when the action queue is loaded from IndexedDB into the in-memory store on page load.

You'll see this term in the context of `swStatus: 'idle'` → `'registering'` → `'active'` and the timing of `resource()` registration messages reaching the SW.

---

## `neverLose`

The reliability mode for actions that must not be silently dropped. When `reliability: 'neverLose'` is set:

1. Eidos saves the call arguments and idempotency key to IndexedDB before the network request completes.
2. If the request fails (network error, offline), the item stays in IndexedDB.
3. On reconnect, Eidos replays the item with exponential backoff up to `maxRetries` times.
4. If all retries fail, the item moves to `failed` state — it's still in IndexedDB and can be requeued manually.

Nothing is ever silently dropped. The worst case is a `failed` item that you inspect and decide what to do with.

→ Config: `reliability: 'neverLose'` on `action()`
→ Hook: `useEidosQueueStats()` returns `{ pending, failed }`

---

## Conflict Resolution

What happens when a `neverLose` action replays and gets a 4xx response. By default, Eidos retries on network errors but gives up on 4xx (because a 4xx usually means the server understood the request and rejected it, not a transient failure).

`conflict` config changes that behaviour:

- `serverWins` — drop the queued item.
- `clientWins` — keep retrying regardless of 4xx.
- `custom` — call `resolve(ctx)` and return `'retry'`, `'skip'`, or `{ resolved: newArgs }`.

**Common case**: user queues "reserve 10 items" offline. By the time it replays, only 3 are left. `custom` resolve lets you rewrite the queued args to `{ quantity: 3 }` and retry instead of failing the whole order.

→ Docs: [Conflict resolution](../../README.md#conflict-resolution)

---

## `eidosDebug()`

A function that returns a JSON-serializable snapshot of all Eidos runtime state — SW registration, online status, resource list, queue contents, reliability stats.

```ts
import { eidosDebug } from '@sweidos/eidos';
console.log(JSON.stringify(eidosDebug(), null, 2));
```

Use it to diagnose unexpected behaviour, or attach the output to bug reports.

→ Docs: [`eidosDebug()` field reference](./troubleshooting.md#eidosdebug-reference)

---

## SW Status

The current state of the Eidos service worker registration. Exposed via `useEidosStatus()` and `eidosDebug().swStatus`.

| Value         | Meaning                                                         |
| ------------- | --------------------------------------------------------------- |
| `idle`        | `initEidos()` / `EidosProvider` not mounted yet                 |
| `registering` | `navigator.serviceWorker.register()` called, waiting for result |
| `active`      | SW registered and controlling the page                          |
| `error`       | Registration failed — see `eidosDebug().swError`                |
| `unsupported` | Browser doesn't support service workers                         |

---

## Background Sync

A browser API that lets the service worker retry a task even after the tab is closed. Eidos registers a `sync` tag when a `neverLose` action is queued, so the write can replay the next time the browser has connectivity — even if the user closed the tab immediately after going offline.

Background Sync is a progressive enhancement: Eidos falls back to replay-on-reconnect (polling `navigator.onLine`) in browsers that don't support it.
