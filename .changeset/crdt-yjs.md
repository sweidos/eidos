---
'@sweidos/eidos': minor
---

Export `ConflictContext`, `ConflictResolution`, and `ConflictConfig` from the public API — required by the new `@eidos/crdt-yjs` package (`createYjsMergeResolver()`), which builds a `conflict.resolve` for `'merge'`/`'custom'` strategies that automatically reconciles 409 conflicts via Yjs CRDT merge.
