# eidos-product-engineering changelog

## 1.1.0 — 2026-10-13

### Added

- Bare / re-invoke mode with verify-then-resume and bounded **Maintenance sweep** (no “already complete” no-op)
- Anti-stall rules: never ask user to continue; parallel stream when secrets block
- Multi-agent orchestration playbook (`references/orchestration.md`) with caps, spawn contracts, fan-in
- Publish / changesets / CI **Blocker playbook** in `references/release.md`
- Mission hygiene checklist; forbidden `complete` while mission PRs open
- Skill release procedure (`references/skill-release.md`); `version` frontmatter
- Mission-id ledger paths (`research/<mission-id>/…`)

### Changed

- Definition of done requires merged mission PRs, npm/CI verification, and accurate Next action
- SDLC phase barriers + core size-budget treated as implementation work
- Recovery re-invocation branches on verified status, not ledger text alone

## 1.0.0 — 2026-10-13

- Initial skill: full SDLC ledger, quality gates, release outline
