# Dependabot PR assessment — sweidos/eidos (2026-10-13)

Read-only Research Auditor. Sources: `gh pr view` / `gh pr diff` / `gh api` against open PRs #66, #64, #61, #57, #39; main checkout at `/tmp/eidos` @ `dd2ecc2`. No code edits, no merges.

Labels: **verified** = confirmed from PR/API/main tree; **hypothesis** = reasoned inference; **unknown** = not observable from available data.

---

## Recommendation

**Merge first: #61** (`js-yaml` 4.2.0 → 5.2.2).

**Rationale:** Only PR with an explicit Dependabot security changelog (DoS-class parsing fixes) and a narrow app-code blast radius (`eidos-gen` + lockfile), beating mergeable-but-unsafe #64 and higher-risk framework/types majors.

**Prerequisite before merge (hypothesis):** rebase / recreate onto current `main` — `mergeable: CONFLICTING`, `mergeable_state: dirty`, `rebaseable: false` (**verified** via API). Re-run package tests for `eidos-gen` after lock refresh.

---

## Executive scorecard

| PR      | Title (short)         | Mergeable     | Files | Δ         | CI   | Value           | Risk                         | Overlaps                                           |
| ------- | --------------------- | ------------- | ----- | --------- | ---- | --------------- | ---------------------------- | -------------------------------------------------- |
| **#61** | js-yaml 4.2→5.2.2     | CONFLICTING   | 2     | +80/−18   | none | **Security**    | Major API + conflict         | lock ↔ #66/#57/#39; `eidos-gen/package.json` ↔ #39 |
| #64     | changesets/action 1→2 | **MERGEABLE** | 1     | +1/−1     | none | Release tooling | **Silent v2 input breakage** | none with npm PRs                                  |
| #66     | dev-dependencies ×14  | CONFLICTING   | 8     | +698/−751 | none | Hygiene batch   | Large lock churn; stale      | pkg.json ↔ #39/#57; lock ↔ all npm                 |
| #39     | @types/node 25→26     | CONFLICTING   | 7     | +144/−90  | none | Types major     | Low urgency; Node types skew | pkg.json ↔ #66/#61; lock ↔ all npm                 |
| #57     | react-router 7→8      | CONFLICTING   | 2     | +85/−9    | none | Framework       | Highest product risk         | playground ↔ #66; lock ↔ all npm                   |

**verified:** mergeable flags, file lists, additions/deletions, empty `statusCheckRollup` / zero check-runs on head commits, all heads `ahead_by:1` / `behind_by:19` vs `main`.

**unknown:** whether any PR would pass CI after rebase (no checks attached to these heads).

---

## Per-PR findings

### #66 — `build(deps-dev): bump the dev-dependencies group … 14 updates`

- **verified:** OPEN; `mergeable: CONFLICTING` / `DIRTY`; head `dependabot/npm_and_yarn/dev-dependencies-cbad84bd68`; 1 commit `b6712ed`; labels `dependencies`, `javascript`.
- **verified packages bumped (PR body):** globals 17.6→17.12, lint-staged 17.0.7→17.4.1, prettier 3.8.4→3.9.6 (body; main `package.json` still shows `^3.3.3`), typescript-eslint 8.61.1→8.69.0, @vitejs/plugin-react 6.0.2→6.1.1, vite 8.0.16→8.2.2, vite-plugin-dts 5.0.2→5.1.0, yjs 13.6.31→13.6.32, hono 4.12.25→4.13.5, tsx 4.22.4→4.23.13, @tailwindcss/postcss & tailwindcss 4.3.1→4.3.3, autoprefixer 10.5.0→10.5.4, postcss 8.5.15→8.5.28.
- **verified files:** `apps/payment-demo`, `apps/playground`, root, `packages/core`, `crdt-yjs`, `server-idempotency`, `worker` `package.json` + `pnpm-lock.yaml`.
- **verified:** does **not** bump `@types/node` or `js-yaml` or `react-router`.
- **hypothesis:** mostly same-major / patch-ish tooling — lower semantic risk than #57/#61 majors, but conflict cost is high (19 commits behind + dirty lock).
- **unknown:** formatting/lint fallout from prettier / typescript-eslint bumps after rebase.

### #64 — `build(deps): bump changesets/action from 1 to 2`

- **verified:** OPEN; **`mergeable: MERGEABLE`** / `CLEAN`; only file `.github/workflows/release.yml` (`changesets/action@v1` → `@v2`); 1 commit `eb0d3aa`.
- **verified (current main workflow):** still uses v1 input names `version`, `title`, `commit`, and `env.GITHUB_TOKEN` only (no `github-token` input).
- **verified (PR body / action v2 notes):** v2 renames `version`→`version-script`, `commit`→`commit-message`, `title`→`pr-title`; drops relying on `GITHUB_TOKEN` env in favor of explicit `github-token`; default push path changes to GitHub API; other behavioral majors (`push-git-tags`, remove `cwd`, etc.).
- **hypothesis:** merging #64 **as written** would break or silently misconfigure the Version Packages PR job — Dependabot did not migrate inputs/env. Treat as **not** “safe just because mergeable.”
- **verified:** no file overlap with the four npm Dependabot PRs.
- **unknown:** whether org-level GITHUB_TOKEN permissions would satisfy v2 API push even after input migration.

### #61 — `build(deps): bump js-yaml from 4.2.0 to 5.2.2`

- **verified:** OPEN; `CONFLICTING` / `DIRTY`; `rebaseable: false`; files `packages/eidos-gen/package.json` (`js-yaml` `^4.1.0`→`^5.2.2`) + `pnpm-lock.yaml`; commit `9f0fbc7`.
- **verified (main):** still `js-yaml@4.2.0` in lock; direct dep `^4.1.0` in `eidos-gen`.
- **verified (PR changelog):** Security — avoid exponential parsing time for nested flow sequence pairs (5.2.2); remove quadratic complexity from `!!omap` (5.2.1); `maxTotalMergeKeys` / related merge limits (5.2.0); also lock moves transitive `js-yaml@3.14.2`→`3.15.0` and `4.2.0`→`4.3.0` (changelog notes 4.3.0/3.15.0 security backports).
- **verified usage:** `eidos-gen` only calls `js-yaml.load(...)` in `src/parse.ts` (and tests/docs for `.yaml` specs).
- **verified gap:** PR leaves `@types/js-yaml` at `^4.0.9` while runtime moves to 5.x.
- **hypothesis:** `load()` for typical OpenAPI YAML remains compatible enough that product risk is moderate vs #57; type package skew may cause TS friction (**unknown** without install).
- **hypothesis:** highest maintenance-merge priority among the five under “prefer security patch over major framework bumps,” despite needing a lockfile rebuild.

### #57 — `build(deps): bump react-router from 7.17.0 to 8.3.0`

- **verified:** OPEN; CONFLICTING; files `apps/playground/package.json` + lock; `^7.17.0`→`^8.3.0`; commit `5ad3a54`.
- **verified:** major framework bump with substantial upstream changelog (routing/RSC/encoding behavior).
- **hypothesis:** highest regression risk for user-facing playground; defer until after security/hygiene landings and a dedicated migration pass.
- **verified overlap:** `apps/playground/package.json` + `pnpm-lock.yaml` with #66.

### #39 — `build(deps-dev): bump @types/node from 25.9.3 to 26.1.1`

- **verified:** OPEN; CONFLICTING; touches six `package.json`s (`payment-demo`, `crdt-yjs`, `eidos-gen`, `next`, `server-idempotency`, `sqlite-storage`) + lock; commit `ad8400e`; Dependabot note that automatic rebases disabled (>30 days).
- **verified (main):** still `@types/node` `^25.9.3` / lock `25.9.3`; workflow uses Node 24.
- **hypothesis:** types-major alone, low security value; can wait; overlaps #66 on three package.json paths and #61 on `eidos-gen/package.json` + lock.

---

## Conflict / sequencing notes

**verified file overlaps:**

| Pair            | Shared paths                                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| #66 ∩ #39       | `apps/payment-demo/package.json`, `packages/crdt-yjs/package.json`, `packages/server-idempotency/package.json`, `pnpm-lock.yaml` |
| #66 ∩ #57       | `apps/playground/package.json`, `pnpm-lock.yaml`                                                                                 |
| #66 ∩ #61       | `pnpm-lock.yaml` only (different package.json targets)                                                                           |
| #61 ∩ #39       | `packages/eidos-gen/package.json`, `pnpm-lock.yaml`                                                                              |
| #64 ∩ {npm PRs} | none                                                                                                                             |

**hypothesis sequencing after #61:** close or recreate conflicting Dependabot PRs rather than stacking stale lock commits; then either a refreshed #66 (dev group) or a manual combined bump; treat #64 as a **workflow migration PR** (inputs + `github-token`), not a one-line pin bump; defer #57; schedule #39 when Node/types policy is clear.

**unknown:** whether Dependabot will auto-recreate after a #61 merge (auto-rebase disabled on #39; others unknown).

---

## CI / review hygiene

- **verified:** all five PRs have `statusCheckRollup: []`, zero check-runs on head SHA, no issue/PR review comments observed for #61, empty reviews.
- **hypothesis:** checks never ran or were purged on stale heads; do not treat “no red X” as green.
- **verified:** only #64 is GitHub-mergeable without conflict resolution.

---

## Decision criteria applied

1. Prefer security patch → **#61** over #57/#39/#66.
2. Lowest _true_ risk among high-value options → reject #64-as-is (mergeable but likely breaks release) and #57 (framework major).
3. Note conflicts → #61 dirty vs main; lock overlaps with #66/#39/#57; package.json overlap with #39 on `eidos-gen`.
