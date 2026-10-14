# Vitest 5 — Execution Ledger

**Mission:** Maintenance sweep — major bump `vitest` 4 → 5 (+ `@vitest/coverage-v8`)
**Status:** `complete`
**Freeze line:** Do not change `@sweidos/eidos` core runtime API or raise 7 kB budget
**Branch tip:** `main` @ `b926d41` (#99)
**Skill:** eidos-product-engineering v1.1.0 bare re-invoke

## Outcome

| Gate                                               | Status                            |
| -------------------------------------------------- | --------------------------------- |
| PR #99 merged                                      | done                              |
| `vitest` / `@vitest/coverage-v8` **5.0.4**         | done                              |
| Core 222 + next 12 + server 15 + sqlite 9 + crdt 5 | done                              |
| Size **6.98 kB / 7 kB**                            | done                              |
| Open Dependabot PRs                                | none                              |
| Remaining open Dependabot alert                    | `sprintf-js` (no patched release) |

## Deferred (documented)

- eslint 10 — `eslint-plugin-react` peers ≤ eslint 9
- size-limit 14 — measurement over 7 kB budget
- typescript 7, stagehand 4

## Next action

None for this mission.
