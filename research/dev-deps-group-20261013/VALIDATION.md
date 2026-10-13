# Validation — dev-deps group

```
pnpm --filter @sweidos/eidos test   # 222 passed
pnpm --filter @sweidos/eidos build  # ok (vite 8.3.4)
pnpm --filter @sweidos/eidos size   # core 6.98 kB / 7 kB
pnpm --filter @sweidos/playground build  # ok
pnpm --filter @sweidos/crdt-yjs test     # 5 passed
pnpm --filter @sweidos/server-idempotency test # 15 passed
pnpm format:check / lint            # ok
```

Resolved (caret floors from #66 targets): vite 8.3.4, prettier 3.9.10, typescript-eslint 8.71.2, globals 17.13.0, lint-staged 17.6.0, yjs 13.6.33, hono 4.13.13.
