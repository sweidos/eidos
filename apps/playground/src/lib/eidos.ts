// Module-scope declarations — action functions are registered here so they
// survive page refreshes and are available for queue replay on reconnect.
import { resource, resourcePattern, action } from '@sweidos/eidos';
import type { ActionContext } from '@sweidos/eidos';

// ── Resources ─────────────────────────────────────────────────────────────────

export const productsResource = resource<Product[]>('/api/products', {
  offline: true,
});

// Demonstrates resourcePattern() — one registration covers every
// /api/products/:id detail request. The SW intercepts and caches each
// matched URL independently; invalidate() clears all of them at once.
export const productDetailPattern = resourcePattern('/api/products/:id', {
  offline: true,
});

// Demonstrates maxAge — CacheFirst with 30-second TTL.
// After 30s the entry is treated as stale and re-fetched from network.
export const ordersHistoryResource = resource<Order[]>('/api/orders-history', {
  offline: true,
  strategy: 'cache-first',
  maxAge: 30_000,
});

// ── Actions ───────────────────────────────────────────────────────────────────

export const createOrder = action(
  async (payload: OrderPayload, _ctx: ActionContext): Promise<Order> => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Order failed: ${res.status}`);
    return res.json() as Promise<Order>;
  },
  {
    reliability: 'neverLose',
    name: 'createOrder',
  },
);

// Thrown by `reserveStock` when the server has fewer units than requested.
// `available` carries the server's count so `conflict.resolve` can rewrite
// the queued args to a quantity that will succeed on retry.
export class StockConflictError extends Error {
  status = 409;
  constructor(public available: number) {
    super(`only ${available} unit(s) available`);
    this.name = 'StockConflictError';
  }
}

// Demonstrates `conflict` — replaying a queued reservation that now exceeds
// stock rewrites the quantity to what the server says is available, instead
// of retrying forever or dropping the write outright.
export const reserveStock = action(
  async (payload: { productId: number; quantity: number }, _ctx: ActionContext) => {
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.status === 409) {
      const { available } = (await res.json()) as { available: number };
      throw new StockConflictError(available);
    }
    if (!res.ok) throw new Error(`Reservation failed: ${res.status}`);
    return res.json() as Promise<{ reserved: number; productId: number }>;
  },
  {
    reliability: 'neverLose',
    name: 'reserveStock',
    conflict: {
      strategy: 'custom',
      resolve: ({ error, args }) => {
        if (error instanceof StockConflictError && error.available > 0) {
          const [payload] = args as [{ productId: number; quantity: number }];
          return { resolved: [{ ...payload, quantity: error.available }] };
        }
        return 'skip';
      },
    },
  },
);

// Demonstrates queue management — `/api/flaky` always 500s, and
// `maxRetries: 1` means the first replay attempt fails and is retried once
// more, then the item lands in 'failed' and is ready for `requeueItem()`.
export const flakyAction = action(
  async (payload: { note: string }, _ctx: ActionContext) => {
    const res = await fetch('/api/flaky', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`flaky failed: ${res.status}`);
    return res.json();
  },
  {
    reliability: 'neverLose',
    name: 'flakyAction',
    maxRetries: 1,
  },
);

// ── Domain types ──────────────────────────────────────────────────────────────

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  stock: number;
}

export interface OrderPayload {
  productId: number;
  quantity: number;
  customerName: string;
}

export interface Order {
  id: string;
  status: string;
  items: OrderPayload;
  createdAt: string;
}
