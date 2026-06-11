---
'@sweidos/eidos': minor
---

Add a headless, framework-agnostic Web Push module at `@sweidos/eidos/push`, tree-shaken unless imported.

- `subscribeToPush(config)` — call from a user gesture; requests permission, subscribes via the existing service worker, and resubscribes automatically if the configured VAPID key changes.
- `registerPushHandlers({ onNotificationClick, onSubscriptionExpired })` — register once at app init (any tab) to route notification clicks and subscription rotations.
- `isPushSupported()`, `getPushPermissionState()`, `getPushUnsupportedReason()`, `unsubscribeFromPush()`, `getCurrentPushSubscription()`.
- Service worker gains `push`, `notificationclick`, and `pushsubscriptionchange` handlers; the VAPID key is persisted in IndexedDB so resubscription survives SW restarts.
- New `eidos generate-vapid-keys` CLI (`npx @sweidos/eidos generate-vapid-keys`) generates a VAPID keypair, detects your framework's env-var prefix (Vite/Next/SvelteKit/Nuxt), and writes both keys to `.env.local`. Re-running requires `--force` plus confirmation, since regenerating invalidates all existing subscriptions.

Sending push messages remains entirely up to your backend — Eidos only documents the JSON payload schema (`title`, `body`, `icon`, `badge`, `tag`, `data`).
