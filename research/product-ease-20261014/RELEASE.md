# Product ease — first-touch Save — Release

**Mission PR:** https://github.com/sweidos/eidos/pull/121 — **MERGED** (`cb070e3`)
**Version PR:** https://github.com/sweidos/eidos/pull/123 — **MERGED** (`a60d06d`)
**Package:** `@sweidos/eidos@2.5.2` — verified `npm view @sweidos/eidos version` → `2.5.2`
**GitHub release:** https://github.com/sweidos/eidos/releases/tag/%40sweidos/eidos-v2.5.2

## Runs

| Workflow                | Run           | Conclusion                                                |
| ----------------------- | ------------- | --------------------------------------------------------- |
| Deploy & Release (#121) | `38530481626` | success                                                   |
| Release PR (#121)       | `38530481848` | failure — Actions cannot create PRs; opened #123 via `gh` |
| Deploy & Release (#123) | `38530929538` | success (published core 2.5.2)                            |
| Release PR (#123)       | `38530929544` | success                                                   |

## Production smoke

| URL                                   | Result                              |
| ------------------------------------- | ----------------------------------- |
| https://sweidos.vercel.app/docs/start | 200 + `Idempotency-Key`             |
| https://sweidos.vercel.app/docs/save  | 200 + ticket header + name ≠ ticket |
