import { PRODUCTS } from '../_data/products';

// Demo endpoint for the "URL patterns" docs example — registered with
// resourcePattern('/api/products/:id', ...) so the SW intercepts and caches
// every product detail request under one pattern.
export function GET(request: Request) {
  const id = Number(new URL(request.url).pathname.split('/').pop());
  const product = PRODUCTS.find((p) => p.id === id);

  if (!product) {
    return Response.json({ error: 'not found' }, { status: 404 });
  }

  return Response.json(product, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
