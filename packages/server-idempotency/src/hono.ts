import type { Context, MiddlewareHandler } from 'hono';
import { DEFAULT_HEADER, startIdempotentRequest } from './core.js';
import type { IdempotencyOptions, StoredResponse } from './types.js';

const REPLAYED_HEADER = 'Idempotency-Replayed';

/**
 * Hono middleware implementing the Eidos `neverLose` idempotency contract.
 *
 * - Replays a stored response verbatim for a key seen before, adding
 *   `Idempotency-Replayed: true`.
 * - Returns `409` if the same key is currently in flight on another request.
 * - Otherwise runs the handler and caches its response under the key.
 *
 * @example
 * app.post('/api/orders', idempotency(), createOrderHandler)
 */
export function idempotency(options: IdempotencyOptions = {}): MiddlewareHandler {
  const headerName = options.headerName ?? DEFAULT_HEADER;

  return async function idempotencyMiddleware(c: Context, next) {
    const key = c.req.header(headerName);
    const result = await startIdempotentRequest(key, options);

    switch (result.kind) {
      case 'passthrough':
        await next();
        return;

      case 'replayed':
        applyStoredHeaders(c, result.response);
        c.header(REPLAYED_HEADER, 'true');
        c.status(result.response.status as never);
        c.res = c.newResponse(result.response.body);
        return;

      case 'conflict':
        return c.json(
          {
            error: 'idempotency_conflict',
            message: `Request with ${headerName} '${key}' is already in progress.`,
          },
          409,
        );

      case 'run': {
        await next();
        const body = await c.res.clone().text();
        const stored: StoredResponse = {
          status: c.res.status,
          headers: Object.fromEntries(c.res.headers.entries()),
          body,
          storedAt: Date.now(),
        };
        // Only cache successful responses — failed attempts should be retryable.
        if (c.res.status < 400) await result.complete(stored);
        else await result.release();
        return;
      }
    }
  };
}

function applyStoredHeaders(c: Context, stored: StoredResponse): void {
  for (const [name, value] of Object.entries(stored.headers)) {
    if (name.toLowerCase() === 'content-length') continue; // recomputed by Hono
    c.header(name, value);
  }
}
