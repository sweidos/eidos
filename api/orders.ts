/** Best-effort demo dedupe within a warm isolate (Vercel may cold-start). */
const recentByKey = new Map<string, { order: unknown; at: number }>();
const TTL_MS = 60_000;

function prune(now: number) {
  for (const [key, entry] of recentByKey) {
    if (now - entry.at > TTL_MS) recentByKey.delete(key);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const idempotencyKey = request.headers.get('Idempotency-Key');
    const now = Date.now();

    if (idempotencyKey) {
      prune(now);
      const hit = recentByKey.get(idempotencyKey);
      if (hit) {
        return Response.json(hit.order, {
          headers: {
            'Cache-Control': 'no-store',
            'Idempotency-Replayed': 'true',
          },
        });
      }
    }

    const order = {
      id: `ORD-${Date.now().toString(36).toUpperCase()}`,
      status: 'confirmed',
      items: body,
      createdAt: new Date().toISOString(),
      ...(idempotencyKey ? { idempotencyKey } : {}),
    };

    if (idempotencyKey) {
      recentByKey.set(idempotencyKey, { order, at: now });
    }

    return Response.json(order, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ error: 'invalid request body' }, { status: 400 });
  }
}
