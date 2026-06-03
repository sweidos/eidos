import { useEidosStore } from './store'

let _registration: ServiceWorkerRegistration | null = null

export function getSwRegistration() {
  return _registration
}

export async function registerServiceWorker(swPath: string): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    useEidosStore.getState().setSwStatus('unsupported')
    return
  }

  const store = useEidosStore.getState()
  store.setSwStatus('registering')

  try {
    _registration = await navigator.serviceWorker.register(swPath, { scope: '/' })

    await waitForActivation(_registration)

    store.setSwStatus('active')

    // Receive messages from SW
    navigator.serviceWorker.addEventListener('message', onSwMessage)

    // Track online/offline
    window.addEventListener('online', () => store.setOnline(true))
    window.addEventListener('offline', () => store.setOnline(false))
  } catch (err) {
    store.setSwStatus('error', String(err))
  }
}

function waitForActivation(reg: ServiceWorkerRegistration): Promise<void> {
  return new Promise((resolve) => {
    if (reg.active) { resolve(); return }
    const sw = reg.installing ?? reg.waiting
    if (!sw) { resolve(); return }
    sw.addEventListener('statechange', function handler() {
      if (sw.state === 'activated') {
        sw.removeEventListener('statechange', handler)
        resolve()
      }
    })
  })
}

export function sendToWorker(message: Record<string, unknown>): void {
  const sw = _registration?.active
  if (sw) sw.postMessage(message)
}

function onSwMessage(event: MessageEvent): void {
  const data = event.data as { type: string; url?: string; strategy?: string }
  if (!data?.type) return

  const store = useEidosStore.getState()
  const { type, url } = data

  if (!url) return

  switch (type) {
    case 'EIDOS_CACHE_HIT': {
      const current = store.resources[url]
      store.updateResource(url, {
        status: 'fresh',
        lastEvent: 'cache-hit',
        cacheHits: (current?.cacheHits ?? 0) + 1,
      })
      break
    }
    case 'EIDOS_CACHE_UPDATED': {
      store.updateResource(url, {
        status: 'fresh',
        lastEvent: 'cache-updated',
        cachedAt: Date.now(),
      })
      break
    }
    case 'EIDOS_NETWORK_ERROR': {
      store.updateResource(url, {
        status: 'error',
        lastEvent: 'network-error',
      })
      break
    }
  }
}

export function setOfflineSimulation(enabled: boolean): void {
  sendToWorker({ type: 'EIDOS_SIMULATE_OFFLINE', enabled })
  useEidosStore.getState().setOnline(!enabled)
}
