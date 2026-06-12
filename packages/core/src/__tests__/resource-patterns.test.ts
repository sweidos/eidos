import { describe, it, expect, beforeEach } from 'vitest';
import { resource, resourcePattern } from '../resource';
import { useEidosStore } from '../store';
import { resetEidosState } from './test-utils';

// Reset store before each test
beforeEach(() => {
  resetEidosState({ swStatus: 'idle' });
});

// ── resourcePattern() — handle creation ───────────────────────────────────────

describe('resourcePattern() — handle creation', () => {
  it('registers in store under the pattern string', () => {
    resourcePattern('/api/products/*', { offline: true });
    expect(useEidosStore.getState().resources['/api/products/*']).toBeDefined();
    expect(useEidosStore.getState().resources['/api/products/*'].url).toBe('/api/products/*');
  });

  it(':param registers in store under the pattern string', () => {
    resourcePattern('/api/users/:id', { offline: true });
    expect(useEidosStore.getState().resources['/api/users/:id']).toBeDefined();
  });

  it('** registers in store under the pattern string', () => {
    resourcePattern('/api/v2/**', { offline: true });
    expect(useEidosStore.getState().resources['/api/v2/**']).toBeDefined();
  });

  it('idempotent — second call with same pattern returns same handle', () => {
    const a = resourcePattern('/api/items/*', { offline: true });
    const b = resourcePattern('/api/items/*', { offline: true });
    expect(a).toBe(b);
  });

  it('throws if given a non-pattern URL', () => {
    expect(() => resourcePattern('/api/products', { offline: true })).toThrow(
      "resourcePattern('/api/products') is not a URL pattern",
    );
  });
});

// ── resourcePattern() — only invalidate/unregister exposed ───────────────────

describe('resourcePattern() — handle shape', () => {
  it('does not expose fetch/json/query/prefetch', () => {
    const h = resourcePattern('/api/orders/*', { offline: true });
    expect('fetch' in h).toBe(false);
    expect('json' in h).toBe(false);
    expect('query' in h).toBe(false);
    expect('prefetch' in h).toBe(false);
  });

  it('unregister removes from store', () => {
    const h = resourcePattern('/api/cats/*', { offline: true });
    expect(useEidosStore.getState().resources['/api/cats/*']).toBeDefined();
    h.unregister();
    expect(useEidosStore.getState().resources['/api/cats/*']).toBeUndefined();
  });

  it('invalidate() resolves without error', async () => {
    const h = resourcePattern('/api/search/**', { offline: true });
    await expect(h.invalidate()).resolves.toBeUndefined();
  });
});

// ── resource() — rejects URL patterns ─────────────────────────────────────────

describe('resource() — rejects URL patterns', () => {
  it('throws for * patterns', () => {
    expect(() => resource('/api/orders/*', { offline: true })).toThrow(
      "resource('/api/orders/*') is a URL pattern",
    );
  });

  it('throws for :param patterns', () => {
    expect(() => resource('/api/orders/:id', { offline: true })).toThrow(
      "resource('/api/orders/:id') is a URL pattern",
    );
  });

  it('throws for ** patterns', () => {
    expect(() => resource('/api/search/**', { offline: true })).toThrow(
      "resource('/api/search/**') is a URL pattern",
    );
  });
});

// ── Exact resource — methods still work normally ──────────────────────────────

describe('exact URL resource — no regression', () => {
  it('exact URL still registers normally', () => {
    resource('/api/products', { offline: true });
    expect(useEidosStore.getState().resources['/api/products']).toBeDefined();
  });

  it('query() returns queryKey and queryFn', () => {
    const h = resource('/api/products', { offline: true });
    const q = h.query();
    expect(q.queryKey).toEqual(['eidos', '/api/products']);
    expect(typeof q.queryFn).toBe('function');
  });

  it('unregister removes from store', () => {
    const h = resource('/api/products', { offline: true });
    h.unregister();
    expect(useEidosStore.getState().resources['/api/products']).toBeUndefined();
  });
});
