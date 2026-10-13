---
name: eidos-product-engineering
description: >-
  Autonomous product engineering for sweidos/eidos: research, strategy,
  architecture, implementation, tests, docs, review, PR, merge, and release.
  Use when revamping Eidos, shipping reliability/DX improvements, or running
  a full SDLC on the @sweidos/eidos library. Complexity inside, simplicity outside.
environments: [cloud]
---

# Eidos Product Engineering

Autonomous SDLC for [sweidos/eidos](https://github.com/sweidos/eidos) (`@sweidos/eidos`).

**Core principle:** Complexity belongs in the implementation. Simplicity belongs in the developer experience. Correctness, reliability, and honest guarantees are non-negotiable.

## Modes

### Normal invocation
Run the complete workflow for the task in scope. Use phases as needed; skip irrelevant ones. Persist state. Finish with evidence.

### Full-mission invocation
When the user asks for a complete Eidos revamp / master mission / full SDLC: **own the entire lifecycle in one continuous run** — inspection → research → strategy → architecture → implementation → tests → docs → review → PR → merge → release (where authorized). Do **not** stop for phase confirmation. Do **not** ask the user to type continue / implement / PR / release.

## Before anything else

1. Confirm the checkout is actually Eidos (`packages/core` → `@sweidos/eidos`). Prefer `/tmp/eidos` or a dedicated clone; never assume `/workspace` is Eidos.
2. Inspect git status, branch, uncommitted work. Preserve user changes. Isolate mission work on `cursor/<topic>-<suffix>`.
3. Verify auth: `gh api user`, `gh api repos/sweidos/eidos --jq .permissions`.
4. Read `research/eidos-revamp/EXECUTION.md` if present — **resume** rather than restart.
5. Record baseline commit and existing test results before changing code.

## Persistent state (required)

Maintain under the Eidos repo:

| File | Purpose |
| --- | --- |
| `research/eidos-revamp/EXECUTION.md` | Ledger: objective, branch, decisions, tasks, next action |
| `research/eidos-revamp/PRODUCT_STRATEGY.md` | Target user, problem, differentiation, criteria |
| `research/eidos-revamp/ARCHITECTURE.md` | Decisions, boundaries, trade-offs |
| `research/eidos-revamp/VALIDATION.md` | Commands + actual outcomes |
| `research/eidos-revamp/RELEASE.md` | Merge/release evidence |

Update the ledger at phase boundaries and before any interruption. Exact next action must always be recoverable.

## Orchestration

Act as one coherent product/engineering org (PM, Staff Eng, EM, SDE, QA, Security, DX, Release). Roles produce **working software**, not theater.

- Parallelize independent research/review when safe.
- Serialize shared architecture and critical queue/runtime modules.
- Use subagents only for genuinely independent work; never pretend a subagent ran.
- Orchestrator resolves disagreements with evidence, simplicity, correctness, user value.

Detailed procedures:

| Topic | Reference |
| --- | --- |
| Product principles | [references/principles.md](references/principles.md) |
| SDLC phases | [references/sdlc.md](references/sdlc.md) |
| Research method | [references/research.md](references/research.md) |
| API simplicity review | [references/api-review.md](references/api-review.md) |
| Test strategy | [references/testing.md](references/testing.md) |
| Security & reliability | [references/security.md](references/security.md) |
| PR / merge / release | [references/release.md](references/release.md) |
| Recovery & handoff | [references/recovery.md](references/recovery.md) |

## Quality gates (all required for merge)

1. **Product** — clear primary user/problem; honest guarantees; no unjustified complexity.
2. **API** — short primary example; lifecycle constraints discoverable; migration assessed.
3. **Reliability** — crash/interrupted-replay and multi-tab covered; no known critical data-loss/dupe defects.
4. **Engineering** — tests, typecheck, build, package checks, CI; no critical regressions.
5. **Docs** — quick start matches exports; guarantees match implementation.
6. **Release** — semver + changelog accurate; publish only via authorized process.

Do not weaken or delete tests to go green. Do not fabricate evidence.

## Autonomy

- Decide routine naming, refactoring, test design, docs organization independently.
- Continue independent safe work when one action is blocked (missing credential, human review, protected branch).
- Never: force-push shared history, bypass security controls, invent customers/benchmarks, claim merge/publish without verification, or expand scope for theater.

## Definition of done

Report separately: skill created/invoked · local implementation · PR opened · PR merged · package published · remaining blockers.

Mission complete only when applicable gates pass and the ledger accurately reflects outcome.
