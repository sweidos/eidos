import { useState } from 'react'
import { Clock, CheckCircle, XCircle, Loader, Inbox, RefreshCw } from 'lucide-react'
import { useEidosStore, replayQueue } from '@eidos/core'
import type { ActionQueueItem } from '@eidos/core'

export function Actions() {
  const queue    = useEidosStore(s => s.queue)
  const isOnline = useEidosStore(s => s.isOnline)
  const [busy, setBusy] = useState(false)

  const pending   = queue.filter(q => q.status === 'pending')
  const active    = queue.filter(q => q.status === 'replaying')
  const completed = queue.filter(q => q.status === 'succeeded' || q.status === 'failed')

  async function replay() {
    setBusy(true)
    await replayQueue()
    setBusy(false)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-eidos-text mb-1">Action Queue</h2>
          <p className="text-sm text-eidos-muted">
            Actions declared with{' '}
            <code className="font-mono text-eidos-amber text-xs">reliability: "neverLose"</code>{' '}
            persist to IndexedDB when offline and replay automatically on reconnect.
          </p>
        </div>
        {pending.length > 0 && isOnline && (
          <button
            onClick={replay}
            disabled={busy}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-eidos-green-dim border border-eidos-green/30 text-eidos-green text-sm font-medium hover:bg-eidos-green/15 transition-all disabled:opacity-50"
          >
            <RefreshCw size={13} className={busy ? 'animate-spin' : ''} />
            Replay {pending.length}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending',   count: pending.length,   icon: Clock,        color: 'text-eidos-amber' },
          { label: 'Replaying', count: active.length,    icon: Loader,       color: 'text-eidos-accent' },
          { label: 'Done',      count: completed.length, icon: CheckCircle,  color: 'text-eidos-green' },
        ].map(({ label, count, icon: Icon, color }) => (
          <div key={label} className="p-4 rounded-xl border border-eidos-border bg-eidos-surface">
            <div className={`flex items-center gap-2 mb-2 ${color}`}>
              <Icon size={13} />
              <span className="text-xs font-mono">{label}</span>
            </div>
            <p className="text-2xl font-semibold text-eidos-text font-tabular">{count}</p>
          </div>
        ))}
      </div>

      {/* Queue items */}
      {queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-eidos-border rounded-xl bg-eidos-surface gap-3">
          <Inbox size={28} className="text-eidos-border" />
          <p className="text-sm text-eidos-text">Queue is empty</p>
          <p className="text-xs text-eidos-muted text-center max-w-xs">
            Go to Demo → click "Simulate Offline" → submit an order.
            It will appear here and persist across page reloads.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {[...active, ...pending, ...completed].map(item => (
            <QueueItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

function QueueItem({ item }: { item: ActionQueueItem }) {
  const Icon =
    item.status === 'replaying'  ? Loader :
    item.status === 'succeeded'  ? CheckCircle :
    item.status === 'failed'     ? XCircle : Clock

  const row = {
    replaying: 'border-eidos-accent/20 bg-eidos-accent-dim',
    succeeded: 'border-eidos-green/20 bg-eidos-green-dim',
    failed:    'border-eidos-red/20 bg-eidos-red-dim',
    pending:   'border-eidos-border bg-eidos-surface',
  }[item.status] ?? 'border-eidos-border bg-eidos-surface'

  const iconColor = {
    replaying: 'text-eidos-accent animate-spin',
    succeeded: 'text-eidos-green',
    failed:    'text-eidos-red',
    pending:   'text-eidos-muted',
  }[item.status] ?? 'text-eidos-muted'

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border transition-all animate-slide-up ${row}`}>
      <Icon size={15} className={`shrink-0 mt-0.5 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-mono font-semibold text-eidos-text">{item.actionName}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-eidos-border bg-eidos-elevated text-eidos-muted">{item.status}</span>
        </div>
        <div className="flex gap-3 mt-1 text-[10px] font-mono text-eidos-muted flex-wrap">
          <span>id: {item.id}</span>
          <span>queued: {new Date(item.queuedAt).toLocaleTimeString('en', {hour12:false})}</span>
          {item.completedAt && <span>done: {new Date(item.completedAt).toLocaleTimeString('en', {hour12:false})}</span>}
          <span>retries: {item.retryCount}/{item.maxRetries}</span>
        </div>
        {item.error && <p className="text-xs text-eidos-red mt-1.5 font-mono">{item.error}</p>}
        <p className="mt-1.5 text-[10px] font-mono text-eidos-muted">
          args: <code className="text-eidos-text-dim">{JSON.stringify(item.args).slice(0, 100)}</code>
        </p>
      </div>
    </div>
  )
}
