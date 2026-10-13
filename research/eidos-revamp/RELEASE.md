# Release evidence

## Merged

| PR                                              | Title                                                | Merge commit | Merged at            |
| ----------------------------------------------- | ---------------------------------------------------- | ------------ | -------------------- |
| [#69](https://github.com/sweidos/eidos/pull/69) | feat: durable neverLose mutations with replay leases | `3ee491f`    | 2026-10-13T19:02:18Z |
| [#70](https://github.com/sweidos/eidos/pull/70) | chore: version packages (2.5.0)                      | `3d29b47`    | 2026-10-13T19:06:17Z |
| [#72](https://github.com/sweidos/eidos/pull/72) | restore 7 kB budget / stop persisting replaying      | (see main)   | 2026-10-13           |

## CI (Deploy & Release on #70) — run `38452172547`

| Job                          | Result                                    |
| ---------------------------- | ----------------------------------------- |
| Test Core Package            | success                                   |
| Deploy Playground            | success                                   |
| npm Release (next)           | success (likely already published / skip) |
| npm Release (sqlite-storage) | success                                   |
| npm Release (crdt-yjs)       | success                                   |
| npm Release (core)           | **failure** (stale `NPM_TOKEN`)           |

## CI (Deploy & Release on #72) — run `38454704190` (after token update)

| Job                | Result                   |
| ------------------ | ------------------------ |
| npm Release (core) | success                  |
| Log                | `+ @sweidos/eidos@2.5.0` |

### npm publish — verified

After updating GitHub secret `NPM_TOKEN` and re-running Deploy:

- `npm view @sweidos/eidos version` → **2.5.0**
- `dist-tags.latest` → **2.5.0**
- Registry time for `2.5.0`: **2026-10-13T19:51:36.485Z**

Earlier 404 on PUT was the old token; new granular token has write access.

## GitHub release

[@sweidos/eidos-v2.5.0](https://github.com/sweidos/eidos/releases/tag/%40sweidos/eidos-v2.5.0) — published 2026-10-13T19:49:30Z

## Skill

- Cursor: `/home/ubuntu/.cursor/skills-cursor/eidos-product-engineering`
- Repo: `.agents/skills/eidos-product-engineering`
- Invoked once for this full mission.
