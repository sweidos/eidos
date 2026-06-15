import type { ActionQueueItem, QueueStorage } from '@sweidos/eidos';

/**
 * Minimal SQL driver surface this adapter needs. Matches the shape of
 * `@tauri-apps/plugin-sql`'s `Database` (execute/select) and is trivial to
 * satisfy with a thin wrapper around `better-sqlite3` (Electron/Node) —
 * wrap each sync call in `Promise.resolve()`.
 */
export interface SqliteLike {
  execute(query: string, bindValues?: unknown[]): Promise<unknown>;
  select<T>(query: string, bindValues?: unknown[]): Promise<T[]>;
}

const DEFAULT_TABLE = 'eidos_action_queue';

/**
 * QueueStorage implementation backed by SQLite (Tauri, Electron, or any
 * driver satisfying `SqliteLike`). Each queue item is stored as a JSON blob
 * keyed by id, with `status` denormalized into its own column so
 * `getPending()` can filter in SQL.
 */
export class SqliteQueueStorage implements QueueStorage {
  private readonly table: string;
  private ready: Promise<void> | null = null;

  constructor(
    private readonly db: SqliteLike,
    options: { tableName?: string } = {},
  ) {
    this.table = options.tableName ?? DEFAULT_TABLE;
  }

  private ensureTable(): Promise<void> {
    if (!this.ready) {
      this.ready = this.db
        .execute(
          `CREATE TABLE IF NOT EXISTS ${this.table} (
            id TEXT PRIMARY KEY,
            status TEXT NOT NULL,
            data TEXT NOT NULL
          )`,
        )
        .then(() => undefined);
    }
    return this.ready;
  }

  async add(item: ActionQueueItem): Promise<void> {
    await this.ensureTable();
    await this.db.execute(
      `INSERT OR REPLACE INTO ${this.table} (id, status, data) VALUES (?, ?, ?)`,
      [item.id, item.status, JSON.stringify(item)],
    );
  }

  async getAll(): Promise<ActionQueueItem[]> {
    await this.ensureTable();
    const rows = await this.db.select<{ data: string }>(`SELECT data FROM ${this.table}`);
    return rows.map((row) => JSON.parse(row.data) as ActionQueueItem);
  }

  async getPending(): Promise<ActionQueueItem[]> {
    await this.ensureTable();
    const rows = await this.db.select<{ data: string }>(
      `SELECT data FROM ${this.table} WHERE status = ? OR status = ?`,
      ['pending', 'failed'],
    );
    return rows.map((row) => JSON.parse(row.data) as ActionQueueItem);
  }

  async update(id: string, patch: Partial<ActionQueueItem>): Promise<void> {
    await this.ensureTable();
    const rows = await this.db.select<{ data: string }>(
      `SELECT data FROM ${this.table} WHERE id = ?`,
      [id],
    );
    if (rows.length === 0) return;
    const merged = { ...(JSON.parse(rows[0].data) as ActionQueueItem), ...patch };
    await this.db.execute(`UPDATE ${this.table} SET status = ?, data = ? WHERE id = ?`, [
      merged.status,
      JSON.stringify(merged),
      id,
    ]);
  }

  async remove(id: string): Promise<void> {
    await this.ensureTable();
    await this.db.execute(`DELETE FROM ${this.table} WHERE id = ?`, [id]);
  }

  async clear(): Promise<void> {
    await this.ensureTable();
    await this.db.execute(`DELETE FROM ${this.table}`);
  }
}
