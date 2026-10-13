# PR, merge, and release

## Branch / commits

- Feature branch `cursor/<topic>-<suffix>` (lowercase)
- Coherent commits; no secrets; no force-push of shared history
- Configure git remote with token for push; never print the token
- **Only the orchestrator** commits, pushes, opens/merges PRs, and publishes

## Pull request

Include: problem, product decisions, API changes + examples, reliability fixes, compatibility/migration, tests + actual results, security/perf notes, remaining limitations, release implications.

## Merge

1. Fetch latest base
2. Rebase/merge conflicts carefully
3. Run required local checks on final candidate
4. Wait for required CI (`gh pr checks` / `gh run list` / subscribe — do not claim merge success early)
5. Respect branch protection / required reviews — do not bypass
6. Merge with permitted method (`gh pr merge`) when authorized
7. Verify merge commit on default branch

If human review is required and unavailable: leave PR open, record blocker, continue safe prep work. Mission stays `in_progress` until that PR merges or is abandoned in the ledger.

## Release / npm

- Determine semver from public API changes
- Prefer project’s changesets / deploy workflow
- Publish only via authorized secrets/workflows
- Verify published version, package contents, GitHub release
- Smoke-test clean install of published artifact when practical
- If publish blocked: complete prep and run Blocker playbook — do not fake a release

## Blocker playbook (publish / secrets / changesets)

When release stalls: classify, record evidence in `RELEASE.md` + `EXECUTION.md`, continue non-blocked work, stop only at a hard credential boundary.

### A. NPM publish — `NPM_TOKEN` / 404 / 401

1. Confirm package + registry (`@sweidos/eidos`, `registry.npmjs.org`).
2. Confirm secret **name** matches workflow (`NPM_TOKEN` vs `NODE_AUTH_TOKEN`).
3. Confirm secret scope (repo/org/environment).
4. Treat 404 on PUT as auth/permission until proven otherwise.
5. Retry failed Deploy/`npm Release (core)` job once after any agent-fixable fix.
6. Complete non-secret prep (version on main, RELEASE.md, docs).
7. Ask the user **once** for secret rotation only after steps 1–6: exact secret name, granular token scopes (read/write for `@sweidos` / package), where to paste (GitHub Actions secret), verification command (`re-run failed job` then `npm view @sweidos/eidos version`).
8. After user updates token: re-run failed workflow, verify `npm view` + GitHub release, update ledger. Do **not** ask them to type “continue.”

Never echo, paste, or commit tokens.

### B. Changesets Action cannot open PRs

1. Check workflow permissions (`contents: write`, `pull-requests: write`).
2. Confirm job runs on default branch / expected event (not a fork token dead-end).
3. If automation cannot open the Version PR: create/update it with `gh` when authorized; else leave changeset files committed and record blocker.
4. Never force-push or disable branch protection to “make changesets work.”

### C. CI timing

1. Do not claim merged/released/published until the relevant run conclusion is verified.
2. If CI still running: status `in_progress`; Next action = wait/verify run `<id>`.
3. If CI failed: fix forward or record blocker.

## Complete-mission hygiene

Before `status: complete`:

- [ ] Every mission PR listed with state; **zero still open**
- [ ] Required CI verified green (or waived with reason)
- [ ] Docs/DX mission changes merged
- [ ] Package published **or** hard blocker recorded **or** publish out of scope from the start
- [ ] `VALIDATION.md` / `RELEASE.md` have real command outcomes

Forbidden: marking complete while a docs, website, or Version Packages PR is still open.
