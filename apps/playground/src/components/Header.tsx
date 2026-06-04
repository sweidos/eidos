import { Wifi, WifiOff, Cpu } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useEidosStatus, setOfflineSimulation, useEidosStore } from '@sweidos/eidos'
import { useState } from 'react'

const TABS = [
  { path: '/demo',      label: 'demo'      },
  { path: '/resources', label: 'resources' },
  { path: '/actions',   label: 'actions'   },
  { path: '/inspector', label: 'inspector' },
  { path: '/learn',     label: 'api'       },
]

export function Header() {
  const { isOnline, swStatus } = useEidosStatus()
  const pendingCount = useEidosStore(s => s.queue.filter(q => q.status === 'pending').length)
  const [simulating, setSimulating] = useState(false)

  function toggleSim() {
    const next = !simulating
    setSimulating(next)
    setOfflineSimulation(next)
  }

  return (
    <header className="shrink-0 border-b border-eidos-border bg-eidos-surface">
      {/* Top bar — brand + status */}
      <div className="flex items-center justify-between px-4 h-10 border-b border-eidos-border">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <span className="text-eidos-accent font-bold text-sm tracking-tight">eidos</span>
          <span className="text-eidos-border">·</span>
          <span className="text-2xs text-eidos-muted">@sweidos/eidos v0.1.0</span>
        </div>

        {/* Status chips */}
        <div className="flex items-center gap-4 text-2xs">
          {/* SW status */}
          <span className={`flex items-center gap-1.5 ${
            swStatus === 'active' ? 'text-eidos-accent' :
            swStatus === 'registering' ? 'text-eidos-amber' : 'text-eidos-muted'
          }`}>
            <Cpu size={10} />
            SW {swStatus}
          </span>

          <span className="text-eidos-border">|</span>

          {/* Online/offline */}
          <span className={`flex items-center gap-1.5 ${isOnline ? 'text-eidos-accent' : 'text-eidos-amber'}`}>
            {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
            {isOnline ? 'online' : 'offline'}
          </span>

          <span className="text-eidos-border">|</span>

          {/* Offline simulation toggle */}
          <button
            onClick={toggleSim}
            className={`flex items-center gap-1.5 px-2 py-0.5 border transition-colors duration-150 cursor-pointer ${
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
      <div className="flex items-stretch px-4 h-9 gap-0">
        {TABS.map(tab => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) => `
              relative px-4 text-xs transition-colors duration-150 cursor-pointer
              flex items-center gap-1.5 border-b-2
              ${isActive
                ? 'text-eidos-accent border-eidos-accent'
                : 'text-eidos-muted border-transparent hover:text-eidos-text-dim'}
            `}
          >
            {tab.label}
            {tab.path === '/actions' && pendingCount > 0 && (
              <span className="text-2xs bg-eidos-amber text-eidos-bg px-1 font-bold">
                {pendingCount}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </header>
  )
}
