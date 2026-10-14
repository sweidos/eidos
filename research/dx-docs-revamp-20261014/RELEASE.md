# Release — dx-docs-revamp-20261014

## PR

- **#103** merged `2026-10-14T06:17:46Z` → merge commit `f7e61e5`
- Branch: `cursor/dx-docs-revamp-34f7`

## Post-merge workflows (started)

- Deploy & Release run `38521376673` — in_progress
- Release PR run `38521376607` — in_progress (expected to open/update Version Packages for patch changeset)

## Publish

- Patch changeset landed: `.changeset/dx-docs-revamp-metadata.md` (`@sweidos/eidos` patch for description/homepage)
- npm publish follows Version Packages PR merge + Deploy `npm-release` job
- Baseline npm before this mission: `2.5.0`

## Next

Verify Deploy green + Version Packages PR merge + `npm view @sweidos/eidos version` when publish completes.
