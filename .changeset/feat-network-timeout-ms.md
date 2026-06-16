---
'@sweidos/eidos': patch
---

Add `ResourceConfig.networkTimeoutMs` to replace hardcoded magic numbers

Two different hardcoded timeouts existed for the same conceptual knob:
`AbortSignal.timeout(3000)` in the SW's `networkFirst()` handler and
`AbortSignal.timeout(5000)` in the page-side SWR background revalidation.

`networkTimeoutMs` (default 3000) now controls both. Pass it to `resource()`
and it is threaded via `EIDOS_REGISTER_RESOURCE` to the SW.
