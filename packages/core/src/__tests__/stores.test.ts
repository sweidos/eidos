import { describe, it, expect, beforeEach } from 'vitest';
import {
  eidosStore,
  eidosQueue,
  eidosStatus,
  eidosQueueStats,
  eidosResource,
  eidosAction,
  onQueueDrain,
  eidosReliabilityStats,
} from '../stores';
import { useEidosStore } from '../store';
import type { ActionQueueItem, ResourceEntry } from '../types';
import { emptyReliabilityStats } from '../types';
import { seedMixedStatusQueue } from './test-utils';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeItem(id: string): ActionQueueItem {
  return {
    id,
    actionId: 'testAction',
    actionName: 'testAction',
    args: [],
    queuedAt: Date.now(),
    retryCount: 0,
    maxRetries: 3,
    status: 'pending',
  };
}

const SAMPLE_ENTRY: ResourceEntry = {
  url: '/api/products',
  config: { offline: true },
  strategy: {
    name: 'StaleWhileRevalidate',
    swStrategy: 'stale-while-revalidate',
    cacheName: 'eidos-resources-v1',
    reasoning: 'test',
    behavior: [],
    equivalentCode: '',
  },
  status: 'idle',
  cacheHits: 0,
  cacheMisses: 0,
};

beforeEach(() => {
  useEidosStore.setState({
    isOnline: true,
    swStatus: 'idle',
    swError: undefined,
    resources: {},
    queue: [],
    reliability: emptyReliabilityStats(),
  });
});

// ── EidosReadable contract ────────────────────────────────────────────────────

describe('eidosStore', () => {
  it('getState() returns current store snapshot', () => {
    const state = eidosStore.getState();
    expect(state.isOnline).toBe(true);
    expect(Array.isArray(state.queue)).toBe(true);
  });

  it('subscribe() emits current value immediately', () => {
    const received: unknown[] = [];
    const unsub = eidosStore.subscribe((v) => received.push(v));
    expect(received).toHaveLength(1);
    unsub();
  });

  it('subscribe() notifies on state change', () => {
    const received: boolean[] = [];
    const unsub = eidosStore.subscribe((v) => received.push(v.isOnline));
    useEidosStore.getState().setOnline(false);
    expect(received).toHaveLength(2);
    expect(received[1]).toBe(false);
    unsub();
  });

  it('unsubscribe stops notifications', () => {
    const calls: number[] = [];
    const unsub = eidosStore.subscribe(() => calls.push(1));
    unsub();
    useEidosStore.getState().setOnline(false);
    expect(calls).toHaveLength(1); // only the initial emit
  });
});

// ── eidosQueue ────────────────────────────────────────────────────────────────

describe('eidosQueue', () => {
  it('getState() returns current queue', () => {
    expect(eidosQueue.getState()).toEqual([]);
  });

  it('emits updated queue when item added', () => {
    const snapshots: ActionQueueItem[][] = [];
    const unsub = eidosQueue.subscribe((q) => snapshots.push(q));
    useEidosStore.getState().addQueueItem(makeItem('a'));
    expect(snapshots).toHaveLength(2);
    expect(snapshots[1]).toHaveLength(1);
    expect(snapshots[1][0].id).toBe('a');
    unsub();
  });

  it('emits on item removal', () => {
    useEidosStore.getState().addQueueItem(makeItem('del'));
    const snapshots: ActionQueueItem[][] = [];
    const unsub = eidosQueue.subscribe((q) => snapshots.push(q));
    useEidosStore.getState().removeQueueItem('del');
    expect(snapshots[snapshots.length - 1]).toHaveLength(0);
    unsub();
  });
});

// ── eidosStatus ───────────────────────────────────────────────────────────────

describe('eidosStatus', () => {
  it('initial value is online + idle', () => {
    const s = eidosStatus.getState();
    expect(s.isOnline).toBe(true);
    expect(s.swStatus).toBe('idle');
    expect(s.swError).toBeUndefined();
  });

  it('emits when isOnline changes', () => {
    const values: boolean[] = [];
    const unsub = eidosStatus.subscribe((s) => values.push(s.isOnline));
    useEidosStore.getState().setOnline(false);
    expect(values[values.length - 1]).toBe(false);
    unsub();
  });

  it('emits when swStatus changes', () => {
    const statuses: string[] = [];
    const unsub = eidosStatus.subscribe((s) => statuses.push(s.swStatus));
    useEidosStore.getState().setSwStatus('active');
    expect(statuses[statuses.length - 1]).toBe('active');
    unsub();
  });
});

// ── eidosQueueStats ───────────────────────────────────────────────────────────

describe('eidosQueueStats', () => {
  it('all counts are 0 for empty queue', () => {
    const s = eidosQueueStats.getState();
    expect(s).toEqual({ pending: 0, failed: 0, replaying: 0, total: 0 });
  });

  it('counts reflect queue contents', () => {
    seedMixedStatusQueue(makeItem);
    const s = eidosQueueStats.getState();
    expect(s.pending).toBe(2);
    expect(s.failed).toBe(1);
    expect(s.replaying).toBe(1);
    expect(s.total).toBe(4);
  });

  it('subscriber receives updated counts', () => {
    const totals: number[] = [];
    const unsub = eidosQueueStats.subscribe((s) => totals.push(s.total));
    useEidosStore.getState().addQueueItem(makeItem('x'));
    useEidosStore.getState().addQueueItem(makeItem('y'));
    useEidosStore.getState().removeQueueItem('x');
    expect(totals).toEqual([0, 1, 2, 1]);
    unsub();
  });
});

// ── eidosReliabilityStats ─────────────────────────────────────────────────────

describe('eidosReliabilityStats', () => {
  it('all counters are 0 initially', () => {
    expect(eidosReliabilityStats.getState()).toEqual(emptyReliabilityStats());
  });

  it('recordReliabilityEvent increments the matching counter', () => {
    useEidosStore.getState().recordReliabilityEvent('queued');
    useEidosStore.getState().recordReliabilityEvent('queued');
    useEidosStore.getState().recordReliabilityEvent('succeeded');
    const s = eidosReliabilityStats.getState();
    expect(s.queued).toBe(2);
    expect(s.succeeded).toBe(1);
    expect(s.failed).toBe(0);
  });

  it('resetReliabilityStats zeroes all counters', () => {
    useEidosStore.getState().recordReliabilityEvent('failed');
    useEidosStore.getState().resetReliabilityStats();
    expect(eidosReliabilityStats.getState()).toEqual(emptyReliabilityStats());
  });

  it('subscriber only re-emits when a counter changes', () => {
    const snapshots: number[] = [];
    const unsub = eidosReliabilityStats.subscribe((s) => snapshots.push(s.queued));
    useEidosStore.getState().recordReliabilityEvent('queued');
    useEidosStore.getState().setOnline(false); // unrelated state change — no extra emit
    useEidosStore.getState().setOnline(true);
    expect(snapshots).toEqual([0, 1]);
    unsub();
  });
});

// ── eidosResource ─────────────────────────────────────────────────────────────

describe('eidosResource', () => {
  it('returns undefined for unregistered URL', () => {
    expect(eidosResource('/nope').getState()).toBeUndefined();
  });

  it('returns entry once registered', () => {
    useEidosStore.getState().registerResource('/api/products', SAMPLE_ENTRY);
    const entry = eidosResource('/api/products').getState();
    expect(entry?.url).toBe('/api/products');
  });

  it('emits when resource is registered', () => {
    const snapshots: (ResourceEntry | undefined)[] = [];
    const unsub = eidosResource('/api/products').subscribe((e) => snapshots.push(e));
    useEidosStore.getState().registerResource('/api/products', SAMPLE_ENTRY);
    expect(snapshots).toHaveLength(2);
    expect(snapshots[1]?.url).toBe('/api/products');
    unsub();
  });

  it('emits when resource is updated', () => {
    useEidosStore.getState().registerResource('/api/products', SAMPLE_ENTRY);
    const hits: number[] = [];
    const unsub = eidosResource('/api/products').subscribe((e) => hits.push(e?.cacheHits ?? 0));
    useEidosStore.getState().updateResource('/api/products', { cacheHits: 5 });
    expect(hits[hits.length - 1]).toBe(5);
    unsub();
  });

  it('each call returns independent store instance', () => {
    const a = eidosResource('/api/a');
    const b = eidosResource('/api/b');
    expect(a).not.toBe(b);
  });
});

// ── eidosAction ───────────────────────────────────────────────────────────────

describe('eidosAction', () => {
  it('returns undefined for unknown id', () => {
    expect(eidosAction('nope').getState()).toBeUndefined();
  });

  it('returns item after it is queued', () => {
    useEidosStore.getState().addQueueItem(makeItem('abc'));
    expect(eidosAction('abc').getState()?.id).toBe('abc');
  });

  it('emits status updates', () => {
    useEidosStore.getState().addQueueItem(makeItem('upd'));
    const statuses: (string | undefined)[] = [];
    const unsub = eidosAction('upd').subscribe((i) => statuses.push(i?.status));
    useEidosStore.getState().updateQueueItem('upd', { status: 'replaying' });
    useEidosStore.getState().updateQueueItem('upd', { status: 'succeeded' });
    expect(statuses).toEqual(['pending', 'replaying', 'succeeded']);
    unsub();
  });

  it('returns undefined after item removed', () => {
    useEidosStore.getState().addQueueItem(makeItem('gone'));
    useEidosStore.getState().removeQueueItem('gone');
    expect(eidosAction('gone').getState()).toBeUndefined();
  });
});

// ── onQueueDrain ──────────────────────────────────────────────────────────────

describe('onQueueDrain', () => {
  it('does not fire on the initial empty queue', () => {
    const calls: number[] = [];
    const unsub = onQueueDrain(() => calls.push(1));
    expect(calls).toHaveLength(0);
    unsub();
  });

  it('fires once when the queue drains from non-empty to empty', () => {
    useEidosStore.getState().addQueueItem(makeItem('a'));
    const calls: number[] = [];
    const unsub = onQueueDrain(() => calls.push(1));
    useEidosStore.getState().removeQueueItem('a');
    expect(calls).toHaveLength(1);
    unsub();
  });

  it('does not fire while items remain in the queue', () => {
    useEidosStore.getState().addQueueItem(makeItem('a'));
    useEidosStore.getState().addQueueItem(makeItem('b'));
    const calls: number[] = [];
    const unsub = onQueueDrain(() => calls.push(1));
    useEidosStore.getState().removeQueueItem('a');
    expect(calls).toHaveLength(0);
    unsub();
  });

  it('stops firing after unsubscribe', () => {
    useEidosStore.getState().addQueueItem(makeItem('a'));
    const calls: number[] = [];
    const unsub = onQueueDrain(() => calls.push(1));
    unsub();
    useEidosStore.getState().removeQueueItem('a');
    expect(calls).toHaveLength(0);
  });
});
