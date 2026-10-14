# dotenv 18 — Validation

**Baseline:** `main` @ `1f16364`  
**Branch:** `cursor/dotenv-18-34f7`

| Package                     | Before | After      |
| --------------------------- | ------ | ---------- |
| dotenv (`@sweidos/e2e` dev) | 17.4.2 | **18.0.7** |

| Command                             | Outcome                  |
| ----------------------------------- | ------------------------ |
| `config()` smoke import             | ok                       |
| `pnpm --filter @sweidos/eidos test` | 222 passed               |
| size-limit                          | **6.98 kB / 7 kB** green |

## Deferred

`size-limit` / `@size-limit/preset-small-lib` 14.2.0: measurement exceeds 7 kB budget by ~72 B (rolldown vs prior esbuild) with no runtime change.
