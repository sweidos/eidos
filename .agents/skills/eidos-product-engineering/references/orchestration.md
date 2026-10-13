# Multi-agent orchestration

## Roles

| Role | Spawn? | Writes |
| --- | --- | --- |
| Orchestrator (you) | — | Ledger, git, PR/merge/release, fan-in decisions |
| Research Auditor | yes | `workers/research-*.md` only |
| API Simplicity Reviewer | yes | `workers/api-*.md` only |
| Reliability/Race Reviewer | yes | `workers/reliability-*.md` only |
| Security Reviewer | yes | `workers/security-*.md` only |
| Docs/DX Auditor | yes | `workers/docs-*.md` only |
| Implementer | **no** (inline) | `packages/core` queue/runtime — orchestrator only |

## Independence test (before spawn)

Spawn only if: no shared mutable files with other in-flight workers; outputs are mergeable evidence; task is not editing queue/runtime ownership logic.

## Caps

- ≤3 concurrent workers
- No nested fan-out (orchestrator re-spawns if needed)
- Never pretend a subagent ran — require on-disk artifacts

## Spawn prompt contract

Each worker prompt must include:

1. Goal (one sentence)
2. Freeze line (what not to change)
3. Paths / URLs to read
4. Output path under `research/<mission-id>/workers/<id>.md`
5. Label claims: **verified** / **hypothesis** / **unknown**
6. “No code edits / no git / no PR unless explicitly granted”

## Fan-in (required before phase advance)

Merge into `EXECUTION.md`:

```markdown
### Fan-in <phase>
- Workers: <ids + artifact paths>
- Accepted: …
- Rejected (why): …
- Conflicts + resolution: …
- Next action: …
```

Precedence: verified code/CI evidence > worker narrative. Prefer simplicity + correctness + user value. Discard unverified claims. Do not implement from a single unreconciled worker.

## Phase barriers

Reconcile before leaving: Research → Strategy/Architecture → Implementation freeze → Review (prefer ≥2 independent review contracts or record skip reason) → PR → Merge/Release.

## Disagreement

1. Re-verify against code/tests
2. Orchestrator decides with evidence
3. Escalate to human only for irreversible API break / major semver / security bypass / missing publish credentials after Blocker playbook

## Anti-patterns

- Sequential work narrated as “parallel agents”
- Duplicate identical prompts
- Workers committing or opening PRs
- Second mission branch while one is `in_progress`
