# Product ease — Try first path — Execution Ledger

**Mission:** Make `/try` teach one offline-Save path instead of a lab dashboard; surface SW failure in the header.
**Status:** `in_progress`
**Skill:** eidos-product-engineering v1.1.0 (scoped: product improvement / easiness)
**Branch:** `cursor/product-ease-try-34f7`
**Baseline:** `main` @ tip (`@sweidos/eidos@2.5.2`)
**Freeze line:** neverLose/runtime unchanged; playground UX + header only; no package API break.

## Strategy

Prior slice fixed first-touch docs. Residual DX audit #3/#5: `/try` is dense; SW errors are silent in chrome.

## Done this turn

- Try hero → one offline-Save path; demos before examples
- Header surfaces `swError` when SW broken
- Playground type-check clean

## Next action

Commit, push, open PR, merge, deploy; smoke `/try` on production.
