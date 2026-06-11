---
'@sweidos/eidos': minor
---

`action()` accepts a declarative `conflict` config, replacing `onConflict` (kept as a deprecated alias) for handling 4xx responses during queue replay:

- `{ strategy: 'serverWins' }` — drop the queued item, keeping the server's state.
- `{ strategy: 'clientWins' }` / `{ strategy: 'lastWriteWins' }` — keep retrying the queued write.
- `{ strategy: 'merge', resolve }` / `{ strategy: 'custom', resolve }` — call `resolve(ctx)` with a `ConflictContext` (`error`, `args`, `attempt`, `idempotencyKey`) and return `'retry'`, `'skip'`, or `{ resolved: newArgs }` to rewrite the queued args before the next retry.

If both `conflict` and the deprecated `onConflict` are set, `conflict` wins.
