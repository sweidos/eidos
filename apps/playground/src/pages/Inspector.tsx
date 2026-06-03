import { useState } from 'react'
import { Search, ArrowDown, Code2, Layers, Zap } from 'lucide-react'
import { useEidosStore } from 'eidos'
import { Card, CardHeader } from '../components/Card'
import { CodeBlock } from '../components/CodeBlock'
import { StatusBadge } from '../components/StatusBadge'
import type { ResourceEntry, GeneratedStrategy } from 'eidos'

const SAMPLE_RESOURCE: ResourceEntry = {
  url: '/api/products',
  config: { offline: true },
  strategy: {
    name: 'StaleWhileRevalidate',
    swStrategy: 'stale-while-revalidate',
    cacheName: 'eidos-resources-v1',
    reasoning:
      'offline: true signals resilience. SWR returns cached data instantly while revalidating in the background — the best tradeoff between speed and freshness for offline-capable resources.',
    behavior: [
      'Cache hit → return immediately, kick off background revalidation',
      'Cache miss → fetch from network, cache the response, return it',
      'Offline → return cached version if available, 503 if not',
      'Reconnect → next request triggers a background refresh',
    ],
    equivalentCode: `// Workbox equivalent\nnew StaleWhileRevalidate({\n  cacheName: 'eidos-resources-v1',\n  plugins: [new ExpirationPlugin({ maxEntries: 60 })],\n})`,
  },
  status: 'fresh',
  cacheHits: 0,
  cacheMisses: 0,
}

export function Inspector() {
  const resources    = useEidosStore((s) => s.resources)
  const liveEntries  = Object.values(resources)
  const [selected, setSelected] = useState<ResourceEntry>(
    liveEntries[0] ?? SAMPLE_RESOURCE,
  )

  const allEntries = liveEntries.length > 0 ? liveEntries : [SAMPLE_RESOURCE]

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-eidos-text">Intent Inspector</h2>
        <p className="text-sm text-eidos-muted mt-1">
          Trace the path from a high-level intent declaration to the concrete
          runtime strategy Eidos generates for it.
        </p>
      </div>

      {/* Resource picker */}
      <div className="flex items-center gap-2 flex-wrap">
        <Search size={14} className="text-eidos-muted" />
        <span className="text-xs text-eidos-muted">Inspect:</span>
        {allEntries.map((entry) => (
          <button
            key={entry.url}
            onClick={() => setSelected(entry)}
            className={`
              text-xs font-mono px-3 py-1.5 rounded-lg border transition-all
              ${selected.url === entry.url
                ? 'bg-eidos-accent-dim border-eidos-accent text-eidos-text'
                : 'border-eidos-border text-eidos-muted hover:border-eidos-accent hover:text-eidos-text'}
            `}
          >
            {entry.url}
          </button>
        ))}
      </div>

      {/* Intent → Strategy flow */}
      <IntentFlow entry={selected} />

      {/* Strategy deep-dive */}
      <StrategyDetail strategy={selected.strategy} />

      {/* Workbox comparison */}
      <Card>
        <CardHeader
          title="Equivalent Workbox config"
          description="What you'd have to write manually without Eidos."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-mono text-eidos-muted uppercase tracking-widest mb-2">
              With Eidos
            </p>
            <CodeBlock
              code={`resource('${selected.url}', {\n  offline: true,\n})`}
              className="text-xs"
            />
          </div>
          <div>
            <p className="text-[10px] font-mono text-eidos-muted uppercase tracking-widest mb-2">
              Without Eidos
            </p>
            <CodeBlock
              code={selected.strategy.equivalentCode}
              className="text-xs"
            />
          </div>
        </div>
      </Card>

      {/* Decision tree */}
      <Card>
        <CardHeader
          title="Decision tree"
          description="How Eidos selects a strategy from your config."
        />
        <DecisionTree selected={selected.strategy.swStrategy} />
      </Card>
    </div>
  )
}

// ── Intent → Strategy flow ────────────────────────────────────────────────────

function IntentFlow({ entry }: { entry: ResourceEntry }) {
  const steps = [
    {
      label: 'Intent Declaration',
      icon: Code2,
      content: (
        <CodeBlock
          code={`resource('${entry.url}', {\n  offline: ${entry.config.offline},${
            entry.config.strategy ? `\n  strategy: '${entry.config.strategy}',` : ''
          }\n})`}
        />
      ),
      note: 'What the developer writes',
    },
    {
      label: 'Strategy Resolution',
      icon: Zap,
      content: (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-eidos-elevated border border-eidos-border">
            <div className="w-2 h-2 rounded-full bg-eidos-accent" />
            <span className="text-xs font-mono text-eidos-text-dim">
              offline: true{' '}
              <span className="text-eidos-muted">→</span>{' '}
              <span className="text-eidos-accent">StaleWhileRevalidate</span>
            </span>
          </div>
          <p className="text-xs text-eidos-muted leading-relaxed px-1">
            {entry.strategy.reasoning}
          </p>
        </div>
      ),
      note: 'What the runtime decides',
    },
    {
      label: 'Generated SW Rule',
      icon: Layers,
      content: (
        <div className="p-3 rounded-lg bg-eidos-elevated border border-eidos-border font-mono text-xs space-y-1">
          <p className="text-eidos-muted">// Sent to the service worker via postMessage</p>
          <p>
            <span className="text-eidos-accent">EIDOS_REGISTER_RESOURCE</span>
          </p>
          <p className="text-eidos-text-dim pl-2">
            url: <span className="text-eidos-green">'{entry.url}'</span>
          </p>
          <p className="text-eidos-text-dim pl-2">
            strategy: <span className="text-eidos-green">'{entry.strategy.swStrategy}'</span>
          </p>
          <p className="text-eidos-text-dim pl-2">
            cacheName: <span className="text-eidos-green">'{entry.strategy.cacheName}'</span>
          </p>
        </div>
      ),
      note: 'What the SW receives',
    },
    {
      label: 'Runtime Behavior',
      icon: Zap,
      content: (
        <div className="space-y-2">
          {entry.strategy.behavior.map((step, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className="font-mono text-eidos-accent shrink-0 mt-0.5 w-4">{i + 1}.</span>
              <span className="text-eidos-text-dim leading-relaxed">{step}</span>
            </div>
          ))}
        </div>
      ),
      note: 'What happens on every request',
    },
  ]

  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const Icon = step.icon
        return (
          <div key={i}>
            <Card className="animate-slide-up">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-eidos-accent flex items-center justify-center shrink-0">
                  <span className="text-white text-[10px] font-bold">{i + 1}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Icon size={13} className="text-eidos-accent" />
                  <span className="text-sm font-semibold text-eidos-text">{step.label}</span>
                </div>
                <span className="ml-auto text-[10px] font-mono text-eidos-muted">{step.note}</span>
              </div>
              {step.content}
            </Card>
            {i < steps.length - 1 && (
              <div className="flex justify-center py-1">
                <ArrowDown size={16} className="text-eidos-border" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Strategy detail ───────────────────────────────────────────────────────────

function StrategyDetail({ strategy }: { strategy: GeneratedStrategy }) {
  return (
    <Card>
      <CardHeader
        title={strategy.name}
        description={`Generated strategy · ${strategy.cacheName}`}
        action={<StatusBadge status="fresh" />}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <p className="text-[10px] font-mono text-eidos-muted uppercase tracking-widest mb-2">
            SW Strategy
          </p>
          <code className="font-mono text-eidos-accent">{strategy.swStrategy}</code>
        </div>
        <div>
          <p className="text-[10px] font-mono text-eidos-muted uppercase tracking-widest mb-2">
            Cache Bucket
          </p>
          <code className="font-mono text-eidos-text-dim">{strategy.cacheName}</code>
        </div>
      </div>
    </Card>
  )
}

// ── Decision tree ─────────────────────────────────────────────────────────────

type Strategy = 'stale-while-revalidate' | 'cache-first' | 'network-first'

function DecisionTree({ selected }: { selected: Strategy }) {
  const nodes = [
    {
      question: 'offline: true?',
      yes: 'StaleWhileRevalidate',
      yesDesc: 'Resilience + freshness',
      no: null,
    },
    {
      question: 'strategy: "cache-first"?',
      yes: 'CacheFirst',
      yesDesc: 'Speed + offline',
      no: null,
    },
    {
      question: 'Default',
      yes: 'NetworkFirst',
      yesDesc: 'Freshness priority',
      no: null,
    },
  ]

  const strategyMap: Record<Strategy, number> = {
    'stale-while-revalidate': 0,
    'cache-first': 1,
    'network-first': 2,
  }
  const activeIdx = strategyMap[selected] ?? 2

  return (
    <div className="space-y-2">
      {nodes.map((node, i) => (
        <div
          key={i}
          className={`
            flex items-center gap-3 p-3 rounded-lg border transition-all
            ${activeIdx === i
              ? 'border-eidos-accent bg-eidos-accent-dim'
              : 'border-eidos-border bg-eidos-elevated opacity-50'}
          `}
        >
          <div className={`w-2 h-2 rounded-full shrink-0 ${activeIdx === i ? 'bg-eidos-accent' : 'bg-eidos-border'}`} />
          <span className="text-xs font-mono text-eidos-muted w-36 shrink-0">{node.question}</span>
          <ArrowDown size={12} className="text-eidos-border rotate-[-90deg] shrink-0" />
          <span className={`text-xs font-mono font-semibold ${activeIdx === i ? 'text-eidos-accent' : 'text-eidos-muted'}`}>
            {node.yes}
          </span>
          <span className="text-xs text-eidos-muted">{node.yesDesc}</span>
        </div>
      ))}
    </div>
  )
}
