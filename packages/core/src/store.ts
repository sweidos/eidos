import { useSyncExternalStore } from 'react'
import type { EidosState, ResourceEntry, ActionQueueItem } from './types'

export interface EidosStore extends EidosState {
  // Online
  setOnline: (online: boolean) => void
  // SW
  setSwStatus: (status: EidosState['swStatus'], error?: string) => void
  // Resources
  registerResource: (url: string, entry: ResourceEntry) => void
  updateResource: (url: string, update: Partial<ResourceEntry>) => void
  unregisterResource: (url: string) => void
  // Queue
  addQueueItem: (item: ActionQueueItem) => void
  updateQueueItem: (id: string, update: Partial<ActionQueueItem>) => void
  removeQueueItem: (id: string) => void
  hydrateQueue: (items: ActionQueueItem[]) => void
}

type Listener = () => void

let _state: EidosStore
const _listeners = new Set<Listener>()

function _notify() {
  _listeners.forEach((fn) => fn())
}

function _set(updater: (prev: EidosStore) => Partial<EidosStore>) {
  _state = { ..._state, ...updater(_state) }
  _notify()
}

_state = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  swStatus: 'idle',
  swError: undefined,
  resources: {},
  queue: [],

  setOnline: (isOnline) => _set(() => ({ isOnline })),

  setSwStatus: (swStatus, swError) => _set(() => ({ swStatus, swError })),

  registerResource: (url, entry) =>
    _set((s) => ({ resources: { ...s.resources, [url]: entry } })),

  updateResource: (url, update) =>
    _set((s) => ({
      resources: {
        ...s.resources,
        [url]: s.resources[url] ? { ...s.resources[url], ...update } : s.resources[url],
      },
    })),

  unregisterResource: (url) =>
    _set((s) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [url]: _removed, ...rest } = s.resources
      return { resources: rest }
    }),

  addQueueItem: (item) => _set((s) => ({ queue: [...s.queue, item] })),

  updateQueueItem: (id, update) =>
    _set((s) => ({
      queue: s.queue.map((item) => (item.id === id ? { ...item, ...update } : item)),
    })),

  removeQueueItem: (id) => _set((s) => ({ queue: s.queue.filter((item) => item.id !== id) })),

  hydrateQueue: (items) => _set(() => ({ queue: items })),
}

function _getState() {
  return _state
}

function _subscribe(listener: Listener) {
  _listeners.add(listener)
  return () => { _listeners.delete(listener) }
}

// useSyncExternalStore-based hook — drop-in replacement for zustand's useStore.
// Supports both bare call (full state) and selector call.
function _useStore(): EidosStore
function _useStore<T>(selector: (state: EidosStore) => T): T
function _useStore<T = EidosStore>(selector?: (state: EidosStore) => T): T {
  const fn = selector ?? ((s: EidosStore) => s as unknown as T)
  return useSyncExternalStore(_subscribe, () => fn(_getState()))
}

_useStore.getState = _getState
_useStore.subscribe = _subscribe

// Test/devtools helper — merges partial state, preserves action methods.
_useStore.setState = (partial: Partial<EidosStore> | ((s: EidosStore) => Partial<EidosStore>)) => {
  const update = typeof partial === 'function' ? partial(_state) : partial
  _state = { ..._state, ...update }
  _notify()
}

export const useEidosStore = _useStore
