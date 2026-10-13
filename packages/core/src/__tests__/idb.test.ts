import { describe, it, expect, beforeEach } from 'vitest';
import {
  idbAddToQueue,
  idbGetQueue,
  idbGetPendingItems,
  idbUpdateQueueItem,
  idbRemoveFromQueue,
  idbClearQueue,
} from '../idb';
import type { ActionQueueItem } from '../types';

// fake-indexeddb is loaded globally via setup.ts

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
    ...overrides,
  };
}

// Reset the IDB between tests by clearing the queue
beforeEach(async () => {
  await idbClearQueue();
});

describe('idbAddToQueue', () => {
  it('persists item and idbGetQueue returns it', async () => {
    await idbAddToQueue(makeItem('a'));
    const queue = await idbGetQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe('a');
  });

  it('persists multiple items', async () => {
    await idbAddToQueue(makeItem('a'));
    await idbAddToQueue(makeItem('b'));
    await idbAddToQueue(makeItem('c'));
    const queue = await idbGetQueue();
    expect(queue).toHaveLength(3);
  });
});

describe('idbUpdateQueueItem', () => {
  it('merges partial update', async () => {
    await idbAddToQueue(makeItem('upd'));
    await idbUpdateQueueItem('upd', { status: 'replaying', retryCount: 1 });
    const queue = await idbGetQueue();
    const item = queue.find((q) => q.id === 'upd');
    expect(item?.status).toBe('replaying');
    expect(item?.retryCount).toBe(1);
    expect(item?.actionName).toBe('doSomething'); // unchanged
  });

  it('sets nextRetryAt for backoff', async () => {
    await idbAddToQueue(makeItem('backoff'));
    const nextRetryAt = Date.now() + 4000;
    await idbUpdateQueueItem('backoff', { nextRetryAt });
    const queue = await idbGetQueue();
    expect(queue.find((q) => q.id === 'backoff')?.nextRetryAt).toBe(nextRetryAt);
  });

  it('no-ops for missing id', async () => {
    await idbAddToQueue(makeItem('real'));
    await idbUpdateQueueItem('ghost', { status: 'failed' });
    const queue = await idbGetQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].status).toBe('pending');
  });
});

describe('idbRemoveFromQueue', () => {
  it('deletes by id', async () => {
    await idbAddToQueue(makeItem('rm'));
    await idbAddToQueue(makeItem('keep'));
    await idbRemoveFromQueue('rm');
    const queue = await idbGetQueue();
    const ids = queue.map((q) => q.id);
    expect(ids).not.toContain('rm');
    expect(ids).toContain('keep');
  });
});

describe('idbClearQueue', () => {
  it('empties the store', async () => {
    await idbAddToQueue(makeItem('x'));
    await idbAddToQueue(makeItem('y'));
    await idbClearQueue();
    expect(await idbGetQueue()).toHaveLength(0);
  });
});

describe('idbGetPendingItems', () => {
  it('returns only pending and failed items', async () => {
    await idbAddToQueue(makeItem('p1', { status: 'pending' }));
    await idbAddToQueue(makeItem('f1', { status: 'failed' }));
    await idbAddToQueue(makeItem('s1', { status: 'succeeded' }));
    await idbAddToQueue(makeItem('r1', { status: 'replaying' }));

    const items = await idbGetPendingItems();
    const ids = items.map((i) => i.id);
    expect(ids).toContain('p1');
    expect(ids).toContain('f1');
    expect(ids).not.toContain('s1');
    expect(ids).not.toContain('r1');
  });

  it('returns empty array when queue is empty', async () => {
    expect(await idbGetPendingItems()).toHaveLength(0);
  });
});

describe('args serialisation round-trip', () => {
  it('stores and retrieves complex args intact', async () => {
    const args = [{ productId: 1, qty: 5, metadata: { tag: 'promo' } }];
    await idbAddToQueue(makeItem('args-test', { args }));
    const queue = await idbGetQueue();
    expect(queue[0].args).toEqual(args);
  });
});
