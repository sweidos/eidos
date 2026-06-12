import { MemoryIdempotencyStore } from './memory-store.js';
import type { IdempotencyOptions, IdempotencyResult, StoredResponse } from './types.js';

export const DEFAULT_HEADER = 'Idempotency-Key';
export const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// Shared default store — process-local. Each call to a framework adapter
// without an explicit `store` shares this instance, so repeated middleware
// construction (e.g. per-request) doesn't reset state.
let _defaultStore: MemoryIdempotencyStore | undefined;
function defaultStore(): MemoryIdempotencyStore {
  return (_defaultStore ??= new MemoryIdempotencyStore());
}

/**
 * Runs the idempotency contract for one request/key.
 *
 *  - No key → `'passthrough'`: caller runs the handler normally, untouched.
 *  - Key already completed → `'replayed'`: caller sends back `response`
 *    verbatim (the original, not a re-execution).
 *  - Key reserved but not yet completed (another in-flight request with the
 *    same key) → `'conflict'`: caller should respond `409` — the original
 *    request is still being processed.
 *  - New key → `'run'`: caller executes the handler, then calls
 *    `complete(response)` on success or `release()` on error (so a retry
 *    with the same key can run again).
 */
export async function startIdempotentRequest(
  key: string | undefined,
  options: Pick<IdempotencyOptions, 'store' | 'ttlMs'> = {},
): Promise<IdempotencyResult> {
  if (!key) return { kind: 'passthrough' };

  const store = options.store ?? defaultStore();
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;

  const existing = await store.get(key);
  if (existing) return { kind: 'replayed', response: existing };

  const reserved = await store.reserve(key, ttlMs);
  if (!reserved) return { kind: 'conflict' };

  return {
    kind: 'run',
    complete: (response: StoredResponse) => store.complete(key, response, ttlMs),
    release: () => store.release(key),
  };
}
