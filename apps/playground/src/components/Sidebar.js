import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LayoutDashboard, Database, ListOrdered, Search, BookOpen, } from 'lucide-react';
import { useEidosStore } from '@eidos/core';
export function Sidebar({ current, onNavigate }) {
    const resources = useEidosStore((s) => s.resources);
    const queue = useEidosStore((s) => s.queue);
    const pending = queue.filter((q) => q.status === 'pending' || q.status === 'replaying').length;
    const navItems = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'resources', label: 'Resources', icon: Database, badge: Object.keys(resources).length || undefined },
        { id: 'actions', label: 'Action Queue', icon: ListOrdered, badge: pending || undefined },
        { id: 'inspector', label: 'Intent Inspector', icon: Search },
        { id: 'learn', label: 'How It Works', icon: BookOpen },
    ];
    return (_jsxs("aside", { className: "w-52 shrink-0 border-r border-eidos-border bg-eidos-surface flex flex-col overflow-y-auto", children: [_jsx("nav", { className: "flex-1 p-3 space-y-0.5", children: navItems.map((item) => {
                    const Icon = item.icon;
                    const active = current === item.id;
                    return (_jsxs("button", { onClick: () => onNavigate(item.id), className: `
                w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all
                ${active
                            ? 'bg-eidos-accent-dim text-eidos-text border border-eidos-accent-mid'
                            : 'text-eidos-text-dim hover:bg-eidos-elevated hover:text-eidos-text border border-transparent'}
              `, children: [_jsx(Icon, { size: 14, className: active ? 'text-eidos-accent' : '' }), _jsx("span", { className: "flex-1 text-left font-medium", children: item.label }), item.badge !== undefined && item.badge !== 0 && (_jsx("span", { className: `
                  text-[10px] font-mono px-1.5 py-0.5 rounded-full min-w-[18px] text-center
                  ${active ? 'bg-eidos-accent text-white' : 'bg-eidos-elevated text-eidos-muted'}
                `, children: item.badge }))] }, item.id));
                }) }), _jsx("div", { className: "p-3 border-t border-eidos-border", children: _jsx("a", { href: "https://github.com/iamadi11/eidos", target: "_blank", rel: "noopener noreferrer", className: "block text-[11px] text-eidos-muted hover:text-eidos-accent transition-colors text-center font-mono", children: "github / eidos \u2197" }) })] }));
}
