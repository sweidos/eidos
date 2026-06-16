# @sweidos/eidos

## 2.3.0

### Minor Changes

- e223036: Add `eidosDebug()` export and dev-mode console warnings for common SW setup failures.

  **`eidosDebug()`**: new framework-agnostic export that returns a plain-object snapshot of
  the full Eidos runtime state (`version`, `swStatus`, `isOnline`, `resourceCount`,
  `resources`, `queue`, `reliability`, `swRegistration`). Safe to `JSON.stringify`.
  Useful for bug reports and attaching to error-tracking breadcrumbs.

  **Dev-mode console warnings**: `registerServiceWorker()` now emits plain-English
  `console.warn` messages in development (`import.meta.env.DEV`) for three previously
  silent failure modes:

  - Non-secure context (HTTP/non-localhost): warns before registration so devs don't
    wonder why offline support is missing.
  - SW file not found (404-like error): actionable message directing devs to add the
    `eidos()` Vite plugin or copy the file manually.
  - Other registration failures: generic warning with the raw browser error.

  Both additions are additive — no breaking changes, no new required config.

- 4d287ef: Add `skipWaiting` / `onUpdateAvailable` / `triggerSwUpdate()` for controlled SW update UX

  Three related additions that give apps full control over when a new service
  worker takes over:

  - `EidosConfig.skipWaiting` (default `true`) — set to `false` to opt into a
    toast-then-reload pattern instead of the previous auto-activate behaviour.
  - `EidosConfig.onUpdateAvailable` — callback fired when a new SW has installed
    and is waiting; only fires when `skipWaiting: false`.
  - `triggerSwUpdate()` export — call from the toast confirm handler to activate
    the waiting SW immediately.

  The SW `install` handler no longer calls `self.skipWaiting()` unconditionally;
  instead the page sends `EIDOS_SKIP_WAITING` — immediately for `skipWaiting: true`
  (matching prior behaviour), or on demand for `skipWaiting: false`. The default
  is unchanged so existing apps are unaffected.

### Patch Changes

- f686ce1: Fix `maxAge` not enforced by the service worker and add `maxEntries` LRU eviction.

  **`maxAge` SW-side enforcement (bug fix)**: previously `maxAge` was only checked in the
  page-side `handle.fetch()` path. Any request that bypassed `handle.fetch()` — browser
  navigation, `<img>`/`<link>` tags, raw `fetch()` calls — received stale cached responses
  with no expiry check. The SW now stamps a `X-Eidos-Cached-At` header on every `cache.put()`
  and checks it on cache hits across all three strategies (`cache-first`, `stale-while-revalidate`,
  `network-first`). Expired entries are deleted and treated as cache misses.

  **`maxEntries` FIFO eviction (new `ResourceConfig` field)**: `maxEntries` was documented in
  the `equivalentCode` dev metadata as `ExpirationPlugin({ maxEntries: 60 })` but was never
  wired into the actual SW cache-put path. The SW now enforces it: after every `cache.put()`,
  if the cache bucket exceeds `maxEntries`, the oldest-inserted entries are evicted. Add
  `maxEntries` to any `resource()` or `resourcePattern()` config to cap cache size.

  Both fixes apply to all three caching strategies. No breaking changes — `maxAge` behaviour
  for entries cached before this patch is unchanged (no `X-Eidos-Cached-At` header = treated
  as fresh, expires naturally on next cache write).

## 2.2.0

### Minor Changes

- 3868615: Export `ConflictContext`, `ConflictResolution`, and `ConflictConfig` from the public API — required by the new `@sweidos/crdt-yjs` package (`createYjsMergeResolver()`), which builds a `conflict.resolve` for `'merge'`/`'custom'` strategies that automatically reconciles 409 conflicts via Yjs CRDT merge.
- e32d40c: Add opt-in reliability telemetry: `ReliabilityStats` (`queued`/`succeeded`/`failed`/`retried`/`conflicted`/`cancelled`) tracked on every `neverLose` queue/replay outcome, exposed via `eidosReliabilityStats` / `useEidosReliabilityStats()`, and reported periodically via `EidosConfig.onReliabilityReport` + `reliabilityReportInterval`. `<EidosDevtools />` gained a "Reliability" tab.
- e32d40c: Add `onQueueDrain()` — a framework-agnostic equivalent of `useEidosOnDrain` for Svelte/Vue/vanilla. Calls a callback once when the action queue drains from non-empty to empty, returns an unsubscribe function. `useEidosOnDrain` now delegates to it internally.

## 2.0.0

### Major Changes

- bdf90f0: `ActionFn`, `onOptimistic`, and `onRollback` now correctly type the trailing `ActionContext` argument that the runtime always passes. Every action function — `best-effort` and `neverLose` alike — now receives `ActionContext` as its last argument on every invocation (previously only `neverLose`/`cancellable` actions did). Update action signatures to accept it, e.g. `async (orderId: string, ctx: ActionContext) => {...}`.
- 2df19a2: Registering two actions with the same id (`config.namespace::config.name` or `fn.name`) now throws in all environments, not just a DEV-only `console.error`. The second registration was silently overwriting the first's queue replay handler — a real bug in any environment. Pass a unique `config.name` or `config.namespace` to disambiguate.
- d4098f2: Remove `'lastWriteWins'` from `ConflictConfig.strategy`. It was documented as "same as `clientWins` for now, pending a server-timestamp contract" — a placeholder that was never implemented. Use `'clientWins'` (identical current behavior) or `'custom'` with `resolve()` for timestamp-based resolution.
- ef76e90: Remove the deprecated `ActionConfig.onConflict` callback. Use `conflict: { strategy: ... }` (with `resolve` for `'merge'`/`'custom'`) instead — it has been the recommended API and previously took precedence whenever both were set.
- 4305a25: `ActionConfig.name` is now required (compile-time) when `reliability: 'neverLose'`. Queued items must survive a page reload and be matched back to the action on replay — `fn.name` is unreliable (minified, anonymous arrows), so a previously DEV-only console warning is now a type error.
- 3aaf64d: Split `resource()` into two functions. `resource(url, config)` now only accepts concrete URLs and returns a handle with `fetch`/`json`/`query`/`prefetch`/`invalidate`/`unregister`. For URL patterns (`/api/products/*`, `/api/users/:id`, `**`), use the new `resourcePattern(pattern, config)`, which returns a `PatternResourceHandle` with only `invalidate`/`unregister` — the SW intercepts matching requests automatically, so there's no single URL to fetch.

  Calling `resource()` with a pattern (or `resourcePattern()` with a concrete URL) now throws immediately at registration time instead of failing later when `fetch`/`json`/`query`/`prefetch` is called. `warmCache()` now only accepts `ResourceHandle[]` (pattern handles have no `prefetch` to warm).

  New exported types: `PatternResourceHandle`, `AnyResourceHandle`.

### Patch Changes

- 73f245c: Update README docs for conflict resolution, idempotency, and cancellable actions; raise core size-limit budget to 7 KB to match actual bundle size.
- 9095c02: Publish sourcemaps for minified dist output, so reviewers/security scanners can inspect the unminified source behind the published bundle.
- a44a026: Sync action-queue item status across tabs via BroadcastChannel — non-leader tabs now reflect live `replaying`/`succeeded`/`failed`/`pending`/`conflicted`/`cancelled` status during replay instead of waiting for their own store to re-hydrate.

## 1.2.0

### Minor Changes

- 00bdb2f: `action()` accepts `cancellable: true`, providing an `AbortSignal` via `ActionContext.signal` (forward to `fetch`). The returned handle gains `cancel(idempotencyKey)`, which aborts an in-flight call or removes a not-yet-replayed queued item — capture `idempotencyKey` from the `ActionContext` passed to `onOptimistic`.

  `onOptimistic` now receives a trailing `ActionContext` argument (additive — existing callbacks that ignore extra args are unaffected).

  `ReplayResult` gains a `cancelled` count for queued items removed via `cancel()` before replay completed.

- ea7bfe0: `action()` accepts a declarative `conflict` config, replacing `onConflict` (kept as a deprecated alias) for handling 4xx responses during queue replay:

  - `{ strategy: 'serverWins' }` — drop the queued item, keeping the server's state.
  - `{ strategy: 'clientWins' }` / `{ strategy: 'lastWriteWins' }` — keep retrying the queued write.
  - `{ strategy: 'merge', resolve }` / `{ strategy: 'custom', resolve }` — call `resolve(ctx)` with a `ConflictContext` (`error`, `args`, `attempt`, `idempotencyKey`) and return `'retry'`, `'skip'`, or `{ resolved: newArgs }` to rewrite the queued args before the next retry.

  If both `conflict` and the deprecated `onConflict` are set, `conflict` wins.

- 7f5fbff: Add a headless, framework-agnostic Web Push module at `@sweidos/eidos/push`, tree-shaken unless imported.

  - `subscribeToPush(config)` — call from a user gesture; requests permission, subscribes via the existing service worker, and resubscribes automatically if the configured VAPID key changes.
  - `registerPushHandlers({ onNotificationClick, onSubscriptionExpired })` — register once at app init (any tab) to route notification clicks and subscription rotations.
  - `isPushSupported()`, `getPushPermissionState()`, `getPushUnsupportedReason()`, `unsubscribeFromPush()`, `getCurrentPushSubscription()`.
  - Service worker gains `push`, `notificationclick`, and `pushsubscriptionchange` handlers; the VAPID key is persisted in IndexedDB so resubscription survives SW restarts.
  - New `eidos generate-vapid-keys` CLI (`npx @sweidos/eidos generate-vapid-keys`) generates a VAPID keypair, detects your framework's env-var prefix (Vite/Next/SvelteKit/Nuxt), and writes both keys to `.env.local`. Re-running requires `--force` plus confirmation, since regenerating invalidates all existing subscriptions.

  Sending push messages remains entirely up to your backend — Eidos only documents the JSON payload schema (`title`, `body`, `icon`, `badge`, `tag`, `data`).

- 5e86a71: `neverLose` actions now generate a stable `idempotencyKey` per logical invocation, reused across every retry/replay, and pass it to your action function as a trailing `ActionContext { idempotencyKey, attempt }` argument — forward it to your server (e.g. as an `Idempotency-Key` header) so a retry that reaches the server after a dropped response doesn't double-execute.

  `replayQueue()` now coordinates across tabs via the Web Locks API (falls back to the previous per-tab guard where unsupported), so multiple open tabs no longer each replay the same shared queue independently.

  `ActionQueueItem` gains `schemaVersion` and `idempotencyKey`. Items persisted by older versions are migrated automatically on `initEidos()`.

- 726e6ff: `action()` accepts an optional `namespace` config field, prefixing the registered action id (`namespace::name`). Without a namespace, two actions sharing a name (e.g. across micro-frontends) silently overwrote each other in the registry — DEV builds now also log an error when a duplicate action id is registered, namespaced or not.

### Patch Changes

- 88b0a12: Fix incorrectly low size-limit budget for the CJS bundle (was 8KB, actual minified single-file bundle needs ~18KB). No runtime change.
