# Safe minor bumps — Validation

**Baseline:** `main` @ `71ec904`  
**Branch:** `cursor/safe-minor-bumps-34f7`

## Resolved versions

| Package               | Before  | After   |
| --------------------- | ------- | ------- |
| @tanstack/react-query | 5.101.0 | 5.104.2 |
| @types/react          | 19.2.17 | 19.3.0  |
| @types/react-dom      | 19.2.3  | 19.3.0  |
| express               | 5.2.1   | 5.3.0   |

## Commands + outcomes

| Command                                          | Outcome                  |
| ------------------------------------------------ | ------------------------ |
| `pnpm --filter @sweidos/eidos test`              | 222 passed               |
| `pnpm --filter @sweidos/next test`               | 12 passed                |
| `pnpm --filter @sweidos/server-idempotency test` | 15 passed                |
| size-limit                                       | **6.98 kB / 7 kB** green |
| playground `tsc --noEmit` + build/prerender      | ok                       |
