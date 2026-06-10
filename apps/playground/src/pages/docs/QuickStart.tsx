import { Link } from 'react-router-dom';
import { Card, CardHeader } from '../../components/Card';
import { CodeBlock } from '../../components/CodeBlock';
import { BulletList, SectionHeading } from './shared';

export function QuickStart() {
  return (
    <div className="space-y-5">
      <Card glow className="overflow-hidden">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-eidos-border bg-eidos-elevated/60 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-eidos-muted">
              docs
            </div>
            <div className="space-y-3">
              <h1 className="text-2xl font-semibold text-eidos-text text-balance md:text-3xl">
                Simple enough to scan. Deep enough to ship with.
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-eidos-text-dim md:text-[15px]">
                Start here if you want the short version first. The sidebar walks through setup,
                core APIs as small building blocks, examples, hooks, and the heavier reference
                material — open whichever page answers your question.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                to="/overview"
                className="inline-flex items-center gap-1.5 rounded-full border border-eidos-accent bg-eidos-accent px-4 py-2 text-xs font-semibold text-eidos-bg transition-colors hover:bg-green-400"
              >
                Back to overview
              </Link>
              <Link
                to="/actions"
                className="inline-flex items-center gap-1.5 rounded-full border border-eidos-border px-4 py-2 text-xs font-medium text-eidos-text-dim transition-colors hover:border-eidos-elevated hover:text-eidos-text"
              >
                Open action queue
              </Link>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-eidos-border bg-eidos-surface p-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-eidos-muted">
                what this page covers
              </div>
              <BulletList
                items={[
                  'How to install, wrap, and declare your first resource or action.',
                  'The three-step setup path to a working demo.',
                  'Where to go next for API reference, examples, and advanced topics.',
                ]}
              />
            </div>
          </div>
        </div>
      </Card>

      <section id="quick-start" className="space-y-3">
        <SectionHeading
          id="quick-start"
          eyebrow="quick start"
          title="Set it up in three moves"
          description="Each step does one job so the first pass stays easy to follow."
        />

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="h-full">
            <CardHeader
              title="1. Install"
              description="Add the package and let the Vite plugin keep the service worker in sync."
            />
            <CodeBlock
              title="setup.ts"
              code={`npm install @sweidos/eidos

import { eidos } from '@sweidos/eidos/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [eidos()],
})`}
            />
          </Card>

          <Card className="h-full">
            <CardHeader
              title="2. Wrap the app"
              description="Mount the provider once at the root so the runtime can register the SW."
            />
            <CodeBlock
              title="main.tsx"
              code={`import { createRoot } from 'react-dom/client'
import { EidosProvider } from '@sweidos/eidos'
import { App } from './App'

const root = createRoot(document.getElementById('root')!)

root.render(
  <EidosProvider swPath="/eidos-sw.js">
    <App />
  </EidosProvider>
)`}
            />
          </Card>

          <Card className="h-full">
            <CardHeader
              title="3. Declare intent"
              description="Keep resources and actions at module scope so replay can find them later."
            />
            <CodeBlock
              title="src/lib/eidos.ts"
              code={`import { resource, action } from '@sweidos/eidos'

export const products = resource('/api/products', { offline: true })

export const createOrder = action(
  async (payload: OrderPayload) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    return res.json()
  },
  { reliability: 'neverLose', name: 'createOrder' },
)`}
            />
          </Card>
        </div>
      </section>

      <Card>
        <CardHeader
          title="Use this page when..."
          description="A short checklist keeps the page from feeling like a wall of text."
        />
        <BulletList
          items={[
            'You want the shortest path from install to a working demo.',
            'You need a refresher on the three-step setup.',
            'You are ready to move on to API reference or examples.',
          ]}
        />
      </Card>
    </div>
  );
}
