import { describe, it, expect } from 'vitest';
import express from 'express';
import http from 'http';
import { idempotency } from '../express.js';
import { MemoryIdempotencyStore } from '../memory-store.js';

// Minimal in-process HTTP helper — avoids a supertest dependency.
async function post(
  server: ReturnType<typeof express>,
  path: string,
  headers: Record<string, string>,
): Promise<{
  status: number;
  body: string;
  headers: Record<string, string | string[] | undefined>;
}> {
  const httpServer = server.listen(0);
  const { port } = httpServer.address() as { port: number };
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, method: 'POST', headers }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        httpServer.close();
        resolve({ status: res.statusCode!, body, headers: res.headers });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

describe('express idempotency middleware', () => {
  it('a payment-style mutation survives duplicate replay — handler runs once', async () => {
    let writes = 0;
    const app = express();
    app.post('/api/charge', idempotency({ store: new MemoryIdempotencyStore() }), (_req, res) => {
      writes++;
      res.status(201).json({ id: 'charge_1', writes });
    });

    const first = await post(app, '/api/charge', { 'Idempotency-Key': 'key-1' });
    expect(first.status).toBe(201);
    expect(JSON.parse(first.body)).toEqual({ id: 'charge_1', writes: 1 });
    expect(first.headers['idempotency-replayed']).toBeUndefined();

    const second = await post(app, '/api/charge', { 'Idempotency-Key': 'key-1' });
    expect(second.status).toBe(201);
    expect(JSON.parse(second.body)).toEqual({ id: 'charge_1', writes: 1 });
    expect(second.headers['idempotency-replayed']).toBe('true');
    expect(writes).toBe(1);
  });

  it('different keys hit the handler independently', async () => {
    let writes = 0;
    const app = express();
    app.post('/api/charge', idempotency({ store: new MemoryIdempotencyStore() }), (_req, res) => {
      writes++;
      res.status(201).json({ writes });
    });

    await post(app, '/api/charge', { 'Idempotency-Key': 'a' });
    await post(app, '/api/charge', { 'Idempotency-Key': 'b' });
    expect(writes).toBe(2);
  });

  it('no Idempotency-Key header → passes through, runs every time', async () => {
    let writes = 0;
    const app = express();
    app.post('/api/charge', idempotency({ store: new MemoryIdempotencyStore() }), (_req, res) => {
      writes++;
      res.status(201).json({ writes });
    });

    await post(app, '/api/charge', {});
    await post(app, '/api/charge', {});
    expect(writes).toBe(2);
  });

  it('a failed (4xx/5xx) response is not cached — retry with the same key re-runs', async () => {
    let writes = 0;
    const app = express();
    app.post('/api/charge', idempotency({ store: new MemoryIdempotencyStore() }), (_req, res) => {
      writes++;
      if (writes === 1) return res.status(500).json({ error: 'transient' });
      res.status(201).json({ id: 'charge_1' });
    });

    const first = await post(app, '/api/charge', { 'Idempotency-Key': 'key-1' });
    expect(first.status).toBe(500);

    const second = await post(app, '/api/charge', { 'Idempotency-Key': 'key-1' });
    expect(second.status).toBe(201);
    expect(writes).toBe(2);
  });
});
