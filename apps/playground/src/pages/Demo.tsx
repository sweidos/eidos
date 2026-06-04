import { useState, useEffect, useRef } from 'react'
import { RefreshCw, ShoppingCart, Zap, CheckCircle, WifiOff, ArrowRight, Clock } from 'lucide-react'
import { useEidosStore, replayQueue } from '@eidos/core'
import type { ActionQueueItem } from '@eidos/core'
import { productsResource, createOrder, type Product } from '../lib/eidos'
import type { Page } from '../App'

interface DemoProps {
  onNavigate: (p: Page) => void
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface SwEvent {
  id: string
  time: string
  kind: 'cache-hit' | 'cache-updated' | 'network-error' | 'queue-add' | 'queue-replay' | 'sw-ready'
  label: string
  meta?: string
}

const EVENT_COLORS: Record<SwEvent['kind'], string> = {
  'cache-hit':     'text-eidos-green',
  'cache-updated': 'text-eidos-accent',
  'network-error': 'text-eidos-red',
  'queue-add':     'text-eidos-amber',
  'queue-replay':  'text-eidos-green',
  'sw-ready':      'text-eidos-muted',
}

const EVENT_PREFIXES: Record<SwEvent['kind'], string> = {
  'cache-hit':     '⚡ HIT',
  'cache-updated': '↑ STORE',
  'network-error': '✕ ERROR',
  'queue-add':     '+ QUEUE',
  'queue-replay':  '↺ REPLAY',
  'sw-ready':      '· READY',
}

function uid() { return Math.random().toString(36).slice(2, 7) }
function ts() { return new Date().toLocaleTimeString('en', { hour12: false }) }

// ── Demo page ─────────────────────────────────────────────────────────────────

export function Demo({ onNavigate }: DemoProps) {
  const [events, setEvents] = useState<SwEvent[]>([])
  const eventsRef = useRef<SwEvent[]>([])

  const resourceState = useEidosStore(s => s.resources['/api/products'])
  const queue         = useEidosStore(s => s.queue)
  const isOnline      = useEidosStore(s => s.isOnline)
  const swStatus      = useEidosStore(s => s.swStatus)

  // Track queue changes to emit events
  const prevQueueLen = useRef(queue.length)
  useEffect(() => {
    const curr = queue.filter(q => q.status === 'pending' || q.status === 'replaying')
    const prev = prevQueueLen.current
    if (curr.length > prev) {
      addEvent({ kind: 'queue-add', label: `createOrder queued`, meta: 'IndexedDB' })
    } else if (curr.length < prev && prev > 0) {
      addEvent({ kind: 'queue-replay', label: `queue replayed`, meta: `${prev} action(s)` })
    }
    prevQueueLen.current = curr.length
  }, [queue])

  useEffect(() => {
    if (swStatus === 'active') {
      addEvent({ kind: 'sw-ready', label: 'eidos-sw.js activated', meta: 'v1' })
    }
  }, [swStatus])

  function addEvent(e: Omit<SwEvent, 'id' | 'time'>) {
    const next: SwEvent = { ...e, id: uid(), time: ts() }
    eventsRef.current = [next, ...eventsRef.current].slice(0, 50)
    setEvents([...eventsRef.current])
  }

  function onCacheEvent(kind: SwEvent['kind'], label: string, meta?: string) {
    addEvent({ kind, label, meta })
  }

  return (
    <div className="min-h-full flex flex-col">
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div className="border-b border-eidos-border bg-eidos-surface px-6 py-8">
        <p className="text-[11px] font-mono text-eidos-accent uppercase tracking-widest mb-3">
          Service Worker Runtime
        </p>
        <h1 className="text-3xl font-bold text-eidos-text tracking-tight leading-tight mb-3">
          Stop writing service workers.
        </h1>
        <p className="text-eidos-text-dim text-sm max-w-2xl leading-relaxed mb-5">
          You declare what you want. Eidos generates the fetch interception rules, picks the right
          caching strategy, and queues failed actions to IndexedDB — automatically.
        </p>

        {/* Before / After */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
          <div className="rounded-lg border border-eidos-border bg-eidos-elevated p-3">
            <p className="text-[10px] font-mono text-eidos-red uppercase mb-2 tracking-widest">Before</p>
            <pre className="text-[11px] font-mono text-eidos-muted leading-relaxed overflow-x-auto">{`registerRoute(
  /\\/api\\/products/,
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
    plugins: [new ExpirationPlugin(
      { maxEntries: 60 }
    )],
  })
)
// + 40 lines of sync event handler`}</pre>
          </div>
          <div className="rounded-lg border border-eidos-accent/20 bg-eidos-accent-dim p-3">
            <p className="text-[10px] font-mono text-eidos-accent uppercase mb-2 tracking-widest">After</p>
            <pre className="text-[11px] font-mono text-eidos-text leading-relaxed">{`resource('/api/products', {
  offline: true,  // → StaleWhileRevalidate
})

action(createOrder, {
  reliability: 'neverLose',  // → IDB queue
})`}</pre>
          </div>
        </div>
      </div>

      {/* ── Main demo area ─────────────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_380px] min-h-0">

        {/* Left: interactive demos */}
        <div className="border-r border-eidos-border overflow-y-auto">
          <ProductsDemo onEvent={onCacheEvent} resourceState={resourceState} isOnline={isOnline} />
          <div className="border-t border-eidos-border" />
          <OrdersDemo onEvent={onCacheEvent} queue={queue} isOnline={isOnline} onNavigate={onNavigate} />
        </div>

        {/* Right: live event stream */}
        <div className="flex flex-col overflow-hidden bg-eidos-surface">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-eidos-border shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-eidos-green animate-pulse" />
              <span className="text-xs font-mono text-eidos-text">Runtime Events</span>
            </div>
            <button
              onClick={() => setEvents([])}
              className="text-[10px] font-mono text-eidos-muted hover:text-eidos-text-dim transition-colors"
            >
              clear
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 font-mono text-[11px]">
            {events.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <div className="text-eidos-muted">waiting for activity</div>
                <div className="text-eidos-border text-[10px]">fetch a product or submit an order</div>
              </div>
            )}
            {events.map(ev => (
              <div key={ev.id} className="flex gap-2 items-baseline animate-slide-right">
                <span className="text-eidos-border shrink-0 font-tabular">{ev.time}</span>
                <span className={`shrink-0 font-semibold w-16 ${EVENT_COLORS[ev.kind]}`}>
                  {EVENT_PREFIXES[ev.kind]}
                </span>
                <span className="text-eidos-text-dim truncate">{ev.label}</span>
                {ev.meta && (
                  <span className="text-eidos-border shrink-0 ml-auto">{ev.meta}</span>
                )}
              </div>
            ))}
          </div>

          {/* Runtime status strip */}
          <div className="border-t border-eidos-border px-4 py-2 shrink-0 grid grid-cols-3 gap-2 text-center">
            <RuntimeStat label="cache hits" value={String(resourceState?.cacheHits ?? 0)} />
            <RuntimeStat label="queue" value={String(queue.filter(q => q.status === 'pending').length)} />
            <RuntimeStat
              label="cached at"
              value={resourceState?.cachedAt ? new Date(resourceState.cachedAt).toLocaleTimeString('en', {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'}) : '—'}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function RuntimeStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-eidos-muted text-[9px] font-mono uppercase tracking-widest">{label}</p>
      <p className="text-eidos-text text-sm font-mono font-semibold font-tabular">{value}</p>
    </div>
  )
}

// ── Products demo ─────────────────────────────────────────────────────────────

type CacheEventFn = (kind: SwEvent['kind'], label: string, meta?: string) => void

interface ResourceState {
  status: string
  lastEvent?: string
  cacheHits: number
  cachedAt?: number
}

function ProductsDemo({
  onEvent,
  resourceState,
  isOnline,
}: {
  onEvent: CacheEventFn
  resourceState: ResourceState | undefined
  isOnline: boolean
}) {
  const [products, setProducts]     = useState<Product[] | null>(null)
  const [loading,  setLoading]      = useState(false)
  const [lastResult, setLastResult] = useState<'hit' | 'miss' | 'error' | 'offline' | null>(null)

  async function fetch_() {
    setLoading(true)
    setLastResult(null)
    try {
      const data = await productsResource.json() as Product[]
      // resource.ts now throws on non-ok responses, so data is always the real payload.
      // Guard defensively anyway in case something unexpected slips through.
      if (!Array.isArray(data)) throw new Error('Unexpected response shape')
      setProducts(data)

      const entry = useEidosStore.getState().resources['/api/products']
      const hit   = entry?.lastEvent === 'cache-hit'
      setLastResult(hit ? 'hit' : 'miss')
      onEvent(
        hit ? 'cache-hit' : 'cache-updated',
        '/api/products',
        hit ? 'served from cache' : 'fetched & cached',
      )
    } catch (err) {
      const isOffline = String(err).includes('offline')
      setLastResult(isOffline ? 'offline' : 'error')
      onEvent('network-error', '/api/products', isOffline ? 'no cache yet' : 'network fail')
    } finally {
      setLoading(false)
    }
  }

  async function clear() {
    await productsResource.invalidate()
    setProducts(null)
    setLastResult(null)
  }

  return (
    <div className="p-5">
      {/* Section header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-sm font-semibold text-eidos-text">Products</h2>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-eidos-accent-dim text-eidos-accent border border-eidos-accent/20">
              StaleWhileRevalidate
            </span>
          </div>
          <p className="text-xs text-eidos-muted">
            First fetch hits the network. Every subsequent fetch is instant — from cache.
          </p>
        </div>
        <CacheIndicator result={lastResult} />
      </div>

      {/* Declaration */}
      <div className="rounded-lg border border-eidos-border bg-eidos-elevated px-3 py-2 mb-4 font-mono text-[11px]">
        <span className="text-eidos-text-dim">resource</span>
        <span className="text-eidos-accent">(</span>
        <span className="text-eidos-green">'/api/products'</span>
        <span className="text-eidos-muted">, {'{'} </span>
        <span className="text-eidos-text-dim">offline</span>
        <span className="text-eidos-muted">: </span>
        <span className="text-eidos-accent">true</span>
        <span className="text-eidos-muted"> {'}'}</span>
        <span className="text-eidos-accent">)</span>
      </div>

      {/* Product list */}
      <div className="space-y-1.5 mb-4 min-h-[140px]">
        {loading && (
          <div className="flex items-center justify-center py-10 gap-2 text-xs text-eidos-muted font-mono">
            <RefreshCw size={12} className="animate-spin" /> fetching…
          </div>
        )}
        {!loading && !products && lastResult !== 'offline' && (
          <div className="flex items-center justify-center py-10 text-xs text-eidos-muted font-mono">
            no data yet — click fetch
          </div>
        )}
        {!loading && lastResult === 'offline' && (
          <div className="flex flex-col items-center justify-center py-8 gap-1.5">
            <WifiOff size={18} className="text-eidos-amber" />
            <p className="text-xs text-eidos-amber font-mono">offline — no cached response yet</p>
            <p className="text-[10px] text-eidos-muted">fetch while online first to populate the cache</p>
          </div>
        )}
        {!loading && Array.isArray(products) && products.map(p => (
          <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-eidos-elevated border border-eidos-border text-xs animate-slide-up">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-eidos-accent/40 shrink-0" />
              <span className="text-eidos-text font-medium">{p.name}</span>
              <span className="text-eidos-muted font-mono">{p.category}</span>
            </div>
            <span className="font-mono text-eidos-text-dim font-tabular">${p.price}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={fetch_}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-eidos-accent text-eidos-bg text-sm font-semibold hover:bg-sky-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Fetch Products
        </button>
        {products && !loading && (
          <button
            onClick={clear}
            className="px-3 py-2 text-xs font-mono rounded-lg border border-eidos-border text-eidos-muted hover:border-eidos-accent hover:text-eidos-text transition-all"
          >
            clear cache
          </button>
        )}
      </div>

      {!isOnline && (
        <p className="mt-2 text-[10px] font-mono text-eidos-amber">
          ⚡ offline mode — fetches served from cache automatically
        </p>
      )}
    </div>
  )
}

function CacheIndicator({ result }: { result: 'hit' | 'miss' | 'error' | 'offline' | null }) {
  if (!result) return null
  const cfg: Record<string, { text: string; cls: string }> = {
    hit:     { text: '⚡ cache hit',       cls: 'text-eidos-green  bg-eidos-green-dim  border-eidos-green/20'  },
    miss:    { text: '↑ fetched & cached', cls: 'text-eidos-accent bg-eidos-accent-dim border-eidos-accent/20' },
    error:   { text: '✕ network error',   cls: 'text-eidos-red    bg-eidos-red-dim    border-eidos-red/20'    },
    offline: { text: '⚠ offline · no cache', cls: 'text-eidos-amber bg-eidos-amber-dim border-eidos-amber/20' },
  }
  const c = cfg[result]
  if (!c) return null
  return (
    <span className={`text-[10px] font-mono px-2 py-1 rounded border animate-fade-in ${c.cls}`}>
      {c.text}
    </span>
  )
}

// ── Orders demo ───────────────────────────────────────────────────────────────

function OrdersDemo({
  onEvent,
  queue,
  isOnline,
  onNavigate,
}: {
  onEvent: CacheEventFn
  queue: ActionQueueItem[]
  isOnline: boolean
  onNavigate: (p: Page) => void
}) {
  const [result, setResult] = useState<{ text: string; kind: 'ok' | 'queued' | 'error' } | null>(null)
  const [loading, setLoading] = useState(false)

  const pending = queue.filter(q => q.status === 'pending' || q.status === 'replaying')

  async function submit() {
    setLoading(true)
    setResult(null)
    try {
      const res = await createOrder({ productId: 1, quantity: 1, customerName: 'Demo User' })
      if ('queued' in res && res.queued) {
        setResult({ text: `queued — will execute when online`, kind: 'queued' })
        onEvent('queue-add', 'createOrder', 'persisted to IndexedDB')
      } else {
        const r = res as { id: string }
        setResult({ text: `order ${r.id} confirmed`, kind: 'ok' })
        onEvent('cache-updated', 'createOrder', 'executed')
      }
    } catch {
      setResult({ text: 'request failed', kind: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function replay() {
    await replayQueue()
    onEvent('queue-replay', 'replayQueue()', `${pending.length} item(s)`)
  }

  return (
    <div className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-sm font-semibold text-eidos-text">Orders</h2>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-eidos-amber-dim text-eidos-amber border border-eidos-amber/20">
              neverLose
            </span>
          </div>
          <p className="text-xs text-eidos-muted">
            Offline? Orders queue to IndexedDB. Reconnect and they replay automatically.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-eidos-border bg-eidos-elevated px-3 py-2 mb-4 font-mono text-[11px]">
        <span className="text-eidos-text-dim">action</span>
        <span className="text-eidos-accent">(</span>
        <span className="text-eidos-text-dim">orderApi.create</span>
        <span className="text-eidos-muted">, {'{'} </span>
        <span className="text-eidos-text-dim">reliability</span>
        <span className="text-eidos-muted">: </span>
        <span className="text-eidos-amber">'neverLose'</span>
        <span className="text-eidos-muted"> {'}'}</span>
        <span className="text-eidos-accent">)</span>
      </div>

      {/* Queue */}
      <div className="min-h-[80px] mb-4 space-y-1.5">
        {pending.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-xs text-eidos-muted font-mono">
            {isOnline ? 'simulate offline then submit an order' : '⚡ offline — submit to queue'}
          </div>
        ) : (
          pending.map(item => (
            <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-eidos-amber/20 bg-eidos-amber-dim text-xs font-mono animate-slide-up">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-eidos-amber animate-pulse" />
                <span className="text-eidos-text">{item.actionName}</span>
                <span className="text-eidos-muted">retry {item.retryCount}/{item.maxRetries}</span>
              </div>
              <span className={`px-1.5 py-0.5 rounded text-[10px] border ${
                item.status === 'replaying'
                  ? 'bg-eidos-accent-dim border-eidos-accent/20 text-eidos-accent'
                  : 'bg-eidos-amber-dim border-eidos-amber/20 text-eidos-amber'
              }`}>{item.status}</span>
            </div>
          ))
        )}
      </div>

      {result && (
        <div className={`flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-lg border mb-3 animate-fade-in ${
          result.kind === 'ok'     ? 'bg-eidos-green-dim border-eidos-green/20 text-eidos-green' :
          result.kind === 'queued' ? 'bg-eidos-amber-dim border-eidos-amber/20 text-eidos-amber' :
                                     'bg-eidos-red-dim   border-eidos-red/20   text-eidos-red'
        }`}>
          {result.kind === 'ok'     ? <CheckCircle size={12} /> :
           result.kind === 'queued' ? <Clock size={12} /> :
                                      <WifiOff size={12} />}
          {result.text}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-eidos-elevated border border-eidos-border text-eidos-text text-sm font-medium hover:border-eidos-accent transition-all disabled:opacity-50"
        >
          <ShoppingCart size={13} className={loading ? 'animate-pulse' : ''} />
          Submit Order
        </button>
        {pending.length > 0 && isOnline && (
          <button
            onClick={replay}
            className="px-3 py-2 text-xs font-mono rounded-lg border border-eidos-green/30 bg-eidos-green-dim text-eidos-green hover:bg-eidos-green/15 transition-all"
          >
            replay {pending.length}
          </button>
        )}
      </div>

      <button
        onClick={() => onNavigate('actions')}
        className="mt-3 flex items-center gap-1 text-[11px] text-eidos-muted hover:text-eidos-accent transition-colors font-mono"
      >
        view full queue <ArrowRight size={10} />
      </button>
    </div>
  )
}
