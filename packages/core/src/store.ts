import { create } from 'zustand'
import type { VardiState, ResourceEntry, ActionQueueItem } from './types'

interface VardiStore extends VardiState {
  // Online
  setOnline: (online: boolean) => void
  // SW
  setSwStatus: (status: VardiState['swStatus'], error?: string) => void
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

export const useVardiStore = create<VardiStore>((set) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  swStatus: 'idle',
  swError: undefined,
  resources: {},
  queue: [],

  setOnline: (isOnline) => set({ isOnline }),

  setSwStatus: (swStatus, swError) => set({ swStatus, swError }),

  registerResource: (url, entry) =>
    set((s) => ({ resources: { ...s.resources, [url]: entry } })),

  updateResource: (url, update) =>
    set((s) => ({
      resources: {
        ...s.resources,
        [url]: s.resources[url] ? { ...s.resources[url], ...update } : s.resources[url],
      },
    })),

  unregisterResource: (url) =>
    set((s) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [url]: _removed, ...rest } = s.resources
      return { resources: rest }
    }),

  addQueueItem: (item) => set((s) => ({ queue: [...s.queue, item] })),

  updateQueueItem: (id, update) =>
    set((s) => ({
      queue: s.queue.map((item) => (item.id === id ? { ...item, ...update } : item)),
    })),

  removeQueueItem: (id) => set((s) => ({ queue: s.queue.filter((item) => item.id !== id) })),

  hydrateQueue: (items) => set({ queue: items }),
}))
