import { useEidosStore } from '../store';
import type { ActionQueueItem } from '../types';

/** Resets the store to a clean online state with no resources/queue. */
export function resetEidosState(overrides: { swStatus?: 'idle' | 'active' } = {}) {
  useEidosStore.setState({
    isOnline: true,
    swStatus: overrides.swStatus ?? 'active',
    swError: undefined,
    resources: {},
    queue: [],
  });
}

/** Seeds the queue with one pending/failed/replaying item each, plus a second pending. */
export function seedMixedStatusQueue(makeItem: (id: string) => ActionQueueItem) {
  useEidosStore.getState().addQueueItem({ ...makeItem('p1'), status: 'pending' });
  useEidosStore.getState().addQueueItem({ ...makeItem('p2'), status: 'pending' });
  useEidosStore.getState().addQueueItem({ ...makeItem('f1'), status: 'failed' });
  useEidosStore.getState().addQueueItem({ ...makeItem('r1'), status: 'replaying' });
}

/** A minimal JSON `Response`, e.g. for mocking `fetch`. */
export function makeJsonResponse(body = '{"ok":true}'): Response {
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
