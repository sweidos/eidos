---
'@sweidos/eidos': minor
---

Strengthen neverLose durability and multi-tab crash recovery:

- Persist queue items before execute on the online path (matches documented at-least-once contract)
- Replay leases (`replayOwnerId` / `replayLeaseUntil`) so hydrate recovery does not steal live owners
- Expired-lease replaying items are eligible for getPending / replay
- Runtime error when neverLose is missing `config.name`
- Docs/positioning: durable client mutations; honest lease + server-dedup guarantees
