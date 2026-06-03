import { useEffect, type ReactNode } from 'react'
import { initEidos, type EidosConfig } from '../runtime'

interface EidosProviderProps extends EidosConfig {
  children: ReactNode
}

/**
 * Mount once at the root of your application.
 * Registers the service worker and initialises the Eidos runtime.
 *
 * @example
 * <EidosProvider swPath="/eidos-sw.js">
 *   <App />
 * </EidosProvider>
 */
export function EidosProvider({ children, swPath, autoReplay }: EidosProviderProps) {
  useEffect(() => {
    initEidos({ swPath, autoReplay })
    // Run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <>{children}</>
}
