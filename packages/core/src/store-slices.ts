import type { ResourceEntry, ActionQueueItem, ReliabilityStats } from './types';
import { emptyReliabilityStats } from './types';
import type { EidosStore } from './store';

type Setter = (updater: (prev: EidosStore) => Partial<EidosStore>) => void;

// ── Resource slice ────────────────────────────────────────────────────────────

export interface ResourceActions {
  registerResource: (url: string, entry: ResourceEntry) => void;
  updateResource: (url: string, update: Partial<ResourceEntry>) => void;
  unregisterResource: (url: string) => void;
}

export function createResourceActions(set: Setter): ResourceActions {
  return {
    registerResource: (url, entry) => set((s) => ({ resources: { ...s.resources, [url]: entry } })),

    updateResource: (url, update) =>
      set((s) => ({
        resources: {
          ...s.resources,
          [url]: s.resources[url] ? { ...s.resources[url], ...update } : s.resources[url],
        },
      })),

    unregisterResource: (url) =>
      set((s) => ({
        resources: Object.fromEntries(Object.entries(s.resources).filter(([k]) => k !== url)),
      })),
  };
}

// ── Queue slice ───────────────────────────────────────────────────────────────

export interface QueueActions {
  addQueueItem: (item: ActionQueueItem) => void;
  updateQueueItem: (id: string, update: Partial<ActionQueueItem>) => void;
  batchUpdateQueueItems: (updates: Array<{ id: string; update: Partial<ActionQueueItem> }>) => void;
  removeQueueItem: (id: string) => void;
  hydrateQueue: (items: ActionQueueItem[]) => void;
}

export function createQueueActions(set: Setter): QueueActions {
  return {
    addQueueItem: (item) => set((s) => ({ queue: [...s.queue, item] })),

    updateQueueItem: (id, update) =>
      set((s) => ({
        queue: s.queue.map((item) => (item.id === id ? { ...item, ...update } : item)),
      })),

    batchUpdateQueueItems: (updates) =>
      set((s) => {
        const map = new Map(updates.map((u) => [u.id, u.update]));
        return {
          queue: s.queue.map((item) => {
            const u = map.get(item.id);
            return u ? { ...item, ...u } : item;
          }),
        };
      }),

    removeQueueItem: (id) => set((s) => ({ queue: s.queue.filter((item) => item.id !== id) })),

    hydrateQueue: (items) => set(() => ({ queue: items })),
  };
}

// ── Reliability slice ─────────────────────────────────────────────────────────

export interface ReliabilityActions {
  recordReliabilityEvent: (event: keyof ReliabilityStats) => void;
  resetReliabilityStats: () => void;
}

export function createReliabilityActions(set: Setter): ReliabilityActions {
  return {
    recordReliabilityEvent: (event) =>
      set((s) => ({ reliability: { ...s.reliability, [event]: s.reliability[event] + 1 } })),

    resetReliabilityStats: () => set(() => ({ reliability: emptyReliabilityStats() })),
  };
}
