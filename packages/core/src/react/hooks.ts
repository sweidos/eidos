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

/** Online + SW status — cheap subscription, safe to use in header components. */
export function useEidosStatus() {
  return useEidosStore((s) => ({
    isOnline: s.isOnline,
    swStatus: s.swStatus,
    swError: s.swError,
  }))
}
