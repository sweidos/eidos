import { BookOpen, Layers, Zap, Database, Wifi, Code2, ExternalLink } from 'lucide-react'
import { Card, CardHeader } from '../components/Card'
import { CodeBlock } from '../components/CodeBlock'

export function Learn() {
  return (
    <div className="max-w-3xl space-y-8 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-vardi-text">How It Works</h2>
        <p className="text-sm text-vardi-muted mt-1 leading-relaxed">
          Vardi is a thin runtime layer. It does not replace Service Workers —
          it generates and configures them from your intent declarations, so you
          never write SW code directly.
        </p>
      </div>

      {/* The problem */}
      <Section icon={BookOpen} title="The Problem">
        <p className="text-sm text-vardi-text-dim leading-relaxed mb-4">
          Building offline-capable web apps today requires a working knowledge of
          Service Workers, the Cache API, Background Sync, IndexedDB, and a
          caching strategy library like Workbox. That's a significant surface
          area to understand, configure, and debug — separate from your actual
          application logic.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            'Service Worker registration and lifecycle',
            'Cache-first vs network-first vs SWR strategies',
            'Fetch event interception and routing',
            'IndexedDB schema design for action queues',
            'Background Sync API and retry logic',
            'Cache versioning and cleanup on update',
          ].map((item) => (
            <div key={item} className="flex items-start gap-2 text-xs text-vardi-muted">
              <span className="text-vardi-red shrink-0 mt-0.5">✕</span>
              {item}
            </div>
          ))}
        </div>
      </Section>

      {/* The vision */}
      <Section icon={Zap} title="The Vision">
        <p className="text-sm text-vardi-text-dim leading-relaxed mb-4">
          Developers should express <strong className="text-vardi-text">what they want</strong>,
          not how to implement it. The platform details should be an
          implementation concern of the runtime, not the application.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-mono text-vardi-muted uppercase tracking-widest mb-2">Before</p>
            <CodeBlock
              code={`// workbox-config.js
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
})`}
            />
          </div>
          <div>
            <p className="text-[10px] font-mono text-vardi-muted uppercase tracking-widest mb-2">After</p>
            <CodeBlock
              code={`// your-app.ts
resource('/api/products', {
  offline: true,
})

action(createOrder, {
  reliability: 'neverLose',
})`}
            />
          </div>
        </div>
      </Section>

      {/* Architecture */}
      <Section icon={Layers} title="Architecture">
        <p className="text-sm text-vardi-text-dim leading-relaxed mb-5">
          Vardi has three layers. The runtime (your app) declares intent. The
          bridge relays config to the worker via{' '}
          <code className="font-mono text-vardi-accent text-xs">postMessage</code>.
          The worker applies the generated strategy to every matching fetch.
        </p>

        {/* Architecture diagram */}
        <div className="rounded-xl border border-vardi-border bg-vardi-surface p-5 font-mono text-xs space-y-0">
          <ArchLayer
            label="Application Layer"
            color="text-vardi-accent"
            items={['resource(url, config)', 'action(fn, config)', 'VardiProvider']}
            note="you write this"
          />
          <ArchArrow label="postMessage(VARDI_REGISTER_RESOURCE)" />
          <ArchLayer
            label="Runtime Layer"
            color="text-vardi-green"
            items={['Strategy derivation', 'Zustand store', 'SW bridge']}
            note="vardi/core"
          />
          <ArchArrow label="fetch intercept" />
          <ArchLayer
            label="Worker Layer"
            color="text-vardi-amber"
            items={['CacheFirst', 'StaleWhileRevalidate', 'NetworkFirst']}
            note="vardi-sw.js"
          />
          <ArchArrow label="Cache API / IndexedDB" />
          <ArchLayer
            label="Storage Layer"
            color="text-vardi-muted"
            items={['Cache Storage', 'IndexedDB (action queue)', 'CacheStorage v1']}
            note="browser APIs"
          />
        </div>
      </Section>

      {/* Resource lifecycle */}
      <Section icon={Database} title="Resource Lifecycle">
        <div className="space-y-3">
          {[
            {
              step: 'Register',
              code: "resource('/api/products', { offline: true })",
              desc: 'Adds an entry to the Zustand store and sends VARDI_REGISTER_RESOURCE to the SW.',
            },
            {
              step: 'Fetch',
              code: "productsResource.fetch()",
              desc: 'Calls fetch(url). The SW intercepts and applies the strategy (SWR in this case).',
            },
            {
              step: 'Cache',
              code: "await cache.put(request, response.clone())",
              desc: 'SW clones the response into Cache Storage under vardi-resources-v1.',
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
          ].map(({ step, code, desc }, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-lg border border-vardi-border bg-vardi-elevated">
              <div className="w-6 h-6 rounded-full bg-vardi-accent/20 border border-vardi-accent/30 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-mono text-vardi-accent font-bold">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-vardi-text">{step}</span>
                </div>
                <code className="text-[10px] font-mono text-vardi-green block mb-1.5 truncate">{code}</code>
                <p className="text-xs text-vardi-muted leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Action lifecycle */}
      <Section icon={Wifi} title="Action Queue Lifecycle">
        <div className="space-y-3">
          {[
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
              desc: 'Vardi reads IDB, looks up the original function, calls it with the stored args.',
            },
            {
              step: 'Cleanup',
              code: "idb.removeFromQueue(id)",
              desc: 'On success, the item is removed from IDB and the Zustand store after a brief delay.',
            },
          ].map(({ step, code, desc }, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-lg border border-vardi-border bg-vardi-elevated">
              <div className="w-6 h-6 rounded-full bg-vardi-amber/20 border border-vardi-amber/30 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-mono text-vardi-amber font-bold">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-vardi-text block mb-1">{step}</span>
                <code className="text-[10px] font-mono text-vardi-amber block mb-1.5 truncate">{code}</code>
                <p className="text-xs text-vardi-muted leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Limitations */}
      <Section icon={Code2} title="Known Limitations">
        <p className="text-sm text-vardi-text-dim leading-relaxed mb-4">
          Vardi is an intentionally-scoped v0. These limitations are real and
          documented so you know exactly what you're getting.
        </p>
        <div className="space-y-2">
          {[
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
              detail: 'VardiProvider assumes /vardi-sw.js. Multiple SW registrations in one app are not supported.',
            },
          ].map(({ limit, detail }) => (
            <div key={limit} className="flex gap-3 p-3 rounded-lg border border-vardi-border bg-vardi-elevated text-xs">
              <span className="text-vardi-amber shrink-0 mt-0.5">⚠</span>
              <div>
                <p className="font-semibold text-vardi-text">{limit}</p>
                <p className="text-vardi-muted mt-0.5 leading-relaxed">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* External links */}
      <Card>
        <CardHeader title="Further reading" />
        <div className="space-y-2">
          {[
            { label: 'MDN — Service Worker API', href: 'https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API' },
            { label: 'MDN — Cache API',           href: 'https://developer.mozilla.org/en-US/docs/Web/API/Cache' },
            { label: 'MDN — IndexedDB API',       href: 'https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API' },
            { label: 'Workbox — by Google',        href: 'https://developer.chrome.com/docs/workbox' },
            { label: 'web.dev — Offline cookbook', href: 'https://web.dev/articles/offline-cookbook' },
          ].map(({ label, href }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-lg border border-vardi-border hover:border-vardi-accent bg-vardi-elevated hover:bg-vardi-accent-dim transition-all group text-xs"
            >
              <span className="text-vardi-text-dim group-hover:text-vardi-text transition-colors">{label}</span>
              <ExternalLink size={11} className="text-vardi-muted group-hover:text-vardi-accent transition-colors shrink-0" />
            </a>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={15} className="text-vardi-accent" />
        <h3 className="text-sm font-semibold text-vardi-text">{title}</h3>
      </div>
      {children}
    </Card>
  )
}

function ArchLayer({
  label,
  color,
  items,
  note,
}: {
  label: string
  color: string
  items: string[]
  note: string
}) {
  return (
    <div className={`rounded-lg border border-vardi-border bg-vardi-elevated p-3 ${color}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold">{label}</span>
        <span className="text-[10px] text-vardi-muted">{note}</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {items.map((item) => (
          <span
            key={item}
            className="text-[10px] bg-vardi-bg/50 px-2 py-0.5 rounded border border-current/20 text-vardi-text-dim"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

function ArchArrow({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center py-1">
      <div className="w-px h-3 bg-vardi-border" />
      <span className="text-[9px] font-mono text-vardi-muted">{label}</span>
      <div className="w-px h-3 bg-vardi-border" />
    </div>
  )
}
