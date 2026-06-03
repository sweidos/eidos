import { useVardiStore } from '../store'

/** Full Vardi store — prefer the narrower hooks below for performance. */
export function useVardi() {
  return useVardiStore()
}

/** Live state for a single registered resource URL. */
export function useVardiResource(url: string) {
  return useVardiStore((s) => s.resources[url])
}

/** The current action queue. */
export function useVardiQueue() {
  return useVardiStore((s) => s.queue)
}

/** Online + SW status — cheap subscription, safe to use in header components. */
export function useVardiStatus() {
  return useVardiStore((s) => ({
    isOnline: s.isOnline,
    swStatus: s.swStatus,
    swError: s.swError,
  }))
}
