---
'@sweidos/eidos': minor
---

Add `onQueueDrain()` — a framework-agnostic equivalent of `useEidosOnDrain` for Svelte/Vue/vanilla. Calls a callback once when the action queue drains from non-empty to empty, returns an unsubscribe function. `useEidosOnDrain` now delegates to it internally.
