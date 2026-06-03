import { Wifi, WifiOff, Cpu, AlertCircle } from 'lucide-react'
import { useVardiStatus } from 'vardi'
import { setOfflineSimulation } from 'vardi'
import { useState } from 'react'

const SW_STATUS_LABEL: Record<string, string> = {
  idle:         'SW Idle',
  registering:  'SW Registering…',
  active:       'SW Active',
  error:        'SW Error',
  unsupported:  'SW Unsupported',
}

const SW_STATUS_COLOR: Record<string, string> = {
  idle:         'text-vardi-muted',
  registering:  'text-vardi-amber',
  active:       'text-vardi-green',
  error:        'text-vardi-red',
  unsupported:  'text-vardi-red',
}

export function Header() {
  const { isOnline, swStatus } = useVardiStatus()
  const [simulating, setSimulating] = useState(false)

  function toggleOffline() {
    const next = !simulating
    setSimulating(next)
    setOfflineSimulation(next)
  }

  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-vardi-border bg-vardi-surface shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded bg-vardi-accent flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold font-mono">V</span>
        </div>
        <span className="font-semibold text-vardi-text tracking-tight">Vardi</span>
        <span className="text-[10px] font-mono text-vardi-muted border border-vardi-border rounded px-1.5 py-0.5">
          v0.1.0
        </span>
      </div>

      {/* Status row */}
      <div className="flex items-center gap-4">
        {/* SW status */}
        <div className={`flex items-center gap-1.5 text-xs font-mono ${SW_STATUS_COLOR[swStatus] ?? 'text-vardi-muted'}`}>
          {swStatus === 'error' ? (
            <AlertCircle size={12} />
          ) : (
            <Cpu size={12} className={swStatus === 'registering' ? 'animate-pulse' : ''} />
          )}
          {SW_STATUS_LABEL[swStatus]}
        </div>

        <div className="w-px h-4 bg-vardi-border" />

        {/* Network status */}
        <div className={`flex items-center gap-1.5 text-xs font-mono ${isOnline ? 'text-vardi-green' : 'text-vardi-amber'}`}>
          {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          {isOnline ? 'Online' : 'Offline'}
        </div>

        <div className="w-px h-4 bg-vardi-border" />

        {/* Offline simulation toggle */}
        <button
          onClick={toggleOffline}
          className={`
            flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded border transition-all
            ${simulating
              ? 'bg-vardi-amber-dim border-vardi-amber text-vardi-amber'
              : 'bg-transparent border-vardi-border text-vardi-muted hover:border-vardi-accent hover:text-vardi-text'
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
