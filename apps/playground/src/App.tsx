import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { EidosDevtools } from '@sweidos/eidos/devtools';
import { Header } from './components/Header';

const Demo = lazy(() => import('./pages/Demo').then((m) => ({ default: m.Demo })));
const Resources = lazy(() => import('./pages/Resources').then((m) => ({ default: m.Resources })));
const Actions = lazy(() => import('./pages/Actions').then((m) => ({ default: m.Actions })));
const Inspector = lazy(() => import('./pages/Inspector').then((m) => ({ default: m.Inspector })));
const DocsLayout = lazy(() =>
  import('./pages/docs/DocsLayout').then((m) => ({ default: m.DocsLayout })),
);
const QuickStart = lazy(() =>
  import('./pages/docs/QuickStart').then((m) => ({ default: m.QuickStart })),
);
const ApiReference = lazy(() =>
  import('./pages/docs/ApiReference').then((m) => ({ default: m.ApiReference })),
);
const Examples = lazy(() => import('./pages/docs/Examples').then((m) => ({ default: m.Examples })));
const Hooks = lazy(() => import('./pages/docs/Hooks').then((m) => ({ default: m.Hooks })));
const Advanced = lazy(() => import('./pages/docs/Advanced').then((m) => ({ default: m.Advanced })));
const References = lazy(() =>
  import('./pages/docs/References').then((m) => ({ default: m.References })),
);

function RouteFallback() {
  return (
    <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-24">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-eidos-border border-t-eidos-accent" />
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-1.5 focus:text-xs focus:bg-eidos-accent focus:text-eidos-bg focus:font-bold"
      >
        Skip to main content
      </a>
      <div className="flex min-h-dvh flex-col overflow-hidden bg-eidos-bg">
        <Header />
        <main id="main-content" className="flex-1 overflow-y-auto">
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Navigate to="/overview" replace />} />
              <Route path="/overview" element={<Demo />} />
              <Route path="/demo" element={<Navigate to="/overview" replace />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/actions" element={<Actions />} />
              <Route path="/inspector" element={<Inspector />} />
              <Route path="/docs" element={<DocsLayout />}>
                <Route index element={<Navigate to="/docs/quickstart" replace />} />
                <Route path="quickstart" element={<QuickStart />} />
                <Route path="api" element={<ApiReference />} />
                <Route path="examples" element={<Examples />} />
                <Route path="hooks" element={<Hooks />} />
                <Route path="advanced" element={<Advanced />} />
                <Route path="references" element={<References />} />
              </Route>
              <Route path="/learn" element={<Navigate to="/docs/quickstart" replace />} />
              <Route path="*" element={<Navigate to="/overview" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
      <Analytics />
      <EidosDevtools />
    </BrowserRouter>
  );
}
