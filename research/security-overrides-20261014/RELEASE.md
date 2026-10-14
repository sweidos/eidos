# Security overrides — Release evidence

**PR:** https://github.com/sweidos/eidos/pull/111 (squash-merged)
**Merge commit:** `b3cc533` on `main`
**Deploy:** https://github.com/sweidos/eidos/actions/runs/38524360597 — **success**
**npm:** `@sweidos/eidos@2.5.1` (unchanged; overrides-only, no package version bump)
**Publish scope:** out of scope (no public API / package version change)

## Post-merge verification

| Check               | Result                         |
| ------------------- | ------------------------------ |
| Deploy & Release    | success                        |
| Release PR workflow | success                        |
| `pnpm audit`        | 1 moderate (`sprintf-js` only) |
| Open PRs            | 0                              |
| `npm view` vs repo  | 2.5.1 / 2.5.1                  |
| `GET /api/products` | 200                            |
