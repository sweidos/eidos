# Release evidence

## Merged

| PR                                              | Title                                                | Merge commit | Merged at            |
| ----------------------------------------------- | ---------------------------------------------------- | ------------ | -------------------- |
| [#69](https://github.com/sweidos/eidos/pull/69) | feat: durable neverLose mutations with replay leases | `3ee491f`    | 2026-10-13T19:02:18Z |
| [#70](https://github.com/sweidos/eidos/pull/70) | chore: version packages (2.5.0)                      | `3d29b47`    | 2026-10-13T19:06:17Z |

## CI (Deploy & Release on #70) — run `38452172547`

| Job                          | Result                                    |
| ---------------------------- | ----------------------------------------- |
| Test Core Package            | success                                   |
| Deploy Playground            | success                                   |
| npm Release (next)           | success (likely already published / skip) |
| npm Release (sqlite-storage) | success                                   |
| npm Release (crdt-yjs)       | success                                   |
| npm Release (core)           | **failure**                               |

### npm publish blocker (core)

```
npm error 404 Not Found - PUT https://registry.npmjs.org/@sweidos%2feidos
The requested resource '@sweidos/eidos@2.5.0' could not be found or you do not have permission to access it.
```

**Interpretation:** `NPM_TOKEN` in GitHub Actions cannot publish `@sweidos/eidos` (missing org/package permission or revoked token). This is outside agent control; do not fake a publish.

**Verified:** `npm view @sweidos/eidos version` still reports **2.4.0**.
**Repo main:** `packages/core` version / `version.ts` are **2.5.0**.

## GitHub release

No `@sweidos/eidos-v2.5.0` GitHub Release created (workflow creates it only after successful npm publish).

## Remaining release action for humans

1. Fix `NPM_TOKEN` / npm org access for `@sweidos`.
2. Re-run the failed `npm Release (core)` job, or `pnpm --filter @sweidos/eidos publish --access public` from the `3d29b47` (or current main) tree with a valid token.
3. Confirm `npm view @sweidos/eidos version` → `2.5.0` and create GitHub release if the workflow does not.

## Skill

- Cursor: `/home/ubuntu/.cursor/skills-cursor/eidos-product-engineering`
- Repo: `.agents/skills/eidos-product-engineering`
- Invoked once for this full mission.
