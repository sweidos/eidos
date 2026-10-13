# Product Strategy

## Target developer

Frontend engineers building forms / mutations that must not silently disappear when connectivity drops mid-submit (inventory, orders, field ops, expensive data entry).

## Primary problem

Preserve **user write intent** across offline periods, reloads, and interrupted replays — with clear server-side idempotency requirements — without hand-rolling IndexedDB + SW + retry + multi-tab locks.

## Positioning (narrow)

**Durable client mutations for unreliable networks** — `action({ reliability: 'neverLose' })` is the hero. `resource()` caching is supporting, not the differentiator vs Workbox/TanStack Query.

## Alternatives

| Alternative      | When enough                           | When Eidos wins                                        |
| ---------------- | ------------------------------------- | ------------------------------------------------------ |
| TanStack Query   | Online cache + retry UI               | Need persistent cross-reload mutation queue + keys     |
| Workbox          | SW caching / background sync plumbing | Want typed app-level actions + React DX, not SW config |
| Custom IDB queue | Full control / unique constraints     | Want tested multi-tab locks, leases, conflict presets  |

## Non-goals

- Exactly-once business execution without server dedup
- Replacing TanStack Query as a general data library
- CRDT sync / multiplayer (separate packages exist; not the core pitch)

## Acceptance criteria (this revamp)

1. Interrupted replay cannot strand work forever **or** steal live multi-tab ownership.
2. neverLose online path matches documented persist-before-execute durability.
3. Primary docs answer: offline, reload, crash, uncertain response, server duties.
4. Positioning and guarantee language consistent across README / site / npm / guarantees.md.
5. Tests cover lease recovery + persist-before-execute; suite green.
