# Product ease — first-touch Save — Execution Ledger

**Mission:** Improve product ease: first-touch Save must teach a correct, copy-pasteable neverLose path (idempotency key + honest queue shape + Try snippets).
**Status:** `in_progress`
**Skill:** eidos-product-engineering v1.1.0 (scoped: product improvement / easiness)
**Branch:** `cursor/product-ease-first-touch-34f7`
**Baseline:** `main` @ `ca56f55` (`@sweidos/eidos@2.5.1`)
**Freeze line:** neverLose queue/runtime semantics unchanged; no major API break; stay ≤7 kB gzip. Docs/playground + additive types only if needed.

## Strategy (summary)

Target: FE eng who has never configured Workbox. Remaining pain after DX revamp is **incorrect first copy-paste** (Save without ticket header) and **Try/lab density**.

## Done this turn

- Additive `QueuedResult.idempotencyKey` + test
- Playground `createOrder` + demo `/api/orders` Idempotency-Key path
- Happy-path docs (Start, Save, getting-started, READMEs, glossary name≠key)
- Try hero + Demo/Recipes/Examples snippets
- Patch changeset + VALIDATION.md

## Next action

Commit, push, open PR, merge, deploy; verify Start/Save/Try on production.
