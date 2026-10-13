# Product principles

1. **Complexity inside, simplicity outside** — Developers express intent; Eidos owns persistence, replay, recovery, SW lifecycle, concurrency.
2. **One obvious path** — Primary use case from one short example. No competing APIs without clear reason.
3. **Safe defaults, honest guarantees** — Never claim browser persistence = exactly-once business execution. Distinguish intent persistence, delivery, server dedup, outcome confirmation, uncertain outcomes.
4. **Progressive disclosure** — Beginners see minimal API; advanced users customize without fighting the abstraction.
5. **Correct by construction** — Types and API prevent invalid use; otherwise fail early with a clear correction. No silent post-reload loss.
6. **Abstractions only if earned** — Improves comprehension, correctness, reliability, composition, maintainability, or integration. No fashion rewrites.
7. **Simplicity as constraint** — Prefer existing primitives, internalize complexity, minimize new concepts, justify maintenance cost.

## Abstraction checklist

For every feature: Can an existing primitive solve it? Can complexity stay internal? New concept required? Default eliminate config? Easier than underlying mechanism? Predictable after failure/reload? Testable/debuggable? Worth maintenance?
