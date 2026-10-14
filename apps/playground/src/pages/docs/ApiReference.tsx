import { Card, CardHeader } from '../../components/Card';
import { CodeBlock } from '../../components/CodeBlock';
import { BulletList, OnThisPage, PageIntro, slugify } from './shared';

const SECTIONS = [
  'resource(url, config)',
  'action(fn, config)',
  'EidosProvider',
  'replayQueue()',
  'conflict (ConflictConfig)',
  'React hooks',
  'Framework-agnostic stores',
];

export function ApiReference() {
  return (
    <div className="space-y-5 animate-fade-in">
      <PageIntro
        title="API cheat sheet"
        lead="The small set you actually need. Prefer Start here if you have not installed yet."
        next={{ to: '/docs/advanced', label: 'Advanced' }}
      />

      <OnThisPage items={SECTIONS} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="h-full scroll-mt-20" id={slugify(SECTIONS[0])}>
          <CardHeader
            title="resource(url, config)"
            description="Register a GET as offline-capable and let Eidos pick a cache strategy."
          />
          <BulletList
            items={[
              'Use `offline: true` to enable fetch interception and cache persistence.',
              'Override `strategy` only when you want a specific cache policy.',
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
            description="Wrap a mutation so neverLose keeps the click across offline and reload."
          />
          <BulletList
            items={[
              "Set `reliability: 'neverLose'` for durable queueing.",
              'Stable `name` is required so replay works after reload.',
              'Read `idempotencyKey` from `ActionContext` for server dedupe.',
            ]}
          />
          <CodeBlock
            className="mt-4"
            title="action.ts"
            code={`const createOrder = action(submitOrder, {
  reliability: 'neverLose',
  name: 'createOrder',
})

const result = await createOrder(payload)`}
          />
        </Card>

        <Card className="h-full scroll-mt-20" id={slugify(SECTIONS[2])}>
          <CardHeader
            title="EidosProvider"
            description="Mount once at the root — registers the service worker and hydrates the runtime."
          />
          <BulletList
            items={[
              'Defaults to `/eidos-sw.js` — pass `swPath` only if you renamed the file.',
              'Children get hooks: status, queue, resources.',
              'Auto-replay on reconnect is on by default.',
            ]}
          />
          <CodeBlock
            className="mt-4"
            title="main.tsx"
            code={`<EidosProvider>
  <App />
</EidosProvider>`}
          />
        </Card>

        <Card className="h-full scroll-mt-20" id={slugify(SECTIONS[3])}>
          <CardHeader
            title="replayQueue()"
            description="Manually drain the pocket when you want control."
          />
          <BulletList
            items={[
              'Usually automatic on reconnect / Background Sync.',
              'Useful after fixing a failed item or leaving airplane mode.',
              'Also: `clearQueue()`, `requeueItem()`, `cancelByIdempotencyKey()`.',
            ]}
          />
          <CodeBlock
            className="mt-4"
            title="replay.ts"
            code={`import { replayQueue } from '@sweidos/eidos'

await replayQueue()`}
          />
        </Card>

        <Card className="h-full scroll-mt-20 lg:col-span-2" id={slugify(SECTIONS[4])}>
          <CardHeader
            title="conflict (ConflictConfig)"
            description="Only consulted when a replay receives a 4xx — decide skip, retry, or rewrite."
          />
          <BulletList
            items={[
              '`serverWins` drops the queued item; `clientWins` keeps retrying.',
              '`merge` / `custom` call `resolve(ctx)` with error, args, and attempt count.',
              "Return `{ resolved: args }` to rewrite and retry, or `'skip'` to drop it.",
            ]}
          />
          <CodeBlock
            className="mt-4"
            title="conflict.ts"
            code={`action(reserveStock, {
  reliability: 'neverLose',
  name: 'reserveStock',
  conflict: {
    strategy: 'custom',
    resolve: ({ error, args }) => {
      if (error instanceof StockConflictError) {
        const [payload] = args
        return { resolved: [{ ...payload, quantity: error.available }] }
      }
      return 'skip'
    },
  },
})`}
          />
        </Card>

        <Card className="h-full scroll-mt-20" id={slugify(SECTIONS[5])}>
          <CardHeader
            title="React hooks"
            description="Live UI for online state, queue counters, and drain events."
          />
          <BulletList
            items={[
              '`useEidosStatus()` — online / service-worker state.',
              '`useEidosQueueStats()` — pending / failed / replaying.',
              '`useEidosOnDrain()` — toast when the pocket empties.',
              '`useEidosResource(url)` / `useEidosAction(id)` for single items.',
            ]}
          />
          <CodeBlock
            className="mt-4"
            title="hooks.tsx"
            code={`const { isOnline, swStatus } = useEidosStatus()
const { pending, failed } = useEidosQueueStats()

useEidosOnDrain(() => toast.success('All offline actions synced'))`}
          />
        </Card>

        <Card className="h-full scroll-mt-20" id={slugify(SECTIONS[6])}>
          <CardHeader
            title="Framework-agnostic stores"
            description="Svelte, Vue, and vanilla JS subscribe to the same primitives."
          />
          <BulletList
            items={[
              'Stores follow the Svelte `subscribe(run)` contract.',
              '`eidosStatus`, `eidosQueue`, `eidosQueueStats`, `eidosResource`, `eidosAction`.',
              'No React required for the store layer.',
            ]}
          />
          <CodeBlock
            className="mt-4"
            title="store.ts"
            code={`const unsub = eidosStatus.subscribe(({ isOnline }) => {
  document.title = isOnline ? 'App' : 'App (offline)'
})
unsub()`}
          />
        </Card>
      </div>
    </div>
  );
}
