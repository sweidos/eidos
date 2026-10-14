# Product Strategy — DX + Docs Revamp

## Target developer

Frontend engineer shipping forms/mutations (orders, field notes, inventory) who has **never** configured Workbox or IndexedDB — and will abandon the library if the first page looks like a dashboard of jargon.

## Primary problem (this mission)

Eidos already works. The **learning surface does not**:

- Landing leads with an 8-card feature grid and SW/idempotency jargon before the user has tried one Save.
- Docs Quick Start opens with marketing fluff (“Simple enough to scan”) instead of teaching.
- README is ~744 lines of tables (frameworks, every option) before confidence.
- Nav mixes playground tools (resources/actions/inspector) with docs without a single “start here” path.

## Positioning (unchanged, clearer language)

**Never lose a write.** When the user hits Save, Eidos keeps that click until the server accepts it (or you decide what to do with a failure). Reads can work offline too.

Honest guarantee: **at-least-once delivery** with stable idempotency keys — the server must dedupe. Not magical exactly-once.

## Core journey (must fit a 5-year-old story)

1. **Install** the box.
2. **Wrap** the app once.
3. **Save** with `action({ reliability: 'neverLose' })`.
4. **Try offline** in the playground — click Save, toggle airplane mode, come back — still there.
5. **Tell the server** the same ticket number (idempotency key) so retries are safe.

Two words forever: **Read** (`resource`) and **Save** (`action`).

## Non-goals

- Breaking public API / major semver for rename theater
- Replacing TanStack Query as general data layer
- Exactly-once without server dedup
- Expanding feature surface for marketing

## Acceptance criteria

1. Landing first viewport: brand + one headline + one sentence + one primary CTA (+ optional secondary). No feature card grid in hero.
2. Docs “Start here” teaches install → wrap → first Save in plain language; guarantees page answers offline/reload/crash/uncertain/server duties.
3. README above-the-fold ≤ ~120 lines of real teaching; deep tables linked or collapsed below.
4. Header GitHub points at `sweidos/eidos`; nav path is obvious: Try it / Docs.
5. Playground builds; core untouched or still under 7 kB if touched.
