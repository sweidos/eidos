# SDLC phases

Execute continuously in full-mission mode. Skip only when out of scope for a scoped invocation. Bare re-invoke uses Maintenance sweep first (see `SKILL.md`), not an automatic full revamp.

**Barriers:** fan-in after Research, after Architecture, after Implementation freeze, after Review, before claiming merge/publish. See [orchestration.md](orchestration.md).

## Phase 0 — Baseline

Confirm repo identity. Preserve user work. Record baseline commit SHA, package version (`npm view` + local), scripts, CI, existing test results (including pre-existing failures), freeze line. Checkout/create `cursor/<topic>-<suffix>` from current default branch tip. Create `research/<mission-id>/EXECUTION.md`.

## Phase 1 — Research

Evidence-only. Primary sources: code, tests, PRs, official docs, npm, issues. Separate facts / hypotheses / unknowns. Parallel research workers OK when independent. Investigate historical findings against **current** code — do not trust prior audits blindly. Fan-in before Strategy. Write concise findings into PRODUCT_STRATEGY inputs.

## Phase 2 — Strategy

Choose the narrowest positioning supported by evidence. Define target developer, painful scenario, alternatives, Eidos advantage, non-goals, core journey, success metrics, acceptance criteria. Prefer one exceptional end-to-end workflow over weakly differentiated features. Persist in `PRODUCT_STRATEGY.md`.

## Phase 3 — Architecture / API

Audit public API before adding capabilities. Identify overlap, leaked mechanisms, eliminable config, type gaps, lifecycle footguns, server requirements. Design smallest coherent API. Before/after usage comparison for: install, happy path, offline, reload, failure, server needs, cleanup, types. Prefer non-breaking improvements; major only with migration plan. Persist in `ARCHITECTURE.md`. Fan-in before Implement.

## Phase 4 — Implement

Small coherent commits. Prioritize reliability + DX. **Orchestrator-only** for shared queue/runtime modules. Investigate ownership/lease for interrupted replay (do **not** blindly reset all `replaying` → `pending` if another owner may be live). Harden identity, retries, diagnostics, Provider config, validation. Preserve supported integrations unless migrated deliberately. Keep core under the enforced size budget (see [testing.md](testing.md)).

## Phase 5 — Verify

Failure-scenario tests (reload, crash, multi-tab, uncertain outcomes, storage failure). Build, typecheck, unit/integration, package consumer checks where feasible. Deterministic clocks over sleeps. Record actual command outcomes in `VALIDATION.md`. Document unavailable environments.

## Phase 6 — Docs / DX

Intent-first docs answering: problem, why Eidos, min setup, shortest example, offline/reload/crash, uncertain responses, server duties, failed-work recovery, when not to use. Align README, npm, website, guarantees language. Examples must match exports.

## Phase 7 — Distribution metadata

GitHub description/topics, npm keywords/description, landing copy consistency. Deploy only with permissions.

## Phase 8 — Independent review

Fresh adversarial review of correctness, races, API simplicity, compat, security, docs accuracy, scope. Prefer ≥2 independent review worker contracts in parallel (or record skip reason). Fix confirmed issues; retest; fan-in before PR.

Then follow [release.md](release.md) for PR → merge → publish. Do not mark complete until mission hygiene passes.
