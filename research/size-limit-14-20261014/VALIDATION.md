# size-limit 14 — Validation

**Baseline:** `main` @ `aa3120c`  
**Branch:** `cursor/size-limit-14-esbuild-34f7`

| Package                      | Change              |
| ---------------------------- | ------------------- |
| size-limit                   | 12.1.0 → **14.2.0** |
| @size-limit/preset-small-lib | removed             |
| @size-limit/esbuild          | **14.2.0** (added)  |
| @size-limit/file             | **14.2.0** (added)  |

| Command                             | Outcome                       |
| ----------------------------------- | ----------------------------- |
| `pnpm --filter @sweidos/eidos size` | core **6.98 kB / 7 kB** green |
| `pnpm --filter @sweidos/eidos test` | 222 passed                    |

## Note

Rolldown preset alone previously reported 7.07 kB with no code change; esbuild plugins preserve prior measurement semantics.
