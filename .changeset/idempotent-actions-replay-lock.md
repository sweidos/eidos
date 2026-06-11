---
'@sweidos/eidos': minor
---

`neverLose` actions now generate a stable `idempotencyKey` per logical invocation, reused across every retry/replay, and pass it to your action function as a trailing `ActionContext { idempotencyKey, attempt }` argument — forward it to your server (e.g. as an `Idempotency-Key` header) so a retry that reaches the server after a dropped response doesn't double-execute.

`replayQueue()` now coordinates across tabs via the Web Locks API (falls back to the previous per-tab guard where unsupported), so multiple open tabs no longer each replay the same shared queue independently.

`ActionQueueItem` gains `schemaVersion` and `idempotencyKey`. Items persisted by older versions are migrated automatically on `initEidos()`.
