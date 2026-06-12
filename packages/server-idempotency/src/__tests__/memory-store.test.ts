import { describe, it, expect, vi } from 'vitest';
import { MemoryIdempotencyStore } from '../memory-store.js';

describe('MemoryIdempotencyStore', () => {
  it('reserve() returns true for a new key, false for an already-reserved key', async () => {
    const store = new MemoryIdempotencyStore();
    expect(await store.reserve('k1', 1000)).toBe(true);
    expect(await store.reserve('k1', 1000)).toBe(false);
  });

  it('get() returns null while reserved, and the response after complete()', async () => {
    const store = new MemoryIdempotencyStore();
    await store.reserve('k1', 1000);
    expect(await store.get('k1')).toBeNull();

    const response = { status: 200, headers: {}, body: '{"ok":true}', storedAt: Date.now() };
    await store.complete('k1', response, 1000);
    expect(await store.get('k1')).toEqual(response);
  });

  it('release() frees the key so reserve() succeeds again', async () => {
    const store = new MemoryIdempotencyStore();
    await store.reserve('k1', 1000);
    await store.release('k1');
    expect(await store.reserve('k1', 1000)).toBe(true);
  });

  it('expires entries after ttlMs', async () => {
    vi.useFakeTimers();
    const store = new MemoryIdempotencyStore();
    const response = { status: 200, headers: {}, body: '{}', storedAt: Date.now() };
    await store.complete('k1', response, 100);

    expect(await store.get('k1')).toEqual(response);
    vi.advanceTimersByTime(101);
    expect(await store.get('k1')).toBeNull();
    // Expired entry no longer blocks reservation.
    expect(await store.reserve('k1', 1000)).toBe(true);
    vi.useRealTimers();
  });
});
