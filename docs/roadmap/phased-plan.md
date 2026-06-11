# Eidos Reliability Roadmap — Phased Plan

Companion to [2026-06-architecture-review.md](./2026-06-architecture-review.md).
Written PM-style: each phase has a goal, scope, exit criteria. Don't start
a phase until the previous one's exit criteria are met — breadth before
depth is the named strategic risk.

---

## Phase 0 — Reliability Core Hardening (DONE)

**Goal**: make `neverLose` mean what it says — single execution, single tab.

- [x] Idempotency keys threaded through `action()` (`ActionContext`).
- [x] Web Locks-based cross-tab replay coordination.
- [x] Queue schema versioning + migration on hydrate.

**Exit criteria**: met. Full test suite + typecheck green.

---

## Phase 1 — Close Remaining P0/P1 Core Gaps

**Goal**: no known correctness bugs in `action()` before any new adapter
work resumes.

- [ ] Namespace `actionId` generation (`namespace::name`), warn on
      collision in DEV (`packages/core/src/action.ts`).
- [ ] Cancellation: `AbortSignal` plumbing for in-flight `neverLose`
      actions + ability to cancel a not-yet-replayed queue item.
- [ ] Conflict resolution presets (`serverWins`/`clientWins`/
      `lastWriteWins`/`merge`/`custom`) replacing the raw `onConflict`
      callback (keep old callback as deprecated alias).
- [ ] BroadcastChannel sync of queue-item status across tabs (cosmetic
      follow-up to the Web Locks fix).

**Exit criteria**: `action()` API surface stable enough to document as
"v1 reliability contract" — no planned breaking changes to
`ActionConfig`/`ActionQueueItem` after this phase without a version bump
and migration.

---

## Phase 2 — Resource Layer Polish

**Goal**: close the gaps identified in `resource()` before SW-codegen
becomes the marketing centerpiece.

- [ ] Cache key includes a content/version hash so response-shape changes
      don't serve stale-shaped JSON from old caches.
- [ ] Fix cross-origin pattern matching in `invalidate()` (currently
      string equality on absolute URL vs pathname).
- [ ] Devtools: queue inspector (status, retry countdown, idempotency key,
      requeue/cancel actions per item).
- [ ] Offline simulator that intercepts via the SW (real `503`s), not just
      a `navigator.onLine` flip.

**Exit criteria**: a dev can demo "toggle offline → mutate → reconnect →
watch replay" end-to-end in devtools with zero app-side instrumentation.

---

## Phase 3 — Server-Side Reference Contracts

**Goal**: idempotency/conflict guarantees aren't just client-side promises.

- [ ] `@eidos/server-idempotency` — reference Express/Hono/Next middleware:
      `(idempotencyKey → cached response)` store contract, TTL-based
      cleanup.
- [ ] Document the 409-with-server-state contract for `lastWriteWins`/
      `merge` conflict strategies.

**Exit criteria**: a sample app (in `apps/`) demonstrates a payment-style
mutation that survives duplicate replay against the reference middleware.

---

## Phase 4 — Resume Ecosystem/Adapter Work

**Goal**: framework adapters built on a core that's actually hardened.

- [ ] `@eidos/next` — Server Actions integration using the action's stable
      reference (file path + export) as `actionId`, sidestepping the
      namespacing issue from Phase 1 in the Next.js context.
- [ ] `@eidos/sqlite-storage` — `QueueStorage` adapter for Tauri/Electron
      (interface already supports this — low risk once Phase 1 is settled).
- [ ] Re-evaluate Svelte/Vue store parity now that `action()` context arg
      is part of the contract.

**Exit criteria**: each adapter ships with its own test suite exercising
the idempotency + multi-tab guarantees from Phase 0/1 (not just happy-path
wiring).

---

## Phase 5 — Positioning & DX Push

**Goal**: convert the hardened core into adoption.

- [ ] Landing page: "never lose a write" framing (see architecture review
      Part 12 from prior session — positioning options).
- [ ] Reliability dashboard (opt-in telemetry of queue success/failure
      rates).
- [ ] CRDT merge strategy package (`@eidos/crdt-yjs`) — last, niche.

---

## Sequencing Notes

- Phases are sequential by default; Phase 2 and Phase 3 could run in
  parallel if staffed separately, since neither blocks the other.
- Phase 4 (adapters) is explicitly gated on Phase 1 — this is the
  "fix once vs fix in 5 places" tradeoff from the architecture review.
