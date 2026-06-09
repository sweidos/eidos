import { describe, it, expect, vi, beforeEach } from 'vitest'
import { action, replayQueue } from '../action'
import { useEidosStore } from '../store'
import { idbClearQueue, idbGetQueue } from '../idb'

beforeEach(async () => {
  useEidosStore.setState({ isOnline: true, swStatus: 'idle', resources: {}, queue: [] })
  await idbClearQueue()
  vi.clearAllMocks()
})

// ── best-effort ───────────────────────────────────────────────────────────────

describe('best-effort', () => {
  it('calls fn directly and returns result', async () => {
    const fn = vi.fn().mockResolvedValue({ id: 'ok' })
    const wrapped = action(fn, { reliability: 'best-effort', name: 'bf-test' })
    const result = await wrapped('arg1')
    expect(fn).toHaveBeenCalledWith('arg1')
    expect(result).toEqual({ id: 'ok' })
  })

  it('propagates error without queuing', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('boom'))
    const wrapped = action(fn, { reliability: 'best-effort', name: 'bf-err' })
    await expect(wrapped()).rejects.toThrow('boom')
    const queue = await idbGetQueue()
    expect(queue).toHaveLength(0)
  })

  it('calls onOptimistic before fn', async () => {
    const order: string[] = []
    const fn = vi.fn().mockImplementation(async () => { order.push('fn'); return {} })
    const onOptimistic = vi.fn().mockImplementation(() => order.push('optimistic'))
    const wrapped = action(fn, { reliability: 'best-effort', name: 'bf-optimistic', onOptimistic })
    await wrapped('arg1')
    expect(onOptimistic).toHaveBeenCalledWith('arg1')
    expect(order).toEqual(['optimistic', 'fn'])
  })

  it('calls onRollback with args on throw', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'))
    const onOptimistic = vi.fn()
    const onRollback = vi.fn()
    const wrapped = action(fn, { reliability: 'best-effort', name: 'bf-rollback', onOptimistic, onRollback })
    await expect(wrapped('payload')).rejects.toThrow('fail')
    expect(onOptimistic).toHaveBeenCalledWith('payload')
    expect(onRollback).toHaveBeenCalledWith('payload')
  })

  it('does not call onRollback on success', async () => {
    const fn = vi.fn().mockResolvedValue({})
    const onRollback = vi.fn()
    const wrapped = action(fn, { reliability: 'best-effort', name: 'bf-no-rollback', onRollback })
    await wrapped('x')
    expect(onRollback).not.toHaveBeenCalled()
  })
})

// ── neverLose — online path ───────────────────────────────────────────────────

describe('neverLose online', () => {
  it('calls fn and returns result when online', async () => {
    const fn = vi.fn().mockResolvedValue({ id: 'order-1' })
    const wrapped = action(fn, { reliability: 'neverLose', name: 'nl-online' })
    const result = await wrapped({ qty: 1 })
    expect(fn).toHaveBeenCalledWith({ qty: 1 })
    expect(result).toEqual({ id: 'order-1' })
  })

  it('queues to IDB when online fn throws', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('server error'))
    const wrapped = action(fn, { reliability: 'neverLose', name: 'nl-online-fail' })
    const result = await wrapped({ qty: 2 })
    expect(result).toMatchObject({ queued: true })
    const queue = await idbGetQueue()
    expect(queue).toHaveLength(1)
    expect(queue[0].actionName).toBe('nl-online-fail')
  })
})

// ── neverLose — offline path ──────────────────────────────────────────────────

describe('neverLose offline', () => {
  beforeEach(() => {
    useEidosStore.setState({ isOnline: false, swStatus: 'active', resources: {}, queue: [] })
  })

  it('returns QueuedResult without calling fn', async () => {
    const fn = vi.fn().mockResolvedValue({ id: 'should-not-call' })
    const wrapped = action(fn, { reliability: 'neverLose', name: 'nl-offline' })
    const result = await wrapped({ qty: 3 })
    expect(fn).not.toHaveBeenCalled()
    expect(result).toMatchObject({ queued: true, id: expect.any(String) })
  })

  it('persists args to IDB', async () => {
    const fn = vi.fn()
    const wrapped = action(fn, { reliability: 'neverLose', name: 'nl-persist' })
    await wrapped({ productId: 5, qty: 2 })
    const queue = await idbGetQueue()
    expect(queue).toHaveLength(1)
    expect(queue[0].args).toEqual([{ productId: 5, qty: 2 }])
    expect(queue[0].status).toBe('pending')
    expect(queue[0].maxRetries).toBe(3)
  })

  it('respects custom maxRetries', async () => {
    const fn = vi.fn()
    const wrapped = action(fn, { reliability: 'neverLose', name: 'nl-retries', maxRetries: 10 })
    await wrapped()
    const queue = await idbGetQueue()
    expect(queue[0].maxRetries).toBe(10)
  })

  it('updates Zustand store queue', async () => {
    const fn = vi.fn()
    const wrapped = action(fn, { reliability: 'neverLose', name: 'nl-store' })
    await wrapped('x')
    const storeQueue = useEidosStore.getState().queue
    expect(storeQueue).toHaveLength(1)
    expect(storeQueue[0].status).toBe('pending')
  })
})

// ── optimistic + rollback (neverLose) ─────────────────────────────────────────

describe('neverLose optimistic / rollback', () => {
  it('calls onOptimistic immediately when offline', async () => {
    useEidosStore.setState({ isOnline: false, swStatus: 'active', resources: {}, queue: [] })
    const fn = vi.fn()
    const onOptimistic = vi.fn()
    const wrapped = action(fn, { reliability: 'neverLose', name: 'nl-opt-offline', onOptimistic })
    await wrapped({ id: 1 })
    expect(onOptimistic).toHaveBeenCalledWith({ id: 1 })
    expect(fn).not.toHaveBeenCalled()
  })

  it('calls onOptimistic before fn when online', async () => {
    const order: string[] = []
    const fn = vi.fn().mockImplementation(async () => { order.push('fn'); return {} })
    const onOptimistic = vi.fn().mockImplementation(() => order.push('optimistic'))
    const wrapped = action(fn, { reliability: 'neverLose', name: 'nl-opt-online', onOptimistic })
    await wrapped('x')
    expect(order).toEqual(['optimistic', 'fn'])
  })

  it('calls onRollback when maxRetries exhausted during replay', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))
    const onRollback = vi.fn()
    const wrapped = action(fn, { reliability: 'neverLose', name: 'nl-rollback', maxRetries: 1, onRollback })

    useEidosStore.setState({ isOnline: false, swStatus: 'active', resources: {}, queue: [] })
    await wrapped('payload')

    useEidosStore.setState({ isOnline: true })
    await replayQueue()

    expect(onRollback).toHaveBeenCalledWith('payload')
  })

  it('does not call onRollback when replay succeeds', async () => {
    const fn = vi.fn().mockResolvedValue({ ok: true })
    const onRollback = vi.fn()
    const wrapped = action(fn, { reliability: 'neverLose', name: 'nl-no-rollback', onRollback })

    useEidosStore.setState({ isOnline: false, swStatus: 'active', resources: {}, queue: [] })
    await wrapped('data')

    useEidosStore.setState({ isOnline: true })
    await replayQueue()

    expect(onRollback).not.toHaveBeenCalled()
  })

  it('does not call onRollback when online fn fails but queued for retry', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('server error'))
    const onRollback = vi.fn()
    const wrapped = action(fn, { reliability: 'neverLose', name: 'nl-queue-no-rollback', onRollback })
    await wrapped('data')
    expect(onRollback).not.toHaveBeenCalled()
  })
})

// ── replayQueue ───────────────────────────────────────────────────────────────

describe('replayQueue', () => {
  it('no-ops when offline', async () => {
    useEidosStore.setState({ isOnline: false, swStatus: 'active', resources: {}, queue: [] })
    const fn = vi.fn().mockResolvedValue({})
    const wrapped = action(fn, { reliability: 'neverLose', name: 'rq-offline-guard' })

    // Queue something first (while offline)
    await wrapped('data')

    // replayQueue should bail early
    await replayQueue()
    expect(fn).not.toHaveBeenCalled()
  })

  it('replays pending items when online', async () => {
    const fn = vi.fn().mockResolvedValue({ ok: true })
    const wrapped = action(fn, { reliability: 'neverLose', name: 'rq-replay' })

    // Queue while offline
    useEidosStore.setState({ isOnline: false, swStatus: 'active', resources: {}, queue: [] })
    await wrapped('payload')

    // Come back online and replay
    useEidosStore.setState({ isOnline: true })
    await replayQueue()

    expect(fn).toHaveBeenCalledWith('payload')
  })

  it('skips items with nextRetryAt in the future', async () => {
    const fn = vi.fn().mockResolvedValue({})
    const wrapped = action(fn, { reliability: 'neverLose', name: 'rq-backoff-skip' })

    useEidosStore.setState({ isOnline: false, swStatus: 'active', resources: {}, queue: [] })
    await wrapped('data')

    // Manually set nextRetryAt to the future
    const queue = await idbGetQueue()
    const { idbUpdateQueueItem } = await import('../idb')
    await idbUpdateQueueItem(queue[0].id, { nextRetryAt: Date.now() + 60_000 })
    useEidosStore.getState().updateQueueItem(queue[0].id, { nextRetryAt: Date.now() + 60_000 })

    useEidosStore.setState({ isOnline: true })
    await replayQueue()

    // fn should NOT have been called — backoff not expired
    expect(fn).not.toHaveBeenCalled()
  })

  it('marks item failed after maxRetries exceeded', async () => {
    let calls = 0
    const fn = vi.fn().mockImplementation(async () => {
      calls++
      throw new Error('always fails')
    })
    const wrapped = action(fn, { reliability: 'neverLose', name: 'rq-max-retries', maxRetries: 1 })

    useEidosStore.setState({ isOnline: false, swStatus: 'active', resources: {}, queue: [] })
    await wrapped('x')

    useEidosStore.setState({ isOnline: true })

    // First replay — retryCount goes to 1 = maxRetries, status → failed
    await replayQueue()

    const queue = await idbGetQueue()
    const item = queue.find(q => q.actionName === 'rq-max-retries')
    expect(item?.status).toBe('failed')
    expect(item?.retryCount).toBe(1)
  })
})

// ── priority ──────────────────────────────────────────────────────────────────

describe('priority', () => {
  it('stores priority in queue item (default: normal)', async () => {
    const fn = vi.fn()
    const wrapped = action(fn, { reliability: 'neverLose', name: 'prio-default' })
    useEidosStore.setState({ isOnline: false, swStatus: 'active', resources: {}, queue: [] })
    await wrapped('x')
    const queue = await idbGetQueue()
    expect(queue[0].priority).toBe('normal')
  })

  it('stores explicit priority in queue item', async () => {
    const fn = vi.fn()
    const high = action(fn, { reliability: 'neverLose', name: 'prio-high', priority: 'high' })
    const low = action(fn, { reliability: 'neverLose', name: 'prio-low', priority: 'low' })
    useEidosStore.setState({ isOnline: false, swStatus: 'active', resources: {}, queue: [] })
    await high('h')
    await low('l')
    const queue = await idbGetQueue()
    expect(queue.find(i => i.actionName === 'prio-high')?.priority).toBe('high')
    expect(queue.find(i => i.actionName === 'prio-low')?.priority).toBe('low')
  })

  it('replays high before low — high items complete before low items start', async () => {
    const callOrder: string[] = []

    // low queued first, high queued second — high must still replay first
    const lowFn = vi.fn().mockImplementation(async () => { callOrder.push('low') })
    const highFn = vi.fn().mockImplementation(async () => { callOrder.push('high') })

    const lowAction = action(lowFn, { reliability: 'neverLose', name: 'prio-order-low', priority: 'low' })
    const highAction = action(highFn, { reliability: 'neverLose', name: 'prio-order-high', priority: 'high' })

    useEidosStore.setState({ isOnline: false, swStatus: 'active', resources: {}, queue: [] })
    await lowAction('l')
    await highAction('h')

    useEidosStore.setState({ isOnline: true })
    await replayQueue()

    // high must have been called, and its call index < low's call index
    expect(highFn).toHaveBeenCalled()
    expect(lowFn).toHaveBeenCalled()
    expect(callOrder.indexOf('high')).toBeLessThan(callOrder.indexOf('low'))
  })

  it('normal replays before low', async () => {
    const callOrder: string[] = []

    const normalFn = vi.fn().mockImplementation(async () => { callOrder.push('normal') })
    const lowFn = vi.fn().mockImplementation(async () => { callOrder.push('low') })

    action(normalFn, { reliability: 'neverLose', name: 'prio-nl-normal', priority: 'normal' })
    action(lowFn, { reliability: 'neverLose', name: 'prio-nl-low', priority: 'low' })

    // Queue low first, normal second
    useEidosStore.setState({ isOnline: false, swStatus: 'active', resources: {}, queue: [] })
    const normalWrapped = action(normalFn, { reliability: 'neverLose', name: 'prio-nl-normal', priority: 'normal' })
    const lowWrapped = action(lowFn, { reliability: 'neverLose', name: 'prio-nl-low', priority: 'low' })
    await lowWrapped('l')
    await normalWrapped('n')

    useEidosStore.setState({ isOnline: true })
    await replayQueue()

    expect(callOrder.indexOf('normal')).toBeLessThan(callOrder.indexOf('low'))
  })

  it('replayQueue result counts items across tiers', async () => {
    const succeedFn = vi.fn().mockResolvedValue({})
    const failFn = vi.fn().mockRejectedValue(new Error('fail'))

    const succeedAction = action(succeedFn, { reliability: 'neverLose', name: 'prio-count-succeed', priority: 'high' })
    const failAction = action(failFn, { reliability: 'neverLose', name: 'prio-count-fail', priority: 'low', maxRetries: 1 })

    useEidosStore.setState({ isOnline: false, swStatus: 'active', resources: {}, queue: [] })
    await succeedAction('s')
    await failAction('f')

    useEidosStore.setState({ isOnline: true })
    const result = await replayQueue()

    expect(result.attempted).toBe(2)
    expect(result.succeeded).toBe(1)
    expect(result.failed).toBe(1)
  })
})
