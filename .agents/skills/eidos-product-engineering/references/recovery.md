# Recovery and handoff

## On interruption
1. Write exact next action into `EXECUTION.md` (file, command, decision pending).
2. Commit/push in-progress work if safe and coherent.
3. Do not leave the working tree in a half-applied patch without ledger notes.

## On re-invocation
1. Read `EXECUTION.md`.
2. If status is `in_progress`, resume — do not start a conflicting parallel revamp branch unless the prior branch is abandoned and recorded.
3. Re-run only failed or invalidated verification steps.
4. Continue until terminal conditions, hard blocker, or environment limits.

## Terminal conditions
- Quality gates pass and PR merged (and release published if authorized), **or**
- Hard blocker recorded with evidence and remaining work listed, **or**
- Environment execution limits reached with durable handoff state.
