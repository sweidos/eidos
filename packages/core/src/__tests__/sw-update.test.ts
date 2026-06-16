import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerServiceWorker, triggerSwUpdate, _resetSwBridgeForTests } from '../sw-bridge';
import { resetEidosState } from './test-utils';

type EventCallback = (...args: unknown[]) => void;

function makeWaitingSw() {
  return { postMessage: vi.fn(), state: 'installed' as ServiceWorkerState };
}

function makeInstallingSw() {
  const listeners = new Map<string, EventCallback>();
  return {
    postMessage: vi.fn(),
    state: 'installing' as ServiceWorkerState,
    addEventListener: vi.fn((event: string, cb: EventCallback) => {
      listeners.set(event, cb);
    }),
    _listeners: listeners,
  };
}

type FakeRegistration = {
  active: { postMessage: ReturnType<typeof vi.fn>; state: string } | null;
  installing: ReturnType<typeof makeInstallingSw> | null;
  waiting: ReturnType<typeof makeWaitingSw> | null;
  addEventListener: ReturnType<typeof vi.fn>;
  _listeners: Map<string, EventCallback>;
};

function makeRegistration(overrides: Partial<FakeRegistration> = {}): FakeRegistration {
  const listeners = new Map<string, EventCallback>();
  return {
    active: { postMessage: vi.fn(), state: 'activated' },
    installing: null,
    waiting: null,
    addEventListener: vi.fn((event: string, cb: EventCallback) => {
      listeners.set(event, cb);
    }),
    _listeners: listeners,
    ...overrides,
  };
}

describe('SW update lifecycle', () => {
  beforeEach(() => {
    _resetSwBridgeForTests();
    resetEidosState();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('skipWaiting: true (default)', () => {
    it('immediately posts EIDOS_SKIP_WAITING when SW already waiting on startup', async () => {
      const waitingSw = makeWaitingSw();
      const reg = makeRegistration({ waiting: waitingSw });
      (navigator.serviceWorker.register as ReturnType<typeof vi.fn>).mockResolvedValueOnce(reg);

      await registerServiceWorker('/eidos-sw.js', { skipWaiting: true });

      expect(waitingSw.postMessage).toHaveBeenCalledWith({ type: 'EIDOS_SKIP_WAITING' });
    });

    it('posts EIDOS_SKIP_WAITING when new SW reaches installed via updatefound', async () => {
      const reg = makeRegistration();
      (navigator.serviceWorker.register as ReturnType<typeof vi.fn>).mockResolvedValueOnce(reg);

      await registerServiceWorker('/eidos-sw.js', { skipWaiting: true });

      // Simulate updatefound: a new installing SW appears
      const newSw = makeInstallingSw();
      reg.installing = newSw;
      reg.waiting = newSw as unknown as ReturnType<typeof makeWaitingSw>;
      const updatefoundCb = reg._listeners.get('updatefound');
      expect(updatefoundCb).toBeDefined();
      updatefoundCb!();

      // Simulate statechange to 'installed'
      const statechangeCb = newSw._listeners.get('statechange');
      expect(statechangeCb).toBeDefined();
      newSw.state = 'installed';
      statechangeCb!();

      expect(newSw.postMessage).toHaveBeenCalledWith({ type: 'EIDOS_SKIP_WAITING' });
    });

    it('does not post message when new SW reaches installing state (only installed)', async () => {
      const reg = makeRegistration();
      (navigator.serviceWorker.register as ReturnType<typeof vi.fn>).mockResolvedValueOnce(reg);

      await registerServiceWorker('/eidos-sw.js', { skipWaiting: true });

      const newSw = makeInstallingSw();
      reg.installing = newSw;
      reg._listeners.get('updatefound')!();

      // statechange to an intermediate state, not 'installed'
      newSw.state = 'installing';
      newSw._listeners.get('statechange')!();

      expect(newSw.postMessage).not.toHaveBeenCalled();
    });
  });

  describe('skipWaiting: false', () => {
    it('calls onUpdateAvailable instead of posting message when SW already waiting', async () => {
      const waitingSw = makeWaitingSw();
      const reg = makeRegistration({ waiting: waitingSw });
      (navigator.serviceWorker.register as ReturnType<typeof vi.fn>).mockResolvedValueOnce(reg);

      const onUpdateAvailable = vi.fn();
      await registerServiceWorker('/eidos-sw.js', {
        skipWaiting: false,
        onUpdateAvailable,
      });

      expect(waitingSw.postMessage).not.toHaveBeenCalled();
      expect(onUpdateAvailable).toHaveBeenCalledWith(reg);
    });

    it('calls onUpdateAvailable on updatefound → installed, does not post message', async () => {
      const reg = makeRegistration();
      (navigator.serviceWorker.register as ReturnType<typeof vi.fn>).mockResolvedValueOnce(reg);

      const onUpdateAvailable = vi.fn();
      await registerServiceWorker('/eidos-sw.js', {
        skipWaiting: false,
        onUpdateAvailable,
      });

      const newSw = makeInstallingSw();
      reg.installing = newSw;
      reg._listeners.get('updatefound')!();

      newSw.state = 'installed';
      newSw._listeners.get('statechange')!();

      expect(newSw.postMessage).not.toHaveBeenCalled();
      expect(onUpdateAvailable).toHaveBeenCalledWith(reg);
    });

    it('does not call onUpdateAvailable when no controller (first install)', async () => {
      // Temporarily remove controller so it looks like first install
      const origController = navigator.serviceWorker.controller;
      Object.defineProperty(navigator.serviceWorker, 'controller', {
        value: null,
        configurable: true,
        writable: true,
      });

      const waitingSw = makeWaitingSw();
      const reg = makeRegistration({ waiting: waitingSw });
      (navigator.serviceWorker.register as ReturnType<typeof vi.fn>).mockResolvedValueOnce(reg);

      const onUpdateAvailable = vi.fn();
      await registerServiceWorker('/eidos-sw.js', {
        skipWaiting: false,
        onUpdateAvailable,
      });

      expect(onUpdateAvailable).not.toHaveBeenCalled();

      Object.defineProperty(navigator.serviceWorker, 'controller', {
        value: origController,
        configurable: true,
        writable: true,
      });
    });
  });

  describe('triggerSwUpdate()', () => {
    it('posts EIDOS_SKIP_WAITING to the waiting SW', async () => {
      const waitingSw = makeWaitingSw();
      const reg = makeRegistration({ waiting: waitingSw });
      (navigator.serviceWorker.register as ReturnType<typeof vi.fn>).mockResolvedValueOnce(reg);

      await registerServiceWorker('/eidos-sw.js', { skipWaiting: false });

      // Clear any calls from initial watcher (onUpdateAvailable path, not postMessage)
      waitingSw.postMessage.mockClear();

      triggerSwUpdate();

      expect(waitingSw.postMessage).toHaveBeenCalledWith({ type: 'EIDOS_SKIP_WAITING' });
    });

    it('is a no-op when no registration exists', () => {
      // _resetSwBridgeForTests already cleared _registration
      expect(() => triggerSwUpdate()).not.toThrow();
    });
  });
});
