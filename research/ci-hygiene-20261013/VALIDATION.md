# Validation — js-yaml bump

## Commands

```
pnpm --filter eidos-gen test       # 2 files, 21 tests passed
pnpm --filter eidos-gen type-check # ok
pnpm --filter eidos-gen build      # ok
```

## Package

- Spec: `js-yaml` `^5.2.2` (was `^4.1.0`)
- Resolved: `5.4.3` (ships own types; removed `@types/js-yaml`)
- Usage: `js-yaml.load` in `packages/eidos-gen/src/parse.ts` only
