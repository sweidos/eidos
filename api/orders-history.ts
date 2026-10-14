import { generateOrderHistory } from './shared/orders.js';

export function GET() {
  return Response.json(generateOrderHistory(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
