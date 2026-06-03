import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Sidebar } from './Sidebar';
import { Header } from './Header';
export function Layout({ children, page, onNavigate }) {
    return (_jsxs("div", { className: "flex flex-col h-screen overflow-hidden bg-eidos-bg", children: [_jsx(Header, {}), _jsxs("div", { className: "flex flex-1 overflow-hidden", children: [_jsx(Sidebar, { current: page, onNavigate: onNavigate }), _jsx("main", { className: "flex-1 overflow-y-auto p-6 lg:p-8 animate-fade-in", children: children })] })] }));
}
