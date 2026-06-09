import { Wifi, WifiOff, Cpu } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useEidosStatus, useEidosQueueStats, setOfflineSimulation, VERSION } from '@sweidos/eidos'
import { useState } from 'react'

const TABS = [
  { path: '/overview',  label: 'overview'  },
  { path: '/resources', label: 'resources' },
  { path: '/actions',   label: 'actions'   },
  { path: '/inspector', label: 'inspector' },
  { path: '/docs',      label: 'docs'      },
]

export function Header() {
  const { isOnline, swStatus } = useEidosStatus()
  const { pending: pendingCount, failed: failedCount } = useEidosQueueStats()
  const [simulating, setSimulating] = useState(false)

  function toggleSim() {
    const next = !simulating
    setSimulating(next)
    setOfflineSimulation(next)
  }

  return (
    <header className="shrink-0 border-b border-eidos-border bg-eidos-surface/90 backdrop-blur-md">
      {/* Top bar — brand + status */}
      <div className="flex flex-col gap-3 border-b border-eidos-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold tracking-[0.22em] text-eidos-accent">eidos</span>
          <span className="hidden text-eidos-border sm:inline">·</span>
          <span className="text-2xs text-eidos-muted">@sweidos/eidos v{VERSION}</span>
        </div>

        {/* Status chips */}
        <div className="flex flex-wrap items-center gap-2 text-2xs sm:justify-end">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
            swStatus === 'active'
              ? 'border-eidos-accent/30 text-eidos-accent'
              : swStatus === 'registering'
                ? 'border-eidos-amber/30 text-eidos-amber'
                : 'border-eidos-border text-eidos-muted'
          }`}>
            <Cpu size={10} />
            SW {swStatus}
          </span>

          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
            isOnline
              ? 'border-eidos-accent/30 text-eidos-accent'
              : 'border-eidos-amber/30 text-eidos-amber'
          }`}>
            {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
            {isOnline ? 'online' : 'offline'}
          </span>

          <button
            type="button"
            onClick={toggleSim}
            aria-pressed={simulating}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-2 transition-colors duration-150 cursor-pointer ${
              simulating
                ? 'border-eidos-amber text-eidos-amber bg-eidos-amber-dim'
                : 'border-eidos-border text-eidos-muted hover:border-eidos-elevated hover:text-eidos-text-dim'
            }`}
          >
            <WifiOff size={9} />
            {simulating ? 'stop sim' : 'sim offline'}
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="overflow-x-auto px-2 sm:px-4">
        <div className="flex min-w-max items-stretch gap-1 py-2">
        {TABS.map(tab => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) => `
              inline-flex min-h-9 items-center gap-1.5 rounded-full border px-4 text-xs transition-colors duration-150 cursor-pointer
              ${isActive
                ? 'border-eidos-accent/30 bg-eidos-accent-dim text-eidos-accent'
                : 'border-transparent text-eidos-muted hover:border-eidos-border hover:bg-eidos-bg/50 hover:text-eidos-text-dim'}
            `}
          >
            {tab.label}
            {tab.path === '/actions' && failedCount > 0 && (
              <span className="text-2xs bg-eidos-red text-white px-1 font-bold" aria-label={`${failedCount} failed`}>
                {failedCount}
              </span>
            )}
            {tab.path === '/actions' && pendingCount > 0 && (
              <span className="text-2xs bg-eidos-amber text-eidos-bg px-1 font-bold" aria-label={`${pendingCount} pending`}>
                {pendingCount}
              </span>
            )}
          </NavLink>
        ))}
        </div>
      </div>
    </header>
  )
}
