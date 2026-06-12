import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { idempotency } from '../hono.js';
import { MemoryIdempotencyStore } from '../memory-store.js';

describe('hono idempotency middleware', () => {
  it('a payment-style mutation survives duplicate replay — handler runs once', async () => {
    let writes = 0;
    const app = new Hono();
    app.post('/api/charge', idempotency({ store: new MemoryIdempotencyStore() }), (c) => {
      writes++;
      return c.json({ id: 'charge_1', writes }, 201);
    });

    const first = await app.request('/api/charge', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'key-1' },
    });
    expect(first.status).toBe(201);
    expect(await first.json()).toEqual({ id: 'charge_1', writes: 1 });
    expect(first.headers.get('idempotency-replayed')).toBeNull();

    const second = await app.request('/api/charge', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'key-1' },
    });
    expect(second.status).toBe(201);
    expect(await second.json()).toEqual({ id: 'charge_1', writes: 1 });
    expect(second.headers.get('idempotency-replayed')).toBe('true');
    expect(writes).toBe(1);
  });

  it('same key in flight → 409 conflict', async () => {
    const store = new MemoryIdempotencyStore();
    const app = new Hono();
    app.post('/api/charge', idempotency({ store }), (c) => c.json({ ok: true }, 201));

    // Reserve the key directly to simulate an in-flight request.
    await store.reserve('key-1', 1000);

    const res = await app.request('/api/charge', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'key-1' },
    });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('idempotency_conflict');
  });

  it('no Idempotency-Key header → passes through, runs every time', async () => {
    let writes = 0;
    const app = new Hono();
    app.post('/api/charge', idempotency({ store: new MemoryIdempotencyStore() }), (c) => {
      writes++;
      return c.json({ writes }, 201);
    });

    await app.request('/api/charge', { method: 'POST' });
    await app.request('/api/charge', { method: 'POST' });
    expect(writes).toBe(2);
  });
});
