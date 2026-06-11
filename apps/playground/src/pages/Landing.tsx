import { Link } from 'react-router-dom';
import { ArrowRight, Wifi, RefreshCw, Database, ShieldCheck, Layers, Zap } from 'lucide-react';
import { CodeBlock } from '../components/CodeBlock';

const FEATURES = [
  {
    icon: Database,
    title: 'resource()',
    description:
      'Declare a fetchable endpoint once. Eidos handles caching strategy, freshness, and offline reads automatically.',
  },
  {
    icon: RefreshCw,
    title: 'action()',
    description:
      'Mutations queue when offline and replay in order once the network returns — with conflict-resolution presets.',
  },
  {
    icon: Wifi,
    title: 'Generated Service Worker',
    description:
      'No hand-written Workbox config. Eidos generates the Service Worker and registers it for you.',
  },
  {
    icon: Layers,
    title: 'Cache strategies built in',
    description:
      'cache-first, network-first, and stale-while-revalidate — pick per resource, no boilerplate.',
  },
  {
    icon: ShieldCheck,
    title: 'Idempotent replay',
    description:
      'Idempotency keys and replay locks keep retried mutations safe, even across reloads.',
  },
  {
    icon: Zap,
    title: 'Framework-agnostic',
    description:
      'React hooks ship today. Stores follow the Svelte contract — works with Vue and vanilla JS too.',
  },
] as const;

const CODE_SAMPLE = `import { resource, action } from '@sweidos/eidos'

export const products = resource('/api/products', {
  offline: true,
  strategy: 'stale-while-revalidate',
})

export const createOrder = action('/api/orders', {
  method: 'POST',
  conflict: 'last-write-wins',
})

const data = await products.json<Product[]>()`;

export function Landing() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
      {/* Hero */}
      <section className="flex flex-col items-center text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-eidos-border px-3 py-1 text-2xs text-eidos-muted">
          <Zap size={11} className="text-eidos-accent" />
          Offline-first, declared in minutes
        </span>

        <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-eidos-text sm:text-5xl md:text-6xl">
          Offline-first, <span className="text-eidos-accent">made declarative</span>
        </h1>

        <p className="mt-5 max-w-2xl text-base text-eidos-text-dim sm:text-md">
          <code className="font-mono text-eidos-blue">resource()</code> and{' '}
          <code className="font-mono text-eidos-blue">action()</code> replace 200 lines of Workbox
          config, IndexedDB schema, and retry logic. Works with React, Next.js, Svelte, Vue, and
          React Native.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/docs/quickstart"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-eidos-accent px-5 text-sm font-semibold text-eidos-bg transition-colors duration-150 hover:bg-eidos-accent/90"
          >
            Get started
            <ArrowRight size={15} />
          </Link>
          <Link
            to="/overview"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-eidos-border px-5 text-sm font-semibold text-eidos-text-dim transition-colors duration-150 hover:border-eidos-elevated hover:text-eidos-text"
          >
            Live playground
          </Link>
        </div>
      </section>

      {/* Code sample */}
      <section className="mt-16 sm:mt-24">
        <CodeBlock title="resources.ts" code={CODE_SAMPLE} />
      </section>

      {/* Feature bento grid */}
      <section className="mt-16 sm:mt-24">
        <h2 className="text-center text-2xl font-bold text-eidos-text sm:text-3xl">
          Everything offline-first needs, declared
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-eidos-muted">
          One config surface for caching, queuing, and replay — generated, not hand-rolled.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-eidos-border/80 bg-eidos-surface/95 p-5 transition-colors duration-200 hover:border-eidos-elevated"
            >
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-eidos-border bg-eidos-accent-dim text-eidos-accent">
                <Icon size={16} />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-eidos-text">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-eidos-muted">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mt-16 flex flex-col items-center rounded-2xl border border-eidos-border bg-eidos-surface/60 px-6 py-12 text-center sm:mt-24">
        <h2 className="text-2xl font-bold text-eidos-text sm:text-3xl">
          Ship offline support without the boilerplate
        </h2>
        <p className="mt-3 max-w-lg text-sm text-eidos-muted">
          Install <code className="font-mono text-eidos-blue">@sweidos/eidos</code> and declare your
          first resource in under five minutes.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/docs/quickstart"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-eidos-accent px-5 text-sm font-semibold text-eidos-bg transition-colors duration-150 hover:bg-eidos-accent/90"
          >
            Read the docs
            <ArrowRight size={15} />
          </Link>
          <Link
            to="/overview"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-eidos-border px-5 text-sm font-semibold text-eidos-text-dim transition-colors duration-150 hover:border-eidos-elevated hover:text-eidos-text"
          >
            Try the playground
          </Link>
        </div>
      </section>
    </div>
  );
}
