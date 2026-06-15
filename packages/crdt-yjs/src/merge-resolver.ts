import * as Y from 'yjs';
import type { ConflictContext, ConflictResolution } from '@sweidos/eidos';

/**
 * Tells `createYjsMergeResolver` how to get/apply Yjs state for a given
 * queued action's args.
 */
export interface YjsMergeOptions<TArgs extends unknown[] = unknown[]> {
  /**
   * The local (queued) change, encoded as a Yjs update — typically
   * `Y.encodeStateAsUpdate(localDoc)` or `Y.encodeStateAsUpdateV2(localDoc)`.
   */
  getLocalUpdate: (args: TArgs) => Uint8Array;
  /**
   * The server's current document state from the 409 response
   * (`ctx.error`), encoded as a Yjs update. Return `undefined` if the
   * server didn't send CRDT state — falls back to `'retry'`.
   */
  getServerState: (error: unknown) => Uint8Array | undefined;
  /**
   * Rewrite the queued args to carry the merged Yjs update so the next
   * replay sends the reconciled state instead of the stale local one.
   */
  applyMerged: (args: TArgs, merged: Uint8Array) => TArgs;
}

/**
 * Builds a `ConflictConfig.resolve` for the `'merge'`/`'custom'` strategy
 * that automatically reconciles a 409 conflict using Yjs CRDT merge: applies
 * the server's state and the queued local update to a fresh `Y.Doc`, then
 * rewrites the queued args with the merged update for the next replay.
 *
 * @example
 * action(updateDoc, {
 *   reliability: 'neverLose',
 *   name: 'updateDoc',
 *   conflict: {
 *     strategy: 'merge',
 *     resolve: createYjsMergeResolver({
 *       getLocalUpdate: ([update]) => base64ToUint8Array(update),
 *       getServerState: (err) => {
 *         const current = (err as { current?: { ydoc?: string } })?.current?.ydoc;
 *         return current ? base64ToUint8Array(current) : undefined;
 *       },
 *       applyMerged: (args, merged) => [uint8ArrayToBase64(merged)],
 *     }),
 *   },
 * })
 */
export function createYjsMergeResolver<TArgs extends unknown[] = unknown[]>(
  options: YjsMergeOptions<TArgs>,
): (ctx: ConflictContext) => ConflictResolution {
  return (ctx) => {
    const serverState = options.getServerState(ctx.error);
    if (!serverState) return 'retry';

    const doc = new Y.Doc();
    Y.applyUpdate(doc, serverState);
    Y.applyUpdate(doc, options.getLocalUpdate(ctx.args as TArgs));

    const merged = Y.encodeStateAsUpdate(doc);
    return { resolved: options.applyMerged(ctx.args as TArgs, merged) };
  };
}
