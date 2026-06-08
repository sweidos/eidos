import { describe, it, expect, beforeEach } from 'vitest'
import { resource } from '../resource'
import { useEidosStore } from '../store'

// Reset store before each test
beforeEach(() => {
  useEidosStore.setState({
    isOnline: true,
    swStatus: 'idle',
    swError: undefined,
    resources: {},
    queue: [],
  })
})

// ── Pattern detection (via handle behaviour) ──────────────────────────────────

describe('pattern resource — handle creation', () => {
  it('registers in store under the pattern string', () => {
    resource('/api/products/*', { offline: true })
    expect(useEidosStore.getState().resources['/api/products/*']).toBeDefined()
    expect(useEidosStore.getState().resources['/api/products/*'].url).toBe('/api/products/*')
  })

  it(':param registers in store under the pattern string', () => {
    resource('/api/users/:id', { offline: true })
    expect(useEidosStore.getState().resources['/api/users/:id']).toBeDefined()
  })

  it('** registers in store under the pattern string', () => {
    resource('/api/v2/**', { offline: true })
    expect(useEidosStore.getState().resources['/api/v2/**']).toBeDefined()
  })

  it('exact URL still registers normally', () => {
    resource('/api/products', { offline: true })
    expect(useEidosStore.getState().resources['/api/products']).toBeDefined()
  })

  it('idempotent — second call with same pattern returns same handle', () => {
    const a = resource('/api/items/*', { offline: true })
    const b = resource('/api/items/*', { offline: true })
    expect(a).toBe(b)
  })
})

// ── Pattern resource — guarded methods ───────────────────────────────────────

describe('pattern resource — fetch/json/query/prefetch throw', () => {
  it('fetch() throws with helpful message', async () => {
    const h = resource('/api/orders/*', { offline: true })
    await expect(h.fetch()).rejects.toThrow("resource('/api/orders/*') is a URL pattern")
  })

  it('json() throws', async () => {
    const h = resource('/api/orders/:id', { offline: true })
    await expect(h.json()).rejects.toThrow("resource('/api/orders/:id') is a URL pattern")
  })

  it('query() throws', () => {
    const h = resource('/api/search/**', { offline: true })
    expect(() => h.query()).toThrow("resource('/api/search/**') is a URL pattern")
  })

  it('prefetch() throws', async () => {
    const h = resource('/api/items/*', { offline: true })
    await expect(h.prefetch()).rejects.toThrow('is a URL pattern')
  })
})

// ── Pattern resource — allowed methods ───────────────────────────────────────

describe('pattern resource — unregister works', () => {
  it('unregister removes from store', () => {
    const h = resource('/api/cats/*', { offline: true })
    expect(useEidosStore.getState().resources['/api/cats/*']).toBeDefined()
    h.unregister()
    expect(useEidosStore.getState().resources['/api/cats/*']).toBeUndefined()
  })
})

// ── Exact resource — methods still work normally ──────────────────────────────

describe('exact URL resource — no regression', () => {
  it('query() returns queryKey and queryFn', () => {
    const h = resource('/api/products', { offline: true })
    const q = h.query()
    expect(q.queryKey).toEqual(['eidos', '/api/products'])
    expect(typeof q.queryFn).toBe('function')
  })

  it('unregister removes from store', () => {
    const h = resource('/api/products', { offline: true })
    h.unregister()
    expect(useEidosStore.getState().resources['/api/products']).toBeUndefined()
  })
})
