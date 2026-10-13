# Eidos Revamp — Execution Ledger

**Mission:** Full product engineering revamp via `eidos-product-engineering` skill.
**Status:** `complete_with_blocker` — code on main; npm core publish still blocked
**Skill invocation:** resumed `/eidos-product-engineering` (2026-10-13)
**Branch tip:** `main` @ `b62291f` (includes #72 size-budget fix)
**Published npm:** still **2.4.0**
**Repo version:** **2.5.0**
**Size:** 6.99 kB / 7 kB (verified on resume)

## Outcome summary

| Gate                            | Status                                            |
| ------------------------------- | ------------------------------------------------- |
| Skill created + invoked         | done                                              |
| Product strategy / architecture | done                                              |
| Implementation + tests          | done                                              |
| Size budget 7 kB restored (#72) | done — 6.99 kB                                    |
| PR #69 / #70 / #71 / #72 merged | done                                              |
| Playground deploy               | done (CI)                                         |
| npm `@sweidos/eidos@2.5.0`      | **blocked** — Actions `NPM_TOKEN` gets 404 on PUT |
| GitHub release 2.5.0            | blocked (depends on npm)                          |

## Next action (human)

1. Fix npm org/token permissions for `@sweidos/eidos` (GitHub secret `NPM_TOKEN`).
2. Re-run failed `npm Release (core)` on the latest Deploy & Release run, or publish from `main` @ `b62291f`.
3. Confirm `npm view @sweidos/eidos version` → `2.5.0`.

No conflicting parallel revamp should be started; remaining work is credentials + publish only.
