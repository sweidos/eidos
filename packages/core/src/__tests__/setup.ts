import 'fake-indexeddb/auto'
import { vi } from 'vitest'

// ── Browser API stubs ─────────────────────────────────────────────────────────

// Cache Storage
const cacheStore = new Map<string, Map<string, Response>>()

const makeCacheObject = (name: string) => ({
  match: vi.fn(async (req: Request | string) => {
    const key = typeof req === 'string' ? req : req.url
    return cacheStore.get(name)?.get(key) ?? undefined
  }),
  put: vi.fn(async (req: Request | string, res: Response) => {
    const key = typeof req === 'string' ? req : req.url
    if (!cacheStore.has(name)) cacheStore.set(name, new Map())
    cacheStore.get(name)!.set(key, res)
  }),
  delete: vi.fn(async (req: Request | string) => {
    const key = typeof req === 'string' ? req : req.url
    return cacheStore.get(name)?.delete(key) ?? false
  }),
  keys: vi.fn(async () =>
    Array.from(cacheStore.get(name)?.keys() ?? []).map(
      (url) => new Request(url),
    ),
  ),
})

globalThis.caches = {
  open: vi.fn(async (name: string) => makeCacheObject(name)),
  has: vi.fn(async (name: string) => cacheStore.has(name)),
  delete: vi.fn(async (name: string) => { cacheStore.delete(name); return true }),
  keys: vi.fn(async () => Array.from(cacheStore.keys())),
  match: vi.fn(async () => undefined),
} as unknown as CacheStorage

// Service Worker
Object.defineProperty(globalThis, 'navigator', {
  value: {
    onLine: true,
    serviceWorker: {
      register: vi.fn().mockResolvedValue({
        active: { postMessage: vi.fn(), state: 'activated' },
        installing: null,
        waiting: null,
        addEventListener: vi.fn(),
      }),
      addEventListener: vi.fn(),
      controller: { postMessage: vi.fn() },
      ready: Promise.resolve({
        active: { postMessage: vi.fn() },
      }),
    },
  },
  writable: true,
})

// Reset cache store between tests
beforeEach(() => {
  cacheStore.clear()
  vi.clearAllMocks()
})
