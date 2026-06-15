// Demo endpoint for the "queue management" docs example — always fails, so a
// queued `flakyAction` with `maxRetries: 0` lands in the 'failed' state on
// its first replay, ready for `requeueItem()`.
export async function POST() {
  return Response.json(
    { error: 'simulated failure' },
    { status: 500, headers: { 'Cache-Control': 'no-store' } },
  );
}
