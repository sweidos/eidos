---
name: eidos-product-engineering
description: >-
  Autonomous product engineering for sweidos/eidos: research, strategy,
  architecture, implementation, tests, docs, review, PR, merge, and release.
  Use when revamping Eidos, shipping reliability/DX improvements, running a
  full SDLC on @sweidos/eidos, or bare /eidos-product-engineering re-invoke.
  Complexity inside, simplicity outside.
version: 1.1.0
environments: [cloud]
---

# Eidos Product Engineering

Autonomous SDLC for [sweidos/eidos](https://github.com/sweidos/eidos) (`@sweidos/eidos`).

**Core principle:** Complexity belongs in the implementation. Simplicity belongs in the developer experience. Correctness, reliability, and honest guarantees are non-negotiable.

## Modes

| Mode | When | Behavior |
| --- | --- | --- |
| **Scoped** | User names a concrete task | Run only needed phases; finish with evidence |
| **Full-mission** | User asks revamp / master mission / full SDLC | Own inspection → research → strategy → architecture → impl → tests → docs → review → PR → merge → release without phase confirmation |
| **Bare / re-invoke** | `/eidos-product-engineering` with no new scope | Read ledger → verify → resume gaps **or** run [Maintenance sweep](#maintenance-sweep) — never reply only “already complete” |

Do **not** ask the user to type continue / implement / PR / release.

## Before anything else

1. Confirm checkout is Eidos (`packages/core` → `@sweidos/eidos`). Prefer `/tmp/eidos`; never assume `/workspace` is Eidos.
2. Inspect git status/branch; preserve user changes. Mission work on `cursor/<topic>-<suffix>` (lowercase).
3. Verify auth: `gh api user`, `gh api repos/sweidos/eidos --jq .permissions`.
4. Find active ledger: newest `research/*/EXECUTION.md` with status ≠ abandoned. **Resume** — do not start a conflicting parallel mission.
5. Record baseline commit + existing test results before changing code.
6. State mission **freeze line** (API/semver/modules that must not thrash) in the ledger.

## Persistent state

| File | Purpose |
| --- | --- |
| `research/<mission-id>/EXECUTION.md` | Ledger: objective, freeze line, branch, tasks, **Next action** (always agent-executable or a named human blocker) |
| `research/<mission-id>/PRODUCT_STRATEGY.md` | Target user, problem, differentiation, criteria |
| `research/<mission-id>/ARCHITECTURE.md` | Decisions, boundaries, trade-offs |
| `research/<mission-id>/VALIDATION.md` | Commands + actual outcomes |
| `research/<mission-id>/RELEASE.md` | Merge/release evidence |

Use `eidos-revamp` only when resuming that mission. New work gets a new `<mission-id>` (e.g. `ci-hygiene-20261013`). Update the ledger at phase boundaries, after fan-in, and before any interruption.

Human-only steps go under `## Blockers (human)`. `## Next action` must stay agent-executable while agent-safe work remains. **Forbidden:** `Status: complete` + `Next action: None` while any mission PR is still OPEN.

## Maintenance sweep

When bare re-invoke finds a **verified** `complete` ledger (or no active mission), run this bounded sweep once — do **not** invent a full product revamp:

1. Re-verify claims: open mission PRs, `npm view @sweidos/eidos version` vs repo, tip CI on default branch.
2. If verification fails → set `in_progress` / `complete_with_blocker` and resume **only** the gap.
3. Else pick **one** highest-value safe item, in order: unfinished agent PRs → red main CI → publish/verify lag after authorized path → skill self-fix if this run stalled on skill ambiguity → one Dependabot/group bump that passes local tests.
4. Open a **new** mission ledger for that item and execute through merge (and release if in scope).
5. If nothing actionable: report idle with evidence and **stop**.

## Anti-stall

- Never ask the user to continue, implement, open a PR, or release.
- If blocked >1 attempt on the same external dependency (secrets, permissions): finish Blocker playbook prep, record `## Blockers (human)` once with exact secret/permission + verification command, and **keep working** the parallel stream (PRs, CI, size, docs, skill).
- Core **bundle size budget** (7 kB gzip for `@sweidos/eidos` when enforced): overage is an implementation task — cut payload until under budget; do not wait for humans. See [testing.md](references/testing.md).
- Publish/secret stalls: [release.md](references/release.md) Blocker playbook.

## Orchestration

Act as one product/engineering org that ships **working software**. Details: [orchestration.md](references/orchestration.md).

- **Orchestrator** owns plan, fan-in, ledger, git write, PR/merge/publish.
- **Workers** (subagents) are bounded, default read-only, return structured artifacts under `research/<mission-id>/workers/`.
- Cap ≤3 concurrent workers; no nested fan-out; never claim parallel work without on-disk artifacts.
- Spawn for independent research, adversarial review, docs/API audit — **not** for shared queue/runtime edits.
- Advance SDLC phases only after fan-in. Serialize `packages/core` queue/runtime modules.

## Quality gates (required for merge)

1. **Product** — clear primary user/problem; honest guarantees; no unjustified complexity.
2. **API** — short primary example; lifecycle discoverable; migration assessed.
3. **Reliability** — crash/interrupted-replay and multi-tab covered; no known critical data-loss/dupe defects.
4. **Engineering** — tests, typecheck, build, package checks, CI; size budget if enforced; no critical regressions.
5. **Docs** — quick start matches exports; guarantees match implementation.
6. **Release** — semver + changelog accurate; publish only via authorized process.

Do not weaken or delete tests to go green. Do not fabricate evidence.

## Autonomy

- Decide routine naming, refactoring, test design, docs organization independently.
- Continue independent safe work when one stream is blocked.
- Irreversible public API break / major semver / security bypass / publish credentials: AskQuestion once (recommended option first) or hard-blocker in ledger — then keep non-blocked work moving.
- Never: force-push shared history, bypass security controls, invent customers/benchmarks, claim merge/publish without verification, expand scope for theater.

## Definition of done

Report separately: skill invoked · local implementation · PR opened · PR merged · package published · remaining blockers · open PR count · npm version match · tip CI.

Mission **complete** only when gates pass, **all mission PRs are merged** (or abandoned in ledger with reason), publish verified if in scope, ledger matches reality (`gh pr list`, `npm view`, CI), and Next action is empty **only** after Maintenance sweep found nothing actionable.

Skill shipping: [skill-release.md](references/skill-release.md). Procedures: [sdlc.md](references/sdlc.md), [recovery.md](references/recovery.md), [release.md](references/release.md), [principles.md](references/principles.md), [research.md](references/research.md), [api-review.md](references/api-review.md), [testing.md](references/testing.md), [security.md](references/security.md).
