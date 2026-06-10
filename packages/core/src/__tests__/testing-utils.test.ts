/**
 * Tests for @sweidos/eidos/testing helpers.
 * These tests import from the source file directly (no build step needed).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { action } from '../action';
import {
  mockOffline,
  mockOnline,
  drainQueue,
  waitForQueueDrain,
  getCachedEntry,
  clearEidosCache,
  resetEidos,
  getEidosState,
  EIDOS_CACHE_NAME,
} from '../testing';

// ── helpers ───────────────────────────────────────────────────────────────────

const noop = vi.fn().mockResolvedValue(undefined);

beforeEach(async () => {
  await resetEidos();
  noop.mockReset();
  noop.mockResolvedValue(undefined);
});

// ── mockOffline / mockOnline ──────────────────────────────────────────────────

describe('mockOffline / mockOnline', () => {
  it('mockOffline sets store isOnline to false', () => {
    mockOffline();
    expect(getEidosState().isOnline).toBe(false);
  });

  it('mockOnline restores isOnline to true', () => {
    mockOffline();
    mockOnline();
    expect(getEidosState().isOnline).toBe(true);
  });

  it('stubFetch makes fetch() reject with TypeError', async () => {
    mockOffline({ stubFetch: true });
    await expect(globalThis.fetch('/anything')).rejects.toThrow(TypeError);
  });

  it('mockOnline restores original fetch', async () => {
    const original = globalThis.fetch;
    mockOffline({ stubFetch: true });
    expect(globalThis.fetch).not.toBe(original);
    mockOnline();
    expect(globalThis.fetch).toBe(original);
  });
});

// ── drainQueue ────────────────────────────────────────────────────────────────

describe('drainQueue', () => {
  it('queued action is replayed and succeeded', async () => {
    const fn = vi.fn().mockResolvedValue({ ok: true });
    const save = action(fn, { name: 'testing-drain-save', reliability: 'neverLose' });

    // Go offline so the action gets queued
    mockOffline();
    await save({ id: 1 });

    expect(getEidosState().queue).toHaveLength(1);
    expect(getEidosState().queue[0].status).toBe('pending');

    // Drain — should replay and succeed
    const result = await drainQueue();
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('forces isOnline true so replay is never skipped', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const save = action(fn, { name: 'testing-drain-online', reliability: 'neverLose' });

    mockOffline();
    await save({});

    // Stay "offline" — drainQueue should still flip isOnline
    const result = await drainQueue();
    expect(getEidosState().isOnline).toBe(true);
    expect(result.succeeded).toBe(1);
  });
});

// ── waitForQueueDrain ─────────────────────────────────────────────────────────

describe('waitForQueueDrain', () => {
  it('resolves immediately when queue is empty', async () => {
    await expect(waitForQueueDrain()).resolves.toBeUndefined();
  });

  it('rejects if items remain after timeout', async () => {
    // Artificially place a stuck item in the store
    const { useEidosStore } = await import('../store');
    useEidosStore.getState().addQueueItem({
      id: 'stuck-1',
      actionId: 'noop',
      actionName: 'noop',
      args: [],
      queuedAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      status: 'pending',
    });

    await expect(waitForQueueDrain({ timeout: 80, interval: 20 })).rejects.toThrow(/timed out/);
  });
});

// ── getCachedEntry / clearEidosCache ──────────────────────────────────────────

describe('getCachedEntry / clearEidosCache', () => {
  it('returns undefined for uncached URL', async () => {
    const entry = await getCachedEntry('/api/missing');
    expect(entry).toBeUndefined();
  });

  it('returns cached response after put', async () => {
    // Directly populate via global caches mock (same approach the SW uses)
    const cache = await caches.open(EIDOS_CACHE_NAME);
    await cache.put('/api/user/1', new Response('{"id":1}'));

    const entry = await getCachedEntry('/api/user/1');
    expect(entry).toBeInstanceOf(Response);
    const body = await entry!.json();
    expect(body).toEqual({ id: 1 });
  });

  it('clearEidosCache removes all entries from the namespace', async () => {
    const cache = await caches.open(EIDOS_CACHE_NAME);
    await cache.put('/api/x', new Response('x'));

    await clearEidosCache();
    const entry = await getCachedEntry('/api/x');
    expect(entry).toBeUndefined();
  });
});

// ── resetEidos ────────────────────────────────────────────────────────────────

describe('resetEidos', () => {
  it('clears queue', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const save = action(fn, { name: 'testing-reset-queue', reliability: 'neverLose' });

    mockOffline();
    await save({});
    expect(getEidosState().queue).toHaveLength(1);

    await resetEidos();
    expect(getEidosState().queue).toHaveLength(0);
  });

  it('restores online state', async () => {
    mockOffline();
    await resetEidos();
    expect(getEidosState().isOnline).toBe(true);
  });

  it('clears resource entries', async () => {
    const { useEidosStore } = await import('../store');
    useEidosStore.getState().registerResource('/api/r', {
      url: '/api/r',
      status: 'fresh',
      offline: true,
      strategy: 'cache-first',
    });

    await resetEidos();
    expect(Object.keys(getEidosState().resources)).toHaveLength(0);
  });

  it('resets swStatus to idle', async () => {
    const { useEidosStore } = await import('../store');
    useEidosStore.getState().setSwStatus('active');

    await resetEidos();
    expect(getEidosState().swStatus).toBe('idle');
  });
});

// ── getEidosState ─────────────────────────────────────────────────────────────

describe('getEidosState', () => {
  it('returns plain object without store methods', () => {
    const state = getEidosState();
    expect(state).toHaveProperty('isOnline');
    expect(state).toHaveProperty('queue');
    expect(state).toHaveProperty('resources');
    expect(state).toHaveProperty('swStatus');
    expect(typeof (state as unknown as { setOnline?: unknown }).setOnline).not.toBe('function');
  });
});
