import { useState } from 'react'
import { Header } from './components/Header'
import { Demo } from './pages/Demo'
import { Resources } from './pages/Resources'
import { Actions } from './pages/Actions'
import { Inspector } from './pages/Inspector'
import { Learn } from './pages/Learn'

export type Page = 'demo' | 'resources' | 'actions' | 'inspector' | 'learn'

export function App() {
  const [page, setPage] = useState<Page>('demo')

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-eidos-bg">
      <Header page={page} onNavigate={setPage} />
      <main className="flex-1 overflow-y-auto">
        {page === 'demo'      && <Demo onNavigate={setPage} />}
        {page === 'resources' && <Resources />}
        {page === 'actions'   && <Actions />}
        {page === 'inspector' && <Inspector />}
        {page === 'learn'     && <Learn />}
      </main>
    </div>
  )
}
