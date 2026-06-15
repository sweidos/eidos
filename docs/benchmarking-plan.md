# Performance benchmarking across eidos packages (phase-by-phase)

## Context

No benchmark suite exists anywhere in the monorepo. Goal: add perf benchmarks across packages (core, sqlite-storage, crdt-yjs, next), run them to find regressions/hotspots, and fix + ship any real issues as PRs. All 4 packages already use Vitest 4.1.9, which has a built-in `bench()` API — no new tooling needed.

## Phase 1 — core (`packages/core`)

Add `src/__tests__/*.bench.ts` benchmarks for:

1. `store-slices.ts: batchUpdateQueueItems()` (lines 53-60) — currently rebuilds/spreads the whole queue-items object per call. Bench with 10/100/500/1000 item batches to check for O(n²) blowup.
2. `store-slices.ts: updateResource()` (lines 19-25) — spreads entire resources map per update. Bench with growing resource-cache sizes (10/100/1000 entries).
3. `action.ts: wrapped()` dispatch (lines 94-136) — bench online vs offline/queued path.

Run: `pnpm --filter @sweidos/eidos vitest bench`

**Expected finding:** spread-based updates in `store-slices.ts` likely show near-linear-per-call cost, making bulk replay (N items) effectively O(n²). If confirmed, fix by mutating a `Map`/copy-on-write only for changed keys instead of full-object spread, keeping the same external interface. Re-run bench to confirm improvement, then run full test suite (`pnpm --filter @sweidos/eidos test`) for regressions.

## Phase 2 — sqlite-storage (`packages/sqlite-storage`)

Add `src/__tests__/sqlite-storage.bench.ts`:

1. `getAll()` / `getPending()` (lines 56-69) — SELECT + per-row `JSON.parse`. Bench with 100/1000/5000 queued items.
2. `update()` (lines 71-84) — read-modify-write cycle, bench single + repeated updates.

Run: `pnpm --filter @eidos/sqlite-storage vitest bench`

**Likely finding:** these are already near-minimal (single query + parse loop); if linear and reasonable, no code fix needed — bench file alone documents baseline. Only fix if something unexpectedly quadratic shows up (e.g. repeated full-table scans).

## Phase 3 — crdt-yjs (`packages/crdt-yjs`)

Add `src/__tests__/merge-resolver.bench.ts`:

1. `createYjsMergeResolver()` resolver end-to-end with small (1KB) / medium (100KB) update payloads.
2. `uint8ArrayToBase64()` / `base64ToUint8Array()` round trip at 1KB/10KB/100KB — dual Node (`Buffer`) vs browser (`btoa`/`atob`) loop path; the manual loop path is the likely hotspot for large buffers.

Run: `pnpm --filter @eidos/crdt-yjs vitest bench`

**Likely fix candidate:** if the non-Buffer base64 loop is significantly slower at larger sizes, consider chunked `String.fromCharCode` via spread/`apply` batching — but only fix if bench shows it matters (Yjs updates are typically small).

## Phase 4 — next (`packages/next`)

Add `src/__tests__/action-context.bench.ts`:

1. `isActionContext()`, `getActionContext()`, `idempotencyHeaders()` — these are tiny synchronous helpers; bench mainly to confirm no surprises (e.g. accidental JSON.stringify of large payloads in `idempotencyHeaders`).

Run: `pnpm --filter @eidos/next vitest bench`

**Expected:** no fix needed — document baseline only.

## Workflow per phase

1. Write bench file(s) for the package.
2. Run `vitest bench` for that package, review output.
3. If a real hotspot is found (non-trivial fix, measurable win): implement fix in the package source, re-run bench to confirm improvement, run `pnpm --filter <pkg> test` + `pnpm type-check` for regressions.
4. Create a feature branch for that phase, commit (bench file + fix if any), and open a PR via `gh pr create` targeting `main`. Each phase = its own branch/PR (so phases needing no fix still ship a "perf: add benchmark baseline for X" PR with just the bench file).
5. Move to next phase from `main`.

## Verification

- `pnpm --filter <pkg> vitest bench` output included in PR description as baseline (and before/after for fixed phases).
- `pnpm --filter <pkg> test` and `pnpm type-check` must pass before opening each PR.
