# Architecture — DX + Docs Revamp

## Decisions

### D1 — Docs IA (replace current 6-page marketing structure)

| Route            | Purpose                                                               |
| ---------------- | --------------------------------------------------------------------- |
| `/docs/start`    | What it is (30s) + install + wrap + first Save                        |
| `/docs/save`     | neverLose actions: queue, replay, idempotency for humans              |
| `/docs/read`     | resource / patterns / strategies (supporting)                         |
| `/docs/safety`   | Offline, reload, crash, uncertain response, server duties             |
| `/docs/recipes`  | Copy-paste patterns (was Examples)                                    |
| `/docs/api`      | Compact cheat sheet + links (was ApiReference + Hooks merged lightly) |
| `/docs/advanced` | SW, multi-tab, conflict, RN, etc.                                     |

Redirects: `quickstart`→`start`, `examples`→`recipes`, `hooks`→`api#hooks`, `references`→`safety` or advanced.

### D2 — Playground nav

- Primary: **Home** `/`, **Try it** `/try` (was `/overview`), **Docs** `/docs`
- Lab tools (resources / actions / inspector) move under Try it secondary tabs or keep as sub-routes linked from Try it — not equal top-level weight with Docs.

### D3 — Visual redesign

Keep existing eidos token palette (terminal green / slate) — established brand — but:

- Hero: full-bleed composition, less card chrome
- Docs: fewer nested Cards/glow; readable type scale; sticky “you are here”
- Motion: fade/slide on section enter + Try-offline pulse (2–3 intentional motions)

### D4 — Core package

Prefer **zero** runtime changes. If DX helpers land, they must be non-breaking and size-budget safe. Freeze queue/runtime modules.

### D5 — README

Rewrite as: problem → 30s story → install → 3 steps → honesty box → link playground/docs → short “when not to use” → deep reference appendix or external docs links.

## Trade-offs

- Redirects preserve old bookmarks; some deep example anchors may need aliases.
- Merging Hooks into API reduces pages but needs good in-page anchors.
- “Kid-simple” copy must stay accurate (no fake exactly-once).
