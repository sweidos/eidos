# Medium transitive deps — Validation

**Baseline:** `main` @ `bfb7138`  
**Branch:** `cursor/medium-deps-security-34f7`

## Resolved versions (after overrides)

| Package         | Resolved        | Override                            |
| --------------- | --------------- | ----------------------------------- |
| brace-expansion | 1.1.21 / 5.0.12 | `@<2` → `1.1.21`; `@>=4` → `5.0.12` |
| fast-copy       | 4.1.2           | `>=4.1.0`                           |
| fast-uri        | 3.1.8           | `>=3.1.8 <4` (stay on v3 for ajv)   |
| ip-address      | 10.7.4          | `>=10.7.1`                          |

## Skipped

| Package    | Reason                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------- |
| sprintf-js | GHSA-hp3w-g68c-fv3c — no patched release (`<=1.1.3`; npm latest 1.1.3). Optional via `argparse@1`. |

## Commands + outcomes

| Command                             | Outcome                  |
| ----------------------------------- | ------------------------ |
| `pnpm --filter @sweidos/eidos test` | 222 passed               |
| `pnpm --filter @sweidos/next test`  | 12 passed                |
| size-limit                          | **6.98 kB / 7 kB** green |
