---
'@sweidos/eidos': minor
---

Surface orphaned queue items instead of silently skipping them

A queued `neverLose` action whose `actionId` had no registered function at
replay time was silently marked `skipped` and left `'pending'` in the queue
forever — never draining, never surfaced anywhere. For a "never lose a write"
queue this is the worst failure mode: silent write loss. It happens when
`action()` is declared inside a component/effect (so it never re-registers
after a reload) instead of at module scope, or when an action is renamed or
removed while items referencing its old id are still queued.

These skips are now visible:

- New `orphaned` counter on `ReliabilityStats` — reported via
  `eidosReliabilityStats`, `useEidosReliabilityStats()`, and
  `EidosConfig.onReliabilityReport`.
- A one-time (per `actionId`) dev-mode `console.warn` naming the action and
  its likely cause. Stripped from production builds (`import.meta.env.DEV`).
- `<EidosDevtools />` "Reliability" tab shows an "Orphaned" row and a callout
  when the count is above zero.

The items themselves are unchanged — still skipped, still left queued (no data
is dropped); they are now just observable.
