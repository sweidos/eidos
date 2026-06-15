import { bench, describe } from 'vitest';
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

function makeItem(i: number, overrides: Partial<ActionQueueItem> = {}): ActionQueueItem {
  return {
    id: `item-${i}`,
    actionId: 'bench-action',
    actionName: 'benchAction',
    args: [{ i }],
    queuedAt: Date.now(),
    retryCount: 0,
    maxRetries: 3,
    status: i % 2 === 0 ? 'pending' : 'succeeded',
    priority: 'normal',
    ...overrides,
  } as ActionQueueItem;
}

async function seeded(size: number): Promise<SqliteQueueStorage> {
  const storage = new SqliteQueueStorage(makeDb());
  for (let i = 0; i < size; i++) {
    await storage.add(makeItem(i));
  }
  return storage;
}

describe('getAll', () => {
  for (const size of [100, 1000, 5000]) {
    bench(`getAll over ${size} items`, async () => {
      const storage = await seeded(size);
      await storage.getAll();
    });
  }
});

describe('getPending', () => {
  for (const size of [100, 1000, 5000]) {
    bench(`getPending over ${size} items (half pending)`, async () => {
      const storage = await seeded(size);
      await storage.getPending();
    });
  }
});

describe('update', () => {
  bench('update a single item (read-modify-write)', async () => {
    const storage = await seeded(1);
    await storage.update('item-0', { retryCount: 1, status: 'failed' });
  });

  bench('update 100 items sequentially in a 1000-item queue', async () => {
    const storage = await seeded(1000);
    for (let i = 0; i < 100; i++) {
      await storage.update(`item-${i}`, { retryCount: i, status: 'failed' });
    }
  });
});
