import type { ActionQueueItem } from './types'

export interface QueueStorage {
  add(item: ActionQueueItem): Promise<void>
  getAll(): Promise<ActionQueueItem[]>
  getPending(): Promise<ActionQueueItem[]>
  update(id: string, patch: Partial<ActionQueueItem>): Promise<void>
  remove(id: string): Promise<void>
  clear(): Promise<void>
}

let _storage: QueueStorage | null = null

/** Override the default IndexedDB queue with a custom storage backend (e.g. AsyncStorage for React Native). */
export function setQueueStorage(s: QueueStorage): void {
  _storage = s
}

export function _getQueueStorage(): QueueStorage | null {
  return _storage
}
