# Next.js security patch — Validation

**Baseline:** `main` @ `a119398`  
**Branch:** `cursor/next-security-patch-34f7`

## Resolved versions (after overrides)

| Package       | Resolved | Override / spec        |
| ------------- | -------- | ---------------------- |
| next          | 16.4.0   | `>=16.3.8` / `^16.3.8` |
| proxy-addr    | 2.0.8    | `>=2.0.8`              |
| undici        | 7.30.0   | `>=7.29.1 <8`          |
| source-map-js | 1.2.2    | `>=1.2.2`              |
| sharp         | 0.35.5   | `>=0.35.5`             |

## Commands + outcomes

| Command                             | Outcome                  |
| ----------------------------------- | ------------------------ |
| `pnpm --filter @sweidos/eidos test` | 222 passed               |
| `pnpm --filter @sweidos/next test`  | 12 passed                |
| playground build                    | ok                       |
| size-limit (`@sweidos/eidos`)       | **6.98 kB / 7 kB** green |

## Notes

- Unconstrained `undici: >=7.29.1` previously pulled undici v8 and broke jsdom-backed core tests; constrained to `<8`.
