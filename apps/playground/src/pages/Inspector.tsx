import { useState } from 'react'
import { useEidosStore } from '@eidos/core'
import { ArrowDown, Zap, Code2, Layers } from 'lucide-react'
import type { ResourceEntry, GeneratedStrategy } from '@eidos/core'

const SAMPLE: ResourceEntry = {
  url: '/api/products',
  config: { offline: true },
  strategy: {
    name: 'StaleWhileRevalidate',
    swStrategy: 'stale-while-revalidate',
    cacheName: 'eidos-resources-v1',
    reasoning: 'offline: true signals resilience. SWR returns cached data instantly while revalidating in the background — the best tradeoff between speed and freshness for offline-capable resources.',
    behavior: [
      'Cache hit → return immediately, kick off background revalidation',
      'Cache miss → fetch from network, cache the response, return it',
      'Offline → return cached version if available, 503 if not',
      'Reconnect → next request triggers a background refresh',
    ],
    equivalentCode: `new StaleWhileRevalidate({\n  cacheName: 'eidos-resources-v1',\n  plugins: [new ExpirationPlugin({ maxEntries: 60 })],\n})`,
  },
  status: 'fresh',
  cacheHits: 0,
  cacheMisses: 0,
}

export function Inspector() {
  const live  = Object.values(useEidosStore(s => s.resources))
  const all   = live.length > 0 ? live : [SAMPLE]
  const [sel, setSel] = useState<ResourceEntry>(all[0])

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-5 animate-fade-in">
      <div>
        <h2 className="text-lg font-semibold text-eidos-text mb-1">Intent Inspector</h2>
        <p className="text-sm text-eidos-muted">
          Trace a declaration end-to-end: from what you write → what Eidos decides → what the SW receives → what happens on every request.
        </p>
      </div>

      {/* Resource picker */}
      <div className="flex gap-2 flex-wrap">
        {all.map(e => (
          <button
            key={e.url}
            onClick={() => setSel(e)}
            className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-all ${
              sel.url === e.url
                ? 'bg-eidos-accent-dim border-eidos-accent text-eidos-text'
                : 'border-eidos-border text-eidos-muted hover:border-eidos-accent hover:text-eidos-text'
            }`}
          >
            {e.url}
          </button>
        ))}
      </div>

      {/* Flow */}
      <div className="space-y-2">
        <Step n={1} icon={Code2} title="Intent Declaration" note="what you write">
          <pre className="text-xs font-mono text-eidos-text leading-relaxed">{`resource('${sel.url}', {
  offline: ${sel.config.offline},${sel.config.strategy ? `\n  strategy: '${sel.config.strategy}',` : ''}
})`}</pre>
        </Step>

        <Arrow />

        <Step n={2} icon={Zap} title="Strategy Resolution" note="what Eidos decides">
          <div className="flex items-center gap-2 mb-2 text-xs font-mono">
            <span className="text-eidos-muted">offline: true</span>
            <span className="text-eidos-border">→</span>
            <span className="text-eidos-accent font-semibold">{sel.strategy.name}</span>
          </div>
          <p className="text-xs text-eidos-muted leading-relaxed">{sel.strategy.reasoning}</p>
        </Step>

        <Arrow />

        <Step n={3} icon={Layers} title="SW Message" note="sent via postMessage">
          <pre className="text-xs font-mono text-eidos-text-dim leading-relaxed">{`{
  type: 'EIDOS_REGISTER_RESOURCE',
  url: '${sel.url}',
  strategy: '${sel.strategy.swStrategy}',
  cacheName: '${sel.strategy.cacheName}',
}`}</pre>
        </Step>

        <Arrow />

        <Step n={4} icon={Zap} title="Runtime Behavior" note="on every matching fetch">
          <div className="space-y-1.5">
            {sel.strategy.behavior.map((step, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="font-mono text-eidos-accent shrink-0 w-4">{i + 1}.</span>
                <span className="text-eidos-muted">{step}</span>
              </div>
            ))}
          </div>
        </Step>
      </div>

      {/* Workbox comparison */}
      <div className="rounded-xl border border-eidos-border bg-eidos-surface p-4">
        <p className="text-xs font-mono text-eidos-muted mb-3">Equivalent Workbox config (what you no longer need to write)</p>
        <pre className="text-xs font-mono text-eidos-muted leading-relaxed">{sel.strategy.equivalentCode}</pre>
      </div>

      {/* Decision tree */}
      <DecisionTree selected={sel.strategy.swStrategy} />
    </div>
  )
}

function Step({ n, icon: Icon, title, note, children }: {
  n: number; icon: React.ElementType; title: string; note: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-eidos-border bg-eidos-surface p-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-full bg-eidos-accent/10 border border-eidos-accent/20 flex items-center justify-center shrink-0">
          <span className="text-[9px] font-mono text-eidos-accent font-bold">{n}</span>
        </div>
        <Icon size={12} className="text-eidos-accent" />
        <span className="text-sm font-semibold text-eidos-text">{title}</span>
        <span className="ml-auto text-[10px] font-mono text-eidos-muted">{note}</span>
      </div>
      <div className="pl-7">{children}</div>
    </div>
  )
}

function Arrow() {
  return (
    <div className="flex justify-center py-0.5">
      <ArrowDown size={14} className="text-eidos-border" />
    </div>
  )
}

type Strategy = GeneratedStrategy['swStrategy']

function DecisionTree({ selected }: { selected: Strategy }) {
  const nodes: { q: string; result: string; desc: string; s: Strategy }[] = [
    { q: 'offline: true (no override)',          result: 'StaleWhileRevalidate', desc: 'speed + resilience',  s: 'stale-while-revalidate' },
    { q: 'offline: true, strategy: cache-first', result: 'CacheFirst',          desc: 'max speed',           s: 'cache-first' },
    { q: 'default / strategy: network-first',    result: 'NetworkFirst',         desc: 'freshness priority',  s: 'network-first' },
  ]
  return (
    <div className="rounded-xl border border-eidos-border bg-eidos-surface p-4">
      <p className="text-xs font-mono text-eidos-muted mb-3">Decision tree</p>
      <div className="space-y-2">
        {nodes.map(({ q, result, desc, s }) => (
          <div key={s} className={`flex items-center gap-3 p-2.5 rounded-lg border text-xs transition-all ${
            selected === s
              ? 'border-eidos-accent/30 bg-eidos-accent-dim'
              : 'border-eidos-border opacity-40'
          }`}>
            <code className="font-mono text-eidos-muted flex-1">{q}</code>
            <ArrowDown size={10} className="text-eidos-border rotate-[-90deg] shrink-0" />
            <span className={`font-mono font-semibold shrink-0 ${selected === s ? 'text-eidos-accent' : 'text-eidos-muted'}`}>{result}</span>
            <span className="text-eidos-muted shrink-0">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
