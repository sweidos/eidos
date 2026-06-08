import { describe, it, expect, beforeEach } from 'vitest'
import { useEidosStore } from '../store'
import type { ResourceEntry, ActionQueueItem } from '../types'

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

// ── Online / SW status ─────────────────────────────────────────────────────────

describe('setOnline', () => {
  it('updates isOnline', () => {
    useEidosStore.getState().setOnline(false)
    expect(useEidosStore.getState().isOnline).toBe(false)
    useEidosStore.getState().setOnline(true)
    expect(useEidosStore.getState().isOnline).toBe(true)
  })
})

describe('setSwStatus', () => {
  it('sets status and error', () => {
    useEidosStore.getState().setSwStatus('error', 'registration failed')
    const s = useEidosStore.getState()
    expect(s.swStatus).toBe('error')
    expect(s.swError).toBe('registration failed')
  })

  it('clears error on new status', () => {
    useEidosStore.getState().setSwStatus('error', 'oops')
    useEidosStore.getState().setSwStatus('active')
    expect(useEidosStore.getState().swError).toBeUndefined()
  })
})

// ── Resources ─────────────────────────────────────────────────────────────────

const makeEntry = (url: string): ResourceEntry => ({
  url,
  config: { offline: true },
  strategy: {
    name: 'StaleWhileRevalidate',
    swStrategy: 'stale-while-revalidate',
    cacheName: 'eidos-resources-v1',
    reasoning: 'test',
    behavior: [],
    equivalentCode: '',
  },
  status: 'idle',
  cacheHits: 0,
  cacheMisses: 0,
})

describe('registerResource', () => {
  it('adds entry to resources map', () => {
    const entry = makeEntry('/api/products')
    useEidosStore.getState().registerResource('/api/products', entry)
    expect(useEidosStore.getState().resources['/api/products']).toEqual(entry)
  })
})

describe('updateResource', () => {
  it('merges partial update', () => {
    useEidosStore.getState().registerResource('/api/products', makeEntry('/api/products'))
    useEidosStore.getState().updateResource('/api/products', { status: 'fresh', cacheHits: 3 })
    const e = useEidosStore.getState().resources['/api/products']
    expect(e.status).toBe('fresh')
    expect(e.cacheHits).toBe(3)
    expect(e.url).toBe('/api/products') // unchanged fields preserved
  })

  it('no-op for unknown url', () => {
    useEidosStore.getState().updateResource('/api/missing', { status: 'fresh' })
    expect(useEidosStore.getState().resources['/api/missing']).toBeUndefined()
  })
})

describe('unregisterResource', () => {
  it('removes entry', () => {
    useEidosStore.getState().registerResource('/api/products', makeEntry('/api/products'))
    useEidosStore.getState().unregisterResource('/api/products')
    expect(useEidosStore.getState().resources['/api/products']).toBeUndefined()
  })

  it('does not affect other resources', () => {
    useEidosStore.getState().registerResource('/api/a', makeEntry('/api/a'))
    useEidosStore.getState().registerResource('/api/b', makeEntry('/api/b'))
    useEidosStore.getState().unregisterResource('/api/a')
    expect(useEidosStore.getState().resources['/api/b']).toBeDefined()
  })
})

// ── Action Queue ───────────────────────────────────────────────────────────────

const makeItem = (id: string): ActionQueueItem => ({
  id,
  actionId: 'testAction',
  actionName: 'testAction',
  args: [{ x: 1 }],
  queuedAt: Date.now(),
  retryCount: 0,
  maxRetries: 3,
  status: 'pending',
})

describe('addQueueItem', () => {
  it('appends item', () => {
    useEidosStore.getState().addQueueItem(makeItem('a'))
    useEidosStore.getState().addQueueItem(makeItem('b'))
    expect(useEidosStore.getState().queue).toHaveLength(2)
  })
})

describe('updateQueueItem', () => {
  it('merges partial update by id', () => {
    useEidosStore.getState().addQueueItem(makeItem('x'))
    useEidosStore.getState().updateQueueItem('x', { status: 'replaying', retryCount: 1 })
    const item = useEidosStore.getState().queue.find(q => q.id === 'x')
    expect(item?.status).toBe('replaying')
    expect(item?.retryCount).toBe(1)
    expect(item?.actionName).toBe('testAction') // unchanged
  })
})

describe('removeQueueItem', () => {
  it('removes by id', () => {
    useEidosStore.getState().addQueueItem(makeItem('del'))
    useEidosStore.getState().addQueueItem(makeItem('keep'))
    useEidosStore.getState().removeQueueItem('del')
    const ids = useEidosStore.getState().queue.map(q => q.id)
    expect(ids).not.toContain('del')
    expect(ids).toContain('keep')
  })
})

describe('hydrateQueue', () => {
  it('replaces entire queue', () => {
    useEidosStore.getState().addQueueItem(makeItem('old'))
    const hydrated = [makeItem('new1'), makeItem('new2')]
    useEidosStore.getState().hydrateQueue(hydrated)
    const ids = useEidosStore.getState().queue.map(q => q.id)
    expect(ids).toEqual(['new1', 'new2'])
  })
})

// ── useEidosQueueStats selector ───────────────────────────────────────────────

describe('useEidosQueueStats selector (via store)', () => {
  it('returns zero counts for empty queue', () => {
    const q = useEidosStore.getState().queue
    const pending   = q.filter((i) => i.status === 'pending').length
    const failed    = q.filter((i) => i.status === 'failed').length
    const replaying = q.filter((i) => i.status === 'replaying').length
    expect(pending).toBe(0)
    expect(failed).toBe(0)
    expect(replaying).toBe(0)
    expect(q.length).toBe(0)
  })

  it('counts pending and failed independently', () => {
    useEidosStore.getState().addQueueItem({ ...makeItem('p1'), status: 'pending' })
    useEidosStore.getState().addQueueItem({ ...makeItem('p2'), status: 'pending' })
    useEidosStore.getState().addQueueItem({ ...makeItem('f1'), status: 'failed' })
    useEidosStore.getState().addQueueItem({ ...makeItem('r1'), status: 'replaying' })

    const q = useEidosStore.getState().queue
    expect(q.filter((i) => i.status === 'pending').length).toBe(2)
    expect(q.filter((i) => i.status === 'failed').length).toBe(1)
    expect(q.filter((i) => i.status === 'replaying').length).toBe(1)
    expect(q.length).toBe(4)
  })

  it('total decreases when item removed', () => {
    useEidosStore.getState().addQueueItem(makeItem('rem'))
    expect(useEidosStore.getState().queue.length).toBe(1)
    useEidosStore.getState().removeQueueItem('rem')
    expect(useEidosStore.getState().queue.length).toBe(0)
  })
})

// ── useEidosAction selector ────────────────────────────────────────────────────

describe('useEidosAction selector (via store)', () => {
  it('returns the item with matching id', () => {
    useEidosStore.getState().addQueueItem(makeItem('alpha'))
    useEidosStore.getState().addQueueItem(makeItem('beta'))
    const item = useEidosStore.getState().queue.find((q) => q.id === 'alpha')
    expect(item?.id).toBe('alpha')
    expect(item?.actionName).toBe('testAction')
  })

  it('returns undefined for unknown id', () => {
    useEidosStore.getState().addQueueItem(makeItem('x'))
    const item = useEidosStore.getState().queue.find((q) => q.id === 'zzz')
    expect(item).toBeUndefined()
  })

  it('reflects item updates', () => {
    useEidosStore.getState().addQueueItem(makeItem('upd'))
    useEidosStore.getState().updateQueueItem('upd', { status: 'succeeded' })
    const item = useEidosStore.getState().queue.find((q) => q.id === 'upd')
    expect(item?.status).toBe('succeeded')
  })

  it('returns undefined after item is removed', () => {
    useEidosStore.getState().addQueueItem(makeItem('gone'))
    useEidosStore.getState().removeQueueItem('gone')
    const item = useEidosStore.getState().queue.find((q) => q.id === 'gone')
    expect(item).toBeUndefined()
  })
})
