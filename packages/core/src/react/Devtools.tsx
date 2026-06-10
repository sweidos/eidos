import { useState, useCallback } from 'react';
import { useEidosStatus, useEidosQueue, useEidosQueueStats, useEidosResources } from './hooks';
import { replayQueue, clearQueue } from '../action';
import { setOfflineSimulation } from '../sw-bridge';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EidosDevtoolsProps {
  /** Corner to anchor the panel. Default: 'bottom-right'. */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Start expanded. Default: false. */
  defaultOpen?: boolean;
}

type Tab = 'queue' | 'cache';

// ── Colours ───────────────────────────────────────────────────────────────────

const C = {
  bg: '#0f1117',
  surface: '#1a1d27',
  border: '#2a2d3a',
  text: '#e2e8f0',
  muted: '#64748b',
  green: '#22c55e',
  red: '#ef4444',
  yellow: '#f59e0b',
  blue: '#3b82f6',
  purple: '#a855f7',
  cyan: '#06b6d4',
} as const;

// ── Inline style helpers ──────────────────────────────────────────────────────

function pill(color: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '1px 7px',
    borderRadius: 9999,
    fontSize: 10,
    fontWeight: 600,
    background: `${color}22`,
    color,
    border: `1px solid ${color}44`,
    fontFamily: 'inherit',
  };
}

function btn(variant: 'ghost' | 'danger' | 'primary' = 'ghost'): React.CSSProperties {
  const base: React.CSSProperties = {
    cursor: 'pointer',
    border: 'none',
    borderRadius: 6,
    padding: '3px 10px',
    fontSize: 11,
    fontWeight: 500,
    fontFamily: 'inherit',
    transition: 'opacity 0.15s',
  };
  if (variant === 'danger') return { ...base, background: `${C.red}22`, color: C.red };
  if (variant === 'primary') return { ...base, background: `${C.blue}22`, color: C.blue };
  return { ...base, background: C.surface, color: C.muted };
}

// ── Status helpers ─────────────────────────────────────────────────────────────

function swStatusColor(s: string) {
  if (s === 'active') return C.green;
  if (s === 'registering') return C.yellow;
  if (s === 'error' || s === 'unsupported') return C.red;
  return C.muted;
}

function queueStatusColor(s: string) {
  if (s === 'succeeded') return C.green;
  if (s === 'failed') return C.red;
  if (s === 'replaying') return C.yellow;
  return C.blue;
}

function resourceStatusColor(s: string) {
  if (s === 'fresh') return C.green;
  if (s === 'stale' || s === 'offline') return C.yellow;
  if (s === 'error') return C.red;
  if (s === 'fetching') return C.cyan;
  return C.muted;
}

// ── Corner positions ──────────────────────────────────────────────────────────

function positionStyle(p: EidosDevtoolsProps['position']): React.CSSProperties {
  const base: React.CSSProperties = { position: 'fixed', zIndex: 99999 };
  if (p === 'bottom-left') return { ...base, bottom: 16, left: 16 };
  if (p === 'top-right') return { ...base, top: 16, right: 16 };
  if (p === 'top-left') return { ...base, top: 16, left: 16 };
  return { ...base, bottom: 16, right: 16 }; // default: bottom-right
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EidosDevtools({
  position = 'bottom-right',
  defaultOpen = false,
}: EidosDevtoolsProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [tab, setTab] = useState<Tab>('queue');
  const [simOffline, setSimOffline] = useState(false);

  const { isOnline, swStatus, swError } = useEidosStatus();
  const queue = useEidosQueue();
  const { pending, failed, replaying } = useEidosQueueStats();
  const resources = useEidosResources();
  const resourceList = Object.values(resources);

  const badgeCount = pending + failed + replaying;

  const toggleOffline = useCallback(() => {
    const next = !simOffline;
    setSimOffline(next);
    setOfflineSimulation(next);
  }, [simOffline]);

  const handleReplay = useCallback(() => {
    void replayQueue();
  }, []);
  const handleClear = useCallback(() => {
    void clearQueue();
  }, []);

  // ── Toggle button ─────────────────────────────────────────────────────────

  const toggleBtn = (
    <button
      onClick={() => setOpen((v) => !v)}
      title="Eidos Devtools"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 10px',
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 9999,
        cursor: 'pointer',
        color: C.text,
        fontSize: 11,
        fontWeight: 600,
        fontFamily: 'ui-monospace, "Cascadia Code", "Fira Mono", monospace',
        boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
        userSelect: 'none',
      }}
    >
      <span style={{ color: isOnline ? C.green : C.red, fontSize: 8 }}>●</span>
      <span style={{ color: C.cyan }}>⚡</span>
      <span>eidos</span>
      {badgeCount > 0 && (
        <span
          style={{
            background: failed > 0 ? C.red : C.yellow,
            color: '#fff',
            borderRadius: 9999,
            minWidth: 16,
            height: 16,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 9,
            fontWeight: 700,
            padding: '0 4px',
          }}
        >
          {badgeCount}
        </span>
      )}
    </button>
  );

  if (!open) {
    return <div style={positionStyle(position)}>{toggleBtn}</div>;
  }

  // ── Panel ─────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        ...positionStyle(position),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 6,
      }}
    >
      {/* Main panel */}
      <div
        style={{
          width: 340,
          maxHeight: 480,
          display: 'flex',
          flexDirection: 'column',
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          fontFamily: 'ui-monospace, "Cascadia Code", "Fira Mono", monospace',
          fontSize: 11,
          color: C.text,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: C.surface,
            borderBottom: `1px solid ${C.border}`,
            flexShrink: 0,
          }}
        >
          <span style={{ color: C.cyan, fontSize: 13 }}>⚡</span>
          <span style={{ fontWeight: 700, fontSize: 12, color: C.text, flex: 1 }}>
            Eidos Devtools
          </span>

          {/* Online/offline + simulation toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={pill(isOnline ? C.green : C.red)}>{isOnline ? 'online' : 'offline'}</span>
            <button
              onClick={toggleOffline}
              title={simOffline ? 'Disable offline simulation' : 'Enable offline simulation'}
              style={{
                ...btn('ghost'),
                background: simOffline ? `${C.yellow}22` : C.surface,
                color: simOffline ? C.yellow : C.muted,
                border: `1px solid ${simOffline ? C.yellow + '44' : C.border}`,
                fontSize: 10,
              }}
            >
              {simOffline ? '📡 simulating' : '✈ sim offline'}
            </button>
          </div>
        </div>

        {/* SW status row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderBottom: `1px solid ${C.border}`,
            flexShrink: 0,
            background: C.bg,
          }}
        >
          <span style={{ color: C.muted, fontSize: 10 }}>SW</span>
          <span style={pill(swStatusColor(swStatus))}>{swStatus}</span>
          {swError && (
            <span
              style={{
                color: C.red,
                fontSize: 10,
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {swError}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: `1px solid ${C.border}`,
            flexShrink: 0,
            background: C.surface,
          }}
        >
          {(['queue', 'cache'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: '6px 0',
                background: 'none',
                border: 'none',
                borderBottom: tab === t ? `2px solid ${C.cyan}` : '2px solid transparent',
                cursor: 'pointer',
                color: tab === t ? C.cyan : C.muted,
                fontSize: 11,
                fontWeight: tab === t ? 600 : 400,
                fontFamily: 'inherit',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {t === 'queue' ? `Queue (${queue.length})` : `Cache (${resourceList.length})`}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {tab === 'queue' ? (
            <QueueTab queue={queue} onReplay={handleReplay} onClear={handleClear} />
          ) : (
            <CacheTab resources={resourceList} />
          )}
        </div>
      </div>

      {/* Toggle button below panel */}
      {toggleBtn}
    </div>
  );
}

// ── Queue tab ─────────────────────────────────────────────────────────────────

function QueueTab({
  queue,
  onReplay,
  onClear,
}: {
  queue: ReturnType<typeof useEidosQueue>;
  onReplay: () => void;
  onClear: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Actions */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '8px 12px',
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
        }}
      >
        <button onClick={onReplay} style={btn('primary')}>
          ▶ Replay queue
        </button>
        <button onClick={onClear} style={btn('danger')}>
          ✕ Clear queue
        </button>
        <span style={{ marginLeft: 'auto', color: C.muted, fontSize: 10, alignSelf: 'center' }}>
          {queue.length} item{queue.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Items */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {queue.length === 0 ? (
          <div style={{ padding: '20px 12px', textAlign: 'center', color: C.muted }}>
            Queue empty
          </div>
        ) : (
          queue.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 12px',
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              <span style={pill(queueStatusColor(item.status))}>{item.status}</span>
              {item.priority && item.priority !== 'normal' && (
                <span style={pill(item.priority === 'high' ? C.purple : C.muted)}>
                  {item.priority}
                </span>
              )}
              <span
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: C.text,
                }}
              >
                {item.actionName}
              </span>
              {item.retryCount > 0 && (
                <span style={{ color: C.muted, fontSize: 10, flexShrink: 0 }}>
                  ×{item.retryCount}/{item.maxRetries}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Cache tab ─────────────────────────────────────────────────────────────────

function CacheTab({ resources }: { resources: ReturnType<typeof useEidosResources>[string][] }) {
  return (
    <div>
      {resources.length === 0 ? (
        <div style={{ padding: '20px 12px', textAlign: 'center', color: C.muted }}>
          No resources registered
        </div>
      ) : (
        resources.map((res) => (
          <div
            key={res.url}
            style={{
              padding: '7px 12px',
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={pill(resourceStatusColor(res.status))}>{res.status}</span>
              <span style={{ color: C.muted, fontSize: 10 }}>{res.strategy.name}</span>
            </div>
            <div
              style={{
                color: C.text,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: 10,
                marginBottom: 2,
              }}
            >
              {res.url}
            </div>
            <div style={{ display: 'flex', gap: 10, color: C.muted, fontSize: 10 }}>
              <span title="Cache hits">
                ↑{res.cacheHits} hit{res.cacheHits !== 1 ? 's' : ''}
              </span>
              <span title="Cache misses">
                ↓{res.cacheMisses} miss{res.cacheMisses !== 1 ? 'es' : ''}
              </span>
              {res.cachedAt && (
                <span title="Cached at">⏱ {new Date(res.cachedAt).toLocaleTimeString()}</span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
