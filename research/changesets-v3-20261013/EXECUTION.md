# Changesets v3 + action v2 — Execution Ledger

**Mission:** Maintenance sweep — upgrade release tooling (supersede Dependabot #64 safely)
**Status:** `in_progress`
**Freeze line:** Do not change `@sweidos/eidos` queue/runtime or publish a new core version in this mission
**Branch:** `cursor/changesets-v3-action-v2-34f7`
**Skill:** eidos-product-engineering v1.1.0 bare re-invoke

## Fan-in

- Workers: `workers/cli-v3.md` ([Research changesets v3 breaks](bc-e421766d-436d-5fa6-99d2-501b37fa4db5))
- Accepted: bump `@changesets/cli` ^3 + `changesets/action@v2` with renamed inputs + `github-token`
- Rejected: merging #64 as-is (v1 input names + CLI still on 2.x)

## Next action

Implement bumps, validate `changeset status` / local tests, PR, merge, close #64
