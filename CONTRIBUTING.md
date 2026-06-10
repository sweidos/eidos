# Contributing to Eidos

Thanks for taking the time to contribute! This is a pnpm monorepo containing the
core library, a Vite-based playground, and a couple of supporting packages.

By participating in this project, you agree to abide by the
[Code of Conduct](CODE_OF_CONDUCT.md).

## Project layout

```
packages/core        @sweidos/eidos — the published library
packages/eidos-gen   eidos-gen — OpenAPI → resource()/action() codegen CLI
packages/worker      Service worker source compiled into @sweidos/eidos
apps/playground      Live demo + docs site (sweidos.vercel.app)
apps/e2e             Playwright end-to-end tests
```

## Getting started

```bash
pnpm install                          # install all workspace deps
pnpm dev                              # run the playground at localhost:3000
pnpm --filter @sweidos/eidos build    # build the core package
pnpm --filter @sweidos/eidos test     # run unit tests (vitest)
pnpm type-check                       # type-check every package
```

## Before opening a PR

- **Open an issue first** for anything beyond a small fix — it saves everyone
  time if the approach is agreed on up front.
- **Add or update tests** for behavior changes in `packages/core/src/__tests__`.
- **Run `pnpm type-check` and `pnpm --filter @sweidos/eidos test`** — both must
  pass. CI runs the same checks.
- **Keep `action()`/`resource()` declarations module-scope** in any new
  playground examples — see the existing pages for the pattern.
- **Add a changeset** for any user-facing change to `@sweidos/eidos`:
  `pnpm changeset`, pick the bump type, describe the change. This generates
  the changelog entry on release — no manual `CHANGELOG.md` edits needed.

## Code style

- TypeScript strict mode throughout — no `any` without a comment explaining why.
- Prefer small, focused modules over large multi-purpose files.
- Match the existing formatting; there's no separate linter pass beyond
  `tsc --noEmit`.

## Reporting bugs / requesting features

Use the issue templates. For security issues, see [SECURITY.md](./SECURITY.md)
instead of opening a public issue.
