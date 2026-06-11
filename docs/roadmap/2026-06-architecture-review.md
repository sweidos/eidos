# Architecture Review — Reliability Layer Findings

Date: 2026-06-11
Scope: `packages/core/src/{action,resource,runtime,replay,sw-bridge,idb,types}.ts`

## Summary

`resource()` (SW-backed caching/strategy codegen) is production-shaped.
`action()` (mutation queue/replay) had two P0 correctness gaps and one P1
gap that block "neverLose" being a trustworthy guarantee for
payments/inventory/healthcare-grade writes.

## Findings

### P0 — No idempotency (FIXED in this pass)

`neverLose` actions had no stable key sent to the server. A `replay()`
after a dropped response (server processed the write, client never saw the
response) re-executed the action — duplicate write with no way for the
server to detect it.

**Fix shipped**: `ActionQueueItem.idempotencyKey`, generated once per
logical invocation, reused across every retry/replay, passed to `fn` as a
new `ActionContext { idempotencyKey, attempt }` trailing argument on every
call path (online direct call + replay). Devs forward it as e.g.
`Idempotency-Key` header.

**Still open**: no reference server-side middleware package
(`@eidos/server-idempotency`) implementing the dedupe-store contract.

### P0 — Multi-tab duplicate replay (FIXED in this pass)

`_replaying` guard was a per-tab module boolean. With N tabs open,
reconnect triggered N independent `replayQueue()` calls against the same
shared IndexedDB queue → N duplicate executions of every queued action.

**Fix shipped**: `replayQueue()` now wraps `_doReplayQueue` in
`navigator.locks.request('eidos-queue-replay', { ifAvailable: true }, ...)`.
Only the lock holder replays; other tabs no-op. Falls back to the old
per-tab flag where Web Locks is unavailable (React Native, old Safari,
test runners).

**Still open**: no `BroadcastChannel` sync of queue-item status across
tabs — non-leader tabs don't see live status updates until their own store
re-hydrates. Low severity (cosmetic), tracked for Phase 2.

### P1 — No queue schema versioning (FIXED in this pass)

`ActionQueueItem` had no version field. Any future shape change to queued
items would silently corrupt items already persisted in users' IndexedDBs.

**Fix shipped**: `CURRENT_QUEUE_SCHEMA_VERSION` constant +
`ActionQueueItem.schemaVersion`. On `initEidos()`, hydrated items missing
`schemaVersion`/`idempotencyKey` (pre-this-change) are migrated in place
(assigned a fresh `idempotencyKey`, bumped to current version, persisted
back).

### P1 — Action registry collisions (NOT FIXED — Phase 1)

`actionId = config.name || fn.name || uid()` — two actions with the same
name (e.g. across micro-frontends, or two devs both naming something
`createOrder`) silently overwrite each other in `_actionRegistry`. No
namespacing.

### P1 — Resource cache versioning / cross-origin invalidate edge cases (NOT FIXED — Phase 2)

`resource()` cache names are static (`eidos-resources-v1`); response shape
changes aren't detected. `invalidate()` pattern matching on cross-origin
URLs uses fragile string comparison.

### Scope risk — breadth before depth (STRATEGIC — ongoing)

`index.ts` already exports React, Svelte/Vue stores, React Native +
AsyncStorage adapter, Next.js, SvelteKit, TanStack Query bridge, devtools —
8 integration surfaces — while the underlying reliability core (`action()`)
had the two P0s above until this pass. Every adapter inherits core bugs.
Recommendation: hold new framework adapters until Phase 1 closes.

## What Shipped This Pass

- `packages/core/src/types.ts`: `CURRENT_QUEUE_SCHEMA_VERSION`,
  `ActionQueueItem.schemaVersion`/`idempotencyKey`, `ActionContext`.
- `packages/core/src/action.ts`: idempotency key generation/threading,
  Web Locks-based replay coordination.
- `packages/core/src/runtime.ts`: queue migration on hydrate.
- Tests updated (`action.test.ts`), full suite + `tsc --noEmit` green.

See [phased-plan.md](./phased-plan.md) for what's next.
