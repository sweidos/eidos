interface StatusBadgeProps {
  status:
    | 'idle'
    | 'fetching'
    | 'fresh'
    | 'stale'
    | 'error'
    | 'offline'
    | 'pending'
    | 'replaying'
    | 'succeeded'
    | 'failed'
    | 'active'
    | 'registering'
    | 'unsupported'
    | 'cache-hit'
    | 'cache-updated';
}

const CONFIG: Record<string, { label: string; classes: string; dot: string }> = {
  idle: {
    label: 'idle',
    classes: 'bg-eidos-border         text-eidos-muted',
    dot: 'bg-eidos-muted',
  },
  fetching: {
    label: 'fetching',
    classes: 'bg-eidos-accent-dim    text-eidos-accent',
    dot: 'bg-eidos-accent animate-pulse',
  },
  fresh: {
    label: 'fresh',
    classes: 'bg-eidos-green-dim     text-eidos-green',
    dot: 'bg-eidos-green',
  },
  stale: {
    label: 'stale',
    classes: 'bg-eidos-amber-dim     text-eidos-amber',
    dot: 'bg-eidos-amber',
  },
  error: { label: 'error', classes: 'bg-eidos-red-dim       text-eidos-red', dot: 'bg-eidos-red' },
  offline: {
    label: 'offline',
    classes: 'bg-eidos-amber-dim     text-eidos-amber',
    dot: 'bg-eidos-amber',
  },
  pending: {
    label: 'pending',
    classes: 'bg-eidos-accent-dim    text-eidos-accent',
    dot: 'bg-eidos-accent',
  },
  replaying: {
    label: 'replaying',
    classes: 'bg-eidos-amber-dim     text-eidos-amber',
    dot: 'bg-eidos-amber animate-pulse',
  },
  succeeded: {
    label: 'succeeded',
    classes: 'bg-eidos-green-dim     text-eidos-green',
    dot: 'bg-eidos-green',
  },
  failed: {
    label: 'failed',
    classes: 'bg-eidos-red-dim       text-eidos-red',
    dot: 'bg-eidos-red',
  },
  active: {
    label: 'active',
    classes: 'bg-eidos-green-dim     text-eidos-green',
    dot: 'bg-eidos-green',
  },
  registering: {
    label: 'registering',
    classes: 'bg-eidos-amber-dim     text-eidos-amber',
    dot: 'bg-eidos-amber animate-pulse',
  },
  unsupported: {
    label: 'unsupported',
    classes: 'bg-eidos-red-dim       text-eidos-red',
    dot: 'bg-eidos-red',
  },
  'cache-hit': {
    label: 'cache hit',
    classes: 'bg-eidos-green-dim     text-eidos-green',
    dot: 'bg-eidos-green',
  },
  'cache-updated': {
    label: 'updated',
    classes: 'bg-eidos-accent-dim    text-eidos-accent',
    dot: 'bg-eidos-accent',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = CONFIG[status] ?? CONFIG.idle;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${cfg.classes}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
