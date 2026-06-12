import { useState, type ReactNode } from 'react';
import { Card, CardHeader } from '../../components/Card';
import { CodeBlock } from '../../components/CodeBlock';
import { OnThisPage, SectionHeading, slugify } from './shared';
import {
  LiveCachedFetch,
  LiveOfflineMutation,
  LiveTanStackBridge,
  LiveTTLResource,
  LiveConnectionStatus,
  LiveQueueDrain,
  LivePushDemo,
} from './ExamplesLive';

const SECTIONS = [
  'Cached fetch, no boilerplate',
  'Offline-safe mutations',
  'TanStack Query bridge',
  'TTL-backed resource',
  'Connection-aware UI',
  'Queue-drain notifications',
  'Push notifications',
];

interface ExampleProps {
  title: string;
  description: string;
  withoutTitle: string;
  withoutCode: string;
  withTitle: string;
  withCode: string;
  live: ReactNode;
}

function Example({
  title,
  description,
  withoutTitle,
  withoutCode,
  withTitle,
  withCode,
  live,
}: ExampleProps) {
  const [view, setView] = useState<'code' | 'demo'>('code');

  return (
    <Card className="scroll-mt-20 space-y-3" id={slugify(title)}>
      <CardHeader
        title={title}
        description={description}
        action={
          <div className="inline-flex items-center rounded-full border border-eidos-border p-0.5 text-2xs">
            <button
              type="button"
              onClick={() => setView('code')}
              className={`rounded-full px-3 py-1 font-medium transition-colors duration-150 cursor-pointer ${
                view === 'code'
                  ? 'bg-eidos-accent-dim text-eidos-accent'
                  : 'text-eidos-muted hover:text-eidos-text-dim'
              }`}
            >
              Code
            </button>
            <button
              type="button"
              onClick={() => setView('demo')}
              className={`rounded-full px-3 py-1 font-medium transition-colors duration-150 cursor-pointer ${
                view === 'demo'
                  ? 'bg-eidos-accent-dim text-eidos-accent'
                  : 'text-eidos-muted hover:text-eidos-text-dim'
              }`}
            >
              Live demo
            </button>
          </div>
        }
      />
      <div className={view === 'code' ? 'grid gap-3 lg:grid-cols-2' : 'hidden'}>
        <div className="space-y-2">
          <p className="text-2xs uppercase tracking-[0.24em] text-eidos-muted">Without Eidos</p>
          <CodeBlock title={withoutTitle} code={withoutCode} />
        </div>
        <div className="space-y-2">
          <p className="text-2xs uppercase tracking-[0.24em] text-eidos-accent">With Eidos</p>
          <CodeBlock title={withTitle} code={withCode} />
        </div>
      </div>
      <div className={view === 'demo' ? 'animate-fade-in' : 'hidden'}>{live}</div>
    </Card>
  );
}

export function Examples() {
  return (
    <section id="examples" className="space-y-3">
      <SectionHeading
        id="examples"
        eyebrow="examples"
        title="Side-by-side: the code you'd write vs. the code you write with Eidos"
        description="Each pattern below shows the manual approach next to the Eidos equivalent — same behaviour, far less code to own and debug."
      />

      <OnThisPage items={SECTIONS} />

      <div className="space-y-4">
        <Example
          title={SECTIONS[0]}
          description="A cache-first GET that falls back to the network and keeps a copy for offline use."
          withoutTitle="products.ts (manual)"
          withoutCode={`async function getProducts() {
  try {
    const cached = await caches.match('/api/products')
    if (cached) {
      // Refresh in the background, but still return cache now
      fetch('/api/products').then((res) =>
        caches.open('app-cache').then((c) => c.put('/api/products', res)),
      )
      return cached.json()
    }

    const res = await fetch('/api/products')
    const cache = await caches.open('app-cache')
    cache.put('/api/products', res.clone())
    return res.json()
  } catch {
    const cached = await caches.match('/api/products')
    if (cached) return cached.json()
    throw new Error('Offline and no cache available')
  }
}`}
          withTitle="products.ts (eidos)"
          withCode={`import { resource } from '@sweidos/eidos'

export const products = resource('/api/products', {
  offline: true,
  strategy: 'cache-first',
})

// Anywhere in the app
const data = await products.json()`}
          live={<LiveCachedFetch />}
        />

        <Example
          title={SECTIONS[1]}
          description="A POST that must survive a dropped connection, retry automatically, and replay on reload."
          withoutTitle="orders.ts (manual)"
          withoutCode={`async function createOrder(payload: OrderPayload) {
  const item = { id: crypto.randomUUID(), payload, attempts: 0 }

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Request failed')
    return res.json()
  } catch {
    // Persist to IndexedDB so it survives a refresh
    await saveToQueue(item)
    // Hope something calls this on 'online' later
    window.addEventListener('online', () => replayQueue(), { once: true })
    return { queued: true, id: item.id }
  }
}

// ...plus the IndexedDB schema, replay logic,
// dedupe on reload, and retry/backoff you still need to write`}
          withTitle="orders.ts (eidos)"
          withCode={`import { action } from '@sweidos/eidos'

export const createOrder = action(
  async (payload: OrderPayload) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return res.json()
  },
  { reliability: 'neverLose', name: 'createOrder' },
)

// Call it like a normal async function — offline,
// retry, persistence, and replay are handled for you
await createOrder({ productId: 1, quantity: 2 })`}
          live={<LiveOfflineMutation />}
        />

        <Example
          title={SECTIONS[2]}
          description="Keep your existing TanStack Query setup and let Eidos own the offline-aware fetch."
          withoutTitle="queries.ts (manual)"
          withoutCode={`const { data } = useQuery({
  queryKey: ['products'],
  queryFn: async () => {
    const res = await fetch('/api/products')
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json()
  },
  // Still no offline cache, no replay,
  // no shared cache with the service worker
})

const mutation = useMutation({
  mutationFn: createOrder,
  onSuccess: () => queryClient.invalidateQueries(['products']),
})`}
          withTitle="queries.ts (eidos)"
          withCode={`import { useEidosMutation } from '@sweidos/eidos/query'

const { data } = useQuery(products.query<Product[]>())

const mutation = useEidosMutation(createOrder, {
  invalidates: [products],
})

// products is offline-aware; the mutation queues itself
// when offline and invalidates the query on success`}
          live={<LiveTanStackBridge />}
        />

        <Example
          title={SECTIONS[3]}
          description="Keep data fresh for a fixed window without writing a cache-expiry check yourself."
          withoutTitle="orders-history.ts (manual)"
          withoutCode={`let cache: { data: unknown; ts: number } | null = null
const MAX_AGE = 30_000

async function getOrdersHistory() {
  const now = Date.now()
  if (cache && now - cache.ts < MAX_AGE) {
    return cache.data
  }

  const res = await fetch('/api/orders-history')
  const data = await res.json()
  cache = { data, ts: now }
  return data
}`}
          withTitle="orders-history.ts (eidos)"
          withCode={`export const ordersHistory = resource('/api/orders-history', {
  offline: true,
  strategy: 'cache-first',
  maxAge: 30_000,
})

// Fresh within 30s, cache-first after that, offline-safe always
const data = await ordersHistory.json()`}
          live={<LiveTTLResource />}
        />

        <Example
          title={SECTIONS[4]}
          description="Drive a connection badge or status banner without wiring your own online/offline listeners."
          withoutTitle="StatusBadge.tsx (manual)"
          withoutCode={`function StatusBadge() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  // Still need to track pending/failed queue items separately
  return <span>{isOnline ? 'Online' : 'Offline'}</span>
}`}
          withTitle="StatusBadge.tsx (eidos)"
          withCode={`function StatusBadge() {
  const { isOnline, swStatus } = useEidosStatus()
  const { pending, failed } = useEidosQueueStats()

  return (
    <span>
      {isOnline ? 'Online' : 'Offline'} · {pending} pending · {failed} failed
    </span>
  )
}`}
          live={<LiveConnectionStatus />}
        />

        <Example
          title={SECTIONS[5]}
          description="Run a callback the moment the action queue finishes replaying — handy for toasts and refetches."
          withoutTitle="sync.ts (manual)"
          withoutCode={`let lastQueueLength = await getQueueLength()

setInterval(async () => {
  const length = await getQueueLength()
  if (lastQueueLength > 0 && length === 0) {
    showToast('All changes synced')
    refetchEverything()
  }
  lastQueueLength = length
}, 2000)

// Polling, drift, and cleanup all on you`}
          withTitle="sync.ts (eidos)"
          withCode={`useEidosOnDrain(() => {
  showToast('All changes synced')
  refetchEverything()
})

// Fires once, exactly when the queue goes from
// non-empty to empty — no polling`}
          live={<LiveQueueDrain />}
        />

        <Example
          title={SECTIONS[6]}
          description="Subscribe to Web Push and route notification clicks — headless, framework-agnostic, tree-shaken unless imported."
          withoutTitle="push.ts (manual)"
          withoutCode={`// Permission, subscribe, key conversion, click
// routing, resubscribe-on-rotation — all by hand
async function enablePush() {
  const reg = await navigator.serviceWorker.ready
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return

  const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key,
    })
  }

  await fetch('/api/push-subscribe', {
    method: 'POST',
    body: JSON.stringify(sub),
  })
}

// + a urlBase64ToUint8Array helper, + SW push/
// notificationclick/pushsubscriptionchange handlers`}
          withTitle="push.ts (eidos)"
          withCode={`import {
  registerPushHandlers,
  subscribeToPush,
} from '@sweidos/eidos/push'

// App init — any tab, no permission prompt
registerPushHandlers({
  onNotificationClick: (data) => router.push(data.url),
  onSubscriptionExpired: (sub) =>
    fetch('/api/push-subscribe', {
      method: 'POST',
      body: JSON.stringify(sub),
    }),
})

// User gesture — e.g. an "Enable notifications" button
async function enablePush() {
  const result = await subscribeToPush({
    vapidPublicKey: import.meta.env.VITE_EIDOS_VAPID_PUBLIC_KEY,
    onSubscribe: (sub) =>
      fetch('/api/push-subscribe', {
        method: 'POST',
        body: JSON.stringify(sub),
      }),
  })

  if (result.status === 'subscribed') toast('Notifications enabled')
  if (result.status === 'denied') toast('Permission denied')
}

// Generate keys once: npx @sweidos/eidos generate-vapid-keys`}
          live={<LivePushDemo />}
        />
      </div>
    </section>
  );
}
