---
'@sweidos/eidos': major
---

`ActionFn`, `onOptimistic`, and `onRollback` now correctly type the trailing `ActionContext` argument that the runtime always passes. Every action function — `best-effort` and `neverLose` alike — now receives `ActionContext` as its last argument on every invocation (previously only `neverLose`/`cancellable` actions did). Update action signatures to accept it, e.g. `async (orderId: string, ctx: ActionContext) => {...}`.
