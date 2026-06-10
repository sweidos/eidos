import { Card, CardHeader } from '../../components/Card';
import { CodeBlock } from '../../components/CodeBlock';
import { OnThisPage, SectionHeading, slugify } from './shared';

const SECTIONS = ['TanStack Query bridge', 'TTL-backed resource', 'Offline test mode', 'Status hook'];

export function Examples() {
  return (
    <section id="examples" className="space-y-3">
      <SectionHeading
        id="examples"
        eyebrow="examples"
        title="A few concrete patterns"
        description="These are the patterns people usually want on the first pass: query integration, TTLs, and offline recovery."
      />

      <OnThisPage items={SECTIONS} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="h-full scroll-mt-20" id={slugify(SECTIONS[0])}>
          <CardHeader
            title="TanStack Query bridge"
            description="Keep the existing query layer and let Eidos handle the offline-aware source."
          />
          <CodeBlock
            title="queries.ts"
            code={`const { data } = useQuery(products.query<Product[]>())

const mutation = useEidosMutation(createOrder, {
  invalidates: [products],
})`}
          />
        </Card>

        <Card className="h-full scroll-mt-20" id={slugify(SECTIONS[1])}>
          <CardHeader
            title="TTL-backed resource"
            description="Use a small max age when the data should stay fresh without constant refetching."
          />
          <CodeBlock
            title="orders.ts"
            code={`export const ordersHistory = resource('/api/orders-history', {
  offline: true,
  strategy: 'cache-first',
  maxAge: 30_000,
})`}
          />
        </Card>

        <Card className="h-full scroll-mt-20" id={slugify(SECTIONS[2])}>
          <CardHeader
            title="Offline test mode"
            description="Use simulation to exercise the queue flow without physically disconnecting."
          />
          <CodeBlock
            title="test.ts"
            code={`setOfflineSimulation(true)

await createOrder({
  productId: 1,
  quantity: 2,
  customerName: 'Demo User',
})

await replayQueue()`}
          />
        </Card>

        <Card className="h-full scroll-mt-20" id={slugify(SECTIONS[3])}>
          <CardHeader
            title="Status hook"
            description="Drive header chips, connection badges, or any other lightweight status UI."
          />
          <CodeBlock
            title="header.tsx"
            code={`const { isOnline, swStatus } = useEidosStatus()
const { pending, failed } = useEidosQueueStats()`}
          />
        </Card>
      </div>
    </section>
  );
}
