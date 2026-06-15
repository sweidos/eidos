import { bench, describe } from 'vitest';
import { useEidosStore } from '../store';
import type { ActionQueueItem, ResourceEntry } from '../types';
import { CURRENT_QUEUE_SCHEMA_VERSION } from '../types';

function makeQueueItem(i: number): ActionQueueItem {
  return {
    schemaVersion: CURRENT_QUEUE_SCHEMA_VERSION,
    id: `item-${i}`,
    actionId: 'action',
    actionName: 'action',
    idempotencyKey: `key-${i}`,
    args: [],
    queuedAt: Date.now(),
    retryCount: 0,
    maxRetries: 3,
    status: 'pending',
  };
}

function makeResourceEntry(): ResourceEntry {
  return {
    url: 'https://example.com',
    config: {} as ResourceEntry['config'],
    strategy: {} as ResourceEntry['strategy'],
    status: 'idle',
    cacheHits: 0,
    cacheMisses: 0,
  };
}

describe('batchUpdateQueueItems', () => {
  for (const size of [10, 100, 500, 1000]) {
    bench(
      `batch update ${size} items in a ${size}-item queue`,
      () => {
        const updates = Array.from({ length: size }, (_, i) => ({
          id: `item-${i}`,
          update: { retryCount: i },
        }));
        useEidosStore.getState().batchUpdateQueueItems(updates);
      },
      {
        setup: () => {
          useEidosStore.setState(() => ({
            queue: Array.from({ length: size }, (_, i) => makeQueueItem(i)),
          }));
        },
      },
    );
  }
});

describe('updateResource', () => {
  for (const size of [10, 100, 1000]) {
    bench(
      `update 1 resource in a ${size}-entry resource cache`,
      () => {
        useEidosStore.getState().updateResource('https://example.com/0', {
          cacheHits: Math.random(),
        });
      },
      {
        setup: () => {
          const resources: Record<string, ResourceEntry> = {};
          for (let i = 0; i < size; i++) {
            resources[`https://example.com/${i}`] = makeResourceEntry();
          }
          useEidosStore.setState(() => ({ resources }));
        },
      },
    );
  }
});
