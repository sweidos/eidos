import { describe, it, expect } from 'vitest';
import type { ResourceConfig, GeneratedStrategy } from '../types';

// ── Test deriveStrategy via resource() ────────────────────────────────────────
// We test strategy derivation indirectly through the exported resource() function.
// This avoids exposing private internals while still covering the decision logic.

import { resource } from '../resource';
import { useEidosStore } from '../store';

// Reset store between tests
beforeEach(() => {
  useEidosStore.setState({ resources: {}, isOnline: true, swStatus: 'idle', queue: [] });
  // Unregister any resources from previous tests by clearing registry via store
});

function getStrategy(url: string, config: ResourceConfig): GeneratedStrategy {
  // Each test uses a unique URL to avoid registry dedup
  const handle = resource(url, config);
  return handle.strategy;
}

describe('strategy auto-selection', () => {
  it('offline: true → StaleWhileRevalidate', () => {
    const s = getStrategy('/test/swr-default', { offline: true });
    expect(s.swStrategy).toBe('stale-while-revalidate');
    expect(s.name).toBe('StaleWhileRevalidate');
  });

  it('offline: false → NetworkFirst', () => {
    const s = getStrategy('/test/nf-default', { offline: false });
    expect(s.swStrategy).toBe('network-first');
  });

  it('offline: true, strategy: cache-first → CacheFirst', () => {
    const s = getStrategy('/test/cf', { offline: true, strategy: 'cache-first' });
    expect(s.swStrategy).toBe('cache-first');
    expect(s.name).toBe('CacheFirst');
  });

  it('offline: true, strategy: network-first → NetworkFirst', () => {
    const s = getStrategy('/test/nf-explicit', { offline: true, strategy: 'network-first' });
    expect(s.swStrategy).toBe('network-first');
  });

  it('offline: false, strategy: cache-first → CacheFirst (explicit override)', () => {
    const s = getStrategy('/test/cf-override', { offline: false, strategy: 'cache-first' });
    expect(s.swStrategy).toBe('cache-first');
  });
});

describe('cacheName propagation', () => {
  it('default cacheName is eidos-resources-v1', () => {
    const s = getStrategy('/test/cachename-default', { offline: true });
    expect(s.cacheName).toBe('eidos-resources-v1');
  });

  it('custom cacheName flows through', () => {
    const s = getStrategy('/test/cachename-custom', { offline: true, cacheName: 'my-bucket' });
    expect(s.cacheName).toBe('my-bucket');
  });

  it('custom cacheName works with explicit strategy', () => {
    const s = getStrategy('/test/cachename-cf', {
      offline: true,
      strategy: 'cache-first',
      cacheName: 'static-v1',
    });
    expect(s.cacheName).toBe('static-v1');
    expect(s.swStrategy).toBe('cache-first');
  });

  it('version is appended as a suffix to the default cacheName', () => {
    const s = getStrategy('/test/cachename-version-default', { offline: true, version: 2 });
    expect(s.cacheName).toBe('eidos-resources-v1-v2');
  });

  it('version is appended as a suffix to a custom cacheName', () => {
    const s = getStrategy('/test/cachename-version-custom', {
      offline: true,
      cacheName: 'my-bucket',
      version: 'shape-2',
    });
    expect(s.cacheName).toBe('my-bucket-vshape-2');
  });

  it('omitting version leaves cacheName unsuffixed', () => {
    const s = getStrategy('/test/cachename-no-version', { offline: true });
    expect(s.cacheName).toBe('eidos-resources-v1');
  });
});

describe('GeneratedStrategy shape', () => {
  it('includes all required fields', () => {
    const s = getStrategy('/test/shape', { offline: true });
    expect(s).toHaveProperty('name');
    expect(s).toHaveProperty('swStrategy');
    expect(s).toHaveProperty('cacheName');
    expect(s).toHaveProperty('reasoning');
    expect(s).toHaveProperty('behavior');
    expect(s).toHaveProperty('equivalentCode');
    expect(Array.isArray(s.behavior)).toBe(true);
    expect(s.behavior.length).toBeGreaterThan(0);
  });
});

describe('resource handle', () => {
  it('exposes url, config, strategy', () => {
    const config: ResourceConfig = { offline: true, cacheName: 'test-v1' };
    const h = resource('/test/handle', config);
    expect(h.url).toBe('/test/handle');
    expect(h.config).toEqual(config);
    expect(h.strategy.cacheName).toBe('test-v1');
  });

  it('idempotent — same URL returns same handle', () => {
    const h1 = resource('/test/idem', { offline: true });
    const h2 = resource('/test/idem', { offline: true });
    expect(h1).toBe(h2);
  });

  it('unregister removes from store', () => {
    resource('/test/unreg', { offline: true });
    useEidosStore.getState().registerResource('/test/unreg', {
      url: '/test/unreg',
      config: { offline: true },
      strategy: getStrategy('/test/unreg-strat', { offline: true }),
      status: 'idle',
      cacheHits: 0,
      cacheMisses: 0,
    });
    const h = resource('/test/unreg', { offline: true });
    h.unregister();
    expect(useEidosStore.getState().resources['/test/unreg']).toBeUndefined();
  });
});

describe('maxAge config', () => {
  it('config.maxAge is preserved on handle', () => {
    const h = resource('/test/maxage', { offline: true, maxAge: 60_000 });
    expect(h.config.maxAge).toBe(60_000);
  });
});

describe('maxEntries config', () => {
  it('config.maxEntries is preserved on handle', () => {
    const h = resource('/test/maxentries', { offline: true, maxEntries: 50 });
    expect(h.config.maxEntries).toBe(50);
  });

  it('maxEntries can be combined with maxAge', () => {
    const h = resource('/test/maxentries-maxage', {
      offline: true,
      maxAge: 30_000,
      maxEntries: 20,
    });
    expect(h.config.maxAge).toBe(30_000);
    expect(h.config.maxEntries).toBe(20);
  });

  it('omitting maxEntries leaves it undefined', () => {
    const h = resource('/test/maxentries-absent', { offline: true });
    expect(h.config.maxEntries).toBeUndefined();
  });
});

describe('networkTimeoutMs config', () => {
  it('config.networkTimeoutMs is preserved on handle', () => {
    const h = resource('/test/timeout-1', { offline: false, networkTimeoutMs: 8000 });
    expect(h.config.networkTimeoutMs).toBe(8000);
  });

  it('networkTimeoutMs can be combined with maxAge and maxEntries', () => {
    const h = resource('/test/timeout-2', {
      offline: true,
      maxAge: 60_000,
      maxEntries: 100,
      networkTimeoutMs: 5000,
    });
    expect(h.config.networkTimeoutMs).toBe(5000);
    expect(h.config.maxAge).toBe(60_000);
    expect(h.config.maxEntries).toBe(100);
  });

  it('omitting networkTimeoutMs leaves it undefined', () => {
    const h = resource('/test/timeout-absent', { offline: true });
    expect(h.config.networkTimeoutMs).toBeUndefined();
  });
});
