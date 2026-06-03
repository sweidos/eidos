import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Card({ children, className = '', glow = false }) {
    return (_jsx("div", { className: `
        rounded-xl border border-eidos-border bg-eidos-surface p-5
        ${glow ? 'shadow-[0_0_24px_rgba(99,102,241,0.08)]' : ''}
        ${className}
      `, children: children }));
}
export function CardHeader({ title, description, action }) {
    return (_jsxs("div", { className: "flex items-start justify-between mb-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-eidos-text text-sm", children: title }), description && _jsx("p", { className: "text-xs text-eidos-muted mt-0.5", children: description })] }), action && _jsx("div", { className: "shrink-0 ml-4", children: action })] }));
}
