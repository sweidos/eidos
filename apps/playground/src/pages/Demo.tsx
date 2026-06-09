import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, ShoppingCart, CheckCircle, WifiOff, ArrowRight, Clock, Zap, ArrowUp, AlertTriangle, X } from 'lucide-react'
import { useEidosQueue, useEidosQueueStats, useEidosStatus, useEidosResource, useEidosStore, replayQueue } from '@sweidos/eidos'
import type { ResourceEntry } from '@sweidos/eidos'
import { Card, CardHeader } from '../components/Card'
import { CodeBlock } from '../components/CodeBlock'
import { productsResource, createOrder, type Product } from '../lib/eidos'

// ── Event feed types ──────────────────────────────────────────────────────────

interface SwEvent {
  id: string
  time: string
  kind: 'HIT' | 'STORE' | 'ERR' | 'QUEUE' | 'REPLAY' | 'SW' | 'INFO'
  msg: string
}

const KIND_COLOR: Record<SwEvent['kind'], string> = {
  HIT:   'text-eidos-accent',
  STORE: 'text-eidos-blue',
  ERR:   'text-eidos-red',
  QUEUE: 'text-eidos-amber',
  REPLAY:'text-eidos-accent',
  SW:    'text-eidos-muted',
  INFO:  'text-eidos-text-dim',
}

function uid()  { return Math.random().toString(36).slice(2, 7) }
function now()  { return new Date().toLocaleTimeString('en', { hour12: false }) }

// ── Module-scope constants (not recreated on every render) ────────────────────

const HERO_STEPS = [
  'Fetch the product list while online, then turn offline simulation on.',
  'Submit an order and watch it move into the queue.',
  'Open docs for a shorter explanation of each API surface.',
] as const

const EXAMPLES = [
  {
    badge: 'resource()',
    title: 'Cache the product catalog',
    description: 'Register a GET endpoint once and let the runtime keep it fresh in the background.',
    code: `import { resource } from '@sweidos/eidos'

export const products = resource('/api/products', {
  offline: true,
})

const data = await products.json<Product[]>()`,
  },
  {
    badge: 'action()',
    title: 'Queue writes when offline',
    description: 'Persist order submissions to IndexedDB and replay them when the connection returns.',
    code: `export const createOrder = action(
  async (payload: OrderPayload) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    return res.json()
  },
  { reliability: 'neverLose', name: 'createOrder' },
)`,
  },
  {
    badge: 'query()',
    title: 'Bridge into TanStack Query',
    description: 'Keep the cache in sync with an existing query layer instead of replacing it.',
    code: `const { data } = useQuery(productsResource.query<Product[]>())

const mutation = useEidosMutation(createOrder, {
  invalidates: [productsResource],
})`,
  },
  {
    badge: 'testing',
    title: 'Simulate offline and replay',
    description: 'Toggle the runtime into offline mode, then bring the queue back with a single call.',
    code: `setOfflineSimulation(true)

await createOrder({
  productId: 1,
  quantity: 2,
  customerName: 'Demo User',
})

await replayQueue()`,
  },
  {
    badge: 'patterns',
    title: 'Register an entire route family',
    description: 'One wildcard declaration intercepts every matching URL — no per-route setup needed.',
    code: `// * matches one segment, ** matches anything
resource('/api/products/*', { offline: true })
// → /api/products/1, /api/products/abc

resource('/api/users/:id/orders', { offline: true })
// → /api/users/alice/orders

// Cross-origin CDN assets
resource('https://cdn.example.com/assets/**', {
  offline: true,
  strategy: 'cache-first',
})`,
  },
  {
    badge: 'before / after',
    title: 'What it replaces',
    description: 'Eidos generates the service-worker rules and the retry logic so you never write them by hand.',
    code: `// ✗ before — 40+ lines of Workbox config
registerRoute(/\\/api\\/products/, new StaleWhileRevalidate({
  cacheName: 'api-cache',
  plugins: [new ExpirationPlugin({ maxEntries: 60 })],
}))
self.addEventListener('sync', ev => {
  if (ev.tag === 'create-order') ev.waitUntil(replayOrders())
})

// ✓ after — 2 declarations
resource('/api/products', { offline: true })
action(createOrder, { reliability: 'neverLose' })`,
  },
] as const

// ── Demo Page ─────────────────────────────────────────────────────────────────

export function Demo() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<SwEvent[]>([])
  const evRef = useRef<SwEvent[]>([])
  const { isOnline, swStatus } = useEidosStatus()
  const resourceEntry = useEidosResource('/api/products')
  // Use stats hook (1 subscription + 1 loop) rather than full queue subscription.
  // Demo no longer re-renders on every queue item mutation — only on count changes.
  const { pending: pendingCount, replaying: replayingCount, total: queueTotal } = useEidosQueueStats()
  const completedCount = queueTotal - pendingCount - replayingCount

  // Stable emit ref so memo'd children don't re-render when Demo re-renders
  const emit = useCallback((kind: SwEvent['kind'], msg: string) => {
    const e: SwEvent = { id: uid(), time: now(), kind, msg }
    evRef.current = [e, ...evRef.current].slice(0, 80)
    setEvents([...evRef.current])
  }, [])

  // Queue feed events — driven by active count (pending + replaying)
  const activeCount = pendingCount + replayingCount
  const prevActiveRef = useRef(0)
  useEffect(() => {
    if (activeCount > prevActiveRef.current) emit('QUEUE', 'createOrder queued → IndexedDB')
    else if (activeCount < prevActiveRef.current && prevActiveRef.current > 0) emit('REPLAY', 'replayQueue() executed')
    prevActiveRef.current = activeCount
  }, [activeCount, emit])

  useEffect(() => {
    if (swStatus === 'active') emit('SW', 'eidos-sw.js activated · scope /')
  }, [swStatus, emit])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 lg:px-6 animate-fade-in">
      <Card glow className="overflow-hidden">
        <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-6">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-eidos-border bg-eidos-elevated/70 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-eidos-muted">
              overview
            </div>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-2xl font-semibold text-eidos-text text-balance md:text-3xl lg:text-4xl">
                Stop wiring service-worker details by hand.
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-eidos-text-dim md:text-[15px]">
                Eidos turns offline behavior into explicit, readable declarations. The homepage
                shows the patterns, the docs explain the API, and the live panels below prove that
                the runtime is actually doing the work.
              </p>
            </div>

            {/* Install strip */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-eidos-border bg-eidos-bg px-3 py-2 text-xs">
              <span className="shrink-0 text-eidos-muted">install</span>
              <code className="font-mono text-eidos-accent">npm install @sweidos/eidos</code>
              <span className="text-eidos-border">·</span>
              <code className="font-mono text-eidos-text-dim">pnpm add @sweidos/eidos</code>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => navigate('/docs')}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-eidos-accent bg-eidos-accent px-4 py-2 text-xs font-semibold text-eidos-bg transition-colors hover:bg-green-400 cursor-pointer"
              >
                Open docs <ArrowRight size={11} />
              </button>
              <button
                onClick={() => navigate('/actions')}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-eidos-border px-4 py-2 text-xs font-medium text-eidos-text-dim transition-colors hover:border-eidos-elevated hover:text-eidos-text cursor-pointer"
              >
                View action queue
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {([
                { label: 'network',        value: isOnline ? 'online' : 'offline', tone: isOnline ? 'text-eidos-accent' : 'text-eidos-amber' },
                { label: 'service worker', value: swStatus,                        tone: 'text-eidos-text' },
                { label: 'cache hits',     value: resourceEntry?.cacheHits ?? 0,   tone: 'text-eidos-accent' },
                { label: 'queued',         value: pendingCount,                    tone: 'text-eidos-amber' },
              ] as const).map(stat => (
                <div key={stat.label} className="rounded-xl border border-eidos-border bg-eidos-bg/50 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-eidos-muted">{stat.label}</div>
                  <div className={`mt-1 text-sm font-semibold ${stat.tone}`}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-xl border border-eidos-border bg-eidos-surface p-4">
              <div className="text-[10px] uppercase tracking-[0.24em] text-eidos-muted">live state</div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-eidos-muted">network</div>
                  <div className={`mt-1 font-semibold ${isOnline ? 'text-eidos-accent' : 'text-eidos-amber'}`}>
                    {isOnline ? 'online' : 'offline'}
                  </div>
                </div>
                <div>
                  <div className="text-eidos-muted">service worker</div>
                  <div className="mt-1 font-semibold text-eidos-text">{swStatus}</div>
                </div>
                <div>
                  <div className="text-eidos-muted">cache hits</div>
                  <div className="mt-1 font-tabular font-semibold text-eidos-accent">{resourceEntry?.cacheHits ?? 0}</div>
                </div>
                <div>
                  <div className="text-eidos-muted">queued</div>
                  <div className="mt-1 font-tabular font-semibold text-eidos-amber">{pendingCount}</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-eidos-border bg-eidos-surface p-4">
              <div className="text-[10px] uppercase tracking-[0.24em] text-eidos-muted">what to try</div>
              <ul className="mt-3 space-y-3 text-xs leading-relaxed text-eidos-text-dim">
                {HERO_STEPS.map((step, index) => (
                  <li key={step} className="flex gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-eidos-border text-[10px] font-semibold text-eidos-muted">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Card>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-eidos-muted">examples</p>
            <h2 className="text-sm font-semibold text-eidos-text md:text-base">
              Concrete patterns you can copy first
            </h2>
          </div>
          <button
            onClick={() => navigate('/docs')}
            className="text-xs font-medium text-eidos-accent transition-colors hover:text-green-400 cursor-pointer"
          >
            open full reference
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {EXAMPLES.map(example => (
            <Card key={example.title} className="h-full">
              <CardHeader
                title={example.title}
                description={example.description}
                action={(
                  <span className="rounded-full border border-eidos-border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-eidos-muted">
                    {example.badge}
                  </span>
                )}
              />
              <CodeBlock code={example.code} title={example.badge} />
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card className="p-0 overflow-hidden">
            <div className="border-b border-eidos-border bg-eidos-elevated/30 px-5 py-4">
              <div className="text-[10px] uppercase tracking-[0.24em] text-eidos-muted">interactive demo</div>
              <h3 className="mt-1 text-sm font-semibold text-eidos-text">Cache a resource and compare online vs offline behavior</h3>
            </div>
            <ProductsDemo onEmit={emit} resourceEntry={resourceEntry} isOnline={isOnline} />
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="border-b border-eidos-border bg-eidos-elevated/30 px-5 py-4">
              <div className="text-[10px] uppercase tracking-[0.24em] text-eidos-muted">interactive demo</div>
              <h3 className="mt-1 text-sm font-semibold text-eidos-text">Submit actions, queue them offline, and replay on reconnect</h3>
            </div>
            <OrdersDemo onEmit={emit} isOnline={isOnline} />
          </Card>
        </div>

        <Card className="flex h-full flex-col overflow-hidden p-0">
          <div className="flex items-start justify-between gap-3 border-b border-eidos-border px-4 py-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-eidos-muted">runtime feed</div>
              <p className="text-xs text-eidos-text-dim">
                Cache hits, queue updates, and service-worker status changes in one place.
              </p>
            </div>
            <button
              onClick={() => setEvents([])}
              className="text-2xs text-eidos-muted transition-colors hover:text-eidos-red cursor-pointer"
            >
              clear
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {events.length === 0 ? (
              <div className="py-10 text-center text-xs text-eidos-muted">
                waiting for activity...
              </div>
            ) : (
              events.map(ev => (
                <div key={ev.id} className="flex gap-2 text-xs leading-6 font-tabular animate-slide-right">
                  <span className="w-20 shrink-0 text-eidos-border">{ev.time}</span>
                  <span className={`w-14 shrink-0 font-bold ${KIND_COLOR[ev.kind]}`}>{ev.kind}</span>
                  <span className="truncate text-eidos-text-dim">{ev.msg}</span>
                </div>
              ))
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-eidos-border px-4 py-3 text-xs">
            {[
              { label: 'cache hits',  value: resourceEntry?.cacheHits ?? 0,                                                                                        tone: 'text-eidos-accent' },
              { label: 'queued',      value: pendingCount,                                                                                                          tone: 'text-eidos-amber'  },
              { label: 'replaying',   value: replayingCount,                                                                                                        tone: 'text-eidos-blue'   },
              { label: 'done',        value: completedCount,                                                                                                        tone: 'text-eidos-text'   },
              { label: 'sw status',   value: swStatus,                                                                                                              tone: 'text-eidos-text'   },
              { label: 'cached at',   value: resourceEntry?.cachedAt ? new Date(resourceEntry.cachedAt).toLocaleTimeString('en', { hour12: false }) : '—',          tone: 'text-eidos-text-dim'},
            ].map(({ label, value, tone }) => (
              <div key={label} className="rounded-lg border border-eidos-border bg-eidos-bg/40 px-3 py-2">
                <div className="text-eidos-muted">{label}</div>
                <div className={`mt-1 font-tabular font-semibold truncate ${tone}`}>{value}</div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}

// ── Products Demo ─────────────────────────────────────────────────────────────

type EmitFn = (kind: SwEvent['kind'], msg: string) => void

const ProductsDemo = memo(function ProductsDemo({
  onEmit,
  resourceEntry,
  isOnline,
}: {
  onEmit: EmitFn
  resourceEntry: ResourceEntry | undefined
  isOnline: boolean
}) {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState<'hit' | 'miss' | 'offline' | 'error' | null>(null)
  const [elapsed,  setElapsed]  = useState<number | null>(null)

  async function fetch_() {
    setLoading(true)
    setResult(null)
    setElapsed(null)
    const t0 = performance.now()
    try {
      const data = await productsResource.json() as Product[]
      const ms   = Math.round(performance.now() - t0)
      if (!Array.isArray(data)) throw new Error('unexpected shape')
      setProducts(data)
      setElapsed(ms)
      const entry = useEidosStore.getState().resources['/api/products']
      const hit   = entry?.lastEvent === 'cache-hit'
      setResult(hit ? 'hit' : 'miss')
      onEmit(hit ? 'HIT' : 'STORE', `/api/products → ${hit ? 'cache hit' : 'fetched & cached'} · ${ms}ms`)
    } catch (err) {
      setElapsed(Math.round(performance.now() - t0))
      const offline = String(err).includes('offline')
      setResult(offline ? 'offline' : 'error')
      onEmit('ERR', `/api/products → ${offline ? 'offline · no cache yet' : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  async function clear() {
    await productsResource.invalidate()
    setProducts(null)
    setResult(null)
    setElapsed(null)
    onEmit('INFO', '/api/products cache cleared')
  }

  return (
    <div className="p-5">
      {/* Label row */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-eidos-text">products</span>
          <span className="text-2xs text-eidos-muted border border-eidos-border px-1.5 py-0.5">
            StaleWhileRevalidate
          </span>
          {elapsed !== null && (
            <span className={`text-2xs font-tabular font-bold px-1.5 py-0.5 border animate-fade-in ${
              result === 'hit'
                ? 'text-eidos-accent border-eidos-accent/40 bg-eidos-accent-dim'
                : 'text-eidos-blue border-eidos-blue/40 bg-eidos-blue-dim'
            }`}>
              {elapsed}ms
            </span>
          )}
        </div>
        {result && <ResultBadge r={result} />}
      </div>

      {/* Declaration */}
      <div className="mb-4 rounded-lg border border-eidos-border bg-eidos-bg px-3 py-2 text-2xs text-eidos-text-dim leading-relaxed">
        <span className="text-eidos-muted">resource</span>(<span className="text-eidos-accent">'/api/products'</span>, {'{ '}
        <span className="text-eidos-text-dim">offline</span>: <span className="text-eidos-accent">true</span>
        {' }'})<br />
        <span className="text-eidos-border">// → StaleWhileRevalidate · no maxAge</span>
      </div>

      {/* Product list */}
      <div className="min-h-[120px] mb-4">
        {loading && (
          <div className="flex items-center gap-2 text-2xs text-eidos-muted py-8 justify-center">
            <RefreshCw size={11} className="animate-spin" /> fetching...
          </div>
        )}
        {!loading && result === 'offline' && (
          <div role="alert" className="flex flex-col items-center justify-center py-8 gap-1.5 text-center">
            <WifiOff size={16} className="text-eidos-amber" />
            <div className="text-2xs text-eidos-amber">offline · no cached response yet</div>
            <div className="text-2xs text-eidos-muted">fetch while online first to populate the cache</div>
          </div>
        )}
        {!loading && result === 'error' && (
          <div role="alert" className="flex flex-col items-center justify-center py-8 gap-1.5 text-center">
            <div className="text-2xs text-eidos-red">fetch failed · check network or try again</div>
          </div>
        )}
        {!loading && !products && result !== 'offline' && (
          <div className="flex items-center justify-center py-8 text-2xs text-eidos-muted">
            no data · click fetch
          </div>
        )}
        {!loading && Array.isArray(products) && (
          <div className="border border-eidos-border divide-y divide-eidos-border">
            {products.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-4 px-3 py-2 text-xs">
                <span className="text-eidos-text">{p.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-2xs text-eidos-muted">{p.category}</span>
                  <span className="text-eidos-accent font-tabular">${p.price}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          onClick={fetch_}
          disabled={loading}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-eidos-accent px-4 py-2 text-xs font-bold text-eidos-bg transition-colors hover:bg-green-400 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          Fetch Products
        </button>
        {products && !loading && (
          <button
            onClick={clear}
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-eidos-border px-3 py-2 text-xs text-eidos-muted transition-colors hover:border-eidos-border hover:text-eidos-red cursor-pointer"
          >
            clear cache
          </button>
        )}
      </div>

      <div className="mt-3 text-2xs text-eidos-muted font-tabular">
        {resourceEntry?.cacheHits ?? 0} hits · {resourceEntry?.cacheMisses ?? 0} misses
        {resourceEntry?.cachedAt ? ` · cached ${new Date(resourceEntry.cachedAt).toLocaleTimeString('en', { hour12: false })}` : ' · not cached yet'}
        {!isOnline && ' · offline mode active'}
      </div>
    </div>
  )
})

function ResultBadge({ r }: { r: 'hit' | 'miss' | 'offline' | 'error' }) {
  const cfg = {
    hit:     { icon: <Zap size={9} />,           text: 'cache hit',       cls: 'text-eidos-accent border-eidos-accent/40 bg-eidos-accent-dim' },
    miss:    { icon: <ArrowUp size={9} />,        text: 'fetched & cached', cls: 'text-eidos-blue border-eidos-blue/40 bg-eidos-blue-dim' },
    offline: { icon: <AlertTriangle size={9} />,  text: 'offline · no cache', cls: 'text-eidos-amber border-eidos-amber/40 bg-eidos-amber-dim' },
    error:   { icon: <X size={9} />,              text: 'error',            cls: 'text-eidos-red border-eidos-red/40 bg-eidos-red-dim' },
  }[r]
  return (
    <span className={`flex items-center gap-1 text-2xs border px-2 py-0.5 animate-fade-in ${cfg.cls}`}>
      {cfg.icon}{cfg.text}
    </span>
  )
}

// ── Orders Demo ───────────────────────────────────────────────────────────────

const OrdersDemo = memo(function OrdersDemo({
  onEmit, isOnline,
}: {
  onEmit: EmitFn
  isOnline: boolean
}) {
  const navigate = useNavigate()
  const queue    = useEidosQueue()
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState<{ text: string; ok: boolean } | null>(null)

  const pending = queue.filter(q => q.status === 'pending' || q.status === 'replaying')

  async function submit() {
    setLoading(true)
    setResult(null)
    try {
      const res = await createOrder({ productId: 1, quantity: 1, customerName: 'Demo User' })
      if ('queued' in res && res.queued) {
        setResult({ text: `queued → IDB · will replay on reconnect`, ok: false })
        onEmit('QUEUE', `createOrder → persisted to IndexedDB`)
      } else {
        const r = res as { id: string }
        setResult({ text: `${r.id} confirmed`, ok: true })
        onEmit('STORE', `createOrder → ${r.id}`)
      }
    } catch {
      setResult({ text: 'request failed', ok: false })
      onEmit('ERR', 'createOrder → network failure')
    } finally {
      setLoading(false)
    }
  }

  async function replay() {
    onEmit('REPLAY', `replayQueue() · ${pending.length} item(s)`)
    await replayQueue()
  }

  return (
    <div className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-eidos-text">orders</span>
          <span className="text-2xs text-eidos-amber border border-eidos-amber/40 px-1.5 py-0.5">neverLose</span>
        </div>
      </div>

      {/* Declaration */}
      <div className="mb-4 rounded-lg border border-eidos-border bg-eidos-bg px-3 py-2 text-2xs text-eidos-text-dim leading-relaxed">
        <span className="text-eidos-muted">action</span>(<span className="text-eidos-text-dim">createOrder</span>, {'{ '}
        <span className="text-eidos-text-dim">reliability</span>: <span className="text-eidos-amber">'neverLose'</span>
        {' }'})<br />
        <span className="text-eidos-border">// → IndexedDB queue · auto-replay on reconnect</span>
      </div>

      {/* Result */}
      {result && (
        <div role="alert" className={`flex items-center gap-2 text-2xs border px-3 py-2 mb-3 ${
          result.ok ? 'border-eidos-accent/40 text-eidos-accent bg-eidos-accent-dim' : 'border-eidos-amber/40 text-eidos-amber bg-eidos-amber-dim'
        }`}>
          {result.ok ? <CheckCircle size={11} /> : <Clock size={11} />}
          {result.text}
        </div>
      )}

      {/* Queue */}
      <div className="mb-4 min-h-[80px]">
        {pending.length === 0 ? (
          <div className="flex h-20 items-center justify-center text-xs text-eidos-muted">
            {isOnline ? 'simulate offline · submit an order' : 'offline · orders will queue to IDB'}
          </div>
        ) : (
          <div className="border border-eidos-border divide-y divide-eidos-border">
            {pending.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-4 px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 animate-pulse-fast bg-eidos-amber" />
                  <span className="text-eidos-text">{item.actionName}</span>
                  <span className="text-eidos-muted">retry {item.retryCount}/{item.maxRetries}</span>
                </div>
                <span className={`text-2xs border px-1.5 py-0.5 ${
                  item.status === 'replaying'
                    ? 'border-eidos-accent/40 text-eidos-accent'
                    : 'border-eidos-amber/40 text-eidos-amber'
                }`}>{item.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          onClick={submit}
          disabled={loading}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-eidos-border px-4 py-2 text-xs text-eidos-text transition-colors hover:border-eidos-accent hover:text-eidos-accent disabled:opacity-50 cursor-pointer"
        >
          <ShoppingCart size={11} className={loading ? 'animate-pulse' : ''} />
          Submit Order
        </button>
        {pending.length > 0 && isOnline && (
          <button
            onClick={replay}
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-eidos-accent px-3 py-2 text-xs font-bold text-eidos-bg transition-colors hover:bg-green-400 cursor-pointer"
          >
            replay {pending.length}
          </button>
        )}
      </div>

      <button
        onClick={() => navigate('/actions')}
        className="mt-2 flex items-center gap-1 text-2xs text-eidos-muted hover:text-eidos-accent transition-colors cursor-pointer"
      >
        view full queue <ArrowRight size={9} />
      </button>
    </div>
  )
})
