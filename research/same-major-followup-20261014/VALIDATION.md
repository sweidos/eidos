# Same-major pin follow-up — Validation

| Command               | Outcome                                      |
| --------------------- | -------------------------------------------- |
| `pnpm lint`           | clean (eslint 9.39.4)                        |
| core tests            | 222 passed                                   |
| next tests            | 12 passed                                    |
| size-limit            | 6.99 kB / 7 kB                               |
| eslint 9.39.5 attempt | **rejected** — breaks `@eslint/eslintrc`/ajv |
