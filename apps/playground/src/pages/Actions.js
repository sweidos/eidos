import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { RefreshCw, Inbox, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import { useEidosStore, replayQueue } from '@eidos/core';
import { Card, CardHeader } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { CodeBlock } from '../components/CodeBlock';
export function Actions() {
    const queue = useEidosStore((s) => s.queue);
    const isOnline = useEidosStore((s) => s.isOnline);
    const [replaying, setReplaying] = useState(false);
    const pending = queue.filter((q) => q.status === 'pending');
    const active = queue.filter((q) => q.status === 'replaying');
    const completed = queue.filter((q) => q.status === 'succeeded' || q.status === 'failed');
    async function handleReplay() {
        setReplaying(true);
        await replayQueue();
        setReplaying(false);
    }
    return (_jsxs("div", { className: "max-w-4xl space-y-6 animate-fade-in", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-bold text-eidos-text", children: "Action Queue" }), _jsxs("p", { className: "text-sm text-eidos-muted mt-1", children: ["Actions declared with", ' ', _jsx("code", { className: "font-mono text-eidos-accent text-xs", children: "reliability: \"neverLose\"" }), ' ', "persist to IndexedDB when offline and replay automatically on reconnect."] })] }), pending.length > 0 && isOnline && (_jsxs("button", { onClick: handleReplay, disabled: replaying, className: "flex items-center gap-2 px-4 py-2 rounded-lg bg-eidos-green-dim border border-eidos-green/30 text-eidos-green text-sm font-medium hover:bg-eidos-green/20 transition-all disabled:opacity-50", children: [_jsx(RefreshCw, { size: 13, className: replaying ? 'animate-spin' : '' }), "Replay ", pending.length, " pending"] }))] }), _jsxs("div", { className: "grid grid-cols-3 gap-3", children: [_jsx(QueueStat, { icon: Clock, label: "Pending", count: pending.length, color: "text-eidos-accent" }), _jsx(QueueStat, { icon: Loader, label: "Replaying", count: active.length, color: "text-eidos-amber" }), _jsx(QueueStat, { icon: CheckCircle, label: "Completed", count: completed.length, color: "text-eidos-green" })] }), queue.length === 0 ? (_jsx(EmptyQueue, {})) : (_jsx("div", { className: "space-y-2", children: [...active, ...pending, ...completed].map((item) => (_jsx(QueueItem, { item: item }, item.id))) })), _jsxs(Card, { children: [_jsx(CardHeader, { title: "How reliable actions work", description: "The full lifecycle from offline submission to replay." }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5", children: [
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
                        ].map(({ step, title, desc }) => (_jsxs("div", { className: "relative pl-6", children: [_jsx("div", { className: "absolute left-0 top-0 w-5 h-5 rounded-full bg-eidos-accent flex items-center justify-center text-[10px] text-white font-bold shrink-0", children: step }), _jsx("p", { className: "text-sm font-semibold text-eidos-text mb-1", children: title }), _jsx("p", { className: "text-xs text-eidos-muted leading-relaxed", children: desc })] }, step))) }), _jsx(CodeBlock, { code: `import { action } from '@eidos/core'

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
// with the persisted args — your code is unchanged.`, title: "action-declaration.ts" })] })] }));
}
function QueueStat({ icon: Icon, label, count, color, }) {
    return (_jsxs("div", { className: "p-4 rounded-xl border border-eidos-border bg-eidos-surface", children: [_jsxs("div", { className: `flex items-center gap-2 mb-2 ${color}`, children: [_jsx(Icon, { size: 14 }), _jsx("span", { className: "text-xs font-mono", children: label })] }), _jsx("p", { className: "text-2xl font-bold text-eidos-text", children: count })] }));
}
function QueueItem({ item }) {
    const queuedAt = new Date(item.queuedAt).toLocaleTimeString();
    const completedAt = item.completedAt
        ? new Date(item.completedAt).toLocaleTimeString()
        : null;
    const StatusIcon = item.status === 'replaying' ? Loader :
        item.status === 'succeeded' ? CheckCircle :
            item.status === 'failed' ? XCircle :
                Clock;
    return (_jsxs("div", { className: `
      flex items-start gap-3 p-4 rounded-xl border transition-all animate-slide-up
      ${item.status === 'replaying' ? 'border-eidos-amber/30 bg-eidos-amber-dim' :
            item.status === 'succeeded' ? 'border-eidos-green/20 bg-eidos-green-dim' :
                item.status === 'failed' ? 'border-eidos-red/20  bg-eidos-red-dim' :
                    'border-eidos-border bg-eidos-surface'}
    `, children: [_jsx(StatusIcon, { size: 16, className: `shrink-0 mt-0.5 ${item.status === 'replaying' ? 'text-eidos-amber animate-spin' :
                    item.status === 'succeeded' ? 'text-eidos-green' :
                        item.status === 'failed' ? 'text-eidos-red' :
                            'text-eidos-muted'}` }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsx("span", { className: "text-sm font-mono font-semibold text-eidos-text", children: item.actionName }), _jsx(StatusBadge, { status: item.status })] }), _jsxs("div", { className: "flex items-center gap-3 mt-1 text-[10px] font-mono text-eidos-muted flex-wrap", children: [_jsxs("span", { children: ["id: ", item.id] }), _jsxs("span", { children: ["queued: ", queuedAt] }), completedAt && _jsxs("span", { children: ["completed: ", completedAt] }), _jsxs("span", { children: ["retries: ", item.retryCount, "/", item.maxRetries] })] }), item.error && (_jsx("p", { className: "text-xs text-eidos-red mt-1.5 font-mono", children: item.error })), _jsxs("div", { className: "mt-2 text-[10px] font-mono text-eidos-muted", children: ["args:", ' ', _jsxs("code", { className: "text-eidos-text-dim", children: [JSON.stringify(item.args).slice(0, 80), JSON.stringify(item.args).length > 80 ? '…' : ''] })] })] })] }));
}
function EmptyQueue() {
    return (_jsx(Card, { children: _jsxs("div", { className: "flex flex-col items-center justify-center py-12 gap-3", children: [_jsx(Inbox, { size: 32, className: "text-eidos-border" }), _jsx("p", { className: "text-sm font-semibold text-eidos-text", children: "Queue is empty" }), _jsx("p", { className: "text-xs text-eidos-muted text-center max-w-sm leading-relaxed", children: "Go to Overview, click \"Simulate Offline\" in the header, then submit an order. It will appear here and persist to IndexedDB." })] }) }));
}
