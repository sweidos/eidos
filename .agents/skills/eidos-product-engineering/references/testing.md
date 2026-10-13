# Test strategy

Prefer failure scenarios over vanity coverage.

## Must cover when touching queue/runtime
- Persist before durability is claimed
- Reload preserves recoverable work
- Interrupted replay does not strand work indefinitely **and** does not double-execute under concurrent owners
- Stale ownership / lease expiry recovery
- Storage failure handling
- Offline → reconnect replay path
- Retry policy and permanent failure visibility
- Multi-tab coordination (Web Locks / BroadcastChannel)
- Schema migration for persisted items

## Package
- `pnpm --filter @sweidos/eidos test`
- `pnpm build:core` + type-check
- Playground build when UI/docs examples change
- Record exact commands and outcomes in `VALIDATION.md`
- Never claim a scenario tested if the environment was unavailable

## Size budget (core)

When the repo enforces a gzip size limit for `@sweidos/eidos` (historically **7 kB**):

1. Measure on every core change before opening/updating the PR (use the project’s size-limit / bundle script).
2. If over budget: treat as an **implementation task** — drop persisted fields, trim deps, simplify — until under budget. Do not wait for humans and do not silently raise the budget unless the user explicitly asks.
3. Record before/after sizes in `VALIDATION.md`.
