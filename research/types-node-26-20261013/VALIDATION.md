# Validation — @types/node 26

```
pnpm list @types/node -r --depth 0   # 26.6.5 across bumped packages
pnpm --filter eidos-gen type-check
pnpm --filter @sweidos/eidos type-check
pnpm --filter @sweidos/{crdt-yjs,server-idempotency,sqlite-storage,next} type-check
pnpm --filter eidos-gen test         # 21 passed
pnpm --filter @sweidos/eidos test    # 222 passed
pnpm --filter @sweidos/eidos size    # 6.98 kB / 7 kB
```
