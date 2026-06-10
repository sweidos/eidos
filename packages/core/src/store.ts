import type { EidosState, ResourceEntry, ActionQueueItem } from './types';

export interface EidosStore extends EidosState {
  // Online
  setOnline: (online: boolean) => void;
  // SW
  setSwStatus: (status: EidosState['swStatus'], error?: string) => void;
  // Resources
  registerResource: (url: string, entry: ResourceEntry) => void;
  updateResource: (url: string, update: Partial<ResourceEntry>) => void;
  unregisterResource: (url: string) => void;
  // Queue
  addQueueItem: (item: ActionQueueItem) => void;
  updateQueueItem: (id: string, update: Partial<ActionQueueItem>) => void;
  batchUpdateQueueItems: (updates: Array<{ id: string; update: Partial<ActionQueueItem> }>) => void;
  removeQueueItem: (id: string) => void;
  hydrateQueue: (items: ActionQueueItem[]) => void;
}

type Listener = () => void;

let _state: EidosStore;
const _listeners = new Set<Listener>();

function _notify() {
  _listeners.forEach((fn) => fn());
}

function _set(updater: (prev: EidosStore) => Partial<EidosStore>) {
  _state = { ..._state, ...updater(_state) };
  _notify();
}

_state = {
  // navigator.onLine is undefined in React Native — default to true unless explicitly false
  isOnline: typeof navigator === 'undefined' || navigator.onLine !== false,
  swStatus: 'idle',
  swError: undefined,
  resources: {},
  queue: [],

  setOnline: (isOnline) => _set(() => ({ isOnline })),

  setSwStatus: (swStatus, swError) => _set(() => ({ swStatus, swError })),

  registerResource: (url, entry) => _set((s) => ({ resources: { ...s.resources, [url]: entry } })),

  updateResource: (url, update) =>
    _set((s) => ({
      resources: {
        ...s.resources,
        [url]: s.resources[url] ? { ...s.resources[url], ...update } : s.resources[url],
      },
    })),

  unregisterResource: (url) =>
    _set((s) => ({
      resources: Object.fromEntries(Object.entries(s.resources).filter(([k]) => k !== url)),
    })),

  addQueueItem: (item) => _set((s) => ({ queue: [...s.queue, item] })),

  updateQueueItem: (id, update) =>
    _set((s) => ({
      queue: s.queue.map((item) => (item.id === id ? { ...item, ...update } : item)),
    })),

  batchUpdateQueueItems: (updates) =>
    _set((s) => {
      const map = new Map(updates.map((u) => [u.id, u.update]));
      return {
        queue: s.queue.map((item) => {
          const u = map.get(item.id);
          return u ? { ...item, ...u } : item;
        }),
      };
    }),

  removeQueueItem: (id) => _set((s) => ({ queue: s.queue.filter((item) => item.id !== id) })),

  hydrateQueue: (items) => _set(() => ({ queue: items })),
};

function _getState() {
  return _state;
}

function _subscribe(listener: Listener) {
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
}

export const useEidosStore = {
  getState: _getState,
  subscribe: _subscribe,
  // Test/devtools helper — merges partial state, preserves action methods.
  setState: (partial: Partial<EidosStore> | ((s: EidosStore) => Partial<EidosStore>)) => {
    const update = typeof partial === 'function' ? partial(_state) : partial;
    _state = { ..._state, ...update };
    _notify();
  },
};
