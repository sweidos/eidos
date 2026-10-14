# size-limit 14 — Execution Ledger

**Mission:** Maintenance sweep — bump `size-limit` 12 → 14 while keeping esbuild measurement (7 kB budget)
**Status:** `complete`
**Freeze line:** Do not change `@sweidos/eidos` core runtime API or raise 7 kB budget
**Branch tip:** `main` @ `29946d4` (#101)
**Skill:** eidos-product-engineering v1.1.0 bare re-invoke

## Outcome

| Gate                                                       | Status                            |
| ---------------------------------------------------------- | --------------------------------- |
| PR #101 merged                                             | done                              |
| `size-limit` **14.2.0** + `@size-limit/esbuild`/`file`     | done                              |
| preset-small-lib removed (rolldown false positive avoided) | done                              |
| Core size **6.98 kB / 7 kB**; 222 tests                    | done                              |
| Open Dependabot PRs                                        | none                              |
| Remaining open Dependabot alert                            | `sprintf-js` (no patched release) |

## Still deferred

- eslint 10 — `eslint-plugin-react` peers ≤ eslint 9
- typescript 7, stagehand 4 (Node/`^22.19` + API drift)

## Next action

None for this mission.
