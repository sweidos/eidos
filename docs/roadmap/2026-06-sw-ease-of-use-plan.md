# SW Ease-of-Use & Flexibility Plan

Companion to [phased-plan.md](./phased-plan.md) (all 5 phases done, no
breaking-change debt outstanding) and
[2026-06-architecture-review.md](./2026-06-architecture-review.md).

## Package mandate

Eidos has **three non-negotiable goals** that must be held together:

1. **Abstraction layer for service workers** — a dev declares _intent_
   (`resource()`, `action()`); Eidos generates the SW logic, picks the
   strategy, and handles the queue. The user never writes SW code.

2. **Lightweight and zero-overhead** — the abstraction must not cost
   performance. A user who does not call `resource()` should pay zero for
   the caching layer. A user who only uses `action()` should not pull in
   Inspector string constants. The SW fetch interception path must add no
   measurable latency over a raw `fetch()`. Every addition gets measured.

3. **Framework-agnostic by default** — the core API is plain JavaScript.
   Any framework integrates using the same code path: `resource()`,
   `action()`, `initEidos()`, and the reactive stores in `stores.ts`
   (`.subscribe()` / `.getState()`). No framework-specific knowledge
   required. Framework-specific convenience wrappers (React hooks,
   SvelteKit init, Next.js re-export) are opt-in additions — they must
   never be the primary documented path.

None of these goals can be traded against the others. A bloated abstraction
is not an abstraction — it's a framework tax. A React-first library is not
framework-agnostic — it's a React library that happens to export stores.

---

## Framework-agnostic architecture

The right layer model, from bottom to top:

```
initEidos()                     ← one call, any runtime, no React needed
resource() / action()           ← pure JS, declare once at module scope
stores.ts                       ← the primary integration API
  eidosStatus.subscribe()         works in React, Svelte, Vue, vanilla JS,
  eidosQueue.subscribe()          Angular, Solid, Qwik — anything with
  eidosResource(url).subscribe()  a reactive model or an effect hook
  onQueueDrain(fn)
replayQueue() / clearQueue()    ← pure JS, call from anywhere
```

**What already works without any framework adapter today:**

```ts
// React (no EidosProvider needed)
useEffect(() => eidosStatus.subscribe(({ isOnline }) => setOnline(isOnline)), []);

// Svelte
$: isOnline = $eidosStatus.isOnline; // auto-subscribe via $ prefix

// Vue
watchEffect((cleanup) => {
  cleanup(eidosStatus.subscribe(({ isOnline }) => (state.isOnline = isOnline)));
});

// Vanilla
eidosStatus.subscribe(({ isOnline }) => updateUI(isOnline));
```

**What each "adapter" actually is:**

| File              | What it really does                                       | Verdict                                                  |
| ----------------- | --------------------------------------------------------- | -------------------------------------------------------- |
| `stores.ts`       | Framework-agnostic subscribe/getState stores              | **Primary API — document first**                         |
| `react/hooks.ts`  | `useSyncExternalStore` sugar over `stores.ts`             | Collapse to one generic `useStore(store)`                |
| `sveltekit.ts`    | `() => initEidos(config)` — one arrow function            | **Remove** — 2-line docs example suffices                |
| `nextjs.ts`       | Re-exports `@sweidos/eidos` with `'use client'` prepended | **Remove** — users add `'use client'` themselves         |
| `react-native.ts` | Different runtime — no SW, AsyncStorage queue             | **Keep** — genuinely different execution environment     |
| `@sweidos/next`   | Server Actions idempotency — server-side only             | **Keep** — Server Actions are Next.js-specific by nature |

**Target package surface — after simplification:**

```ts
import {
  initEidos, // setup — call once at app startup, not in a component
  resource, // declare a cached endpoint
  action, // declare a queued mutation
  eidosStatus, // store: { isOnline, swStatus }
  eidosQueue, // store: ActionQueueItem[]
  eidosQueueStats, // store: { pending, failed, total }
  eidosResource, // factory: store for one URL
  replayQueue, // force replay
  clearQueue, // discard queue
} from '@sweidos/eidos';

// React only (optional)
import { useStore } from '@sweidos/eidos/react';

// React Native (different runtime)
import { initEidosReactNative } from '@sweidos/eidos/react-native';

// Next.js Server Actions (server-side only)
import { serverAction } from '@sweidos/next';
```

Three subpaths. No SvelteKit adapter. No Next.js client re-export. No six
named React hooks. `useStore(anyStore)` is the single React primitive.

**Target setup — identical structure in every framework:**

```ts
// ── Step 1: startup (once, any file, not in a component) ──
import { initEidos } from '@sweidos/eidos';
initEidos({ swPath: '/eidos-sw.js' });

// ── Step 2: declare intent (module scope) ──
import { resource, action } from '@sweidos/eidos';
export const products = resource('/api/products', { offline: true });
export const createOrder = action(fn, { reliability: 'neverLose', name: 'createOrder' });

// ── Step 3: read reactive state (one line per store, framework's native bind) ──
import { eidosStatus, eidosQueue } from '@sweidos/eidos';

// React (with useStore helper):
const { isOnline } = useStore(eidosStatus);
const queue = useStore(eidosQueue);

// Svelte (zero extra code — $ auto-subscribes):
$eidosStatus.isOnline;

// Vue:
const status = reactive(eidosStatus.getState());
onMounted(() => {
  const stop = eidosStatus.subscribe((s) => Object.assign(status, s));
  onUnmounted(stop);
});

// Vanilla:
eidosStatus.subscribe(({ isOnline }) => updateUI(isOnline));
```

The ONLY framework-specific code is step 3 — one line per store using the
framework's own reactive primitive. Steps 1 and 2 are identical everywhere.

**Direction going forward:**

- Stop adding new framework adapters. New framework support = a docs example,
  not code.
- `stores.ts` is the primary integration path. React hooks appear in a
  secondary "React convenience" section of the docs, not the quickstart.
- Deprecate `initEidosSvelteKit` and `@sweidos/eidos/nextjs`. Mark with
  `@deprecated` JSDoc pointing to the inline alternative. Remove in the next
  major version.
- `EidosProvider` stays but documented as "React convenience wrapper around
  `initEidos()`", not a required setup step.
- `@sweidos/eidos/query` stays — TanStack Query is framework-agnostic and
  the bridge adds real value.

**What deviated**: Phases 0–5 hardened the reliability core and built 8
framework adapters — all valuable in isolation — but:

- SW-abstraction primitives (composable SW entry, strategy presets,
  beginner onboarding) are still unshipped.
- Human-readable strategy explanation strings (`reasoning`, `behavior`,
  `equivalentCode`) are baked into the core bundle for every user, not just
  devtools users. The core is currently at **6.94 / 7 kB** — 60 bytes of
  headroom — so Phase 6 will breach the budget without pre-work.
- Only one `/* @__PURE__ */` annotation exists in the entire codebase,
  limiting tree-shaker effectiveness on module-level singletons.

**Sequencing rule**: Phase C (cleanup + bundle pre-work) ships before any
new feature. You cannot add to a surface that has misinformation, and you
cannot add Phase 6 code to a bundle that is already at its ceiling.

---

## Bundle budget

| Entry point                        | Limit  | Current | After Phase C target                                |
| ---------------------------------- | ------ | ------- | --------------------------------------------------- |
| `core (resource + action + store)` | 7 kB   | 6.94 kB | **≤ 6 kB** (C4 removes devtools strings)            |
| `react hooks`                      | 1.5 kB | 1.17 kB | **≤ 0.4 kB** (C11 replaces 6 hooks with `useStore`) |
| `cjs bundle`                       | 18 kB  | 7.3 kB  | ≤ 7.5 kB                                            |

Gate: `pnpm --filter @sweidos/eidos size` must pass on every PR. After Phase
C lands, lower the core limit from `7 KB` to `6 KB` and the react hooks
limit from `1.5 KB` to `0.5 KB` in `packages/core/package.json` so the
budget tightens permanently.

---

## Phase C — Codebase Cleanup (BEFORE any new features)

**Goal**: fix active misinformation, dead API surface, uncommitted work,
and the bundle pre-work that makes Phase 6 possible. No new APIs.

### C1 — Landing hero contradicts the core promise

**File**: `apps/playground/src/pages/Landing.tsx:70`

The hero `CODE_SAMPLE` shows `strategy: 'stale-while-revalidate'`
explicitly, two paragraphs below _"No cache strategy to configure."_ Remove
it so the first thing a user copies is:

```ts
resource('/api/products', { offline: true });
```

- [ ] Remove `strategy: 'stale-while-revalidate'` from `CODE_SAMPLE`.

### C2 — Demo page hardcodes strategy label as a string literal

**File**: `apps/playground/src/pages/Demo.tsx:637`

`<span>StaleWhileRevalidate</span>` is hardcoded. `resourceEntry` is
already in scope.

- [ ] Replace with `resourceEntry?.strategy.name ?? 'StaleWhileRevalidate'`.

### C3 — Commit in-flight docs work

`docs/guides/troubleshooting.md` exists but is untracked. `README.md` has
an unstaged diff adding the link to it. The link points to an uncommitted
file — CI sees a stale README.

- [ ] Stage and commit `docs/guides/troubleshooting.md` + `README.md` diff
      as a single commit.

### C4 — `GeneratedStrategy` devtools strings are baked into the core bundle

**Files**: `packages/core/src/resource.ts` (`buildStrategy()`),
`packages/core/src/types.ts:40-50`

`GeneratedStrategy.reasoning`, `.behavior`, and `.equivalentCode` are
multi-line human-readable strings (strategy rationale paragraphs, 4-step
behavior descriptions, Workbox pseudocode). They are returned from
`buildStrategy()` for every `resource()` call — meaning every user who
imports `resource()` pays for this text, even if they never open an
Inspector.

Rough impact: ~9 string constants × 50–200 chars each ≈ 1–2 kB of the
current 6.94 kB core. Removing them from the default `resource()` return
path is the single biggest bundle reduction available without breaking any
real user code.

**Resolution** — move devtools fields behind a lazy accessor:

```ts
// Core handle — no devtools strings baked in
export interface ResourceHandle<T> {
  readonly url: string;
  readonly config: ResourceConfig;
  readonly strategy: {
    name: string; // 'StaleWhileRevalidate' — stays in core (short)
    swStrategy: CacheStrategy;
    cacheName: string;
  };
  // ...
}

// Opt-in via @sweidos/eidos/devtools or a handle method
handle.strategyDetails(); // → { reasoning, behavior, equivalentCode }
```

Or simpler: keep `GeneratedStrategy` but move the verbose string fields to
a separate `GeneratedStrategyDetails` interface only returned when the
devtools entry point is imported. Either way, `reasoning`/`behavior`/
`equivalentCode` must not be in the critical path that executes on every
`resource()` call in every user's app.

- [ ] Audit `buildStrategy()` string constants — measure actual bundle delta.
- [ ] Move verbose fields out of the core return path.
- [ ] Update `Inspector.tsx` and `Resources.tsx` to use the new accessor.
- [ ] Update `strategy.test.ts` — the `GeneratedStrategy shape` test (line 93) calls devtools fields "required fields". Rename to `devtools fields`
      and test via the new accessor, not the core handle type.
- [ ] After this ships, lower the core size-limit from `7 KB` to `6 KB` in
      `packages/core/package.json`.

**Note**: `equivalentCode` is already dead — it is in the type and `SAMPLE`
but never rendered anywhere in the playground UI. It should be removed
entirely (not just moved), not just behind a lazy accessor.

### C5 — Resources.tsx teaches `strategy.reasoning` as user-facing API

**File**: `apps/playground/src/pages/Resources.tsx:58-59`

```ts
console.log(products.strategy.reasoning); // one-line rationale
```

Shown as code a user would write in their own app. `reasoning` is not in
the README. After C4 changes the accessor shape, this snippet either
updates to `handle.strategyDetails().reasoning` (if keeping it) or drops
the `reasoning` log line entirely.

- [ ] Resolve in the same PR as C4.

### C6 — `@__PURE__` annotations missing on module-level singletons

**Files**: `packages/core/src/resource.ts`, `packages/core/src/action.ts`,
`packages/core/src/stores.ts`

Only `_inflightRequests` in `resource.ts` has a `/* @__PURE__ */`
annotation. Module-level `Map`/`Set` instantiations and registry objects
(`_registry`, `_actionRegistry`, `_listeners`) will be included by
tree-shakers even when unused, because the side-effect cannot be proven
absent.

- [ ] Add `/* @__PURE__ */` to all module-level `new Map()`, `new Set()`,
      `new WeakMap()` instantiations that have no actual side effects.
- [ ] Verify with `pnpm --filter @sweidos/eidos size` that the bundle shrinks.

### C7 — QuickStart never shows the offline result path

**File**: `apps/playground/src/pages/docs/QuickStart.tsx:118-128`

Step 3 shows `return res.json()` and stops. A user who follows this and
hits the offline path gets a `QueuedResult` object instead of their data —
with no warning and no docs to explain it. Add a "what comes back" callout:

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

- [ ] Add to QuickStart as step 4 or inline callout below step 3.

### C8 — Deprecate `initEidosSvelteKit` and `@sweidos/eidos/nextjs`

**Files**: `packages/core/src/sveltekit.ts`,
`packages/core/src/nextjs.ts`

`initEidosSvelteKit` is 24 lines that return `() => { void initEidos(config) }`.
Any user can write `onMount(() => initEidos({ swPath: '/eidos-sw.js' }))`.
The adapter exists solely to avoid writing one arrow function. The docs
example it replaces is two lines.

`@sweidos/eidos/nextjs` is 16 lines that re-export `@sweidos/eidos` with
`'use client'` prepended at build time. Users who need this just add
`'use client'` to their own wrapper file — the same pattern the Next.js
docs recommend for any third-party client library.

Both adapters give the false impression that Eidos is framework-specific.
They add maintenance surface for no meaningful capability gain.

- [ ] Add `@deprecated` JSDoc to `initEidosSvelteKit` pointing to the
      inline alternative.
- [ ] Add `@deprecated` JSDoc to `@sweidos/eidos/nextjs` pointing to the
      inline alternative.
- [ ] Update README "Framework support" table: change SvelteKit and
      Next.js rows to show the plain `initEidos()` / `'use client'` pattern
      as the documented approach.
- [ ] Update `apps/playground` if it imports from either path.
- [ ] Do **not** remove the files yet — mark as deprecated, remove in a
      future major version only after confirming zero download impact.

### C10 — Add `.value` getter to `EidosReadable` — signals-compatible accessor

**File**: `packages/core/src/stores.ts`

`.getState()` is a method name borrowed from Zustand. Signals use `.value`.
All modern frameworks (Vue refs, Angular signals, Solid signals, Preact
signals) converge on `.value` as the synchronous read accessor. Adding it
as a non-breaking alias makes `EidosReadable<T>` compatible with any
framework's signal adapter without code changes.

```ts
// current
eidosStatus.getState().isOnline;

// after
eidosStatus.value.isOnline; // alias, identical semantics
```

- [ ] Add `readonly value: T` to `EidosReadable<T>` interface in
      `packages/core/src/stores.ts`.
- [ ] Add `get value() { return selector(useEidosStore.getState()) }` to
      the `readable()` factory.
- [ ] Keep `.getState()` — not deprecated, just supplemented. Both stay.
- [ ] Update `docs/guides/framework-integration.md` examples to use
      `.value` for synchronous reads and `.subscribe()` for reactive ones.
- [ ] No changeset needed — purely additive, non-breaking.

### C11 — Collapse React hooks to one generic `useStore(store)` adapter

**File**: `packages/core/src/react/hooks.ts`

Currently 6 named hooks: `useEidosStatus`, `useEidosQueue`,
`useEidosQueueStats`, `useEidosResource`, `useEidosAction`,
`useEidosReliabilityStats`. Each is a 3-5 line `useSyncExternalStore`
wrapper over a specific store. The abstraction forces users to memorize
which hook name maps to which store.

The replacement is one generic hook that works with any `EidosReadable`:

```ts
// The entire react/hooks.ts public surface becomes:
export function useStore<T>(store: EidosReadable<T>): T {
  return useSyncExternalStore(store.subscribe, store.getState);
}

// Usage — same pattern for every store:
const { isOnline } = useStore(eidosStatus);
const queue = useStore(eidosQueue);
const stats = useStore(eidosQueueStats);
const entry = useStore(eidosResource('/api/products'));
const item = useStore(eidosAction(id));
```

Users import the stores they need, pass to `useStore`. No hook name to
memorize per piece of state. The pattern is identical regardless of what
state they want.

- [ ] Add `useStore<T>(store: EidosReadable<T>): T` to
      `packages/core/src/react/hooks.ts` — ~5 lines.
- [ ] Export `useStore` from `@sweidos/eidos/react` subpath.
- [ ] Keep all 6 existing named hooks but mark each as `@deprecated`
      pointing to `useStore(eidosStatus)` etc. Remove in next major version.
- [ ] `useEidosOnDrain` is the exception — it has side-effect semantics
      (fires callback, no return value). Keep it as-is; it doesn't fit
      the `useStore` pattern.
- [ ] Update `apps/playground` to use `useStore` pattern so docs examples
      match the new recommended path.
- [ ] Size-limit: `react hooks` subpath must stay under 1.5 kB.
      After removing 6 hook bodies and replacing with `useStore`, it
      should shrink to ~0.3 kB.

### C9 — Document `stores.ts` as the primary integration API

**Files**: `README.md`, `packages/core/README.md`,
`apps/playground/src/pages/docs/`

Currently the README "Quick start" leads with `EidosProvider` (React) and
the "Framework support" table sends users to framework-specific subpaths
first. A Vue user reads "Vue — framework-agnostic stores via
`eidosStatus.subscribe()`" as a footnote after 5 React-first examples.

The stores API is the actual answer to "how do I use Eidos in my
framework" for React, Svelte, Vue, vanilla JS, Angular, Solid, and anything
else. It should be the first integration example every user sees.

- [ ] Restructure the README "Quick start" step 3 to show the stores
      pattern as the default, with `EidosProvider` / React hooks in a
      collapsible "React convenience" section beneath.
- [ ] Add a `docs/guides/framework-integration.md` — one page showing
      `eidosStatus.subscribe()` usage in React (`useEffect`), Svelte (`$`),
      Vue (`watchEffect`), and vanilla JS side-by-side. No framework needs
      a custom adapter.
- [ ] Update the "Framework support" table in README: remove the
      framework-specific import paths for Svelte and Vue; replace with
      `@sweidos/eidos` (the stores API works for both).

**Phase C exit criteria**: all 11 items resolved.

- Core bundle below 6.5 kB (target: 6 kB after C4 removes devtools strings).
- `react hooks` subpath shrinks from 1.17 kB toward ~0.3 kB after C11.
- `pnpm --filter @sweidos/eidos test` + `pnpm type-check` +
  `pnpm --filter @sweidos/eidos size` all green.
- Playground shows no misinformation (C1, C2).
- README leads with `initEidos()` + stores as the primary path, not
  `EidosProvider` + named hooks (C9, C11).
- `eidosStatus.value` works (C10).
- `useStore(eidosStatus)` works and is the documented React pattern (C11).

---

## Phase 6 — SW Extensibility

**Goal**: let devs add their own SW logic (push handlers, custom routes,
analytics) without forking `eidos-sw.js`. This is the **most critical
unshipped abstraction-layer primitive**. Without it:

- Projects with an existing `sw.js` cannot adopt Eidos (scope conflict).
- The "you never write SW code" promise only holds for green-field apps.
- There is no documented upgrade path from "drop-in" to "custom SW".

**Bundle constraint**: Phase 6 adds code to `@sweidos/eidos/sw` (a new
subpath). The new subpath must be tree-shaken from the core entry — users
who use the drop-in `eidos-sw.js` path must not pay for the composable
entry exports. Phase C4/C6 must land first to give the core budget headroom.

- [ ] **Composable SW entry**: `import { eidosSwHandlers } from
'@sweidos/eidos/sw'` — a dev writes their own `sw.ts`, calls
      `eidosSwHandlers.install(self)`, and adds their own event handlers
      around it. The prebuilt `eidos-sw.js` drops-in for those who don't
      need this. Document both explicitly: - **"drop-in"** (current, zero-config): copy `eidos-sw.js` → done. - **"compose"** (advanced): write `sw.ts`, import handlers, extend.
- [ ] **`EidosConfig.swExtend`** (or similar): optional `postMessage`
      callback to pass extra route/strategy config from the page to the SW
      without rebuilding the file. No cross-origin validation needed — SW
      only receives messages from same-origin clients by spec. Docs must
      say this explicitly so devs don't add unnecessary origin-checking.
- [ ] **Document scope conflicts**: what happens when a project already has
      a `sw.js`. Multiple SWs per origin, scope overlap, migration path.
      Currently undocumented — the most common first-adopter blocker for
      brown-field projects.

**Performance note**: `eidosSwHandlers.install(self)` must not add any
overhead over the current `eidos-sw.js` fetch path. The install call should
be a direct registration of the existing event listener functions — no
wrapper, no indirection layer on the hot path.

**Docs/tests to update**:

- Root `README.md` + `packages/core/README.md`: "Advanced: composing your
  own service worker" section. Drop-in vs compose framing, not buried.
- `docs/guides/sw-composition.md`: step-by-step walkthrough for "I already
  have a SW" and "I want to add custom logic alongside Eidos".
- `packages/core/src/__tests__/sw-bridge.test.ts`: `swExtend` messaging
  coverage.
- Playground: a "custom SW route" demo showing a non-Eidos route coexisting
  with `resource()`-registered ones.

---

## Phase 7 — Strategy & Cache Config Flexibility

**Goal**: close the gap between "auto-derived strategy" and what real apps
need. Fulfills "no cache strategy to configure" at the API level.

- [x] **Per-resource `networkTimeoutMs` — FIXED**.
- [x] **`maxAge` SW-side enforcement — FIXED**.
- [x] **`maxEntries` FIFO eviction — FIXED**.
- [x] **Versioning scheme clarified** in README.
- [ ] **Strategy presets**: named shorthand values so devs don't need to
      know `'stale-while-revalidate'`. Examples: - `offline: 'list'` → SWR, no maxAge (API lists, feed data) - `offline: 'images'` → cache-first, long maxAge (static assets) - `offline: 'user-data'` → network-first, short TTL (personalized)
      Advanced `strategy`/`maxAge`/`maxEntries` stay available.
      `deriveStrategy()`/`buildStrategy()` already centralize the mapping —
      presets are a thin additional layer on top, no SW changes needed.

**Bundle constraint**: preset values must not add to the core bundle. They
are a compile-time mapping to existing `CacheStrategy` values — no new
runtime code, just a wider union type for `offline`.

**Docs/tests to update**:

- `packages/core/src/__tests__/resource.test.ts` — preset cases.
- `packages/core/README.md` — full `ResourceConfig` field reference table
  with defaults and "when to use" column.
- `docs/guides/cache-strategies.md` — decision table: "if your data looks
  like X, use preset Y; if you need fine control, use explicit config Z."
- Playground: demo resource using `maxEntries`/`maxAge` with live eviction
  counter.

---

## Phase 8 — Update/Versioning UX — SHIPPED

- [x] `onUpdateAvailable` callback, `EidosConfig.skipWaiting`, `triggerSwUpdate()`.
- [x] SW install no longer auto-`skipWaiting()`.
- [x] `skipWaiting`/`clients.claim` interaction documented.

---

## Phase 9 — Debuggability — SHIPPED

- [x] `<EidosDevtools />` "Service Worker" tab.
- [x] Plain-English `console.warn` for three silent failure modes.
- [x] `eidosDebug()` export.

---

## Phase 10 — Beginner Onboarding

**Goal**: a dev with no PWA background can install Eidos, copy one example,
and have offline caching + a queued action working — without reading about
service workers, IndexedDB, or cache strategies.

- [ ] **`docs/guides/getting-started.md`**: zero-jargon walkthrough. No
      mention of "strategy", "idempotency", or "replay" up front — those go
      in a collapsible "what's happening" section after the working example.
- [ ] **`docs/guides/glossary.md`**: plain-language definitions for every
      term a user hits in the first hour. One "why you'd care" sentence per
      term, linked to the relevant config option.
- [ ] **Plain-language preset names** (depends on Phase 7): QuickStart and
      getting-started use `offline: 'list'` / `offline: 'images'` instead
      of `strategy: 'stale-while-revalidate'`.
- [ ] **"Hello Eidos" playground route**: minimal page — one `resource()`,
      one `action()`, no devtools, no conflict config. First thing a fresher
      lands on. Linked from landing page CTA. The current `/overview` route
      stays for advanced users but must not be the default entry point.
- [x] **`docs/guides/troubleshooting.md`** — DONE. README link pending
      commit (Phase C3).

**Phase 10 exit criteria**: a dev with no PWA background follows
`getting-started.md` end-to-end and gets offline caching + a queued action
working without reading any other doc.

---

## Sequencing

```
Phase C (cleanup + bundle pre-work + framework-agnostic pivot)
  │
  ├─── Phase 6 (SW extensibility — core abstraction primitive)
  │    Prerequisite: C4/C6 must land first for bundle headroom.
  │    C8/C9 must land so Phase 6 docs lead with the JS API.
  │
  ├─── Phase 7 (strategy presets — independent of Phase 6)
  │
  └─── Phase 10 (onboarding)
       getting-started + glossary + Hello Eidos: start after Phase C.
       Must use framework-agnostic code path (C9 must be done first).
       Preset names in getting-started: depends on Phase 7.
```

- **Phase C ships first** — bundle headroom, misinformation fix, and
  framework-agnostic pivot. All three are prerequisites for Phase 6.
- **Phase 6 is the highest-priority feature after Phase C**. Brown-field
  projects with existing SWs cannot adopt Eidos without it.
- Phase 6 and Phase 7 are independent — can run in parallel once Phase C
  lands. Both require C4/C6 for bundle headroom.
- Phase 10 `getting-started.md` must use the framework-agnostic stores
  pattern (C9) — it should not teach `EidosProvider` as the only setup path.
- Do not start any new framework adapter work at any point. The adapter
  direction is closed. New framework support means a docs example, not code.

---

## Performance invariants (enforced on every PR)

These are not goals to hit once — they are constraints that must hold
continuously:

1. **Bundle ceiling**: `pnpm --filter @sweidos/eidos size` must pass. After
   Phase C4, lower the core limit from `7 KB` to `6 KB`.

2. **Zero overhead when unused**: importing only `action()` must not pull
   in resource-registry code. Importing only `resource()` must not pull in
   action-queue code. Verify with per-entry size-limit checks.

3. **SW fetch path adds no latency over raw fetch**: the O(1) URL lookup
   (exact match before pattern scan) must remain the fast path. No async
   work on the SW message thread before the fetch handler returns.

4. **`/* @__PURE__ */` on all module-level singletons**: any `new Map()`,
   `new Set()`, or `new WeakMap()` at module scope that has no side effects
   must carry the annotation so tree-shakers can eliminate it.

5. **No devtools strings in the production critical path**: `reasoning`,
   `behavior`, `equivalentCode` strings must not execute in a user's
   production bundle unless they explicitly import devtools.

---

## Release process (per phase)

1. Implement + tests (`packages/core/src/__tests__/`, playground update for
   user-visible changes).
2. Update `packages/core/README.md` **and** root `README.md` (root is the
   source; `build:core` copies it via `scripts/copy-sw.mjs`). Re-run
   `pnpm --filter @sweidos/eidos size:check-docs` if bundle size moves.
3. Changeset: `pnpm changeset`.
   - Phase C: `patch` (fixes, no API additions; C4 is technically breaking
     if `equivalentCode` is removed — classify as `patch`, no external
     users rely on it as a runtime value).
   - Phase 6: `minor` (new opt-in exports, non-breaking).
   - Phase 7 presets: `minor` (new `offline` preset values, non-breaking).
   - Phase 10: no changeset unless preset names ship with it.
4. `pnpm --filter @sweidos/eidos test` + `pnpm type-check` +
   `pnpm --filter @sweidos/eidos size` all green before merge.
