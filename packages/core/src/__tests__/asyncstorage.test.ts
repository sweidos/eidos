import { describe, it, expect, beforeEach } from 'vitest'
import { AsyncStorageQueueStorage } from '../async-storage-adapter'
import type { AsyncStorageLike } from '../async-storage-adapter'
import type { ActionQueueItem } from '../types'

function makeStore(): AsyncStorageLike {
  const db = new Map<string, string>()
  return {
    getItem: async (key) => db.get(key) ?? null,
    setItem: async (key, value) => { db.set(key, value) },
    removeItem: async (key) => { db.delete(key) },
  }
}

function makeItem(overrides: Partial<ActionQueueItem> = {}): ActionQueueItem {
  return {
    id: crypto.randomUUID(),
    actionId: 'test-action',
    actionName: 'testAction',
    args: [{ id: 1 }],
    queuedAt: Date.now(),
    retryCount: 0,
    maxRetries: 3,
    status: 'pending',
    priority: 'normal',
    ...overrides,
  }
}

describe('AsyncStorageQueueStorage', () => {
  let storage: AsyncStorageQueueStorage

  beforeEach(() => {
    storage = new AsyncStorageQueueStorage(makeStore())
  })

  it('add + getAll — round-trips an item', async () => {
    const item = makeItem()
    await storage.add(item)
    const all = await storage.getAll()
    expect(all).toHaveLength(1)
    expect(all[0]).toEqual(item)
  })

  it('add multiple items and getAll returns all', async () => {
    const a = makeItem()
    const b = makeItem()
    await storage.add(a)
    await storage.add(b)
    const all = await storage.getAll()
    expect(all).toHaveLength(2)
    expect(all.map((i) => i.id)).toContain(a.id)
    expect(all.map((i) => i.id)).toContain(b.id)
  })

  it('getPending returns only pending and failed items', async () => {
    const pending = makeItem({ status: 'pending' })
    const failed = makeItem({ status: 'failed' })
    const succeeded = makeItem({ status: 'succeeded' })
    await storage.add(pending)
    await storage.add(failed)
    await storage.add(succeeded)

    const result = await storage.getPending()
    expect(result).toHaveLength(2)
    expect(result.map((i) => i.id)).toContain(pending.id)
    expect(result.map((i) => i.id)).toContain(failed.id)
    expect(result.map((i) => i.id)).not.toContain(succeeded.id)
  })

  it('update patches an existing item', async () => {
    const item = makeItem()
    await storage.add(item)
    await storage.update(item.id, { status: 'succeeded', retryCount: 1 })
    const all = await storage.getAll()
    expect(all[0].status).toBe('succeeded')
    expect(all[0].retryCount).toBe(1)
    expect(all[0].actionId).toBe(item.actionId)
  })

  it('update ignores unknown id', async () => {
    const item = makeItem()
    await storage.add(item)
    await storage.update('nonexistent', { status: 'failed' })
    const all = await storage.getAll()
    expect(all[0].status).toBe('pending')
  })

  it('remove deletes by id', async () => {
    const a = makeItem()
    const b = makeItem()
    await storage.add(a)
    await storage.add(b)
    await storage.remove(a.id)
    const all = await storage.getAll()
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe(b.id)
  })

  it('clear empties the storage', async () => {
    await storage.add(makeItem())
    await storage.add(makeItem())
    await storage.clear()
    const all = await storage.getAll()
    expect(all).toHaveLength(0)
  })

  it('getAll returns [] when storage is empty', async () => {
    const all = await storage.getAll()
    expect(all).toEqual([])
  })

  it('handles corrupt stored data gracefully', async () => {
    const raw: AsyncStorageLike = {
      getItem: async () => 'not-valid-json{{{',
      setItem: async () => {},
      removeItem: async () => {},
    }
    const s = new AsyncStorageQueueStorage(raw)
    const all = await s.getAll()
    expect(all).toEqual([])
  })
})
