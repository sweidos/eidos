# @eidos/sqlite-storage

SQLite-backed `QueueStorage` adapter for [`@sweidos/eidos`](https://www.npmjs.com/package/@sweidos/eidos)
`action()` queues. Use this when shipping a Tauri or Electron desktop app
where IndexedDB isn't available (or isn't durable) but a local SQLite
database is.

## Install

```bash
npm install @eidos/sqlite-storage
```

## Usage

### Tauri (`@tauri-apps/plugin-sql`)

```ts
import Database from '@tauri-apps/plugin-sql';
import { setQueueStorage } from '@sweidos/eidos';
import { SqliteQueueStorage } from '@eidos/sqlite-storage';

const db = await Database.load('sqlite:eidos.db');
setQueueStorage(new SqliteQueueStorage(db));
```

`@tauri-apps/plugin-sql`'s `Database` already implements `execute()` /
`select()` with the shapes this adapter expects — pass it straight through.

### Electron / Node (`better-sqlite3`)

`better-sqlite3` is synchronous, so wrap it in the `SqliteLike` interface:

```ts
import BetterSqlite3 from 'better-sqlite3';
import { setQueueStorage } from '@sweidos/eidos';
import { SqliteQueueStorage, type SqliteLike } from '@eidos/sqlite-storage';

const raw = new BetterSqlite3('eidos.db');

const db: SqliteLike = {
  execute: async (query, bindValues = []) => {
    raw.prepare(query).run(...bindValues);
  },
  select: async (query, bindValues = []) => raw.prepare(query).all(...bindValues),
};

setQueueStorage(new SqliteQueueStorage(db));
```

## Options

```ts
new SqliteQueueStorage(db, { tableName: 'eidos_action_queue' });
```

`tableName` defaults to `eidos_action_queue`. The table is created
automatically (`CREATE TABLE IF NOT EXISTS`) on first use — each row stores
the queue item as a JSON blob plus a denormalized `status` column so
`getPending()` can filter in SQL.

## API

Implements the `QueueStorage` interface from `@sweidos/eidos`:

```ts
interface QueueStorage {
  add(item: ActionQueueItem): Promise<void>;
  getAll(): Promise<ActionQueueItem[]>;
  getPending(): Promise<ActionQueueItem[]>;
  update(id: string, patch: Partial<ActionQueueItem>): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}
```

## License

MIT
