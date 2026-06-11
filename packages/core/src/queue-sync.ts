import { useEidosStore } from './store';
import type { ActionQueueItem } from './types';

const CHANNEL_NAME = 'eidos-queue-sync';

type QueueSyncMessage =
  | { type: 'update'; id: string; update: Partial<ActionQueueItem> }
  | { type: 'batchUpdate'; updates: Array<{ id: string; update: Partial<ActionQueueItem> }> }
  | { type: 'remove'; id: string };

let _channel: BroadcastChannel | null | undefined;

function getChannel(): BroadcastChannel | null {
  if (_channel !== undefined) return _channel;
  _channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);
  return _channel;
}

/**
 * Broadcasts a queue-item status change to other tabs sharing the same
 * IndexedDB queue. The replay-lock holder (see `replayQueue` in action.ts)
 * is the only tab that mutates queue-item status, so non-leader tabs would
 * otherwise show stale status until their own store re-hydrates.
 *
 * No-ops in environments without BroadcastChannel (React Native, old Safari).
 */
export function broadcastQueueSync(message: QueueSyncMessage): void {
  getChannel()?.postMessage(message);
}

/**
 * Applies queue-item status updates broadcast by the replay-lock holder to
 * this tab's store. Returns an unsubscribe function.
 */
export function subscribeQueueSync(): () => void {
  const channel = getChannel();
  if (!channel) return () => {};

  const handler = (event: MessageEvent<QueueSyncMessage>) => {
    const store = useEidosStore.getState();
    const message = event.data;
    switch (message.type) {
      case 'update':
        store.updateQueueItem(message.id, message.update);
        break;
      case 'batchUpdate':
        store.batchUpdateQueueItems(message.updates);
        break;
      case 'remove':
        store.removeQueueItem(message.id);
        break;
    }
  };

  channel.addEventListener('message', handler);
  return () => channel.removeEventListener('message', handler);
}

/** Test-only: reset the cached channel so each test gets a fresh instance. */
export function _resetQueueSyncChannel(): void {
  _channel?.close();
  _channel = undefined;
}
