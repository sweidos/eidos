import { useState } from 'react'
import { Layout } from './components/Layout'
import { Overview } from './pages/Overview'
import { Resources } from './pages/Resources'
import { Actions } from './pages/Actions'
import { Inspector } from './pages/Inspector'
import { Learn } from './pages/Learn'

export type Page = 'overview' | 'resources' | 'actions' | 'inspector' | 'learn'

export function App() {
  const [page, setPage] = useState<Page>('overview')

  return (
    <Layout page={page} onNavigate={setPage}>
      {page === 'overview'   && <Overview onNavigate={setPage} />}
      {page === 'resources'  && <Resources />}
      {page === 'actions'    && <Actions />}
      {page === 'inspector'  && <Inspector />}
      {page === 'learn'      && <Learn />}
    </Layout>
  )
}
