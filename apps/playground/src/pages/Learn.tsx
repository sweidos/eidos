import { useState } from 'react'
import { ExternalLink, ChevronDown, ChevronRight } from 'lucide-react'

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-base font-semibold text-eidos-text mt-10 mb-3 flex items-center gap-2 scroll-mt-4">
      <a href={`#${id}`} aria-label={`Link to ${String(id)} section`} className="text-eidos-border hover:text-eidos-accent transition-colors" tabIndex={-1}>#</a>
      {children}
    </h2>
  )
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-eidos-text mt-6 mb-2">{children}</h3>
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-eidos-text-dim leading-relaxed mb-3">{children}</p>
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="font-mono text-eidos-accent text-xs bg-eidos-elevated px-1.5 py-0.5 rounded border border-eidos-border">{children}</code>
}

function Pre({ children, label }: { children: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="rounded-lg border border-eidos-border overflow-hidden mb-4">
      {label && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-eidos-surface border-b border-eidos-border">
          <span className="text-[10px] font-mono text-eidos-muted">{label}</span>
          <button
            onClick={() => { navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
            className="text-[10px] font-mono text-eidos-muted hover:text-eidos-text transition-colors"
          >
            {copied ? '✓ copied' : 'copy'}
          </button>
        </div>
      )}
      <pre className="p-4 text-xs font-mono text-eidos-text leading-relaxed overflow-x-auto bg-eidos-elevated">{children}</pre>
    </div>
  )
}

function PropRow({ name, type, def, desc }: { name: string; type: string; def?: string; desc: string }) {
  return (
    <tr className="border-t border-eidos-border">
      <td className="py-2 pr-3 font-mono text-[11px] text-eidos-accent align-top">{name}</td>
      <td className="py-2 pr-3 font-mono text-[11px] text-eidos-text-dim align-top">{type}</td>
      <td className="py-2 pr-3 font-mono text-[11px] text-eidos-muted align-top">{def ?? '—'}</td>
      <td className="py-2 text-xs text-eidos-text-dim align-top leading-relaxed">{desc}</td>
    </tr>
  )
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-left bg-eidos-surface border border-eidos-border rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-eidos-elevated">
            {headers.map(h => (
              <th key={h} className="px-3 py-2 text-[10px] font-mono text-eidos-muted uppercase tracking-widest">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-eidos-border px-3">
          {children}
        </tbody>
      </table>
    </div>
  )
}

function Collapse({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-eidos-border rounded-lg overflow-hidden mb-3">
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-eidos-text hover:bg-eidos-elevated transition-colors text-left"
      >
        {open ? <ChevronDown size={13} className="shrink-0 text-eidos-accent" /> : <ChevronRight size={13} className="shrink-0 text-eidos-muted" />}
        {title}
      </button>
      {open && <div className="border-t border-eidos-border p-4 bg-eidos-elevated/30" role="region">{children}</div>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function Learn() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-6 animate-fade-in">
      {/* ToC */}
      <nav className="rounded-xl border border-eidos-border bg-eidos-surface p-4 mb-8 text-xs font-mono">
        <p className="text-eidos-muted mb-2 uppercase tracking-widest text-[10px]">On this page</p>
        <div className="grid grid-cols-2 gap-1">
          {[
            ['#install',      'Installation'],
            ['#setup',        'Quick Setup'],
            ['#resource',     'resource()'],
            ['#patterns',     'URL Patterns'],
            ['#cross-origin', 'Cross-Origin'],
            ['#action',       'action()'],
            ['#replay',       'replayQueue()'],
            ['#clear',        'clearQueue()'],
            ['#provider',     'EidosProvider'],
            ['#hooks',        'Hooks'],
            ['#types',        'Types'],
            ['#strategies',   'Strategies'],
            ['#svelte-vue',   'Svelte / Vue / JS'],
            ['#simulation',   'Offline Simulation'],
            ['#architecture', 'Architecture'],
            ['#limitations',  'Limitations'],
          ].map(([href, label]) => (
            <a key={href} href={href} className="text-eidos-accent hover:underline">{label}</a>
          ))}
        </div>
      </nav>

      {/* ── Installation ─────────────────────────────────────────────────────── */}
      <H2 id="install">Installation</H2>
      <Pre label="terminal">{`npm install @sweidos/eidos
# or
pnpm add @sweidos/eidos`}</Pre>
      <P>Then copy the service worker into your project's public directory:</P>
      <Pre label="terminal">{`cp node_modules/@sweidos/eidos/dist/eidos-sw.js public/eidos-sw.js`}</Pre>

      {/* ── Quick Setup ──────────────────────────────────────────────────────── */}
      <H2 id="setup">Quick Setup</H2>
      <Pre label="main.tsx">{`import { EidosProvider } from '@sweidos/eidos'
import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')!).render(
  <EidosProvider swPath="/eidos-sw.js">
    <App />
  </EidosProvider>
)`}</Pre>
      <Pre label="src/lib/eidos.ts">{`// Declare at module scope so actions survive page reload for replay.
import { resource, action } from '@sweidos/eidos'

export const products = resource('/api/products', { offline: true })

export const createOrder = action(
  async (payload: OrderPayload) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return res.json()
  },
  { reliability: 'neverLose', name: 'createOrder' },
)`}</Pre>

      {/* ── resource() ───────────────────────────────────────────────────────── */}
      <H2 id="resource">resource(url, config)</H2>
      <P>
        Registers a URL as an offline-capable resource. Sends <Code>EIDOS_REGISTER_RESOURCE</Code> to
        the service worker. Returns a <Code>ResourceHandle</Code> for fetching, querying, and
        cache management. Registration is idempotent — calling it twice returns the same handle.
      </P>

      <H3>Config options</H3>
      <Table headers={['Option', 'Type', 'Default', 'Description']}>
        <PropRow name="offline"    type="boolean"                                                  desc="Required. Enables SW fetch interception and cache persistence for this URL." />
        <PropRow name="strategy"   type="'cache-first' | 'stale-while-revalidate' | 'network-first'" def="auto" desc="Override the auto-selected caching strategy. If omitted, Eidos picks the best one based on offline." />
        <PropRow name="cacheName"  type="string"                                                   def="'eidos-resources-v1'" desc="Custom Cache Storage bucket name." />
        <PropRow name="maxAge"     type="number"                                                   def="∞" desc="TTL in milliseconds. Cached entries older than maxAge are treated as a cache miss and re-fetched from network." />
      </Table>

      <H3>Strategy auto-selection</H3>
      <Table headers={['Config', 'Chosen strategy', 'Why']}>
        <PropRow name="offline: true"                        type="StaleWhileRevalidate" desc="Best balance of speed (instant cache) and freshness (background revalidation)." />
        <PropRow name="offline: true, strategy: 'cache-first'"  type="CacheFirst"           desc="Maximum speed. Use when data rarely changes (icons, config)." />
        <PropRow name="offline: true, strategy: 'network-first'" type="NetworkFirst"         desc="Freshness priority. Cache is only a fallback when offline." />
        <PropRow name="offline: false (default)"             type="NetworkFirst"         desc="No offline support. Always tries network first." />
      </Table>

      <H3>Handle methods</H3>
      <Pre>{`const products = resource('/api/products', { offline: true })

// Fetch and update cache status in one call.
// Throws on non-2xx responses (including offline 503).
const response: Response = await products.fetch()

// Shorthand: fetch() + response.json()
const data: T = await products.json<T>()

// Returns a TanStack Query-compatible object.
const { queryKey, queryFn } = products.query<T>()
// Use: useQuery(products.query<Product[]>())

// Fetch and cache without returning data to the caller.
await products.prefetch()

// Remove all cached entries for this URL from Cache Storage.
// Sets status to 'stale' in the devtools store.
await products.invalidate()

// Remove from registry + send EIDOS_UNREGISTER_RESOURCE to SW.
// Required before re-registering the same URL with different config.
products.unregister()`}</Pre>

      <H3>Handle properties</H3>
      <Pre>{`products.url        // '/api/products'
products.config     // { offline: true }
products.strategy   // GeneratedStrategy object (see Types)`}</Pre>

      <H2 id="patterns">URL patterns</H2>
      <P>
        Pass a pattern instead of an exact URL to cache entire route families automatically.
        The SW intercepts every matching request — no individual registrations needed.
        Three wildcard syntaxes are supported:
      </P>
      <Table headers={['Syntax', 'Matches', 'Example pattern']}>
        <PropRow name="*"       type="single path segment" def="/api/products/123"           desc="Matches any non-slash characters between two slashes." />
        <PropRow name="**"      type="multiple segments"   def="/api/products/123/reviews"   desc="Matches any characters including slashes." />
        <PropRow name=":param"  type="named single segment" def="/api/users/abc"             desc="Named placeholder — equivalent to * but documents intent." />
      </Table>
      <Pre label="src/lib/eidos.ts">{`// Register once — all product detail pages are intercepted automatically
resource('/api/products/*', { offline: true })
// → /api/products/1, /api/products/abc all cached by StaleWhileRevalidate

resource('/api/users/:id/orders', { offline: true })
// → /api/users/alice/orders, /api/users/bob/orders

resource('/api/v2/**', { offline: true })
// → /api/v2/anything/nested/deeply

// Your fetch() calls — no code change required, the SW handles it
const res = await fetch('/api/products/123')   // ← intercepted + cached
const { data } = useQuery({
  queryKey: ['product', id],
  queryFn:  () => fetch(\`/api/products/\${id}\`).then(r => r.json()),
})

// invalidate() clears all entries matching the pattern
await productPattern.invalidate()`}</Pre>
      <P>
        Pattern handles do <strong className="text-eidos-text">not</strong> support{' '}
        <Code>fetch()</Code>, <Code>json()</Code>, <Code>query()</Code>, or{' '}
        <Code>prefetch()</Code> — these methods throw since there is no single URL to target.
        Use your own <Code>fetch()</Code> calls; the SW caches them transparently.
        <Code>invalidate()</Code> and <Code>unregister()</Code> work normally.
      </P>

      {/* ── Cross-origin ─────────────────────────────────────────────────────── */}
      <H2 id="cross-origin">Cross-Origin Resources</H2>
      <P>
        Pass a <strong className="text-eidos-text">full URL</strong> (including origin) to intercept
        requests to external APIs and CDNs. The SW matches against the complete request URL, so
        same-origin and cross-origin resources can coexist in the same registry.
      </P>
      <Pre label="src/lib/eidos.ts">{`// Same-origin — pathname only
resource('/api/products', { offline: true })

// Cross-origin — full URL with origin
resource('https://api.example.com/products',    { offline: true })
resource('https://cdn.example.com/config.json', { offline: false, strategy: 'cache-first' })

// Cross-origin patterns work too
resource('https://api.example.com/products/*',  { offline: true })
resource('https://cdn.example.com/assets/**',   { offline: true })

// Your fetch() calls — unchanged
const res = await fetch('https://api.example.com/products/123')  // ← intercepted + cached`}</Pre>
      <P>
        Cross-origin intercepts require the SW to control the page (standard requirement for all
        SW-managed fetches). No CORS changes are needed — the SW proxies the request transparently.
        Pattern handles for cross-origin URLs follow the same rules as same-origin patterns:{' '}
        <Code>fetch()</Code> / <Code>json()</Code> / <Code>query()</Code> throw; <Code>invalidate()</Code>{' '}
        and <Code>unregister()</Code> work normally.
      </P>

      {/* ── action() ─────────────────────────────────────────────────────────── */}
      <H2 id="action">action(fn, config)</H2>
      <P>
        Wraps any async function with reliability guarantees. The returned handle is a drop-in
        replacement for the original function — call it identically whether online or offline.
        The function is registered in a module-scope registry so it survives page reloads for replay.
      </P>

      <H3>Config options</H3>
      <Table headers={['Option', 'Type', 'Default', 'Description']}>
        <PropRow name="reliability" type="'best-effort' | 'neverLose'" desc="Required. 'best-effort': call directly, no persistence. 'neverLose': persist to IndexedDB before executing." />
        <PropRow name="name"        type="string" def="fn.name" desc="Human-readable label shown in devtools. Also used as the action registry key for replay — set explicitly if your fn is anonymous." />
        <PropRow name="maxRetries"  type="number" def="3"       desc="Maximum replay attempts before marking the item as 'failed'." />
      </Table>

      <H3>Reliability modes</H3>
      <Table headers={['Mode', 'Online', 'Offline', 'Network failure']}>
        <PropRow name="best-effort" type="Calls fn directly" def="Drops the call" desc="fn throws → error propagates, nothing queued." />
        <PropRow name="neverLose"   type="Calls fn, queues on throw" def="Queues to IndexedDB" desc="fn throws → serialised to IDB, replayed on reconnect with exponential backoff." />
      </Table>
      <P>
        <strong className="text-eidos-text">Exponential backoff:</strong> failed retries are delayed
        by <Code>min(2s × 2^retryCount, 5min)</Code> with ±20% jitter. The{' '}
        <Code>nextRetryAt</Code> field on each queue item tells you when the next attempt is
        scheduled. Items not yet due are skipped silently on each <Code>replayQueue()</Code> pass.
      </P>

      <H3>Return type</H3>
      <Pre>{`// Online + successful
const order: Order = await createOrder(payload)

// Offline or network failure (neverLose only)
const result = await createOrder(payload)
if ('queued' in result) {
  result.queued   // true
  result.id       // unique queue item ID
  result.message  // human-readable string
}`}</Pre>

      <H3>Function registry</H3>
      <P>
        <Code>action()</Code> registers the wrapped function using <Code>config.name || fn.name</Code> as
        the key. On page reload, module-scope <Code>action()</Code> calls re-register the function so
        <Code>replayQueue()</Code> can call it with the stored args. <strong className="text-eidos-text">Always
        set <Code>name</Code> explicitly for anonymous functions</strong> to ensure stable registry keys.
      </P>

      {/* ── replayQueue() ────────────────────────────────────────────────────── */}
      <H2 id="replay">replayQueue()</H2>
      <P>
        Reads the IndexedDB action queue and calls each pending action with its stored arguments.
        No-op when offline. Called automatically via a store subscription whenever
        <Code>isOnline</Code> transitions from <Code>false</Code> to <Code>true</Code> — this
        catches both real network reconnects and <Code>setOfflineSimulation(false)</Code>.
      </P>
      <Pre>{`import { replayQueue } from '@sweidos/eidos'
import type { ReplayResult } from '@sweidos/eidos'

// Returns a result summary — or ignore the return value like before
const result: ReplayResult = await replayQueue()
// { attempted: 3, succeeded: 2, failed: 0, retrying: 1, skipped: 0 }

// Replay fires automatically when online state changes.
// Configure EidosProvider to disable:
<EidosProvider autoReplay={false} swPath="/eidos-sw.js">`}</Pre>

      <H3>Item lifecycle during replay</H3>
      <Pre>{`// Status transitions:
'pending'
  → 'replaying'   (attempt in progress)
  → 'succeeded'   (fn resolved, removed from IDB after 3s)
  → 'failed'      (maxRetries exceeded, stays in IDB for inspection)
  → 'pending'     (retry count incremented, will attempt again)`}</Pre>

      {/* ── clearQueue() ─────────────────────────────────────────────────────── */}
      <H2 id="clear">clearQueue()</H2>
      <P>
        Removes all items from the action queue — both IndexedDB and the in-memory store.
        Useful for "clear all failed" UI controls and test teardown.
      </P>
      <Pre>{`import { clearQueue } from '@sweidos/eidos'

await clearQueue()
// → IDB action-queue store emptied
// → in-memory queue reset to []`}</Pre>

      {/* ── EidosProvider ────────────────────────────────────────────────────── */}
      <H2 id="provider">EidosProvider</H2>
      <P>Mount once at the root. Registers the SW, hydrates the IDB queue, and sets up the online watcher.</P>
      <Table headers={['Prop', 'Type', 'Default', 'Description']}>
        <PropRow name="swPath"      type="string"  def="'/eidos-sw.js'" desc="URL path to the eidos service worker file." />
        <PropRow name="autoReplay"  type="boolean" def="true"           desc="Automatically replay the action queue when isOnline transitions to true." />
        <PropRow name="children"    type="ReactNode" desc="Your application tree." />
      </Table>

      {/* ── Hooks ────────────────────────────────────────────────────────────── */}
      <H2 id="hooks">Hooks</H2>

      <H3>useEidosStatus()</H3>
      <P>Online + SW status. Cheap — safe to use in layout components that re-render often.</P>
      <Pre>{`const { isOnline, swStatus, swError } = useEidosStatus()
// isOnline: boolean
// swStatus: 'idle' | 'registering' | 'active' | 'error' | 'unsupported'
// swError:  string | undefined`}</Pre>

      <H3>useEidosResource(url)</H3>
      <P>Live cache state for a single resource. Updates whenever the cache is hit or written.</P>
      <Pre>{`const entry = useEidosResource('/api/products')
// entry: ResourceEntry | undefined
//   .status:     'idle' | 'fetching' | 'fresh' | 'stale' | 'error' | 'offline'
//   .cacheHits:  number
//   .cacheMisses:number
//   .cachedAt:   number | undefined  (epoch ms)
//   .fetchedAt:  number | undefined
//   .lastEvent:  'cache-hit' | 'cache-updated' | 'network-error' | 'cache-cleared'
//   .strategy:   GeneratedStrategy
//   .config:     ResourceConfig`}</Pre>

      <H3>useEidosQueue()</H3>
      <P>The full action queue. Re-renders on every status change.</P>
      <Pre>{`const queue = useEidosQueue()
// queue: ActionQueueItem[]
// Each item: { id, actionId, actionName, args, queuedAt,
//              retryCount, maxRetries, status, error?, completedAt? }`}</Pre>

      <H3>useEidosQueueStats()</H3>
      <P>Count-only subscription — returns <Code>{`{ pending, failed, replaying, total }`}</Code>. Four independent primitive selectors so each count only triggers a re-render when it changes. Use for badges and status bars instead of <Code>useEidosQueue()</Code> when you only need numbers, not full items.</P>
      <Pre>{`import { useEidosQueueStats } from '@sweidos/eidos'

const { pending, failed, replaying, total } = useEidosQueueStats()
// pending   — items waiting for next replay pass
// failed    — maxRetries exceeded, needs user attention
// replaying — currently in-flight
// total     — all items in queue

// Example: header badge
{pending > 0 && <span>{pending}</span>}
{failed  > 0 && <span className="text-red-400">{failed} failed</span>}`}</Pre>

      <H3>useEidosAction(id)</H3>
      <P>Live state for a single queue item by ID. Only re-renders when <em>that specific item</em> changes — cheaper than <Code>useEidosQueue().find(id)</Code> which re-renders on any queue mutation.</P>
      <Pre>{`import { useEidosAction } from '@sweidos/eidos'

// Returned when the action is called with reliability: 'neverLose'
const result = await createOrder(payload)
// { queued: true, id: 'abc123', message: '...' }

// In a component:
const item = useEidosAction(result.id)
// item: ActionQueueItem | undefined
// item?.status → 'pending' | 'replaying' | 'succeeded' | 'failed'
// undefined once the item is removed from the queue`}</Pre>

      <H3>useEidosOnDrain(callback)</H3>
      <P>Calls <Code>callback</Code> once each time the action queue drains from non-empty → 0. Always calls the latest callback version — no stale closure issues. Use for "all synced" toasts or side-effects after queue replay.</P>
      <Pre>{`import { useEidosOnDrain } from '@sweidos/eidos'

useEidosOnDrain(() => {
  toast.success('All offline actions synced!')
})

// Also works with notification libraries, analytics, etc.
useEidosOnDrain(() => analytics.track('queue_drained'))`}</Pre>

      <H3>useEidosStore (devtools)</H3>
      <P>Plain store object for devtools, tests, and non-React code. Not a hook — use the named hooks above for reactive subscriptions inside components.</P>
      <Pre>{`import { useEidosStore } from '@sweidos/eidos'

// Read state once (non-reactive — snapshot only)
const isOnline = useEidosStore.getState().isOnline
const queue    = useEidosStore.getState().queue

// Subscribe manually (for Vue / Svelte bindings or vanilla JS)
const unsub = useEidosStore.subscribe(() => {
  const state = useEidosStore.getState()
  // re-render or update external UI
})
unsub() // remove listener

// Test / devtools helper — merge partial state
useEidosStore.setState({ isOnline: false })`}</Pre>

      <H3>useEidos()</H3>
      <P>Returns the entire store. Prefer the narrower hooks above — this causes a re-render on any state change.</P>
      <Pre>{`const state = useEidos()
// state: EidosStore (full state + all action setters)`}</Pre>

      {/* ── Svelte / Vue / Vanilla JS ────────────────────────────────────────── */}
      <H2 id="svelte-vue">Svelte / Vue / Vanilla JS</H2>
      <P>
        Eidos ships framework-agnostic reactive stores that implement the{' '}
        <a href="https://svelte.dev/docs/svelte-components#script-4-prefix-stores-with-$-to-access-their-values"
           target="_blank" rel="noopener noreferrer" className="text-eidos-accent hover:underline">
          Svelte store contract
        </a>{' '}
        — no extra peer deps, no React required.
        Import from the same package; tree-shaking removes what you don't use.
      </P>

      <H3>Available stores</H3>
      <Table headers={['Export', 'Type', 'Notes']}>
        <PropRow name="eidosQueue"      type="ActionQueueItem[]"                      desc="Full action queue. Re-notifies on every mutation." />
        <PropRow name="eidosStatus"     type="{ isOnline, swStatus, swError }"        desc="Online + SW lifecycle. Cheap subscription." />
        <PropRow name="eidosQueueStats" type="{ pending, failed, replaying, total }"  desc="Queue counts. Compare fields in subscriber to skip work." />
        <PropRow name="eidosResource(url)" type="ResourceEntry | undefined"           desc="Live cache state for one URL." />
        <PropRow name="eidosAction(id)" type="ActionQueueItem | undefined"            desc="Single queue item. undefined after removal." />
        <PropRow name="eidosStore"      type="EidosStore"                             desc="Full snapshot. Prefer narrower stores." />
      </Table>

      <H3>Svelte</H3>
      <P>Use the <Code>$</Code> prefix — Svelte auto-subscribes and auto-unsubscribes.</P>
      <Pre label="Component.svelte">{`<script>
  import { eidosQueue, eidosStatus, eidosQueueStats, eidosResource } from '@sweidos/eidos'
</script>

<p>Online: {$eidosStatus.isOnline ? 'yes' : 'no'}</p>
<p>Pending: {$eidosQueueStats.pending}</p>
<p>Cache hits: {$eidosResource('/api/products')?.cacheHits ?? 0}</p>

{#each $eidosQueue as item (item.id)}
  <div>{item.actionName} — {item.status}</div>
{/each}`}</Pre>

      <H3>Vue (Composition API)</H3>
      <P>Wrap the store in a <Code>ref</Code> and clean up in <Code>onUnmounted</Code>.</P>
      <Pre label="composables/useEidos.ts">{`import { ref, onUnmounted } from 'vue'
import { eidosStatus, eidosQueue, eidosQueueStats } from '@sweidos/eidos'

export function useEidosStatusVue() {
  const status = ref(eidosStatus.getState())
  const unsub  = eidosStatus.subscribe((v) => { status.value = v })
  onUnmounted(unsub)
  return status
}

export function useEidosQueueVue() {
  const queue = ref(eidosQueue.getState())
  const unsub = eidosQueue.subscribe((v) => { queue.value = v })
  onUnmounted(unsub)
  return queue
}`}</Pre>
      <Pre label="Component.vue">{`<script setup>
import { useEidosStatusVue, useEidosQueueVue } from './composables/useEidos'
const status = useEidosStatusVue()
const queue  = useEidosQueueVue()
</script>

<template>
  <p>Online: {{ status.isOnline }}</p>
  <div v-for="item in queue" :key="item.id">{{ item.actionName }}</div>
</template>`}</Pre>

      <H3>Vanilla JS</H3>
      <Pre>{`import { eidosStatus, eidosResource } from '@sweidos/eidos'

// subscribe() returns an unsubscribe function
const unsub = eidosStatus.subscribe(({ isOnline }) => {
  document.title = isOnline ? 'App' : 'App (offline)'
})

// Read current value once without subscribing
const hits = eidosResource('/api/products').getState()?.cacheHits ?? 0

// Unsubscribe when done
unsub()`}</Pre>

      {/* ── Types ────────────────────────────────────────────────────────────── */}
      <H2 id="types">Types</H2>

      <Collapse title="ResourceConfig">
        <Pre>{`interface ResourceConfig {
  offline:    boolean
  strategy?:  'cache-first' | 'stale-while-revalidate' | 'network-first'
  cacheName?: string
  maxAge?:    number  // TTL in ms — expired entries trigger network fetch
}`}</Pre>
      </Collapse>

      <Collapse title="ResourceHandle<T>">
        <Pre>{`interface ResourceHandle<T = unknown> {
  readonly url:      string
  readonly config:   ResourceConfig
  readonly strategy: GeneratedStrategy
  fetch():           Promise<Response>
  json():            Promise<T>
  query():           { queryKey: [string, string]; queryFn: () => Promise<T> }
  prefetch():        Promise<void>
  invalidate():      Promise<void>
  unregister():      void   // remove from SW + registry
}`}</Pre>
      </Collapse>

      <Collapse title="ResourceEntry">
        <Pre>{`interface ResourceEntry {
  url:         string
  config:      ResourceConfig
  strategy:    GeneratedStrategy
  status:      'idle' | 'fetching' | 'fresh' | 'stale' | 'error' | 'offline'
  cachedAt?:   number
  fetchedAt?:  number
  cacheHits:   number
  cacheMisses: number
  lastEvent?:  'cache-hit' | 'cache-updated' | 'network-error' | 'cache-cleared'
}`}</Pre>
      </Collapse>

      <Collapse title="GeneratedStrategy">
        <Pre>{`interface GeneratedStrategy {
  name:           string          // e.g. 'StaleWhileRevalidate'
  swStrategy:     CacheStrategy   // the SW enum value
  cacheName:      string
  reasoning:      string          // one-line rationale for the choice
  behavior:       string[]        // human-readable step list
  equivalentCode: string          // equivalent Workbox snippet
}`}</Pre>
      </Collapse>

      <Collapse title="ActionConfig">
        <Pre>{`interface ActionConfig {
  reliability: 'best-effort' | 'neverLose'
  maxRetries?: number   // default 3
  name?:       string   // explicit registry key
}`}</Pre>
      </Collapse>

      <Collapse title="ActionQueueItem">
        <Pre>{`interface ActionQueueItem {
  id:           string
  actionId:     string   // registry key (= config.name || fn.name)
  actionName:   string   // display label
  args:         unknown[]
  queuedAt:     number   // epoch ms
  retryCount:   number
  maxRetries:   number
  status:       'pending' | 'replaying' | 'succeeded' | 'failed'
  error?:       string
  completedAt?: number
  nextRetryAt?: number   // epoch ms — set by exponential backoff after a failure
}`}</Pre>
      </Collapse>

      <Collapse title="QueuedResult">
        <Pre>{`interface QueuedResult {
  readonly queued:  true
  readonly id:      string
  readonly message: string
}`}</Pre>
      </Collapse>

      <Collapse title="ReplayResult">
        <Pre>{`interface ReplayResult {
  attempted: number  // items where fn was found and called
  succeeded: number  // resolved successfully
  failed:    number  // maxRetries exceeded, stays in queue
  retrying:  number  // failed, will retry later (nextRetryAt set)
  skipped:   number  // fn not in registry (module not imported yet)
}`}</Pre>
      </Collapse>

      <Collapse title="EidosState">
        <Pre>{`interface EidosState {
  isOnline:  boolean
  swStatus:  'idle' | 'registering' | 'active' | 'error' | 'unsupported'
  swError?:  string
  resources: Record<string, ResourceEntry>
  queue:     ActionQueueItem[]
}`}</Pre>
      </Collapse>

      {/* ── Strategies ───────────────────────────────────────────────────────── */}
      <H2 id="strategies">Caching Strategies</H2>

      {[
        {
          name: 'StaleWhileRevalidate',
          sw:   'stale-while-revalidate',
          steps: [
            'Check Cache Storage for a matching response',
            'If cached: return immediately, start a background fetch',
            'Background fetch succeeds: update the cache silently',
            'If not cached: fetch from network, cache the response, return it',
            'If network fails (offline): return cached response or throw',
          ],
          use: 'Data that should be fast but stay reasonably fresh. Good default for offline: true.',
        },
        {
          name: 'CacheFirst',
          sw:   'cache-first',
          steps: [
            'Check Cache Storage for a matching response',
            'If cached: return immediately — no network request at all',
            'If not cached: fetch from network, cache the response, return it',
            'If offline with no cache: throw (status: offline)',
          ],
          use: 'Static or rarely-changing data (config, reference data, images).',
        },
        {
          name: 'NetworkFirst',
          sw:   'network-first',
          steps: [
            'Attempt to fetch from the network',
            'Network succeeds: cache the response and return it',
            'Network fails: look for a cached response',
            'Both fail (offline, no cache): throw (status: offline)',
          ],
          use: 'Frequently updated data where stale responses cause problems.',
        },
      ].map(s => (
        <Collapse key={s.name} title={`${s.name} — ${s.sw}`}>
          <p className="text-xs text-eidos-muted mb-3 leading-relaxed">{s.use}</p>
          <ol className="space-y-1.5">
            {s.steps.map((step, i) => (
              <li key={i} className="flex gap-2 text-xs text-eidos-text-dim">
                <span className="font-mono text-eidos-accent shrink-0">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        </Collapse>
      ))}

      {/* ── Offline Simulation ───────────────────────────────────────────────── */}
      <H2 id="simulation">Offline Simulation</H2>
      <P>
        <Code>setOfflineSimulation(enabled)</Code> lets you test offline behaviour without
        actually disconnecting. It does two things simultaneously: sets{' '}
        <Code>isOnline = !enabled</Code> in the store (so action() and replayQueue()
        behave correctly) and sends <Code>EIDOS_SIMULATE_OFFLINE</Code> to the service worker
        (so fetch interception returns cached responses only).
      </P>
      <Pre>{`import { setOfflineSimulation } from '@sweidos/eidos'

setOfflineSimulation(true)   // go offline
// → action() queues new calls to IndexedDB
// → resource.fetch() returns from cache or throws
// → SW serves only cached responses

setOfflineSimulation(false)  // go back online
// → isOnline becomes true
// → replayQueue() fires automatically after 600ms`}</Pre>

      {/* ── Architecture ─────────────────────────────────────────────────────── */}
      <H2 id="architecture">Architecture</H2>
      <Pre>{`┌─────────────────────────────────────────────────────────┐
│  Application Layer                                       │
│  resource(url, config)  action(fn, config)               │  ← you write this
│  EidosProvider          useEidosStatus() / useEidosQueue  │
└────────────────────────────┬────────────────────────────┘
                             │ postMessage(EIDOS_REGISTER_RESOURCE)
                             │ postMessage(EIDOS_SIMULATE_OFFLINE)
┌────────────────────────────▼────────────────────────────┐
│  Runtime Layer  (@sweidos/eidos)                            │
│  Strategy derivation · reactive store · SW bridge           │  ← npm package
│  IDB queue · status-index scan (idbGetPendingItems)     │
│  Pre-activation message buffer · flushed on SW active   │
└────────────────────────────┬────────────────────────────┘
                             │ fetch event intercept
┌────────────────────────────▼────────────────────────────┐
│  Worker Layer  (eidos-sw.js)                             │
│  CacheFirst · StaleWhileRevalidate · NetworkFirst        │  ← generated SW
│  App shell caching (eidos-shell-v1)                      │
│  EIDOS_CACHE_HIT / EIDOS_CACHE_UPDATED → postMessage    │
└────────────────────────────┬────────────────────────────┘
                             │ Cache API  /  IndexedDB
┌────────────────────────────▼────────────────────────────┐
│  Storage Layer  (browser APIs)                           │
│  Cache Storage: eidos-resources-v1, eidos-shell-v1      │
│  IndexedDB: eidos / action-queue store                  │
└─────────────────────────────────────────────────────────┘`}</Pre>

      <H3>postMessage protocol</H3>
      <Table headers={['Direction', 'Message type', 'Payload', 'Purpose']}>
        <PropRow name="App → SW"  type="EIDOS_REGISTER_RESOURCE"   def="url, strategy, cacheName"   desc="Add fetch-intercept rule for a resource pathname." />
        <PropRow name="App → SW"  type="EIDOS_UNREGISTER_RESOURCE" def="url"                        desc="Remove fetch-intercept rule." />
        <PropRow name="App → SW"  type="EIDOS_CLEAR_CACHE"         def="url?"                       desc="Evict cache entries for a URL (or all entries)." />
        <PropRow name="App → SW"  type="EIDOS_SIMULATE_OFFLINE"    def="enabled: boolean"           desc="Toggle offline simulation — SW serves only cached responses." />
        <PropRow name="App → SW"  type="EIDOS_PING"                def="—"                          desc="Health check — SW replies with EIDOS_PONG." />
        <PropRow name="SW → App"  type="EIDOS_CACHE_HIT"           def="url, strategy"              desc="A cached response was served." />
        <PropRow name="SW → App"  type="EIDOS_CACHE_UPDATED"       def="url, strategy"              desc="Cache entry was written from a network response." />
        <PropRow name="SW → App"  type="EIDOS_NETWORK_ERROR"       def="url"                        desc="Fetch failed and no cached fallback was found." />
        <PropRow name="SW → App"  type="EIDOS_CACHE_CLEARED"       def="url?"                       desc="Cache entry(ies) were deleted." />
      </Table>

      {/* ── Limitations ──────────────────────────────────────────────────────── */}
      <H2 id="limitations">Limitations</H2>
      <div className="space-y-2 mb-8">
        {[
          { l: 'GET-only SW interception', d: 'The SW fetch handler ignores non-GET methods. POST/PUT/DELETE actions go through the action queue, not SW caching.' },
          { l: 'Query string ignored', d: 'Resources match by pathname for same-origin, or full URL for cross-origin. The query string is not part of the match key — /api/products?page=2 and /api/products share the same SW rule but are cached as separate entries.' },
          { l: 'Module-scope actions required', d: 'action() must execute at module import time for replay to work after page reload. Actions declared inside components or event handlers are not available in the replay registry.' },
          { l: 'maxAge is client-side only', d: 'The maxAge TTL is enforced in the main thread. The SW still serves the cached response to other tabs or after a page reload until invalidate() is called.' },
          { l: 'Single SW registration', d: 'EidosProvider assumes one /eidos-sw.js per origin. Registering multiple service workers from the same provider is unsupported.' },
          { l: 'No background sync integration', d: 'The action queue is replayed on reconnect in the main thread, not via the Background Sync API. The page must be open for replay to fire.' },
          { l: 'CacheStorage availability', d: 'In Firefox private browsing mode, CacheStorage and IndexedDB may be unavailable. Eidos degrades gracefully — resources fetch from the network, actions silently fail without queuing.' },
        ].map(({ l, d }) => (
          <div key={l} className="flex gap-3 p-3 rounded-lg border border-eidos-border bg-eidos-elevated text-xs">
            <span className="text-eidos-amber shrink-0 mt-0.5">⚠</span>
            <div>
              <p className="font-semibold text-eidos-text mb-0.5">{l}</p>
              <p className="text-eidos-muted leading-relaxed">{d}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Links ────────────────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        {[
          { label: 'MDN — Service Worker API',    href: 'https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API' },
          { label: 'MDN — Cache API',              href: 'https://developer.mozilla.org/en-US/docs/Web/API/Cache' },
          { label: 'MDN — IndexedDB API',          href: 'https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API' },
          { label: 'web.dev — Offline cookbook',  href: 'https://web.dev/articles/offline-cookbook' },
          { label: 'Workbox docs (Google)',        href: 'https://developer.chrome.com/docs/workbox' },
        ].map(({ label, href }) => (
          <a key={href} href={href} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-lg border border-eidos-border bg-eidos-elevated hover:border-eidos-accent hover:bg-eidos-accent-dim transition-all group text-xs">
            <span className="text-eidos-text-dim group-hover:text-eidos-text transition-colors">{label}</span>
            <ExternalLink size={11} className="text-eidos-muted group-hover:text-eidos-accent shrink-0 transition-colors" />
          </a>
        ))}
      </div>
    </div>
  )
}
