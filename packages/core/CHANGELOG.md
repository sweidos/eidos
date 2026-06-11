# @sweidos/eidos

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
