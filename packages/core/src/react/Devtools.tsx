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
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    transition: 'background-color 0.15s, color 0.15s',
  };
  if (variant === 'danger') return { ...base, background: `${C.red}22`, color: C.red };
  if (variant === 'primary') return { ...base, background: `${C.blue}22`, color: C.blue };
  return { ...base, background: C.surface, color: C.muted };
}

// Visible keyboard focus ring — applied via onFocus/onBlur since this
// component ships without a stylesheet (no :focus-visible pseudo-class).
const focusRing: React.CSSProperties = { outline: `2px solid ${C.cyan}`, outlineOffset: 1 };
function withFocusRing(handlers: { onFocus?: () => void; onBlur?: () => void } = {}) {
  return {
    onFocus: (e: React.FocusEvent<HTMLButtonElement>) => {
      Object.assign(e.currentTarget.style, focusRing);
      handlers.onFocus?.();
    },
    onBlur: (e: React.FocusEvent<HTMLButtonElement>) => {
      e.currentTarget.style.outline = 'none';
      handlers.onBlur?.();
    },
  };
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

// ── Icons (inline SVG — no external icon dependency) ─────────────────────────

function Icon({
  path,
  size = 12,
  strokeWidth = 2,
}: {
  path: string;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d={path} />
    </svg>
  );
}

const ICONS = {
  bolt: 'M13 2 3 14h7l-1 8 10-12h-7l1-8z',
  satellite: 'M5 13a8.5 8.5 0 0 0 8 8M11 3a12 12 0 0 1 10 10M5 13l-3 3 6 6 3-3M14 6l4 4M9.5 8.5l6 6',
  satelliteOff: 'M2 2l20 20M5 13a8.5 8.5 0 0 0 8 8M14 6l4 4M9.5 8.5l6 6M5 13l-3 3 6 6 3-3',
  play: 'M6 4l13 8-13 8V4z',
  trash: 'M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1L4 6h16z',
  arrowUp: 'M12 19V5M5 12l7-7 7 7',
  arrowDown: 'M12 5v14M19 12l-7 7-7-7',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
} as const;

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
      aria-expanded={open}
      aria-label={open ? 'Close Eidos Devtools' : 'Open Eidos Devtools'}
      title="Eidos Devtools"
      {...withFocusRing()}
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
        minHeight: 32,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: isOnline ? C.green : C.red,
          flexShrink: 0,
        }}
      />
      <span style={{ color: C.cyan, display: 'inline-flex' }}>
        <Icon path={ICONS.bolt} size={12} />
      </span>
      <span>eidos</span>
      {badgeCount > 0 && (
        <span
          aria-label={`${badgeCount} ${failed > 0 ? 'failed' : 'pending'} queue item${badgeCount !== 1 ? 's' : ''}`}
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
              aria-pressed={simOffline}
              title={simOffline ? 'Disable offline simulation' : 'Enable offline simulation'}
              {...withFocusRing()}
              style={{
                ...btn('ghost'),
                background: simOffline ? `${C.yellow}22` : C.surface,
                color: simOffline ? C.yellow : C.muted,
                border: `1px solid ${simOffline ? C.yellow + '44' : C.border}`,
                fontSize: 10,
                minHeight: 22,
              }}
            >
              <Icon path={simOffline ? ICONS.satelliteOff : ICONS.satellite} size={11} />
              {simOffline ? 'simulating offline' : 'sim offline'}
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
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              {...withFocusRing()}
              style={{
                flex: 1,
                padding: '6px 0',
                minHeight: 32,
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
                transition: 'color 0.15s, border-color 0.15s',
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
        <button onClick={onReplay} {...withFocusRing()} style={{ ...btn('primary'), minHeight: 24 }}>
          <Icon path={ICONS.play} size={11} />
          Replay queue
        </button>
        <button onClick={onClear} {...withFocusRing()} style={{ ...btn('danger'), minHeight: 24 }}>
          <Icon path={ICONS.trash} size={11} />
          Clear queue
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
              <span title="Cache hits" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Icon path={ICONS.arrowUp} size={10} />
                {res.cacheHits} hit{res.cacheHits !== 1 ? 's' : ''}
              </span>
              <span
                title="Cache misses"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}
              >
                <Icon path={ICONS.arrowDown} size={10} />
                {res.cacheMisses} miss{res.cacheMisses !== 1 ? 'es' : ''}
              </span>
              {res.cachedAt && (
                <span
                  title="Cached at"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}
                >
                  <Icon path={ICONS.clock} size={10} />
                  {new Date(res.cachedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
