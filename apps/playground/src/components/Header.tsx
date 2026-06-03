import { Wifi, WifiOff, Cpu, AlertCircle } from 'lucide-react'
import { useEidosStatus } from '@adityaraj/eidos'
import { setOfflineSimulation } from '@adityaraj/eidos'
import { useState } from 'react'

const SW_STATUS_LABEL: Record<string, string> = {
  idle:         'SW Idle',
  registering:  'SW Registering…',
  active:       'SW Active',
  error:        'SW Error',
  unsupported:  'SW Unsupported',
}

const SW_STATUS_COLOR: Record<string, string> = {
  idle:         'text-eidos-muted',
  registering:  'text-eidos-amber',
  active:       'text-eidos-green',
  error:        'text-eidos-red',
  unsupported:  'text-eidos-red',
}

export function Header() {
  const { isOnline, swStatus } = useEidosStatus()
  const [simulating, setSimulating] = useState(false)

  function toggleOffline() {
    const next = !simulating
    setSimulating(next)
    setOfflineSimulation(next)
  }

  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-eidos-border bg-eidos-surface shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded bg-eidos-accent flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold font-mono">V</span>
        </div>
        <span className="font-semibold text-eidos-text tracking-tight">Eidos</span>
        <span className="text-[10px] font-mono text-eidos-muted border border-eidos-border rounded px-1.5 py-0.5">
          v0.1.0
        </span>
      </div>

      {/* Status row */}
      <div className="flex items-center gap-4">
        {/* SW status */}
        <div className={`flex items-center gap-1.5 text-xs font-mono ${SW_STATUS_COLOR[swStatus] ?? 'text-eidos-muted'}`}>
          {swStatus === 'error' ? (
            <AlertCircle size={12} />
          ) : (
            <Cpu size={12} className={swStatus === 'registering' ? 'animate-pulse' : ''} />
          )}
          {SW_STATUS_LABEL[swStatus]}
        </div>

        <div className="w-px h-4 bg-eidos-border" />

        {/* Network status */}
        <div className={`flex items-center gap-1.5 text-xs font-mono ${isOnline ? 'text-eidos-green' : 'text-eidos-amber'}`}>
          {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          {isOnline ? 'Online' : 'Offline'}
        </div>

        <div className="w-px h-4 bg-eidos-border" />

        {/* Offline simulation toggle */}
        <button
          onClick={toggleOffline}
          className={`
            flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded border transition-all
            ${simulating
              ? 'bg-eidos-amber-dim border-eidos-amber text-eidos-amber'
              : 'bg-transparent border-eidos-border text-eidos-muted hover:border-eidos-accent hover:text-eidos-text'
            }
          `}
        >
          <WifiOff size={11} />
          {simulating ? 'Stop Simulation' : 'Simulate Offline'}
        </button>
      </div>
    </header>
  )
}
