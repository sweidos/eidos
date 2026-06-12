---
'@sweidos/eidos': major
---

Remove the deprecated `ActionConfig.onConflict` callback. Use `conflict: { strategy: ... }` (with `resolve` for `'merge'`/`'custom'`) instead — it has been the recommended API and previously took precedence whenever both were set.
