---
'@sweidos/eidos': patch
---

Fix `maxAge` not enforced by the service worker and add `maxEntries` LRU eviction.

**`maxAge` SW-side enforcement (bug fix)**: previously `maxAge` was only checked in the
page-side `handle.fetch()` path. Any request that bypassed `handle.fetch()` — browser
navigation, `<img>`/`<link>` tags, raw `fetch()` calls — received stale cached responses
with no expiry check. The SW now stamps a `X-Eidos-Cached-At` header on every `cache.put()`
and checks it on cache hits across all three strategies (`cache-first`, `stale-while-revalidate`,
`network-first`). Expired entries are deleted and treated as cache misses.

**`maxEntries` FIFO eviction (new `ResourceConfig` field)**: `maxEntries` was documented in
the `equivalentCode` dev metadata as `ExpirationPlugin({ maxEntries: 60 })` but was never
wired into the actual SW cache-put path. The SW now enforces it: after every `cache.put()`,
if the cache bucket exceeds `maxEntries`, the oldest-inserted entries are evicted. Add
`maxEntries` to any `resource()` or `resourcePattern()` config to cap cache size.

Both fixes apply to all three caching strategies. No breaking changes — `maxAge` behaviour
for entries cached before this patch is unchanged (no `X-Eidos-Cached-At` header = treated
as fresh, expires naturally on next cache write).
