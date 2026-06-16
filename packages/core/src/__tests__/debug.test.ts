import { describe, it, expect, beforeEach } from 'vitest';
import { eidosDebug } from '../debug';
import { useEidosStore } from '../store';
import { VERSION } from '../version';
import { resetEidosState } from './test-utils';

describe('eidosDebug', () => {
  beforeEach(resetEidosState);

  it('returns all required shape fields', () => {
    const snap = eidosDebug();
    expect(snap).toHaveProperty('version', VERSION);
    expect(snap).toHaveProperty('swStatus');
    expect(snap).toHaveProperty('isOnline');
    expect(snap).toHaveProperty('resourceCount');
    expect(snap).toHaveProperty('resources');
    expect(snap).toHaveProperty('queue');
    expect(snap).toHaveProperty('reliability');
    expect(snap).toHaveProperty('swRegistration');
  });

  it('reflects current store isOnline and swStatus', () => {
    useEidosStore.setState({ isOnline: false, swStatus: 'error', swError: 'reg failed' });
    const snap = eidosDebug();
    expect(snap.isOnline).toBe(false);
    expect(snap.swStatus).toBe('error');
    expect(snap.swError).toBe('reg failed');
  });

  it('omits swError when not set', () => {
    useEidosStore.setState({ swStatus: 'active', swError: undefined });
    const snap = eidosDebug();
    expect('swError' in snap).toBe(false);
  });

  it('swRegistration is null when no SW registered', () => {
    const snap = eidosDebug();
    expect(snap.swRegistration).toBeNull();
  });

  it('resourceCount is 0 with empty resources', () => {
    const snap = eidosDebug();
    expect(snap.resourceCount).toBe(0);
    expect(snap.resources).toEqual({});
  });

  it('queue is empty array when no queue items', () => {
    const snap = eidosDebug();
    expect(snap.queue).toEqual([]);
  });

  it('reliability mirrors store stats', () => {
    useEidosStore.setState({
      reliability: { queued: 5, succeeded: 3, failed: 1, retried: 1, conflicted: 0, cancelled: 0 },
    });
    const snap = eidosDebug();
    expect(snap.reliability.queued).toBe(5);
    expect(snap.reliability.succeeded).toBe(3);
    expect(snap.reliability.failed).toBe(1);
  });

  it('snapshot is JSON-serializable', () => {
    expect(() => JSON.stringify(eidosDebug())).not.toThrow();
  });
});
