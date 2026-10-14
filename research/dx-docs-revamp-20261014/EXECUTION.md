# DX + Docs Revamp — Execution Ledger

**Mission:** Make Eidos trivially understandable and the docs/playground useful; redesign site + README.
**Status:** `in_progress` — code merged (#103); awaiting Deploy + Version Packages publish
**Skill:** eidos-product-engineering v1.1.0 (full-mission)
**Branch:** `cursor/dx-docs-revamp-34f7`
**Baseline commit:** `0e5f4ca` (main)
**Baseline npm:** `@sweidos/eidos@2.5.0`
**Freeze line:** neverLose queue/runtime semantics; public `resource`/`action` signatures; 7 kB gzip core budget. Docs/playground/README/copy may change freely. Non-breaking DX helpers only.

## Objective

A new developer can answer in under a minute: what Eidos does, how to install it, and how to make a Save button that survives offline.

## Tasks

| ID  | Task                                                             | Status      |
| --- | ---------------------------------------------------------------- | ----------- |
| T1  | Research + strategy + architecture ledgers                       | done        |
| T2  | Redesign playground landing + nav                                | done        |
| T3  | Rewrite docs IA + pages                                          | done        |
| T4  | Rewrite README + guides                                          | done        |
| T5  | Non-breaking DX polish (GitHub links, query badge, npm homepage) | done        |
| T6  | Validate (playground build/typecheck)                            | in_progress |
| T7  | PR → merge → release (docs-only / patch metadata)                | pending     |

## Next action

Wait for CI on PR #103; merge when green; let changesets publish patch for metadata.
