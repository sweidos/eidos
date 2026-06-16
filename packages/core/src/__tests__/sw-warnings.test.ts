import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerServiceWorker, _resetSwBridgeForTests } from '../sw-bridge';
import { useEidosStore } from '../store';
import { resetEidosState } from './test-utils';

// Helper: override window.isSecureContext for a single test
function withInsecureContext(fn: () => Promise<void>): () => Promise<void> {
  return async () => {
    const desc = Object.getOwnPropertyDescriptor(window, 'isSecureContext');
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
    try {
      await fn();
    } finally {
      if (desc) {
        Object.defineProperty(window, 'isSecureContext', desc);
      } else {
        Object.defineProperty(window, 'isSecureContext', {
          value: true,
          configurable: true,
          writable: true,
        });
      }
    }
  };
}

describe('registerServiceWorker — dev-mode console warnings', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    _resetSwBridgeForTests();
    resetEidosState();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it(
    'warns when window.isSecureContext is false',
    withInsecureContext(async () => {
      await registerServiceWorker('/eidos-sw.js');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('secure context'));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('HTTPS'));
    }),
  );

  it('warns with file-not-found message on 404-like error', async () => {
    (navigator.serviceWorker.register as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new TypeError(
        'Failed to register a ServiceWorker: A bad HTTP response code (404) was received when fetching the script.',
      ),
    );
    await registerServiceWorker('/missing-sw.js');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('/missing-sw.js'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('vite.config.ts'));
  });

  it('warns generically on other registration failures', async () => {
    (navigator.serviceWorker.register as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Some unexpected error'),
    );
    await registerServiceWorker('/eidos-sw.js');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('registration failed'));
  });

  it('sets swStatus to error on registration failure', async () => {
    (navigator.serviceWorker.register as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('registration error'),
    );
    await registerServiceWorker('/eidos-sw.js');
    expect(useEidosStore.getState().swStatus).toBe('error');
  });

  it('does not warn when registration succeeds', async () => {
    await registerServiceWorker('/eidos-sw.js');
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
