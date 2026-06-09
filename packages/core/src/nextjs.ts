// 'use client' is prepended to this module's compiled output (vite.nextjs.config.ts).
// Import from this subpath in Next.js App Router to satisfy the
// "hooks must be in a Client Component" requirement without adding your own wrapper.
//
// Usage:
//   import { EidosProvider, useEidosStatus } from '@sweidos/eidos/nextjs'
export { EidosProvider } from '@sweidos/eidos'
export {
  useEidos,
  useEidosStatus,
  useEidosQueue,
  useEidosQueueStats,
  useEidosResource,
  useEidosAction,
  useEidosOnDrain,
} from '@sweidos/eidos'
