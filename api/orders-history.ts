export function GET() {
  const history = Array.from({ length: 5 }, (_, i) => ({
    id: `ORD-HIST-${i + 1}`,
    status: 'delivered',
    items: { productId: i + 1, quantity: 1, customerName: 'Demo User' },
    createdAt: new Date(Date.now() - i * 86_400_000).toISOString(),
  }))

  return Response.json(history, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
