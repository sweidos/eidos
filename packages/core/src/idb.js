const DB_NAME = 'eidos';
const DB_VERSION = 1;
const QUEUE_STORE = 'action-queue';
let _db = null;
function openDB() {
    if (_db)
        return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (event) => {
            const db = event.target.result;
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
export async function idbAddToQueue(item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(QUEUE_STORE, 'readwrite');
        tx.objectStore(QUEUE_STORE).add(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
export async function idbGetQueue() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(QUEUE_STORE, 'readonly');
        const req = tx.objectStore(QUEUE_STORE).getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
export async function idbUpdateQueueItem(id, update) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(QUEUE_STORE, 'readwrite');
        const store = tx.objectStore(QUEUE_STORE);
        const get = store.get(id);
        get.onsuccess = () => {
            if (get.result)
                store.put({ ...get.result, ...update });
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
export async function idbRemoveFromQueue(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(QUEUE_STORE, 'readwrite');
        tx.objectStore(QUEUE_STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
export async function idbClearQueue() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(QUEUE_STORE, 'readwrite');
        tx.objectStore(QUEUE_STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
