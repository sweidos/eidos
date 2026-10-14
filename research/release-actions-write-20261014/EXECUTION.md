# Release Actions write — Execution Ledger

**Mission:** Unblock automated Version Packages PRs (`changesets/action` create PR).
**Status:** `complete_with_blocker`
**Skill:** eidos-product-engineering v1.1.0 (maintenance after product-ease idle)
**Branch:** `cursor/release-actions-write-34f7`
**Baseline:** `main` @ tip; `@sweidos/eidos@2.5.2`
**Freeze line:** no package/runtime API change.

## Attempted

```bash
gh api -X PUT repos/sweidos/eidos/actions/permissions/workflow \
  -f default_workflow_permissions=write \
  -F can_approve_pull_request_reviews=false
```

**Result:** HTTP 409 — `Write permissions for workflows are disabled by the organization`.

Repo currently: `default_workflow_permissions=read`. Workflow already requests `contents: write` + `pull-requests: write`. Org policy overrides. No `RELEASE_TOKEN` / PAT secret present (only `NPM_TOKEN`, `VERCEL_TOKEN`). Agent token cannot read/change org Actions permissions (403).

## Workaround (already used)

Open Version Packages PRs manually with `gh` from `changeset-release/main` (see product-ease #123).

## Blockers (human)

**Org setting:** In GitHub org **sweidos** → Settings → Actions → General → Workflow permissions → allow **Read and write permissions** (and optionally allow GitHub Actions to create PRs). Then either re-run a Release PR workflow with a pending changeset, or set repo workflow permissions to `write`.

**Verify:**

```bash
gh api repos/sweidos/eidos/actions/permissions/workflow --jq .default_workflow_permissions
# expect: write
```

## Next action
