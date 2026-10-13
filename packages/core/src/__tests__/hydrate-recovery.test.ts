import { describe, it, expect, beforeEach } from 'vitest';
import { idbAddToQueue, idbGetQueue, idbClearQueue, idbUpdateQueueItem } from '../idb';
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

describe('legacy replaying hydrate recovery', () => {
  it('resets persisted replaying rows to pending (older builds wrote replaying to IDB)', async () => {
    await idbAddToQueue(makeItem('p1', { status: 'pending' }));
    await idbAddToQueue(makeItem('r1', { status: 'replaying' }));
    await idbAddToQueue(makeItem('f1', { status: 'failed' }));

    const persisted = await idbGetQueue();
    const recovered = persisted.map((item) =>
      item.status === 'replaying' ? { ...item, status: 'pending' as const } : item,
    );
    for (const item of recovered) {
      if (item.status === 'pending') {
        const orig = persisted.find((p) => p.id === item.id);
        if (orig?.status === 'replaying') await idbUpdateQueueItem(item.id, { status: 'pending' });
      }
    }
    useEidosStore.getState().hydrateQueue(recovered);
    const queue = useEidosStore.getState().queue;

    expect(queue.find((i) => i.id === 'r1')?.status).toBe('pending');
    expect(queue.find((i) => i.id === 'p1')?.status).toBe('pending');
    expect(queue.find((i) => i.id === 'f1')?.status).toBe('failed');
    expect((await idbGetQueue()).find((i) => i.id === 'r1')?.status).toBe('pending');
  });
});
