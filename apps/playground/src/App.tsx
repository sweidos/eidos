import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Header } from './components/Header'
import { Demo } from './pages/Demo'
import { Resources } from './pages/Resources'
import { Actions } from './pages/Actions'
import { Inspector } from './pages/Inspector'
import { Learn } from './pages/Learn'

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
        </main>
      </div>
    </BrowserRouter>
  )
}
