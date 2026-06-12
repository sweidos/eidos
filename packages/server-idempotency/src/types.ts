/** A captured HTTP response, replayed verbatim for a duplicate request. */
export interface StoredResponse {
  status: number;
  headers: Record<string, string>;
  /** Serialized response body. */
  body: string;
  storedAt: number;
}

/**
 * Dedupe-store contract for idempotency keys.
 *
 * Lifecycle for one idempotency key:
 *  1. `get()` — completed? replay it. In-flight (reserved, no response yet)? caller returns 409.
 *  2. `reserve()` — claim the key before running the handler. Returns `false`
 *     if already reserved or completed (caller should treat as in-flight/duplicate).
 *  3. `complete()` — store the handler's response once it succeeds.
 *  4. `release()` — on handler error, free the reservation so a retry with
 *     the same key can run the handler again.
 */
export interface IdempotencyStore {
  get(key: string): Promise<StoredResponse | null>;
  reserve(key: string, ttlMs: number): Promise<boolean>;
  complete(key: string, response: StoredResponse, ttlMs: number): Promise<void>;
  release(key: string): Promise<void>;
}

export interface IdempotencyOptions {
  /** Defaults to a process-local `MemoryIdempotencyStore` — replace for multi-instance deployments. */
  store?: IdempotencyStore;
  /** How long a completed response is replayed for. Default: 24h. */
  ttlMs?: number;
  /** Request header carrying the idempotency key. Default: 'Idempotency-Key'. */
  headerName?: string;
}

/** Outcome of running a request through the idempotency contract. */
export type IdempotencyResult =
  | { kind: 'passthrough' }
  | { kind: 'replayed'; response: StoredResponse }
  | { kind: 'conflict' }
  | {
      kind: 'run';
      complete: (response: StoredResponse) => Promise<void>;
      release: () => Promise<void>;
    };
