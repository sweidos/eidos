import { describe, it, expect, beforeEach, vi } from 'vitest';
import { idbAddToQueue, idbGetQueue, idbClearQueue } from '../idb';
import { useEidosStore } from '../store';
import type { ActionQueueItem } from '../types';

function makeItem(id: string, overrides: Partial<ActionQueueItem> = {}): ActionQueueItem {
  return {
    id,
    actionId: 'doSomething',
    actionName: 'doSomething',
    args: [{ value: 42 }],
    queuedAt: Date.now(),
    retryCount: 0,
    maxRetries: 3,
    status: 'pending',
    schemaVersion: 2,
    idempotencyKey: `test-key-${id}`,
    ...overrides,
  };
}

beforeEach(async () => {
  await idbClearQueue();
  useEidosStore.setState({
    isOnline: true,
    swStatus: 'idle',
    swError: undefined,
    resources: {},
    queue: [],
  });
});

describe('hydrate recovery of replaying items', () => {
  it('resets replaying items to pending during hydration simulation', async () => {
    await idbAddToQueue(makeItem('p1', { status: 'pending' }));
    await idbAddToQueue(makeItem('r1', { status: 'replaying' }));
    await idbAddToQueue(makeItem('f1', { status: 'failed' }));
    await idbAddToQueue(makeItem('r2', { status: 'replaying' }));

    const persisted = await idbGetQueue();
    expect(persisted.filter((i) => i.status === 'replaying')).toHaveLength(2);

    const recovered: ActionQueueItem[] = [];
    for (const item of persisted) {
      if (item.status === 'replaying') {
        recovered.push({ ...item, status: 'pending' });
      } else {
        recovered.push(item);
      }
    }

    useEidosStore.getState().hydrateQueue(recovered);
    const queue = useEidosStore.getState().queue;

    expect(queue.find((i) => i.id === 'p1')?.status).toBe('pending');
    expect(queue.find((i) => i.id === 'r1')?.status).toBe('pending');
    expect(queue.find((i) => i.id === 'f1')?.status).toBe('failed');
    expect(queue.find((i) => i.id === 'r2')?.status).toBe('pending');
    expect(queue.filter((i) => i.status === 'replaying')).toHaveLength(0);
  });

  it('preserves pending and failed items unchanged', async () => {
    await idbAddToQueue(makeItem('p1', { status: 'pending', retryCount: 2 }));
    await idbAddToQueue(makeItem('f1', { status: 'failed', retryCount: 3 }));

    const persisted = await idbGetQueue();

    const recovered: ActionQueueItem[] = [];
    for (const item of persisted) {
      if (item.status === 'replaying') {
        recovered.push({ ...item, status: 'pending' });
      } else {
        recovered.push(item);
      }
    }

    useEidosStore.getState().hydrateQueue(recovered);
    const queue = useEidosStore.getState().queue;

    const p1 = queue.find((i) => i.id === 'p1');
    const f1 = queue.find((i) => i.id === 'f1');

    expect(p1?.status).toBe('pending');
    expect(p1?.retryCount).toBe(2);
    expect(f1?.status).toBe('failed');
    expect(f1?.retryCount).toBe(3);
  });
});
