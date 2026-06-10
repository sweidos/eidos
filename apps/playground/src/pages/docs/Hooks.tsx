import { Card, CardHeader } from '../../components/Card';
import { CodeBlock } from '../../components/CodeBlock';
import { BulletList, OnThisPage, SectionHeading, slugify } from './shared';

const SECTIONS = ['React hooks', 'Framework-agnostic stores'];

export function Hooks() {
  return (
    <section id="hooks" className="space-y-3">
      <SectionHeading
        id="hooks"
        eyebrow="hooks & stores"
        title="React hooks for live UI, stores for everything else"
        description="Use the narrower hook whenever you can; reach for the full store only when you need a broad snapshot."
      />

      <OnThisPage items={SECTIONS} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="h-full scroll-mt-20" id={slugify(SECTIONS[0])}>
          <CardHeader
            title="React hooks"
            description="The common set you’ll use for status, cache state, and queue counters."
          />
          <BulletList
            items={[
              '`useEidosStatus()` for online / service-worker state in headers and shell UI.',
              '`useEidosResource(url)` for live cache state on a single resource.',
              '`useEidosQueueStats()` for lightweight pending / failed / replaying counters.',
              '`useEidosAction(id)` for a single queue item and `useEidosOnDrain()` for sync notifications.',
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

        <Card className="h-full scroll-mt-20" id={slugify(SECTIONS[1])}>
          <CardHeader
            title="Framework-agnostic stores"
            description="Svelte, Vue, and vanilla JS can subscribe to the same store primitives."
          />
          <BulletList
            items={[
              'No React dependency is required for the store layer.',
              'The stores follow the Svelte `subscribe(run)` contract.',
              'Use them directly when you need fine-grained integration in other frameworks.',
            ]}
          />
          <CodeBlock
            className="mt-4"
            title="store.ts"
            code={`const unsub = eidosStatus.subscribe(({ isOnline }) => {
  document.title = isOnline ? 'App' : 'App (offline)'
})

const hits = eidosResource('/api/products').getState()?.cacheHits ?? 0
unsub()`}
          />
        </Card>
      </div>
    </section>
  );
}
