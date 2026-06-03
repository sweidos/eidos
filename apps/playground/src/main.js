import { jsx as _jsx } from "react/jsx-runtime";
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EidosProvider } from '@eidos/core';
import { App } from './App';
import './index.css';
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            staleTime: 0,
            refetchOnWindowFocus: false,
        },
    },
});
createRoot(document.getElementById('root')).render(_jsx(StrictMode, { children: _jsx(EidosProvider, { swPath: "/eidos-sw.js", children: _jsx(QueryClientProvider, { client: queryClient, children: _jsx(App, {}) }) }) }));
