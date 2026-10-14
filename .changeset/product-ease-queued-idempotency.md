---
'@sweidos/eidos': patch
---

`QueuedResult` now includes `idempotencyKey` (same ticket as `ActionContext`) so offline UI and cancel paths can use the key without digging into the queue. Happy-path docs and the playground `createOrder` forward `Idempotency-Key`.
