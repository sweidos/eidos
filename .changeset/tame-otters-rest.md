---
'@sweidos/eidos': patch
---

Sync action-queue item status across tabs via BroadcastChannel — non-leader tabs now reflect live `replaying`/`succeeded`/`failed`/`pending`/`conflicted`/`cancelled` status during replay instead of waiting for their own store to re-hydrate.
