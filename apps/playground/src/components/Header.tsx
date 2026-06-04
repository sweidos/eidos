import { Wifi, WifiOff, Cpu, AlertCircle } from 'lucide-react'
import { useEidosStatus, setOfflineSimulation } from '@eidos/core'
import { useState } from 'react'
import type { Page } from '../App'

const NAV: { id: Page; label: string }[] = [
  { id: 'demo',      label: 'Demo'         },
  { id: 'resources', label: 'Resources'    },
  { id: 'actions',   label: 'Action Queue' },
  { id: 'inspector', label: 'Inspector'    },
  { id: 'learn',     label: 'How It Works' },
]

const SW_COLOR: Record<string, string> = {
  active:      'text-eidos-green',
  registering: 'text-eidos-amber',
  error:       'text-eidos-red',
  idle:        'text-eidos-muted',
  unsupported: 'text-eidos-red',
}

interface HeaderProps {
  page: Page
  onNavigate: (p: Page) => void
}

export function Header({ page, onNavigate }: HeaderProps) {
  const { isOnline, swStatus } = useEidosStatus()
  const [simulating, setSimulating] = useState(false)

  function toggleOffline() {
    const next = !simulating
    setSimulating(next)
    setOfflineSimulation(next)
  }

  return (
    <header className="shrink-0 border-b border-eidos-border bg-eidos-surface">
      <div className="flex items-center justify-between px-4 h-11 border-b border-eidos-border">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded bg-eidos-accent flex items-center justify-center">
            <span className="text-eidos-bg text-[10px] font-bold font-mono leading-none">e</span>
          </div>
          <span className="font-semibold text-sm tracking-tight text-eidos-text">eidos</span>
          <span className="font-mono text-[10px] text-eidos-muted border border-eidos-border rounded px-1.5 py-0.5">v0.1.0</span>
          <span className="hidden sm:block text-eidos-border">·</span>
          <span className="hidden sm:block text-xs text-eidos-muted font-mono">@eidos/core</span>
        </div>

        <div className="flex items-center gap-3">
          <div className={`hidden sm:flex items-center gap-1.5 text-xs font-mono ${SW_COLOR[swStatus] ?? 'text-eidos-muted'}`}>
            {swStatus === 'error' ? <AlertCircle size={11} /> : <Cpu size={11} />}
            <span>SW {swStatus}</span>
          </div>

          <div className="w-px h-3.5 bg-eidos-border" />

          <div className={`flex items-center gap-1.5 text-xs font-mono ${isOnline ? 'text-eidos-green' : 'text-eidos-amber'}`}>
            {isOnline ? <Wifi size={11} /> : <WifiOff size={11} />}
            <span>{isOnline ? 'online' : 'offline'}</span>
          </div>

          <div className="w-px h-3.5 bg-eidos-border" />

          <button
            onClick={toggleOffline}
            className={`flex items-center gap-1.5 text-[11px] font-mono px-2 py-1 rounded border transition-all ${
              simulating
                ? 'bg-eidos-amber-dim border-eidos-amber text-eidos-amber'
                : 'border-eidos-border text-eidos-muted hover:border-eidos-accent hover:text-eidos-text'
            }`}
          >
            <WifiOff size={10} />
            {simulating ? 'stop simulation' : 'simulate offline'}
          </button>
        </div>
      </div>

      <nav className="flex items-end px-4 overflow-x-auto">
        {NAV.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-all ${
              page === id
                ? 'border-eidos-accent text-eidos-text'
                : 'border-transparent text-eidos-muted hover:text-eidos-text-dim'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
    </header>
  )
}
