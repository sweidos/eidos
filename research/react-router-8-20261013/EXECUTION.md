# React Router 8 — Execution Ledger

**Mission:** Maintenance sweep — migrate playground to react-router v8 (supersede Dependabot #57)
**Status:** `in_progress`
**Freeze line:** Do not change `@sweidos/eidos` core runtime or raise 7 kB budget
**Branch:** `cursor/react-router-8-34f7`
**Skill:** eidos-product-engineering v1.1.0 bare re-invoke

## Decisions

- v8 removes `react-router-dom` — imports moved to `react-router`; drop `react-router-dom` dep
- Spec `^8.3.0` (Dependabot target); resolved 8.4.0

## Next action

PR → merge → close #57 → mark complete after tip CI green
