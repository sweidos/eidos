---
'@sweidos/eidos': minor
---

Add `skipWaiting` / `onUpdateAvailable` / `triggerSwUpdate()` for controlled SW update UX

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
