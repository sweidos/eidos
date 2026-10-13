# @changesets/cli 2.x → 3.x impact (eidos pnpm monorepo)

Research date: 2026-10-13  
Scope: read-only. Sources: CLI CHANGELOG (`main`), npm `@changesets/cli@3.0.3`, official migration guide, `changesets/action` v2 README/`action.yml`/source, repo `package.json` / `.changeset/config.json` / `.github/workflows/release.yml`.

Current repo state (verified):

- `@changesets/cli`: `^2.31.0`
- Scripts: `version-packages` = `changeset version && node packages/core/scripts/sync-version.mjs`; `release` = `pnpm build:core && changeset publish` (not used by the Version Packages workflow)
- Workflow: `changesets/action@v1` with inputs `version` / `title` / `commit`; `GITHUB_TOKEN` via env; Node 24; pnpm via `packageManager: pnpm@10.0.0`
- Config: no `prettier` key; `baseBranch: main`; `ignore` for `@sweidos/worker|e2e|playground`; experimental `onlyUpdatePeerDependentsWhenOutOfRange: true`
- Publish path is **not** `changesets/action` publish — `deploy.yml` `npm-release` uses `pnpm … publish`

---

## Must-change list (this repo)

### `package.json`

| Change                                                            | Label                                                 | Notes                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Bump `@changesets/cli` to `^3` / `3.0.3+`                         | **verified**                                          | npm `3.0.3` engines: `node ^22.11 \|\| ^24 \|\| >=26`, `pnpm >=10.0.0`.                                                                                                                                                                                                                    |
| Tighten `engines.node` from `>=18.0.0` toward CLI-supported range | **verified** (compat) / **hypothesis** (install fail) | CLI declares engines; repo still advertises Node 18+. CI already uses Node 24. Without `engine-strict`, install may only warn — still a support mismatch / local footgun.                                                                                                                  |
| Tighten `engines.pnpm` from `>=8.0.0` to `>=10.0.0`               | **verified**                                          | `packageManager` is already `pnpm@10.0.0`; engines field lags.                                                                                                                                                                                                                             |
| Change `version-packages` for exit-code-1                         | **not required** for GH Action path                   | **verified**: action v2 only runs `version-script` when unreleased changesets exist (`readChangesetState` → `hasChangesets`). Empty `changeset version` exiting 1 only hurts unconditional/manual runs. Optional: document that bare `pnpm version-packages` with no changesets now fails. |
| Keep `release` / `changeset publish` as-is                        | **verified**                                          | Command still exists; unused by `release.yml`.                                                                                                                                                                                                                                             |

### `.changeset/config.json`

| Change                                                                                          | Label                       | Notes                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Update `$schema` from `@changesets/config@3.1.4` → `@changesets/config@4` / `4.0.1`             | **verified**                | Config package major is 4.0.x; unpkg schema for 4.0.1 exists.                                                                                                                                                                                                                                                                                                                                                          |
| Migrate `prettier` → `format`                                                                   | **N/A**                     | Repo has no `prettier` key. Default `format: "auto"` will pick Prettier (repo has prettier).                                                                                                                                                                                                                                                                                                                           |
| Set `privatePackages` to restore v2 private versioning                                          | **optional / not required** | **verified**: v3 default is `{ version: false, tag: false }`. Ignored privates (`worker`, `e2e`, `playground`) already skipped. **`@sweidos/payment-demo`** is private and **not** ignored — under v2 it could be versioned; under v3 default it will **not**. That matches “don’t version fixtures” intent for most cases. Only set `privatePackages.version: true` if you intentionally versioned payment-demo/root. |
| Trim `ignore` entries that only skipped private packages                                        | **optional**                | Migration guide suggests removing ignore-as-private-workaround. Keeping them is harmless and still useful if `privatePackages.version` is later enabled.                                                                                                                                                                                                                                                               |
| Keep `___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH.onlyUpdatePeerDependentsWhenOutOfRange` | **verified** (still valid)  | Still present on `@changesets/types` ExperimentalOptions. Only `useCalculatedVersionForSnapshots` was removed (repo does not use it).                                                                                                                                                                                                                                                                                  |
| `baseBranch: "main"`                                                                            | **no change**               | Already correct; v3 default is also `main`.                                                                                                                                                                                                                                                                                                                                                                            |
| `access: "public"`                                                                              | **no change**               | Only `"private"` alias → `"restricted"` was removed.                                                                                                                                                                                                                                                                                                                                                                   |

### `.github/workflows/release.yml`

| Change                                                                                         | Label                           | Notes                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `changesets/action@v1` → `@v2`                                                                 | **verified blocker if skipped** | Migration + action README: v2 is for Changesets v3; v1 for v2. Action v2 **rejects** declared CLI ranges that are only v2.                                                                                                                                                                                                                             |
| Rename inputs: `version` → `version-script`, `title` → `pr-title`, `commit` → `commit-message` | **verified**                    | Action throws on old names (`throwOnRenamedInputs`).                                                                                                                                                                                                                                                                                                   |
| Pass token via `github-token` input; stop relying on `GITHUB_TOKEN` env alone                  | **verified**                    | v2: env does not configure the action; default input is `${{ github.token }}`. If `GITHUB_TOKEN` env is set **and** ≠ `github-token`, action **fails**. Current workflow sets env only — with default input matching `github.token`/`secrets.GITHUB_TOKEN` it likely still works, but migrate to explicit `github-token` and drop the env for clarity. |
| Decide `push-with-git-cli`                                                                     | **verified** behavioral change  | v2 default pushes release commits via **GitHub API** (signed as token owner). v1 used git CLI. Set `push-with-git-cli: true` only if you need old CLI push semantics.                                                                                                                                                                                  |
| Node / pnpm setup                                                                              | **no change**                   | Already Node 24 + pnpm action + `packageManager` 10 — meets CLI engines.                                                                                                                                                                                                                                                                               |

---

## Blockers

1. **CLI 3 + `changesets/action@v1` together** — **verified**. Must upgrade action to v2 in the same change (or earlier). Action v2 also refuses a package.json range that is only CLI 2.
2. **Unsupported Node/pnpm if engines are believed** — **verified** engines on `3.0.3`. Repo `engines` still allow Node 18+ / pnpm 8+; CI is fine (24 / pnpm 10). Local/dev on Node 20 or pnpm 8/9 is unsupported.
3. **Empty `changeset version` exit 1** — **verified** CLI break; **not a blocker** for this action-driven Version Packages PR (action gates on changeset presence first). **Hypothesis**: any undocumented script/`release` helper that always runs `changeset version` then publish would now fail closed (intended).

Non-blockers for this repo:

- Yarn Classic removal, Bolt detection drop, `--sinceMaster`, `changeset tag` → `git-tag` (no repo usage found).
- Prerelease `.changeset/pre/` layout (no active `pre.json` in tree).
- ESM-only publish of CLI packages (bin/`changeset` scripts still work under supported Node).
- Action publish/NPM_TOKEN/`.npmrc` changes (this workflow does not publish via the action).

---

## Behavioral changes to expect (no file edit required unless undesired)

| Topic                                                                            | Label                    | Impact on eidos                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Peer-dep updates bump dependents **patch** not **major**                         | **verified**             | `@sweidos/next`, `sqlite-storage`, `crdt-yjs` peer on `@sweidos/eidos`. A peer bump no longer forces major dependents; add an explicit major changeset when breaking.                                                  |
| Private packages not versioned by default                                        | **verified**             | Stops versioning `@sweidos/payment-demo` (and root) unless opted in; ignored privates unchanged.                                                                                                                       |
| Interactive CLI UX (`@clack/prompts`)                                            | **verified**             | Local `pnpm changeset` prompts differ slightly.                                                                                                                                                                        |
| `pnpm` registry detection ignores scope `publishConfig.registry`                 | **verified** (migration) | Prefer `.npmrc` if you relied on package-level registry overrides for “is unpublished?” checks. This repo’s publish uses setup-node `registry-url` + `NODE_AUTH_TOKEN` in deploy — likely unaffected (**hypothesis**). |
| Internal dep range updates more correct; pnpm 10 + npm 12 publish fixes in 3.0.3 | **verified**             | Patch upsides for this pnpm 10 monorepo.                                                                                                                                                                               |

---

## Suggested concrete diffs (guidance only; not applied)

**package.json**

- `"@changesets/cli": "^3.0.3"`
- `"engines": { "node": "^22.11 || ^24 || >=26", "pnpm": ">=10.0.0" }` (or at least raise floors to match what you actually support)

**.changeset/config.json**

- `"$schema": "https://unpkg.com/@changesets/config@4.0.1/schema.json"`
- Optionally leave `ignore` as-is; optionally add nothing for `privatePackages` (accept new default)

**.github/workflows/release.yml**

```yaml
uses: changesets/action@v2
with:
  version-script: pnpm version-packages
  pr-title: 'chore: version packages'
  commit-message: 'chore: version packages'
  github-token: ${{ secrets.GITHUB_TOKEN }}
# remove env.GITHUB_TOKEN unless something else needs it
```

---

## Unknown

- Whether Dependabot/renovate will open CLI 3 without action v2 (ordering risk).
- Exact local developer Node versions in the team (engines mismatch severity).
- Whether anyone manually runs `pnpm version-packages` / `pnpm release` outside the action (exit-code-1 / publish path).
- Whether GitHub API push (default v2) vs git CLI matters for branch protection / required signed commits on this repo.
- Whether `eidos-gen` / `server-idempotency` (public, not in deploy matrix) should stay in the changesets version set — orthogonal to v3, but they remain versionable.
