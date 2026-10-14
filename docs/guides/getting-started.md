# Getting started with Eidos

**Goal:** a Save button that still works when the network dies.

You do not need prior Service Worker or IndexedDB knowledge.

---

## The whole product in one sentence

When someone hits Save, Eidos puts that click in a safe pocket. When the network returns, it sends the click again — with the same ticket number so your server does not double-charge.

**Two words:**

- **Save** → `action({ reliability: 'neverLose' })`
- **Read** → `resource(..., { offline: true })`

---

## 1. Install

```bash
npm install @sweidos/eidos
# or: pnpm add @sweidos/eidos
```

---

## 2. Add the Vite plugin

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { eidos } from '@sweidos/eidos/vite';

export default defineConfig({
  plugins: [eidos()],
});
```

This copies `eidos-sw.js` into `public/` on every build. You do not hand-write a service worker.

Not using Vite?

```sh
cp node_modules/@sweidos/eidos/dist/eidos-sw.js public/eidos-sw.js
```

---

## 3. Wrap your app once

```tsx
// src/main.tsx
import { createRoot } from 'react-dom/client';
import { EidosProvider } from '@sweidos/eidos';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <EidosProvider>
    <App />
  </EidosProvider>,
);
```

`EidosProvider` defaults to `/eidos-sw.js`. Pass `swPath` only if you renamed the file.

---

## 4. Declare Save + Read at module scope

```ts
// src/lib/eidos.ts
import { resource, action } from '@sweidos/eidos';
import type { ActionContext } from '@sweidos/eidos';

export const products = resource('/api/products', { offline: true });

export const createOrder = action(
  async (payload, ctx: ActionContext) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': ctx.idempotencyKey,
      },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
  { reliability: 'neverLose', name: 'createOrder' },
);
```

Module scope matters: after a reload, replay must find the same `name`. That `name` is the registration id — not the per-click ticket (`ctx.idempotencyKey`).

---

## 5. Call it like a normal function

```ts
const result = await createOrder({ productId: 1, qty: 2 });

if ('queued' in result) {
  // Offline / flaky — already pocketed. Will retry with the same ticket.
  showToast(result.message); // result.idempotencyKey is available too
}
```

---

## Your server’s one job

Eidos delivers **at least once**. Deduplicate with the stable `idempotencyKey` from `ActionContext` (forward it as `Idempotency-Key`). See [guarantees.md](./guarantees.md).

---

## Next

- Live site: [Start here](https://sweidos.vercel.app/docs/start)
- Try offline: [Try it](https://sweidos.vercel.app/try) → header **sim offline**
- Troubleshooting: [troubleshooting.md](./troubleshooting.md)
