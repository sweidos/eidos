---
'@sweidos/eidos': major
---

Split `resource()` into two functions. `resource(url, config)` now only accepts concrete URLs and returns a handle with `fetch`/`json`/`query`/`prefetch`/`invalidate`/`unregister`. For URL patterns (`/api/products/*`, `/api/users/:id`, `**`), use the new `resourcePattern(pattern, config)`, which returns a `PatternResourceHandle` with only `invalidate`/`unregister` — the SW intercepts matching requests automatically, so there's no single URL to fetch.

Calling `resource()` with a pattern (or `resourcePattern()` with a concrete URL) now throws immediately at registration time instead of failing later when `fetch`/`json`/`query`/`prefetch` is called. `warmCache()` now only accepts `ResourceHandle[]` (pattern handles have no `prefetch` to warm).

New exported types: `PatternResourceHandle`, `AnyResourceHandle`.
