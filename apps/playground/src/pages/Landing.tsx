import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Wifi,
  RefreshCw,
  Database,
  ShieldCheck,
  Layers,
  Zap,
  BellRing,
  Gauge,
} from 'lucide-react';
import { CodeBlock } from '../components/CodeBlock';

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'neverLose reliability',
    description:
      'Idempotency keys on every retry, Web Locks-coordinated replay across tabs, and queue schema migration — a queued write executes exactly once.',
  },
  {
    icon: RefreshCw,
    title: 'action()',
    description:
      'Mutations queue when offline and replay in order once the network returns — with conflict-resolution presets (serverWins, clientWins, merge, custom).',
  },
  {
    icon: Database,
    title: 'resource()',
    description:
      'Declare a fetchable endpoint once. Eidos handles caching strategy, freshness, and offline reads automatically.',
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
    icon: Zap,
    title: 'Every runtime, one queue contract',
    description:
      'React, Next.js Server Actions, SvelteKit, Vue, React Native, and Tauri/Electron (SQLite-backed queue) — all share the same neverLose guarantees.',
  },
  {
    icon: BellRing,
    title: 'Web push, built in',
    description:
      'Subscribe, route notification clicks, and resubscribe on key rotation — headless and tree-shaken unless imported.',
  },
  {
    icon: Gauge,
    title: 'Devtools & inspector',
    description:
      'Live queue, cache state, and offline simulation — plus per-item cancel/retry and idempotency-key inspection.',
  },
] as const;

const CODE_SAMPLE = `import { resource, action } from '@sweidos/eidos'

export const products = resource('/api/products', {
  offline: true,
  strategy: 'stale-while-revalidate',
})

export const createOrder = action(
  async (payload: OrderPayload) => {
    const res = await fetch('/api/orders', { method: 'POST', body: JSON.stringify(payload) })
    return res.json()
  },
  { reliability: 'neverLose', name: 'createOrder' },
)

const data = await products.json<Product[]>()`;

export function Landing() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
      {/* Hero */}
      <section className="flex flex-col items-center text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-eidos-border px-3 py-1 text-2xs text-eidos-muted">
          <ShieldCheck size={11} className="text-eidos-accent" />
          Idempotent by default, even offline
        </span>

        <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-eidos-text sm:text-5xl md:text-6xl">
          Never lose a <span className="text-eidos-accent">write</span>
        </h1>

        <p className="mt-5 max-w-2xl text-base text-eidos-text-dim sm:text-md">
          <code className="font-mono text-eidos-blue">resource()</code> and{' '}
          <code className="font-mono text-eidos-blue">action()</code> replace 200 lines of Workbox
          config, IndexedDB schema, and retry logic — with idempotency keys and cross-tab replay
          locks built in, so a queued mutation runs exactly once. Works with React, Next.js Server
          Actions, SvelteKit, Vue, React Native, and Tauri/Electron.
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
          A reliability core, not just a cache
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-eidos-muted">
          One config surface for caching, queuing, and replay — with the idempotency, locking, and
          conflict-resolution guarantees payments and inventory writes need.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          Ship writes that survive offline, reloads, and retries
        </h2>
        <p className="mt-3 max-w-lg text-sm text-eidos-muted">
          Install <code className="font-mono text-eidos-blue">@sweidos/eidos</code> and declare your
          first <code className="font-mono text-eidos-blue">neverLose</code> action in under five
          minutes.
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
