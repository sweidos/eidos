import { useEffect, type ReactNode } from 'react'
import { initVardi, type VardiConfig } from '../runtime'

interface VardiProviderProps extends VardiConfig {
  children: ReactNode
}

/**
 * Mount once at the root of your application.
 * Registers the service worker and initialises the Vardi runtime.
 *
 * @example
 * <VardiProvider swPath="/vardi-sw.js">
 *   <App />
 * </VardiProvider>
 */
export function VardiProvider({ children, swPath, autoReplay }: VardiProviderProps) {
  useEffect(() => {
    initVardi({ swPath, autoReplay })
    // Run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <>{children}</>
}
