import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CodeBlockProps {
  code: string
  language?: string
  title?: string
  className?: string
}

export function CodeBlock({ code, title, className = '' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={`rounded-lg border border-eidos-border overflow-hidden ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-eidos-border bg-eidos-elevated">
          <span className="text-[11px] font-mono text-eidos-muted">{title}</span>
          <button
            onClick={copy}
            className="flex items-center gap-1 text-[11px] text-eidos-muted hover:text-eidos-text transition-colors"
          >
            {copied ? <Check size={12} className="text-eidos-green" /> : <Copy size={12} />}
            {copied ? 'copied' : 'copy'}
          </button>
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-sm font-mono text-eidos-text bg-eidos-surface leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}
