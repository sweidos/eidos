import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Header } from './components/Header'

const Demo      = lazy(() => import('./pages/Demo').then(m => ({ default: m.Demo })))
const Resources = lazy(() => import('./pages/Resources').then(m => ({ default: m.Resources })))
const Actions   = lazy(() => import('./pages/Actions').then(m => ({ default: m.Actions })))
const Inspector = lazy(() => import('./pages/Inspector').then(m => ({ default: m.Inspector })))
const Learn     = lazy(() => import('./pages/Learn').then(m => ({ default: m.Learn })))

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
          <Suspense>
            <Routes>
              <Route path="/" element={<Navigate to="/overview" replace />} />
              <Route path="/overview" element={<Demo />} />
              <Route path="/demo" element={<Navigate to="/overview" replace />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/actions" element={<Actions />} />
              <Route path="/inspector" element={<Inspector />} />
              <Route path="/docs" element={<Learn />} />
              <Route path="/learn" element={<Navigate to="/docs" replace />} />
              <Route path="*" element={<Navigate to="/overview" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  )
}
