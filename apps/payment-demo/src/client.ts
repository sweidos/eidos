import { createApp } from './server.js';

/**
 * Simulates an Eidos `neverLose` action that lost its response (e.g. tab
 * closed mid-request) and replays the same `/api/charge` call with the same
 * `idempotencyKey`. Demonstrates the customer is charged exactly once.
 */
async function main() {
  const app = createApp();
  const server = app.listen(0);
  const { port } = server.address() as { port: number };
  const url = `http://localhost:${port}/api/charge`;
  const idempotencyKey = `charge_${crypto.randomUUID()}`;

  const charge = (label: string) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ amountCents: 4999 }),
    }).then(async (res) => ({
      label,
      status: res.status,
      replayed: res.headers.get('idempotency-replayed'),
      body: await res.json(),
    }));

  console.log('First attempt (network drops before client sees the response)...');
  console.log(await charge('first'));

  console.log('\nClient retries with the same Idempotency-Key...');
  console.log(await charge('retry'));

  const ledger = (await fetch(`http://localhost:${port}/api/ledger`).then((r) => r.json())) as {
    ledger: { id: string; amountCents: number }[];
    total: number;
  };
  console.log('\nLedger:', ledger);
  console.log(ledger.ledger.length === 1 ? '\n✅ Charged once.' : '\n❌ Charged twice!');

  server.close();
}

main();
