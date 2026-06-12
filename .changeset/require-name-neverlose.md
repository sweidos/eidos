---
'@sweidos/eidos': major
---

`ActionConfig.name` is now required (compile-time) when `reliability: 'neverLose'`. Queued items must survive a page reload and be matched back to the action on replay — `fn.name` is unreliable (minified, anonymous arrows), so a previously DEV-only console warning is now a type error.
