import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { VardiProvider } from 'vardi'
import { App } from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 0,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VardiProvider swPath="/vardi-sw.js">
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </VardiProvider>
  </StrictMode>,
)
