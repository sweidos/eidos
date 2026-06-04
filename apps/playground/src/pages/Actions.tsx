import { useState } from 'react'
import { useEidosStore, replayQueue } from '@eidos/core'
import type { ActionQueueItem } from '@eidos/core'

export function Actions() {
  const queue    = useEidosStore(s => s.queue)
  const isOnline = useEidosStore(s => s.isOnline)
  const [busy, setBusy] = useState(false)

  const pending   = queue.filter(q => q.status === 'pending')
  const active    = queue.filter(q => q.status === 'replaying')
  const done      = queue.filter(q => q.status === 'succeeded' || q.status === 'failed')

  async function replay() {
    setBusy(true)
    await replayQueue()
    setBusy(false)
  }

  return (
    <div className="max-w-4xl mx-auto p-5 animate-fade-in">
      <div className="flex items-start justify-between mb-5 border-b border-eidos-border pb-4">
        <div>
          <h2 className="text-base font-bold text-eidos-text mb-1">action queue</h2>
          <p className="text-xs text-eidos-muted">
            Actions with <code className="text-eidos-amber">reliability: 'neverLose'</code> persist
            to IndexedDB when offline and replay automatically on reconnect.
          </p>
        </div>
        {pending.length > 0 && isOnline && (
          <button
            onClick={replay}
            disabled={busy}
            className="flex items-center gap-2 px-3 py-2 bg-eidos-accent text-eidos-bg text-xs font-bold hover:bg-green-400 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
          >
            {busy ? '...' : `↺ replay ${pending.length}`}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'pending',   count: pending.length, color: 'text-eidos-amber' },
          { label: 'replaying', count: active.length,  color: 'text-eidos-blue'  },
          { label: 'done',      count: done.length,    color: 'text-eidos-accent' },
        ].map(({ label, count, color }) => (
          <div key={label} className="border border-eidos-border px-4 py-3">
            <div className="text-2xs text-eidos-muted uppercase tracking-widest mb-1">{label}</div>
            <div className={`text-2xl font-bold font-tabular ${color}`}>{count}</div>
          </div>
        ))}
      </div>

      {/* Queue items */}
      {queue.length === 0 ? (
        <div className="border border-eidos-border p-8 text-center">
          <p className="text-sm text-eidos-text mb-1">queue is empty</p>
          <p className="text-xs text-eidos-muted">
            go to demo → simulate offline → submit an order
          </p>
        </div>
      ) : (
        <div className="border border-eidos-border divide-y divide-eidos-border">
          {[...active, ...pending, ...done].map(item => (
            <QueueItem key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* How it works */}
      <div className="mt-5 border border-eidos-border bg-eidos-surface p-4">
        <div className="text-2xs text-eidos-muted mb-2">lifecycle</div>
        <pre className="text-2xs text-eidos-text-dim leading-relaxed overflow-x-auto">{`// 1. Declare at module scope
const createOrder = action(fn, { reliability: 'neverLose', name: 'createOrder' })

// 2. Call normally — offline detection is automatic
const result = await createOrder(payload)
if ('queued' in result) {
  // { queued: true, id: '...', message: '...' }
  // → args persisted to IndexedDB
}

// 3. On reconnect — Zustand store subscription fires replayQueue()
//    automatically (600ms debounce). Covers real reconnects AND
//    setOfflineSimulation(false).

// 4. Status transitions
'pending' → 'replaying' → 'succeeded'  // removed from IDB after 3s
                        → 'failed'     // maxRetries exceeded`}</pre>
      </div>
    </div>
  )
}

function QueueItem({ item }: { item: ActionQueueItem }) {
  const statusColor = {
    replaying: 'text-eidos-blue',
    succeeded: 'text-eidos-accent',
    failed:    'text-eidos-red',
    pending:   'text-eidos-amber',
  }[item.status] ?? 'text-eidos-muted'

  const borderColor = {
    replaying: 'border-l-eidos-blue',
    succeeded: 'border-l-eidos-accent',
    failed:    'border-l-eidos-red',
    pending:   'border-l-eidos-amber',
  }[item.status] ?? ''

  return (
    <div className={`px-4 py-3 text-xs border-l-2 ${borderColor}`}>
      <div className="flex items-center gap-3 mb-1.5">
        <span className="text-eidos-text font-bold">{item.actionName}</span>
        <span className={`text-2xs border px-1.5 py-0.5 ${statusColor} border-current/30`}>{item.status}</span>
      </div>
      <div className="flex flex-wrap gap-4 text-2xs text-eidos-muted font-tabular">
        <span>id: {item.id}</span>
        <span>queued: {new Date(item.queuedAt).toLocaleTimeString('en', { hour12: false })}</span>
        {item.completedAt && <span>done: {new Date(item.completedAt).toLocaleTimeString('en', { hour12: false })}</span>}
        <span>retries: {item.retryCount}/{item.maxRetries}</span>
      </div>
      {item.error && <p className="text-2xs text-eidos-red mt-1">{item.error}</p>}
      <p className="text-2xs text-eidos-muted mt-1 truncate">
        args: <code className="text-eidos-text-dim">{JSON.stringify(item.args).slice(0, 100)}</code>
      </p>
    </div>
  )
}
