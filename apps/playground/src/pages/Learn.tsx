import { ExternalLink } from 'lucide-react'

export function Learn() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8 animate-fade-in">
      <div>
        <h2 className="text-lg font-semibold text-eidos-text mb-1">How It Works</h2>
        <p className="text-sm text-eidos-muted leading-relaxed">
          Eidos is a thin runtime. It doesn't replace Service Workers — it generates and
          manages them from your intent declarations so you never write SW code directly.
        </p>
      </div>

      {/* Problem */}
      <Section title="The problem">
        <p className="text-sm text-eidos-text-dim leading-relaxed mb-4">
          Offline-capable web apps require deep knowledge of Service Workers, the Cache API,
          Background Sync, IndexedDB, Workbox strategies, cache versioning, and retry logic.
          That's a large surface area unrelated to your actual business logic.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            'Service Worker lifecycle (install, activate, claim)',
            'Cache-first vs network-first vs SWR strategy choice',
            'Fetch event interception and URL pattern routing',
            'IndexedDB schema for persistent action queues',
            'Exponential backoff and retry on reconnect',
            'Cache versioning and stale-entry cleanup',
          ].map(item => (
            <div key={item} className="flex gap-2 text-xs text-eidos-muted">
              <span className="text-eidos-red shrink-0">✕</span>
              {item}
            </div>
          ))}
        </div>
      </Section>

      {/* Vision */}
      <Section title="The solution">
        <p className="text-sm text-eidos-text-dim leading-relaxed mb-4">
          Express <strong className="text-eidos-text">what you want</strong>, not how the browser
          should implement it. The runtime translates intent into the correct low-level behaviour.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CodePane label="Before (Workbox)">{`registerRoute(
  /\\/api\\/products/,
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60
      }),
    ],
  })
)

self.addEventListener('sync', ev => {
  if (ev.tag === 'create-order')
    ev.waitUntil(replayOrders())
})`}</CodePane>
          <CodePane label="After (Eidos)">{`resource('/api/products', {
  offline: true,
})

action(createOrder, {
  reliability: 'neverLose',
})`}</CodePane>
        </div>
      </Section>

      {/* Architecture */}
      <Section title="Architecture">
        <p className="text-sm text-eidos-text-dim leading-relaxed mb-4">
          Three layers. Your app declares intent. The runtime translates and bridges to the
          worker. The worker applies the strategy to every matching fetch.
        </p>
        <div className="rounded-xl border border-eidos-border bg-eidos-elevated font-mono text-[11px] overflow-hidden">
          {[
            { label: 'Application Layer', items: ['resource(url, config)', 'action(fn, config)', 'EidosProvider'], color: 'text-eidos-accent', note: 'you write this' },
            { label: 'Runtime Layer',     items: ['Strategy derivation', 'Zustand store', 'SW bridge'],         color: 'text-eidos-green', note: '@eidos/core' },
            { label: 'Worker Layer',      items: ['CacheFirst', 'StaleWhileRevalidate', 'NetworkFirst'],        color: 'text-eidos-amber', note: 'eidos-sw.js' },
            { label: 'Storage Layer',     items: ['Cache Storage (v1)', 'IndexedDB action queue'],              color: 'text-eidos-muted', note: 'browser APIs' },
          ].map((layer, i) => (
            <div key={layer.label}>
              {i > 0 && (
                <div className="flex items-center justify-center gap-2 py-1 border-y border-eidos-border bg-eidos-surface">
                  <span className="text-eidos-border">↓</span>
                  <span className="text-eidos-border text-[9px]">
                    {i === 1 ? 'postMessage (EIDOS_REGISTER_RESOURCE)' : i === 2 ? 'fetch intercept' : 'Cache API / IndexedDB'}
                  </span>
                </div>
              )}
              <div className="p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`font-semibold ${layer.color}`}>{layer.label}</span>
                  <span className="text-eidos-border">{layer.note}</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {layer.items.map(it => (
                    <span key={it} className="text-[10px] bg-eidos-surface border border-eidos-border px-2 py-0.5 rounded text-eidos-text-dim">{it}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Resource lifecycle */}
      <Section title="Resource lifecycle">
        {[
          { step: 'Register', code: "resource('/api/products', { offline: true })", desc: 'Registers in the Zustand store and sends EIDOS_REGISTER_RESOURCE to the SW via postMessage.', color: 'text-eidos-accent' },
          { step: 'Fetch',    code: 'productsResource.json()',                       desc: 'Checks Cache API directly in the main thread. Cache hit → returns instantly. Cache miss → fetches network, caches response.', color: 'text-eidos-accent' },
          { step: 'Offline',  code: '// SW intercepts on page reload',               desc: 'If the page reloads while offline, the SW serves the cached response from eidos-resources-v1 without any network request.', color: 'text-eidos-amber' },
          { step: 'Revalidate', code: '// SWR background refresh',                  desc: 'StaleWhileRevalidate always kicks off a background refresh after serving from cache, keeping data fresh.', color: 'text-eidos-green' },
        ].map(({ step, code, desc, color }, i) => (
          <div key={i} className="flex gap-3 p-3 rounded-lg border border-eidos-border bg-eidos-elevated mb-2">
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold font-mono ${color} border-current/30 bg-current/10`}>{i + 1}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-eidos-text mb-0.5">{step}</p>
              <code className={`text-[10px] font-mono block mb-1 ${color}`}>{code}</code>
              <p className="text-xs text-eidos-muted leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </Section>

      {/* Action lifecycle */}
      <Section title="Action queue lifecycle">
        {[
          { step: 'Declare', code: "action(fn, { reliability: 'neverLose' })", desc: 'Wraps fn and registers it in the action registry at module scope. Survives page reloads — the registry is rebuilt on import.', color: 'text-eidos-amber' },
          { step: 'Offline call', code: 'createOrder(payload) // isOnline = false', desc: 'The wrapper detects isOnline = false, serialises the function ID and args, and writes to IndexedDB before returning a QueuedResult.', color: 'text-eidos-amber' },
          { step: 'Reconnect', code: '// store isOnline transitions true', desc: 'The Zustand store subscription fires, triggering replayQueue() after 600 ms. Works for both real network reconnects and setOfflineSimulation(false).', color: 'text-eidos-green' },
          { step: 'Replay', code: 'replayQueue() → fn(...args)', desc: 'Each pending item is looked up in the registry by action ID, called with the stored args, and removed from IDB on success.', color: 'text-eidos-green' },
        ].map(({ step, code, desc, color }, i) => (
          <div key={i} className="flex gap-3 p-3 rounded-lg border border-eidos-border bg-eidos-elevated mb-2">
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold font-mono ${color} border-current/30 bg-current/10`}>{i + 1}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-eidos-text mb-0.5">{step}</p>
              <code className={`text-[10px] font-mono block mb-1 ${color}`}>{code}</code>
              <p className="text-xs text-eidos-muted leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </Section>

      {/* Limitations */}
      <Section title="Known limitations">
        <div className="space-y-2">
          {[
            { l: 'GET-only resource caching', d: 'The SW only intercepts GET requests. POST/PUT/DELETE are handled by the action queue, not cached.' },
            { l: 'Pathname matching only', d: 'Resource URLs match by pathname. Cross-origin resources require the full URL.' },
            { l: 'Module-scope actions', d: 'action() must be called at module scope for replay to work after page reload. Component-scope actions are not replayed.' },
            { l: 'No TTL / expiry', d: 'Cached resources never expire automatically. Call resource.invalidate() to clear.' },
            { l: 'Single SW path', d: 'EidosProvider assumes /eidos-sw.js. Multiple SW registrations in one app are unsupported.' },
          ].map(({ l, d }) => (
            <div key={l} className="flex gap-2 p-3 rounded-lg border border-eidos-border bg-eidos-elevated text-xs">
              <span className="text-eidos-amber shrink-0">⚠</span>
              <div>
                <p className="font-semibold text-eidos-text">{l}</p>
                <p className="text-eidos-muted mt-0.5 leading-relaxed">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Links */}
      <Section title="Further reading">
        <div className="space-y-1.5">
          {[
            { label: 'MDN — Service Worker API',  href: 'https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API' },
            { label: 'MDN — Cache API',            href: 'https://developer.mozilla.org/en-US/docs/Web/API/Cache' },
            { label: 'MDN — IndexedDB API',        href: 'https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API' },
            { label: 'Workbox — by Google',        href: 'https://developer.chrome.com/docs/workbox' },
            { label: 'web.dev — Offline cookbook', href: 'https://web.dev/articles/offline-cookbook' },
          ].map(({ label, href }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-lg border border-eidos-border bg-eidos-elevated hover:border-eidos-accent hover:bg-eidos-accent-dim transition-all group text-xs"
            >
              <span className="text-eidos-text-dim group-hover:text-eidos-text transition-colors">{label}</span>
              <ExternalLink size={11} className="text-eidos-muted group-hover:text-eidos-accent transition-colors shrink-0" />
            </a>
          ))}
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-eidos-text mb-3 capitalize">{title}</h3>
      {children}
    </div>
  )
}

function CodePane({ label, children }: { label: string; children: string }) {
  return (
    <div className="rounded-lg border border-eidos-border bg-eidos-elevated overflow-hidden">
      <div className="px-3 py-1.5 border-b border-eidos-border bg-eidos-surface">
        <span className="text-[10px] font-mono text-eidos-muted">{label}</span>
      </div>
      <pre className="p-3 text-[11px] font-mono text-eidos-text-dim leading-relaxed overflow-x-auto">{children}</pre>
    </div>
  )
}
