# Security overrides (fixable audit alerts) — Execution Ledger

**Mission:** Maintenance sweep — clear fixable `pnpm audit` / Dependabot alerts via targeted `pnpm.overrides` (same pattern as medium-deps).
**Status:** `complete` — merged #111
**Skill:** eidos-product-engineering v1.1.0 (bare re-invoke → Maintenance sweep)
**Branch:** `cursor/security-overrides-34f7`
**Baseline:** `main` @ `7e015e5` (`@sweidos/eidos@2.5.1`)
**Freeze line:** Do not change `@sweidos/eidos` core runtime API or raise 7 kB budget; no major tooling bumps (eslint 10 / typescript 7 / stagehand 4).

## Sweep evidence (pre-mission)

- All prior ledgers `complete`; open PRs: **0**; npm **2.5.1** matches repo; tip CI green
- `/api/products` production **200** (post-#110)
- Dependabot PRs: none; majors only on outdated (`eslint`/`typescript`/`stagehand`)
- Chosen item: fixable transitive security alerts (high/moderate) via overrides

## Target overrides

| Package                | Current (vulnerable) | Override                         |
| ---------------------- | -------------------- | -------------------------------- |
| minimatch              | 3.0.8                | `@<4` → `>=3.1.4`                |
| lodash                 | 4.17.23              | `>=4.18.0`                       |
| js-yaml (v4 line)      | 4.2.0                | `@>=4 <5` → `>=4.3.2`            |
| browserslist           | 4.28.2               | `>=4.28.7`                       |
| protobufjs             | 7.6.3                | `>=7.6.5`                        |
| @hono/node-server      | 1.19.14              | `>=1.19.15`                      |
| ajv (v6 line)          | 6.12.6               | `@<7` → `>=6.14.0`               |
| esbuild                | 0.28.0               | `@>=0.27.3 <0.28.1` → `>=0.28.1` |
| @ai-sdk/provider-utils | 3.0.25               | `>=3.0.28`                       |

## Skipped

| Package    | Reason                                           |
| ---------- | ------------------------------------------------ |
| sprintf-js | No patched release (`<=1.1.3`; npm latest 1.1.3) |

## Outcome

| Gate                                | Status                    |
| ----------------------------------- | ------------------------- |
| Overrides landed + lockfile         | done (#111)               |
| `pnpm audit` fixable alerts cleared | done (sprintf-js remains) |
| Tests + size ≤7 kB                  | done (6.99 kB)            |
| Deploy on main                      | success (`38524360597`)   |

## Residual (non-blocking)

Vercel annotates missing typings for `api/shared/*.js` imports (from #110 ESM fix). Deploy still succeeds; `/api/products` returns 200. Follow-up: restore typed shared modules without breaking Node ESM.

## Next action

None for this mission.
