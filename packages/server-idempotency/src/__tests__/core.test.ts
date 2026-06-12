import { describe, it, expect } from 'vitest';
import { startIdempotentRequest } from '../core.js';
import { MemoryIdempotencyStore } from '../memory-store.js';
import type { StoredResponse } from '../types.js';

describe('startIdempotentRequest', () => {
  it('no key → passthrough', async () => {
    const result = await startIdempotentRequest(undefined, { store: new MemoryIdempotencyStore() });
    expect(result.kind).toBe('passthrough');
  });

  it('new key → run, complete() stores the response for replay', async () => {
    const store = new MemoryIdempotencyStore();
    const result = await startIdempotentRequest('order-1', { store });
    if (result.kind !== 'run') throw new Error('expected run');

    const response: StoredResponse = {
      status: 201,
      headers: {},
      body: '{"id":1}',
      storedAt: Date.now(),
    };
    await result.complete(response);

    const replay = await startIdempotentRequest('order-1', { store });
    expect(replay).toEqual({ kind: 'replayed', response });
  });

  it('same key while reserved (no complete yet) → conflict', async () => {
    const store = new MemoryIdempotencyStore();
    const first = await startIdempotentRequest('order-1', { store });
    expect(first.kind).toBe('run');

    const second = await startIdempotentRequest('order-1', { store });
    expect(second.kind).toBe('conflict');
  });

  it('release() lets a retry with the same key run again', async () => {
    const store = new MemoryIdempotencyStore();
    const first = await startIdempotentRequest('order-1', { store });
    if (first.kind !== 'run') throw new Error('expected run');
    await first.release();

    const retry = await startIdempotentRequest('order-1', { store });
    expect(retry.kind).toBe('run');
  });
});
