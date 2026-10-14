import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { Analytics } from '@vercel/analytics/react';
import { Header } from './components/Header';

const EidosDevtools = lazy(() =>
  import('@sweidos/eidos/devtools').then((m) => ({ default: m.EidosDevtools })),
);

const Landing = lazy(() => import('./pages/Landing').then((m) => ({ default: m.Landing })));
const Demo = lazy(() => import('./pages/Demo').then((m) => ({ default: m.Demo })));
const Resources = lazy(() => import('./pages/Resources').then((m) => ({ default: m.Resources })));
const Actions = lazy(() => import('./pages/Actions').then((m) => ({ default: m.Actions })));
const Inspector = lazy(() => import('./pages/Inspector').then((m) => ({ default: m.Inspector })));
const DocsLayout = lazy(() =>
  import('./pages/docs/DocsLayout').then((m) => ({ default: m.DocsLayout })),
);
const Start = lazy(() => import('./pages/docs/Start').then((m) => ({ default: m.Start })));
const Save = lazy(() => import('./pages/docs/Save').then((m) => ({ default: m.Save })));
const Read = lazy(() => import('./pages/docs/Read').then((m) => ({ default: m.Read })));
const Safety = lazy(() => import('./pages/docs/Safety').then((m) => ({ default: m.Safety })));
const Recipes = lazy(() => import('./pages/docs/Recipes').then((m) => ({ default: m.Recipes })));
const ApiReference = lazy(() =>
  import('./pages/docs/ApiReference').then((m) => ({ default: m.ApiReference })),
);
const Advanced = lazy(() => import('./pages/docs/Advanced').then((m) => ({ default: m.Advanced })));

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
              <Route path="/" element={<Landing />} />
              <Route path="/try" element={<Demo />} />
              <Route path="/overview" element={<Navigate to="/try" replace />} />
              <Route path="/demo" element={<Navigate to="/try" replace />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/actions" element={<Actions />} />
              <Route path="/inspector" element={<Inspector />} />
              <Route path="/docs" element={<DocsLayout />}>
                <Route index element={<Navigate to="/docs/start" replace />} />
                <Route path="start" element={<Start />} />
                <Route path="save" element={<Save />} />
                <Route path="read" element={<Read />} />
                <Route path="safety" element={<Safety />} />
                <Route path="recipes" element={<Recipes />} />
                <Route path="api" element={<ApiReference />} />
                <Route path="advanced" element={<Advanced />} />
                {/* Legacy redirects */}
                <Route path="quickstart" element={<Navigate to="/docs/start" replace />} />
                <Route path="examples" element={<Navigate to="/docs/recipes" replace />} />
                <Route path="hooks" element={<Navigate to="/docs/api" replace />} />
                <Route path="references" element={<Navigate to="/docs/safety" replace />} />
              </Route>
              <Route path="/learn" element={<Navigate to="/docs/start" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
      <Analytics />
      <Suspense fallback={null}>
        <EidosDevtools />
      </Suspense>
    </BrowserRouter>
  );
}
