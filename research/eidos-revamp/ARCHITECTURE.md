# Architecture Decisions

## ADR-001: Lease-based replaying recovery (supersedes naive #68 reset)

**Context:** PR #68 resets all `replaying` → `pending` on hydrate. That recovers crash cases but can steal work from a live tab that still holds the Web Lock mid-replay.

**Decision:** Persist `replayOwnerId` + `replayLeaseUntil` when entering `replaying`. Recover to `pending` only when the lease is missing (legacy) or expired. `idbGetPendingItems` also returns expired-lease `replaying` items so a lock holder after another tab dies can resume without waiting for hydrate.

**Trade-off:** Brief window (lease TTL) where crashed work waits before recovery. Choose TTL ≈ 60s — long enough for a replay pass, short enough for crash recovery UX.

## ADR-002: Persist-before-execute for neverLose (online)

**Context:** Docs claim args are saved before the network request. Implementation only persisted when offline or after online failure — losing durability if the tab dies during an in-flight online request (uncertain outcome).

**Decision:** For `reliability: 'neverLose'`, always write the queue item before invoking `fn` when online; immediately claim a live `replaying` lease for the in-flight attempt (prevents concurrent `replayQueue` double-send); on success mark succeeded; on failure release lease → `pending` for replay (same idempotency key).

**Trade-off:** Extra IndexedDB write + lease update on every online neverLose call. Acceptable for the reliability mode’s contract.

## ADR-003: Positioning without breaking public API surface

**Context:** Broad “offline-first / Workbox replacement” messaging dilutes the unique durable-mutation value.

**Decision:** Keep `resource` + `action` API. Reframe docs/README/landing around durable mutations. No competing new top-level API in this revamp.

## ADR-004: Versioning

**Decision:** Minor bump `2.5.0` — behavior strengthens durability (online persist-first) and fixes multi-tab recovery correctness. TypeScript already required `name` for neverLose; runtime enforces it. Not a major unless we later remove deprecated paths.
