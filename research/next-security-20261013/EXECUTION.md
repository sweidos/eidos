# Next.js security patch — Execution Ledger

**Mission:** Maintenance sweep — clear critical/high Dependabot alerts for next, proxy-addr, undici, sharp, source-map-js
**Status:** `in_progress`
**Freeze line:** Do not change `@sweidos/eidos` core runtime API or raise 7 kB budget
**Branch tip:** `cursor/next-security-patch-34f7` (from `main` @ `a119398`)
**Skill:** eidos-product-engineering v1.1.0 bare re-invoke

## Objective

Bump `@sweidos/next` / lockfile `next` to a patched release (`>=16.3.8`, resolved **16.4.0**) and add root `pnpm.overrides` so transitive advisories for `proxy-addr`, `undici` (stay on v7 line), `source-map-js`, and `sharp` resolve to patched versions.

## Tasks

| Task                                                           | Status  |
| -------------------------------------------------------------- | ------- |
| Root overrides: next, proxy-addr, undici, source-map-js, sharp | done    |
| `packages/next` devDependency `next: ^16.3.8`                  | done    |
| Pin undici `>=7.29.1 <8` (v8 breaks jsdom/core tests)          | done    |
| Validate core + next tests, playground build, size budget      | done    |
| PR + squash merge                                              | pending |
| Confirm Dependabot alert reduction                             | pending |

## Next action

Commit package + lock + ledger → push → open PR → squash merge → re-check open alerts for next/proxy-addr/undici/sharp/source-map-js.
