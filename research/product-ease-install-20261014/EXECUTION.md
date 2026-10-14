# Product ease — install ceremony — Execution Ledger

**Mission:** Shrink install ceremony: Vite-first framing; omit redundant `swPath` (runtime default `/eidos-sw.js`).
**Status:** `in_progress`
**Skill:** eidos-product-engineering v1.1.0 (scoped: product improvement / easiness)
**Branch:** `cursor/product-ease-install-34f7`
**Baseline:** `main` @ tip (`@sweidos/eidos@2.5.2`)
**Freeze line:** neverLose/runtime unchanged; docs + Provider example only; default `swPath` already exists — do not change runtime semantics.

## Strategy

Audit residual #4. Ceremony feels like “copy a SW file + pass path” even though Vite plugin + default path make that optional.

## Done this turn

- Vite-first Start + getting-started + READMEs
- Bare `<EidosProvider>`; document default `swPath`
- Playground type-check clean

## Next action

Commit, push, open PR, merge, deploy; smoke `/docs/start`.
