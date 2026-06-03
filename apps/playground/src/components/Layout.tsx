import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import type { Page } from '../App'

interface LayoutProps {
  children: ReactNode
  page: Page
  onNavigate: (page: Page) => void
}

export function Layout({ children, page, onNavigate }: LayoutProps) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-eidos-bg">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar current={page} onNavigate={onNavigate} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}
