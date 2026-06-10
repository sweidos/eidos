export async function POST(request: Request) {
  try {
    const body = await request.json();

    const order = {
      id: `ORD-${Date.now().toString(36).toUpperCase()}`,
      status: 'confirmed',
      items: body,
      createdAt: new Date().toISOString(),
    };

    return Response.json(order, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ error: 'invalid request body' }, { status: 400 });
  }
}
