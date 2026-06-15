import { bench, describe } from 'vitest';
import * as Y from 'yjs';
import { createYjsMergeResolver } from '../merge-resolver';
import { uint8ArrayToBase64, base64ToUint8Array } from '../base64';
import type { ConflictContext } from '@sweidos/eidos';

function makeUpdate(entries: number): Uint8Array {
  const doc = new Y.Doc();
  const map = doc.getMap('bench');
  for (let i = 0; i < entries; i++) {
    map.set(`key-${i}`, `value-${i}-${'x'.repeat(20)}`);
  }
  return Y.encodeStateAsUpdate(doc);
}

function makeCtx(serverUpdate: Uint8Array, localUpdate: Uint8Array): ConflictContext {
  return {
    error: { current: { ydoc: serverUpdate } },
    args: [localUpdate],
    attempt: 1,
  } as unknown as ConflictContext;
}

describe('createYjsMergeResolver', () => {
  for (const entries of [10, 100, 1000]) {
    const serverUpdate = makeUpdate(entries);
    const localUpdate = makeUpdate(entries);
    const resolve = createYjsMergeResolver<[Uint8Array]>({
      getLocalUpdate: ([update]) => update,
      getServerState: (err) => (err as { current: { ydoc: Uint8Array } }).current.ydoc,
      applyMerged: (args, merged) => [merged],
    });

    bench(`merge two ${entries}-entry doc updates`, () => {
      resolve(makeCtx(serverUpdate, localUpdate));
    });
  }
});

describe('base64 round trip (Buffer path)', () => {
  for (const sizeKb of [1, 10, 100]) {
    const bytes = new Uint8Array(sizeKb * 1024).map((_, i) => i % 256);

    bench(`encode ${sizeKb}KB`, () => {
      uint8ArrayToBase64(bytes);
    });

    const encoded = uint8ArrayToBase64(bytes);
    bench(`decode ${sizeKb}KB`, () => {
      base64ToUint8Array(encoded);
    });
  }
});

describe('base64 round trip (loop path, no Buffer)', () => {
  const originalBuffer = globalThis.Buffer;

  for (const sizeKb of [1, 10, 100]) {
    const bytes = new Uint8Array(sizeKb * 1024).map((_, i) => i % 256);
    const encoded = Buffer.from(bytes).toString('base64');

    bench(`encode ${sizeKb}KB`, () => {
      globalThis.Buffer = undefined as unknown as typeof Buffer;
      try {
        uint8ArrayToBase64(bytes);
      } finally {
        globalThis.Buffer = originalBuffer;
      }
    });

    bench(`decode ${sizeKb}KB`, () => {
      globalThis.Buffer = undefined as unknown as typeof Buffer;
      try {
        base64ToUint8Array(encoded);
      } finally {
        globalThis.Buffer = originalBuffer;
      }
    });
  }
});
