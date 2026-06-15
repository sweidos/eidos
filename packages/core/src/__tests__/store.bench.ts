import { bench, describe } from 'vitest';
import { useEidosStore } from '../store';
import type { ActionQueueItem, ResourceEntry } from '../types';
import { emptyReliabilityStats } from '../types';

function makeResourceEntry(url: string): ResourceEntry {
  return {
    url,
    config: {},
    strategy: {
      name: 'NetworkFirst',
      swStrategy: 'network-first',
      cacheName: 'eidos-resources-v1',
      reasoning: '',
      behavior: [],
      equivalentCode: '',
    },
    status: 'idle',
    cacheHits: 0,
    cacheMisses: 0,
  };
}

function makeQueueItem(id: string): ActionQueueItem {
  return {
    schemaVersion: 1,
    id,
    actionId: 'demo',
    actionName: 'demo',
    idempotencyKey: id,
    args: [],
    queuedAt: Date.now(),
    retryCount: 0,
    maxRetries: 3,
    status: 'pending',
    priority: 'normal',
  };
}

function resetStore() {
  useEidosStore.setState(() => ({
    resources: {},
    queue: [],
    reliability: emptyReliabilityStats(),
  }));
}

describe('resource slice', () => {
  bench('registerResource x500', () => {
    resetStore();
    const store = useEidosStore.getState();
    for (let i = 0; i < 500; i++) {
      store.registerResource(`/api/item-${i}`, makeResourceEntry(`/api/item-${i}`));
    }
  });

  bench('updateResource on 500-entry store', () => {
    resetStore();
    const store = useEidosStore.getState();
    for (let i = 0; i < 500; i++) {
      store.registerResource(`/api/item-${i}`, makeResourceEntry(`/api/item-${i}`));
    }
    for (let i = 0; i < 500; i++) {
      store.updateResource(`/api/item-${i}`, { status: 'fresh', cachedAt: Date.now() });
    }
  });
});

describe('queue slice', () => {
  bench('addQueueItem x500', () => {
    resetStore();
    const store = useEidosStore.getState();
    for (let i = 0; i < 500; i++) {
      store.addQueueItem(makeQueueItem(`q-${i}`));
    }
  });

  bench('updateQueueItem x500 on 500-item queue', () => {
    resetStore();
    const store = useEidosStore.getState();
    for (let i = 0; i < 500; i++) {
      store.addQueueItem(makeQueueItem(`q-${i}`));
    }
    for (let i = 0; i < 500; i++) {
      store.updateQueueItem(`q-${i}`, { status: 'replaying' });
    }
  });

  bench('batchUpdateQueueItems on 500-item queue', () => {
    resetStore();
    const store = useEidosStore.getState();
    for (let i = 0; i < 500; i++) {
      store.addQueueItem(makeQueueItem(`q-${i}`));
    }
    const updates = Array.from({ length: 500 }, (_, i) => ({
      id: `q-${i}`,
      update: { status: 'replaying' as const },
    }));
    store.batchUpdateQueueItems(updates);
  });
});

describe('subscriber notify', () => {
  bench('recordReliabilityEvent with 100 subscribers', () => {
    resetStore();
    const unsubs: Array<() => void> = [];
    for (let i = 0; i < 100; i++) {
      unsubs.push(useEidosStore.subscribe(() => {}));
    }
    const store = useEidosStore.getState();
    for (let i = 0; i < 100; i++) {
      store.recordReliabilityEvent('queued');
    }
    unsubs.forEach((u) => u());
  });
});
