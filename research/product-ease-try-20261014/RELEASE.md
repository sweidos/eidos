# Product ease — Try first path — Release

**Mission PR:** https://github.com/sweidos/eidos/pull/124 — **MERGED** (`f7a143e`)
**Package:** unchanged (`@sweidos/eidos@2.5.2`) — playground-only

## Runs

| Workflow                | Run           | Conclusion |
| ----------------------- | ------------- | ---------- |
| Deploy & Release (#124) | `38532229932` | success    |
| Release PR (#124)       | `38532230052` | success    |

## Production smoke

| Check                                                | Result                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| Deploy Playground job                                | success                                                                        |
| `https://sweidos.vercel.app/assets/Demo-BG6_qAkQ.js` | contains `Try a Save that survives offline` + `Jump to live Save` + `try-live` |

Note: `/try` SSR HTML is the landing prerender; client route loads the Demo chunk above.
