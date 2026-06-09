import React, { useEffect, useRef } from 'react'
import { useEidosStore } from '@sweidos/eidos'

export interface EidosProviderRNProps {
  children: React.ReactNode
  /**
   * Current network connectivity state.
   * Pass the value from `useNetInfo()` (@react-native-community/netinfo).
   * Defaults to `true` if omitted.
   *
   * @example
   * const netInfo = useNetInfo()
   * <EidosProviderRN isConnected={netInfo.isConnected ?? true}>
   */
  isConnected?: boolean
}

/**
 * Connectivity bridge for React Native.
 * Syncs the network state into the Eidos store so `initEidosRN`'s autoReplay
 * subscription fires when the device comes back online.
 *
 * Render this near the root of your app, after calling `initEidosRN()`.
 */
export function EidosProviderRN({ children, isConnected }: EidosProviderRNProps) {
  const prevRef = useRef<boolean | undefined>(undefined)

  useEffect(() => {
    // Default to online when isConnected is not provided
    const online = isConnected !== false
    if (online !== prevRef.current) {
      prevRef.current = online
      useEidosStore.getState().setOnline(online)
    }
  }, [isConnected])

  return <>{children}</>
}
