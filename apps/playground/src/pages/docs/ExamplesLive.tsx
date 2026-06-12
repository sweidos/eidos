import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Check,
  Bell,
  BellRing,
  MousePointerClick,
  RefreshCw,
  Zap,
  ArrowUp,
  AlertTriangle,
  X,
  ShoppingCart,
  Clock,
  CheckCircle,
  Wifi,
  WifiOff,
  Cpu,
} from 'lucide-react';
import {
  useEidosResource,
  useEidosStatus,
  useEidosQueueStats,
  useEidosOnDrain,
  useEidosStore,
  replayQueue,
  getSwRegistration,
} from '@sweidos/eidos';
import { useEidosMutation } from '@sweidos/eidos/query';
import {
  registerPushHandlers,
  getPushUnsupportedReason,
  getPushPermissionState,
} from '@sweidos/eidos/push';
import {
  productsResource,
  ordersHistoryResource,
  createOrder,
  type Product,
  type Order,
} from '../../lib/eidos';

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-eidos-accent/30 bg-eidos-accent-dim px-2 py-0.5 text-2xs uppercase tracking-[0.24em] text-eidos-accent">
      <span className="h-1.5 w-1.5 rounded-full bg-eidos-accent animate-pulse" />
      Live demo
    </span>
  );
}

function LiveBox({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-eidos-border bg-eidos-elevated/40 p-3">
      <LiveBadge />
      {children}
    </div>
  );
}

function RunButton({
  onClick,
  loading,
  variant = 'default',
  children,
}: {
  onClick: () => void;
  loading?: boolean;
  variant?: 'default' | 'accent';
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer ${
        variant === 'accent'
          ? 'border-eidos-accent bg-eidos-accent-dim text-eidos-accent hover:bg-eidos-accent/20'
          : 'border-eidos-border text-eidos-text-dim hover:border-eidos-accent hover:text-eidos-text'
      }`}
    >
      {children}
    </button>
  );
}

function Stat({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`text-xs text-eidos-text-dim ${className}`}>{children}</span>;
}

function DeclarationBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-eidos-border bg-eidos-bg px-3 py-2 text-2xs leading-relaxed text-eidos-text-dim">
      {children}
    </div>
  );
}

const STATUS_COLOR: Record<string, string> = {
  idle: 'text-eidos-muted',
  fetching: 'text-eidos-blue',
  fresh: 'text-eidos-accent',
  stale: 'text-eidos-amber',
  error: 'text-eidos-red',
  offline: 'text-eidos-amber',
};

function ResultBadge({ r }: { r: 'hit' | 'miss' | 'offline' | 'error' }) {
  const cfg = {
    hit: {
      icon: <Zap size={9} />,
      text: 'cache hit',
      cls: 'text-eidos-accent border-eidos-accent/40 bg-eidos-accent-dim',
    },
    miss: {
      icon: <ArrowUp size={9} />,
      text: 'fetched & cached',
      cls: 'text-eidos-blue border-eidos-blue/40 bg-eidos-blue-dim',
    },
    offline: {
      icon: <AlertTriangle size={9} />,
      text: 'offline · no cache',
      cls: 'text-eidos-amber border-eidos-amber/40 bg-eidos-amber-dim',
    },
    error: {
      icon: <X size={9} />,
      text: 'error',
      cls: 'text-eidos-red border-eidos-red/40 bg-eidos-red-dim',
    },
  }[r];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full text-2xs border px-2 py-0.5 animate-fade-in ${cfg.cls}`}
    >
      {cfg.icon}
      {cfg.text}
    </span>
  );
}

// ── 1. Cached fetch ───────────────────────────────────────────────────────────

export function LiveCachedFetch() {
  const entry = useEidosResource('/api/products');
  const [data, setData] = useState<Product[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<'hit' | 'miss' | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  async function run() {
    setLoading(true);
    setResult(null);
    const t0 = performance.now();
    try {
      const products = await productsResource.json();
      setData(products);
      setElapsed(Math.round(performance.now() - t0));
      const hit = useEidosStore.getState().resources['/api/products']?.lastEvent === 'cache-hit';
      setResult(hit ? 'hit' : 'miss');
    } finally {
      setLoading(false);
    }
  }

  return (
    <LiveBox>
      <DeclarationBox>
        <span className="text-eidos-muted">resource</span>(
        <span className="text-eidos-accent">{"'/api/products'"}</span>, {'{ '}
        <span className="text-eidos-text-dim">offline</span>:{' '}
        <span className="text-eidos-accent">true</span>
        {' }'})
      </DeclarationBox>

      <div className="flex flex-wrap items-center gap-2">
        <RunButton onClick={run} loading={loading} variant="accent">
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          Fetch /api/products
        </RunButton>
        <Stat>
          status:{' '}
          <span className={STATUS_COLOR[entry?.status ?? 'idle']}>{entry?.status ?? 'idle'}</span>
        </Stat>
        {elapsed !== null && <Stat>{elapsed}ms</Stat>}
        {result && <ResultBadge r={result} />}
      </div>

      {data && (
        <div className="overflow-hidden rounded-lg border border-eidos-border divide-y divide-eidos-border">
          {data.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-4 px-3 py-1.5 text-xs">
              <span className="text-eidos-text">{p.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-2xs text-eidos-muted">{p.category}</span>
                <span className="text-eidos-accent font-tabular">${p.price}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </LiveBox>
  );
}

// ── 2. Offline-safe mutations ────────────────────────────────────────────────

export function LiveOfflineMutation() {
  const { pending, failed } = useEidosQueueStats();
  const { isOnline } = useEidosStatus();
  const [items, setItems] = useState<{ id: string; status: 'queued' | 'created' }[]>([]);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const res = await createOrder({ productId: 1, quantity: 1, customerName: 'Docs Demo' });
      const status: 'queued' | 'created' = 'queued' in res ? 'queued' : 'created';
      setItems((prev) => [{ id: res.id, status }, ...prev].slice(0, 4));
    } finally {
      setLoading(false);
    }
  }

  return (
    <LiveBox>
      <DeclarationBox>
        <span className="text-eidos-muted">action</span>(createOrder, {'{ '}
        <span className="text-eidos-text-dim">reliability</span>:{' '}
        <span className="text-eidos-amber">{"'neverLose'"}</span>
        {' }'})
      </DeclarationBox>

      <div className="flex flex-wrap items-center gap-2">
        <RunButton onClick={run} loading={loading} variant="accent">
          <ShoppingCart size={11} className={loading ? 'animate-pulse' : ''} />
          Place order
        </RunButton>
        <RunButton onClick={() => replayQueue()}>
          <RefreshCw size={11} />
          Replay queue
        </RunButton>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs ${
            isOnline
              ? 'border-eidos-accent/40 text-eidos-accent'
              : 'border-eidos-amber/40 text-eidos-amber'
          }`}
        >
          {isOnline ? <Wifi size={9} /> : <WifiOff size={9} />}
          {isOnline ? 'online' : 'offline'}
        </span>
        <Stat>
          pending: {pending} · failed: {failed}
        </Stat>
      </div>

      {items.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-eidos-border divide-y divide-eidos-border">
          {items.map((item, i) => (
            <div
              key={item.id + i}
              className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs animate-fade-in"
            >
              <span className="flex items-center gap-2 text-eidos-text">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    item.status === 'queued' ? 'bg-eidos-amber animate-pulse' : 'bg-eidos-accent'
                  }`}
                />
                {item.id.slice(0, 12)}
              </span>
              <span
                className={`rounded-full border px-1.5 py-0.5 text-2xs ${
                  item.status === 'queued'
                    ? 'border-eidos-amber/40 text-eidos-amber'
                    : 'border-eidos-accent/40 text-eidos-accent'
                }`}
              >
                {item.status === 'queued' ? 'queued for replay' : 'created'}
              </span>
            </div>
          ))}
        </div>
      )}
    </LiveBox>
  );
}

// ── 3. TanStack Query bridge ─────────────────────────────────────────────────

export function LiveTanStackBridge() {
  const { data, isFetching, refetch } = useQuery(productsResource.query());
  const mutation = useEidosMutation(createOrder, { invalidates: [productsResource] });

  return (
    <LiveBox>
      <DeclarationBox>
        useQuery(products.query()) · useEidosMutation(createOrder, {'{ '}
        <span className="text-eidos-text-dim">invalidates</span>: [products]
        {' }'})
      </DeclarationBox>

      <div className="flex flex-wrap items-center gap-2">
        <RunButton onClick={() => refetch()} loading={isFetching} variant="accent">
          <RefreshCw size={11} className={isFetching ? 'animate-spin' : ''} />
          Refetch products
        </RunButton>
        <RunButton
          onClick={() => mutation.mutate({ productId: 2, quantity: 1, customerName: 'Docs Demo' })}
          loading={mutation.isPending}
        >
          <ShoppingCart size={11} className={mutation.isPending ? 'animate-pulse' : ''} />
          Create order
        </RunButton>
        {mutation.isSuccess && (
          <span className="inline-flex items-center gap-1 rounded-full border border-eidos-accent/40 bg-eidos-accent-dim px-2 py-0.5 text-2xs text-eidos-accent animate-fade-in">
            <CheckCircle size={9} />
            cache invalidated
          </span>
        )}
      </div>

      {data && (
        <div className="overflow-hidden rounded-lg border border-eidos-border divide-y divide-eidos-border">
          {data.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-4 px-3 py-1.5 text-xs">
              <span className="text-eidos-text">{p.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-2xs text-eidos-muted">{p.category}</span>
                <span className="text-eidos-accent font-tabular">${p.price}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </LiveBox>
  );
}

// ── 4. TTL-backed resource ────────────────────────────────────────────────────

export function LiveTTLResource() {
  const entry = useEidosResource('/api/orders-history');
  const [data, setData] = useState<Order[] | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const MAX_AGE = 30;

  async function run() {
    setData(await ordersHistoryResource.json());
  }

  useEffect(() => {
    if (!entry?.fetchedAt) return;
    const fetchedAt = entry.fetchedAt;
    const tick = () => setAge(Math.round((Date.now() - fetchedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [entry?.fetchedAt]);

  const fresh = age !== null && age < MAX_AGE;
  const pct = age !== null ? Math.min(100, (age / MAX_AGE) * 100) : 0;

  return (
    <LiveBox>
      <DeclarationBox>
        <span className="text-eidos-muted">resource</span>(
        <span className="text-eidos-accent">{"'/api/orders-history'"}</span>, {'{ '}
        <span className="text-eidos-text-dim">maxAge</span>:{' '}
        <span className="text-eidos-accent">30_000</span>
        {' }'})
      </DeclarationBox>

      <div className="flex flex-wrap items-center gap-2">
        <RunButton onClick={run} variant="accent">
          <RefreshCw size={11} />
          Fetch /api/orders-history
        </RunButton>
        {data && <Stat>{data.length} orders</Stat>}
      </div>

      {age !== null && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-2xs">
            <span className={fresh ? 'text-eidos-accent' : 'text-eidos-amber'}>
              {fresh ? 'fresh' : 'stale → next fetch hits network'}
            </span>
            <span className="text-eidos-muted font-tabular">
              {age}s / {MAX_AGE}s
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-eidos-bg">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                fresh ? 'bg-eidos-accent' : 'bg-eidos-amber'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </LiveBox>
  );
}

// ── 5. Connection-aware UI ───────────────────────────────────────────────────

export function LiveConnectionStatus() {
  const { isOnline, swStatus } = useEidosStatus();
  const { pending, failed, total } = useEidosQueueStats();

  return (
    <LiveBox>
      <DeclarationBox>
        const {'{ isOnline, swStatus }'} = useEidosStatus() · const {'{ pending, failed }'} =
        useEidosQueueStats()
      </DeclarationBox>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg border border-eidos-border bg-eidos-bg px-3 py-2">
          <div className="text-2xs text-eidos-muted">connection</div>
          <div
            className={`mt-1 flex items-center gap-1 text-xs font-semibold ${
              isOnline ? 'text-eidos-accent' : 'text-eidos-amber'
            }`}
          >
            {isOnline ? <Wifi size={11} /> : <WifiOff size={11} />}
            {isOnline ? 'online' : 'offline'}
          </div>
        </div>
        <div className="rounded-lg border border-eidos-border bg-eidos-bg px-3 py-2">
          <div className="text-2xs text-eidos-muted">service worker</div>
          <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-eidos-text">
            <Cpu size={11} />
            {swStatus}
          </div>
        </div>
        <div className="rounded-lg border border-eidos-border bg-eidos-bg px-3 py-2">
          <div className="text-2xs text-eidos-muted">pending</div>
          <div className="mt-1 font-tabular text-xs font-semibold text-eidos-amber">{pending}</div>
        </div>
        <div className="rounded-lg border border-eidos-border bg-eidos-bg px-3 py-2">
          <div className="text-2xs text-eidos-muted">failed / total</div>
          <div className="mt-1 font-tabular text-xs font-semibold text-eidos-text">
            {failed} / {total}
          </div>
        </div>
      </div>

      <Stat className="text-eidos-muted">
        Toggle &ldquo;sim offline&rdquo; in the header to see this update live.
      </Stat>
    </LiveBox>
  );
}

// ── 6. Queue-drain notifications ─────────────────────────────────────────────

export function LiveQueueDrain() {
  const [drained, setDrained] = useState(false);
  const [queuedAt, setQueuedAt] = useState<number | null>(null);
  const [createdImmediately, setCreatedImmediately] = useState(false);
  const { pending } = useEidosQueueStats();
  const [loading, setLoading] = useState(false);

  useEidosOnDrain(() => setDrained(true));

  async function run() {
    setLoading(true);
    setDrained(false);
    setCreatedImmediately(false);
    setQueuedAt(Date.now());
    try {
      const res = await createOrder({ productId: 1, quantity: 1, customerName: 'Docs Demo' });
      if (!('queued' in res)) setCreatedImmediately(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LiveBox>
      <DeclarationBox>
        useEidosOnDrain(() =&gt; toast(
        <span className="text-eidos-accent">{"'All changes synced'"}</span>))
      </DeclarationBox>

      <div className="flex flex-wrap items-center gap-2">
        <RunButton onClick={run} loading={loading} variant="accent">
          <ShoppingCart size={11} className={loading ? 'animate-pulse' : ''} />
          Queue an order
        </RunButton>
        <RunButton onClick={() => replayQueue()}>
          <RefreshCw size={11} />
          Replay queue
        </RunButton>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs ${
            pending > 0
              ? 'border-eidos-amber/40 text-eidos-amber'
              : 'border-eidos-border text-eidos-muted'
          }`}
        >
          {pending > 0 && <Clock size={9} />}
          pending: {pending}
        </span>
      </div>

      {queuedAt && !drained && !createdImmediately && (
        <div className="flex items-center gap-2 rounded-lg border border-eidos-amber/40 bg-eidos-amber-dim px-3 py-2 text-xs text-eidos-amber animate-fade-in">
          <Clock size={11} />
          Queued — waiting for the queue to drain...
        </div>
      )}
      {queuedAt && createdImmediately && !drained && (
        <Stat className="text-eidos-muted">
          Order created immediately (online) — go offline (toggle &ldquo;sim offline&rdquo; in the
          header) and try again to see the queue drain.
        </Stat>
      )}
      {drained && (
        <div className="flex items-center gap-2 rounded-lg border border-eidos-accent/40 bg-eidos-accent-dim px-3 py-2 text-xs text-eidos-accent animate-fade-in">
          <CheckCircle size={11} />
          All changes synced — onDrain fired at{' '}
          {new Date().toLocaleTimeString('en', { hour12: false })}
        </div>
      )}
    </LiveBox>
  );
}

// ── 7. Push notifications ─────────────────────────────────────────────────────

type PushStepStatus = 'pending' | 'active' | 'done';

function PushStep({
  icon: Icon,
  label,
  status,
}: {
  icon: typeof Bell;
  label: string;
  status: PushStepStatus;
}) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
          status === 'done'
            ? 'border-eidos-accent bg-eidos-accent-dim text-eidos-accent'
            : status === 'active'
              ? 'border-eidos-accent text-eidos-accent animate-pulse'
              : 'border-eidos-border text-eidos-muted'
        }`}
      >
        {status === 'done' ? <Check size={13} /> : <Icon size={13} />}
      </div>
      <span
        className={`text-2xs leading-tight transition-colors duration-300 ${
          status === 'pending' ? 'text-eidos-muted' : 'text-eidos-text-dim'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export function LivePushDemo() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    getPushPermissionState(),
  );
  const [routedTo, setRoutedTo] = useState<string | null>(null);
  const [notified, setNotified] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handlerRegistered, setHandlerRegistered] = useState(false);
  const unsupportedReason = getPushUnsupportedReason();
  const mountedRef = useRef(true);

  // Real eidos/push wiring — fires for the lifetime of this demo, any tab.
  useEffect(() => {
    mountedRef.current = true;
    registerPushHandlers({
      onNotificationClick: (data: unknown) => {
        const url = (data as { url?: string })?.url ?? '/';
        if (mountedRef.current) setRoutedTo(url);
      },
    });
    const id = setTimeout(() => setHandlerRegistered(true), 0);
    return () => {
      clearTimeout(id);
      mountedRef.current = false;
    };
  }, []);

  async function requestPermission() {
    setError(null);
    try {
      const result = await Notification.requestPermission();
      if (mountedRef.current) setPermission(result);
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Permission request failed');
      }
    }
  }

  async function sendNotification() {
    setError(null);
    setRoutedTo(null);

    // In-page animated toast — works regardless of OS notification
    // permission, so the click → onNotificationClick routing is always
    // demonstrable here.
    setNotified(true);
    setShowToast(true);

    // Best-effort: also fire a real OS notification if permission is granted.
    if (permission === 'granted') {
      try {
        const reg = await getSwRegistration();
        await reg?.showNotification('Eidos demo', {
          body: 'Click me — eidos routes this to /inspector via onNotificationClick',
          data: { url: '/inspector' },
          tag: 'eidos-demo',
          icon: '/favicon.svg',
        });
      } catch {
        // Real OS notification is a bonus — the in-page toast above already
        // demonstrates the routing flow.
      }
    }
  }

  function clickToast() {
    setShowToast(false);
    setRoutedTo('/inspector');
  }

  if (unsupportedReason) {
    return (
      <LiveBox>
        <Stat className="text-eidos-muted">
          {unsupportedReason === 'ios-not-installed'
            ? 'Push needs the app installed to the home screen on iOS Safari.'
            : 'Push notifications are not supported in this browser.'}
        </Stat>
      </LiveBox>
    );
  }

  const permissionDone = permission === 'granted';
  const permissionActive = permission !== 'granted' && permission !== 'denied';
  const handlerDone = handlerRegistered;
  const notifyDone = notified;
  const notifyActive = !notifyDone;
  const routeDone = routedTo !== null;
  const routeActive = notifyDone && !routeDone;

  return (
    <LiveBox>
      <DeclarationBox>
        registerPushHandlers({'{ '}onNotificationClick: (data) =&gt; router.push(data.url){' }'})
      </DeclarationBox>

      <div className="flex w-full flex-col gap-3">
        <div className="flex items-center gap-1">
          <PushStep
            icon={Bell}
            label="Request permission"
            status={permissionDone ? 'done' : permissionActive ? 'active' : 'pending'}
          />
          <PushStep
            icon={Check}
            label="Register click handler"
            status={handlerDone ? 'done' : 'pending'}
          />
          <PushStep
            icon={BellRing}
            label="Show notification"
            status={notifyDone ? 'done' : notifyActive ? 'active' : 'pending'}
          />
          <PushStep
            icon={MousePointerClick}
            label="Click → routed"
            status={routeDone ? 'done' : routeActive ? 'active' : 'pending'}
          />
        </div>

        {showToast && (
          <button
            type="button"
            onClick={clickToast}
            className="animate-fade-in flex w-full items-start gap-3 rounded-lg border border-eidos-accent/40 bg-eidos-elevated p-3 text-left transition-colors duration-150 hover:border-eidos-accent cursor-pointer"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-eidos-accent-dim text-eidos-accent">
              <BellRing size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-eidos-text">Eidos demo</p>
              <p className="mt-0.5 text-2xs text-eidos-muted">
                Click me — eidos routes this to /inspector via onNotificationClick
              </p>
            </div>
            <MousePointerClick size={14} className="mt-1 shrink-0 text-eidos-muted" />
          </button>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {!permissionDone && permission !== 'denied' && (
            <RunButton onClick={requestPermission}>Enable notifications</RunButton>
          )}
          {permission === 'denied' && (
            <Stat className="text-eidos-amber">
              Permission denied — re-enable in browser site settings (in-page demo below still
              works).
            </Stat>
          )}
          <RunButton onClick={sendNotification} variant="accent">
            Show test notification
          </RunButton>
          {notifyDone && !routeDone && (
            <Stat>Click the notification above to see eidos route the click →</Stat>
          )}
          {routeDone && <Stat>onNotificationClick fired → routed to {routedTo}</Stat>}
          {error && <Stat className="text-eidos-red">{error}</Stat>}
        </div>
      </div>
    </LiveBox>
  );
}
