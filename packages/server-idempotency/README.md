# @sweidos/server-idempotency

Reference server-side middleware implementing the dedupe-store contract for
[`@sweidos/eidos`](https://www.npmjs.com/package/@sweidos/eidos) `neverLose`
actions.

A `neverLose` action sends a stable `idempotencyKey` (via `ActionContext`)
on every retry/replay of one logical invocation. This package gives your
server a matching implementation: replay the cached response for a key
already processed, instead of re-executing a payment, order, or inventory
write.

## Install

```bash
npm install @sweidos/server-idempotency
```

Express and Hono are optional peer dependencies — install whichever you use.

## Usage

### Express

```ts
import express from 'express';
import { idempotency } from '@sweidos/server-idempotency/express';

const app = express();
app.use(express.json());

app.post('/api/charge', idempotency(), async (req, res) => {
  const charge = await chargeCard(req.body);
  res.status(201).json(charge);
});
```

### Hono

```ts
import { Hono } from 'hono';
import { idempotency } from '@sweidos/server-idempotency/hono';

const app = new Hono();

app.post('/api/charge', idempotency(), async (c) => {
  const charge = await chargeCard(await c.req.json());
  return c.json(charge, 201);
});
```

### Client side

```ts
const charge = action(
  async (payload: ChargePayload, ctx: ActionContext) => {
    const res = await fetch('/api/charge', {
      method: 'POST',
      headers: { 'Idempotency-Key': ctx.idempotencyKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw await toActionError(res);
    return res.json();
  },
  { reliability: 'neverLose', name: 'charge' },
);
```

## How it works

For each request carrying an `Idempotency-Key` header:

1. **Key already completed** → the original response is replayed verbatim
   (status, headers, body), with `Idempotency-Replayed: true` added. Your
   handler does **not** run again — the second `charge` doesn't happen.
2. **Key reserved but not yet completed** (another in-flight request with
   the same key — e.g. two tabs replaying the same queued action) → `409`
   `{ error: 'idempotency_conflict' }`. The original request is still being
   processed; Eidos's replay/backoff will retry.
3. **New key** → the handler runs normally. A `2xx`/`3xx` response is cached
   for `ttlMs` (default 24h); a `4xx`/`5xx` response is **not** cached, so a
   retry with the same key runs the handler again.
4. **No `Idempotency-Key` header** → passthrough, no caching — every request
   runs the handler.

## Store

The default `MemoryIdempotencyStore` is process-local — fine for a single
instance, demos, and tests. For multi-instance deployments, implement
`IdempotencyStore` against shared storage (Redis, Postgres, etc.):

```ts
interface IdempotencyStore {
  get(key: string): Promise<StoredResponse | null>;
  reserve(key: string, ttlMs: number): Promise<boolean>; // must be atomic across instances
  complete(key: string, response: StoredResponse, ttlMs: number): Promise<void>;
  release(key: string): Promise<void>;
}
```

`reserve()` is the only operation that needs cross-instance atomicity —
implement it with `SETNX`/`SET ... NX` (Redis) or a unique-constraint insert
(SQL).

```ts
import { idempotency } from '@sweidos/server-idempotency/express';
import { redisIdempotencyStore } from './redis-store';

app.post(
  '/api/charge',
  idempotency({ store: redisIdempotencyStore, ttlMs: 60 * 60 * 1000 }),
  handler,
);
```

## The 409-with-server-state contract for `merge`/`custom` conflict strategies

Idempotency replay (above) handles **duplicate** requests for the same
logical write. A separate problem is a **conflicting** write — the server
state changed since the client queued the action (e.g. someone else updated
the same order). Eidos's `conflict: { strategy: 'merge' | 'custom', resolve }`
handles this client-side, but `resolve()` needs to see the server's current
state to decide.

**Contract**: when a write conflicts with current server state, respond
`409` with the current resource in the body:

```ts
app.post('/api/orders/:id', idempotency(), async (req, res) => {
  const current = await getOrder(req.params.id);
  if (current.version !== req.body.expectedVersion) {
    return res.status(409).json({ error: 'version_conflict', current });
  }
  // ... apply the write, bump version
});
```

On the client, throw the parsed `409` body so `resolve()` can read it via
`ctx.error`:

```ts
const updateOrder = action(
  async (input: OrderUpdate, ctx: ActionContext) => {
    const res = await fetch(`/api/orders/${input.id}`, {
      method: 'POST',
      headers: { 'Idempotency-Key': ctx.idempotencyKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (res.status === 409) {
      const body = await res.json(); // { error: 'version_conflict', current }
      throw Object.assign(new Error('conflict'), { status: 409, body });
    }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  },
  {
    reliability: 'neverLose',
    name: 'updateOrder',
    conflict: {
      strategy: 'merge',
      resolve: (ctx) => {
        const err = ctx.error as { status?: number; body?: { current: unknown } };
        if (err.status !== 409 || !err.body) return 'retry';
        const merged = mergeOrder(ctx.args[0], err.body.current);
        return { resolved: [merged] };
      },
    },
  },
);
```

`resolve()` returns:

- `'retry'` — try again later (e.g. transient error, not a real conflict).
- `'skip'` — drop the queued item (server already has the desired state).
- `{ resolved: args }` — replace the queued args with `merged` and retry
  immediately with the _same_ `idempotencyKey`.
