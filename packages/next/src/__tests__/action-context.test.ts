import { describe, it, expect } from 'vitest';
import { getActionContext, isActionContext, idempotencyHeaders } from '../action-context';
import type { ActionContext } from '@sweidos/eidos';

function makeContext(overrides: Partial<ActionContext> = {}): ActionContext {
  return { idempotencyKey: 'idem-123', attempt: 0, ...overrides };
}

describe('isActionContext', () => {
  it('recognizes a valid ActionContext', () => {
    expect(isActionContext(makeContext())).toBe(true);
  });

  it('rejects plain objects without idempotencyKey/attempt', () => {
    expect(isActionContext({ foo: 'bar' })).toBe(false);
  });

  it('rejects non-objects', () => {
    expect(isActionContext('idem-123')).toBe(false);
    expect(isActionContext(undefined)).toBe(false);
    expect(isActionContext(null)).toBe(false);
    expect(isActionContext(42)).toBe(false);
  });
});

describe('getActionContext', () => {
  it('returns the trailing ActionContext from an args array', () => {
    const ctx = makeContext({ attempt: 2 });
    const args = [{ amount: 10 }, ctx];
    expect(getActionContext(args)).toEqual(ctx);
  });

  it('works with an array-like object (e.g. `arguments`)', () => {
    const ctx = makeContext();
    const argsLike = { 0: { amount: 10 }, 1: ctx, length: 2 };
    expect(getActionContext(argsLike)).toEqual(ctx);
  });

  it('returns undefined when no ActionContext is present (direct call, not via action())', () => {
    expect(getActionContext([{ amount: 10 }])).toBeUndefined();
    expect(getActionContext([])).toBeUndefined();
  });
});

describe('idempotencyHeaders', () => {
  it('maps idempotencyKey and attempt to header names', () => {
    const ctx = makeContext({ idempotencyKey: 'idem-abc', attempt: 3 });
    expect(idempotencyHeaders(ctx)).toEqual({
      'Idempotency-Key': 'idem-abc',
      'Idempotency-Attempt': '3',
    });
  });

  it('stringifies attempt 0', () => {
    const ctx = makeContext({ attempt: 0 });
    expect(idempotencyHeaders(ctx)['Idempotency-Attempt']).toBe('0');
  });
});
