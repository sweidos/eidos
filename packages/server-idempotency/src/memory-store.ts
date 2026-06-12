import type { IdempotencyStore, StoredResponse } from './types.js';

interface Entry {
  response: StoredResponse | null; // null while reserved/in-flight
  expiresAt: number;
}

/**
 * Process-local, in-memory `IdempotencyStore`. Good for single-instance
 * deployments, demos, and tests. For multi-instance deployments, implement
 * `IdempotencyStore` against shared storage (Redis, Postgres, etc.) —
 * `reserve()` must be atomic (`SETNX`/unique-constraint insert) across
 * instances.
 */
export class MemoryIdempotencyStore implements IdempotencyStore {
  private entries = new Map<string, Entry>();

  async get(key: string): Promise<StoredResponse | null> {
    const entry = this.peek(key);
    return entry?.response ?? null;
  }

  async reserve(key: string, ttlMs: number): Promise<boolean> {
    if (this.peek(key)) return false;
    this.entries.set(key, { response: null, expiresAt: Date.now() + ttlMs });
    return true;
  }

  async complete(key: string, response: StoredResponse, ttlMs: number): Promise<void> {
    this.entries.set(key, { response, expiresAt: Date.now() + ttlMs });
  }

  async release(key: string): Promise<void> {
    this.entries.delete(key);
  }

  /** Returns the entry if present and not expired, evicting it otherwise. */
  private peek(key: string): Entry | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry;
  }
}
