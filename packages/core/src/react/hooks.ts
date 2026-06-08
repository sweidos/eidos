import { useEidosStore } from '../store'

/** Full Eidos store — prefer the narrower hooks below for performance. */
export function useEidos() {
  return useEidosStore()
}

/** Live state for a single registered resource URL. */
export function useEidosResource(url: string) {
  return useEidosStore((s) => s.resources[url])
}

/** The current action queue. */
export function useEidosQueue() {
  return useEidosStore((s) => s.queue)
}

/**
 * Online + SW status — cheap subscription, safe to use in header components.
 * Three separate primitive selectors so each only triggers a re-render when
 * its own value changes (no object-reference churn from a combined selector).
 */
export function useEidosStatus() {
  const isOnline = useEidosStore((s) => s.isOnline)
  const swStatus = useEidosStore((s) => s.swStatus)
  const swError = useEidosStore((s) => s.swError)
  return { isOnline, swStatus, swError }
}
