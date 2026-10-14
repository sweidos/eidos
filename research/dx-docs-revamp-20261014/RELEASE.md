# Release — dx-docs-revamp-20261014

## Merged PRs

| PR                                                | What                                               |
| ------------------------------------------------- | -------------------------------------------------- |
| [#103](https://github.com/sweidos/eidos/pull/103) | DX/docs/README revamp                              |
| [#104](https://github.com/sweidos/eidos/pull/104) | Research ledger                                    |
| [#105](https://github.com/sweidos/eidos/pull/105) | README size-doc row + JSDoc + troubleshooting link |
| [#106](https://github.com/sweidos/eidos/pull/106) | Version Packages → **2.5.1** (manual `gh`)         |

## Deploy

| Run                | Result                                                  |
| ------------------ | ------------------------------------------------------- |
| #105 `38521753230` | **success**                                             |
| #106 `38521857847` | **success** (Test, Playground, npm Release core/next/…) |

## npm (verified)

```
npm view @sweidos/eidos version       → 2.5.1
npm view @sweidos/eidos homepage      → https://sweidos.vercel.app/docs/start
npm view @sweidos/eidos description   → Never lose a write. …
```

GitHub release: [@sweidos/eidos-v2.5.1](https://github.com/sweidos/eidos/releases/tag/%40sweidos/eidos-v2.5.1)

## Notes

- Release PR Actions still cannot create PRs — open Version Packages with `gh` when needed.
