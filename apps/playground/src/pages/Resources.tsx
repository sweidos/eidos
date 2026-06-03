import { useState } from 'react'
import { Database, RefreshCw, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { useVardiStore } from 'vardi'
import { Card, CardHeader } from '../components/Card'
import { StatusBadge } from '../components/StatusBadge'
import { CodeBlock } from '../components/CodeBlock'
import type { ResourceEntry } from 'vardi'

export function Resources() {
  const resources = useVardiStore((s) => s.resources)
  const entries   = Object.values(resources)

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-vardi-text">Resources</h2>
        <p className="text-sm text-vardi-muted mt-1">
          Every resource registered with{' '}
          <code className="font-mono text-vardi-accent text-xs">resource()</code>{' '}
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
          code={`import { resource } from 'vardi'

// Call at module scope — registration is idempotent.
// The runtime sends VARDI_REGISTER_RESOURCE to the SW,
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
    <div className="rounded-xl border border-vardi-border bg-vardi-surface overflow-hidden">
      {/* Summary row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-vardi-elevated transition-colors text-left"
      >
        <Database size={14} className="text-vardi-accent shrink-0" />

        <span className="font-mono text-sm text-vardi-text font-medium flex-1">
          {entry.url}
        </span>

        <span className="text-[10px] font-mono text-vardi-muted bg-vardi-elevated px-2 py-0.5 rounded border border-vardi-border">
          {entry.strategy.name}
        </span>

        <StatusBadge status={entry.status} />

        <div className="flex items-center gap-3 ml-2 text-xs font-mono text-vardi-muted">
          <span title="Cache hits">
            <span className="text-vardi-green">{entry.cacheHits}</span> hits
          </span>
          <span title="Cache misses">
            <span className="text-vardi-red">{entry.cacheMisses}</span> misses
          </span>
        </div>

        {expanded ? (
          <ChevronDown size={14} className="text-vardi-muted shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-vardi-muted shrink-0" />
        )}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-vardi-border px-4 pb-4 pt-3 space-y-4 animate-fade-in">
          {/* Meta row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetaItem label="Strategy"   value={entry.strategy.swStrategy} />
            <MetaItem label="Cache Name" value={entry.strategy.cacheName} />
            <MetaItem label="Cached At"  value={cachedAtStr} />
            <MetaItem label="Offline"    value={entry.config.offline ? 'yes' : 'no'} />
          </div>

          {/* Reasoning */}
          <div>
            <p className="text-[10px] font-mono text-vardi-muted uppercase tracking-widest mb-1">
              Why this strategy was chosen
            </p>
            <p className="text-xs text-vardi-text-dim leading-relaxed">
              {entry.strategy.reasoning}
            </p>
          </div>

          {/* Behavior steps */}
          <div>
            <p className="text-[10px] font-mono text-vardi-muted uppercase tracking-widest mb-2">
              Runtime behavior
            </p>
            <div className="space-y-1.5">
              {entry.strategy.behavior.map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-vardi-text-dim">
                  <span className="font-mono text-vardi-accent shrink-0 mt-0.5">{i + 1}.</span>
                  {step}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-vardi-border text-vardi-muted hover:text-vardi-text hover:border-vardi-accent transition-all"
            >
              <RefreshCw size={11} /> Refetch
            </button>
            <button
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-vardi-red/30 text-vardi-red/70 hover:text-vardi-red hover:border-vardi-red transition-all"
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
    <div className="bg-vardi-elevated rounded-lg px-3 py-2">
      <p className="text-[10px] font-mono text-vardi-muted uppercase tracking-widest">{label}</p>
      <p className="text-xs font-mono text-vardi-text mt-0.5 truncate">{value}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <Card>
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Database size={32} className="text-vardi-border" />
        <p className="text-sm font-semibold text-vardi-text">No resources registered</p>
        <p className="text-xs text-vardi-muted text-center max-w-sm leading-relaxed">
          Call{' '}
          <code className="font-mono text-vardi-accent">resource('/api/products', {'{ offline: true }'})</code>{' '}
          at module scope to register a resource. It will appear here instantly.
        </p>
      </div>
    </Card>
  )
}
