import type { ActionQueueItem } from './types'

const DB_NAME = 'eidos'
const DB_VERSION = 1
const QUEUE_STORE = 'action-queue'

let _db: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const store = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' })
        store.createIndex('status', 'status', { unique: false })
        store.createIndex('actionId', 'actionId', { unique: false })
      }
    }

    req.onsuccess = () => {
      _db = req.result
      resolve(req.result)
    }

    req.onerror = () => reject(req.error)
  })
}

export async function idbAddToQueue(item: ActionQueueItem): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite')
    tx.objectStore(QUEUE_STORE).add(item)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function idbGetQueue(): Promise<ActionQueueItem[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readonly')
    const req = tx.objectStore(QUEUE_STORE).getAll()
    req.onsuccess = () => resolve(req.result as ActionQueueItem[])
    req.onerror = () => reject(req.error)
  })
}

export async function idbUpdateQueueItem(
  id: string,
  update: Partial<ActionQueueItem>,
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite')
    const store = tx.objectStore(QUEUE_STORE)
    const get = store.get(id)
    get.onsuccess = () => {
      if (get.result) {
        store.put({ ...get.result, ...update })
      } else if (import.meta.env.DEV) {
        console.warn(`[eidos] idbUpdateQueueItem: item "${id}" not found — store/IDB may have diverged`)
      }
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function idbRemoveFromQueue(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite')
    tx.objectStore(QUEUE_STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Uses the status index to fetch only pending/failed items — avoids a full
// table scan when the queue has many succeeded/replaying entries.
export async function idbGetPendingItems(): Promise<ActionQueueItem[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readonly')
    const index = tx.objectStore(QUEUE_STORE).index('status')
    const results: ActionQueueItem[] = []

    let done = 0
    function finish(err?: DOMException | null) {
      if (err) { reject(err); return }
      if (++done === 2) resolve(results)
    }

    const pendingReq = index.openCursor(IDBKeyRange.only('pending'))
    pendingReq.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result
      if (cursor) { results.push(cursor.value as ActionQueueItem); cursor.continue() }
      else finish()
    }
    pendingReq.onerror = () => finish(pendingReq.error)

    const failedReq = index.openCursor(IDBKeyRange.only('failed'))
    failedReq.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result
      if (cursor) { results.push(cursor.value as ActionQueueItem); cursor.continue() }
      else finish()
    }
    failedReq.onerror = () => finish(failedReq.error)
  })
}

export async function idbClearQueue(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite')
    tx.objectStore(QUEUE_STORE).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
