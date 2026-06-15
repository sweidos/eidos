import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import { createYjsMergeResolver } from '../merge-resolver.js';
import type { ConflictContext } from '@sweidos/eidos';

function makeUpdate(mutate: (doc: Y.Doc) => void): Uint8Array {
  const doc = new Y.Doc();
  mutate(doc);
  return Y.encodeStateAsUpdate(doc);
}

function readMap(update: Uint8Array): Record<string, unknown> {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, update);
  return doc.getMap('root').toJSON();
}

describe('createYjsMergeResolver', () => {
  it('returns "retry" when the server sent no CRDT state', () => {
    const resolve = createYjsMergeResolver<[string]>({
      getLocalUpdate: () => new Uint8Array(),
      getServerState: () => undefined,
      applyMerged: (args) => args,
    });

    const ctx: ConflictContext = { error: {}, args: ['local'], attempt: 0, idempotencyKey: 'k' };
    expect(resolve(ctx)).toBe('retry');
  });

  it('merges concurrent edits to disjoint keys via Yjs and rewrites args', () => {
    const serverUpdate = makeUpdate((doc) => {
      doc.getMap('root').set('title', 'Server title');
    });
    const localUpdate = makeUpdate((doc) => {
      doc.getMap('root').set('body', 'Local body');
    });

    let appliedMerged: Uint8Array | undefined;
    const resolve = createYjsMergeResolver<[Uint8Array]>({
      getLocalUpdate: ([update]) => update,
      getServerState: (error) => (error as { current: Uint8Array }).current,
      applyMerged: (args, merged) => {
        appliedMerged = merged;
        return [merged];
      },
    });

    const ctx: ConflictContext = {
      error: { current: serverUpdate },
      args: [localUpdate],
      attempt: 0,
      idempotencyKey: 'k',
    };

    const resolution = resolve(ctx);
    expect(resolution).not.toBe('retry');
    expect(resolution).not.toBe('skip');
    const resolved = (resolution as { resolved: [Uint8Array] }).resolved;
    expect(resolved[0]).toBe(appliedMerged);

    // Both concurrent edits survive the merge.
    expect(readMap(resolved[0])).toEqual({ title: 'Server title', body: 'Local body' });
  });

  it('CRDT merge resolves concurrent edits to the same key deterministically', () => {
    const serverUpdate = makeUpdate((doc) => {
      doc.getMap('root').set('title', 'Server title');
    });
    const localUpdate = makeUpdate((doc) => {
      doc.getMap('root').set('title', 'Local title');
    });

    const resolve = createYjsMergeResolver<[Uint8Array]>({
      getLocalUpdate: ([update]) => update,
      getServerState: (error) => (error as { current: Uint8Array }).current,
      applyMerged: (_args, merged) => [merged],
    });

    const ctx: ConflictContext = {
      error: { current: serverUpdate },
      args: [localUpdate],
      attempt: 0,
      idempotencyKey: 'k',
    };

    const resolved = (resolve(ctx) as { resolved: [Uint8Array] }).resolved;
    const merged = readMap(resolved[0]);
    // One of the two concurrent values wins — merge doesn't throw or drop the key.
    expect(['Server title', 'Local title']).toContain(merged.title);
  });
});
