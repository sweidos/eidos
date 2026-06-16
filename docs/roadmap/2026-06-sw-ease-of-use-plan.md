# SW Ease-of-Use & Flexibility Plan

Companion to [phased-plan.md](./phased-plan.md) (all 5 phases done, no
breaking-change debt outstanding) and
[2026-06-architecture-review.md](./2026-06-architecture-review.md).

**Scope**: this plan is docs/planning only — no implementation in this pass.
Goal: make the service-worker layer (the project's core differentiator)
easier to adopt, customize, and debug, without regressing the "2-line setup"
promise. Each item below is a candidate for its own PR/changeset.

---

## Phase 6 — SW Extensibility

**Goal**: let devs add their own SW logic (push handlers, custom routes,
analytics) without forking `eidos-sw.js`.

- [ ] **Composable SW entry**: support `import { eidosSwHandlers } from
'@sweidos/eidos/sw'` so a dev can write their own `sw.ts` and call
      `eidosSwHandlers.install(self)` etc., instead of using the prebuilt
      `eidos-sw.js` verbatim. Document both paths: "drop-in" (current,
      zero-config) vs "compose" (advanced, custom SW file).
- [ ] **`EidosConfig.swExtend`** (or similar): optional callback registered
      via `postMessage` that lets the page-side hand the SW extra
      route/strategy config without rebuilding the SW file. **Note**:
      no cross-origin message validation needed for this — the SW only
      receives `postMessage` from clients within its own registration
      scope (same-origin by spec), matching the trust model of the
      existing `EIDOS_REGISTER_RESOURCE`/`EIDOS_CLEAR_CACHE` messages.
      Docs should say this explicitly so devs don't add unnecessary
      origin-checking.
- [ ] Document scope/registration interplay when a project already has its
      own `sw.js` (multiple SWs per origin, scope conflicts) — currently
      undocumented and a likely first-adopter blocker.

**Docs/tests to update**:

- `packages/core/README.md` + root `README.md`: new "Advanced: composing
  your own service worker" section.
- `docs/` — new `docs/guides/sw-composition.md` walkthrough.
- New tests: `packages/core/src/__tests__/sw-bridge.test.ts` coverage for
  `swExtend`-style messaging (mock SW message channel).
- Playground: `apps/playground` — add a small "custom SW route" demo page
  showing a non-eidos route coexisting with `resource()`-registered ones.

---

## Phase 7 — Strategy & Cache Config Flexibility

**Goal**: close gaps between "auto-derived strategy" and what real apps need
without dropping to raw Workbox.

- [ ] **Per-resource network timeout** — `networkFirst()` in `eidos-sw.js`
      hardcodes `AbortSignal.timeout(3000)`; the page-side SWR
      revalidation in `resource.ts` hardcodes `5000`. Two different
      magic numbers for conceptually the same "how long before falling
      back to cache" knob. New `ResourceConfig.networkTimeoutMs` should
      replace both, threaded through `EIDOS_REGISTER_RESOURCE` to the SW.
- [ ] **`maxAge` enforcement gap — CONFIRMED, not just "audit"**:
      `config.maxAge` is checked **only** in the page-side
      `handle.fetch()` path (`resource.ts:297-302`, via `cachedAt` in the
      Zustand store). The SW's own `cacheFirst`/`staleWhileRevalidate`
      (`eidos-sw.js`) serve whatever's in Cache Storage with **no expiry
      check at all** — so any request that hits the SW directly (browser
      navigation, `fetch()` not routed through `handle.fetch()`, a
      `<link>`/`<img>` request) ignores `maxAge` entirely. Two fixes
      needed: (1) thread `maxAge` into `EIDOS_REGISTER_RESOURCE` so the SW
      can apply it itself (compare `cache.match()` response's stored
      timestamp/`Date` header), (2) document clearly that `maxAge`
      currently only governs the `handle.fetch()`/`handle.json()` path —
      this is a **P1 bugfix**, should ship as its own `patch` PR _before_
      Phase 7's additive `maxEntries`/preset work, per the sequencing note
      below.
- [ ] **Cache cleanup policy**: `ResourceConfig.maxEntries` (LRU eviction per
      cache bucket) — useful for image/list endpoints that grow unbounded.
- [ ] **Clarify the two versioning schemes**: `eidos-sw.js` has a hardcoded
      `CACHE_VERSION = "v1"` (global cache-prefix cache-busting, bumped only
      on an Eidos SW release) separate from `ResourceConfig.version`
      (per-resource shape-versioning suffix, dev-controlled). Both end up
      in the same `cacheName` string but mean different things — add a
      short doc note (README config table, Phase 10 glossary) so devs
      don't conflate "bump my resource version" with "the SW got
      updated."
- [ ] **Strategy presets / recipes**: named shorthand configs (e.g.
      `resource(url, { offline: 'images' })` or a `presets` export) for
      common cases — static assets, paginated lists, user-specific data —
      so devs don't need to reason about `cache-first` vs
      `stale-while-revalidate` for typical cases. **Feasibility check**:
      `deriveStrategy()`/`buildStrategy()` (`resource.ts:384-440`) already
      centralize strategy → config mapping per `CacheStrategy` value —
      presets are a thin additional mapping layer (`preset name → {
strategy, maxAge, maxEntries }`) feeding into the same
      `buildStrategy()` call. Low risk, no SW changes needed beyond what
      Phase 7's other items already require. `cache-first`/`network-first`
      both already hardcode `ExpirationPlugin({ maxEntries: 60 })` in the
      `equivalentCode` docstrings (lines 415/430) but this isn't actually
      passed to the SW's `cacheFirst`/`networkFirst` — confirms
      `maxEntries` is currently **documentation-only**, not enforced;
      Phase 7's `maxEntries` item must wire it into the real SW cache-put
      path (LRU eviction on `cache.put()`), not just `equivalentCode`.

**Docs/tests to update**:

- `packages/core/src/__tests__/resource.test.ts` — new cases for
  `networkTimeoutMs`, `maxEntries`, expiry-on-read.
- `packages/core/README.md` — expand "Resources" section with a config
  reference table (every `ResourceConfig` field, default, when to use).
- `docs/` — new `docs/guides/cache-strategies.md` comparing presets with
  a decision table ("if your data looks like X, use Y").
- Playground: add a "cache inspector" demo resource using `maxEntries` /
  `maxAge` so devs can see eviction happen live.

---

## Phase 8 — Update/Versioning UX

**Goal**: SW update lifecycle is the #1 source of "stale app" support
issues for PWAs in general — make Eidos's story explicit and easy.

- [ ] **`onUpdateAvailable` callback** in `EidosConfig` — fired when a new
      SW is waiting (`updatefound` / `statechange` to `installed`), so apps
      can show a "reload to update" toast instead of silently
      `skipWaiting()`-ing (current behavior, which can yank resources out
      from under an in-flight page).
- [ ] **`EidosConfig.skipWaiting`** (default `true`, matching current
      behavior) — opt-out for apps that want the toast-then-reload pattern
      above.
- [ ] Document the interaction between `skipWaiting`/`clients.claim` and the
      cross-tab `BroadcastChannel`/Web-Locks replay coordination (Phase 0/1)
      — an update mid-replay shouldn't double-execute queued actions.

**Docs/tests to update**:

- `packages/core/src/__tests__/runtime.test.ts` — `onUpdateAvailable`
  fires on mocked `updatefound`; `skipWaiting: false` doesn't call
  `self.skipWaiting()`.
- `packages/core/README.md` / root `README.md` — "Handling SW updates"
  section with a copy-pasteable toast example.
- Playground: simulate a new SW version (bump a query-param/version string)
  and show the update toast end-to-end.

---

## Phase 9 — Debuggability

**Goal**: when SW caching/replay does something unexpected, devs should be
able to see _why_ without opening `chrome://inspect`.

- [ ] **`<EidosDevtools />` "Service Worker" tab**: registration state
      (installing/waiting/active), active cache buckets with entry counts,
      and a "force update" button (ties into Phase 8's update flow).
- [ ] **Dev-mode console warnings, plain-English**: e.g. resource registered
      before SW ready, `swPath` 404, HTTP (non-HTTPS/non-localhost) context
      where SW registration silently no-ops — these currently fail silently
      and are hard to diagnose for first-time users. Wording must avoid
      assuming prior SW knowledge — e.g. not "SW registration failed: 404"
      but "Service worker file not found at /eidos-sw.js — did you add
      `eidos()` to your vite.config.ts plugins? See <link>." Each warning
      links to a matching entry in the Phase 10 troubleshooting doc.
- [ ] **`eidosDebug()` export**: framework-agnostic snapshot (registered
      resources, queue state, SW status) as a plain object — useful for bug
      reports and the devtools tab alike.

**Docs/tests to update**:

- `packages/core/src/__tests__/devtools.test.ts` (new or extended) — SW tab
  renders registration states; `eidosDebug()` shape test.
- `packages/core/README.md` — "Troubleshooting" section listing each new
  console warning and what it means.
- Playground: surface `<EidosDevtools />` SW tab prominently (it likely
  already mounts devtools — confirm placement covers the new tab).

---

## Phase 10 — Beginner Onboarding

**Goal**: a fresher who's never touched service workers, IndexedDB, or cache
strategies can install Eidos, copy one example, and have it working —
without needing to understand the concepts from Phases 6–9 first. This
phase is mostly docs/examples, no new APIs.

- [ ] **`docs/guides/getting-started.md`** — zero-jargon walkthrough:
      install → add Vite plugin → wrap app → declare one `resource()` and
      one `action()` → see it work offline. No mention of "strategy",
      "idempotency", "replay" up front — those get a "what's happening
      under the hood" collapsible section _after_ the working example.
- [ ] **Glossary** (`docs/guides/glossary.md`): plain-language definitions —
      "cache strategy", "service worker", "idempotency key", "replay queue",
      "hydration" — each with a one-sentence "why you'd care" and a link to
      the relevant config option. Linked from README and all guide docs.
- [ ] **Plain-language preset names** (depends on Phase 7 presets): instead
      of requiring `strategy: 'stale-while-revalidate'` up front, ship
      presets like `offline: 'list'` / `offline: 'images'` /
      `offline: 'user-data'` that map to the right strategy. Advanced
      `strategy`/`maxAge`/etc. stay available but aren't required for the
      common cases.
- [ ] **Minimal playground example**: `apps/playground` currently leads with
      the reliability dashboard / devtools (advanced). Add a separate
      "Hello Eidos" route — one resource, one action, no devtools, no
      conflict config — as the first thing a fresher sees, linked
      prominently from the landing page and root README's quick start.
- [ ] **Troubleshooting doc** (`docs/guides/troubleshooting.md`): one entry
      per Phase 9 console warning, written as "I see this message → here's
      what's wrong → here's the fix", with copy-pasteable fixes (no
      "depends on your setup" hand-waving).

**Docs/tests to update**:

- `docs/guides/getting-started.md`, `docs/guides/glossary.md`,
  `docs/guides/troubleshooting.md` — new.
- Root `README.md` — "Quick start" links to getting-started guide instead
  of (or in addition to) the current inline snippet; add glossary link near
  first jargon term (`neverLose`, `resource`).
- Playground: new `Hello Eidos` page/route + e2e smoke test
  (`apps/e2e`) covering it loads and works offline.
- No changeset needed unless preset names (Phase 7 dependency) ship as part
  of this phase — then same `minor` rule as Phase 7 applies.

---

## Cross-cutting: release process for this plan

Each phase above ships as its own PR. Per PR:

1. Implement + tests (unit tests in `packages/core/src/__tests__/`, plus
   playground demo update for anything user-visible).
2. Update `packages/core/README.md` **and** root `README.md` (the latter is
   the source — `build:core` copies it into the package per
   `scripts/copy-sw.mjs`). Re-run `pnpm --filter @sweidos/eidos
size:check-docs` if bundle size moves.
3. Add a changeset: `pnpm changeset` — classify as `minor` for new opt-in
   config fields/exports (additive, non-breaking), `patch` for
   bugfix-only PRs (Phase 7's confirmed `maxAge` SW-side enforcement gap
   and the documentation-only `maxEntries` gap — both real bugs, ship as
   `patch` before any additive Phase 7 work). None of Phases 6–10 as
   scoped require a `major` bump — all new fields are optional with
   defaults matching current behavior.
4. `pnpm --filter @sweidos/eidos test` + `pnpm --filter @sweidos/eidos
type-check` + `pnpm --filter @sweidos/eidos size` green before merge.

---

## Sequencing notes

- Phase 6 (extensibility) and Phase 9 (debuggability) are independent and
  can run in parallel.
- Phase 7's two confirmed bugs — `maxAge` not enforced SW-side, and
  `maxEntries` documented but never wired into the SW's cache-put path —
  should ship as a single `patch` PR **first**, before the additive
  `networkTimeoutMs`/presets work (Phase 7 remainder), to avoid bundling
  bugfixes with feature work.
- Phase 8 depends on nothing here but touches the same `runtime.ts`
  init path as Phase 0/1 — re-read those guarantees before changing
  `skipWaiting` defaults.
- Phase 10's plain-language presets and troubleshooting doc depend on
  Phase 7 (presets) and Phase 9 (warnings) for full effect — but
  getting-started guide, glossary, and "Hello Eidos" playground example
  don't depend on either and can start immediately, in parallel with
  Phases 6–9.
