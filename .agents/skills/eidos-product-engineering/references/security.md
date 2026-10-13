# Security and reliability review

## Focus areas
- Dependency / supply-chain risk on touched packages
- Sensitive payloads in IndexedDB (what is persisted; retention)
- Cross-tab / BroadcastChannel trust boundaries
- Idempotency key collision / predictability
- Unsafe defaults that lose or duplicate work
- Input validation on hydrate/migrate paths
- Concurrent replay ownership correctness

## Reliability invariants
- No silent drop of neverLose work
- No presentation of client queue as exactly-once business execution
- Uncertain network outcomes must not discard intent
- Permanent failures remain inspectable

Escalate only critical/high findings that need human approval; fix the rest.
