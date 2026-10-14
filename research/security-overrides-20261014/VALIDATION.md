# Security overrides — Validation

**Baseline:** `main` @ `7e015e5`  
**Branch:** `cursor/security-overrides-34f7`

## Resolved (pnpm audit after overrides)

| Before                                                                                                                                 | After                              |
| -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| high/moderate alerts for minimatch, lodash, js-yaml, browserslist, protobufjs, @hono/node-server, ajv, esbuild, @ai-sdk/provider-utils | **cleared**                        |
| sprintf-js moderate                                                                                                                    | **remaining** (no patched release) |

`pnpm audit` severity summary: **1 moderate** (`sprintf-js` only).

## Commands + outcomes

| Command                                          | Outcome                                                   |
| ------------------------------------------------ | --------------------------------------------------------- |
| `pnpm install` (with new overrides)              | ok                                                        |
| `pnpm --filter @sweidos/eidos test`              | 222 passed                                                |
| `pnpm --filter @sweidos/next test`               | 12 passed                                                 |
| `pnpm --filter @sweidos/server-idempotency test` | 15 passed                                                 |
| `pnpm --filter @sweidos/eidos size`              | **6.99 kB / 7 kB** green                                  |
| `pnpm --filter @sweidos/eidos size:check-docs`   | 6.82 kB drift 0.00                                        |
| `pnpm lint`                                      | 0 errors (pre-existing Recipes.tsx unused import warning) |
| `pnpm format:check`                              | pass (after prettier on ledger)                           |
