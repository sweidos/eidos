import { describe, it, expect } from 'vitest';
import { serverAction } from '../server-action';
import type { ActionContext } from '@sweidos/eidos';

async function createOrder(input: { amount: number }, _ctx?: ActionContext) {
  return { ok: true, amount: input.amount };
}

describe('serverAction', () => {
  it('defaults reliability to neverLose', () => {
    const handle = serverAction(createOrder, { name: 'createOrder-default' });
    expect(handle.config.reliability).toBe('neverLose');
  });

  it('respects an explicit reliability override', () => {
    const handle = serverAction(createOrder, {
      name: 'createOrder-best-effort',
      reliability: 'best-effort',
    });
    expect(handle.config.reliability).toBe('best-effort');
  });

  it('namespaces the actionId from config.namespace + name', () => {
    const handle = serverAction(createOrder, { name: 'createOrder-ns', namespace: 'orders' });
    expect(handle.id).toBe('orders::createOrder-ns');
  });

  it('throws on duplicate name within the same namespace', () => {
    serverAction(createOrder, { name: 'createOrder-dup', namespace: 'dup-ns' });
    expect(() =>
      serverAction(createOrder, { name: 'createOrder-dup', namespace: 'dup-ns' }),
    ).toThrow();
  });
});
