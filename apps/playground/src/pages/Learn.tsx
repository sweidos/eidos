import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, ChevronDown, ChevronRight } from 'lucide-react'
import { Card, CardHeader } from '../components/Card'
import { CodeBlock } from '../components/CodeBlock'

function SectionHeading({
  id,
  eyebrow,
  title,
  description,
}: {
  id: string
  eyebrow: string
  title: string
  description?: string
}) {
  return (
    <div id={id} className="scroll-mt-5">
      <p className="text-[10px] uppercase tracking-[0.24em] text-eidos-muted">{eyebrow}</p>
      <div className="mt-1 flex items-center gap-2">
        <a
          href={`#${id}`}
          aria-label={`Link to ${title} section`}
          className="text-eidos-border transition-colors hover:text-eidos-accent"
          tabIndex={-1}
        >
          #
        </a>
        <h2 className="text-base font-semibold text-eidos-text md:text-lg">{title}</h2>
      </div>
      {description && (
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-eidos-text-dim">
          {description}
        </p>
      )}
    </div>
  )
}

function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded border border-eidos-border bg-eidos-elevated px-1.5 py-0.5 font-mono text-[11px] text-eidos-accent">
      {children}
    </code>
  )
}

// Splits on backtick spans and renders them as inline code.
function parseBullet(text: string): ReactNode {
  const parts = text.split(/`([^`]+)`/)
  if (parts.length === 1) return text
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <InlineCode key={i}>{part}</InlineCode> : part
      )}
    </>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm leading-relaxed text-eidos-text-dim">
      {items.map(item => (
        <li key={item} className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-eidos-accent" />
          <span>{parseBullet(item)}</span>
        </li>
      ))}
    </ul>
  )
}

function Collapse({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="overflow-hidden rounded-xl border border-eidos-border bg-eidos-surface">
      <button
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-eidos-text transition-colors hover:bg-eidos-elevated cursor-pointer"
      >
        {open ? (
          <ChevronDown size={13} className="shrink-0 text-eidos-accent" />
        ) : (
          <ChevronRight size={13} className="shrink-0 text-eidos-muted" />
        )}
        {title}
      </button>
      {open && <div className="border-t border-eidos-border bg-eidos-elevated/20 p-4">{children}</div>}
    </div>
  )
}

export function Learn() {
  const quickLinks = [
    { href: '#quick-start', label: 'Quick start' },
    { href: '#core', label: 'Core APIs' },
    { href: '#examples', label: 'Examples' },
    { href: '#hooks', label: 'Hooks & stores' },
    { href: '#advanced', label: 'Advanced' },
    { href: '#references', label: 'Further reading' },
  ]

  return (
    <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:px-6 animate-fade-in">
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
                  Start here if you want the short version first. The page begins with the setup
                  path, shows the core APIs as small building blocks, and hides the heavier
                  reference material behind collapsible sections.
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
                <div className="text-[10px] uppercase tracking-[0.24em] text-eidos-muted">what this page covers</div>
                <BulletList
                  items={[
                    'How to install, wrap, and declare your first resource or action.',
                    'The small set of APIs most people need day to day.',
                    'Examples for TanStack Query, offline simulation, and queue replay.',
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

        <section id="core" className="space-y-3">
          <SectionHeading
            id="core"
            eyebrow="core api"
            title="The small set of primitives you use most"
            description="These cards keep one idea per surface so the mental model stays lightweight."
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="h-full">
              <CardHeader
                title="resource(url, config)"
                description="Register a GET endpoint as offline-capable and let Eidos pick the cache strategy."
                action={<span className="rounded-full border border-eidos-border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-eidos-muted">cache</span>}
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

            <Card className="h-full">
              <CardHeader
                title="action(fn, config)"
                description="Wrap async mutations so offline writes are persisted and replayed later."
                action={<span className="rounded-full border border-eidos-border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-eidos-muted">queue</span>}
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

            <Card className="h-full">
              <CardHeader
                title="EidosProvider"
                description="Register the SW and hydrate the runtime once near the root of the app."
                action={<span className="rounded-full border border-eidos-border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-eidos-muted">root</span>}
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

            <Card className="h-full">
              <CardHeader
                title="replayQueue()"
                description="Trigger queue replay yourself when you want a manual recovery action."
                action={<span className="rounded-full border border-eidos-border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-eidos-muted">replay</span>}
              />
              <BulletList
                items={[
                  'Usually runs automatically when connectivity returns.',
                  'Useful for a “Retry now” button or a manual sync control.',
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

        <section id="examples" className="space-y-3">
          <SectionHeading
            id="examples"
            eyebrow="examples"
            title="A few concrete patterns"
            description="These are the patterns people usually want on the first pass: query integration, TTLs, and offline recovery."
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="h-full">
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

            <Card className="h-full">
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

            <Card className="h-full">
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

            <Card className="h-full">
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

        <section id="hooks" className="space-y-3">
          <SectionHeading
            id="hooks"
            eyebrow="hooks & stores"
            title="React hooks for live UI, stores for everything else"
            description="Use the narrower hook whenever you can; reach for the full store only when you need a broad snapshot."
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="h-full">
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

            <Card className="h-full">
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

        <section id="advanced" className="space-y-3">
          <SectionHeading
            id="advanced"
            eyebrow="advanced"
            title="Keep the heavy reference tucked away"
            description="These are the details that are useful, but not worth putting in the main reading path."
          />

          <div className="space-y-3">
            <Collapse title="URL patterns and cross-origin resources">
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-eidos-text-dim">
                  Use <InlineCode>*</InlineCode> for one path segment, <InlineCode>**</InlineCode> for nested paths, and{' '}
                  <InlineCode>:param</InlineCode> for named segments. For external APIs, pass the full URL including origin.
                </p>
                <CodeBlock
                  title="patterns.ts"
                  code={`resource('/api/products/*', { offline: true })
resource('/api/users/:id/orders', { offline: true })
resource('https://cdn.example.com/assets/**', { offline: true })`}
                />
              </div>
            </Collapse>

            <Collapse title="Caching strategies">
              <div className="space-y-3">
                <BulletList
                  items={[
                    '`stale-while-revalidate` is the default when `offline: true` is set.',
                    '`cache-first` is best for data that rarely changes.',
                    '`network-first` favors freshness and only falls back to cache when offline.',
                  ]}
                />
                <CodeBlock
                  title="strategies.ts"
                  code={`resource('/api/products', { offline: true })
resource('/api/config', { offline: true, strategy: 'cache-first' })
resource('/api/feed', { offline: true, strategy: 'network-first' })`}
                />
              </div>
            </Collapse>

            <Collapse title="Testing utilities">
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-eidos-text-dim">
                  The testing helpers let you flip the runtime between online and offline states, drain the queue, and inspect cache entries.
                </p>
                <CodeBlock
                  title="tests.ts"
                  code={`import {
  mockOffline, mockOnline,
  drainQueue, resetEidos,
  getCachedEntry,
} from '@sweidos/eidos/testing'`}
                />
              </div>
            </Collapse>

            <Collapse title="Types and limits">
              <div className="space-y-3">
                <BulletList
                  items={[
                    'GET requests are cached; actions are queued separately through IndexedDB.',
                    'Module-scope actions are required so replay can re-register them after refresh.',
                    'The full README carries the exhaustive API details and architecture notes.',
                  ]}
                />
              </div>
            </Collapse>
          </div>
        </section>

        <section id="references" className="space-y-3">
          <SectionHeading
            id="references"
            eyebrow="further reading"
            title="Primary references"
            description="Open these when you want the underlying platform docs or the project README."
          />

          <div className="grid gap-3 md:grid-cols-2">
            {[
              { label: 'Project README', href: 'https://github.com/iamadi11/eidos#readme' },
              { label: 'MDN - Service Worker API', href: 'https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API' },
              { label: 'MDN - Cache API', href: 'https://developer.mozilla.org/en-US/docs/Web/API/Cache' },
              { label: 'MDN - IndexedDB API', href: 'https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API' },
            ].map(link => (
              <a
                key={link.href}
                href={link.href}
                target={link.href.startsWith('http') ? '_blank' : undefined}
                rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="flex items-center justify-between rounded-xl border border-eidos-border bg-eidos-surface px-4 py-3 text-sm text-eidos-text-dim transition-colors hover:border-eidos-accent hover:bg-eidos-accent-dim hover:text-eidos-text"
              >
                <span>{link.label}</span>
                <ExternalLink size={11} className="shrink-0 text-eidos-muted" />
              </a>
            ))}
          </div>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4 h-fit">
        <Card>
          <CardHeader
            title="On this page"
            description="Jump straight to the section you need."
          />
          <nav className="space-y-2 text-sm">
            {quickLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                className="flex items-center justify-between rounded-lg border border-eidos-border px-3 py-2 text-eidos-text-dim transition-colors hover:border-eidos-accent hover:text-eidos-text"
              >
                <span>{link.label}</span>
                <span className="text-eidos-border">#</span>
              </a>
            ))}
          </nav>
        </Card>

        <Card>
          <CardHeader
            title="Use this page when..."
            description="A short checklist keeps the page from feeling like a wall of text."
          />
          <BulletList
            items={[
              'You want the shortest path from install to a working demo.',
              'You need a practical example for resources, actions, or query integration.',
              'You only want to open the heavy reference when there is a real question.',
            ]}
          />
        </Card>

        <Card>
          <CardHeader
            title="Next stops"
            description="Move around the playground without losing the docs context."
          />
          <div className="space-y-2">
            <Link
              to="/overview"
              className="flex items-center justify-between rounded-lg border border-eidos-border px-3 py-2 text-sm text-eidos-text-dim transition-colors hover:border-eidos-accent hover:text-eidos-text"
            >
              Overview
              <span className="text-eidos-border">→</span>
            </Link>
            <Link
              to="/resources"
              className="flex items-center justify-between rounded-lg border border-eidos-border px-3 py-2 text-sm text-eidos-text-dim transition-colors hover:border-eidos-accent hover:text-eidos-text"
            >
              Resources
              <span className="text-eidos-border">→</span>
            </Link>
            <Link
              to="/actions"
              className="flex items-center justify-between rounded-lg border border-eidos-border px-3 py-2 text-sm text-eidos-text-dim transition-colors hover:border-eidos-accent hover:text-eidos-text"
            >
              Actions
              <span className="text-eidos-border">→</span>
            </Link>
          </div>
        </Card>
      </aside>
    </div>
  )
}
