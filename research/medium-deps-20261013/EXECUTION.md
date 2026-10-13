# Medium transitive deps security — Execution Ledger

**Mission:** Maintenance sweep — clear fixable medium Dependabot alerts (brace-expansion, fast-copy, fast-uri, ip-address)
**Status:** `complete`
**Freeze line:** Do not change `@sweidos/eidos` core runtime API or raise 7 kB budget
**Branch tip:** `main` @ `5eff3f3` (#89)
**Skill:** eidos-product-engineering v1.1.0 bare re-invoke

## Outcome

| Gate                                                                | Status                                          |
| ------------------------------------------------------------------- | ----------------------------------------------- |
| PR #89 merged                                                       | done                                            |
| brace-expansion **1.1.21** / **5.0.12**                             | done                                            |
| fast-copy **4.1.2**, fast-uri **3.1.8**, ip-address **10.7.4**      | done                                            |
| Core 222 + next 12 tests; size **6.98 kB / 7 kB**                   | done                                            |
| Open alerts for brace-expansion / fast-copy / fast-uri / ip-address | **0**                                           |
| Remaining open Dependabot alerts                                    | **1** medium (`sprintf-js`, no patched release) |
| Open Dependabot PRs                                                 | none                                            |

## Blockers (human / upstream)

- `sprintf-js` GHSA-hp3w-g68c-fv3c: all published versions `<=1.1.3` vulnerable; npm latest is 1.1.3. Optional via `argparse@1`. No agent-safe bump.

## Next action

None for this mission. Maintenance backlog of fixable Dependabot alerts is clear.
