# Getting Started with Eidos

This guide gets you from zero to a working offline-capable app in about 10 minutes. No prior service worker or IndexedDB knowledge required.

By the end you will have:

- An API resource that loads instantly from cache and refreshes in the background.
- A form action that saves to IndexedDB when offline and syncs automatically on reconnect.

---

## What Eidos does

Your app makes fetch requests and submits forms. When the user goes offline those things break. Eidos fixes that without you having to learn caching strategies or write service worker code.

You describe what your app needs:

```ts
resource('/api/products', { offline: true }); // cache this URL
action(submitOrder, { reliability: 'neverLose' }); // never lose this write
```

Eidos does the rest: picks a cache strategy, sets up the service worker, persists unsynced writes to the browser's IndexedDB, and replays them when connectivity returns.

---

## 1. Install

```bash
npm install @sweidos/eidos
# or
pnpm add @sweidos/eidos
```

---

## 2. Register the Vite plugin

The plugin automatically copies the Eidos service worker file into your `public/` folder on every build and dev-server start. Without it the service worker registration will fail with a 404.

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { eidos } from '@sweidos/eidos/vite';

export default defineConfig({
  plugins: [eidos()],
});
```

> **Not using Vite?** Copy the file once and keep it in sync after upgrades:
>
> ```sh
> cp node_modules/@sweidos/eidos/dist/eidos-sw.js public/eidos-sw.js
> ```
>
> Add a `postinstall` script to automate this:
>
> ```json
> {
>   "scripts": {
>     "postinstall": "cp node_modules/@sweidos/eidos/dist/eidos-sw.js public/eidos-sw.js"
>   }
> }
> ```

---

## 3. Wrap your app

Add `EidosProvider` at the root of your React tree. It initialises the service worker and makes all Eidos hooks available to child components.

```tsx
// src/main.tsx
import { createRoot } from 'react-dom/client';
import { EidosProvider } from '@sweidos/eidos';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <EidosProvider swPath="/eidos-sw.js">
    <App />
  </EidosProvider>,
);
```

`swPath` defaults to `"/eidos-sw.js"` — omit it if you haven't moved the file.

---

## 4. Declare a resource (cached read)

Create a module-level file for your Eidos declarations. Module scope is required so the action queue can replay writes correctly after a page reload.

```ts
// src/lib/eidos.ts
import { resource, action } from '@sweidos/eidos';

// Cache GET /api/products.
// Eidos picks StaleWhileRevalidate: show cached data immediately, refresh in background.
export const products = resource('/api/products', { offline: true });
```

Use it in a component:

```tsx
// src/components/ProductList.tsx
import { useEffect, useState } from 'react';
import { products } from '../lib/eidos';

export function ProductList() {
  const [data, setData] = useState<Product[]>([]);

  useEffect(() => {
    products.json<Product[]>().then(setData);
  }, []);

  return (
    <ul>
      {data.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}
```

On the first load this fetches from the network and caches the response. On subsequent loads — including offline — the cached version is returned immediately while a background refresh runs.

---

## 5. Declare an action (reliable write)

```ts
// src/lib/eidos.ts  (continued)
import type { OrderPayload } from '../types';

export const submitOrder = action(
  async (payload: OrderPayload) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Order failed');
    return res.json();
  },
  {
    reliability: 'neverLose', // persist to IndexedDB if offline
    name: 'submitOrder', // stable name for replay after page reload
  },
);
```

Call it in a form:

```tsx
// src/components/OrderForm.tsx
import { submitOrder } from '../lib/eidos';

export function OrderForm() {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);

    const result = await submitOrder({
      productId: Number(data.get('productId')),
      quantity: Number(data.get('quantity')),
    });

    if ('queued' in result) {
      // Saved to IndexedDB — will sync automatically when online
      alert(`Saved offline. Will sync when connected. (id: ${result.id})`);
    } else {
      alert('Order placed!');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="productId" type="number" placeholder="Product ID" />
      <input name="quantity" type="number" placeholder="Quantity" />
      <button type="submit">Place order</button>
    </form>
  );
}
```

When the user submits while offline, `submitOrder()` returns `{ queued: true, id, message }` instead of throwing. The item is saved to IndexedDB and replayed — with exponential backoff — as soon as the browser goes back online, even if the tab was closed and reopened.

---

## 6. Show online/offline state (optional)

```tsx
import { useEidosStatus, useEidosQueueStats } from '@sweidos/eidos';

export function StatusBanner() {
  const { isOnline } = useEidosStatus();
  const { pending } = useEidosQueueStats();

  if (isOnline && pending === 0) return null;

  return (
    <div style={{ background: isOnline ? '#fef9c3' : '#fee2e2', padding: 8 }}>
      {isOnline
        ? `Syncing ${pending} pending action${pending === 1 ? '' : 's'}…`
        : `Offline — ${pending} action${pending === 1 ? '' : 's'} queued`}
    </div>
  );
}
```

---

## What's happening under the hood

<details>
<summary>Expand for a technical overview</summary>

When `EidosProvider` mounts it calls `registerServiceWorker()`. This registers `eidos-sw.js` with the browser, which then intercepts all fetch requests made by the page.

When you call `resource('/api/products', { offline: true })`, Eidos sends a `postMessage` to the service worker with the URL and configuration. The SW adds the URL to its routing table. On every subsequent `fetch('/api/products')` request — from your code or from any library — the SW applies the chosen **cache strategy**:

- `offline: true` → **StaleWhileRevalidate** — return cached response immediately, fetch a fresh copy in the background and update the cache.
- `offline: true, strategy: 'cache-first'` → **CacheFirst** — return cached response without going to network; good for static assets that rarely change.
- `offline: true, strategy: 'network-first'` → **NetworkFirst** — try network first, fall back to cache if offline or network times out (default: 3 seconds).

When you call `action(fn, { reliability: 'neverLose' })`, Eidos wraps `fn`. On invocation it:

1. Assigns a stable `idempotencyKey` to the call.
2. Tries to call `fn`.
3. If the call fails due to a network error (or the browser is already offline), serialises the arguments and key to **IndexedDB**.
4. On reconnect, reads the queue from IndexedDB and replays each item with its original key. Because the key is stable, forwarding it to your server as an `Idempotency-Key` header prevents duplicate writes on retry.

Cross-tab replay is coordinated via the **Web Locks API** — only one tab replays the queue at a time, preventing duplicate writes when multiple tabs are open.

</details>

---

## Next steps

- **[Troubleshooting guide](./troubleshooting.md)** — if something isn't working (console warnings, stuck SW, etc.)
- **[Core API reference](../../README.md#core-api)** — all `resource()` and `action()` options
- **[Live playground](https://sweidos.vercel.app)** — interactive examples including URL patterns, conflict resolution, and the devtools panel
