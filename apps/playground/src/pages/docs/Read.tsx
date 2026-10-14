import { Link } from 'react-router';
import { CodeBlock } from '../../components/CodeBlock';
import { BulletList, PageIntro, StoryBox } from './shared';

export function Read() {
  return (
    <div className="space-y-8 animate-fade-in">
      <PageIntro
        title="Read offline"
        lead="resource() tells Eidos which GETs to cache. Supporting feature — Save is still the hero."
        next={{ to: '/docs/safety', label: 'When things break' }}
      />

      <StoryBox>
        Think of a library card for one shelf. You ask for the shelf once. Later, even if the road
        to the library is closed, you can still open the book you already checked out — and Eidos
        can quietly check for a newer edition when the road opens.
      </StoryBox>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-eidos-text">Declare a read</h2>
        <CodeBlock
          title="products.ts"
          code={`import { resource } from '@sweidos/eidos'

export const products = resource('/api/products', {
  offline: true, // cache + SW interception
})

const list = await products.json<Product[]>()`}
        />
        <BulletList
          items={[
            '`offline: true` defaults to stale-while-revalidate (fast + refresh in background).',
            'Override strategy with cache-first, network-first, or stale-while-revalidate.',
            'Same handle: `products.fetch()`, `.json()`, `.prefetch()`, `.invalidate()`.',
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-eidos-text">Many URLs, one registration</h2>
        <CodeBlock
          title="patterns"
          code={`import { resourcePattern } from '@sweidos/eidos'

export const productPages = resourcePattern('/api/products/*', {
  offline: true,
})`}
        />
        <p className="text-sm text-eidos-text-dim">
          Patterns are for Service Worker interception — use{' '}
          <code className="font-mono text-eidos-blue">invalidate()</code> to clear matches. See{' '}
          <Link to="/docs/recipes" className="text-eidos-accent hover:text-green-400">
            Recipes
          </Link>{' '}
          for live examples.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-eidos-text">Inspect cached reads</h2>
        <Link
          to="/resources"
          className="inline-flex min-h-10 items-center rounded-md border border-eidos-border px-4 text-sm font-medium text-eidos-text-dim transition-colors hover:border-eidos-accent hover:text-eidos-text"
        >
          Open resources lab
        </Link>
      </section>
    </div>
  );
}
