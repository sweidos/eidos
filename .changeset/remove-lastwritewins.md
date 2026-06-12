---
'@sweidos/eidos': major
---

Remove `'lastWriteWins'` from `ConflictConfig.strategy`. It was documented as "same as `clientWins` for now, pending a server-timestamp contract" — a placeholder that was never implemented. Use `'clientWins'` (identical current behavior) or `'custom'` with `resolve()` for timestamp-based resolution.
