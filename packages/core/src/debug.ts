import { useEidosStore } from './store';
import { getSwRegistration } from './sw-bridge';
import { VERSION } from './version';
import type { ReliabilityStats } from './types';

export interface EidosDebugSnapshot {
  version: string;
  swStatus: string;
  swError?: string;
  isOnline: boolean;
  resourceCount: number;
  resources: Record<
    string,
    {
      url: string;
      strategy: string;
      status: string;
      cacheHits: number;
      cacheMisses: number;
      cachedAt?: number;
    }
  >;
  queue: {
    id: string;
    actionId: string;
    actionName: string;
    status: string;
    retryCount: number;
    maxRetries: number;
    idempotencyKey: string;
    schemaVersion: number;
    queuedAt: number;
  }[];
  reliability: ReliabilityStats;
  swRegistration: {
    scope: string;
    scriptURL: string;
    state: 'installing' | 'waiting' | 'active' | null;
  } | null;
}

/**
 * Returns a plain-object snapshot of the current Eidos runtime state.
 * Safe to serialize with `JSON.stringify`. Useful for bug reports,
 * attaching to error tracking breadcrumbs, and the devtools SW tab.
 *
 * @example
 * // Print for a bug report:
 * console.log(JSON.stringify(eidosDebug(), null, 2));
 *
 * // Attach to a Sentry breadcrumb:
 * Sentry.addBreadcrumb({ data: eidosDebug() });
 */
export function eidosDebug(): EidosDebugSnapshot {
  const state = useEidosStore.getState();
  const swReg = getSwRegistration();

  return {
    version: VERSION,
    swStatus: state.swStatus,
    ...(state.swError !== undefined && { swError: state.swError }),
    isOnline: state.isOnline,
    resourceCount: Object.keys(state.resources).length,
    resources: Object.fromEntries(
      Object.entries(state.resources).map(([url, entry]) => [
        url,
        {
          url: entry.url,
          strategy: entry.strategy.swStrategy,
          status: entry.status,
          cacheHits: entry.cacheHits,
          cacheMisses: entry.cacheMisses,
          ...(entry.cachedAt !== undefined && { cachedAt: entry.cachedAt }),
        },
      ]),
    ),
    queue: state.queue.map((item) => ({
      id: item.id,
      actionId: item.actionId,
      actionName: item.actionName,
      status: item.status,
      retryCount: item.retryCount,
      maxRetries: item.maxRetries,
      idempotencyKey: item.idempotencyKey,
      schemaVersion: item.schemaVersion,
      queuedAt: item.queuedAt,
    })),
    reliability: { ...state.reliability },
    swRegistration: swReg
      ? {
          scope: swReg.scope,
          scriptURL: (swReg.active ?? swReg.waiting ?? swReg.installing)?.scriptURL ?? '',
          state: swReg.installing
            ? 'installing'
            : swReg.waiting
              ? 'waiting'
              : swReg.active
                ? 'active'
                : null,
        }
      : null,
  };
}
