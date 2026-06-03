// ─────────────────────────────────────────────────────────────────────────────
// Eidos — describe intent, the runtime figures out how.
// ─────────────────────────────────────────────────────────────────────────────
// Public API
export { resource } from './resource';
export { action, replayQueue } from './action';
export { initEidos } from './runtime';
// React bindings
export { EidosProvider } from './react/Provider';
export { useEidos, useEidosResource, useEidosQueue, useEidosStatus } from './react/hooks';
// Devtools helpers
export { setOfflineSimulation } from './sw-bridge';
export { useEidosStore } from './store';
