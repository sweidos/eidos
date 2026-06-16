# SW Ease-of-Use & Flexibility Plan

Companion to [phased-plan.md](./phased-plan.md) (all 5 phases done, no
breaking-change debt outstanding) and
[2026-06-architecture-review.md](./2026-06-architecture-review.md).

**Core vision**: Eidos is an **abstraction layer for service workers**. A dev
declares _intent_ (`resource()`, `action()`); Eidos generates the SW logic,
picks the strategy, and handles the queue. The user never writes SW code.

**What deviated**: Phases 0–5 hardened the reliability core and built 8
framework adapters — all valuable — but the SW-abstraction primitives that
make the core vision real (composable SW entry, strategy presets, beginner
onboarding) are still unshipped. Every adapter sits on top of an abstraction
layer that isn't fully built yet.

**Sequencing rule for this plan**: codebase cleanup (`Phase C`) ships before
any new feature work. Existing misinformation and dead API surface undermine
the "2-line setup" story more than missing features do.

---

## Phase C — Codebase Cleanup (BEFORE any new features)

**Goal**: fix active misinformation, dead API surface, and uncommitted
in-flight work. No new APIs — only corrections to what already exists.

### C1 — Landing hero contradicts the core promise

**File**: `apps/playground/src/pages/Landing.tsx:70`

The hero code sample shows `strategy: 'stale-while-revalidate'` explicitly,
two paragraphs below the tagline _"No cache strategy to configure."_ Remove
the explicit `strategy` field so the first thing a user copies is:

```ts
resource('/api/products', { offline: true });
```

- [ ] Remove `strategy: 'stale-while-revalidate'` from `CODE_SAMPLE` in
      `Landing.tsx`.

### C2 — Demo page hardcodes strategy label as a string literal

**File**: `apps/playground/src/pages/Demo.tsx:637`

`<span>StaleWhileRevalidate</span>` is hardcoded. If the playground
`productsResource` config changes, the label silently goes stale. The live
`resourceEntry` is already in scope.

- [ ] Replace hardcoded string with `resourceEntry?.strategy.name ??
'StaleWhileRevalidate'`.

### C3 — Commit in-flight docs work

`docs/guides/troubleshooting.md` is complete but untracked. `README.md` has
an unstaged diff adding the link to it. The link in README currently points
to an uncommitted file — CI sees a different README than the working tree.

- [ ] Stage and commit `docs/guides/troubleshooting.md` + `README.md` diff
      as a single commit.

### C4 — `equivalentCode` is defined in the public type but never rendered

**Files**: `packages/core/src/types.ts:48`,
`apps/playground/src/pages/Inspector.tsx:20`

`GeneratedStrategy.equivalentCode` is in the exported type, populated in the
Inspector's hardcoded `SAMPLE`, and never displayed in any UI step.
`Inspector.tsx` shows `reasoning` (step 2) and `behavior` (step 4) but has
no step for `equivalentCode`. It appears in TypeScript autocomplete for every
user who touches a resource handle.

Two valid resolutions — pick one:

- **Option A (remove)**: delete `equivalentCode` from `GeneratedStrategy` in
  `types.ts`, remove it from `SAMPLE` in `Inspector.tsx`, update
  `strategy.test.ts` to not assert it. Breaking change → needs changeset
  (`patch`, no users rely on it as a runtime value).
- **Option B (display)**: add a step 5 to Inspector's `STEPS` array showing
  the Workbox-equivalent code, making the field earn its place. Update
  `strategy.test.ts` description to "devtools fields" rather than "required
  fields".

- [ ] Decide Option A or B, implement, update `strategy.test.ts`.

### C5 — `Resources.tsx` teaches `strategy.reasoning` as user-facing API

**File**: `apps/playground/src/pages/Resources.tsx:58-59`

```ts
console.log(products.strategy.reasoning); // one-line rationale
```

This is shown in the registration snippet as something users would write in
their own app. `reasoning` is not in the README API table. Either:

- Add `strategy.name` / `strategy.reasoning` as documented stable fields in
  the README `resource()` config table, OR
- Remove the `console.log(products.strategy.reasoning)` line from the snippet
  (keep `strategy.name` which IS shown in the Resources page rows).

- [ ] Align the snippet with what's documented. Update README if keeping it.

### C6 — `strategy.test.ts` calls internal fields "required"

**File**: `packages/core/src/__tests__/strategy.test.ts:93-105`

```ts
it('includes all required fields', () => {
  expect(s).toHaveProperty('equivalentCode');
  expect(s).toHaveProperty('reasoning');
  expect(s).toHaveProperty('behavior');
```

"Required fields" implies public contract. These are devtools fields, not
the fields every user needs. Rename the test `describe` block to `devtools
fields` and only assert what Phase C4 decides is public.

- [ ] Rename test block, update assertions to match C4 decision.

### C7 — QuickStart never shows the offline result path

**File**: `apps/playground/src/pages/docs/QuickStart.tsx:118-128`

Step 3 ends at `return res.json()` with no hint of what `QueuedResult` is or
what to do when the action returns it instead of the expected data. This is
the most common confusion point for new users. Add a fourth mini-step or an
inline callout:

```ts
const result = await createOrder({ productId: 1, qty: 2 });

if ('queued' in result) {
  // Offline — saved to IndexedDB, replays on reconnect
  toast(result.message);
} else {
  // Online — ran immediately
  console.log(result.id);
}
```

- [ ] Add offline-result handling to QuickStart step 3 or as a step 4
      "What comes back" callout.

**Phase C exit criteria**: all 7 items resolved, `pnpm --filter @sweidos/eidos
test` + `pnpm type-check` green, playground no longer shows misinformation.

---

## Phase 6 — SW Extensibility

**Goal**: let devs add their own SW logic (push handlers, custom routes,
analytics) without forking `eidos-sw.js`. This is the **most critical
unshipped abstraction-layer primitive** — without it, any project that
already has a `sw.js` cannot adopt Eidos (scope conflict, no documented
path). It also unlocks the next generation of "compose with Eidos" patterns.

- [ ] **Composable SW entry**: support `import { eidosSwHandlers } from
'@sweidos/eidos/sw'` so a dev can write their own `sw.ts` and call
      `eidosSwHandlers.install(self)` instead of using the prebuilt
      `eidos-sw.js` verbatim. Document both paths explicitly: - **"drop-in"** (current, zero-config) — copy `eidos-sw.js`, done. - **"compose"** (advanced) — write your own `sw.ts`, call
      `eidosSwHandlers.install(self)`, add your own `fetch`/`push`/etc.
      handlers around it.
- [ ] **`EidosConfig.swExtend`** (or similar): optional callback registered
      via `postMessage` that lets the page-side pass extra route/strategy
      config to the SW without rebuilding the file. **Note**: no cross-origin
      message validation needed — the SW only receives `postMessage` from
      clients within its own registration scope (same-origin by spec),
      matching the existing `EIDOS_REGISTER_RESOURCE` trust model. Docs must
      state this explicitly so devs don't add unnecessary origin-checking.
- [ ] **Document scope conflicts**: what happens when a project already has
      its own `sw.js`. Multiple SWs per origin, scope overlap, how to
      migrate. Currently undocumented and the most common first-adopter
      blocker for brown-field projects.

**Docs/tests to update**:

- Root `README.md` + `packages/core/README.md`: new "Advanced: composing
  your own service worker" section. Lead with the "drop-in vs compose"
  framing — don't bury it.
- `docs/guides/sw-composition.md` — new step-by-step walkthrough: "I
  already have a SW / I want to add my own logic."
- New tests: `packages/core/src/__tests__/sw-bridge.test.ts` — coverage for
  `swExtend`-style messaging (mock SW message channel).
- Playground: a "custom SW route" demo showing a non-Eidos route coexisting
  with `resource()`-registered ones.

---

## Phase 7 — Strategy & Cache Config Flexibility

**Goal**: close the gap between "auto-derived strategy" and what real apps
need, without making users drop to raw Workbox. Fulfills the "no cache
strategy to configure" promise at the API level.

- [x] **Per-resource network timeout — FIXED**: `ResourceConfig.networkTimeoutMs`
      (default 3000) replaces the hardcoded `AbortSignal.timeout(3000)` in
      `networkFirst()` and `5000` in SWR background revalidation. Threaded
      via `EIDOS_REGISTER_RESOURCE`.
- [x] **`maxAge` enforcement — FIXED**: SW stamps `X-Eidos-Cached-At` on
      every `cache.put()` and checks expiry on cache hits across all three
      strategies. Expired entries deleted and treated as misses.
- [x] **`maxEntries` — FIXED**: FIFO eviction on `cache.put()` when bucket
      exceeds `maxEntries`. Threaded via `EIDOS_REGISTER_RESOURCE`.
- [x] **Versioning scheme clarified**: `CACHE_VERSION` (global, Eidos-bumped)
      vs `ResourceConfig.version` (per-resource, dev-controlled) — NOTE
      comment added inline in README `resource()` config block.
- [ ] **Strategy presets / recipes**: named shorthand configs so devs don't
      need to know `cache-first` vs `stale-while-revalidate` for common
      cases. Examples: `resource(url, { offline: 'images' })` (→ cache-first,
      long maxAge), `resource(url, { offline: 'list' })` (→ SWR, no maxAge),
      `resource(url, { offline: 'user-data' })` (→ network-first, short TTL).
      Advanced `strategy`/`maxAge`/`maxEntries` stay available but aren't
      required. **Feasibility**: `deriveStrategy()`/`buildStrategy()` already
      centralize the strategy → config mapping — presets are a thin additional
      layer on top, no SW changes needed.

**Docs/tests to update**:

- `packages/core/src/__tests__/resource.test.ts` — preset cases.
- `packages/core/README.md` — expand `resource()` config table with every
  `ResourceConfig` field, default, and "when to use" column.
- `docs/guides/cache-strategies.md` — new guide: decision table ("if your
  data looks like X, use Y") comparing presets vs explicit strategy config.
- Playground: demo resource using `maxEntries`/`maxAge` so devs see
  eviction happen live.

---

## Phase 8 — Update/Versioning UX — SHIPPED

**Goal**: make Eidos's SW update lifecycle explicit. The #1 source of "stale
app" support issues for PWAs in general.

- [x] `onUpdateAvailable` callback in `EidosConfig`.
- [x] `EidosConfig.skipWaiting` (default `true`).
- [x] `triggerSwUpdate()` export.
- [x] SW install no longer auto-`skipWaiting()` — page controls timing.
- [x] `skipWaiting`/`clients.claim` interaction documented in README.

---

## Phase 9 — Debuggability — SHIPPED

**Goal**: when SW caching/replay does something unexpected, devs see _why_
without opening `chrome://inspect`.

- [x] `<EidosDevtools />` "Service Worker" tab: registration state, cache
      buckets, "Force update" button.
- [x] Dev-mode plain-English `console.warn` for three silent failure modes:
      non-secure context, SW file not found, generic registration failure.
      (Remaining: "resource registered before SW ready" — deferred, high
      false-positive risk.)
- [x] `eidosDebug()` export — JSON-serializable runtime snapshot.

---

## Phase 10 — Beginner Onboarding

**Goal**: a fresher who has never touched service workers, IndexedDB, or
cache strategies can install Eidos, copy one example, and have it working —
without understanding what a service worker is. This is the abstraction
promise at the docs level.

- [x] **`docs/guides/getting-started.md`** — zero-jargon walkthrough:
      install → Vite plugin → wrap app → one `resource()` and one `action()`
      → see it work offline. No mention of "strategy", "idempotency", or
      "replay" up front. Those get a collapsible "what's happening under the
      hood" section _after_ the working example. **DONE**.
- [x] **Glossary** (`docs/guides/glossary.md`): plain-language definitions
      for every term a user hits in the first hour — "cache strategy",
      "service worker", "idempotency key", "replay queue", "offline
      simulation". Each with a one-sentence "why you'd care" and a link to
      the relevant config option. **DONE**.
- [ ] **Plain-language preset names** (depends on Phase 7 presets): the
      QuickStart and getting-started guide use `offline: 'list'` or
      `offline: 'images'` rather than `strategy: 'stale-while-revalidate'`.
      Advanced strategy config stays available.
- [ ] **"Hello Eidos" playground route**: a separate, minimal page — one
      resource, one action, zero devtools, no conflict config. First thing a
      fresher lands on. Linked from the landing page CTA and README quick
      start. The current `/overview` route leads with the reliability
      dashboard; that stays for advanced users but should not be the entry
      point.
- [x] **Troubleshooting doc** (`docs/guides/troubleshooting.md`): one entry
      per Phase 9 console warning, written as "I see this message → here's
      the cause → here's the fix". Also covers runtime issues (stuck SW,
      `maxAge` not expiring, `networkTimeoutMs` timing) and the full
      `eidosDebug()` field reference. **DONE** — file exists, README link
      pending commit (Phase C3).

**Phase 10 exit criteria**: a dev with no PWA background can follow
`getting-started.md` start-to-finish and have offline caching + a queued
action working, without reading any other doc.

---

## Sequencing

```
Phase C (cleanup)
  │
  ├─── Phase 6 (SW extensibility — core abstraction primitive)
  │         └─── Phase 10 (onboarding — depends on Phase 7 presets for full effect,
  │                         but getting-started guide + glossary start now)
  │
  └─── Phase 7 (strategy presets)
            └─── Phase 10 (preset names in getting-started)
```

- **Phase C ships first** — don't add to a surface that has misinformation.
- **Phase 6 is the highest-priority feature work.** Without the composable SW
  entry, brown-field projects with existing SWs can't adopt Eidos. That's a
  hard adoption blocker before we invest in presets or onboarding.
- Phase 7 and Phase 6 are independent — can run in parallel if staffed.
- Phase 10's `getting-started.md`, glossary, and "Hello Eidos" route don't
  depend on Phase 7 presets and can start immediately after Phase C.
- Phase 10's preset names in `getting-started.md` depend on Phase 7 landing.

---

## Release process (per phase)

1. Implement + tests (`packages/core/src/__tests__/`, plus playground update
   for anything user-visible).
2. Update `packages/core/README.md` **and** root `README.md` (root is the
   source — `build:core` copies it via `scripts/copy-sw.mjs`). Re-run
   `pnpm --filter @sweidos/eidos size:check-docs` if bundle size moves.
3. Add a changeset: `pnpm changeset`.
   - Phase C: `patch` (fixes, no API additions).
   - Phase 6: `minor` (new opt-in exports, non-breaking).
   - Phase 7 presets: `minor` (new `offline` shorthand values, non-breaking).
   - Phase 10: no changeset unless preset names ship (then `minor`).
4. `pnpm --filter @sweidos/eidos test` + `pnpm type-check` +
   `pnpm --filter @sweidos/eidos size` green before merge.
