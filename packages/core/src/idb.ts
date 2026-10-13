import type { ActionQueueItem } from './types';
import type { QueueStorage } from './queue-storage';

const DB_NAME = 'eidos';
const DB_VERSION = 1;
const QUEUE_STORE = 'action-queue';

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const store = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('actionId', 'actionId', { unique: false });
      }
    };

    req.onsuccess = () => {
      _db = req.result;
      resolve(req.result);
    };

    req.onerror = () => reject(req.error);
  });
}

export async function idbAddToQueue(item: ActionQueueItem): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).add(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGetQueue(): Promise<ActionQueueItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readonly');
    const req = tx.objectStore(QUEUE_STORE).getAll();
    req.onsuccess = () => resolve(req.result as ActionQueueItem[]);
    req.onerror = () => reject(req.error);
  });
}

export async function idbUpdateQueueItem(
  id: string,
  update: Partial<ActionQueueItem>,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    const get = store.get(id);
    get.onsuccess = () => {
      if (get.result) {
        store.put({ ...get.result, ...update });
      } else if (import.meta.env.DEV) {
        console.warn(
          `[eidos] idbUpdateQueueItem: item "${id}" not found — store/IDB may have diverged`,
        );
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbRemoveFromQueue(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Default lease length for in-flight replay ownership (see recoverStaleReplaying). */
export const REPLAY_LEASE_MS = 60_000;

/**
 * Recover items whose replay lease expired (or never had one — pre-lease data).
 * Live leases are left alone so another tab mid-replay is not stolen.
 */
export function recoverStaleReplaying(
  item: ActionQueueItem,
  now: number = Date.now(),
): ActionQueueItem {
  if (item.status !== 'replaying') return item;
  if (item.replayLeaseUntil != null && item.replayLeaseUntil > now) return item;
  return {
    ...item,
    status: 'pending',
    replayOwnerId: undefined,
    replayLeaseUntil: undefined,
  };
}

// Uses the status index to fetch pending/failed items, plus replaying items
// whose lease expired (crash recovery without stealing a live owner).
export async function idbGetPendingItems(): Promise<ActionQueueItem[]> {
  const db = await openDB();

  function cursorToArray(status: string): Promise<ActionQueueItem[]> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly');
      const index = tx.objectStore(QUEUE_STORE).index('status');
      const items: ActionQueueItem[] = [];
      const req = index.openCursor(IDBKeyRange.only(status));
      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          items.push(cursor.value as ActionQueueItem);
          cursor.continue();
        } else resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  }

  const now = Date.now();
  const [pending, failed, replaying] = await Promise.all([
    cursorToArray('pending'),
    cursorToArray('failed'),
    cursorToArray('replaying'),
  ]);
  const recovered = replaying
    .map((item) => recoverStaleReplaying(item, now))
    .filter((item) => item.status === 'pending');
  return [...pending, ...failed, ...recovered];
}

export async function idbClearQueue(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** IndexedDB-backed QueueStorage implementation (default for browser environments). */
export const idbQueueStorage: QueueStorage = {
  add: idbAddToQueue,
  getAll: idbGetQueue,
  getPending: idbGetPendingItems,
  update: idbUpdateQueueItem,
  remove: idbRemoveFromQueue,
  clear: idbClearQueue,
};
