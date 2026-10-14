# Same-major pin follow-up — Execution Ledger

**Mission:** Maintenance sweep — align stale same-major declared mins; skip broken eslint 9.39.5.
**Status:** `complete` — merged #119
**Skill:** eidos-product-engineering v1.1.0 (bare re-invoke → Maintenance sweep)
**Branch:** `cursor/same-major-followup-34f7`
**Baseline:** `main` @ post-#118 (`@sweidos/eidos@2.5.1`)
**Freeze line:** Do not change `@sweidos/eidos` core runtime API or raise 7 kB budget; no eslint 10 / typescript 7 / stagehand 4.

## Sweep evidence (pre-mission)

- recipes-lint complete; open PRs **0**; npm **2.5.1**; tip CI green
- Broader workspace scan found stale declared mins (already resolved in lockfile) + eslint 9.39.5 available
- eslint **9.39.5** breaks lint (`@eslint/eslintrc` / ajv `defaultMeta`) — skipped; pin stays `^9.9.0` → 9.39.4

## Target bumps (declared mins)

| Package                | To       |
| ---------------------- | -------- |
| eslint-plugin-react    | ^7.37.5  |
| globals                | ^17.13.0 |
| autoprefixer           | ^10.6.1  |
| vite (worker)          | ^8.3.4   |
| next                   | ^16.4.0  |
| @types/node (packages) | ^26.6.5  |
| js-yaml (eidos-gen)    | ^5.4.3   |

## Outcome

| Gate                 | Status                |
| -------------------- | --------------------- |
| Pin alignment merged | done (#119)           |
| eslint 9.39.5        | skipped (breaks lint) |
| Deploy               | success               |

## Next action

None for this mission.
