// Module-scope declarations — action functions are registered here so they
// survive page refreshes and are available for queue replay on reconnect.
import { resource, action } from '@sweidos/eidos';

// ── Resources ─────────────────────────────────────────────────────────────────

export const productsResource = resource<Product[]>('/api/products', {
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
  async (payload: OrderPayload): Promise<Order> => {
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
