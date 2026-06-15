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

- [x] `@eidos/next` — Server Actions integration. `serverAction()` wraps
      `action()` with `reliability: 'neverLose'` by default, requiring
      `config.name` (+ optional `config.namespace`) for a stable `actionId`,
      sidestepping the namespacing issue from Phase 1 in the Next.js context.
      `getActionContext()` / `idempotencyHeaders()` recover the
      `idempotencyKey`/`attempt` inside the Server Action body for forwarding
      to `@eidos/server-idempotency`.
- [x] `@eidos/sqlite-storage` — `QueueStorage` adapter for Tauri/Electron.
      `SqliteLike` interface is satisfied directly by `@tauri-apps/plugin-sql`,
      or by a thin wrapper around `better-sqlite3`. Stores each queue item as
      a JSON blob with a denormalized `status` column for `getPending()`.
- [x] Re-evaluate Svelte/Vue store parity now that `action()` context arg
      is part of the contract. `ActionQueueItem.idempotencyKey` and
      `schemaVersion` were already exposed via `eidosQueue`/`eidosAction`
      (plain data, no React dependency), and `cancelByIdempotencyKey()` /
      `requeueItem()` are framework-agnostic exports — no gap there. The one
      real gap: `useEidosOnDrain` had no Svelte/Vue/vanilla equivalent. Added
      `onQueueDrain()` to `stores.ts` (subscription-based, returns an
      unsubscribe fn); `useEidosOnDrain` now delegates to it.

**Exit criteria**: each adapter ships with its own test suite exercising
the idempotency + multi-tab guarantees from Phase 0/1 (not just happy-path
wiring). Met — `@eidos/next` and `@eidos/sqlite-storage` both have test
suites; `onQueueDrain` covered in `stores.test.ts`.

**Phase 4 status: DONE.**

---

## Phase 5 — Positioning & DX Push

**Goal**: convert the hardened core into adoption.

- [x] Landing page: "never lose a write" framing. Hero badge/h1/subhead in
      `apps/playground/src/pages/Landing.tsx` lead with the reliability story
      (idempotency keys, cross-tab replay locks) instead of generic
      "declarative offline-first"; feature grid reordered to put `neverLose`
      reliability first and adds the new `@eidos/next` / `@eidos/sqlite-storage`
      adapters. Root `README.md` tagline updated to match
      (`packages/core/README.md` is generated from it via `build:core`). Also
      fixed the landing page's `action()` code sample, which used a stale
      pre-v2 signature (`action('/api/orders', { method, conflict })`).
- [x] Reliability dashboard (opt-in telemetry of queue success/failure
      rates). New `ReliabilityStats` (`queued`/`succeeded`/`failed`/`retried`/
      `conflicted`/`cancelled`) tracked in `EidosState.reliability`, updated at
      every queue/replay outcome in `action.ts`. Exposed via
      `eidosReliabilityStats` (framework-agnostic) and
      `useEidosReliabilityStats()` (React). Opt-in
      `EidosConfig.onReliabilityReport(stats)` +
      `reliabilityReportInterval` in `initEidos()` periodically reports a
      snapshot for forwarding to analytics. `<EidosDevtools />` gained a
      "Reliability" tab showing live counters and success rate.
- [x] CRDT merge strategy package (`@eidos/crdt-yjs`) — `createYjsMergeResolver()`
      builds a `ConflictConfig.resolve` for `'merge'`/`'custom'` strategies:
      applies the server's Yjs state (from a `409 { current }` body, per
      `@eidos/server-idempotency`'s contract) and the queued local update to a
      fresh `Y.Doc`, then rewrites the queued args with
      `Y.encodeStateAsUpdate()` for the next replay. `uint8ArrayToBase64` /
      `base64ToUint8Array` transport helpers included for JSON-serializing
      updates across the queue/network boundary. Required exporting
      `ConflictContext`/`ConflictResolution`/`ConflictConfig` from
      `@sweidos/eidos`'s public API.

**Phase 5 status: DONE.**

---

## Roadmap status

All five phases complete. No further phases currently planned — future work
should start from a fresh scoping pass against `2026-06-architecture-review.md`
and real adoption feedback rather than continuing this sequence.

---

## Sequencing Notes

- Phases are sequential by default; Phase 2 and Phase 3 could run in
  parallel if staffed separately, since neither blocks the other.
- Phase 4 (adapters) is explicitly gated on Phase 1 — this is the
  "fix once vs fix in 5 places" tradeoff from the architecture review.
