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

## 2. Copy the helper file (Vite)

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { eidos } from '@sweidos/eidos/vite';

export default defineConfig({
  plugins: [eidos()],
});
```

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
  <EidosProvider swPath="/eidos-sw.js">
    <App />
  </EidosProvider>,
);
```

---

## 4. Declare Save + Read at module scope

```ts
// src/lib/eidos.ts
import { resource, action } from '@sweidos/eidos';

export const products = resource('/api/products', { offline: true });

export const createOrder = action(
  async (payload) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
  { reliability: 'neverLose', name: 'createOrder' },
);
```

Module scope matters: after a reload, replay must find the same `name`.

---

## 5. Call it like a normal function

```ts
const result = await createOrder({ productId: 1, qty: 2 });

if ('queued' in result) {
  // Offline / flaky — already pocketed. Will retry.
  showToast(result.message);
}
```

---

## Your server’s one job

Eidos delivers **at least once**. Deduplicate with the stable `idempotencyKey` (also available on `ActionContext`). See [guarantees.md](./guarantees.md).

---

## Next

- Live site: [Start here](https://sweidos.vercel.app/docs/start)
- Try offline: [Try it](https://sweidos.vercel.app/try) → header **sim offline**
- Troubleshooting: [troubleshooting.md](./troubleshooting.md)
