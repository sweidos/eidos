---
'@sweidos/eidos': major
---

Registering two actions with the same id (`config.namespace::config.name` or `fn.name`) now throws in all environments, not just a DEV-only `console.error`. The second registration was silently overwriting the first's queue replay handler — a real bug in any environment. Pass a unique `config.name` or `config.namespace` to disambiguate.
