# Changelog

All notable changes to `eidos` will be documented here.

This project follows [Semantic Versioning](https://semver.org/).

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
