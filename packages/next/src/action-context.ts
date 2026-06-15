import type { ActionContext } from '@sweidos/eidos';

/**
 * `action()` appends an {@link ActionContext} as the trailing argument on
 * every call (online, offline, and replay). Use this inside a Server
 * Action's body to recover it without hardcoding argument positions.
 *
 * ```ts
 * async function createOrderRaw(input: OrderInput, ctx?: ActionContext) {
 *   const context = getActionContext(arguments);
 *   ...
 * }
 * ```
 */
export function getActionContext(args: ArrayLike<unknown>): ActionContext | undefined {
  const last = args[args.length - 1];
  return isActionContext(last) ? last : undefined;
}

/** Type guard: does `value` look like an {@link ActionContext}? */
export function isActionContext(value: unknown): value is ActionContext {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.idempotencyKey === 'string' && typeof v.attempt === 'number';
}

/**
 * Maps an {@link ActionContext} to headers for forwarding to a downstream
 * fetch from inside a Server Action — e.g. an internal API guarded by
 * `@sweidos/server-idempotency`.
 */
export function idempotencyHeaders(ctx: ActionContext): Record<string, string> {
  return {
    'Idempotency-Key': ctx.idempotencyKey,
    'Idempotency-Attempt': String(ctx.attempt),
  };
}
