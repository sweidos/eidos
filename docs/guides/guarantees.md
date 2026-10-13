# Reliability Guarantees

This document explains what Eidos actually guarantees vs what requires server-side cooperation.

---

## What Eidos guarantees

### At-least-once delivery

When you set `reliability: 'neverLose'` on an action:

1. **Persistence**: The call arguments are saved to IndexedDB _before_ the network request.
2. **Survival**: The queued item survives page reloads, browser restarts, and crashes.
3. **Replay**: When connectivity returns, Eidos replays the item with exponential backoff.
4. **Retry**: Network errors trigger automatic retries up to `maxRetries` times.

The worst case: after exhausting retries, the item moves to `failed` state. It's still in IndexedDB and you can inspect it with `useEidosQueue()` or requeue it manually. **Nothing is silently dropped.**

### Idempotency keys

Every `neverLose` action invocation gets a unique, stable `idempotencyKey`:

- The same key is used on every retry of the same invocation.
- Keys survive page reloads (tied to the persisted queue item, not session state).
- Keys are UUIDs prefixed with the action's `name` for debuggability.

### Cross-tab coordination

- **Web Locks**: Only one tab replays the queue at a time — prevents duplicate sends.
- **BroadcastChannel**: Non-leader tabs see live status updates without polling IndexedDB.
- **Recovery**: If a tab crashes mid-replay, items stuck in `replaying` status are reset to `pending` on the next `initEidos()` call.

---

## What requires server-side cooperation

### "Exactly-once" execution

Eidos provides **at-least-once delivery** with idempotency keys. Achieving **exactly-once execution** requires your server to:

1. Accept the `Idempotency-Key` header (or body field).
2. Check whether the key has been processed before.
3. Return the cached response if it has; process and store the result if it hasn't.

```ts
const createOrder = action(
  async (payload, ctx) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Idempotency-Key': ctx.idempotencyKey },
    });
    return res.json();
  },
  { reliability: 'neverLose', name: 'createOrder' },
);
```

Without server-side deduplication, a network timeout that triggers a retry could result in duplicate writes (e.g., double charges).

### Response idempotency

The idempotency key guarantees the server sees the _same key_ on each retry. It does NOT guarantee:

- That the server caches and returns the original response.
- That side effects (emails, webhooks) are deduplicated.
- That partial failures are rolled back.

These are server implementation concerns.

---

## Common patterns

### Stripe-style idempotency

Stripe accepts `Idempotency-Key` in the header and guarantees idempotent retries. Pass `ctx.idempotencyKey` directly:

```ts
const charge = action(
  async (payload, ctx) => {
    const res = await fetch('/api/charge', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Idempotency-Key': ctx.idempotencyKey },
    });
    return res.json();
  },
  { reliability: 'neverLose', name: 'charge' },
);
```

### Database-level deduplication

Use the idempotency key as a unique constraint:

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  idempotency_key VARCHAR(255) UNIQUE,
  ...
);
```

```ts
// Server
const existing = await db.orders.findUnique({ where: { idempotency_key } });
if (existing) return existing; // Already processed
await db.orders.create({ idempotency_key, ... });
```

### Redis-based check

```ts
// Server
const processed = await redis.get(`idem:${idempotencyKey}`);
if (processed) return JSON.parse(processed);
const result = await processOrder(...);
await redis.set(`idem:${idempotencyKey}`, JSON.stringify(result), 'EX', 86400);
return result;
```

---

## Summary

| Guarantee                             | Provided by Eidos | Requires server |
| ------------------------------------- | ----------------- | --------------- |
| Persistence across reloads            | ✅                | —               |
| Automatic retry with backoff          | ✅                | —               |
| Stable idempotency key per invocation | ✅                | —               |
| Cross-tab replay coordination         | ✅                | —               |
| At-least-once delivery                | ✅                | —               |
| Exactly-once execution                | —                 | ✅              |
| Response caching                      | —                 | ✅              |
| Side-effect deduplication             | —                 | ✅              |

Eidos gives you the building blocks for reliable offline writes. Exactly-once semantics require the server to participate using the provided idempotency key.

→ Related: [Idempotency Key](./glossary.md#idempotency-key), [`neverLose`](./glossary.md#neverlose)
