import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Database, RefreshCw, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useEidosStore } from '@eidos/core';
import { Card, CardHeader } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { CodeBlock } from '../components/CodeBlock';
export function Resources() {
    const resources = useEidosStore((s) => s.resources);
    const entries = Object.values(resources);
    return (_jsxs("div", { className: "max-w-4xl space-y-6 animate-fade-in", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-bold text-eidos-text", children: "Resources" }), _jsxs("p", { className: "text-sm text-eidos-muted mt-1", children: ["Every resource registered with", ' ', _jsx("code", { className: "font-mono text-eidos-accent text-xs", children: "resource()" }), ' ', "appears here with its generated caching strategy and live status."] })] }), entries.length === 0 ? (_jsx(EmptyState, {})) : (_jsx("div", { className: "space-y-3", children: entries.map((entry) => (_jsx(ResourceRow, { entry: entry }, entry.url))) })), _jsxs(Card, { children: [_jsx(CardHeader, { title: "How resources are registered" }), _jsx(CodeBlock, { code: `import { resource } from '@eidos/core'

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
console.log(products.strategy.reasoning)    // one-line rationale`, title: "registration.ts" })] })] }));
}
function ResourceRow({ entry }) {
    const [expanded, setExpanded] = useState(false);
    const cachedAtStr = entry.cachedAt
        ? new Date(entry.cachedAt).toLocaleTimeString()
        : '—';
    return (_jsxs("div", { className: "rounded-xl border border-eidos-border bg-eidos-surface overflow-hidden", children: [_jsxs("button", { onClick: () => setExpanded((v) => !v), className: "w-full flex items-center gap-3 px-4 py-3 hover:bg-eidos-elevated transition-colors text-left", children: [_jsx(Database, { size: 14, className: "text-eidos-accent shrink-0" }), _jsx("span", { className: "font-mono text-sm text-eidos-text font-medium flex-1", children: entry.url }), _jsx("span", { className: "text-[10px] font-mono text-eidos-muted bg-eidos-elevated px-2 py-0.5 rounded border border-eidos-border", children: entry.strategy.name }), _jsx(StatusBadge, { status: entry.status }), _jsxs("div", { className: "flex items-center gap-3 ml-2 text-xs font-mono text-eidos-muted", children: [_jsxs("span", { title: "Cache hits", children: [_jsx("span", { className: "text-eidos-green", children: entry.cacheHits }), " hits"] }), _jsxs("span", { title: "Cache misses", children: [_jsx("span", { className: "text-eidos-red", children: entry.cacheMisses }), " misses"] })] }), expanded ? (_jsx(ChevronDown, { size: 14, className: "text-eidos-muted shrink-0" })) : (_jsx(ChevronRight, { size: 14, className: "text-eidos-muted shrink-0" }))] }), expanded && (_jsxs("div", { className: "border-t border-eidos-border px-4 pb-4 pt-3 space-y-4 animate-fade-in", children: [_jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3", children: [_jsx(MetaItem, { label: "Strategy", value: entry.strategy.swStrategy }), _jsx(MetaItem, { label: "Cache Name", value: entry.strategy.cacheName }), _jsx(MetaItem, { label: "Cached At", value: cachedAtStr }), _jsx(MetaItem, { label: "Offline", value: entry.config.offline ? 'yes' : 'no' })] }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-mono text-eidos-muted uppercase tracking-widest mb-1", children: "Why this strategy was chosen" }), _jsx("p", { className: "text-xs text-eidos-text-dim leading-relaxed", children: entry.strategy.reasoning })] }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-mono text-eidos-muted uppercase tracking-widest mb-2", children: "Runtime behavior" }), _jsx("div", { className: "space-y-1.5", children: entry.strategy.behavior.map((step, i) => (_jsxs("div", { className: "flex items-start gap-2 text-xs text-eidos-text-dim", children: [_jsxs("span", { className: "font-mono text-eidos-accent shrink-0 mt-0.5", children: [i + 1, "."] }), step] }, i))) })] }), _jsxs("div", { className: "flex gap-2 pt-1", children: [_jsxs("button", { onClick: () => window.location.reload(), className: "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-eidos-border text-eidos-muted hover:text-eidos-text hover:border-eidos-accent transition-all", children: [_jsx(RefreshCw, { size: 11 }), " Refetch"] }), _jsxs("button", { className: "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-eidos-red/30 text-eidos-red/70 hover:text-eidos-red hover:border-eidos-red transition-all", children: [_jsx(Trash2, { size: 11 }), " Clear Cache"] })] })] }))] }));
}
function MetaItem({ label, value }) {
    return (_jsxs("div", { className: "bg-eidos-elevated rounded-lg px-3 py-2", children: [_jsx("p", { className: "text-[10px] font-mono text-eidos-muted uppercase tracking-widest", children: label }), _jsx("p", { className: "text-xs font-mono text-eidos-text mt-0.5 truncate", children: value })] }));
}
function EmptyState() {
    return (_jsx(Card, { children: _jsxs("div", { className: "flex flex-col items-center justify-center py-12 gap-3", children: [_jsx(Database, { size: 32, className: "text-eidos-border" }), _jsx("p", { className: "text-sm font-semibold text-eidos-text", children: "No resources registered" }), _jsxs("p", { className: "text-xs text-eidos-muted text-center max-w-sm leading-relaxed", children: ["Call", ' ', _jsxs("code", { className: "font-mono text-eidos-accent", children: ["resource('/api/products', ", '{ offline: true }', ")"] }), ' ', "at module scope to register a resource. It will appear here instantly."] })] }) }));
}
