import { describe, it, expect } from 'vitest';
import { createApp } from '../server.js';

describe('payment-demo: duplicate charge replay', () => {
  it('a payment-style mutation survives duplicate replay against @sweidos/server-idempotency', async () => {
    const app = createApp();
    const server = app.listen(0);
    const { port } = server.address() as { port: number };
    const url = `http://localhost:${port}/api/charge`;
    const idempotencyKey = 'charge_test_1';

    const charge = () =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({ amountCents: 4999 }),
      });

    const first = await charge();
    expect(first.status).toBe(201);
    expect(first.headers.get('idempotency-replayed')).toBeNull();
    const firstBody = await first.json();

    const retry = await charge();
    expect(retry.status).toBe(201);
    expect(retry.headers.get('idempotency-replayed')).toBe('true');
    expect(await retry.json()).toEqual(firstBody);

    const ledger = (await fetch(`http://localhost:${port}/api/ledger`).then((r) => r.json())) as {
      ledger: { id: string; amountCents: number }[];
      total: number;
    };
    expect(ledger.ledger).toHaveLength(1);
    expect(ledger.total).toBe(4999);

    server.close();
  });
});
