import { useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  useEidosResource,
  useEidosStatus,
  useEidosQueueStats,
  useEidosOnDrain,
  replayQueue,
} from '@sweidos/eidos';
import { useEidosMutation } from '@sweidos/eidos/query';
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
    <div className="flex flex-col gap-2 rounded-lg border border-eidos-border bg-eidos-elevated/40 p-3">
      <LiveBadge />
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function RunButton({
  onClick,
  loading,
  children,
}: {
  onClick: () => void;
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-eidos-border px-3 py-1.5 text-xs font-medium text-eidos-text-dim transition-colors hover:border-eidos-accent hover:text-eidos-text disabled:opacity-50 cursor-pointer"
    >
      {children}
    </button>
  );
}

function Stat({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`text-xs text-eidos-text-dim ${className}`}>{children}</span>;
}

const STATUS_COLOR: Record<string, string> = {
  idle: 'text-eidos-muted',
  fetching: 'text-eidos-blue',
  fresh: 'text-eidos-accent',
  stale: 'text-eidos-amber',
  error: 'text-eidos-red',
  offline: 'text-eidos-amber',
};

export function LiveCachedFetch() {
  const entry = useEidosResource('/api/products');
  const [data, setData] = useState<Product[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      setData(await productsResource.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <LiveBox>
      <RunButton onClick={run} loading={loading}>
        Fetch /api/products
      </RunButton>
      <Stat>
        status:{' '}
        <span className={STATUS_COLOR[entry?.status ?? 'idle']}>{entry?.status ?? 'idle'}</span>
      </Stat>
      {data && (
        <Stat>
          {data.length} products{entry?.lastEvent === 'cache-hit' ? ' · served from cache' : ''}
        </Stat>
      )}
    </LiveBox>
  );
}

export function LiveOfflineMutation() {
  const { pending, failed } = useEidosQueueStats();
  const { isOnline } = useEidosStatus();
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const res = await createOrder({ productId: 1, quantity: 1, customerName: 'Docs Demo' });
      setResult(
        'queued' in res ? `Queued for replay (${res.id.slice(0, 8)})` : `Created order ${res.id}`,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <LiveBox>
      <RunButton onClick={run} loading={loading}>
        Place order
      </RunButton>
      <RunButton onClick={() => replayQueue()}>Replay queue</RunButton>
      <Stat>
        {isOnline ? 'online' : 'offline'} · pending: {pending} · failed: {failed}
      </Stat>
      {result && <Stat>{result}</Stat>}
    </LiveBox>
  );
}

export function LiveTanStackBridge() {
  const { data, isFetching, refetch } = useQuery(productsResource.query());
  const mutation = useEidosMutation(createOrder, { invalidates: [productsResource] });

  return (
    <LiveBox>
      <RunButton onClick={() => refetch()} loading={isFetching}>
        Refetch products
      </RunButton>
      <RunButton
        onClick={() => mutation.mutate({ productId: 2, quantity: 1, customerName: 'Docs Demo' })}
        loading={mutation.isPending}
      >
        Create order
      </RunButton>
      <Stat>{isFetching ? 'fetching…' : `${data?.length ?? 0} products cached`}</Stat>
      {mutation.isSuccess && <Stat>order created · cache invalidated</Stat>}
    </LiveBox>
  );
}

export function LiveTTLResource() {
  const entry = useEidosResource('/api/orders-history');
  const [data, setData] = useState<Order[] | null>(null);
  const [age, setAge] = useState<number | null>(null);

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

  return (
    <LiveBox>
      <RunButton onClick={run}>Fetch /api/orders-history</RunButton>
      <Stat>
        status:{' '}
        <span className={STATUS_COLOR[entry?.status ?? 'idle']}>{entry?.status ?? 'idle'}</span>
      </Stat>
      {age !== null && (
        <Stat>
          fetched {age}s ago · {age < 30 ? 'fresh' : 'stale'} (maxAge 30s)
        </Stat>
      )}
      {data && <Stat>{data.length} orders</Stat>}
    </LiveBox>
  );
}

export function LiveConnectionStatus() {
  const { isOnline, swStatus } = useEidosStatus();
  const { pending, failed, total } = useEidosQueueStats();

  return (
    <LiveBox>
      <Stat>
        connection:{' '}
        <span className={isOnline ? 'text-eidos-accent' : 'text-eidos-amber'}>
          {isOnline ? 'online' : 'offline'}
        </span>{' '}
        · sw: {swStatus}
      </Stat>
      <Stat>
        queue: {total} total · {pending} pending · {failed} failed
      </Stat>
      <Stat className="text-eidos-muted">
        Toggle &ldquo;sim offline&rdquo; in the header to see this update live.
      </Stat>
    </LiveBox>
  );
}

export function LiveQueueDrain() {
  const [message, setMessage] = useState<string | null>(null);
  const { pending } = useEidosQueueStats();
  const [loading, setLoading] = useState(false);

  useEidosOnDrain(() => setMessage(`Queue drained at ${new Date().toLocaleTimeString()}`));

  async function run() {
    setLoading(true);
    setMessage(null);
    try {
      await createOrder({ productId: 1, quantity: 1, customerName: 'Docs Demo' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <LiveBox>
      <RunButton onClick={run} loading={loading}>
        Queue an order
      </RunButton>
      <RunButton onClick={() => replayQueue()}>Replay queue</RunButton>
      <Stat>pending: {pending}</Stat>
      {message && <Stat>{message}</Stat>}
    </LiveBox>
  );
}
