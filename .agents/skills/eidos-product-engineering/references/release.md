# PR, merge, and release

## Branch / commits
- Feature branch `cursor/<topic>-<suffix>` (lowercase)
- Coherent commits; no secrets; no force-push of shared history
- Configure git remote with token for push; never print the token

## Pull request
Include: problem, product decisions, API changes + examples, reliability fixes, compatibility/migration, tests + actual results, security/perf notes, remaining limitations, release implications.

## Merge
1. Fetch latest base
2. Rebase/merge conflicts carefully
3. Run required local checks on final candidate
4. Wait for required CI if it runs on PRs; note if CI is push-to-main only
5. Respect branch protection / required reviews — do not bypass
6. Merge with permitted method (`gh pr merge`) when authorized
7. Verify merge commit on default branch

If human review is required and unavailable: leave PR open, record blocker, continue safe prep work.

## Release / npm
- Determine semver from public API changes
- Prefer project’s changesets / deploy workflow
- Publish only via authorized secrets/workflows
- Verify published version, package contents, GitHub release
- Smoke-test clean install of published artifact when practical
- If publish blocked: complete prep (changeset, notes) and report exactly what remains — do not fake a release
