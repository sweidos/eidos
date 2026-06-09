import { useState } from 'react'
import { useEidosResources } from '@sweidos/eidos'
import type { ResourceEntry } from '@sweidos/eidos'

export function Resources() {
  const entries = Object.values(useEidosResources())

  return (
    <div className="max-w-4xl mx-auto p-5 animate-fade-in">
      <div className="border-b border-eidos-border pb-4 mb-5">
        <h2 className="text-base font-bold text-eidos-text mb-1">resources</h2>
        <p className="text-xs text-eidos-muted">
          Every <code className="text-eidos-accent">resource()</code> call registers a fetch-intercept
          rule with the service worker. Expand a row to inspect the generated caching strategy.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="border border-eidos-border p-8 text-center">
          <p className="text-sm text-eidos-text mb-1">no resources registered</p>
          <p className="text-xs text-eidos-muted">
            call <code className="text-eidos-accent">resource('/api/url', {'{ offline: true }'})</code> at module scope
          </p>
        </div>
      ) : (
        <div className="border border-eidos-border divide-y divide-eidos-border">
          {entries.map(e => <ResourceRow key={e.url} entry={e} />)}
        </div>
      )}

      <div className="mt-5 border border-eidos-border bg-eidos-surface p-4">
        <div className="text-2xs text-eidos-muted mb-2">registration.ts</div>
        <pre className="text-2xs text-eidos-text-dim leading-relaxed overflow-x-auto">{`import { resource } from '@sweidos/eidos'

// Module-scope — idempotent, re-registration returns same handle
const products = resource('/api/products', {
  offline: true,          // → StaleWhileRevalidate auto-selected
  maxAge: 5 * 60 * 1000, // 5-min TTL — expired cache treated as miss
  cacheName: 'my-cache',  // optional custom bucket
})

// Use directly
const data = await products.json<Product[]>()

// Or with TanStack Query
const { data } = useQuery(products.query<Product[]>())

// Inspect generated strategy
console.log(products.strategy.name)      // 'StaleWhileRevalidate'
console.log(products.strategy.reasoning) // one-line rationale

// Cleanup
products.invalidate()  // evict cached entries
products.unregister()  // remove from SW + registry`}</pre>
      </div>
    </div>
  )
}

function ResourceRow({ entry }: { entry: ResourceEntry }) {
  const [open, setOpen] = useState(false)

  const statusColor = {
    idle:     'text-eidos-muted',
    fetching: 'text-eidos-blue',
    fresh:    'text-eidos-accent',
    stale:    'text-eidos-amber',
    error:    'text-eidos-red',
    offline:  'text-eidos-amber',
  }[entry.status] ?? 'text-eidos-muted'

  const cachedStr = entry.cachedAt
    ? new Date(entry.cachedAt).toLocaleTimeString('en', { hour12: false })
    : '—'

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-label={`${open ? 'Collapse' : 'Expand'} details for ${entry.url}`}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-eidos-surface transition-colors cursor-pointer text-xs"
      >
        <span className="text-eidos-accent font-bold w-4" aria-hidden="true">{open ? '▼' : '▶'}</span>
        <span className="text-eidos-text flex-1 font-bold">{entry.url}</span>
        <span className="text-eidos-muted border border-eidos-border px-2 py-0.5 text-2xs">{entry.strategy.name}</span>
        <span className={`w-16 text-2xs ${statusColor}`}>{entry.status}</span>
        <span className="text-eidos-accent font-tabular text-2xs w-10 text-right">{entry.cacheHits}</span>
        <span className="text-eidos-muted text-2xs w-4">hit</span>
        <span className="text-eidos-muted text-2xs w-20 text-right">{cachedStr}</span>
      </button>

      {open && (
        <div className="border-t border-eidos-border bg-eidos-surface px-4 py-4 animate-fade-in">
          {/* Meta grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              ['sw strategy', entry.strategy.swStrategy],
              ['cache name',  entry.strategy.cacheName],
              ['cached at',   cachedStr],
              ['offline',     entry.config.offline ? 'yes' : 'no'],
              ['max age',     entry.config.maxAge ? `${(entry.config.maxAge / 1000).toFixed(0)}s` : '∞'],
              ['hits / misses', `${entry.cacheHits} / ${entry.cacheMisses}`],
            ].map(([l, v]) => (
              <div key={l} className="border border-eidos-border px-3 py-2">
                <div className="text-2xs text-eidos-muted uppercase tracking-widest mb-0.5">{l}</div>
                <div className="text-xs text-eidos-text font-bold">{v}</div>
              </div>
            ))}
          </div>

          {/* Reasoning */}
          <div className="mb-4">
            <div className="text-2xs text-eidos-muted uppercase tracking-widest mb-1">why this strategy</div>
            <p className="text-xs text-eidos-text-dim leading-relaxed">{entry.strategy.reasoning}</p>
          </div>

          {/* Behavior steps */}
          <div>
            <div className="text-2xs text-eidos-muted uppercase tracking-widest mb-2">runtime behavior</div>
            <div className="space-y-1">
              {entry.strategy.behavior.map((step, i) => (
                <div key={i} className="flex gap-2 text-xs">
                  <span className="text-eidos-accent shrink-0 w-4 font-bold">{i + 1}.</span>
                  <span className="text-eidos-text-dim">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
