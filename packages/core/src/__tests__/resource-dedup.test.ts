import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resource } from '../resource'
import { useEidosStore } from '../store'

// ── helpers ───────────────────────────────────────────────────────────────────

function makeResponse(body = '{"ok":true}'): Response {
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function resetState() {
  useEidosStore.setState({
    isOnline: true,
    swStatus: 'active',
    swError: undefined,
    resources: {},
    queue: [],
  })
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('request deduplication', () => {
  beforeEach(() => {
    resetState()
    vi.clearAllMocks()
  })

  it('concurrent fetch() calls share one network request', async () => {
    // Resolves immediately — all three calls hit the dedup map before
    // the first's cache-check microtask clears the inflight entry.
    globalThis.fetch = vi.fn().mockResolvedValue(makeResponse())
    const h = resource('/api/dedup-concurrent', { offline: true, strategy: 'cache-first' })

    const [r1, r2, r3] = await Promise.all([h.fetch(), h.fetch(), h.fetch()])

    // Only one network request despite three concurrent calls
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    expect(r1).toBeInstanceOf(Response)
    expect(r2).toBeInstanceOf(Response)
    expect(r3).toBeInstanceOf(Response)
  })

  it('each caller gets an independent readable Response body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(makeResponse('{"value":42}'))
    const h = resource('/api/dedup-body', { offline: true, strategy: 'cache-first' })

    const [r1, r2] = await Promise.all([h.fetch(), h.fetch()])

    // Both bodies should be readable independently (no "body already used" error)
    const [d1, d2] = await Promise.all([r1.json(), r2.json()])
    expect(d1).toEqual({ value: 42 })
    expect(d2).toEqual({ value: 42 })
  })

  it('sequential fetches after first settles each check the cache first', async () => {
    // Use cache-first to avoid SWR background-revalidation making a second fetch call.
    globalThis.fetch = vi.fn().mockResolvedValue(makeResponse())
    const h = resource('/api/dedup-seq', { offline: true, strategy: 'cache-first' })

    await h.fetch() // cache miss → one network call, populates cache
    await h.fetch() // cache hit → no network call

    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('dedup map is cleared after the request settles — new batch makes a fresh call', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(makeResponse())
    const h = resource('/api/dedup-map-cleanup', { offline: true, strategy: 'cache-first' })

    // First batch — shares one network call
    await Promise.all([h.fetch(), h.fetch()])
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)

    // Cache is now populated; second single fetch hits the cache — still 1 total
    await h.fetch()
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })
})
