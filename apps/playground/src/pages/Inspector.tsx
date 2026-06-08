import { useState } from 'react'
import { useEidos } from '@sweidos/eidos'
import type { ResourceEntry } from '@sweidos/eidos'

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
      'Offline → return cached version if available, throw if not',
      'Reconnect → next request triggers a background refresh',
    ],
    equivalentCode: `new StaleWhileRevalidate({\n  cacheName: 'eidos-resources-v1',\n  plugins: [new ExpirationPlugin({ maxEntries: 60 })],\n})`,
  },
  status: 'fresh', cacheHits: 0, cacheMisses: 0,
}

export function Inspector() {
  const live = Object.values(useEidos().resources)
  const all  = live.length > 0 ? live : [SAMPLE]
  const [sel, setSel] = useState<ResourceEntry>(all[0])

  const STEPS = [
    {
      n: '1', title: 'intent declaration', note: 'what you write',
      content: (
        <pre className="text-2xs text-eidos-text leading-relaxed bg-eidos-bg border border-eidos-border p-3">{`resource('${sel.url}', {
  offline: ${sel.config.offline},${sel.config.strategy ? `\n  strategy: '${sel.config.strategy}',` : ''}
})`}</pre>
      ),
    },
    {
      n: '2', title: 'strategy resolution', note: 'what eidos decides',
      content: (
        <div className="bg-eidos-bg border border-eidos-border p-3">
          <div className="flex items-center gap-2 text-xs mb-2">
            <code className="text-eidos-muted">offline: true</code>
            <span className="text-eidos-border">→</span>
            <code className="text-eidos-accent font-bold">{sel.strategy.name}</code>
          </div>
          <p className="text-2xs text-eidos-text-dim leading-relaxed">{sel.strategy.reasoning}</p>
        </div>
      ),
    },
    {
      n: '3', title: 'sw postmessage', note: 'EIDOS_REGISTER_RESOURCE',
      content: (
        <pre className="text-2xs text-eidos-text-dim leading-relaxed bg-eidos-bg border border-eidos-border p-3">{`{
  type:      'EIDOS_REGISTER_RESOURCE',
  url:       '${sel.url}',
  strategy:  '${sel.strategy.swStrategy}',
  cacheName: '${sel.strategy.cacheName}',
}`}</pre>
      ),
    },
    {
      n: '4', title: 'runtime behavior', note: 'on every matching fetch',
      content: (
        <div className="bg-eidos-bg border border-eidos-border p-3 space-y-1.5">
          {sel.strategy.behavior.map((step, i) => (
            <div key={i} className="flex gap-2 text-2xs">
              <span className="text-eidos-accent shrink-0 w-3 font-bold">{i + 1}.</span>
              <span className="text-eidos-text-dim">{step}</span>
            </div>
          ))}
        </div>
      ),
    },
  ]

  return (
    <div className="max-w-3xl mx-auto p-5 animate-fade-in">
      <div className="border-b border-eidos-border pb-4 mb-5">
        <h2 className="text-base font-bold text-eidos-text mb-1">inspector</h2>
        <p className="text-xs text-eidos-muted">
          Trace a declaration end-to-end: intent → strategy resolution → SW postMessage → runtime behavior.
        </p>
      </div>

      {/* Resource picker */}
      <div className="flex gap-2 flex-wrap mb-5">
        {all.map(e => (
          <button
            key={e.url}
            onClick={() => setSel(e)}
            className={`text-xs px-3 py-1.5 border transition-colors cursor-pointer ${
              sel.url === e.url
                ? 'border-eidos-accent text-eidos-accent bg-eidos-accent-dim'
                : 'border-eidos-border text-eidos-muted hover:border-eidos-border hover:text-eidos-text-dim'
            }`}
          >
            {e.url}
          </button>
        ))}
      </div>

      {/* Steps */}
      <div className="space-y-0 border border-eidos-border divide-y divide-eidos-border">
        {STEPS.map(({ n, title, note, content }) => (
          <div key={n} className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-eidos-accent font-bold text-xs w-5">{n}.</span>
              <span className="text-xs font-bold text-eidos-text uppercase tracking-wider">{title}</span>
              <span className="ml-auto text-2xs text-eidos-muted">{note}</span>
            </div>
            {content}
          </div>
        ))}
      </div>

      {/* Decision tree */}
      <div className="mt-5 border border-eidos-border">
        <div className="px-4 py-2 border-b border-eidos-border bg-eidos-surface text-2xs text-eidos-muted uppercase tracking-widest">
          decision tree
        </div>
        <div className="divide-y divide-eidos-border">
          {[
            { cond: 'offline: true (default)',           strategy: 'StaleWhileRevalidate', sw: 'stale-while-revalidate' },
            { cond: "offline: true, strategy: 'cache-first'", strategy: 'CacheFirst',     sw: 'cache-first' },
            { cond: "offline: true, strategy: 'network-first'", strategy: 'NetworkFirst', sw: 'network-first' },
          ].map(row => {
            const active = row.sw === sel.strategy.swStrategy
            return (
              <div key={row.sw} className={`flex items-center gap-3 px-4 py-2.5 text-xs transition-colors ${active ? 'bg-eidos-accent-dim' : ''}`}>
                <code className={`flex-1 text-2xs ${active ? 'text-eidos-text' : 'text-eidos-muted'}`}>{row.cond}</code>
                <span className="text-eidos-border">→</span>
                <code className={`text-2xs font-bold ${active ? 'text-eidos-accent' : 'text-eidos-muted'}`}>{row.strategy}</code>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
