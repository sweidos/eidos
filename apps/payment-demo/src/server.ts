import express from 'express';
import { idempotency } from '@sweidos/server-idempotency/express';
import { MemoryIdempotencyStore } from '@sweidos/server-idempotency';

/**
 * Minimal payment processor. Each successful charge appends to `ledger` —
 * a stand-in for a real ledger/payments table. If `/api/charge` ran twice
 * for one logical request, the customer would be charged twice.
 */
const ledger: { id: string; amountCents: number }[] = [];

export function createApp() {
  const app = express();
  app.use(express.json());

  app.post('/api/charge', idempotency({ store: new MemoryIdempotencyStore() }), (req, res) => {
    const { amountCents } = req.body as { amountCents: number };
    const charge = { id: `ch_${ledger.length + 1}`, amountCents };
    ledger.push(charge);
    res.status(201).json(charge);
  });

  app.get('/api/ledger', (_req, res) => {
    res.json({ ledger, total: ledger.reduce((sum, c) => sum + c.amountCents, 0) });
  });

  return app;
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const port = 4310;
  createApp().listen(port, () => {
    console.log(`payment-demo server listening on http://localhost:${port}`);
  });
}
