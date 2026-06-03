interface StatusBadgeProps {
  status: 'idle' | 'fetching' | 'fresh' | 'stale' | 'error' | 'offline'
    | 'pending' | 'replaying' | 'succeeded' | 'failed'
    | 'active' | 'registering' | 'unsupported' | 'cache-hit' | 'cache-updated'
}

const CONFIG: Record<string, { label: string; classes: string; dot: string }> = {
  idle:         { label: 'idle',         classes: 'bg-vardi-border         text-vardi-muted',     dot: 'bg-vardi-muted'  },
  fetching:     { label: 'fetching',     classes: 'bg-vardi-accent-dim    text-vardi-accent',    dot: 'bg-vardi-accent animate-pulse'  },
  fresh:        { label: 'fresh',        classes: 'bg-vardi-green-dim     text-vardi-green',     dot: 'bg-vardi-green'  },
  stale:        { label: 'stale',        classes: 'bg-vardi-amber-dim     text-vardi-amber',     dot: 'bg-vardi-amber'  },
  error:        { label: 'error',        classes: 'bg-vardi-red-dim       text-vardi-red',       dot: 'bg-vardi-red'    },
  offline:      { label: 'offline',      classes: 'bg-vardi-amber-dim     text-vardi-amber',     dot: 'bg-vardi-amber'  },
  pending:      { label: 'pending',      classes: 'bg-vardi-accent-dim    text-vardi-accent',    dot: 'bg-vardi-accent'  },
  replaying:    { label: 'replaying',    classes: 'bg-vardi-amber-dim     text-vardi-amber',     dot: 'bg-vardi-amber animate-pulse' },
  succeeded:    { label: 'succeeded',    classes: 'bg-vardi-green-dim     text-vardi-green',     dot: 'bg-vardi-green'  },
  failed:       { label: 'failed',       classes: 'bg-vardi-red-dim       text-vardi-red',       dot: 'bg-vardi-red'    },
  active:       { label: 'active',       classes: 'bg-vardi-green-dim     text-vardi-green',     dot: 'bg-vardi-green'  },
  registering:  { label: 'registering',  classes: 'bg-vardi-amber-dim     text-vardi-amber',     dot: 'bg-vardi-amber animate-pulse' },
  unsupported:  { label: 'unsupported',  classes: 'bg-vardi-red-dim       text-vardi-red',       dot: 'bg-vardi-red'    },
  'cache-hit':  { label: 'cache hit',    classes: 'bg-vardi-green-dim     text-vardi-green',     dot: 'bg-vardi-green'  },
  'cache-updated': { label: 'updated',  classes: 'bg-vardi-accent-dim    text-vardi-accent',    dot: 'bg-vardi-accent'  },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = CONFIG[status] ?? CONFIG.idle
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${cfg.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}
