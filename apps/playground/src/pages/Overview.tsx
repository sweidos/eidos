import { useState } from 'react'
import {
  ShoppingCart,
  Package,
  RefreshCw,
  WifiOff,
  CheckCircle,
  Clock,
  Zap,
  ArrowRight,
  Layers,
} from 'lucide-react'
import { useVardiStatus, useVardiStore, replayQueue } from 'vardi'
import { Card, CardHeader } from '../components/Card'
import { StatusBadge } from '../components/StatusBadge'
import { CodeBlock } from '../components/CodeBlock'
import { productsResource, createOrder, type Product } from '../lib/vardi'
import type { Page } from '../App'

interface OverviewProps {
  onNavigate: (page: Page) => void
}

export function Overview({ onNavigate }: OverviewProps) {
  const { isOnline, swStatus } = useVardiStatus()
  const resources = useVardiStore((s) => s.resources)
  const queue     = useVardiStore((s) => s.queue)

  const resourceCount = Object.keys(resources).length
  const pendingCount  = queue.filter((q) => q.status === 'pending').length

  return (
    <div className="max-w-5xl space-y-8 animate-fade-in">
      {/* Hero */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-vardi-accent flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-vardi-text tracking-tight">Vardi</h1>
        </div>
        <p className="text-lg text-vardi-text-dim max-w-2xl leading-relaxed">
          Describe <span className="text-vardi-text font-medium">intent</span>. The runtime figures out how.
          An abstraction layer that eliminates Service Worker complexity from your application code.
        </p>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={() => onNavigate('inspector')}
            className="flex items-center gap-2 text-sm text-vardi-accent hover:text-white transition-colors"
          >
            See intent → strategy mapping <ArrowRight size={14} />
          </button>
          <span className="text-vardi-border">·</span>
          <button
            onClick={() => onNavigate('learn')}
            className="text-sm text-vardi-muted hover:text-vardi-text transition-colors"
          >
            How it works
          </button>
        </div>
      </div>

      {/* Status strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatusCard
          label="Network"
          value={isOnline ? 'Online' : 'Offline'}
          status={isOnline ? 'fresh' : 'stale'}
          note="navigator.onLine"
        />
        <StatusCard
          label="Service Worker"
          value={swStatus}
          status={swStatus === 'active' ? 'fresh' : swStatus === 'error' ? 'error' : 'idle'}
          note="vardi-sw.js"
        />
        <StatusCard
          label="Resources"
          value={String(resourceCount)}
          status={resourceCount > 0 ? 'fresh' : 'idle'}
          note="registered"
        />
        <StatusCard
          label="Action Queue"
          value={String(pendingCount)}
          status={pendingCount > 0 ? 'stale' : 'idle'}
          note="pending"
        />
      </div>

      {/* Demos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ProductsDemo />
        <OrdersDemo />
      </div>

      {/* Code callout */}
      <Card>
        <CardHeader
          title="The API"
          description="Everything above was driven by two declarations."
        />
        <CodeBlock
          code={`import { resource, action } from 'vardi'

// Register an offline-capable resource.
// The runtime picks StaleWhileRevalidate.
const products = resource('/api/products', {
  offline: true,
})

// Wrap any async function with neverLose reliability.
// The runtime queues it in IndexedDB if offline.
const createOrder = action(orderApi.create, {
  reliability: 'neverLose',
})`}
          title="your-app.ts"
        />
      </Card>

      {/* Navigation cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            page: 'resources' as Page,
            icon: Layers,
            title: 'Resources',
            desc: 'Inspect cache status and strategy for every registered resource',
          },
          {
            page: 'actions' as Page,
            icon: Clock,
            title: 'Action Queue',
            desc: 'View queued actions, retry status, and IndexedDB persistence',
          },
          {
            page: 'inspector' as Page,
            icon: Zap,
            title: 'Intent Inspector',
            desc: 'Trace how each intent declaration becomes a runtime strategy',
          },
        ].map(({ page, icon: Icon, title, desc }) => (
          <button
            key={page}
            onClick={() => onNavigate(page)}
            className="text-left p-4 rounded-xl border border-vardi-border bg-vardi-surface hover:border-vardi-accent hover:bg-vardi-accent-dim transition-all group"
          >
            <Icon size={16} className="text-vardi-muted group-hover:text-vardi-accent mb-2 transition-colors" />
            <p className="text-sm font-semibold text-vardi-text">{title}</p>
            <p className="text-xs text-vardi-muted mt-0.5 leading-relaxed">{desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Status Card ───────────────────────────────────────────────────────────────

function StatusCard({
  label,
  value,
  status,
  note,
}: {
  label: string
  value: string
  status: 'fresh' | 'stale' | 'idle' | 'error'
  note: string
}) {
  return (
    <div className="p-4 rounded-xl border border-vardi-border bg-vardi-surface">
      <p className="text-[10px] font-mono text-vardi-muted uppercase tracking-widest mb-1">{label}</p>
      <p className="text-lg font-semibold text-vardi-text capitalize leading-tight">{value}</p>
      <div className="mt-2">
        <StatusBadge status={status} />
      </div>
      <p className="text-[10px] font-mono text-vardi-border mt-1">{note}</p>
    </div>
  )
}

// ── Products Demo ─────────────────────────────────────────────────────────────

function ProductsDemo() {
  const [products, setProducts]     = useState<Product[] | null>(null)
  const [loading,  setLoading]      = useState(false)
  const [lastEvent, setLastEvent]   = useState<string | null>(null)
  const resourceState               = useVardiStore((s) => s.resources['/api/products'])

  // SW postMessage is async — read the store after it has settled
  async function fetchProducts() {
    setLoading(true)
    setLastEvent(null)
    const hitsBefore = useVardiStore.getState().resources['/api/products']?.cacheHits ?? 0
    try {
      const data = await productsResource.json()
      setProducts(data)
      // Give the SW message ~150 ms to land then check what actually happened
      setTimeout(() => {
        const entry = useVardiStore.getState().resources['/api/products']
        const hitsAfter = entry?.cacheHits ?? 0
        if (hitsAfter > hitsBefore) {
          setLastEvent('cache-hit')
        } else {
          setLastEvent('cache-updated')
        }
      }, 150)
    } catch {
      setLastEvent('error')
    } finally {
      setLoading(false)
    }
  }

  async function invalidate() {
    await productsResource.invalidate()
    setProducts(null)
    setLastEvent(null)
  }

  return (
    <Card>
      <CardHeader
        title="Products Demo"
        description="Fetch, cache, go offline, fetch again"
        action={
          <span className="text-[10px] font-mono text-vardi-muted bg-vardi-elevated px-2 py-0.5 rounded">
            StaleWhileRevalidate
          </span>
        }
      />

      {/* Event log */}
      {lastEvent && (
        <div className={`
          flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-lg mb-3 animate-slide-up
          ${lastEvent === 'cache-hit'
            ? 'bg-vardi-green-dim text-vardi-green border border-vardi-green/20'
            : lastEvent === 'error'
              ? 'bg-vardi-red-dim text-vardi-red border border-vardi-red/20'
              : 'bg-vardi-accent-dim text-vardi-accent border border-vardi-accent/20'}
        `}>
          <CheckCircle size={12} />
          {lastEvent === 'cache-hit'
            ? '⚡ Cache hit — served from SW cache (0ms)'
            : lastEvent === 'cache-updated'
              ? '↑ Cache updated from network'
              : lastEvent === 'error'
                ? '✕ Network error — no cached fallback'
                : '↓ Fetched from network'}
        </div>
      )}

      {/* Product list */}
      <div className="space-y-1.5 mb-4 min-h-[120px]">
        {loading && (
          <div className="flex items-center gap-2 text-xs text-vardi-muted py-8 justify-center">
            <RefreshCw size={12} className="animate-spin" /> Fetching…
          </div>
        )}
        {!loading && products && products.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-vardi-elevated border border-vardi-border text-sm animate-slide-up"
          >
            <div className="flex items-center gap-2">
              <Package size={12} className="text-vardi-muted" />
              <span className="text-vardi-text font-medium">{p.name}</span>
              <span className="text-[10px] font-mono text-vardi-muted">{p.category}</span>
            </div>
            <span className="font-mono text-vardi-accent text-xs">${p.price}</span>
          </div>
        ))}
        {!loading && !products && (
          <div className="flex items-center justify-center py-8 text-xs text-vardi-muted font-mono">
            No data — click Fetch to load
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={fetchProducts}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-vardi-accent text-white text-sm font-medium hover:bg-indigo-500 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Fetch Products
        </button>
        {products && (
          <button
            onClick={invalidate}
            className="px-3 py-2 rounded-lg border border-vardi-border text-vardi-muted hover:text-vardi-text hover:border-vardi-accent text-xs transition-all"
          >
            Clear Cache
          </button>
        )}
      </div>

      <p className="text-[10px] text-vardi-muted mt-2 font-mono">
        {resourceState?.cacheHits ?? 0} cache hits · {resourceState?.cachedAt
          ? `cached ${new Date(resourceState.cachedAt).toLocaleTimeString()}`
          : 'not cached yet'}
      </p>
    </Card>
  )
}

// ── Orders Demo ───────────────────────────────────────────────────────────────

function OrdersDemo() {
  const [result,   setResult]   = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [queued,   setQueued]   = useState(false)
  const queue                    = useVardiStore((s) => s.queue)
  const isOnline                 = useVardiStore((s) => s.isOnline)

  const pendingOrders = queue.filter(
    (q) => q.actionName === 'createOrder' && (q.status === 'pending' || q.status === 'replaying'),
  )

  async function submitOrder() {
    setLoading(true)
    setResult(null)
    setQueued(false)
    try {
      const res = await createOrder({
        productId: 1,
        quantity: 1,
        customerName: 'Demo User',
      })
      if ('queued' in res && res.queued) {
        setQueued(true)
        setResult(res.message)
      } else {
        setResult(`Order ${(res as { id: string }).id} confirmed ✓`)
      }
    } catch {
      setResult('Failed to submit order')
    } finally {
      setLoading(false)
    }
  }

  async function replay() {
    await replayQueue()
  }

  return (
    <Card>
      <CardHeader
        title="Orders Demo"
        description="Submit offline, queue persists, replay on reconnect"
        action={
          <span className="text-[10px] font-mono text-vardi-muted bg-vardi-elevated px-2 py-0.5 rounded">
            neverLose
          </span>
        }
      />

      {/* Result */}
      {result && (
        <div className={`
          flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-lg mb-3 animate-slide-up
          ${queued
            ? 'bg-vardi-amber-dim text-vardi-amber border border-vardi-amber/20'
            : 'bg-vardi-green-dim text-vardi-green border border-vardi-green/20'}
        `}>
          {queued ? <WifiOff size={12} /> : <CheckCircle size={12} />}
          {result}
        </div>
      )}

      {/* Queue list */}
      <div className="space-y-1.5 mb-4 min-h-[120px]">
        {pendingOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <ShoppingCart size={20} className="text-vardi-border" />
            <p className="text-xs text-vardi-muted font-mono">Queue empty</p>
            {!isOnline && (
              <p className="text-[10px] text-vardi-amber">Offline — orders will queue</p>
            )}
          </div>
        )}
        {pendingOrders.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-vardi-elevated border border-vardi-border text-sm animate-slide-up"
          >
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-vardi-amber animate-pulse" />
              <span className="text-vardi-text font-medium font-mono text-xs">{item.actionName}</span>
              <span className="text-[10px] text-vardi-muted">
                retry {item.retryCount}/{item.maxRetries}
              </span>
            </div>
            <StatusBadge status={item.status} />
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={submitOrder}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-vardi-accent text-white text-sm font-medium hover:bg-indigo-500 transition-colors disabled:opacity-50"
        >
          <ShoppingCart size={13} className={loading ? 'animate-pulse' : ''} />
          Submit Order
        </button>
        {pendingOrders.length > 0 && isOnline && (
          <button
            onClick={replay}
            className="px-3 py-2 rounded-lg bg-vardi-green-dim border border-vardi-green/30 text-vardi-green text-xs font-medium hover:bg-vardi-green/20 transition-all"
          >
            Replay Queue
          </button>
        )}
      </div>

      <p className="text-[10px] text-vardi-muted mt-2 font-mono">
        {isOnline
          ? 'Simulate offline in the header then submit'
          : '⚡ Offline — orders persist to IndexedDB automatically'}
      </p>
    </Card>
  )
}
