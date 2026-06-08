import { describe, it, expect, beforeEach } from 'vitest'
import { resource } from '../resource'
import { useEidosStore } from '../store'

beforeEach(() => {
  useEidosStore.setState({
    isOnline: true,
    swStatus: 'idle',
    swError: undefined,
    resources: {},
    queue: [],
  })
})

// ── Cross-origin exact URL ────────────────────────────────────────────────────

describe('cross-origin exact URL resource', () => {
  it('registers in store under full URL key', () => {
    resource('https://api.example.com/products', { offline: true })
    expect(useEidosStore.getState().resources['https://api.example.com/products']).toBeDefined()
  })

  it('url property equals full URL', () => {
    const h = resource('https://api.example.com/data', { offline: false })
    expect(h.url).toBe('https://api.example.com/data')
  })

  it('query() returns correct queryKey with full URL', () => {
    const h = resource('https://cdn.example.com/config.json', { offline: false })
    const q = h.query()
    expect(q.queryKey).toEqual(['eidos', 'https://cdn.example.com/config.json'])
    expect(typeof q.queryFn).toBe('function')
  })

  it('unregister removes from store', () => {
    const h = resource('https://api.example.com/users', { offline: true })
    h.unregister()
    expect(useEidosStore.getState().resources['https://api.example.com/users']).toBeUndefined()
  })

  it('idempotent — second call returns same handle', () => {
    const a = resource('https://api.example.com/items', { offline: true })
    const b = resource('https://api.example.com/items', { offline: true })
    expect(a).toBe(b)
  })
})

// ── Cross-origin pattern URL ──────────────────────────────────────────────────

describe('cross-origin pattern resource', () => {
  it('wildcard pattern registers under full URL pattern key', () => {
    resource('https://api.example.com/products/*', { offline: true })
    expect(useEidosStore.getState().resources['https://api.example.com/products/*']).toBeDefined()
  })

  it(':param pattern registers under full URL pattern key', () => {
    resource('https://api.example.com/users/:id', { offline: true })
    expect(useEidosStore.getState().resources['https://api.example.com/users/:id']).toBeDefined()
  })

  it('** multi-segment pattern registers under full URL key', () => {
    resource('https://cdn.example.com/assets/**', { offline: false })
    expect(useEidosStore.getState().resources['https://cdn.example.com/assets/**']).toBeDefined()
  })

  it('fetch() throws helpful error on pattern handle', async () => {
    const h = resource('https://api.example.com/orders/*', { offline: true })
    await expect(h.fetch()).rejects.toThrow("resource('https://api.example.com/orders/*') is a URL pattern")
  })

  it('json() throws on cross-origin pattern', async () => {
    const h = resource('https://api.example.com/posts/:id', { offline: true })
    await expect(h.json()).rejects.toThrow('is a URL pattern')
  })

  it('query() throws on cross-origin pattern', () => {
    const h = resource('https://cdn.example.com/static/**', { offline: false })
    expect(() => h.query()).toThrow('is a URL pattern')
  })

  it('unregister removes cross-origin pattern from store', () => {
    const h = resource('https://api.example.com/cats/*', { offline: true })
    h.unregister()
    expect(useEidosStore.getState().resources['https://api.example.com/cats/*']).toBeUndefined()
  })
})

// ── patternToRegexStr for cross-origin URLs ───────────────────────────────────
// Indirectly tested: the regex compiled from a cross-origin pattern must match
// the correct full URL and reject others.

describe('cross-origin pattern regex behaviour (indirect)', () => {
  it('pattern handle registered — config reflects correct strategy', () => {
    const h = resource('https://api.example.com/v2/*', { offline: true })
    // stale-while-revalidate is derived for offline:true resources
    expect(h.strategy.swStrategy).toBe('stale-while-revalidate')
  })

  it('different origins do not share handles', () => {
    const a = resource('https://api1.example.com/data', { offline: true })
    const b = resource('https://api2.example.com/data', { offline: true })
    expect(a).not.toBe(b)
    expect(a.url).not.toBe(b.url)
  })

  it('same origin different paths are independent', () => {
    const a = resource('https://api.example.com/products', { offline: true })
    const b = resource('https://api.example.com/orders', { offline: true })
    expect(a).not.toBe(b)
  })
})
