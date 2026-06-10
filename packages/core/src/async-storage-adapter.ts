import type { ActionQueueItem } from './types';
import type { QueueStorage } from './queue-storage';

/** Minimal subset of @react-native-async-storage/async-storage (or any compatible key-value store). */
export interface AsyncStorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const QUEUE_KEY = '@eidos:queue';

/**
 * QueueStorage implementation backed by any AsyncStorage-compatible API.
 * Pass the AsyncStorage singleton from @react-native-async-storage/async-storage
 * (or MMKV, SQLite, or any store that satisfies AsyncStorageLike).
 */
export class AsyncStorageQueueStorage implements QueueStorage {
  constructor(private readonly storage: AsyncStorageLike) {}

  private async readAll(): Promise<ActionQueueItem[]> {
    try {
      const raw = await this.storage.getItem(QUEUE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as ActionQueueItem[];
    } catch {
      return [];
    }
  }

  private async writeAll(items: ActionQueueItem[]): Promise<void> {
    await this.storage.setItem(QUEUE_KEY, JSON.stringify(items));
  }

  async add(item: ActionQueueItem): Promise<void> {
    const items = await this.readAll();
    items.push(item);
    await this.writeAll(items);
  }

  async getAll(): Promise<ActionQueueItem[]> {
    return this.readAll();
  }

  async getPending(): Promise<ActionQueueItem[]> {
    const items = await this.readAll();
    return items.filter((i) => i.status === 'pending' || i.status === 'failed');
  }

  async update(id: string, patch: Partial<ActionQueueItem>): Promise<void> {
    const items = await this.readAll();
    const idx = items.findIndex((i) => i.id === id);
    if (idx !== -1) items[idx] = { ...items[idx], ...patch };
    await this.writeAll(items);
  }

  async remove(id: string): Promise<void> {
    const items = await this.readAll();
    await this.writeAll(items.filter((i) => i.id !== id));
  }

  async clear(): Promise<void> {
    await this.storage.removeItem(QUEUE_KEY);
  }
}
