import { PRODUCTS } from './_data/products';

// Demo endpoint for the "conflict resolution" docs example. Reserving more
// units than are in stock returns 409 with the actual `available` count, so
// the client's `ConflictConfig.resolve` can rewrite the queued args and retry.
export async function POST(request: Request) {
  let body: { productId?: number; quantity?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid request body' }, { status: 400 });
  }

  const product = PRODUCTS.find((p) => p.id === body.productId);
  if (!product) {
    return Response.json({ error: 'unknown product' }, { status: 404 });
  }

  const quantity = body.quantity ?? 0;
  if (quantity > product.stock) {
    return Response.json(
      { error: 'insufficient_stock', available: product.stock },
      { status: 409, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return Response.json(
    { reserved: quantity, productId: product.id },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
