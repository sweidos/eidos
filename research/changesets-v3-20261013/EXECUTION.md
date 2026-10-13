# Changesets v3 + action v2 — Execution Ledger

**Mission:** Maintenance sweep — upgrade release tooling (supersede Dependabot #64 safely)
**Status:** `complete`
**Freeze line:** Do not change `@sweidos/eidos` queue/runtime or publish a new core version in this mission
**Branch tip:** `main` @ `37d2b82` (#79)
**Skill:** eidos-product-engineering v1.1.0 bare re-invoke

## Fan-in

- Workers: `workers/cli-v3.md` ([Research changesets v3 breaks](bc-e421766d-436d-5fa6-99d2-501b37fa4db5))
- Accepted: bump `@changesets/cli` ^3 + `changesets/action@v2` with renamed inputs + `github-token`
- Rejected: merging #64 as-is (v1 input names + CLI still on 2.x)

## Outcome

| Gate                  | Status                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| PR #79 merged         | done                                                                                                                     |
| Dependabot #64 closed | done                                                                                                                     |
| Release PR workflow   | success ([38463784696](https://github.com/sweidos/eidos/actions/runs/38463784696))                                       |
| Deploy & Release      | success ([38463784610](https://github.com/sweidos/eidos/actions/runs/38463784610)) — core npm job green (no new version) |

## Next action

None for this mission. Remaining Dependabot: #66, #57, #39.
