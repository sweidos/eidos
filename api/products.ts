import { PRODUCTS } from './_data/products';

export function GET() {
  return Response.json(PRODUCTS, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
