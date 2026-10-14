# Eidos

[![npm version](https://img.shields.io/npm/v/@sweidos/eidos?color=22C55E&label=npm)](https://www.npmjs.com/package/@sweidos/eidos)
[![npm downloads](https://img.shields.io/npm/dm/@sweidos/eidos?color=22C55E)](https://www.npmjs.com/package/@sweidos/eidos)
[![bundle size](https://deno.bundlejs.com/badge?q=@sweidos/eidos&badge=detailed&color=22C55E)](https://bundlejs.com/?q=@sweidos/eidos)
[![CI](https://github.com/sweidos/eidos/actions/workflows/deploy.yml/badge.svg)](https://github.com/sweidos/eidos/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E.svg)](LICENSE)

> **Never lose a write.**

When someone hits **Save**, Eidos keeps that click until the server accepts it — even if the network dies mid-way. Offline reads are included. You do not write a service worker, IndexedDB schema, or retry loop.

**Two words:** **Save** = `action({ reliability: 'neverLose' })` · **Read** = `resource(..., { offline: true })`

**[Docs](https://sweidos.vercel.app/docs/start)** · **[Try it](https://sweidos.vercel.app/try)** · **[npm](https://www.npmjs.com/package/@sweidos/eidos)**

---

## In 30 seconds

```ts
import { resource, action } from '@sweidos/eidos';

export const products = resource('/api/products', { offline: true });

export const createOrder = action(submitOrder, {
  reliability: 'neverLose',
  name: 'createOrder',
});

const result = await createOrder({ productId: 1, qty: 2 });
if ('queued' in result) {
  // Offline / flaky — already pocketed. Will retry with the same ticket.
}
```

Honest guarantee: **at-least-once delivery**. Deduplicate on the server with the stable `idempotencyKey` (also on `ActionContext`). Not magical exactly-once.

|                    |                                  |
| ------------------ | -------------------------------- |
| Bundle size (core) | ~6.82 kB                         |
| Delivery           | at-least-once + idempotency keys |
| Queue              | IndexedDB + Web Locks            |

---

## Install

```bash
npm install @sweidos/eidos
```

### 1. Vite plugin (copies the service worker)

```ts
// vite.config.ts
import { eidos } from '@sweidos/eidos/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [eidos()],
});
```

Without Vite: `cp node_modules/@sweidos/eidos/dist/eidos-sw.js public/`

### 2. Wrap once

```tsx
import { EidosProvider } from '@sweidos/eidos';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <EidosProvider swPath="/eidos-sw.js">
    <App />
  </EidosProvider>,
);
```

### 3. Declare Save + Read at module scope

Keep `resource` / `action` at module scope so replay can find them after a reload. Then call `createOrder(...)` like a normal function.

Full walkthrough: **[Start here](https://sweidos.vercel.app/docs/start)** · **[Never lose a save](https://sweidos.vercel.app/docs/save)** · **[When things break](https://sweidos.vercel.app/docs/safety)**

---

## When not to use Eidos

| You need…                            | Prefer…              |
| ------------------------------------ | -------------------- |
| Online cache + retry UI only         | TanStack Query       |
| SW asset caching only                | Workbox              |
| Multiplayer CRDT as the core product | Dedicated CRDT tools |

Eidos wins when **user write intent** must survive offline, reload, and interrupted replay — with clear server idempotency.

---

## Cheat sheet

```ts
// Read
const products = resource('/api/products', { offline: true });
await products.json<Product[]>();
await products.invalidate();

// Pattern reads (SW intercepts matches)
resourcePattern('/api/products/*', { offline: true });

// Save
const createOrder = action(fn, { reliability: 'neverLose', name: 'createOrder' });

// Queue helpers
import { replayQueue, clearQueue, cancelByIdempotencyKey, requeueItem } from '@sweidos/eidos';

// React
const { isOnline } = useEidosStatus();
const { pending, failed } = useEidosQueueStats();
useEidosOnDrain(() => toast('Synced'));
```

More: **[API cheat sheet](https://sweidos.vercel.app/docs/api)** · **[Recipes](https://sweidos.vercel.app/docs/recipes)**

---

## Frameworks

| Surface             | Import                        |
| ------------------- | ----------------------------- |
| React               | `@sweidos/eidos`              |
| Next App Router     | `@sweidos/eidos/nextjs`       |
| Next Server Actions | `@sweidos/next`               |
| SvelteKit           | `@sweidos/eidos/sveltekit`    |
| React Native        | `@sweidos/eidos/react-native` |
| Vite plugin         | `@sweidos/eidos/vite`         |
| TanStack Query      | `@sweidos/eidos/query`        |
| SQLite queue        | `@sweidos/sqlite-storage`     |
| Yjs merge helper    | `@sweidos/crdt-yjs`           |

Vanilla / Vue stores: `eidosStatus`, `eidosQueue`, `eidosQueueStats` (Svelte-style `subscribe`).

---

## Repo guides

- [Getting started](docs/guides/getting-started.md)
- [Guarantees](docs/guides/guarantees.md)
- [Troubleshooting](docs/guides/troubleshooting.md)
- [Glossary](docs/guides/glossary.md)
- [Contributing](CONTRIBUTING.md)

---

## License

MIT
