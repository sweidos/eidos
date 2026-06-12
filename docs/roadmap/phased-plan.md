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

## Phase 1 — Close Remaining P0/P1 Core Gaps (DONE)

**Goal**: no known correctness bugs in `action()` before any new adapter
work resumes.

- [x] Namespace `actionId` generation (`namespace::name`), throw on
      collision in all environments (`packages/core/src/action.ts`).
- [x] Cancellation: `AbortSignal` plumbing for in-flight `neverLose`
      actions + ability to cancel a not-yet-replayed queue item.
- [x] Conflict resolution presets (`serverWins`/`clientWins`/`merge`/
      `custom`) replacing the raw `onConflict` callback. Placeholder
      `lastWriteWins` removed (v2.0.0, breaking).
- [x] BroadcastChannel sync of queue-item status across tabs (cosmetic
      follow-up to the Web Locks fix).

**Exit criteria**: met. Shipped as v2.0.0 (breaking changes: duplicate
`actionId` now throws in all environments, `lastWriteWins` removed,
`neverLose` actions require `config.name`, `resource()` split into
concrete vs pattern handles). `action()`/`resource()` API surface now
the v2 reliability contract — no further breaking changes without
another version bump and migration.

---

## Phase 1.5 — Accuracy & Upkeep Pass (current system only, no new features)

**Goal**: keep docs/metrics honest as the core grows — no feature work.

- [x] Bundle-size numbers drift from reality after every feature lands
      (was documented as ~5.97 kB, actual v2.0.0 build is 6.22 kB brotli,
      still under the 7 KB size-limit threshold). README tables
      (`README.md`, `packages/core/README.md`) updated to ~6.2 kB.
      **Still open**: no CI check/release-checklist step that re-runs
      `size-limit` and flags README drift automatically — carry to a
      future pass.
- [x] Swept `docs/` and both READMEs for stale claims from earlier
      phases — no open "missing idempotency/namespacing" caveats found;
      "Known limitations" table in `README.md` reflects current (post-v2)
      state.
- [x] Re-verified `phased-plan.md` / `2026-06-architecture-review.md`
      checkboxes against `src/` for this release — Phase 1 confirmed
      fully shipped in v2.0.0, checkboxes updated above.

**Exit criteria**: README/docs bundle-size and feature-status claims match
`size-limit` output and `src/` reality at time of release. Met for
v2.0.0; automated drift-check remains a follow-up (see Phase 2 devtools
work or a new lightweight CI task).

---

## Phase 2 — Resource Layer Polish (DONE)

**Goal**: close the gaps identified in `resource()` before SW-codegen
becomes the marketing centerpiece.

- [x] Cache key includes a content/version hash so response-shape changes
      don't serve stale-shaped JSON from old caches. `ResourceConfig.version`
      appended as `-v{version}` suffix to `cacheName`
      (`packages/core/src/resource.ts`).
- [x] Fix cross-origin pattern matching in `invalidate()` — already handled
      via `isCrossOrigin` check (full-URL test for absolute patterns) in
      `_invalidate()` (`packages/core/src/resource.ts:107-118`). Landed
      ahead of this pass during the v2.0.0 `resource()` split.
- [x] Devtools: queue inspector (status, retry count, idempotency key on
      hover, requeue/cancel actions per item) — added per-item Cancel
      (`pending`) and Retry (`failed`) buttons backed by new exported
      `cancelByIdempotencyKey()` / `requeueItem()`
      (`packages/core/src/action.ts`, `react/Devtools.tsx`).
- [x] Offline simulator that intercepts via the SW (real `503`s) — already
      implemented (`setOfflineSimulation()` → `EIDOS_SIMULATE_OFFLINE` →
      `eidos-sw.js` `serveOffline()`), wired into devtools' "sim offline"
      toggle.

**Exit criteria**: met. A dev can demo "toggle offline → mutate → reconnect
→ watch replay" end-to-end in devtools with zero app-side instrumentation,
including per-item cancel/retry and idempotency-key inspection.

---

## Phase 3 — Server-Side Reference Contracts (DONE)

**Goal**: idempotency/conflict guarantees aren't just client-side promises.

- [x] `@eidos/server-idempotency` — reference Express/Hono middleware:
      `(idempotencyKey → cached response)` store contract, TTL-based
      cleanup (`MemoryIdempotencyStore`, pluggable `IdempotencyStore` for
      multi-instance deployments). Next adapter not yet started — carry
      to Phase 4 alongside `@eidos/next`.
- [x] Documented the 409-with-server-state contract for `merge`/`custom`
      conflict strategies (`packages/server-idempotency/README.md`) —
      server returns `409 { error, current }`, client `resolve()` reads
      it via `ctx.error`.

**Exit criteria**: met. `apps/payment-demo` — Express app with `POST
/api/charge` guarded by `idempotency()`; `pnpm --filter @eidos/payment-demo
demo` replays a duplicate charge and shows a one-entry ledger, and
`src/__tests__/charge.test.ts` asserts the same in CI.

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
