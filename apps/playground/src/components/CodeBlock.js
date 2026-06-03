import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
export function CodeBlock({ code, title, className = '' }) {
    const [copied, setCopied] = useState(false);
    async function copy() {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }
    return (_jsxs("div", { className: `rounded-lg border border-eidos-border overflow-hidden ${className}`, children: [title && (_jsxs("div", { className: "flex items-center justify-between px-4 py-2 border-b border-eidos-border bg-eidos-elevated", children: [_jsx("span", { className: "text-[11px] font-mono text-eidos-muted", children: title }), _jsxs("button", { onClick: copy, className: "flex items-center gap-1 text-[11px] text-eidos-muted hover:text-eidos-text transition-colors", children: [copied ? _jsx(Check, { size: 12, className: "text-eidos-green" }) : _jsx(Copy, { size: 12 }), copied ? 'copied' : 'copy'] })] })), _jsx("pre", { className: "p-4 overflow-x-auto text-sm font-mono text-eidos-text bg-eidos-surface leading-relaxed", children: _jsx("code", { children: code }) })] }));
}
