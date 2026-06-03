import { useState } from 'react'
import { Database, RefreshCw, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { useEidosStore } from '@adityaraj/eidos'
import { Card, CardHeader } from '../components/Card'
import { StatusBadge } from '../components/StatusBadge'
import { CodeBlock } from '../components/CodeBlock'
import type { ResourceEntry } from '@adityaraj/eidos'

export function Resources() {
  const resources = useEidosStore((s) => s.resources)
  const entries   = Object.values(resources)

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-eidos-text">Resources</h2>
        <p className="text-sm text-eidos-muted mt-1">
          Every resource registered with{' '}
          <code className="font-mono text-eidos-accent text-xs">resource()</code>{' '}
          appears here with its generated caching strategy and live status.
        </p>
      </div>

      {entries.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <ResourceRow key={entry.url} entry={entry} />
          ))}
        </div>
      )}

      <Card>
        <CardHeader title="How resources are registered" />
        <CodeBlock
          code={`import { resource } from '@adityaraj/eidos'

// Call at module scope — registration is idempotent.
// The runtime sends EIDOS_REGISTER_RESOURCE to the SW,
// which adds a fetch-intercept rule for this pathname.
const products = resource('/api/products', {
  offline: true, // → StaleWhileRevalidate
})

// Use the returned handle anywhere:
const data = await products.json()           // fetch + cache
const { queryKey, queryFn } = products.query() // TanStack Query

// Inspect what strategy was generated:
console.log(products.strategy.name)         // "StaleWhileRevalidate"
console.log(products.strategy.reasoning)    // one-line rationale`}
          title="registration.ts"
        />
      </Card>
    </div>
  )
}

function ResourceRow({ entry }: { entry: ResourceEntry }) {
  const [expanded, setExpanded] = useState(false)

  const cachedAtStr = entry.cachedAt
    ? new Date(entry.cachedAt).toLocaleTimeString()
    : '—'

  return (
    <div className="rounded-xl border border-eidos-border bg-eidos-surface overflow-hidden">
      {/* Summary row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-eidos-elevated transition-colors text-left"
      >
        <Database size={14} className="text-eidos-accent shrink-0" />

        <span className="font-mono text-sm text-eidos-text font-medium flex-1">
          {entry.url}
        </span>

        <span className="text-[10px] font-mono text-eidos-muted bg-eidos-elevated px-2 py-0.5 rounded border border-eidos-border">
          {entry.strategy.name}
        </span>

        <StatusBadge status={entry.status} />

        <div className="flex items-center gap-3 ml-2 text-xs font-mono text-eidos-muted">
          <span title="Cache hits">
            <span className="text-eidos-green">{entry.cacheHits}</span> hits
          </span>
          <span title="Cache misses">
            <span className="text-eidos-red">{entry.cacheMisses}</span> misses
          </span>
        </div>

        {expanded ? (
          <ChevronDown size={14} className="text-eidos-muted shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-eidos-muted shrink-0" />
        )}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-eidos-border px-4 pb-4 pt-3 space-y-4 animate-fade-in">
          {/* Meta row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetaItem label="Strategy"   value={entry.strategy.swStrategy} />
            <MetaItem label="Cache Name" value={entry.strategy.cacheName} />
            <MetaItem label="Cached At"  value={cachedAtStr} />
            <MetaItem label="Offline"    value={entry.config.offline ? 'yes' : 'no'} />
          </div>

          {/* Reasoning */}
          <div>
            <p className="text-[10px] font-mono text-eidos-muted uppercase tracking-widest mb-1">
              Why this strategy was chosen
            </p>
            <p className="text-xs text-eidos-text-dim leading-relaxed">
              {entry.strategy.reasoning}
            </p>
          </div>

          {/* Behavior steps */}
          <div>
            <p className="text-[10px] font-mono text-eidos-muted uppercase tracking-widest mb-2">
              Runtime behavior
            </p>
            <div className="space-y-1.5">
              {entry.strategy.behavior.map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-eidos-text-dim">
                  <span className="font-mono text-eidos-accent shrink-0 mt-0.5">{i + 1}.</span>
                  {step}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-eidos-border text-eidos-muted hover:text-eidos-text hover:border-eidos-accent transition-all"
            >
              <RefreshCw size={11} /> Refetch
            </button>
            <button
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-eidos-red/30 text-eidos-red/70 hover:text-eidos-red hover:border-eidos-red transition-all"
            >
              <Trash2 size={11} /> Clear Cache
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-eidos-elevated rounded-lg px-3 py-2">
      <p className="text-[10px] font-mono text-eidos-muted uppercase tracking-widest">{label}</p>
      <p className="text-xs font-mono text-eidos-text mt-0.5 truncate">{value}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <Card>
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Database size={32} className="text-eidos-border" />
        <p className="text-sm font-semibold text-eidos-text">No resources registered</p>
        <p className="text-xs text-eidos-muted text-center max-w-sm leading-relaxed">
          Call{' '}
          <code className="font-mono text-eidos-accent">resource('/api/products', {'{ offline: true }'})</code>{' '}
          at module scope to register a resource. It will appear here instantly.
        </p>
      </div>
    </Card>
  )
}
