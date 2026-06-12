import { Wifi, WifiOff, Cpu, Github, ExternalLink } from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';
import { useEidosStatus, useEidosQueueStats, setOfflineSimulation, VERSION } from '@sweidos/eidos';
import { useState } from 'react';
import { SearchPalette } from './SearchPalette';

const TABS = [
  { path: '/overview', label: 'overview' },
  { path: '/resources', label: 'resources' },
  { path: '/actions', label: 'actions' },
  { path: '/inspector', label: 'inspector' },
  { path: '/docs', label: 'docs' },
];

export function Header() {
  const { isOnline, swStatus } = useEidosStatus();
  const { pending: pendingCount, failed: failedCount } = useEidosQueueStats();
  const [simulating, setSimulating] = useState(false);

  function toggleSim() {
    const next = !simulating;
    setSimulating(next);
    setOfflineSimulation(next);
  }

  return (
    <header className="shrink-0 border-b border-eidos-border bg-eidos-surface/90 backdrop-blur-md">
      {/* Top bar — brand + status */}
      <div className="flex flex-col gap-3 border-b border-eidos-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="text-sm font-bold tracking-[0.22em] text-eidos-accent transition-colors hover:text-green-400 cursor-pointer"
          >
            eidos
          </Link>
          <span className="hidden text-eidos-border sm:inline">·</span>
          <span className="text-xs text-eidos-muted">v{VERSION}</span>
          <div className="hidden items-center gap-1.5 sm:flex">
            <a
              href="https://github.com/iamadi11/eidos"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub repository"
              className="inline-flex items-center gap-1 text-xs text-eidos-muted transition-colors hover:text-eidos-text"
            >
              <Github size={11} />
              <span className="hidden md:inline">GitHub</span>
            </a>
            <span className="text-eidos-border">·</span>
            <a
              href="https://www.npmjs.com/package/@sweidos/eidos"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="npm package"
              className="inline-flex items-center gap-1 text-xs text-eidos-muted transition-colors hover:text-eidos-text"
            >
              <ExternalLink size={10} />
              <span className="hidden md:inline">npm</span>
            </a>
          </div>
        </div>

        {/* Status chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs sm:justify-end">
          <SearchPalette />

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
              swStatus === 'active'
                ? 'border-eidos-accent/30 text-eidos-accent'
                : swStatus === 'registering'
                  ? 'border-eidos-amber/30 text-eidos-amber'
                  : 'border-eidos-border text-eidos-muted'
            }`}
          >
            <Cpu size={10} />
            SW {swStatus}
          </span>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
              isOnline
                ? 'border-eidos-accent/30 text-eidos-accent'
                : 'border-eidos-amber/30 text-eidos-amber'
            }`}
          >
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
          {TABS.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) => `
              inline-flex min-h-9 items-center gap-1.5 rounded-full border px-4 text-xs transition-colors duration-150 cursor-pointer
              ${
                isActive
                  ? 'border-eidos-accent/30 bg-eidos-accent-dim text-eidos-accent'
                  : 'border-transparent text-eidos-muted hover:border-eidos-border hover:bg-eidos-bg/50 hover:text-eidos-text-dim'
              }
            `}
            >
              {tab.label}
              {tab.path === '/actions' && failedCount > 0 && (
                <span
                  className="inline-flex min-w-[1.1rem] h-[1.1rem] items-center justify-center rounded-full bg-eidos-red px-1 text-2xs font-bold text-white"
                  aria-label={`${failedCount} failed`}
                >
                  {failedCount}
                </span>
              )}
              {tab.path === '/actions' && pendingCount > 0 && (
                <span
                  className="inline-flex min-w-[1.1rem] h-[1.1rem] items-center justify-center rounded-full bg-eidos-amber px-1 text-2xs font-bold text-eidos-bg"
                  aria-label={`${pendingCount} pending`}
                >
                  {pendingCount}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </header>
  );
}
