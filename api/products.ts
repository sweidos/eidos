import { PRODUCTS } from './shared/products.js';

export function GET() {
  return Response.json(PRODUCTS, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
