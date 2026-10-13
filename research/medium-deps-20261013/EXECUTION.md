# Medium transitive deps security — Execution Ledger

**Mission:** Maintenance sweep — clear fixable medium Dependabot alerts (brace-expansion, fast-copy, fast-uri, ip-address)
**Status:** `in_progress`
**Freeze line:** Do not change `@sweidos/eidos` core runtime API or raise 7 kB budget
**Branch tip:** `cursor/medium-deps-security-34f7` (from `main` @ `bfb7138`)
**Skill:** eidos-product-engineering v1.1.0 bare re-invoke

## Objective

Add root `pnpm.overrides` so lockfile resolves patched transitive versions for open medium alerts. Skip `sprintf-js` (GHSA-hp3w-g68c-fv3c): no patched release exists (`<=1.1.3` all vulnerable; npm latest 1.1.3).

## Tasks

| Task                                                                       | Status  |
| -------------------------------------------------------------------------- | ------- |
| Overrides for brace-expansion (1.x + 5.x), fast-copy, fast-uri, ip-address | done    |
| Validate core + next tests + size budget                                   | done    |
| PR + squash merge                                                          | pending |
| Confirm alert reduction                                                    | pending |

## Next action

Commit → push → open PR → squash merge → re-check Dependabot alerts.
