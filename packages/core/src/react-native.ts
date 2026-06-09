// React Native provider
export { EidosProviderRN } from './react/ProviderRN'
export type { EidosProviderRNProps } from './react/ProviderRN'

// Init function
export { initEidosRN, _resetEidosRN } from './runtime-rn'
export type { EidosRNConfig } from './runtime-rn'

// Storage interface + AsyncStorage adapter (re-exported from main package for convenience)
export { setQueueStorage } from '@sweidos/eidos'
export type { QueueStorage } from '@sweidos/eidos'
export { AsyncStorageQueueStorage } from '@sweidos/eidos'
export type { AsyncStorageLike } from '@sweidos/eidos'
