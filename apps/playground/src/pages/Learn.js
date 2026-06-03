import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BookOpen, Layers, Zap, Database, Wifi, Code2, ExternalLink } from 'lucide-react';
import { Card, CardHeader } from '../components/Card';
import { CodeBlock } from '../components/CodeBlock';
export function Learn() {
    return (_jsxs("div", { className: "max-w-3xl space-y-8 animate-fade-in", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-bold text-eidos-text", children: "How It Works" }), _jsx("p", { className: "text-sm text-eidos-muted mt-1 leading-relaxed", children: "Eidos is a thin runtime layer. It does not replace Service Workers \u2014 it generates and configures them from your intent declarations, so you never write SW code directly." })] }), _jsxs(Section, { icon: BookOpen, title: "The Problem", children: [_jsx("p", { className: "text-sm text-eidos-text-dim leading-relaxed mb-4", children: "Building offline-capable web apps today requires a working knowledge of Service Workers, the Cache API, Background Sync, IndexedDB, and a caching strategy library like Workbox. That's a significant surface area to understand, configure, and debug \u2014 separate from your actual application logic." }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [
                            'Service Worker registration and lifecycle',
                            'Cache-first vs network-first vs SWR strategies',
                            'Fetch event interception and routing',
                            'IndexedDB schema design for action queues',
                            'Background Sync API and retry logic',
                            'Cache versioning and cleanup on update',
                        ].map((item) => (_jsxs("div", { className: "flex items-start gap-2 text-xs text-eidos-muted", children: [_jsx("span", { className: "text-eidos-red shrink-0 mt-0.5", children: "\u2715" }), item] }, item))) })] }), _jsxs(Section, { icon: Zap, title: "The Vision", children: [_jsxs("p", { className: "text-sm text-eidos-text-dim leading-relaxed mb-4", children: ["Developers should express ", _jsx("strong", { className: "text-eidos-text", children: "what they want" }), ", not how to implement it. The platform details should be an implementation concern of the runtime, not the application."] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-mono text-eidos-muted uppercase tracking-widest mb-2", children: "Before" }), _jsx(CodeBlock, { code: `// workbox-config.js
registerRoute(
  ({ url }) => url.pathname === '/api/products',
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 60 }),
    ],
  }),
)

// service-worker.js
self.addEventListener('sync', (event) => {
  if (event.tag === 'create-order') {
    event.waitUntil(replayOrders())
  }
})` })] }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-mono text-eidos-muted uppercase tracking-widest mb-2", children: "After" }), _jsx(CodeBlock, { code: `// your-app.ts
resource('/api/products', {
  offline: true,
})

action(createOrder, {
  reliability: 'neverLose',
})` })] })] })] }), _jsxs(Section, { icon: Layers, title: "Architecture", children: [_jsxs("p", { className: "text-sm text-eidos-text-dim leading-relaxed mb-5", children: ["Eidos has three layers. The runtime (your app) declares intent. The bridge relays config to the worker via", ' ', _jsx("code", { className: "font-mono text-eidos-accent text-xs", children: "postMessage" }), ". The worker applies the generated strategy to every matching fetch."] }), _jsxs("div", { className: "rounded-xl border border-eidos-border bg-eidos-surface p-5 font-mono text-xs space-y-0", children: [_jsx(ArchLayer, { label: "Application Layer", color: "text-eidos-accent", items: ['resource(url, config)', 'action(fn, config)', 'EidosProvider'], note: "you write this" }), _jsx(ArchArrow, { label: "postMessage(EIDOS_REGISTER_RESOURCE)" }), _jsx(ArchLayer, { label: "Runtime Layer", color: "text-eidos-green", items: ['Strategy derivation', 'Zustand store', 'SW bridge'], note: "eidos/core" }), _jsx(ArchArrow, { label: "fetch intercept" }), _jsx(ArchLayer, { label: "Worker Layer", color: "text-eidos-amber", items: ['CacheFirst', 'StaleWhileRevalidate', 'NetworkFirst'], note: "eidos-sw.js" }), _jsx(ArchArrow, { label: "Cache API / IndexedDB" }), _jsx(ArchLayer, { label: "Storage Layer", color: "text-eidos-muted", items: ['Cache Storage', 'IndexedDB (action queue)', 'CacheStorage v1'], note: "browser APIs" })] })] }), _jsx(Section, { icon: Database, title: "Resource Lifecycle", children: _jsx("div", { className: "space-y-3", children: [
                        {
                            step: 'Register',
                            code: "resource('/api/products', { offline: true })",
                            desc: 'Adds an entry to the Zustand store and sends EIDOS_REGISTER_RESOURCE to the SW.',
                        },
                        {
                            step: 'Fetch',
                            code: "productsResource.fetch()",
                            desc: 'Calls fetch(url). The SW intercepts and applies the strategy (SWR in this case).',
                        },
                        {
                            step: 'Cache',
                            code: "await cache.put(request, response.clone())",
                            desc: 'SW clones the response into Cache Storage under eidos-resources-v1.',
                        },
                        {
                            step: 'Offline',
                            code: "// SW returns cache.match(request)",
                            desc: 'When offline, the SW serves the cached response with zero network overhead.',
                        },
                        {
                            step: 'Revalidate',
                            code: "// Background fetch on reconnect",
                            desc: 'SWR kicks off a background refresh after returning the cached response.',
                        },
                    ].map(({ step, code, desc }, i) => (_jsxs("div", { className: "flex gap-3 p-3 rounded-lg border border-eidos-border bg-eidos-elevated", children: [_jsx("div", { className: "w-6 h-6 rounded-full bg-eidos-accent/20 border border-eidos-accent/30 flex items-center justify-center shrink-0 mt-0.5", children: _jsx("span", { className: "text-[10px] font-mono text-eidos-accent font-bold", children: i + 1 }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "flex items-center gap-2 mb-1", children: _jsx("span", { className: "text-xs font-semibold text-eidos-text", children: step }) }), _jsx("code", { className: "text-[10px] font-mono text-eidos-green block mb-1.5 truncate", children: code }), _jsx("p", { className: "text-xs text-eidos-muted leading-relaxed", children: desc })] })] }, i))) }) }), _jsx(Section, { icon: Wifi, title: "Action Queue Lifecycle", children: _jsx("div", { className: "space-y-3", children: [
                        {
                            step: 'Declare',
                            code: "action(fn, { reliability: 'neverLose' })",
                            desc: 'Wraps fn and registers it in the action registry (module scope, survives reload).',
                        },
                        {
                            step: 'Call offline',
                            code: "await createOrder(payload) // offline",
                            desc: 'Detects isOnline = false, serialises fn ID + args, writes to IndexedDB.',
                        },
                        {
                            step: 'Persist',
                            code: "idb.addToQueue({ id, actionId, args })",
                            desc: 'Survives page reload. The queue is hydrated from IDB on every app start.',
                        },
                        {
                            step: 'Reconnect',
                            code: 'window "online" event → replayQueue()',
                            desc: 'Eidos reads IDB, looks up the original function, calls it with the stored args.',
                        },
                        {
                            step: 'Cleanup',
                            code: "idb.removeFromQueue(id)",
                            desc: 'On success, the item is removed from IDB and the Zustand store after a brief delay.',
                        },
                    ].map(({ step, code, desc }, i) => (_jsxs("div", { className: "flex gap-3 p-3 rounded-lg border border-eidos-border bg-eidos-elevated", children: [_jsx("div", { className: "w-6 h-6 rounded-full bg-eidos-amber/20 border border-eidos-amber/30 flex items-center justify-center shrink-0 mt-0.5", children: _jsx("span", { className: "text-[10px] font-mono text-eidos-amber font-bold", children: i + 1 }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("span", { className: "text-xs font-semibold text-eidos-text block mb-1", children: step }), _jsx("code", { className: "text-[10px] font-mono text-eidos-amber block mb-1.5 truncate", children: code }), _jsx("p", { className: "text-xs text-eidos-muted leading-relaxed", children: desc })] })] }, i))) }) }), _jsxs(Section, { icon: Code2, title: "Known Limitations", children: [_jsx("p", { className: "text-sm text-eidos-text-dim leading-relaxed mb-4", children: "Eidos is an intentionally-scoped v0. These limitations are real and documented so you know exactly what you're getting." }), _jsx("div", { className: "space-y-2", children: [
                            {
                                limit: 'GET-only resource caching',
                                detail: 'The SW only intercepts GET requests. POST/PUT/DELETE are never cached.',
                            },
                            {
                                limit: 'Pathname matching only',
                                detail: 'Resource URLs are matched by pathname. Cross-origin resources require full-URL registration.',
                            },
                            {
                                limit: 'Module-scope actions',
                                detail: 'action() must be called at module scope for replay to work after a page reload. Component-scope actions will not replay.',
                            },
                            {
                                limit: 'No TTL / cache expiry',
                                detail: 'Cached resources do not expire automatically in v0. Call resource.invalidate() to clear.',
                            },
                            {
                                limit: 'Single SW path',
                                detail: 'EidosProvider assumes /eidos-sw.js. Multiple SW registrations in one app are not supported.',
                            },
                        ].map(({ limit, detail }) => (_jsxs("div", { className: "flex gap-3 p-3 rounded-lg border border-eidos-border bg-eidos-elevated text-xs", children: [_jsx("span", { className: "text-eidos-amber shrink-0 mt-0.5", children: "\u26A0" }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold text-eidos-text", children: limit }), _jsx("p", { className: "text-eidos-muted mt-0.5 leading-relaxed", children: detail })] })] }, limit))) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { title: "Further reading" }), _jsx("div", { className: "space-y-2", children: [
                            { label: 'MDN — Service Worker API', href: 'https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API' },
                            { label: 'MDN — Cache API', href: 'https://developer.mozilla.org/en-US/docs/Web/API/Cache' },
                            { label: 'MDN — IndexedDB API', href: 'https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API' },
                            { label: 'Workbox — by Google', href: 'https://developer.chrome.com/docs/workbox' },
                            { label: 'web.dev — Offline cookbook', href: 'https://web.dev/articles/offline-cookbook' },
                        ].map(({ label, href }) => (_jsxs("a", { href: href, target: "_blank", rel: "noopener noreferrer", className: "flex items-center justify-between p-3 rounded-lg border border-eidos-border hover:border-eidos-accent bg-eidos-elevated hover:bg-eidos-accent-dim transition-all group text-xs", children: [_jsx("span", { className: "text-eidos-text-dim group-hover:text-eidos-text transition-colors", children: label }), _jsx(ExternalLink, { size: 11, className: "text-eidos-muted group-hover:text-eidos-accent transition-colors shrink-0" })] }, href))) })] })] }));
}
// ── Helpers ───────────────────────────────────────────────────────────────────
function Section({ icon: Icon, title, children, }) {
    return (_jsxs(Card, { children: [_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx(Icon, { size: 15, className: "text-eidos-accent" }), _jsx("h3", { className: "text-sm font-semibold text-eidos-text", children: title })] }), children] }));
}
function ArchLayer({ label, color, items, note, }) {
    return (_jsxs("div", { className: `rounded-lg border border-eidos-border bg-eidos-elevated p-3 ${color}`, children: [_jsxs("div", { className: "flex items-center justify-between mb-1.5", children: [_jsx("span", { className: "font-semibold", children: label }), _jsx("span", { className: "text-[10px] text-eidos-muted", children: note })] }), _jsx("div", { className: "flex gap-2 flex-wrap", children: items.map((item) => (_jsx("span", { className: "text-[10px] bg-eidos-bg/50 px-2 py-0.5 rounded border border-current/20 text-eidos-text-dim", children: item }, item))) })] }));
}
function ArchArrow({ label }) {
    return (_jsxs("div", { className: "flex flex-col items-center py-1", children: [_jsx("div", { className: "w-px h-3 bg-eidos-border" }), _jsx("span", { className: "text-[9px] font-mono text-eidos-muted", children: label }), _jsx("div", { className: "w-px h-3 bg-eidos-border" })] }));
}
