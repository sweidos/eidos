# Vitest 5 — Execution Ledger

**Mission:** Maintenance sweep — major bump `vitest` 4 → 5 (+ `@vitest/coverage-v8`)
**Status:** `in_progress`
**Freeze line:** Do not change `@sweidos/eidos` core runtime API or raise 7 kB budget
**Branch tip:** `cursor/vitest-5-34f7` (from `main` @ `91a4cf5`)
**Skill:** eidos-product-engineering v1.1.0 bare re-invoke

## Notes

- `eslint` 10 blocked: `eslint-plugin-react` peers stop at eslint 9.
- `size-limit` 14 still deferred (measurement over 7 kB).
- Landed vitest **5.0.4** workspace-wide; all package suites green.

## Tasks

| Task                                         | Status  |
| -------------------------------------------- | ------- |
| Bump vitest + coverage-v8 + lockfile         | done    |
| Validate core/next/server/sqlite/crdt + size | done    |
| PR + squash merge                            | pending |

## Next action

Commit → PR → merge → mark complete.
