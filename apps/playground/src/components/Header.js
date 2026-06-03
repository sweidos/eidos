import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Wifi, WifiOff, Cpu, AlertCircle } from 'lucide-react';
import { useEidosStatus } from '@eidos/core';
import { setOfflineSimulation } from '@eidos/core';
import { useState } from 'react';
const SW_STATUS_LABEL = {
    idle: 'SW Idle',
    registering: 'SW Registering…',
    active: 'SW Active',
    error: 'SW Error',
    unsupported: 'SW Unsupported',
};
const SW_STATUS_COLOR = {
    idle: 'text-eidos-muted',
    registering: 'text-eidos-amber',
    active: 'text-eidos-green',
    error: 'text-eidos-red',
    unsupported: 'text-eidos-red',
};
export function Header() {
    const { isOnline, swStatus } = useEidosStatus();
    const [simulating, setSimulating] = useState(false);
    function toggleOffline() {
        const next = !simulating;
        setSimulating(next);
        setOfflineSimulation(next);
    }
    return (_jsxs("header", { className: "flex items-center justify-between px-5 py-3 border-b border-eidos-border bg-eidos-surface shrink-0", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("div", { className: "w-6 h-6 rounded bg-eidos-accent flex items-center justify-center shrink-0", children: _jsx("span", { className: "text-white text-xs font-bold font-mono", children: "V" }) }), _jsx("span", { className: "font-semibold text-eidos-text tracking-tight", children: "Eidos" }), _jsx("span", { className: "text-[10px] font-mono text-eidos-muted border border-eidos-border rounded px-1.5 py-0.5", children: "v0.1.0" })] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: `flex items-center gap-1.5 text-xs font-mono ${SW_STATUS_COLOR[swStatus] ?? 'text-eidos-muted'}`, children: [swStatus === 'error' ? (_jsx(AlertCircle, { size: 12 })) : (_jsx(Cpu, { size: 12, className: swStatus === 'registering' ? 'animate-pulse' : '' })), SW_STATUS_LABEL[swStatus]] }), _jsx("div", { className: "w-px h-4 bg-eidos-border" }), _jsxs("div", { className: `flex items-center gap-1.5 text-xs font-mono ${isOnline ? 'text-eidos-green' : 'text-eidos-amber'}`, children: [isOnline ? _jsx(Wifi, { size: 12 }) : _jsx(WifiOff, { size: 12 }), isOnline ? 'Online' : 'Offline'] }), _jsx("div", { className: "w-px h-4 bg-eidos-border" }), _jsxs("button", { onClick: toggleOffline, className: `
            flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded border transition-all
            ${simulating
                            ? 'bg-eidos-amber-dim border-eidos-amber text-eidos-amber'
                            : 'bg-transparent border-eidos-border text-eidos-muted hover:border-eidos-accent hover:text-eidos-text'}
          `, children: [_jsx(WifiOff, { size: 11 }), simulating ? 'Stop Simulation' : 'Simulate Offline'] })] })] }));
}
