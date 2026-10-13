# Validation — changesets v3 + action v2

## Local

```
node -v                     # v22.14.0
pnpm -v                     # 10.0.0
pnpm install                # @changesets/cli 2.31.0 → 3.0.3
pnpm exec changeset --version  # 3.0.3
pnpm exec changeset status     # exit 0 (no pending packages)
pnpm exec changeset version    # exit 1 "No unreleased changesets found" (v3 behavior)
```

## Workflow

`.github/workflows/release.yml`: `changesets/action@v2` with `version-script`, `pr-title`, `commit-message`, `github-token`.
