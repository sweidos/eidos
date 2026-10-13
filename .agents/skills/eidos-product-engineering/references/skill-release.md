# Skill release procedure

## Canonical vs runtime

| Location | Role |
| --- | --- |
| **Repo** `sweidos/eidos` → `.agents/skills/eidos-product-engineering/` | **Canonical** source of truth |
| **Runtime** `~/.cursor/skills-cursor/eidos-product-engineering/` | Discovery/install mirror — not a second master |

Never edit only the runtime copy and call it shipped. Change canonical → PR → merge → sync runtime.

## Layout

- `SKILL.md` — frontmatter, modes, gates, autonomy (keep lean; prefer references for playbooks)
- `references/*.md` — detailed procedures
- `CHANGELOG.md` — ship history for the skill

## Versioning

1. Bump `version` in `SKILL.md` frontmatter on every meaningful behavior change.
2. Add a `CHANGELOG.md` entry (Added / Changed / Fixed).
3. Ship via PR on `cursor/skill-*-<suffix>`; record PR + version in mission `RELEASE.md` when the skill itself is in scope.

## Ship steps

1. Edit under `.agents/skills/eidos-product-engineering/` in the Eidos checkout.
2. Fix links; ensure recovery/release/orchestration/skill-release cover autonomy gaps.
3. Open PR → wait for required CI → merge.
4. Sync merged tree to `~/.cursor/skills-cursor/eidos-product-engineering/` (`rsync -a --delete` or equivalent).
5. Verify runtime `SKILL.md` `version` matches canonical.
6. Report skill version, PR URL, runtime sync — separately from npm package publish.

## Do not

- Claim skill released if only `~/.cursor/skills-cursor` changed
- Mark a product mission complete solely because the skill file was updated
- Diverge runtime from canonical after merge
