import { describe, it, expect, beforeEach } from 'vitest';
import { idbAddToQueue, idbGetQueue, idbClearQueue, recoverStaleReplaying } from '../idb';
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

describe('recoverStaleReplaying', () => {
  it('resets expired and leaseless replaying items to pending', () => {
    const now = Date.now();
    const stale = recoverStaleReplaying(
      makeItem('r1', { status: 'replaying', replayLeaseUntil: now - 1 }),
      now,
    );
    const legacy = recoverStaleReplaying(makeItem('r2', { status: 'replaying' }), now);
    expect(stale.status).toBe('pending');
    expect(stale.replayLeaseUntil).toBeUndefined();
    expect(legacy.status).toBe('pending');
  });

  it('leaves live leases untouched', () => {
    const now = Date.now();
    const live = recoverStaleReplaying(
      makeItem('r-live', {
        status: 'replaying',
        replayOwnerId: 'tab-b',
        replayLeaseUntil: now + 30_000,
      }),
      now,
    );
    expect(live.status).toBe('replaying');
    expect(live.replayOwnerId).toBe('tab-b');
  });

  it('hydrate simulation recovers only stale replaying items', async () => {
    const now = Date.now();
    await idbAddToQueue(makeItem('p1', { status: 'pending' }));
    await idbAddToQueue(makeItem('r-stale', { status: 'replaying' }));
    await idbAddToQueue(
      makeItem('r-live', {
        status: 'replaying',
        replayOwnerId: 'other',
        replayLeaseUntil: now + 60_000,
      }),
    );
    await idbAddToQueue(makeItem('f1', { status: 'failed' }));

    const persisted = await idbGetQueue();
    const recovered = persisted.map((item) => recoverStaleReplaying(item, now));
    useEidosStore.getState().hydrateQueue(recovered);
    const queue = useEidosStore.getState().queue;

    expect(queue.find((i) => i.id === 'p1')?.status).toBe('pending');
    expect(queue.find((i) => i.id === 'r-stale')?.status).toBe('pending');
    expect(queue.find((i) => i.id === 'r-live')?.status).toBe('replaying');
    expect(queue.find((i) => i.id === 'f1')?.status).toBe('failed');
  });
});
