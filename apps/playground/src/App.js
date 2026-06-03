import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Layout } from './components/Layout';
import { Overview } from './pages/Overview';
import { Resources } from './pages/Resources';
import { Actions } from './pages/Actions';
import { Inspector } from './pages/Inspector';
import { Learn } from './pages/Learn';
export function App() {
    const [page, setPage] = useState('overview');
    return (_jsxs(Layout, { page: page, onNavigate: setPage, children: [page === 'overview' && _jsx(Overview, { onNavigate: setPage }), page === 'resources' && _jsx(Resources, {}), page === 'actions' && _jsx(Actions, {}), page === 'inspector' && _jsx(Inspector, {}), page === 'learn' && _jsx(Learn, {})] }));
}
