# Validation

## Baseline (pre-change)

- Commit: `86f6a1d`
- `pnpm --filter @sweidos/eidos test` → **223 passed**

## After revamp implementation

- Branch: `cursor/product-revamp-34f7`
- `pnpm --filter @sweidos/eidos test` → **226 passed** (2026-10-13)
- `pnpm --filter @sweidos/eidos type-check` → pass

## Independent review

- Bugbot (`uncommitted changes`): high finding — online persist left `pending` race with concurrent replay.
- **Fixed:** claim live `replaying` lease before online execute; test `nl-lease-inflight` asserts getPending excludes it.

## Covered scenarios (new/updated)

- Persist-before-execute online success leaves succeeded queue entry
- Online in-flight holds live lease (blocks concurrent replay)
- Online failure releases lease → single pending item
- neverLose without `name` throws
- Live replay lease not returned by `idbGetPendingItems`
- Expired/leaseless replaying recovered to pending
- Cancel in-flight after persist (optimistic key capture)

## Unavailable / not claimed

- Real multi-browser multi-tab e2e in this environment (unit-level lease + Web Lock code paths covered; Stagehand e2e not re-run here)
- Live website deploy verification (playground build may be run; production deploy is CI on main)
- npm download ≠ unique users (not used as adoption proof)
