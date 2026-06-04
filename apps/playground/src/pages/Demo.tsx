import { useState, useEffect, useRef } from 'react'
import { RefreshCw, ShoppingCart, CheckCircle, WifiOff, ArrowRight, Clock } from 'lucide-react'
import { useEidosStore, replayQueue } from '@sweidos/eidos'
import type { ActionQueueItem, ResourceEntry } from '@sweidos/eidos'
import { productsResource, createOrder, type Product } from '../lib/eidos'
import type { Page } from '../App'

interface DemoProps { onNavigate: (p: Page) => void }

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

// ── Demo Page ─────────────────────────────────────────────────────────────────

export function Demo({ onNavigate }: DemoProps) {
  const [events, setEvents]   = useState<SwEvent[]>([])
  const evRef                  = useRef<SwEvent[]>([])
  const queue                  = useEidosStore(s => s.queue)
  const isOnline               = useEidosStore(s => s.isOnline)
  const swStatus               = useEidosStore(s => s.swStatus)
  const resourceEntry          = useEidosStore(s => s.resources['/api/products'])

  // Queue events
  const prevQLen = useRef(0)
  useEffect(() => {
    const curr = queue.filter(q => q.status === 'pending' || q.status === 'replaying').length
    if (curr > prevQLen.current) emit('QUEUE', `createOrder queued → IndexedDB`)
    else if (curr < prevQLen.current && prevQLen.current > 0) emit('REPLAY', `replayQueue() executed`)
    prevQLen.current = curr
  }, [queue])

  useEffect(() => {
    if (swStatus === 'active') emit('SW', 'eidos-sw.js activated · scope /')
  }, [swStatus])

  function emit(kind: SwEvent['kind'], msg: string) {
    const e: SwEvent = { id: uid(), time: now(), kind, msg }
    evRef.current = [e, ...evRef.current].slice(0, 80)
    setEvents([...evRef.current])
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Hero strip ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-eidos-border bg-eidos-surface px-6 py-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-lg font-bold text-eidos-text mb-1">
              Stop writing service workers.
            </h1>
            <p className="text-sm text-eidos-muted max-w-xl">
              Declare intent in 2 lines. @sweidos/eidos generates the fetch intercept rules,
              picks the right caching strategy, and queues offline actions to IndexedDB — automatically.
            </p>
          </div>
          <button
            onClick={() => onNavigate('learn')}
            className="flex items-center gap-1.5 text-xs text-eidos-accent border border-eidos-accent px-3 py-1.5 hover:bg-eidos-accent hover:text-eidos-bg transition-colors duration-150 cursor-pointer"
          >
            API reference <ArrowRight size={11} />
          </button>
        </div>

        {/* Before/After code comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <div className="border border-eidos-border bg-eidos-bg p-3">
            <div className="text-2xs text-eidos-red mb-2">// before — workbox config</div>
            <pre className="text-2xs text-eidos-muted leading-relaxed overflow-x-auto">{`registerRoute(
  /\\/api\\/products/,
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
    plugins: [new ExpirationPlugin({
      maxEntries: 60,
    })],
  })
)
self.addEventListener('sync', ev => {
  if (ev.tag === 'create-order')
    ev.waitUntil(replayOrders())  // +40 lines
})`}</pre>
          </div>
          <div className="border border-eidos-accent/40 bg-eidos-bg p-3">
            <div className="text-2xs text-eidos-accent mb-2">// after — eidos</div>
            <pre className="text-2xs text-eidos-text leading-relaxed">{`import { resource, action } from '@sweidos/eidos'

resource('/api/products', {
  offline: true,  // → StaleWhileRevalidate
})

action(createOrder, {
  reliability: 'neverLose',  // → IDB queue
})`}</pre>
          </div>
        </div>
      </div>

      {/* ── Main area: demos + event feed ──────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] min-h-0 overflow-hidden">

        {/* Left: interactive demos */}
        <div className="overflow-y-auto border-r border-eidos-border divide-y divide-eidos-border">
          <ProductsDemo onEmit={emit} resourceEntry={resourceEntry} isOnline={isOnline} />
          <OrdersDemo onEmit={emit} queue={queue} isOnline={isOnline} onNavigate={onNavigate} />
        </div>

        {/* Right: live event stream + stats */}
        <div className="flex flex-col overflow-hidden bg-eidos-bg">
          {/* Stream header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-eidos-border shrink-0">
            <div className="flex items-center gap-2 text-2xs text-eidos-muted">
              <span className="w-1.5 h-1.5 bg-eidos-accent animate-pulse" />
              runtime events
            </div>
            <button onClick={() => setEvents([])} className="text-2xs text-eidos-muted hover:text-eidos-red cursor-pointer transition-colors">
              clear
            </button>
          </div>

          {/* Event rows */}
          <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
            {events.length === 0 && (
              <div className="text-2xs text-eidos-muted text-center py-8">
                waiting for activity...
              </div>
            )}
            {events.map(ev => (
              <div key={ev.id} className="flex gap-2 text-2xs leading-5 font-tabular animate-slide-right">
                <span className="text-eidos-border shrink-0 w-16">{ev.time}</span>
                <span className={`shrink-0 w-12 font-bold ${KIND_COLOR[ev.kind]}`}>{ev.kind}</span>
                <span className="text-eidos-text-dim truncate">{ev.msg}</span>
              </div>
            ))}
          </div>

          {/* Stats strip */}
          <div className="border-t border-eidos-border px-4 py-2.5 shrink-0 grid grid-cols-3 gap-2 text-2xs">
            <div>
              <div className="text-eidos-muted">cache hits</div>
              <div className="text-eidos-accent font-bold font-tabular">{resourceEntry?.cacheHits ?? 0}</div>
            </div>
            <div>
              <div className="text-eidos-muted">queued</div>
              <div className="text-eidos-amber font-bold font-tabular">
                {queue.filter(q => q.status === 'pending').length}
              </div>
            </div>
            <div>
              <div className="text-eidos-muted">cached at</div>
              <div className="text-eidos-text-dim font-tabular">
                {resourceEntry?.cachedAt
                  ? new Date(resourceEntry.cachedAt).toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Products Demo ─────────────────────────────────────────────────────────────

type EmitFn = (kind: SwEvent['kind'], msg: string) => void

function ProductsDemo({
  onEmit,
  resourceEntry,
  isOnline,
}: {
  onEmit: EmitFn
  resourceEntry: ResourceEntry | undefined
  isOnline: boolean
}) {
  const [products, setProducts]     = useState<Product[] | null>(null)
  const [loading,  setLoading]      = useState(false)
  const [result,   setResult]       = useState<'hit' | 'miss' | 'offline' | 'error' | null>(null)

  async function fetch_() {
    setLoading(true)
    setResult(null)
    try {
      const data = await productsResource.json() as Product[]
      if (!Array.isArray(data)) throw new Error('unexpected shape')
      setProducts(data)
      const entry = useEidosStore.getState().resources['/api/products']
      const hit   = entry?.lastEvent === 'cache-hit'
      setResult(hit ? 'hit' : 'miss')
      onEmit(hit ? 'HIT' : 'STORE', `/api/products → ${hit ? 'served from cache' : 'fetched & cached'}`)
    } catch (err) {
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
    onEmit('INFO', '/api/products cache cleared')
  }

  return (
    <div className="p-5">
      {/* Label row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-eidos-text">products</span>
          <span className="text-2xs text-eidos-muted border border-eidos-border px-1.5 py-0.5">
            StaleWhileRevalidate
          </span>
        </div>
        {result && <ResultBadge r={result} />}
      </div>

      {/* Declaration */}
      <div className="border border-eidos-border bg-eidos-bg px-3 py-2 mb-4 text-2xs text-eidos-text-dim leading-relaxed">
        <span className="text-eidos-muted">resource</span>(<span className="text-eidos-accent">'/api/products'</span>, {'{ '}
        <span className="text-eidos-text-dim">offline</span>: <span className="text-eidos-accent">true</span>
        {' }'})<br />
        <span className="text-eidos-border">// → StaleWhileRevalidate · eidos-resources-v1</span>
      </div>

      {/* Product list */}
      <div className="min-h-[120px] mb-4">
        {loading && (
          <div className="flex items-center gap-2 text-2xs text-eidos-muted py-8 justify-center">
            <RefreshCw size={11} className="animate-spin" /> fetching...
          </div>
        )}
        {!loading && result === 'offline' && (
          <div className="flex flex-col items-center justify-center py-8 gap-1.5 text-center">
            <WifiOff size={16} className="text-eidos-amber" />
            <div className="text-2xs text-eidos-amber">offline · no cached response yet</div>
            <div className="text-2xs text-eidos-muted">fetch while online first to populate the cache</div>
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
              <div key={p.id} className="flex items-center justify-between px-3 py-2 text-xs">
                <span className="text-eidos-text">{p.name}</span>
                <div className="flex items-center gap-4">
                  <span className="text-2xs text-eidos-muted">{p.category}</span>
                  <span className="text-eidos-accent font-tabular">${p.price}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={fetch_}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-eidos-accent text-eidos-bg text-xs font-bold hover:bg-green-400 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          Fetch Products
        </button>
        {products && !loading && (
          <button
            onClick={clear}
            className="px-3 py-2 text-xs border border-eidos-border text-eidos-muted hover:border-eidos-border hover:text-eidos-red transition-colors cursor-pointer"
          >
            clear cache
          </button>
        )}
      </div>

      <div className="mt-2 text-2xs text-eidos-muted font-tabular">
        {resourceEntry?.cacheHits ?? 0} hits · {resourceEntry?.cachedAt ? `cached ${new Date(resourceEntry.cachedAt).toLocaleTimeString('en', { hour12: false })}` : 'not cached yet'}
        {!isOnline && ' · offline mode active'}
      </div>
    </div>
  )
}

function ResultBadge({ r }: { r: 'hit' | 'miss' | 'offline' | 'error' }) {
  const cfg = {
    hit:     { text: '⚡ cache hit',       cls: 'text-eidos-accent border-eidos-accent/40 bg-eidos-accent-dim' },
    miss:    { text: '↑ fetched & cached', cls: 'text-eidos-blue border-eidos-blue/40 bg-eidos-blue-dim' },
    offline: { text: '⚠ offline · no cache', cls: 'text-eidos-amber border-eidos-amber/40 bg-eidos-amber-dim' },
    error:   { text: '✕ error',            cls: 'text-eidos-red border-eidos-red/40 bg-eidos-red-dim' },
  }[r]
  return (
    <span className={`text-2xs border px-2 py-0.5 animate-fade-in ${cfg.cls}`}>
      {cfg.text}
    </span>
  )
}

// ── Orders Demo ───────────────────────────────────────────────────────────────

function OrdersDemo({
  onEmit, queue, isOnline, onNavigate,
}: {
  onEmit: EmitFn
  queue: ActionQueueItem[]
  isOnline: boolean
  onNavigate: (p: Page) => void
}) {
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
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-eidos-text">orders</span>
          <span className="text-2xs text-eidos-amber border border-eidos-amber/40 px-1.5 py-0.5">neverLose</span>
        </div>
      </div>

      {/* Declaration */}
      <div className="border border-eidos-border bg-eidos-bg px-3 py-2 mb-4 text-2xs text-eidos-text-dim leading-relaxed">
        <span className="text-eidos-muted">action</span>(<span className="text-eidos-text-dim">createOrder</span>, {'{ '}
        <span className="text-eidos-text-dim">reliability</span>: <span className="text-eidos-amber">'neverLose'</span>
        {' }'})<br />
        <span className="text-eidos-border">// → IndexedDB queue · auto-replay on reconnect</span>
      </div>

      {/* Result */}
      {result && (
        <div className={`flex items-center gap-2 text-2xs border px-3 py-2 mb-3 ${
          result.ok ? 'border-eidos-accent/40 text-eidos-accent bg-eidos-accent-dim' : 'border-eidos-amber/40 text-eidos-amber bg-eidos-amber-dim'
        }`}>
          {result.ok ? <CheckCircle size={11} /> : <Clock size={11} />}
          {result.text}
        </div>
      )}

      {/* Queue */}
      <div className="min-h-[80px] mb-4">
        {pending.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-2xs text-eidos-muted">
            {isOnline ? 'simulate offline · submit an order' : '⚡ offline · orders will queue to IDB'}
          </div>
        ) : (
          <div className="border border-eidos-border divide-y divide-eidos-border">
            {pending.map(item => (
              <div key={item.id} className="flex items-center justify-between px-3 py-2 text-2xs">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-eidos-amber animate-pulse-fast" />
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

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 border border-eidos-border text-eidos-text text-xs hover:border-eidos-accent hover:text-eidos-accent transition-colors disabled:opacity-50 cursor-pointer"
        >
          <ShoppingCart size={11} className={loading ? 'animate-pulse' : ''} />
          Submit Order
        </button>
        {pending.length > 0 && isOnline && (
          <button
            onClick={replay}
            className="px-3 py-2 text-xs bg-eidos-accent text-eidos-bg font-bold hover:bg-green-400 transition-colors cursor-pointer"
          >
            replay {pending.length}
          </button>
        )}
      </div>

      <button
        onClick={() => onNavigate('actions')}
        className="mt-2 flex items-center gap-1 text-2xs text-eidos-muted hover:text-eidos-accent transition-colors cursor-pointer"
      >
        view full queue <ArrowRight size={9} />
      </button>
    </div>
  )
}
