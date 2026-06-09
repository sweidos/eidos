import { useState, useEffect } from 'react'
import { useEidosQueue, useEidosStatus, replayQueue, isBgSyncSupported } from '@sweidos/eidos'
import type { ActionQueueItem } from '@sweidos/eidos'

export function Actions() {
  const queue              = useEidosQueue()
  const { isOnline }       = useEidosStatus()
  const [busy, setBusy]    = useState(false)
  const [bgSyncFlash, setBgSyncFlash] = useState(false)
  const bgSync             = isBgSyncSupported()

  const pending   = queue.filter(q => q.status === 'pending')
  const active    = queue.filter(q => q.status === 'replaying')
  const done      = queue.filter(q => q.status === 'succeeded' || q.status === 'failed')

  // Flash indicator when browser-triggered sync fires
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.data?.type === 'EIDOS_BACKGROUND_SYNC') {
        setBgSyncFlash(true)
        setTimeout(() => setBgSyncFlash(false), 2000)
      }
    }
    navigator.serviceWorker?.addEventListener('message', onMsg)
    return () => navigator.serviceWorker?.removeEventListener('message', onMsg)
  }, [])

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
          {/* Background Sync badge */}
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`inline-flex items-center gap-1.5 text-2xs px-2 py-0.5 border transition-colors duration-300 ${
                bgSyncFlash
                  ? 'border-eidos-accent text-eidos-accent bg-eidos-accent/10'
                  : bgSync
                  ? 'border-eidos-accent/40 text-eidos-accent'
                  : 'border-eidos-border text-eidos-muted'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${bgSync ? 'bg-eidos-accent' : 'bg-eidos-muted'}`} />
              {bgSyncFlash ? 'background sync fired' : bgSync ? 'background sync supported' : 'background sync unsupported'}
            </span>
          </div>
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
            go to overview → simulate offline → submit an order
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
  // → Background Sync tag registered (Chrome/Edge/Safari 16+)
}

// 3. Replay paths — whichever fires first:
//    a) store subscription → replayQueue() (600ms debounce on reconnect)
//    b) Background Sync API → SW fires 'eidos-queue-replay' tag →
//       notifies open clients → replayQueue() (200ms debounce)
//    Path (b) works even if the user briefly navigated away and back.

// 4. Status transitions
'pending' → 'replaying' → 'succeeded'  // removed from IDB after 3s
                        → 'failed'     // maxRetries exceeded

// 5. Exponential backoff between retries
//    delay = min(2s × 2^retryCount, 5min) ± 20% jitter
//    Items with nextRetryAt in the future are skipped on each replay pass.`}</pre>
      </div>
    </div>
  )
}

function RetryCountdown({ nextRetryAt }: { nextRetryAt: number }) {
  const [secs, setSecs] = useState(Math.max(0, Math.ceil((nextRetryAt - Date.now()) / 1000)))

  useEffect(() => {
    if (secs <= 0) return
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((nextRetryAt - Date.now()) / 1000))
      setSecs(remaining)
      if (remaining === 0) clearInterval(id)
    }, 500)
    return () => clearInterval(id)
  }, [nextRetryAt, secs])

  if (secs <= 0) return null
  return <span className="text-eidos-blue">retry in {secs}s</span>
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
        {item.status === 'pending' && item.nextRetryAt && <RetryCountdown nextRetryAt={item.nextRetryAt} />}
      </div>
      {item.error && <p className="text-2xs text-eidos-red mt-1">{item.error}</p>}
      <p className="text-2xs text-eidos-muted mt-1 truncate">
        args: <code className="text-eidos-text-dim">{JSON.stringify(item.args).slice(0, 100)}</code>
      </p>
    </div>
  )
}
