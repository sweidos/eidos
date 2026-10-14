# Product ease — first-touch Save — Release

**Mission PR:** https://github.com/sweidos/eidos/pull/121 — **MERGED** (squash → `cb070e3` on `main`)
**Branch:** `cursor/product-ease-first-touch-34f7` (deleted)
**Semver:** patch via `.changeset/product-ease-queued-idempotency.md` (`QueuedResult.idempotencyKey` additive)

## Post-merge runs

| Workflow         | Run           | Status                      |
| ---------------- | ------------- | --------------------------- |
| Deploy & Release | `38530481626` | in_progress at ledger write |
| Release PR       | `38530481848` | in_progress at ledger write |

## Verify after green

```bash
gh run view 38530481626 --json conclusion
curl -sI https://sweidos.vercel.app/docs/start | head -5
npm view @sweidos/eidos version   # after Version Packages merges
```
