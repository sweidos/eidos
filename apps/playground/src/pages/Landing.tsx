import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { CodeBlock } from '../components/CodeBlock';

const HERO_CODE = `import { resource, action } from '@sweidos/eidos'

// Read — still works offline
export const products = resource('/api/products', { offline: true })

// Save — never lose this click
export const createOrder = action(submitOrder, {
  reliability: 'neverLose',
  name: 'createOrder',
})`;

export function Landing() {
  return (
    <div className="relative">
      {/* Atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] overflow-hidden"
      >
        <div className="absolute -left-1/4 top-0 h-[28rem] w-[28rem] rounded-full bg-sky-400/10 blur-3xl animate-pulse-soft" />
        <div className="absolute -right-1/4 top-24 h-[24rem] w-[24rem] rounded-full bg-emerald-500/10 blur-3xl animate-pulse-soft-delayed" />
        <div className="hero-grid absolute inset-0 opacity-[0.35]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 pb-20 pt-14 sm:px-6 sm:pt-20">
        {/* Hero — brand first, one job */}
        <section className="flex min-h-[min(72vh,640px)] flex-col justify-center animate-rise">
          <p className="font-mono text-sm font-semibold tracking-[0.35em] text-eidos-accent">
            EIDOS
          </p>

          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-eidos-text sm:text-5xl md:text-6xl">
            Never lose a write.
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-eidos-text-dim sm:text-lg">
            When someone hits Save, Eidos keeps that click until the server says OK — even if the
            network dies mid-way.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              to="/docs/start"
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-eidos-accent px-5 text-sm font-semibold text-eidos-bg transition-transform duration-200 hover:scale-[1.02] hover:bg-green-400"
            >
              Start in 3 steps
              <ArrowRight size={15} />
            </Link>
            <Link
              to="/try"
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-eidos-border px-5 text-sm font-semibold text-eidos-text-dim transition-colors hover:border-eidos-accent hover:text-eidos-text"
            >
              Try it live
            </Link>
          </div>
        </section>

        {/* One composition continuation: the two words */}
        <section className="mt-6 grid gap-8 border-t border-eidos-border/70 pt-14 sm:grid-cols-2 animate-rise-delayed">
          <div>
            <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-eidos-muted">
              Two words
            </h2>
            <ul className="mt-4 space-y-5">
              <li>
                <p className="text-lg font-semibold text-eidos-text">
                  Save → <code className="font-mono text-eidos-accent">action()</code>
                </p>
                <p className="mt-1 text-sm text-eidos-text-dim">
                  Pocket the click. Replay when online. Same ticket number every retry.
                </p>
              </li>
              <li>
                <p className="text-lg font-semibold text-eidos-text">
                  Read → <code className="font-mono text-eidos-blue">resource()</code>
                </p>
                <p className="mt-1 text-sm text-eidos-text-dim">
                  Cache the shelf so the list still opens on a dead network.
                </p>
              </li>
            </ul>
          </div>
          <div className="min-w-0">
            <CodeBlock title="src/lib/eidos.ts" code={HERO_CODE} />
          </div>
        </section>

        <section className="mt-16 border-t border-eidos-border/70 pt-12 animate-rise-delayed">
          <h2 className="text-xl font-semibold text-eidos-text sm:text-2xl">Honest promise</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-eidos-text-dim sm:text-[15px]">
            Delivery is <span className="text-eidos-text">at least once</span>. Your server must
            dedupe with the idempotency key. Eidos is not magical exactly-once. If you only need
            online cache UI, use TanStack Query. If you only need SW assets, use Workbox.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/docs/safety"
              className="text-sm font-medium text-eidos-accent hover:text-green-400"
            >
              When things break →
            </Link>
            <Link
              to="/docs/save"
              className="text-sm font-medium text-eidos-accent hover:text-green-400"
            >
              Never lose a save →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
