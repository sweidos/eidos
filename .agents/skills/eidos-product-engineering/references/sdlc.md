# SDLC phases

Execute continuously in full-mission mode. Skip only when out of scope for a normal invocation.

## Phase 0 — Baseline
Confirm repo identity. Preserve user work. Record baseline commit SHA, package version (`npm view` + local), scripts, CI, existing test results (including pre-existing failures). Checkout/create `cursor/<topic>-<suffix>` from current default branch tip.

## Phase 1 — Research
Evidence-only. Primary sources: code, tests, PRs, official docs, npm, issues. Separate facts / hypotheses / unknowns. Investigate historical findings (replaying recovery, exactly-once claims, Provider forwarding, named actions, GH discovery, differentiation, onboarding footguns) against **current** code — do not trust prior audits blindly. Write concise findings into PRODUCT_STRATEGY inputs; avoid redundant report sprawl.

## Phase 2 — Strategy
Choose the narrowest positioning supported by evidence. Define target developer, painful scenario, alternatives, Eidos advantage, non-goals, core journey, success metrics, acceptance criteria. Prefer one exceptional end-to-end workflow over weakly differentiated features. Persist in `PRODUCT_STRATEGY.md`.

## Phase 3 — Architecture / API
Audit public API before adding capabilities. Identify overlap, leaked mechanisms, eliminable config, type gaps, lifecycle footguns, server requirements. Design smallest coherent API. Before/after usage comparison for: install, happy path, offline, reload, failure, server needs, cleanup, types. Prefer non-breaking improvements; major only with migration plan. Persist in `ARCHITECTURE.md`.

## Phase 4 — Implement
Small coherent commits. Prioritize reliability + DX. Investigate ownership/lease for interrupted replay (do **not** blindly reset all `replaying` → `pending` if another owner may be live). Harden identity, retries, diagnostics, Provider config, validation. Preserve supported integrations unless migrated deliberately.

## Phase 5 — Verify
Failure-scenario tests (reload, crash, multi-tab, uncertain outcomes, storage failure). Build, typecheck, unit/integration, package consumer checks where feasible. Deterministic clocks over sleeps. Record actual command outcomes in `VALIDATION.md`. Document unavailable environments.

## Phase 6 — Docs / DX
Intent-first docs answering: problem, why Eidos, min setup, shortest example, offline/reload/crash, uncertain responses, server duties, failed-work recovery, when not to use. Align README, npm, website, guarantees language. Examples must match exports.

## Phase 7 — Distribution metadata
GitHub description/topics, npm keywords/description, landing copy consistency. Deploy only with permissions.

## Phase 8 — Independent review
Fresh adversarial review of correctness, races, API simplicity, compat, security, docs accuracy, scope. Fix confirmed issues; retest.

Then follow [release.md](release.md) for PR → merge → publish.
