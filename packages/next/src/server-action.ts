import { action } from '@sweidos/eidos';
import type { ActionConfig, ActionFn, ActionHandle } from '@sweidos/eidos';

type NeverLoseConfig<TArgs extends unknown[]> = Extract<
  ActionConfig<TArgs>,
  { reliability: 'neverLose' }
>;

/**
 * Config for {@link serverAction}. `name` is required — it's combined with
 * `namespace` (e.g. the route/module path) into the registered `actionId`,
 * so two Server Actions named the same in different routes don't collide.
 * `reliability` defaults to `'neverLose'`: Server Action calls are exactly
 * the "don't lose this write" case `action()` was built for.
 */
export type ServerActionConfig<TArgs extends unknown[] = unknown[]> = Omit<
  NeverLoseConfig<TArgs>,
  'reliability'
> & {
  reliability?: ActionConfig<TArgs>['reliability'];
};

/**
 * Wraps a Next.js Server Action (a `'use server'` async function) with
 * Eidos's `action()` queue. Calling the returned handle from a Client
 * Component queues the call in IndexedDB when offline and replays it on
 * reconnect, with a stable `idempotencyKey` threaded through on every
 * attempt (read it server-side via {@link getActionContext}).
 *
 * ```ts
 * // app/orders/actions.ts
 * 'use server';
 * async function createOrderRaw(input: OrderInput, ctx?: ActionContext) { ... }
 * export const createOrder = serverAction(createOrderRaw, {
 *   name: 'createOrder',
 *   namespace: 'orders',
 * });
 * ```
 */
export function serverAction<TArgs extends unknown[], TReturn>(
  fn: ActionFn<TArgs, TReturn>,
  config: ServerActionConfig<TArgs>,
): ActionHandle<TArgs, TReturn> {
  const { reliability = 'neverLose', ...rest } = config;
  return action(fn, { ...rest, reliability } as ActionConfig<TArgs>);
}
