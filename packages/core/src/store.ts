import type { EidosState } from './types';
import { emptyReliabilityStats } from './types';
import {
  createResourceActions,
  createQueueActions,
  createReliabilityActions,
} from './store-slices';
import type { ResourceActions, QueueActions, ReliabilityActions } from './store-slices';

export interface EidosStore extends EidosState, ResourceActions, QueueActions, ReliabilityActions {
  // Online
  setOnline: (online: boolean) => void;
  // SW
  setSwStatus: (status: EidosState['swStatus'], error?: string) => void;
}

type Listener = () => void;

let _state: EidosStore;
const _listeners = new Set<Listener>();

function _notify() {
  _listeners.forEach((fn) => fn());
}

function _set(updater: (prev: EidosStore) => Partial<EidosStore>) {
  _state = { ..._state, ...updater(_state) };
  _notify();
}

_state = {
  // navigator.onLine is undefined in React Native — default to true unless explicitly false
  isOnline: typeof navigator === 'undefined' || navigator.onLine !== false,
  swStatus: 'idle',
  swError: undefined,
  resources: {},
  queue: [],
  reliability: emptyReliabilityStats(),

  setOnline: (isOnline) => _set(() => ({ isOnline })),

  setSwStatus: (swStatus, swError) => _set(() => ({ swStatus, swError })),

  ...createResourceActions(_set),
  ...createQueueActions(_set),
  ...createReliabilityActions(_set),
};

function _getState() {
  return _state;
}

function _subscribe(listener: Listener) {
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
}

export const useEidosStore = {
  getState: _getState,
  subscribe: _subscribe,
  // Test/devtools helper — merges partial state, preserves action methods.
  setState: (partial: Partial<EidosStore> | ((s: EidosStore) => Partial<EidosStore>)) => {
    const update = typeof partial === 'function' ? partial(_state) : partial;
    _state = { ..._state, ...update };
    _notify();
  },
};
