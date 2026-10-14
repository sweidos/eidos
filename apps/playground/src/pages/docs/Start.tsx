import { Link } from 'react-router';
import { CodeBlock } from '../../components/CodeBlock';
import { BulletList, PageIntro, Steps, StoryBox } from './shared';

export function Start() {
  return (
    <div className="space-y-8 animate-fade-in">
      <PageIntro
        title="Start here"
        lead="Eidos has two jobs: keep your Save clicks safe when the network flakes, and let reads work offline. Everything else is optional."
        next={{ to: '/docs/save', label: 'Never lose a save' }}
      />

      <StoryBox>
        <p className="font-medium text-eidos-text">The whole product in one sentence</p>
        <p className="mt-1">
          When someone hits Save, Eidos puts that click in a safe pocket (IndexedDB). When the
          network comes back, it sends the click again — with the same ticket number so your server
          does not double-charge.
        </p>
      </StoryBox>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-eidos-text">Three steps</h2>
        <Steps
          items={[
            {
              title: 'Install',
              body: (
                <CodeBlock
                  title="terminal"
                  code={`npm install @sweidos/eidos
# pnpm add @sweidos/eidos`}
                />
              ),
            },
            {
              title: 'Copy the helper file (Vite does this for you)',
              body: (
                <>
                  <p className="mb-2">
                    Add the Vite plugin so{' '}
                    <code className="font-mono text-eidos-blue">eidos-sw.js</code> lands in{' '}
                    <code className="font-mono text-eidos-blue">public/</code> on every build.
                  </p>
                  <CodeBlock
                    title="vite.config.ts"
                    code={`import { defineConfig } from 'vite'
import { eidos } from '@sweidos/eidos/vite'

export default defineConfig({
  plugins: [eidos()],
})`}
                  />
                  <p className="mt-2 text-xs text-eidos-muted">
                    Not on Vite? Copy once:{' '}
                    <code className="font-mono">
                      cp node_modules/@sweidos/eidos/dist/eidos-sw.js public/
                    </code>
                  </p>
                </>
              ),
            },
            {
              title: 'Wrap once, then declare Save + Read',
              body: (
                <>
                  <CodeBlock
                    title="main.tsx"
                    code={`import { createRoot } from 'react-dom/client'
import { EidosProvider } from '@sweidos/eidos'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <EidosProvider swPath="/eidos-sw.js">
    <App />
  </EidosProvider>,
)`}
                  />
                  <div className="mt-3">
                    <CodeBlock
                      title="src/lib/eidos.ts"
                      code={`import { resource, action } from '@sweidos/eidos'
import type { ActionContext } from '@sweidos/eidos'

// Read — cache this GET when offline
export const products = resource('/api/products', { offline: true })

// Save — never lose this write; forward the ticket to your API
export const createOrder = action(
  async (payload, ctx: ActionContext) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': ctx.idempotencyKey,
      },
      body: JSON.stringify(payload),
    })
    return res.json()
  },
  { reliability: 'neverLose', name: 'createOrder' },
)`}
                    />
                  </div>
                  <p className="mt-2 text-xs text-eidos-muted">
                    Keep <code className="font-mono">resource</code> /{' '}
                    <code className="font-mono">action</code> at module scope so replay can find
                    them after a reload.
                  </p>
                </>
              ),
            },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-eidos-text">Call it like a normal function</h2>
        <CodeBlock
          title="OrderButton.tsx"
          code={`const result = await createOrder({ productId: 1, qty: 2 })

if ('queued' in result) {
  // Offline or flaky — already saved in the pocket. Will retry.
  showToast(result.message)
}`}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-eidos-text">Try it without reading more</h2>
        <BulletList
          items={[
            'Open the playground → Try it.',
            'Press sim offline in the header.',
            'Hit Save on an action — watch the queue keep it.',
            'Turn the network back on — it sends itself.',
          ]}
        />
        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            to="/try"
            className="inline-flex min-h-10 items-center rounded-md bg-eidos-accent px-4 text-sm font-semibold text-eidos-bg transition-colors hover:bg-green-400"
          >
            Open Try it
          </Link>
          <Link
            to="/docs/save"
            className="inline-flex min-h-10 items-center rounded-md border border-eidos-border px-4 text-sm font-medium text-eidos-text-dim transition-colors hover:border-eidos-accent hover:text-eidos-text"
          >
            How Save works
          </Link>
        </div>
      </section>
    </div>
  );
}
