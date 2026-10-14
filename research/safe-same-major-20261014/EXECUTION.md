# Safe same-major bumps — Execution Ledger

**Mission:** Maintenance sweep — one Dependabot-style same-major bump group (tooling + playground runtime).
**Status:** `in_progress`
**Skill:** eidos-product-engineering v1.1.0 (bare re-invoke → Maintenance sweep)
**Branch:** `cursor/safe-same-major-34f7`
**Baseline:** `main` @ `7fbb030` (`@sweidos/eidos@2.5.1`)
**Freeze line:** Do not change `@sweidos/eidos` core runtime API or raise 7 kB budget; no majors (eslint 10 / typescript 7 / stagehand 4).

## Sweep evidence (pre-mission)

- security-overrides verified complete (#111/#112); open PRs **0**; npm **2.5.1**; tip CI green
- audit: only unpatched `sprintf-js`; Dependabot PRs: none
- outdated majors only for eslint/typescript/stagehand@4 — skipped
- Chosen: same-major pins below latest within major

## Target bumps

| Package                  | From (declared) | To      |
| ------------------------ | --------------- | ------- |
| prettier                 | ^3.9.6          | ^3.9.10 |
| lint-staged              | ^17.4.1         | ^17.6.0 |
| typescript-eslint        | ^8.69.0         | ^8.71.2 |
| vite (playground + core) | ^8.2.2          | ^8.3.4  |
| react / react-dom        | ^19.2.8         | ^19.3.0 |
| react-router             | ^8.3.0          | ^8.4.0  |
| @browserbasehq/stagehand | ^3.7.1          | ^3.7.3  |

## Next action

Apply bumps, `pnpm install`, run tests/size/lint, open PR, merge.
