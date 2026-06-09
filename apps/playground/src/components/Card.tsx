import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  glow?: boolean
}

export function Card({ children, className = '', glow = false }: CardProps) {
  return (
    <div
      className={`
        rounded-xl border border-eidos-border/80 bg-eidos-surface/95 p-5
        shadow-[0_1px_0_rgba(255,255,255,0.02),0_18px_50px_rgba(15,23,42,0.18)]
        ${glow ? 'shadow-[0_1px_0_rgba(255,255,255,0.02),0_18px_50px_rgba(15,23,42,0.18),0_0_24px_rgba(34,197,94,0.08)]' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export function CardHeader({ title, description, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="font-semibold text-eidos-text text-sm">{title}</h3>
        {description && <p className="text-xs text-eidos-muted mt-0.5">{description}</p>}
      </div>
      {action && <div className="shrink-0 ml-4">{action}</div>}
    </div>
  )
}
