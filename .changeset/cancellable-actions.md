---
'@sweidos/eidos': minor
---

`action()` accepts `cancellable: true`, providing an `AbortSignal` via `ActionContext.signal` (forward to `fetch`). The returned handle gains `cancel(idempotencyKey)`, which aborts an in-flight call or removes a not-yet-replayed queued item — capture `idempotencyKey` from the `ActionContext` passed to `onOptimistic`.

`onOptimistic` now receives a trailing `ActionContext` argument (additive — existing callbacks that ignore extra args are unaffected).

`ReplayResult` gains a `cancelled` count for queued items removed via `cancel()` before replay completed.
