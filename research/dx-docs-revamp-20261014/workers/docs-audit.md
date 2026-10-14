# Docs / DX audit — playground + README + guides

**Repo:** `/tmp/eidos` (`sweidos/eidos`, `@sweidos/eidos` v2.5.0)  
**Scope (read-only):** `apps/playground/src/pages/**`, `Header.tsx`, `README.md`, `docs/guides/*.md`, `packages/core/src/index.ts` (+ error strings / defaults cited from implementation)  
**Date:** 2026-10-14  
**Method:** Evidence from source quotes + route map; no product code changes.

---

## 1. Top 10 UX / docs confusion points

Each item: **symptom → evidence (quote + path) → why it confuses**.

### 1. README “Documentation” link goes to the playground overview, not docs

> `**[→ Documentation](https://sweidos.vercel.app/overview)**`  
> — `README.md:26`  
> Same mis-target again: `Full reference at **[sweidos.vercel.app/overview](...)**` — `README.md:159`

Users clicking “Documentation” land on `/overview` (Demo), not `/docs/quickstart`. The live playground URL is labelled separately on the same line, so the two CTAs collide.

### 2. Header mixes lab tools with docs; Landing is not a nav tab

> `TABS = [ { path: '/overview', label: 'overview' }, … '/resources', '/actions', '/inspector', '/docs' ]`  
> — `apps/playground/src/components/Header.tsx:7–13`

Five equal-weight tabs. “overview / resources / actions / inspector” are runtime inspectors; “docs” is teaching. Brand `Link to="/"` is the only way back to Landing (`Header.tsx:32–36`). A newcomer cannot tell which tab is “learn” vs “poke live state.”

### 3. Quick Start opens with marketing fluff, not install → Save

> `Simple enough to scan. Deep enough to ship with.`  
> `Start here if you want the short version first. The sidebar walks through setup…`  
> — `apps/playground/src/pages/docs/QuickStart.tsx:17–22`

Primary CTA on that page: **“Back to overview”** (`QuickStart.tsx:27–32`), not “try offline save.” Teaching is delayed behind meta-copy about the docs themselves.

### 4. Landing hero packs SW / idempotency / multi-runtime jargon before one Save

> `resource() and action() replace 200 lines of Workbox config, IndexedDB schema, and retry logic — with idempotency keys and cross-tab replay locks built in for at-least-once delivery with server-side deduplication. Works with React, Next.js Server Actions, SvelteKit, Vue, React Native, and Tauri/Electron.`  
> — `apps/playground/src/pages/Landing.tsx:97–102`

Plus an 8-card feature bento (`FEATURES`, `Landing.tsx:15–64`, rendered `138–151`) in the first scroll. Product Strategy already flags this: feature grid + jargon before one Save.

### 5. Demo Overview still reads like a second landing + Workbox lecture

> `Stop wiring service-worker details by hand.`  
> `Eidos turns offline behavior into explicit, readable declarations. The homepage shows the patterns, the docs explain the API…`  
> — `apps/playground/src/pages/Demo.tsx:204–209`

Hero steps include “Open docs for a shorter explanation of each API surface” (`HERO_STEPS`, `Demo.tsx:56–60`) instead of “toggle offline → submit → watch queue.” Live panels compete with install strip + framework chips + six example cards including Workbox before/after (`EXAMPLES`, `Demo.tsx:62–155`).

### 6. Fake / misleading `query()` surface on Overview

> `badge: 'query()'`, `title: 'Bridge into TanStack Query'`  
> code: `useQuery(productsResource.query<Product[]>())` + `useEidosMutation(...)`  
> — `apps/playground/src/pages/Demo.tsx:94–102`

There is no top-level `query()` export from `@sweidos/eidos`. Real APIs: `handle.query()` on a resource (`packages/core/src/index.ts` / resource handle) and `useEidosQuery` / `useEidosMutation` from `@sweidos/eidos/query` (`packages/core/src/query.ts`). Badge invents a primitive.

### 7. Markdown guides are orphaned from the playground docs IA

`docs/guides/{getting-started,glossary,guarantees,troubleshooting}.md` exist and README links them (`README.md:664+`), but playground docs search / sidebar never surface them:

- `DOC_PAGES` = quickstart, api, examples, hooks, advanced, references only — `apps/playground/src/pages/docs/shared.tsx:125–132`
- Grep of playground for `docs/guides` / `glossary` / `guarantees` / `troubleshooting` as routes: **no hits** (only the word “guarantees” in Landing feature copy).

Best plain-language teaching (`getting-started.md`, `guarantees.md`) is invisible inside the product the README calls “Documentation.”

### 8. GitHub org / edit links still point at `iamadi11/eidos`

| Location            | Quote                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------- |
| Header              | `href="https://github.com/iamadi11/eidos"` — `Header.tsx:42`                                |
| Edit-on-GitHub base | `https://github.com/iamadi11/eidos/edit/main/...` — `shared.tsx:134–135`                    |
| Further reading     | same org for README — `References.tsx:7`                                                    |
| Canonical package   | `"url": "https://github.com/sweidos/eidos.git"` — `packages/core/package.json` `repository` |

Broken or personal-fork links undermine trust and “Edit this page.”

### 9. Docs “API reference” is a short card deck; real API lives in the 744-line README

Playground API page covers only five headings (`resource`, `action`, `EidosProvider`, `replayQueue`, `conflict`) — `ApiReference.tsx:5–11`. Hooks are a separate thin page (`Hooks.tsx`, 69 lines). Advanced collapses frameworks, OpenAPI, testing, limits (`Advanced.tsx`).

Meanwhile README sections 157–710+ duplicate and expand Core API, TanStack, Push, Testing, OpenAPI, Devtools, SSR, Known limitations, comparisons — so “where is the real reference?” has three answers (playground cards, README tables, orphaned `docs/guides`).

### 10. Types comment vs runtime: duplicate `action` id

> Types: `without a namespace, the second registration silently overwrites the first.`  
> — `packages/core/src/types.ts:117–120` (JSDoc on `namespace`)

> Runtime: `throw new Error(\`[eidos] duplicate action id "${actionId}" — an action with this id is already registered...\`)` 
—`packages/core/src/action.ts:75–78`

Docs/types claim silent overwrite; code throws. Anyone following the JSDoc will be wrong about failure mode.

**Honorable mentions (not in top 10 but real):**

- Catch-all `path="*"` → `/overview` (`App.tsx:69`) — typos never reach a helpful 404/docs.
- `/demo` → `/overview`, `/learn` → `/docs/quickstart` (`App.tsx:55,68`) — naming drift (`demo` vs `overview` vs Landing `/`).
- Offline fetch error is terse: `` `offline: no cached response for ${url}` `` — `resource.ts:359–361` (no pointer to “register resource with offline: true” / warm cache).
- Glossary “Hydration” redefines React hydration as queue load from IDB (`docs/guides/glossary.md:110–114`) — overloaded term.

---

## 2. Current IA (routes) vs 5-year-old mental model

### Current routes (`App.tsx:53–69`)

| Route              | Page                      | Role today                                                          |
| ------------------ | ------------------------- | ------------------------------------------------------------------- |
| `/`                | `Landing.tsx`             | Marketing hero + 8-feature grid + code sample                       |
| `/overview`        | `Demo.tsx`                | Second pitch + live panels + example gallery                        |
| `/demo`            | redirect → `/overview`    | Legacy alias                                                        |
| `/resources`       | `Resources.tsx`           | Live registered resources table                                     |
| `/actions`         | `Actions.tsx`             | Live IndexedDB action queue                                         |
| `/inspector`       | `Inspector.tsx`           | Strategy / SW explanation for a resource                            |
| `/docs`            | → `/docs/quickstart`      | Docs shell                                                          |
| `/docs/quickstart` | QuickStart                | Meta intro + 3 setup cards                                          |
| `/docs/api`        | ApiReference              | 5 primitive cards                                                   |
| `/docs/examples`   | Examples (+ ExamplesLive) | 10 recipe cards with Code/Live toggle                               |
| `/docs/hooks`      | Hooks                     | React hooks + stores                                                |
| `/docs/advanced`   | Advanced                  | Collapses: patterns, strategies, adapters, codegen, testing, limits |
| `/docs/references` | References                | 4 external links (README + 3 MDN)                                   |
| `/learn`           | → quickstart              | Alias                                                               |
| `*`                | → `/overview`             | Soft 404                                                            |

**Header primary nav:** overview · resources · actions · inspector · docs (`Header.tsx`).

**Parallel (off-site) docs:** `docs/guides/*.md` linked only from README Troubleshooting footer.

### What a 5-year-old mental model needs instead

Product Strategy (`research/.../PRODUCT_STRATEGY.md`) already states the story in two words: **Read** (`resource`) and **Save** (`action`). Journey:

1. **What is this?** — When you press Save offline, the click is kept until the server accepts it (or you decide).
2. **Install the box** → **Wrap once** → **Save with neverLose**.
3. **Try it** — click Save, go “airplane,” come back — still in the queue.
4. **Tell the server the ticket number** (idempotency key) so retries are safe.
5. **Later:** Read/cache, recipes, advanced SW/tabs/conflicts.

Current IA fails that model by:

- Putting **inspectors** (resources/actions/inspector) at the same nav weight as **Docs**.
- Making **Overview** another landing instead of the offline Save demo.
- Splitting **guarantees / glossary / troubleshooting** out of the in-app docs tree.
- Leading with **Workbox / SW / framework matrix** before Save.

---

## 3. Recommended docs IA rewrite

Aligned with Architecture D1 (`research/.../ARCHITECTURE.md`); refined with audit evidence.

| Proposed route                                      | One-sentence purpose                                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `/docs/start` (redirect from `quickstart`)          | Install, wrap `EidosProvider`, declare one `neverLose` Save — copy you can paste and run.                    |
| `/docs/save`                                        | Explain the action queue: offline persist, replay, `name`, idempotency key, pending/failed — in human words. |
| `/docs/read`                                        | `resource` / `resourcePattern` / strategies / TTL — supporting reads after Save is understood.               |
| `/docs/safety` (absorb `guarantees.md` + honesty)   | What Eidos promises (at-least-once, locks, nothing silently dropped) vs what the server must do.             |
| `/docs/recipes` (redirect from `examples`)          | Copy-paste patterns with optional live demos (offline form, TanStack bridge, conflict, patterns).            |
| `/docs/api` (merge thin Hooks page via `#hooks`)    | Compact cheat sheet of primitives, hooks, stores, queue helpers — link out for depth.                        |
| `/docs/advanced`                                    | SW updates, multi-tab, adapters (Next/RN/Svelte/SQLite), codegen, testing, known limits.                     |
| `/docs/troubleshoot` (promote `troubleshooting.md`) | Console warning → cause → fix; link `eidosDebug()`.                                                          |
| `/docs/glossary` (optional; or fold into safety)    | Plain definitions without rivaling Start.                                                                    |

**Playground chrome (Architecture D2):** primary **Home `/` · Try it `/try` (was overview) · Docs `/docs`**; resources/actions/inspector as secondary tabs under Try it, not peer top-nav with Docs.

**Redirects to keep:** `quickstart`→`start`, `examples`→`recipes`, `hooks`→`api#hooks`, `overview`/`demo`→`/try`, `learn`→`start`. Fix README Documentation URL to `/docs/start`.

---

## 4. README cuts — above the fold vs deep docs

**Current:** **744 lines**, headings through License (`README.md`). Structure: badges → pitch → problem → quick start → what you get (table) → framework matrix → Core API (long) → conflict → hooks → stores → telemetry → SW updates → queue management → TanStack → Push → Testing → OpenAPI → Devtools → Troubleshooting → SSR → Known limitations → compares → Contributing → License.

### Keep above the fold (~≤120 lines of teaching)

1. One-liner + honesty: at-least-once + server dedupe (already in lines 10–12 — keep, tighten).
2. Minimal code: one `resource` + one `neverLose` `action` (lines 14–22 — keep).
3. Install + Vite plugin + wrap + declare (Quick start §1–3 — keep; drop duplicate framework laundry list here).
4. **Honesty box:** not exactly-once; module-scope actions; GET-only SW caching (pull short bullets from Known limitations / guarantees).
5. Links: **Docs** → `/docs/start`, **Try offline** → `/try` or `/overview`, npm — **fix Documentation URL** (today wrongly `/overview`).
6. One “when not to use” sentence (TanStack-only cache UI / no durable writes).

### Move to deep docs (or collapse under `<details>` / “Appendix”)

| README block today                                                     | Better home                                                                      |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| “What you get” feature table (~118–136)                                | Marketing or `/docs/start` “what you get later”                                  |
| Framework support matrix (~139–155)                                    | `/docs/advanced` adapters                                                        |
| Full `resource` / `resourcePattern` / `action` option dumps (~157–248) | `/docs/api` + `/docs/read` / `/docs/save`                                        |
| Conflict resolution longform (~250+)                                   | `/docs/save` or recipes                                                          |
| Hooks / stores / telemetry / SW updates / queue management (~306–436)  | `/docs/api` + advanced                                                           |
| TanStack, Push, Testing, OpenAPI, Devtools (~438–662)                  | recipes / advanced                                                               |
| SSR adapters essay (~683–697)                                          | advanced                                                                         |
| How it compares (~710–726)                                             | optional appendix or site page                                                   |
| Troubleshooting table (~664–681)                                       | keep 3-row teaser + link `docs/guides/troubleshooting.md` / `/docs/troubleshoot` |

**Already good deep content (do not delete — re-home):** `docs/guides/getting-started.md`, `guarantees.md`, `glossary.md`, `troubleshooting.md` — currently better teaching than playground Quick Start; wire into IA instead of leaving README-only.

---

## 5. Non-breaking API / DX improvements (facts from code)

Prefer **docs + messages + aliases**; avoid changing queue/runtime semantics (see §6).

### Error / warn messages already strong (document + surface in UI docs)

| Message                                                              | Source                                 |
| -------------------------------------------------------------------- | -------------------------------------- |
| SW unsupported / insecure context / SW 404 / registration failed     | `packages/core/src/sw-bridge.ts:25–83` |
| Orphaned queue item: declare `action()` at module scope              | `action.ts:41–43`                      |
| Duplicate action id — unique `name` / `namespace`                    | `action.ts:76–78`                      |
| `conflict.strategy` merge/custom without `resolve()` → retry forever | `action.ts:96–98`                      |
| Non-JSON-serializable neverLose args                                 | `action.ts:221–223`                    |
| `resource` vs `resourcePattern` misuse                               | `resource.ts:178–180`, `247–248`       |
| Re-register different config → cached handle                         | `resource.ts:163–165`                  |
| Offline: no cached response for URL                                  | `resource.ts:359–361`                  |
| Vite plugin cannot find `eidos-sw.js`                                | `vite.ts:38–40`                        |

**DX gap:** offline miss (`resource.ts:359–361`) does not suggest registering `offline: true`, warming cache, or checking SW status — a non-breaking message enrichment would help without semantic change.

### Defaults (document clearly; do not silently change)

| Default                                | Fact                                                                                                                                                                                |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maxRetries`                           | `config.maxRetries ?? 3` — `action.ts:237`                                                                                                                                          |
| `priority`                             | `'normal'` — `action.ts:239`                                                                                                                                                        |
| `reliability`                          | **Required** discriminated union `'best-effort' \| 'neverLose'` — `types.ts:163–177` (no default; docs must not imply neverLose is automatic except `@sweidos/next` `serverAction`) |
| `neverLose` requires `name: string`    | `types.ts:171–176`                                                                                                                                                                  |
| `offline: true` → StaleWhileRevalidate | documented in README / glossary; Advanced docs                                                                                                                                      |
| `networkTimeoutMs` default 3000        | README resource snippet                                                                                                                                                             |
| `swPath` defaults `"/eidos-sw.js"`     | `getting-started.md:86`                                                                                                                                                             |
| `autoReplay`                           | mentioned as default-on in ApiReference provider bullets                                                                                                                            |

### Aliases / link fixes (non-breaking product)

- README + `package.json` `homepage` currently `…/overview` — point to `/docs/start` (or keep playground URL under “Live playground” only).
- GitHub URLs: `iamadi11/eidos` → `sweidos/eidos` in Header, `DOCS_GITHUB_BASE`, References.
- Route aliases already exist (`/demo`, `/learn`); add `/try` → overview and docs redirects per Architecture D1 without removing old paths.
- Fix JSDoc on `namespace` (`types.ts:117–120`) to match throw-on-duplicate behavior (`action.ts:75–78`) — types/docs only.

### Public API surface (brief) — `packages/core/src/index.ts`

**Declared:** `resource`, `resourcePattern`, `warmCache`, `setQueryInvalidator`, `action`, `replayQueue`, `clearQueue`, `cancelByIdempotencyKey`, `requeueItem`, `initEidos`, `_resetEidos`, `subscribeReplayOnReconnect`, queue storage setters/adapters, React `EidosProvider` + hooks (`useEidos*`), `VERSION`, SW bridge helpers (`setOfflineSimulation`, …), `eidosDebug`, `useEidosStore`, framework-agnostic stores, shared types.

**Separate export paths (not in `index.ts`):** `./vite`, `./query`, `./push`, `./testing`, `./nextjs`, `./sw`, etc. (`package.json` `exports`). Playground docs under-teach subpath imports; README over-teaches them mid-file.

**Alias idea (non-breaking, optional later):** docs-facing nicknames “Save” / “Read” as **documentation terms only** — Product Strategy explicitly avoids rename theater / semver breaks for API renames.

---

## 6. What NOT to change (freeze line candidates)

From Architecture D4 + guarantees + implementation:

### Freeze: `neverLose` semantics

Do not alter:

- Offline persist-before-network / online execute-then-persist-on-failure story (`docs/guides/guarantees.md:9–18`, glossary `neverLose`).
- Stable `idempotencyKey` across retries and reloads (`guarantees.md:20–26`).
- At-least-once **delivery** vs exactly-once **execution** requiring server dedupe (`guarantees.md:38–60`) — docs may clarify language; must not claim exactly-once.
- Requirement of stable `name` for neverLose (`types.ts:171–176`).
- Failed-after-`maxRetries` still inspectable / requeueable — “Nothing is silently dropped” (`guarantees.md:18`).

### Freeze: queue / runtime / coordination

Do not casually change:

- IndexedDB queue item shape / `schemaVersion` / `CURRENT_QUEUE_SCHEMA_VERSION` (`action.ts` persist path).
- Web Locks single-tab replay + BroadcastChannel status (`guarantees.md:28–32`).
- Crash-safe: `replaying` not persisted as durable truth (`guarantees.md:32`).
- Module-scope registry / orphaned counter + warn (`action.ts` `reportOrphaned`, README Known limitations).
- `replayQueue` / `clearQueue` / `cancelByIdempotencyKey` / `requeueItem` contracts.
- Cross-tab queue sync and storage pluggability (`setQueueStorage`) behavior used by RN / SQLite adapters.
- GET-only SW interception assumption (Known limitations).

### Freeze: public export names for this revamp

Prefer zero runtime churn (`ARCHITECTURE.md` D4). Docs/nav/README/copy first. If any helper lands, keep size-budget safe and additive.

### Safe to change (out of freeze)

- Playground routes, Header labels, Landing/Demo copy, docs IA, README length.
- GitHub org links, Documentation URL.
- JSDoc mismatches, warn string clarity (additive).
- Promoting `docs/guides/*` into in-app docs.

---

## Appendix A — File size / density snapshot

| Artifact             | Lines (approx.) |
| -------------------- | --------------- |
| `README.md`          | 744             |
| `Demo.tsx`           | 915             |
| `ExamplesLive.tsx`   | 1145            |
| `Examples.tsx`       | 555             |
| `Advanced.tsx`       | 388             |
| `Landing.tsx`        | 182             |
| `ApiReference.tsx`   | 184             |
| `QuickStart.tsx`     | 149             |
| `Hooks.tsx`          | 69              |
| `References.tsx`     | 49              |
| `getting-started.md` | ~246            |
| `troubleshooting.md` | ~291            |
| `glossary.md`        | ~185            |
| `guarantees.md`      | ~141            |

## Appendix B — Cross-links to mission docs

- Strategy: `research/dx-docs-revamp-20261014/PRODUCT_STRATEGY.md`
- Architecture: `research/dx-docs-revamp-20261014/ARCHITECTURE.md`

---

_End of audit. Evidence-only; no product code modified._
