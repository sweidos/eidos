# size-limit 14 — Execution Ledger

**Mission:** Maintenance sweep — bump `size-limit` 12 → 14 while keeping esbuild measurement (7 kB budget)
**Status:** `in_progress`
**Freeze line:** Do not change `@sweidos/eidos` core runtime API or raise 7 kB budget
**Branch tip:** `cursor/size-limit-14-esbuild-34f7` (from `main` @ `aa3120c`)
**Skill:** eidos-product-engineering v1.1.0 bare re-invoke

## Approach

`@size-limit/preset-small-lib@14` switched to rolldown and falsely reported **7.07 kB**. Replace the preset with `@size-limit/esbuild` + `@size-limit/file` (same plugins the v12 preset used) so the budget stays honest.

## Tasks

| Task                                                  | Status  |
| ----------------------------------------------------- | ------- |
| size-limit 14.2.0 + esbuild/file plugins; drop preset | done    |
| size **6.98 kB / 7 kB** + core 222 tests              | done    |
| PR + squash merge                                     | pending |

## Next action

Commit → PR → merge → mark complete.
