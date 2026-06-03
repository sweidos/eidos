import { useState } from 'react'
import { ListOrdered, RefreshCw, Inbox, Clock, CheckCircle, XCircle, Loader } from 'lucide-react'
import { useEidosStore, replayQueue } from 'eidos'
import { Card, CardHeader } from '../components/Card'
import { StatusBadge } from '../components/StatusBadge'
import { CodeBlock } from '../components/CodeBlock'
import type { ActionQueueItem } from 'eidos'

export function Actions() {
  const queue    = useEidosStore((s) => s.queue)
  const isOnline = useEidosStore((s) => s.isOnline)
  const [replaying, setReplaying] = useState(false)

  const pending   = queue.filter((q) => q.status === 'pending')
  const active    = queue.filter((q) => q.status === 'replaying')
  const completed = queue.filter((q) => q.status === 'succeeded' || q.status === 'failed')

  async function handleReplay() {
    setReplaying(true)
    await replayQueue()
    setReplaying(false)
  }

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-eidos-text">Action Queue</h2>
          <p className="text-sm text-eidos-muted mt-1">
            Actions declared with{' '}
            <code className="font-mono text-eidos-accent text-xs">reliability: "neverLose"</code>{' '}
            persist to IndexedDB when offline and replay automatically on reconnect.
          </p>
        </div>
        {pending.length > 0 && isOnline && (
          <button
            onClick={handleReplay}
            disabled={replaying}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-eidos-green-dim border border-eidos-green/30 text-eidos-green text-sm font-medium hover:bg-eidos-green/20 transition-all disabled:opacity-50"
          >
            <RefreshCw size={13} className={replaying ? 'animate-spin' : ''} />
            Replay {pending.length} pending
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <QueueStat icon={Clock}       label="Pending"   count={pending.length}   color="text-eidos-accent" />
        <QueueStat icon={Loader}      label="Replaying" count={active.length}    color="text-eidos-amber"  />
        <QueueStat icon={CheckCircle} label="Completed" count={completed.length} color="text-eidos-green"  />
      </div>

      {/* Queue */}
      {queue.length === 0 ? (
        <EmptyQueue />
      ) : (
        <div className="space-y-2">
          {[...active, ...pending, ...completed].map((item) => (
            <QueueItem key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* How it works */}
      <Card>
        <CardHeader
          title="How reliable actions work"
          description="The full lifecycle from offline submission to replay."
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          {[
            {
              step: '1',
              title: 'Offline call',
              desc: 'createOrder() detects isOnline = false and serialises the function arguments.',
            },
            {
              step: '2',
              title: 'IndexedDB persist',
              desc: 'Args are written to IndexedDB under the action\'s ID. Survives page reload.',
            },
            {
              step: '3',
              title: 'Auto-replay',
              desc: 'On reconnect, Eidos reads the queue and calls the original function with the stored args.',
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="relative pl-6">
              <div className="absolute left-0 top-0 w-5 h-5 rounded-full bg-eidos-accent flex items-center justify-center text-[10px] text-white font-bold shrink-0">
                {step}
              </div>
              <p className="text-sm font-semibold text-eidos-text mb-1">{title}</p>
              <p className="text-xs text-eidos-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <CodeBlock
          code={`import { action } from 'eidos'

const createOrder = action(
  async (payload: OrderPayload) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return res.json()
  },
  {
    reliability: 'neverLose',
    name: 'createOrder',  // shown in devtools
  },
)

// Calling createOrder() offline returns:
// { queued: true, id: 'abc-123', message: '...' }
//
// On reconnect, Eidos calls the original function
// with the persisted args — your code is unchanged.`}
          title="action-declaration.ts"
        />
      </Card>
    </div>
  )
}

function QueueStat({
  icon: Icon,
  label,
  count,
  color,
}: {
  icon: React.ElementType
  label: string
  count: number
  color: string
}) {
  return (
    <div className="p-4 rounded-xl border border-eidos-border bg-eidos-surface">
      <div className={`flex items-center gap-2 mb-2 ${color}`}>
        <Icon size={14} />
        <span className="text-xs font-mono">{label}</span>
      </div>
      <p className="text-2xl font-bold text-eidos-text">{count}</p>
    </div>
  )
}

function QueueItem({ item }: { item: ActionQueueItem }) {
  const queuedAt = new Date(item.queuedAt).toLocaleTimeString()
  const completedAt = item.completedAt
    ? new Date(item.completedAt).toLocaleTimeString()
    : null

  const StatusIcon =
    item.status === 'replaying'  ? Loader :
    item.status === 'succeeded'  ? CheckCircle :
    item.status === 'failed'     ? XCircle :
    Clock

  return (
    <div className={`
      flex items-start gap-3 p-4 rounded-xl border transition-all animate-slide-up
      ${item.status === 'replaying' ? 'border-eidos-amber/30 bg-eidos-amber-dim' :
        item.status === 'succeeded' ? 'border-eidos-green/20 bg-eidos-green-dim' :
        item.status === 'failed'    ? 'border-eidos-red/20  bg-eidos-red-dim' :
        'border-eidos-border bg-eidos-surface'}
    `}>
      <StatusIcon
        size={16}
        className={`shrink-0 mt-0.5 ${
          item.status === 'replaying' ? 'text-eidos-amber animate-spin' :
          item.status === 'succeeded' ? 'text-eidos-green' :
          item.status === 'failed'    ? 'text-eidos-red' :
          'text-eidos-muted'
        }`}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-mono font-semibold text-eidos-text">{item.actionName}</span>
          <StatusBadge status={item.status} />
        </div>

        <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-eidos-muted flex-wrap">
          <span>id: {item.id}</span>
          <span>queued: {queuedAt}</span>
          {completedAt && <span>completed: {completedAt}</span>}
          <span>retries: {item.retryCount}/{item.maxRetries}</span>
        </div>

        {item.error && (
          <p className="text-xs text-eidos-red mt-1.5 font-mono">{item.error}</p>
        )}

        <div className="mt-2 text-[10px] font-mono text-eidos-muted">
          args:{' '}
          <code className="text-eidos-text-dim">
            {JSON.stringify(item.args).slice(0, 80)}
            {JSON.stringify(item.args).length > 80 ? '…' : ''}
          </code>
        </div>
      </div>
    </div>
  )
}

function EmptyQueue() {
  return (
    <Card>
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Inbox size={32} className="text-eidos-border" />
        <p className="text-sm font-semibold text-eidos-text">Queue is empty</p>
        <p className="text-xs text-eidos-muted text-center max-w-sm leading-relaxed">
          Go to Overview, click "Simulate Offline" in the header, then submit an order.
          It will appear here and persist to IndexedDB.
        </p>
      </div>
    </Card>
  )
}
