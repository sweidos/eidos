import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resource, warmCache } from '../resource'
import { useEidosStore } from '../store'

function makeResponse(body = '{"ok":true}'): Response {
  return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } })
}

function resetState() {
  useEidosStore.setState({ isOnline: true, swStatus: 'active', swError: undefined, resources: {}, queue: [] })
}

describe('warmCache', () => {
  beforeEach(() => {
    resetState()
    vi.clearAllMocks()
  })

  it('prefetches all handles concurrently and returns warmed count', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(makeResponse())

    const h1 = resource('/api/warm-a', { offline: true, strategy: 'cache-first' })
    const h2 = resource('/api/warm-b', { offline: true, strategy: 'cache-first' })
    const h3 = resource('/api/warm-c', { offline: true, strategy: 'cache-first' })

    const result = await warmCache([h1, h2, h3])

    expect(result.warmed).toBe(3)
    expect(result.failed).toBe(0)
    expect(result.errors).toHaveLength(0)
    expect(globalThis.fetch).toHaveBeenCalledTimes(3)
  })

  it('counts failed prefetches and collects errors', async () => {
    const err = new Error('network error')
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(makeResponse())  // h1 succeeds
      .mockRejectedValueOnce(err)             // h2 fails

    const h1 = resource('/api/warm-ok', { offline: true, strategy: 'cache-first' })
    const h2 = resource('/api/warm-fail', { offline: true, strategy: 'cache-first' })

    const result = await warmCache([h1, h2])

    expect(result.warmed).toBe(1)
    expect(result.failed).toBe(1)
    expect(result.errors).toHaveLength(1)
  })

  it('returns warmed=0 failed=0 for empty array', async () => {
    const result = await warmCache([])
    expect(result.warmed).toBe(0)
    expect(result.failed).toBe(0)
    expect(result.errors).toHaveLength(0)
  })

  it('all handles fail — warmed=0 failed=N', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline'))

    const h1 = resource('/api/warm-all-fail-1', { offline: true, strategy: 'cache-first' })
    const h2 = resource('/api/warm-all-fail-2', { offline: true, strategy: 'cache-first' })

    const result = await warmCache([h1, h2])

    expect(result.warmed).toBe(0)
    expect(result.failed).toBe(2)
    expect(result.errors).toHaveLength(2)
  })

  it('pattern handles throw — counted as failed', async () => {
    // prefetch() on a pattern handle throws synchronously with _patternError
    const h = resource('/api/warm-pattern/*', { offline: true })

    const result = await warmCache([h])

    expect(result.warmed).toBe(0)
    expect(result.failed).toBe(1)
  })
})
