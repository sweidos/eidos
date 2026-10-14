# Product ease — first-touch Save — Validation

**Baseline:** `main` @ `ca56f55` (`@sweidos/eidos@2.5.1`)  
**Branch:** `cursor/product-ease-first-touch-34f7`

## Change

| Before                                                   | After                                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Happy-path `createOrder` snippets omit `Idempotency-Key` | Start / Save / getting-started / READMEs / Try / Recipes forward `ctx.idempotencyKey` |
| Glossary: `name` “used to generate stable keys”          | Glossary: `name` = registration id; ticket = `ActionContext.idempotencyKey`           |
| `QueuedResult` = `{ queued, id, message }`               | Adds `idempotencyKey` (additive)                                                      |
| Playground `createOrder` ignored `_ctx`                  | Forwards `Idempotency-Key` header                                                     |
| Demo API `/api/orders` no dedupe                         | Best-effort warm-isolate dedupe by header                                             |

## Commands + outcomes

| Command                                        | Outcome    |
| ---------------------------------------------- | ---------- |
| `pnpm --filter @sweidos/eidos test`            | 222 passed |
| `pnpm --filter @sweidos/playground type-check` | clean      |
| `pnpm exec tsc -p api/tsconfig.json`           | clean      |

## Freeze line

neverLose queue/runtime semantics unchanged beyond additive `QueuedResult.idempotencyKey`; no major API break.
