import { useState } from 'react'
import { ChevronDown, ChevronRight, Database, Trash2, RefreshCw } from 'lucide-react'
import { useEidosStore } from '@eidos/core'
import type { ResourceEntry } from '@eidos/core'

export function Resources() {
  const resources = useEidosStore(s => s.resources)
  const entries   = Object.values(resources)

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-5 animate-fade-in">
      <div>
        <h2 className="text-lg font-semibold text-eidos-text mb-1">Resources</h2>
        <p className="text-sm text-eidos-muted">
          Every <code className="font-mono text-eidos-accent text-xs">resource()</code> declaration
          registers a fetch-intercept rule with the service worker.
          Expand any row to see the generated strategy.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-eidos-border rounded-xl bg-eidos-surface gap-3">
          <Database size={28} className="text-eidos-border" />
          <p className="text-sm text-eidos-text">No resources registered</p>
          <p className="text-xs text-eidos-muted font-mono text-center max-w-xs">
            Call{' '}
            <span className="text-eidos-accent">resource('/api/url', {'{ offline: true }'})</span>
            {' '}at module scope.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(e => <ResourceRow key={e.url} entry={e} />)}
        </div>
      )}

      <div className="rounded-xl border border-eidos-border bg-eidos-surface p-4">
        <p className="text-xs font-mono text-eidos-muted mb-3">registration.ts</p>
        <pre className="text-xs font-mono text-eidos-text leading-relaxed">{`import { resource } from '@eidos/core'

// Module-scope — runs once, registers with SW on load
const products = resource('/api/products', {
  offline: true,            // → StaleWhileRevalidate
})

// Use directly or with TanStack Query
const data = await products.json()
const q    = useQuery(products.query())`}</pre>
      </div>
    </div>
  )
}

function ResourceRow({ entry }: { entry: ResourceEntry }) {
  const [open, setOpen] = useState(false)

  const statusColor = {
    idle:        'text-eidos-muted',
    fetching:    'text-eidos-accent',
    fresh:       'text-eidos-green',
    stale:       'text-eidos-amber',
    error:       'text-eidos-red',
    offline:     'text-eidos-amber',
  }[entry.status] ?? 'text-eidos-muted'

  const cachedStr = entry.cachedAt
    ? new Date(entry.cachedAt).toLocaleTimeString('en', { hour12: false })
    : '—'

  return (
    <div className="rounded-xl border border-eidos-border bg-eidos-surface overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-eidos-elevated transition-colors text-left"
      >
        <Database size={13} className="text-eidos-accent shrink-0" />
        <span className="font-mono text-sm text-eidos-text flex-1">{entry.url}</span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-eidos-elevated border border-eidos-border text-eidos-muted">{entry.strategy.name}</span>
        <span className={`text-xs font-mono ${statusColor}`}>{entry.status}</span>
        <span className="text-[10px] font-mono text-eidos-muted font-tabular">
          <span className="text-eidos-green">{entry.cacheHits}</span> hits
        </span>
        <span className="text-[10px] font-mono text-eidos-muted">cached: {cachedStr}</span>
        {open ? <ChevronDown size={13} className="text-eidos-muted shrink-0" /> : <ChevronRight size={13} className="text-eidos-muted shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-eidos-border p-4 space-y-4 animate-fade-in bg-eidos-elevated/30">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              ['Strategy',   entry.strategy.swStrategy],
              ['Cache',      entry.strategy.cacheName],
              ['Cached at',  cachedStr],
              ['offline',    entry.config.offline ? 'yes' : 'no'],
            ].map(([l, v]) => (
              <div key={l} className="bg-eidos-elevated rounded-lg px-3 py-2">
                <p className="text-[9px] font-mono text-eidos-muted uppercase tracking-widest">{l}</p>
                <p className="text-xs font-mono text-eidos-text mt-0.5 truncate">{v}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-eidos-text-dim leading-relaxed">{entry.strategy.reasoning}</p>

          <div className="space-y-1.5">
            {entry.strategy.behavior.map((step, i) => (
              <div key={i} className="flex gap-2 text-xs text-eidos-muted">
                <span className="font-mono text-eidos-accent shrink-0">{i + 1}.</span>
                <span>{step}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <button className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-eidos-border text-eidos-muted hover:text-eidos-text hover:border-eidos-accent transition-all">
              <RefreshCw size={11} /> Refetch
            </button>
            <button className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-eidos-red/30 text-eidos-red/60 hover:text-eidos-red hover:border-eidos-red transition-all">
              <Trash2 size={11} /> Clear Cache
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
