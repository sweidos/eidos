---
'@sweidos/eidos': minor
---

Add `eidosDebug()` export and dev-mode console warnings for common SW setup failures.

**`eidosDebug()`**: new framework-agnostic export that returns a plain-object snapshot of
the full Eidos runtime state (`version`, `swStatus`, `isOnline`, `resourceCount`,
`resources`, `queue`, `reliability`, `swRegistration`). Safe to `JSON.stringify`.
Useful for bug reports and attaching to error-tracking breadcrumbs.

**Dev-mode console warnings**: `registerServiceWorker()` now emits plain-English
`console.warn` messages in development (`import.meta.env.DEV`) for three previously
silent failure modes:

- Non-secure context (HTTP/non-localhost): warns before registration so devs don't
  wonder why offline support is missing.
- SW file not found (404-like error): actionable message directing devs to add the
  `eidos()` Vite plugin or copy the file manually.
- Other registration failures: generic warning with the raw browser error.

Both additions are additive — no breaking changes, no new required config.
