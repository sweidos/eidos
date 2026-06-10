import { Card, CardHeader } from '../../components/Card';
import { CodeBlock } from '../../components/CodeBlock';
import { BulletList, OnThisPage, SectionHeading, slugify } from './shared';

const SECTIONS = ['resource(url, config)', 'action(fn, config)', 'EidosProvider', 'replayQueue()'];

export function ApiReference() {
  return (
    <section id="core" className="space-y-3">
      <SectionHeading
        id="core"
        eyebrow="core api"
        title="The small set of primitives you use most"
        description="These cards keep one idea per surface so the mental model stays lightweight."
      />

      <OnThisPage items={SECTIONS} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="h-full scroll-mt-20" id={slugify(SECTIONS[0])}>
          <CardHeader
            title="resource(url, config)"
            description="Register a GET endpoint as offline-capable and let Eidos pick the cache strategy."
            action={
              <span className="rounded-full border border-eidos-border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-eidos-muted">
                cache
              </span>
            }
          />
          <BulletList
            items={[
              'Use `offline: true` to enable fetch interception and cache persistence.',
              'Override `strategy` only when you want to force a specific cache policy.',
              'Add `maxAge` when the data should refresh after a short TTL.',
            ]}
          />
          <CodeBlock
            className="mt-4"
            title="resource.ts"
            code={`const products = resource('/api/products', {
  offline: true,
})

const data = await products.json<Product[]>()`}
          />
        </Card>

        <Card className="h-full scroll-mt-20" id={slugify(SECTIONS[1])}>
          <CardHeader
            title="action(fn, config)"
            description="Wrap async mutations so offline writes are persisted and replayed later."
            action={
              <span className="rounded-full border border-eidos-border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-eidos-muted">
                queue
              </span>
            }
          />
          <BulletList
            items={[
              'Use `reliability: "neverLose"` when dropping a write would be painful.',
              'Give anonymous functions a `name` so replay can find them after refresh.',
              'Tune `maxRetries` when you need a shorter or longer retry window.',
              '`onOptimistic` updates the UI instantly; `onRollback` reverts if the action permanently fails.',
            ]}
          />
          <CodeBlock
            className="mt-4"
            title="action.ts"
            code={`const createOrder = action(
  async (payload: OrderPayload) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return res.json()
  },
  {
    reliability: 'neverLose',
    name: 'createOrder',
    onOptimistic: (payload) => addOptimisticOrder(payload),
    onRollback:   (payload) => removeOptimisticOrder(payload),
  },
)`}
          />
        </Card>

        <Card className="h-full scroll-mt-20" id={slugify(SECTIONS[2])}>
          <CardHeader
            title="EidosProvider"
            description="Register the SW and hydrate the runtime once near the root of the app."
            action={
              <span className="rounded-full border border-eidos-border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-eidos-muted">
                root
              </span>
            }
          />
          <BulletList
            items={[
              'Set `swPath` if the worker lives somewhere other than `/eidos-sw.js`.',
              'Leave `autoReplay` on unless you want full manual control of queue replay.',
              'Keep the provider near the root so status hooks stay available everywhere.',
            ]}
          />
          <CodeBlock
            className="mt-4"
            title="main.tsx"
            code={`<EidosProvider swPath="/eidos-sw.js" autoReplay>
  <App />
</EidosProvider>`}
          />
        </Card>

        <Card className="h-full scroll-mt-20" id={slugify(SECTIONS[3])}>
          <CardHeader
            title="replayQueue()"
            description="Trigger queue replay yourself when you want a manual recovery action."
            action={
              <span className="rounded-full border border-eidos-border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-eidos-muted">
                replay
              </span>
            }
          />
          <BulletList
            items={[
              'Usually runs automatically when connectivity returns.',
              'Useful for a "Retry now" button or a manual sync control.',
              'Returns a result summary so you can surface what happened.',
            ]}
          />
          <CodeBlock
            className="mt-4"
            title="recovery.ts"
            code={`const result = await replayQueue()
// { attempted, succeeded, failed, retrying, skipped }`}
          />
        </Card>
      </div>
    </section>
  );
}
