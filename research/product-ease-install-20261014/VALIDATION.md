# Product ease — install ceremony — Validation

**Baseline:** `main` @ `@sweidos/eidos@2.5.2`  
**Branch:** `cursor/product-ease-install-34f7`

## Change

| Before                                             | After                                       |
| -------------------------------------------------- | ------------------------------------------- |
| Start step 2 titled “Copy the helper file…”        | “Add the Vite plugin” (copy is footnote)    |
| Happy-path `<EidosProvider swPath="/eidos-sw.js">` | Bare `<EidosProvider>` + note about default |
| ApiReference / Provider example required swPath    | Document default `/eidos-sw.js`             |

Runtime already defaulted `swPath` — no behavior change.

## Commands + outcomes

| Command                                        | Outcome |
| ---------------------------------------------- | ------- |
| `pnpm --filter @sweidos/playground type-check` | clean   |
