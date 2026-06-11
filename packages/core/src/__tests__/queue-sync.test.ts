import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useEidosStore } from '../store';
import { subscribeQueueSync, _resetQueueSyncChannel } from '../queue-sync';
import type { ActionQueueItem } from '../types';

// `queue-sync` caches a singleton BroadcastChannel, and BroadcastChannel
// never delivers messages back to the instance that sent them. To simulate
// "another tab" broadcasting, post from a second channel with the same name.
function broadcastFromOtherTab(message: object) {
  const channel = new BroadcastChannel('eidos-queue-sync');
  channel.postMessage(message);
  channel.close();
}

const baseItem: ActionQueueItem = {
  id: 'item-1',
  actionId: 'createOrder',
  args: [],
  status: 'replaying',
  retryCount: 0,
  maxRetries: 3,
  createdAt: Date.now(),
  schemaVersion: 1,
  idempotencyKey: 'idem-1',
};

describe('queue-sync', () => {
  beforeEach(() => {
    _resetQueueSyncChannel();
    useEidosStore.setState({ queue: [baseItem] });
  });

  afterEach(() => {
    _resetQueueSyncChannel();
  });

  it('applies broadcast updates to the local store', async () => {
    const unsubscribe = subscribeQueueSync();

    broadcastFromOtherTab({ type: 'update', id: 'item-1', update: { status: 'succeeded' } });
    await new Promise((r) => setTimeout(r, 0));

    expect(useEidosStore.getState().queue[0].status).toBe('succeeded');
    unsubscribe();
  });

  it('applies broadcast batch updates', async () => {
    const unsubscribe = subscribeQueueSync();

    broadcastFromOtherTab({
      type: 'batchUpdate',
      updates: [{ id: 'item-1', update: { status: 'pending', retryCount: 1 } }],
    });
    await new Promise((r) => setTimeout(r, 0));

    expect(useEidosStore.getState().queue[0]).toMatchObject({ status: 'pending', retryCount: 1 });
    unsubscribe();
  });

  it('removes items on broadcast remove', async () => {
    const unsubscribe = subscribeQueueSync();

    broadcastFromOtherTab({ type: 'remove', id: 'item-1' });
    await new Promise((r) => setTimeout(r, 0));

    expect(useEidosStore.getState().queue).toHaveLength(0);
    unsubscribe();
  });

  it('stops applying updates after unsubscribe', async () => {
    const unsubscribe = subscribeQueueSync();
    unsubscribe();

    broadcastFromOtherTab({ type: 'remove', id: 'item-1' });
    await new Promise((r) => setTimeout(r, 0));

    expect(useEidosStore.getState().queue).toHaveLength(1);
  });
});
