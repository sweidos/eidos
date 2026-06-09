import { initEidos } from '@sweidos/eidos'
import type { EidosConfig } from '@sweidos/eidos'

/**
 * Returns an `onMount`-compatible callback that initialises the Eidos runtime
 * on the client only. Prevents SSR crashes caused by accessing `indexedDB` or
 * `navigator.serviceWorker` during server-side rendering.
 *
 * Call inside `onMount()` in your root `+layout.svelte`:
 *
 * ```svelte
 * <script>
 *   import { onMount } from 'svelte'
 *   import { initEidosSvelteKit } from '@sweidos/eidos/sveltekit'
 *
 *   onMount(initEidosSvelteKit({ swPath: '/eidos-sw.js' }))
 * </script>
 * ```
 */
export function initEidosSvelteKit(config?: EidosConfig): () => void {
  return () => { void initEidos(config) }
}
