# Changelog

All notable changes to `eidos` will be documented here.

This project follows [Semantic Versioning](https://semver.org/).

---

## [1.0.21] — 2026-06-09

### Added

- **Request deduplication** — when multiple callers invoke `handle.fetch()` concurrently for the same URL, only one network request is made. All callers receive an independent cloned `Response` so each can read the body independently. The in-flight map is cleared immediately after the request settles, so subsequent calls (after a batch completes) start fresh. Zero API change — transparent to all consumers.

---

## [1.0.20] — 2026-06-09

### Changed

- **`react` and `react-dom` peer dependencies are now optional** — Vue, Svelte, and vanilla-JS consumers no longer get peer-missing warnings. Install React only when using `EidosProvider` / `useEidos*` hooks.
- **ESM + CJS bundles are now minified (`esbuild`)** — raw bundle size reduced from 24.8 kB → 18.9 kB (ES); gzip from 6.4 kB → 5.8 kB. Sourcemaps preserved, so debugging is unaffected.
- **`eidosQueueStats` (framework-agnostic store)** — replaced three `.filter()` passes with a single `for…of` loop. Semantically identical output; faster on larger queues.

### Docs

- Known Limitations — added note on single-bundle React import for non-React consumers; documented `preserveModules` as the planned long-term fix.

---

## [1.0.19] — 2026-06-09

### Added

- **TanStack Query integration (`@sweidos/eidos/query`)** — first-class hooks for TanStack Query v5. `@tanstack/react-query` is an optional peer dependency.

  - **`useEidosQuery(handle, options?)`** — wraps `useQuery` with Eidos-smart defaults: `networkMode: 'always'` (queries run offline, Eidos owns the cache), `retry: false` (Eidos handles retries at the SW layer).

  - **`useEidosMutation(handle, options?)`** — wraps `useMutation` for single-argument action handles with `networkMode: 'always'`. Accepts an `invalidates: ResourceHandle[]` option that clears both Eidos Cache Storage and the corresponding TanStack Query entries on success. Return type is `TData | QueuedResult`; narrow with `'queued' in data` to detect offline-queued results.

  - **`withEidosQueryClient(client)`** — registers a `QueryClient` with Eidos so that `handle.invalidate()` also calls `queryClient.invalidateQueries({ queryKey: ['eidos', url] })`, bridging both caches automatically.

  ```ts
  // Setup (once)
  withEidosQueryClient(queryClient)

  // Components
  const { data } = useEidosQuery<Product[]>(products)
  const mutation = useEidosMutation(createOrder, { invalidates: [products] })
  ```

### Changed

- `setQueryInvalidator` exported from main package (used internally by `@sweidos/eidos/query`).
- Build script extended: `vite.query.config.ts` builds the query subpath in isolation (Node.js + browser neutral, `@sweidos/eidos` and React externalized).

---

## [1.0.18] — 2026-06-09

### Added

- **Vite plugin (`@sweidos/eidos/vite`)** — first-class Vite integration. Automatically copies `eidos-sw.js` from the installed package into `public/` on every build and dev-server start, so the SW always stays in sync with the installed package version:
  ```ts
  // vite.config.ts
  import { eidos } from '@sweidos/eidos/vite'
  import { defineConfig } from 'vite'

  export default defineConfig({
    plugins: [eidos()],
  })
  ```
  Accepts optional `swDest` option (default `'public/eidos-sw.js'`). Runs on `buildStart` (prod) and `configureServer` (dev). `vite` is an optional peer dependency.

### Changed

- Package exports — added `"./vite"` subpath with ESM + CJS + types outputs.
- Build script — vite plugin now built via a separate `vite.plugin.config.ts` to keep Node.js targets isolated from the React browser bundle.

---

## [1.0.17] — 2026-06-09

### Added

- **Background Sync API integration** — `neverLose` actions now register the `'eidos-queue-replay'` sync tag with the browser after being queued. When connectivity returns the browser fires a `sync` event on the SW, which notifies all open clients via `EIDOS_BACKGROUND_SYNC` — triggering `replayQueue()` even if the user briefly navigated away and back. Falls back to the existing `online`-event replay path on browsers that don't support Background Sync (Firefox, older Safari).

- **`isBgSyncSupported()`** — new exported helper that returns `true` when the active SW registration exposes the `sync` property:
  ```ts
  import { isBgSyncSupported } from '@sweidos/eidos'
  if (isBgSyncSupported()) {
    // browser will auto-replay queue even after brief navigation away
  }
  ```

### Changed

- **SW message protocol** — added `EIDOS_BACKGROUND_SYNC` (SW → app) message. The SW fires it on `sync` events with tag `'eidos-queue-replay'`; the runtime calls `replayQueue()` with a 200 ms debounce on receipt.

---

## [1.0.16] — 2026-06-09

### Changed

- README and Learn docs updated — added cross-origin usage examples, URL pattern syntax table, Vue/Svelte/vanilla stores section; roadmap updated to reflect shipped features.

---

## [1.0.15] — 2026-06-09

### Added

- **URL pattern matching** — `resource()` now accepts wildcard and named-parameter patterns. The pattern is compiled to a regex and sent to the SW, which tests the pathname (or full URL for cross-origin) on every intercepted fetch:
  ```ts
  resource('/api/products/*',   { offline: true })  // single segment
  resource('/api/products/**',  { offline: true })  // multi-segment
  resource('/api/users/:id',    { offline: true })  // named segment
  ```
  `fetch()`/`json()`/`query()`/`prefetch()` throw on pattern handles (no single URL to fetch); `invalidate()` and `unregister()` still work.

- **Cross-origin resource support** — pass a full URL (with origin) to register a cross-origin resource. The SW fast-path checks the full request URL before falling back to pathname matching:
  ```ts
  resource('https://api.example.com/products', { offline: true })
  resource('https://cdn.example.com/assets/*', { offline: true })
  ```

---

## [1.0.14] — 2026-06-09

### Added

- **Framework-agnostic reactive stores** — `stores.ts` exports six `EidosReadable<T>` stores that implement the Svelte store contract (`subscribe(run): unsubscribe`). Zero extra dependencies; usable in Svelte (native `$` prefix), Vue composables, or plain JS:
  ```ts
  import { eidosQueue, eidosStatus, eidosQueueStats, eidosResource, eidosAction, eidosStore } from '@sweidos/eidos'
  ```
  `EidosReadable` type is exported from the package index.

---

## [1.0.13] — 2026-06-09

### Changed

- **`store.ts` decoupled from React** — the store is now a plain JS event emitter with zero React imports. `useEidosStore` is exported as `{ getState, subscribe, setState }` instead of a callable hook. The React 18 `useSyncExternalStore` subscription lives in `react/hooks.ts`, making the store usable outside React contexts.

---

## [1.0.12] — 2026-06-09

### Added

- **`useEidosOnDrain(callback)`** — fires `callback` once each time the action queue transitions from non-empty → 0. Always calls the latest callback version (stable ref pattern — no stale closures). Use for "all synced!" toasts:
  ```ts
  import { useEidosOnDrain } from '@sweidos/eidos'
  useEidosOnDrain(() => toast.success('All offline actions synced!'))
  ```

### Fixed (playground accessibility)

- **`role="alert"` on error/offline states** — products fetch errors (`offline · no cached response yet`, `fetch failed`) and order results now have `role="alert"` so screen readers announce them immediately. Previously all error feedback was visual-only with no AT announcement.

---

## [1.0.11] — 2026-06-08

### Added

- **`useEidosQueueStats()`** — count-only queue hook returning `{ pending, failed, replaying, total }`. Four independent primitive selectors, each re-rendering only when its count changes. Cheaper than `useEidosQueue()` for badge/status-bar components that only need numbers:
  ```ts
  import { useEidosQueueStats } from '@sweidos/eidos'

  const { pending, failed, replaying, total } = useEidosQueueStats()
  ```

### Fixed (playground)

- **Skip link** — `<a href="#main-content">` before the header lets keyboard users jump past navigation in one keystroke. Visually hidden until focused (Tailwind `sr-only focus:not-sr-only`).
- **Smooth scroll** — `html { scroll-behavior: smooth }` added to `index.css`, so anchor links in the API docs (Learn page) scroll smoothly. Overridden to `auto` for `prefers-reduced-motion: reduce` (already set).
- **Failed badge** — Actions tab now shows a red `failed` count badge alongside the existing amber `pending` badge, powered by `useEidosQueueStats()`.

---

## [1.0.10] — 2026-06-08

### Added

- **`useEidosAction(id)`** — new hook that subscribes to a single queue item by ID. Only re-renders when that specific item changes, making it more efficient than `useEidosQueue().find(id)` (which re-renders on any queue mutation):
  ```ts
  import { useEidosAction } from '@sweidos/eidos'

  const result = await createOrder(payload) // { queued: true, id: 'abc123', ... }
  const item = useEidosAction(result.id)
  // item?.status → 'pending' | 'replaying' | 'succeeded' | 'failed'
  // undefined once removed from the queue
  ```
  Complements `useEidosResource(url)` — same pattern for actions.

---

## [1.0.9] — 2026-06-08

### Changed

- **`replayQueue()` now returns `ReplayResult`** — the function previously returned `Promise<void>`. It now returns a summary of what happened:
  ```ts
  const result = await replayQueue()
  // { attempted: 3, succeeded: 2, failed: 0, retrying: 1, skipped: 0 }
  ```
  Backwards-compatible — callers that ignore the return value are unaffected.

### Added

- **`ReplayResult` type exported** — import it for typed result handling:
  ```ts
  import type { ReplayResult } from '@sweidos/eidos'
  ```

### Fixed (playground accessibility)

- **`aria-expanded` on accordion buttons** — `ResourceRow` (Resources page) and `Collapse` (API docs) now expose correct expanded/collapsed state to assistive technologies.
- **`aria-label` on section anchor links** — `#` permalink anchors in the API docs now have accessible labels.
- **`role="region"` on collapsible panels** — expanded Collapse panels are semantically marked as regions.

---

## [1.0.8] — 2026-06-08

### Added

- **`clearQueue()`** — new exported function that removes all items from the action queue (both IndexedDB and the in-memory store). Useful for "clear all failed" UI controls and test teardown.
  ```ts
  import { clearQueue } from '@sweidos/eidos'
  await clearQueue()
  ```

### Fixed (playground)

- **`prefers-reduced-motion` respected** — all animations (`fade-in`, `slide-right`, `pulse`, `blink`) are disabled via a global `@media (prefers-reduced-motion: reduce)` rule in `index.css`.
- **Emoji icons replaced** — `ResultBadge` in the demo used emoji/unicode characters (`⚡`, `↑`, `⚠`, `✕`) as visual indicators. Replaced with Lucide SVG icons (`Zap`, `ArrowUp`, `AlertTriangle`, `X`) per accessibility best practices.

---

## [1.0.7] — 2026-06-08

### Added

- **`VERSION` export** — `@sweidos/eidos` now exports a `VERSION` constant so host apps can display the package version without importing `package.json`.
- **`idbGetPendingItems()`** — internal IDB helper that uses the `status` index to fetch only `pending`/`failed` items. `replayQueue` now calls this instead of `idbGetQueue()` + JS-side filter, avoiding a full table scan when many items have already succeeded.

### Changed

- **Performance** — `replayQueue` reads only actionable items from IDB via index scan, not the full queue.
- README: added **Performance** section documenting bundle size, re-render model, parallel replay, IDB index scan, network timeout, pre-activation buffer, and concurrency safety.

---

## [1.0.6] — 2026-06-08

### Changed

- **Removed `zustand` dependency** — the store is now implemented with React's native `useSyncExternalStore` (React 18+). No external state library needed. Zero new dependencies introduced.
- **Bundle size −47%** — `dist/eidos.es.js` drops from 35 kB → 18.6 kB (gzip: 7.9 kB → 5.0 kB). The package previously bundled all of zustand; the replacement store is ~40 lines.
- **`useEidosStatus` re-render model improved** — now uses three independent primitive selectors instead of a single combined selector with `useShallow`. Each field (`isOnline`, `swStatus`, `swError`) only triggers a re-render in its own subscription.

### Migration

No API changes. If your app imports `zustand` only because Eidos pulled it in as a transitive dependency, you can now remove it from your own `package.json`.

---

## [1.0.5] — 2026-06-08

### Fixed

- **`action()` anonymous-function `actionId` collision** — `??` was used to derive `actionId`, meaning an empty-string `fn.name` (anonymous arrow function) passed through as `''`, causing all unnamed actions to share the same registry key and overwrite each other. Switched to `||` so empty string correctly falls through to `uid()`.
- **Dev warning for unstable `neverLose` action names** — if no `config.name` is provided and `fn.name` is empty, a console warning is emitted in development. Without a stable name, queued items cannot be replayed after a page reload.

---

## [1.0.4] — 2026-06-08

### Fixed

- **`replayQueue` concurrency lock** — concurrent calls (e.g. two rapid `online` events or a manual call overlapping an auto-replay) previously both read the same pending items before either marked them `replaying`, risking double-execution of `neverLose` actions. A `_replaying` flag now gates entry so only one replay pass runs at a time; subsequent calls are no-ops until the pass completes.

---

## [1.0.3] — 2026-06-08

### Fixed

- **Pre-activation message buffer** — `sendToWorker` now queues any message sent before the SW is active and flushes the buffer on activation. Previously only resource registrations were re-sent (via `flushResourceRegistrations`); calls to `invalidate()`, `setOfflineSimulation()`, or any other SW message at module scope were silently dropped. The old `flushResourceRegistrations` helper is removed — buffering covers it generically.

---

## [1.0.2] — 2026-06-08

### Fixed

- **`useEidosStatus` spurious re-renders** — selector now uses `useShallow`; components no longer re-render when unrelated store state changes (cache hits, resource updates, queue mutations)
- **Runtime subscriber leak** — `useEidosStore.subscribe()` return value is now stored and called by `_resetEidos()`, preventing listener accumulation on HMR and in test suites
- **`network-first` main-thread bypass** — `resource.fetch()` was doing cache-first logic for all strategies; `network-first` resources now go directly to the network and only fall back to cache on failure, matching the declared intent
- **`NetworkFirst` SW strategy hangs on slow networks** — fetch is now aborted after 3 seconds (`AbortSignal.timeout(3000)`), matching the `networkTimeoutSeconds: 3` advertised in the strategy's `equivalentCode`

---

## [1.0.1] — 2026-06-08

### Changed

- **`replayQueue` runs in parallel** — pending actions are now replayed concurrently via `Promise.allSettled` instead of sequentially; a queue of N items no longer takes N × round-trip time to drain

### Fixed

- **SW activation timeout** — `waitForActivation` now resolves after 10 seconds regardless, preventing a silent hang when another browser tab holds an older SW version open
- **`resource.fetch()` double cache open** — `caches.open()` was called twice on network failure (once in `try`, once in `catch`); cache handle is now hoisted and reused
- **`resource.invalidate()` full-URL mismatch** — cache keys were matched by pathname only; now also matches exact URL (`r.url === url`), fixing invalidation when the resource was registered with an absolute URL
- **`idbUpdateQueueItem` silent no-op** — missing item in IDB now logs a dev-mode warning instead of silently skipping the `put`, surfacing store/IDB divergence early
- **Queue item IDs** — `uid()` switched from `Date.now() + Math.random()` to `crypto.randomUUID()` for guaranteed uniqueness

---

## [1.0.0] — 2026-06-05

First stable release.

### Added

**Core package**
- `ResourceConfig.maxAge` — TTL in milliseconds; expired cache entries trigger a network re-fetch
- `ResourceHandle.unregister()` — remove a resource from the SW registry and Zustand store
- `ActionQueueItem.nextRetryAt` — epoch timestamp set by exponential backoff; items not yet due are skipped on each replay pass
- `sideEffects: false` in `package.json` — enables tree-shaking in bundlers

### Changed

- **Exponential backoff on queue replay** — failed `neverLose` actions are retried at `min(2s × 2^retryCount, 5min)` ±20% jitter instead of immediately
- **`cacheName` override now respected** — `ResourceConfig.cacheName` is correctly propagated to the generated strategy and SW registration (was silently ignored in 0.x)
- **`EIDOS_CLEAR_CACHE` uses per-resource bucket** — SW now looks up the registered `cacheName` per URL instead of always clearing `eidos-resources-v1`

### Fixed

- SWR background revalidation now wrapped in `event.waitUntil()` — prevents the SW from being terminated before the cache write completes
- Dev-mode warning when `resource()` is called twice for the same URL with different config
- Dev-mode warning when `neverLose` action args are not JSON-serializable (args would be silently lost after a page reload)

### Infrastructure

- GitHub Actions workflow (`deploy.yml`) — builds and deploys playground to Vercel, publishes `@sweidos/eidos` to npm when version bumps, creates GitHub Release
- Root `vercel.json` — fixes Vercel cloud builds for the monorepo (`rootDirectory: null` + `cd ../..` bug)
- URL routing in playground — `react-router-dom` replaces `useState`-based page switching; browser back/forward and deep links now work

---

## [0.2.0] — 2026-06-04

### Added

- GitHub Actions CI/CD pipeline — first automated deploy and npm publish

### Fixed

- Playground navigation now uses React Router — deep links work, browser history works

---

## [0.1.0] — 2026-06-03

Initial release. Smallest possible version that demonstrates the vision end-to-end.

### Added

**Core package (`@sweidos/eidos`)** — npm `@sweidos/eidos@0.1.0`
- `resource(url, config)` — register an offline-capable resource with auto-generated caching strategy
- `action(fn, config)` — wrap any async function with `best-effort` or `neverLose` reliability
- `replayQueue()` — manually replay the IndexedDB-persisted action queue
- `EidosProvider` — React root component that registers the SW and initialises the runtime
- `useEidosStatus()` — online + SW status hook
- `useEidosResource(url)` — live cache state for a single resource
- `useEidosQueue()` — reactive action queue
- `setOfflineSimulation(enabled)` — toggle offline simulation from devtools or tests
- Full TypeScript types with JSDoc comments

**Service Worker (`eidos-sw.js`)**
- `CacheFirst`, `StaleWhileRevalidate`, `NetworkFirst` strategies
- Dynamic registration via `EIDOS_REGISTER_RESOURCE` postMessage
- Offline simulation mode (`EIDOS_SIMULATE_OFFLINE`)
- Cache versioning and stale-cache cleanup on activation
- Bidirectional `postMessage` channel (cache hit/miss/update events)

**Strategy derivation**
- `offline: true` → `StaleWhileRevalidate` (automatic, with reasoning)
- `strategy: 'cache-first'` → `CacheFirst`
- `strategy: 'network-first'` → `NetworkFirst`
- Each strategy includes: name, reasoning, behavior steps, Workbox equivalent

**IndexedDB action queue**
- Typed CRUD wrapper for the `eidos/action-queue` IDB store
- Survives page reload — queue is hydrated from IDB on app start
- Per-item status: `pending → replaying → succeeded/failed`
- Configurable `maxRetries` with retry count tracking

**Playground (`apps/playground`)**
- Full interactive dashboard (Vite + React + TypeScript + Tailwind)
- Overview page: live status, Products demo, Orders demo
- Resources page: per-resource cache inspector with expandable strategy detail
- Action Queue page: live queue with replay controls
- Intent Inspector page: step-by-step intent → strategy → SW rule trace
- How It Works page: architecture diagrams and lifecycle docs
- Offline simulation toggle in header
- Mock API (`/api/products`, `/api/orders`) served via Vite plugin

**Monorepo**
- pnpm workspace with `packages/core`, `packages/worker`, `apps/playground`
- Shared TypeScript config (strict mode)
- `pnpm dev` / `pnpm build` / `pnpm type-check` scripts

### Known Limitations

See [README.md#known-limitations](./README.md#known-limitations).
