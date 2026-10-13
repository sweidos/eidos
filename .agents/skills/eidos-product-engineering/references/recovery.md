# Recovery and handoff

## On interruption

1. Write exact **Next action** into `EXECUTION.md` (file, command, PR number, or decision pending).
2. If mid fan-out: list in-flight worker ids + artifact paths; on resume, **fan-in first**.
3. Commit/push in-progress work if safe and coherent.
4. Do not leave a half-applied patch without ledger notes.

## On re-invocation

1. Read the active `research/*/EXECUTION.md` (newest non-abandoned).
2. **Re-verify** ledger claims against reality before trusting status:
   - `gh pr list --state open` (mission branches / docs / version PRs)
   - `npm view @sweidos/eidos version` vs `packages/core/package.json`
   - tip CI on default branch (`gh run list`)
3. Branch on verified status:
   - `in_progress` → resume; do not start a conflicting parallel mission branch
   - `complete_with_blocker` → run [Blocker playbook](release.md) then resume agent-safe Next action
   - `complete` → if verification fails, reopen to `in_progress` and close the gap; if it holds, run **Maintenance sweep** from `SKILL.md` (never exit after only “already complete”)
4. Continue until true terminal conditions, hard blocker with parallel stream exhausted, or environment limits.

## Ledger accuracy (before `status: complete`)

Paste command outcomes into `EXECUTION.md`:

- [ ] No open PRs for this mission (`gh pr list` / `gh pr view <n>` → MERGED)
- [ ] `npm view` matches claimed publish (or publish explicitly out of scope from the start)
- [ ] Tip CI green or filed as next mission / blocker
- [ ] If skill edited: canonical `.agents/skills/...` and runtime `~/.cursor/skills-cursor/...` in sync

**Forbidden:** `Status: complete` + `Next action: None` while any mission PR is OPEN.  
Human steps belong under `## Blockers (human)`; Next action stays agent-executable while safe work remains.

## Terminal conditions

All must be true for `complete`:

- Quality gates for the active mission
- Zero open PRs authored/updated for this mission (docs/ledger PRs count)
- Release verified if in scope
- Ledger Status + Next action match reality

Otherwise use `in_progress` or `complete_with_blocker` with a concrete Next action — never bare “none” while remnants exist.

Hard blocker with evidence + remaining work listed, or environment limits with durable handoff, are also terminal for the **current stream** — then run Maintenance sweep parallel work if any remains.
