# Product ease — first-touch Save — Release

**Mission PR:** https://github.com/sweidos/eidos/pull/121 — **MERGED** (`cb070e3`)
**Version PR:** https://github.com/sweidos/eidos/pull/123 — **MERGED** (`a60d06d`) — `@sweidos/eidos@2.5.2`
**Semver:** patch (`QueuedResult.idempotencyKey` additive)

## Runs

| Workflow                | Run           | Conclusion                                                                              |
| ----------------------- | ------------- | --------------------------------------------------------------------------------------- |
| Deploy & Release (#121) | `38530481626` | success                                                                                 |
| Release PR (#121)       | `38530481848` | failure — Actions cannot create PRs; opened #123 via `gh` from `changeset-release/main` |
| Deploy & Release (#123) | `38530929538` | in_progress at ledger write (publish 2.5.2)                                             |
| Release PR (#123)       | `38530929544` | in_progress (expect no-op / no pending changesets)                                      |

## Production smoke (post-#121 deploy)

| URL                                   | Result                                                    |
| ------------------------------------- | --------------------------------------------------------- |
| https://sweidos.vercel.app/docs/start | 200 + `Idempotency-Key` / `ctx.idempotencyKey` in snippet |
| https://sweidos.vercel.app/docs/save  | 200 + same ticket header + name ≠ ticket copy             |

## Verify publish

```bash
npm view @sweidos/eidos version   # expect 2.5.2 after Deploy #123
```
