# @sweidos/payment-demo

Phase 3 exit-criteria sample app: a payment-style mutation that survives
duplicate replay against [`@sweidos/server-idempotency`](../../packages/server-idempotency).

## What it shows

`src/server.ts` exposes `POST /api/charge`, guarded by the `idempotency()`
Express middleware. Each charge appends to an in-memory `ledger`. Without
idempotency, a client retry (e.g. an Eidos `neverLose` action replaying after
a dropped response) would append twice — a double charge.

## Run

```bash
pnpm --filter @sweidos/payment-demo demo
```

Sends two `POST /api/charge` requests with the same `Idempotency-Key`,
then prints the ledger — one entry, total `4999`.

## Test

```bash
pnpm --filter @sweidos/payment-demo test
```

`src/__tests__/charge.test.ts` asserts: first request returns `201` with no
`Idempotency-Replayed` header; the retry returns the same `201` body with
`Idempotency-Replayed: true`; the ledger has exactly one entry.
