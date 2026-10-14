# Validation — dx-docs-revamp-20261014

## Commands

| Command                                        | Result                                                                                                           |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @sweidos/playground type-check` | pass (earlier)                                                                                                   |
| Pre-commit: vitest core                        | **222 passed** / 18 files                                                                                        |
| Pre-commit: playground build + prerender       | pass — prerendered `/`, `/docs/start`, `/docs/save`, `/docs/read`, `/docs/safety`, `/docs/api`, `/docs/advanced` |
| `pnpm --filter @sweidos/eidos exec size-limit` | **6.98 kB** / 7 kB core                                                                                          |
| Manual screenshots                             | landing, `/docs/start`, `/try` via computerUse                                                                   |

## Freeze line

Core queue/runtime untouched; public API signatures unchanged. Metadata-only patch changeset for description/homepage.
