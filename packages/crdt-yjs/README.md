# @sweidos/crdt-yjs

Yjs-backed merge conflict resolver for [`@sweidos/eidos`](https://www.npmjs.com/package/@sweidos/eidos)
`action()` — automatic CRDT merge for the `'merge'`/`'custom'` conflict
strategies, instead of hand-writing `resolve()` per action.

## Install

```bash
npm install @sweidos/crdt-yjs yjs @sweidos/eidos
```

## Usage

Your server must return the document's current Yjs state in the `409`
response body (per `@sweidos/server-idempotency`'s `409 { error, current }`
contract). Encode/decode `Uint8Array` updates as base64 to keep everything
JSON-serializable across the queue/network boundary — `uint8ArrayToBase64`
and `base64ToUint8Array` are provided for this.

```ts
import { action } from '@sweidos/eidos';
import * as Y from 'yjs';
import { createYjsMergeResolver, uint8ArrayToBase64, base64ToUint8Array } from '@sweidos/crdt-yjs';

export const updateDoc = action(
  async (docUpdateBase64: string) => {
    const res = await fetch('/api/docs/123', {
      method: 'PATCH',
      body: JSON.stringify({ update: docUpdateBase64 }),
    });
    if (!res.ok) throw await res.json(); // { error, current: { ydoc: base64 } }
    return res.json();
  },
  {
    reliability: 'neverLose',
    name: 'updateDoc',
    conflict: {
      strategy: 'merge',
      resolve: createYjsMergeResolver<[string]>({
        // The queued local change, as a Yjs update.
        getLocalUpdate: ([update]) => base64ToUint8Array(update),
        // The server's current state from the 409 body. Return undefined
        // to fall back to a plain retry if the server didn't send CRDT state.
        getServerState: (err) => {
          const ydoc = (err as { current?: { ydoc?: string } })?.current?.ydoc;
          return ydoc ? base64ToUint8Array(ydoc) : undefined;
        },
        // Rewrite the queued args with the merged update for the next replay.
        applyMerged: (_args, merged) => [uint8ArrayToBase64(merged)],
      }),
    },
  },
);
```

`createYjsMergeResolver` applies the server's state and the queued local
update to a fresh `Y.Doc`, then hands the merged `Y.encodeStateAsUpdate()`
result to `applyMerged` — Yjs's CRDT semantics resolve concurrent edits to
disjoint keys without loss, and concurrent edits to the same key
deterministically (last-writer-wins per Yjs's clock, not "first 409 wins").

If `getServerState` returns `undefined` (server didn't include CRDT state),
the resolver returns `'retry'` — same as the default `'merge'` behavior
without a custom resolver.

## API

- `createYjsMergeResolver(options)` — builds a `ConflictConfig.resolve`
  function. See `YjsMergeOptions`.
- `uint8ArrayToBase64(bytes)` / `base64ToUint8Array(base64)` — transport
  helpers for JSON-serializing Yjs updates (work in Node and browsers).
