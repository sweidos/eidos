import { generateOrderHistory } from './_data/orders';

export function GET() {
  return Response.json(generateOrderHistory(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
