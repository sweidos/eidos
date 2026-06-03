import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { ShoppingCart, Package, RefreshCw, WifiOff, CheckCircle, Clock, Zap, ArrowRight, Layers, } from 'lucide-react';
import { useEidosStatus, useEidosStore, replayQueue } from '@eidos/core';
import { Card, CardHeader } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { CodeBlock } from '../components/CodeBlock';
import { productsResource, createOrder } from '../lib/eidos';
export function Overview({ onNavigate }) {
    const { isOnline, swStatus } = useEidosStatus();
    const resources = useEidosStore((s) => s.resources);
    const queue = useEidosStore((s) => s.queue);
    const resourceCount = Object.keys(resources).length;
    const pendingCount = queue.filter((q) => q.status === 'pending').length;
    return (_jsxs("div", { className: "max-w-5xl space-y-8 animate-fade-in", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx("div", { className: "w-8 h-8 rounded-lg bg-eidos-accent flex items-center justify-center", children: _jsx(Zap, { size: 16, className: "text-white" }) }), _jsx("h1", { className: "text-2xl font-bold text-eidos-text tracking-tight", children: "Eidos" })] }), _jsxs("p", { className: "text-lg text-eidos-text-dim max-w-2xl leading-relaxed", children: ["Describe ", _jsx("span", { className: "text-eidos-text font-medium", children: "intent" }), ". The runtime figures out how. An abstraction layer that eliminates Service Worker complexity from your application code."] }), _jsxs("div", { className: "flex items-center gap-3 mt-4", children: [_jsxs("button", { onClick: () => onNavigate('inspector'), className: "flex items-center gap-2 text-sm text-eidos-accent hover:text-white transition-colors", children: ["See intent \u2192 strategy mapping ", _jsx(ArrowRight, { size: 14 })] }), _jsx("span", { className: "text-eidos-border", children: "\u00B7" }), _jsx("button", { onClick: () => onNavigate('learn'), className: "text-sm text-eidos-muted hover:text-eidos-text transition-colors", children: "How it works" })] })] }), _jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3", children: [_jsx(StatusCard, { label: "Network", value: isOnline ? 'Online' : 'Offline', status: isOnline ? 'fresh' : 'stale', note: "navigator.onLine" }), _jsx(StatusCard, { label: "Service Worker", value: swStatus, status: swStatus === 'active' ? 'fresh' : swStatus === 'error' ? 'error' : 'idle', note: "eidos-sw.js" }), _jsx(StatusCard, { label: "Resources", value: String(resourceCount), status: resourceCount > 0 ? 'fresh' : 'idle', note: "registered" }), _jsx(StatusCard, { label: "Action Queue", value: String(pendingCount), status: pendingCount > 0 ? 'stale' : 'idle', note: "pending" })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-5", children: [_jsx(ProductsDemo, {}), _jsx(OrdersDemo, {})] }), _jsxs(Card, { children: [_jsx(CardHeader, { title: "The API", description: "Everything above was driven by two declarations." }), _jsx(CodeBlock, { code: `import { resource, action } from '@eidos/core'

// Register an offline-capable resource.
// The runtime picks StaleWhileRevalidate.
const products = resource('/api/products', {
  offline: true,
})

// Wrap any async function with neverLose reliability.
// The runtime queues it in IndexedDB if offline.
const createOrder = action(orderApi.create, {
  reliability: 'neverLose',
})`, title: "your-app.ts" })] }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3", children: [
                    {
                        page: 'resources',
                        icon: Layers,
                        title: 'Resources',
                        desc: 'Inspect cache status and strategy for every registered resource',
                    },
                    {
                        page: 'actions',
                        icon: Clock,
                        title: 'Action Queue',
                        desc: 'View queued actions, retry status, and IndexedDB persistence',
                    },
                    {
                        page: 'inspector',
                        icon: Zap,
                        title: 'Intent Inspector',
                        desc: 'Trace how each intent declaration becomes a runtime strategy',
                    },
                ].map(({ page, icon: Icon, title, desc }) => (_jsxs("button", { onClick: () => onNavigate(page), className: "text-left p-4 rounded-xl border border-eidos-border bg-eidos-surface hover:border-eidos-accent hover:bg-eidos-accent-dim transition-all group", children: [_jsx(Icon, { size: 16, className: "text-eidos-muted group-hover:text-eidos-accent mb-2 transition-colors" }), _jsx("p", { className: "text-sm font-semibold text-eidos-text", children: title }), _jsx("p", { className: "text-xs text-eidos-muted mt-0.5 leading-relaxed", children: desc })] }, page))) })] }));
}
// ── Status Card ───────────────────────────────────────────────────────────────
function StatusCard({ label, value, status, note, }) {
    return (_jsxs("div", { className: "p-4 rounded-xl border border-eidos-border bg-eidos-surface", children: [_jsx("p", { className: "text-[10px] font-mono text-eidos-muted uppercase tracking-widest mb-1", children: label }), _jsx("p", { className: "text-lg font-semibold text-eidos-text capitalize leading-tight", children: value }), _jsx("div", { className: "mt-2", children: _jsx(StatusBadge, { status: status }) }), _jsx("p", { className: "text-[10px] font-mono text-eidos-border mt-1", children: note })] }));
}
// ── Products Demo ─────────────────────────────────────────────────────────────
function ProductsDemo() {
    const [products, setProducts] = useState(null);
    const [loading, setLoading] = useState(false);
    const [lastEvent, setLastEvent] = useState(null);
    const resourceState = useEidosStore((s) => s.resources['/api/products']);
    // SW postMessage is async — read the store after it has settled
    async function fetchProducts() {
        setLoading(true);
        setLastEvent(null);
        const hitsBefore = useEidosStore.getState().resources['/api/products']?.cacheHits ?? 0;
        try {
            const data = await productsResource.json();
            setProducts(data);
            // Give the SW message ~150 ms to land then check what actually happened
            setTimeout(() => {
                const entry = useEidosStore.getState().resources['/api/products'];
                const hitsAfter = entry?.cacheHits ?? 0;
                if (hitsAfter > hitsBefore) {
                    setLastEvent('cache-hit');
                }
                else {
                    setLastEvent('cache-updated');
                }
            }, 150);
        }
        catch {
            setLastEvent('error');
        }
        finally {
            setLoading(false);
        }
    }
    async function invalidate() {
        await productsResource.invalidate();
        setProducts(null);
        setLastEvent(null);
    }
    return (_jsxs(Card, { children: [_jsx(CardHeader, { title: "Products Demo", description: "Fetch, cache, go offline, fetch again", action: _jsx("span", { className: "text-[10px] font-mono text-eidos-muted bg-eidos-elevated px-2 py-0.5 rounded", children: "StaleWhileRevalidate" }) }), lastEvent && (_jsxs("div", { className: `
          flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-lg mb-3 animate-slide-up
          ${lastEvent === 'cache-hit'
                    ? 'bg-eidos-green-dim text-eidos-green border border-eidos-green/20'
                    : lastEvent === 'error'
                        ? 'bg-eidos-red-dim text-eidos-red border border-eidos-red/20'
                        : 'bg-eidos-accent-dim text-eidos-accent border border-eidos-accent/20'}
        `, children: [_jsx(CheckCircle, { size: 12 }), lastEvent === 'cache-hit'
                        ? '⚡ Cache hit — served from SW cache (0ms)'
                        : lastEvent === 'cache-updated'
                            ? '↑ Cache updated from network'
                            : lastEvent === 'error'
                                ? '✕ Network error — no cached fallback'
                                : '↓ Fetched from network'] })), _jsxs("div", { className: "space-y-1.5 mb-4 min-h-[120px]", children: [loading && (_jsxs("div", { className: "flex items-center gap-2 text-xs text-eidos-muted py-8 justify-center", children: [_jsx(RefreshCw, { size: 12, className: "animate-spin" }), " Fetching\u2026"] })), !loading && products && products.map((p) => (_jsxs("div", { className: "flex items-center justify-between px-3 py-2 rounded-lg bg-eidos-elevated border border-eidos-border text-sm animate-slide-up", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Package, { size: 12, className: "text-eidos-muted" }), _jsx("span", { className: "text-eidos-text font-medium", children: p.name }), _jsx("span", { className: "text-[10px] font-mono text-eidos-muted", children: p.category })] }), _jsxs("span", { className: "font-mono text-eidos-accent text-xs", children: ["$", p.price] })] }, p.id))), !loading && !products && (_jsx("div", { className: "flex items-center justify-center py-8 text-xs text-eidos-muted font-mono", children: "No data \u2014 click Fetch to load" }))] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("button", { onClick: fetchProducts, disabled: loading, className: "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-eidos-accent text-white text-sm font-medium hover:bg-indigo-500 transition-colors disabled:opacity-50", children: [_jsx(RefreshCw, { size: 13, className: loading ? 'animate-spin' : '' }), "Fetch Products"] }), products && (_jsx("button", { onClick: invalidate, className: "px-3 py-2 rounded-lg border border-eidos-border text-eidos-muted hover:text-eidos-text hover:border-eidos-accent text-xs transition-all", children: "Clear Cache" }))] }), _jsxs("p", { className: "text-[10px] text-eidos-muted mt-2 font-mono", children: [resourceState?.cacheHits ?? 0, " cache hits \u00B7 ", resourceState?.cachedAt
                        ? `cached ${new Date(resourceState.cachedAt).toLocaleTimeString()}`
                        : 'not cached yet'] })] }));
}
// ── Orders Demo ───────────────────────────────────────────────────────────────
function OrdersDemo() {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [queued, setQueued] = useState(false);
    const queue = useEidosStore((s) => s.queue);
    const isOnline = useEidosStore((s) => s.isOnline);
    const pendingOrders = queue.filter((q) => q.actionName === 'createOrder' && (q.status === 'pending' || q.status === 'replaying'));
    async function submitOrder() {
        setLoading(true);
        setResult(null);
        setQueued(false);
        try {
            const res = await createOrder({
                productId: 1,
                quantity: 1,
                customerName: 'Demo User',
            });
            if ('queued' in res && res.queued) {
                setQueued(true);
                setResult(res.message);
            }
            else {
                setResult(`Order ${res.id} confirmed ✓`);
            }
        }
        catch {
            setResult('Failed to submit order');
        }
        finally {
            setLoading(false);
        }
    }
    async function replay() {
        await replayQueue();
    }
    return (_jsxs(Card, { children: [_jsx(CardHeader, { title: "Orders Demo", description: "Submit offline, queue persists, replay on reconnect", action: _jsx("span", { className: "text-[10px] font-mono text-eidos-muted bg-eidos-elevated px-2 py-0.5 rounded", children: "neverLose" }) }), result && (_jsxs("div", { className: `
          flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-lg mb-3 animate-slide-up
          ${queued
                    ? 'bg-eidos-amber-dim text-eidos-amber border border-eidos-amber/20'
                    : 'bg-eidos-green-dim text-eidos-green border border-eidos-green/20'}
        `, children: [queued ? _jsx(WifiOff, { size: 12 }) : _jsx(CheckCircle, { size: 12 }), result] })), _jsxs("div", { className: "space-y-1.5 mb-4 min-h-[120px]", children: [pendingOrders.length === 0 && (_jsxs("div", { className: "flex flex-col items-center justify-center py-8 gap-2", children: [_jsx(ShoppingCart, { size: 20, className: "text-eidos-border" }), _jsx("p", { className: "text-xs text-eidos-muted font-mono", children: "Queue empty" }), !isOnline && (_jsx("p", { className: "text-[10px] text-eidos-amber", children: "Offline \u2014 orders will queue" }))] })), pendingOrders.map((item) => (_jsxs("div", { className: "flex items-center justify-between px-3 py-2 rounded-lg bg-eidos-elevated border border-eidos-border text-sm animate-slide-up", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-1.5 h-1.5 rounded-full bg-eidos-amber animate-pulse" }), _jsx("span", { className: "text-eidos-text font-medium font-mono text-xs", children: item.actionName }), _jsxs("span", { className: "text-[10px] text-eidos-muted", children: ["retry ", item.retryCount, "/", item.maxRetries] })] }), _jsx(StatusBadge, { status: item.status })] }, item.id)))] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("button", { onClick: submitOrder, disabled: loading, className: "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-eidos-accent text-white text-sm font-medium hover:bg-indigo-500 transition-colors disabled:opacity-50", children: [_jsx(ShoppingCart, { size: 13, className: loading ? 'animate-pulse' : '' }), "Submit Order"] }), pendingOrders.length > 0 && isOnline && (_jsx("button", { onClick: replay, className: "px-3 py-2 rounded-lg bg-eidos-green-dim border border-eidos-green/30 text-eidos-green text-xs font-medium hover:bg-eidos-green/20 transition-all", children: "Replay Queue" }))] }), _jsx("p", { className: "text-[10px] text-eidos-muted mt-2 font-mono", children: isOnline
                    ? 'Simulate offline in the header then submit'
                    : '⚡ Offline — orders persist to IndexedDB automatically' })] }));
}
