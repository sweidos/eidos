import type { NextFunction, Request, Response } from 'express';
import { DEFAULT_HEADER, startIdempotentRequest } from './core.js';
import type { IdempotencyOptions, StoredResponse } from './types.js';

const REPLAYED_HEADER = 'Idempotency-Replayed';

/**
 * Express middleware implementing the Eidos `neverLose` idempotency contract.
 *
 * - Replays a stored response verbatim for a key seen before, adding
 *   `Idempotency-Replayed: true`.
 * - Returns `409` if the same key is currently in flight on another request.
 * - Otherwise runs the handler and caches its response under the key.
 *
 * @example
 * app.post('/api/orders', idempotency(), createOrderHandler)
 */
export function idempotency(options: IdempotencyOptions = {}) {
  const headerName = options.headerName ?? DEFAULT_HEADER;

  return async function idempotencyMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const key = req.header(headerName);
    const result = await startIdempotentRequest(key, options);

    switch (result.kind) {
      case 'passthrough':
        return next();

      case 'replayed':
        replayResponse(res, result.response);
        return;

      case 'conflict':
        res.status(409).json({
          error: 'idempotency_conflict',
          message: `Request with ${headerName} '${key}' is already in progress.`,
        });
        return;

      case 'run': {
        const chunks: Buffer[] = [];
        const originalWrite = res.write.bind(res);
        const originalEnd = res.end.bind(res);

        res.write = ((chunk: unknown, ...rest: unknown[]) => {
          if (chunk) chunks.push(Buffer.from(chunk as Buffer | string));
          // @ts-expect-error — forwarding varargs to the original signature.
          return originalWrite(chunk, ...rest);
        }) as Response['write'];

        res.end = ((chunk: unknown, ...rest: unknown[]) => {
          if (chunk) chunks.push(Buffer.from(chunk as Buffer | string));
          const body = Buffer.concat(chunks).toString('utf-8');
          const stored: StoredResponse = {
            status: res.statusCode,
            headers: collectHeaders(res),
            body,
            storedAt: Date.now(),
          };
          // Only cache successful responses — failed attempts should be retryable.
          const finalize = res.statusCode < 400 ? result.complete(stored) : result.release();
          void finalize;
          // @ts-expect-error — forwarding varargs to the original signature.
          return originalEnd(chunk, ...rest);
        }) as Response['end'];

        next();
      }
    }
  };
}

function collectHeaders(res: Response): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(res.getHeaders())) {
    if (value !== undefined) headers[name] = String(value);
  }
  return headers;
}

function replayResponse(res: Response, stored: StoredResponse): void {
  res.status(stored.status);
  for (const [name, value] of Object.entries(stored.headers)) {
    if (name.toLowerCase() === 'content-length') continue; // recomputed by Express
    res.setHeader(name, value);
  }
  res.setHeader(REPLAYED_HEADER, 'true');
  res.send(stored.body);
}
