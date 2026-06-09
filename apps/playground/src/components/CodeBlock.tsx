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
  const [copyError, setCopyError] = useState(false)

  async function copy() {
    try {
      await copyText(code)
      setCopyError(false)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (error) {
      console.error('Failed to copy code block', error)
      setCopied(false)
      setCopyError(true)
    }
  }

  return (
    <div className={`rounded-lg border border-eidos-border overflow-hidden ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-eidos-border bg-eidos-elevated">
          <span className="text-[11px] font-mono text-eidos-muted">{title}</span>
          <button
            type="button"
            onClick={copy}
            aria-label={copied ? 'Code copied' : 'Copy code to clipboard'}
            title={copied ? 'Copied' : 'Copy code'}
            className="inline-flex min-h-8 items-center gap-1 text-[11px] text-eidos-muted transition-colors hover:text-eidos-text cursor-pointer"
          >
            {copied ? <Check size={12} className="text-eidos-accent" /> : <Copy size={12} />}
            {copied ? 'copied' : copyError ? 'failed' : 'copy'}
          </button>
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-sm font-mono text-eidos-text bg-eidos-surface leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch (error) {
      // Fall back to the legacy copy path when clipboard permissions fail.
      console.error('Clipboard API copy failed, trying fallback', error)
    }
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()

  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)

  if (!copied) {
    throw new Error('Legacy copy command failed')
  }
}
