# Architecture Decisions

## ADR-001: Do not persist `replaying` to IndexedDB (supersedes #68 + leases)

**Context:** Persisting `status: 'replaying'` caused stranded work after crash (`getPending` skips replaying). Lease fields fixed ownership but blew the **7 kB** core budget. PR #68’s blanket hydrate reset could race a live tab.

**Decision:** Keep `replaying` in the in-memory store + BroadcastChannel for UI only. Do **not** write it to IDB. Crash/reload therefore still sees `pending`. Web Locks remain the cross-tab replay mutex. Hydrate only remediates legacy IDB rows that still say `replaying`.

**Trade-off:** Non-leader tabs that read IDB directly (not BroadcastChannel) won’t see mid-replay status — acceptable; hooks use the store.

## ADR-002: Defer online persist-before-execute (7 kB budget)

**Context:** Online persist-before-execute + in-flight lease claim is the correct durability model for uncertain outcomes, but pushed the core brotli size well past the enforced **7 kB** limit (~7.3 kB).

**Decision:** Keep offline persist-first. Crash safety via not persisting `replaying` (ADR-001). Defer online persist-before-execute until it can land without raising the size budget (or via a tree-shakeable subpath). Document the online/offline persistence difference honestly.

**Trade-off:** Online in-flight tab crash can lose an unqueued attempt; server idempotency still required when clients retry. Size constraint wins for this release.

## ADR-003: Positioning without breaking public API surface

**Context:** Broad “offline-first / Workbox replacement” messaging dilutes the unique durable-mutation value.

**Decision:** Keep `resource` + `action` API. Reframe docs/README/landing around durable mutations. No competing new top-level API in this revamp.

## ADR-004: Versioning

**Decision:** Minor bump `2.5.0` — behavior strengthens durability (online persist-first) and fixes multi-tab recovery correctness. TypeScript already required `name` for neverLose; runtime enforces it. Not a major unless we later remove deprecated paths.
