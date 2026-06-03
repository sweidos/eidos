import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Search, ArrowDown, Code2, Layers, Zap } from 'lucide-react';
import { useEidosStore } from '@eidos/core';
import { Card, CardHeader } from '../components/Card';
import { CodeBlock } from '../components/CodeBlock';
import { StatusBadge } from '../components/StatusBadge';
const SAMPLE_RESOURCE = {
    url: '/api/products',
    config: { offline: true },
    strategy: {
        name: 'StaleWhileRevalidate',
        swStrategy: 'stale-while-revalidate',
        cacheName: 'eidos-resources-v1',
        reasoning: 'offline: true signals resilience. SWR returns cached data instantly while revalidating in the background — the best tradeoff between speed and freshness for offline-capable resources.',
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
};
export function Inspector() {
    const resources = useEidosStore((s) => s.resources);
    const liveEntries = Object.values(resources);
    const [selected, setSelected] = useState(liveEntries[0] ?? SAMPLE_RESOURCE);
    const allEntries = liveEntries.length > 0 ? liveEntries : [SAMPLE_RESOURCE];
    return (_jsxs("div", { className: "max-w-4xl space-y-6 animate-fade-in", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-bold text-eidos-text", children: "Intent Inspector" }), _jsx("p", { className: "text-sm text-eidos-muted mt-1", children: "Trace the path from a high-level intent declaration to the concrete runtime strategy Eidos generates for it." })] }), _jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsx(Search, { size: 14, className: "text-eidos-muted" }), _jsx("span", { className: "text-xs text-eidos-muted", children: "Inspect:" }), allEntries.map((entry) => (_jsx("button", { onClick: () => setSelected(entry), className: `
              text-xs font-mono px-3 py-1.5 rounded-lg border transition-all
              ${selected.url === entry.url
                            ? 'bg-eidos-accent-dim border-eidos-accent text-eidos-text'
                            : 'border-eidos-border text-eidos-muted hover:border-eidos-accent hover:text-eidos-text'}
            `, children: entry.url }, entry.url)))] }), _jsx(IntentFlow, { entry: selected }), _jsx(StrategyDetail, { strategy: selected.strategy }), _jsxs(Card, { children: [_jsx(CardHeader, { title: "Equivalent Workbox config", description: "What you'd have to write manually without Eidos." }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-mono text-eidos-muted uppercase tracking-widest mb-2", children: "With Eidos" }), _jsx(CodeBlock, { code: `resource('${selected.url}', {\n  offline: true,\n})`, className: "text-xs" })] }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-mono text-eidos-muted uppercase tracking-widest mb-2", children: "Without Eidos" }), _jsx(CodeBlock, { code: selected.strategy.equivalentCode, className: "text-xs" })] })] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { title: "Decision tree", description: "How Eidos selects a strategy from your config." }), _jsx(DecisionTree, { selected: selected.strategy.swStrategy })] })] }));
}
// ── Intent → Strategy flow ────────────────────────────────────────────────────
function IntentFlow({ entry }) {
    const steps = [
        {
            label: 'Intent Declaration',
            icon: Code2,
            content: (_jsx(CodeBlock, { code: `resource('${entry.url}', {\n  offline: ${entry.config.offline},${entry.config.strategy ? `\n  strategy: '${entry.config.strategy}',` : ''}\n})` })),
            note: 'What the developer writes',
        },
        {
            label: 'Strategy Resolution',
            icon: Zap,
            content: (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center gap-2 p-3 rounded-lg bg-eidos-elevated border border-eidos-border", children: [_jsx("div", { className: "w-2 h-2 rounded-full bg-eidos-accent" }), _jsxs("span", { className: "text-xs font-mono text-eidos-text-dim", children: ["offline: true", ' ', _jsx("span", { className: "text-eidos-muted", children: "\u2192" }), ' ', _jsx("span", { className: "text-eidos-accent", children: "StaleWhileRevalidate" })] })] }), _jsx("p", { className: "text-xs text-eidos-muted leading-relaxed px-1", children: entry.strategy.reasoning })] })),
            note: 'What the runtime decides',
        },
        {
            label: 'Generated SW Rule',
            icon: Layers,
            content: (_jsxs("div", { className: "p-3 rounded-lg bg-eidos-elevated border border-eidos-border font-mono text-xs space-y-1", children: [_jsx("p", { className: "text-eidos-muted", children: "// Sent to the service worker via postMessage" }), _jsx("p", { children: _jsx("span", { className: "text-eidos-accent", children: "EIDOS_REGISTER_RESOURCE" }) }), _jsxs("p", { className: "text-eidos-text-dim pl-2", children: ["url: ", _jsxs("span", { className: "text-eidos-green", children: ["'", entry.url, "'"] })] }), _jsxs("p", { className: "text-eidos-text-dim pl-2", children: ["strategy: ", _jsxs("span", { className: "text-eidos-green", children: ["'", entry.strategy.swStrategy, "'"] })] }), _jsxs("p", { className: "text-eidos-text-dim pl-2", children: ["cacheName: ", _jsxs("span", { className: "text-eidos-green", children: ["'", entry.strategy.cacheName, "'"] })] })] })),
            note: 'What the SW receives',
        },
        {
            label: 'Runtime Behavior',
            icon: Zap,
            content: (_jsx("div", { className: "space-y-2", children: entry.strategy.behavior.map((step, i) => (_jsxs("div", { className: "flex items-start gap-2 text-xs", children: [_jsxs("span", { className: "font-mono text-eidos-accent shrink-0 mt-0.5 w-4", children: [i + 1, "."] }), _jsx("span", { className: "text-eidos-text-dim leading-relaxed", children: step })] }, i))) })),
            note: 'What happens on every request',
        },
    ];
    return (_jsx("div", { className: "space-y-3", children: steps.map((step, i) => {
            const Icon = step.icon;
            return (_jsxs("div", { children: [_jsxs(Card, { className: "animate-slide-up", children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx("div", { className: "w-6 h-6 rounded-full bg-eidos-accent flex items-center justify-center shrink-0", children: _jsx("span", { className: "text-white text-[10px] font-bold", children: i + 1 }) }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx(Icon, { size: 13, className: "text-eidos-accent" }), _jsx("span", { className: "text-sm font-semibold text-eidos-text", children: step.label })] }), _jsx("span", { className: "ml-auto text-[10px] font-mono text-eidos-muted", children: step.note })] }), step.content] }), i < steps.length - 1 && (_jsx("div", { className: "flex justify-center py-1", children: _jsx(ArrowDown, { size: 16, className: "text-eidos-border" }) }))] }, i));
        }) }));
}
// ── Strategy detail ───────────────────────────────────────────────────────────
function StrategyDetail({ strategy }) {
    return (_jsxs(Card, { children: [_jsx(CardHeader, { title: strategy.name, description: `Generated strategy · ${strategy.cacheName}`, action: _jsx(StatusBadge, { status: "fresh" }) }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs", children: [_jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-mono text-eidos-muted uppercase tracking-widest mb-2", children: "SW Strategy" }), _jsx("code", { className: "font-mono text-eidos-accent", children: strategy.swStrategy })] }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-mono text-eidos-muted uppercase tracking-widest mb-2", children: "Cache Bucket" }), _jsx("code", { className: "font-mono text-eidos-text-dim", children: strategy.cacheName })] })] })] }));
}
function DecisionTree({ selected }) {
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
    ];
    const strategyMap = {
        'stale-while-revalidate': 0,
        'cache-first': 1,
        'network-first': 2,
    };
    const activeIdx = strategyMap[selected] ?? 2;
    return (_jsx("div", { className: "space-y-2", children: nodes.map((node, i) => (_jsxs("div", { className: `
            flex items-center gap-3 p-3 rounded-lg border transition-all
            ${activeIdx === i
                ? 'border-eidos-accent bg-eidos-accent-dim'
                : 'border-eidos-border bg-eidos-elevated opacity-50'}
          `, children: [_jsx("div", { className: `w-2 h-2 rounded-full shrink-0 ${activeIdx === i ? 'bg-eidos-accent' : 'bg-eidos-border'}` }), _jsx("span", { className: "text-xs font-mono text-eidos-muted w-36 shrink-0", children: node.question }), _jsx(ArrowDown, { size: 12, className: "text-eidos-border rotate-[-90deg] shrink-0" }), _jsx("span", { className: `text-xs font-mono font-semibold ${activeIdx === i ? 'text-eidos-accent' : 'text-eidos-muted'}`, children: node.yes }), _jsx("span", { className: "text-xs text-eidos-muted", children: node.yesDesc })] }, i))) }));
}
