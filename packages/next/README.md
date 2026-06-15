# @eidos/next

Next.js Server Actions integration for [`@sweidos/eidos`](https://www.npmjs.com/package/@sweidos/eidos)
`action()`. Server Actions are the canonical "don't lose this write" case —
this package wraps them with `neverLose` queueing/replay by default and gives
the Server Action body a typed way to read the `idempotencyKey`/`attempt`
that `action()` threads through on every call.

## Install

```bash
npm install @eidos/next
```

## Usage

```ts
// app/orders/actions.ts
'use server';

import type { ActionContext } from '@sweidos/eidos';
import { getActionContext, idempotencyHeaders } from '@eidos/next';

export async function createOrderRaw(input: { amount: number }, _ctx?: ActionContext) {
  const ctx = getActionContext(arguments);

  const res = await fetch('https://api.example.com/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(ctx ? idempotencyHeaders(ctx) : {}) },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw res;
  return res.json();
}
```

```ts
// app/orders/client-actions.ts
'use client';

import { serverAction } from '@eidos/next';
import { createOrderRaw } from './actions';

export const createOrder = serverAction(createOrderRaw, {
  name: 'createOrder',
  namespace: 'orders',
});
```

Call `createOrder(input)` from a Client Component — offline, it's queued in
IndexedDB with a stable `idempotencyKey` and replayed on reconnect, with the
same key on every retry.

## API

### `serverAction(fn, config)`

Thin wrapper around `action()`. `config.name` is required and combined with
`config.namespace` into the registered `actionId` (`namespace::name`), so two
Server Actions named the same in different routes don't collide. `reliability`
defaults to `'neverLose'` — pass `reliability: 'best-effort'` to opt out.

### `getActionContext(args)`

Recovers the trailing `ActionContext` (`{ idempotencyKey, attempt, signal? }`)
`action()` appends to every call — pass `arguments` or an args array from
inside the Server Action body. Returns `undefined` if the action wasn't
invoked through `action()` (e.g. called directly in a test).

### `idempotencyHeaders(ctx)`

Maps an `ActionContext` to `{ 'Idempotency-Key', 'Idempotency-Attempt' }`
headers for forwarding to a downstream API guarded by
[`@eidos/server-idempotency`](https://www.npmjs.com/package/@eidos/server-idempotency).

## License

MIT
