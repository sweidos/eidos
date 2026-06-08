# Changelog

All notable changes to `eidos` will be documented here.

This project follows [Semantic Versioning](https://semver.org/).

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
