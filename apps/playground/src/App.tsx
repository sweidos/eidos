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
      <div className="flex flex-col h-screen overflow-hidden bg-eidos-bg">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/demo" replace />} />
            <Route path="/demo"      element={<Demo />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/actions"   element={<Actions />} />
            <Route path="/inspector" element={<Inspector />} />
            <Route path="/learn"     element={<Learn />} />
            <Route path="*"          element={<Navigate to="/demo" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
