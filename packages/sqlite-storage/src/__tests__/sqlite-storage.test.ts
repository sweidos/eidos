import { describe, it, expect, beforeEach } from 'vitest';
import type { ActionQueueItem } from '@sweidos/eidos';
import { SqliteQueueStorage } from '../sqlite-storage';
import type { SqliteLike } from '../sqlite-storage';

/** In-memory mock of the Tauri-plugin-sql-shaped driver, just enough to back the queue table. */
function makeDb(): SqliteLike {
  const rows = new Map<string, { id: string; status: string; data: string }>();

  return {
    async execute(query, bindValues = []) {
      if (query.startsWith('CREATE TABLE')) return undefined;
      if (query.startsWith('INSERT OR REPLACE')) {
        const [id, status, data] = bindValues as [string, string, string];
        rows.set(id, { id, status, data });
        return undefined;
      }
      if (query.startsWith('UPDATE')) {
        const [status, data, id] = bindValues as [string, string, string];
        if (rows.has(id)) rows.set(id, { id, status, data });
        return undefined;
      }
      if (query.startsWith('DELETE') && query.includes('WHERE')) {
        const [id] = bindValues as [string];
        rows.delete(id);
        return undefined;
      }
      if (query.startsWith('DELETE')) {
        rows.clear();
        return undefined;
      }
      return undefined;
    },
    async select<T>(query: string, bindValues: unknown[] = []) {
      if (query.includes('WHERE id = ?')) {
        const [id] = bindValues as [string];
        const row = rows.get(id);
        return (row ? [{ data: row.data }] : []) as T[];
      }
      if (query.includes('WHERE status')) {
        const [a, b] = bindValues as [string, string];
        return [...rows.values()]
          .filter((r) => r.status === a || r.status === b)
          .map((r) => ({ data: r.data })) as T[];
      }
      return [...rows.values()].map((r) => ({ data: r.data })) as T[];
    },
  };
}

function makeItem(overrides: Partial<ActionQueueItem> = {}): ActionQueueItem {
  return {
    id: crypto.randomUUID(),
    actionId: 'test-action',
    actionName: 'testAction',
    args: [{ id: 1 }],
    queuedAt: Date.now(),
    retryCount: 0,
    maxRetries: 3,
    status: 'pending',
    priority: 'normal',
    ...overrides,
  };
}

describe('SqliteQueueStorage', () => {
  let storage: SqliteQueueStorage;

  beforeEach(() => {
    storage = new SqliteQueueStorage(makeDb());
  });

  it('add + getAll — round-trips an item', async () => {
    const item = makeItem();
    await storage.add(item);
    const all = await storage.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toEqual(item);
  });

  it('add multiple items and getAll returns all', async () => {
    const a = makeItem();
    const b = makeItem();
    await storage.add(a);
    await storage.add(b);
    const all = await storage.getAll();
    expect(all).toHaveLength(2);
    expect(all.map((i) => i.id)).toContain(a.id);
    expect(all.map((i) => i.id)).toContain(b.id);
  });

  it('getPending returns only pending and failed items', async () => {
    const pending = makeItem({ status: 'pending' });
    const failed = makeItem({ status: 'failed' });
    const succeeded = makeItem({ status: 'succeeded' });
    await storage.add(pending);
    await storage.add(failed);
    await storage.add(succeeded);

    const result = await storage.getPending();
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.id)).toContain(pending.id);
    expect(result.map((i) => i.id)).toContain(failed.id);
    expect(result.map((i) => i.id)).not.toContain(succeeded.id);
  });

  it('update patches an existing item', async () => {
    const item = makeItem();
    await storage.add(item);
    await storage.update(item.id, { status: 'succeeded', retryCount: 1 });
    const all = await storage.getAll();
    expect(all[0].status).toBe('succeeded');
    expect(all[0].retryCount).toBe(1);
    expect(all[0].actionId).toBe(item.actionId);
  });

  it('update ignores unknown id', async () => {
    const item = makeItem();
    await storage.add(item);
    await storage.update('nonexistent', { status: 'failed' });
    const all = await storage.getAll();
    expect(all[0].status).toBe('pending');
  });

  it('remove deletes by id', async () => {
    const a = makeItem();
    const b = makeItem();
    await storage.add(a);
    await storage.add(b);
    await storage.remove(a.id);
    const all = await storage.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(b.id);
  });

  it('clear empties the storage', async () => {
    await storage.add(makeItem());
    await storage.add(makeItem());
    await storage.clear();
    const all = await storage.getAll();
    expect(all).toEqual([]);
  });

  it('getAll returns [] when storage is empty', async () => {
    const all = await storage.getAll();
    expect(all).toEqual([]);
  });

  it('uses a custom table name when provided', async () => {
    let capturedTable = '';
    const db: SqliteLike = {
      async execute(query) {
        const match = query.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
        if (match) capturedTable = match[1];
        return undefined;
      },
      async select<T>() {
        return [] as T[];
      },
    };
    const custom = new SqliteQueueStorage(db, { tableName: 'custom_queue' });
    await custom.getAll();
    expect(capturedTable).toBe('custom_queue');
  });
});
