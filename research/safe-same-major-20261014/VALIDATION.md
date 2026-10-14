# Safe same-major bumps — Validation

**Baseline:** `main` @ `7fbb030`  
**Branch:** `cursor/safe-same-major-34f7`

## Resolved versions

| Package                        | Resolved |
| ------------------------------ | -------- |
| prettier                       | 3.9.10   |
| lint-staged                    | 17.6.0   |
| typescript-eslint              | 8.71.2   |
| vite (playground + core)       | 8.3.4    |
| react / react-dom (playground) | 19.3.0   |
| react-router                   | 8.4.0    |
| @browserbasehq/stagehand       | 3.7.3    |

## Commands + outcomes

| Command                                          | Outcome                                 |
| ------------------------------------------------ | --------------------------------------- |
| `pnpm --filter @sweidos/eidos test`              | 222 passed                              |
| `pnpm --filter @sweidos/next test`               | 12 passed                               |
| `pnpm --filter @sweidos/server-idempotency test` | 15 passed                               |
| size-limit                                       | **6.99 kB / 7 kB** green                |
| size:check-docs                                  | 6.82 kB drift 0.00                      |
| `pnpm lint`                                      | 0 errors (pre-existing Recipes warning) |
| `pnpm format:check`                              | pass                                    |
| `pnpm --filter @sweidos/playground build`        | pass + prerender                        |
