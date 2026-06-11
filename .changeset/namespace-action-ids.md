---
'@sweidos/eidos': minor
---

`action()` accepts an optional `namespace` config field, prefixing the registered action id (`namespace::name`). Without a namespace, two actions sharing a name (e.g. across micro-frontends) silently overwrote each other in the registry — DEV builds now also log an error when a duplicate action id is registered, namespaced or not.
