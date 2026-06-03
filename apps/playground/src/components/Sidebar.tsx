import {
  LayoutDashboard,
  Database,
  ListOrdered,
  Search,
  BookOpen,
} from 'lucide-react'
import { useVardiStore } from 'vardi'
import type { Page } from '../App'

interface NavItem {
  id: Page
  label: string
  icon: React.ElementType
  badge?: number | string
}

interface SidebarProps {
  current: Page
  onNavigate: (page: Page) => void
}

export function Sidebar({ current, onNavigate }: SidebarProps) {
  const resources = useVardiStore((s) => s.resources)
  const queue     = useVardiStore((s) => s.queue)

  const pending = queue.filter((q) => q.status === 'pending' || q.status === 'replaying').length

  const navItems: NavItem[] = [
    { id: 'overview',   label: 'Overview',         icon: LayoutDashboard },
    { id: 'resources',  label: 'Resources',         icon: Database,      badge: Object.keys(resources).length || undefined },
    { id: 'actions',    label: 'Action Queue',      icon: ListOrdered,   badge: pending || undefined },
    { id: 'inspector',  label: 'Intent Inspector',  icon: Search },
    { id: 'learn',      label: 'How It Works',      icon: BookOpen },
  ]

  return (
    <aside className="w-52 shrink-0 border-r border-vardi-border bg-vardi-surface flex flex-col overflow-y-auto">
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = current === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all
                ${active
                  ? 'bg-vardi-accent-dim text-vardi-text border border-vardi-accent-mid'
                  : 'text-vardi-text-dim hover:bg-vardi-elevated hover:text-vardi-text border border-transparent'
                }
              `}
            >
              <Icon size={14} className={active ? 'text-vardi-accent' : ''} />
              <span className="flex-1 text-left font-medium">{item.label}</span>
              {item.badge !== undefined && item.badge !== 0 && (
                <span className={`
                  text-[10px] font-mono px-1.5 py-0.5 rounded-full min-w-[18px] text-center
                  ${active ? 'bg-vardi-accent text-white' : 'bg-vardi-elevated text-vardi-muted'}
                `}>
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-vardi-border">
        <a
          href="https://github.com/iamadi11/eidos"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-[11px] text-vardi-muted hover:text-vardi-accent transition-colors text-center font-mono"
        >
          github / eidos ↗
        </a>
      </div>
    </aside>
  )
}
