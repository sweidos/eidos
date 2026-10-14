# Zod minor bump — Validation

**Baseline:** `main` @ `7ee7c45`  
**Branch:** `cursor/zod-minor-34f7`

## Resolved

| Package              | Before | After     |
| -------------------- | ------ | --------- |
| zod (`@sweidos/e2e`) | 4.4.3  | **4.6.7** |

## Commands + outcomes

| Command                                        | Outcome                                                       |
| ---------------------------------------------- | ------------------------------------------------------------- |
| `pnpm --filter @sweidos/eidos test`            | 222 passed                                                    |
| size-limit                                     | **6.98 kB / 7 kB** green                                      |
| `pnpm --filter @sweidos/e2e exec tsc --noEmit` | see commit validation                                         |
| `pnpm --filter @sweidos/e2e test`              | fails without Browserbase env (pre-existing; not zod-related) |

## Notes

- Pre-existing peer warning: `@browserbasehq/stagehand` → `openai` wants `zod@^3.23.8`; e2e intentionally on zod 4.
