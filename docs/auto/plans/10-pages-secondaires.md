# Plan 10 — pages-secondaires

Brief: `docs/auto/brief.md` · Branch: `auto/plan-10-pages-secondaires` · Base: `6d4d8a72fe2eeff09f6fb63037878534cc6628ff`

## Goal
In both themes: `/a-propos` shows the prototype's about structure (contract E11: `~/ whoami` identity block in mono `clé: valeur`, links, `Ma boîte à outils` stack grid with logos, the AI-rule panel with the three AI-usage markers) using only facts the repo already holds; `/transparence-ia`, `/tags`, `/tags/<tag>`, `/404` and the search dialog use the contract patterns (`card` / `card-inner` / `panel` / `pill`); every tag chip on the site carries one of the 5 tag tones of §2.3, chosen by a stable hash of the tag's slug, so a given tag has the same tone on every page (E10); the three AI-usage levels are drawn with contract tones and are visually distinct from each other and from the page background in both themes

## Reachability
From `http://localhost:4321/`: header pill `À propos` › `/a-propos`; home banner pill `transparence IA →` (or the link in any article's AI banner, or in the about AI panel) › `/transparence-ia`; `/blog` › `tous les tags →` › `/tags` › any tag › `/tags/<tag>`; any unknown URL › `/404`; loupe button or ⌘K › search dialog; tag chips on `/prompts`, `/skills`, `/tags`, `/tags/<tag>` and the Infos tab of prompt and skill pages. Every path exists today; the plan changes what they render.

### About map (D26: a field shows only when the repo feeds it; measured at base)
| Block | Class | Fed by |
|---|---|---|
| Row 1 left — identity | none (on `bg`) | `~/ whoami` (mono accent); `<h1>` « Benoît Catillon, alias benCat_ » and bio = the paragraph of `Hero.astro`; mono links `github.com/bendevcat` → `https://github.com/bendevcat`, `rss.xml` → `/rss.xml` |
| Row 1 right — terminal | `.card` | `➜ ~ whoami --long`, then one `clé: valeur` line per key below (keys `badgeInk`, values `body`, all mono) |
| Row 2 | two `.card`s | `Qui je suis` and `Pourquoi ce site`: headings and paragraphs of the current `/a-propos` (the prototype's `On parle ?` slot has no real contact channel: no email, no LinkedIn) |
| AI panel | `.panel`, 3 `.card-inner` | title « L'IA : une aide, pas un ghostwriter » + the current AI paragraph; per level (order `none`, `partial`, `full`): 28×28 tile in the level's tone with its emoji, `label`, `description` — all read from `AI_USAGE_META`; link « Comment je déclare l'usage de l'IA » → `/transparence-ia/` |
| `Ma boîte à outils` | `.card` | union of the projects' `stack` in `getSortedProjects()` order, each a neutral pill (`chip` background, mono) with an inline SVG logo in `currentColor` when `src/lib/stackLogos.ts` has one (Simple Icons `16.31.0`, CC0: astro, tailwindcss, typescript, githubpages, githubactions, gnubash, go), text only otherwise (Sveltia CMS, SVU) |

Terminal lines, derived at build by `src/lib/about.ts`: `nom` and `alias` from the Hero `<h1>`; `rôle` « ingénieur DevOps depuis 2019 » and `lieu` « France » from the current page; `terrain` = the 3 first labels of `collectTagIndex`; `écrit` = published counts; `stack` = the toolbox list; `règle` from the current AI heading. A line whose source is empty is dropped.

### Tone map
Tokens `--color-tag{Green,Blue,Violet,Amber,Rose}{Bg,Ink,Line}` (15 per theme, §2.3 verbatim) live in `@theme static` and `:root[data-theme="dark"]`; `src/lib/tones.ts` maps each tone to literal utilities `bg-tag<T>Bg text-tag<T>Ink border-tag<T>Line`. Tags: `tagTone(tag)` = stable hash of `tagSlug(tag)` mod 5. AI levels: `none` green, `partial` amber, `full` blue (prototype markers). Every toned element carries `data-tone="<tone>"`; every tag chip also carries `data-tag="<slug>"`.

Tag chip inventory (88 chips on 37 pages): `/tags` 30 links (with count); each `/tags/<slug>` 1 chip in its header; `/skills` 4 filter pills (`tous` stays neutral); `/skills` cards 5; `/prompts` cards 7; Infos tab of `bootstrap-session-anti-drift` 4, `decouper-un-projet-en-plans-anti-drift` 3, `anti-drift-planning` 4, `superpowers` 1. `<option>`s of the `/blog` and `/prompts` tag selects are not chips.

Expected output of `scripts/check-secondary.mjs` (`<n>` ≥ 3):
```
whoami nom: Benoît Catillon
whoami alias: benCat_
whoami rôle: ingénieur DevOps depuis 2019
whoami lieu: France
whoami terrain: claude-code · devops · anti-drift
whoami écrit: 5 articles · 2 projets · 3 prompts · 2 skills
whoami stack: Astro · Tailwind CSS · TypeScript · Sveltia CMS · GitHub Pages · GitHub Actions · Bash · Go · SVU
whoami règle: une aide, pas un ghostwriter
toolbox: Astro+ | Tailwind CSS+ | TypeScript+ | Sveltia CMS | GitHub Pages+ | GitHub Actions+ | Bash+ | Go+ | SVU
ai-rule: ✍️ 100% humain green | 🤝 co-créé avec IA amber | 🤖 IA relue blue
ai-banner: none green | partial amber | full blue
tags: 30 slugs · 88 chips on 37 pages · <n>/5 tones
```
(`+` = the item holds an inline `<svg>`.)

## Criteria
| ID | Criterion | Measure | Guarantee |
|---|---|---|---|
| R0 | In both themes: `/a-propos` shows the prototype's about structure (contract E11: `~/ whoami` identity block in mono `clé: valeur`, links, `Ma boîte à outils` stack grid with logos, the AI-rule panel with the three AI-usage markers) using only facts the repo already holds; `/transparence-ia`, `/tags`, `/tags/<tag>`, `/404` and the search dialog use the contract patterns (`card` / `card-inner` / `panel` / `pill`); every tag chip on the site carries one of the 5 tag tones of §2.3, chosen by a stable hash of the tag's slug, so a given tag has the same tone on every page (E10); the three AI-usage levels are drawn with contract tones and are visually distinct from each other and from the page background in both themes | reachability walkthrough on `npm run build && npx astro preview`, light then dark (`localStorage.theme` + reload), 1180 and 375: follow every Reachability path; `/a-propos` shows the About map blocks in order; `claude-code` has the same computed chip background on `/tags`, `/tags/claude-code/`, `/skills`, `/prompts` and `/skills/superpowers/` (Infos); the 3 banners of `/transparence-ia` show green, amber, blue | no |
| R1 | Tag tone is a stable hash of the slug | `npx vitest run src/lib/tags.test.ts` → 0 failed, and these pass: `tagTone` › "returns one of the five contract tones", "gives one tone to every spelling of a slug" (`Sécurité`/`securite`, `Claude Code`/`claude-code`), "keeps the pinned tone of known slugs" (literal tones for `devops`, `claude-code`, `kubernetes`, `anti-drift`), "spreads the site's current tags over at least 3 tones" (the 30 slugs above) | yes |
| R2 | AI levels use contract tones only | `npx vitest run src/lib/aiUsage.test.ts` → 0 failed, and these pass: "draws none, partial and full with the green, amber and blue tones", "uses no colour class outside the contract tokens and tones" (every `bg-`/`text-`/`border-` utility in each level's classes names a §2 token or a `tag*` tone token) | yes |
| R3 | §2.3 tones are tokens, both themes | `npx vitest run src/lib/tones.test.ts` → 0 failed, and "defines the 5 tag tones of contract §2.3 in both themes" passes (reads `global.css`; 15 light + 15 dark values equal §2.3) and "maps each tone to its bg, ink and border utilities" passes | yes |
| R4 | Every tag chip carries its hashed tone, same on every page | `npm run build && node scripts/check-secondary.mjs` → last line `tags: 30 slugs · 88 chips on 37 pages · <n>/5 tones` with n ≥ 3, exit 0. Exit 1 if: an `li` of any `ul[aria-label="Tags"]`, a `/tags/<slug>/` link on `/tags`, a `button[data-facet-key="tag"]` other than `tous`, or the `/tags/<slug>` header chip lacks `data-tag` + `data-tone`; a chip's class lacks its tone's three utilities or keeps `text-muted`; one slug has two tones across `dist/` | no |
| R5 | About shows the About map | same script → the 11 `whoami`/`toolbox`/`ai-rule`/`ai-banner` lines exactly. Exit 1 if `dist/a-propos/index.html`: has ≠ 1 `<h1>` or no `~/ whoami`; lacks a link to `https://github.com/bendevcat` or `/rss.xml`; the terminal is not a `.card`; row 2 is not two `.card`s; the AI panel is not a `.panel` with 3 `.card-inner`; the toolbox is not a `.card`; a toolbox item holds an `<img>` or an `http` URL | no |
| R6 | No author text lost, no prototype value | same script exits 1 unless the whitespace-normalised `<main>` text of `/a-propos` contains verbatim the Hero paragraph and the three paragraphs of base `/a-propos` (Qui je suis, Pourquoi ce site, L'IA), held as literals in the script; and exits 1 if the page matches `/mailto:\|linkedin\|hello@\|github\.com\/bencat(?![a-z])/i`. `git ls-files src/components/Hero.astro` → empty; `grep -rn "components/Hero" src` → empty | no |
| R7 | Secondary pages use the four patterns | same script exits 1 if: `/transparence-ia` lacks a `.card` holding 3 `.card-inner` levels; `/tags` lacks a `.card` around the chips; `/tags/devops` has a group that is not a `.card` or an entry link that is not a `.card-inner`; `/404` lacks a `.card` with ≥ 3 `.pill` links to `/`, `/blog`, `/tags` (trailing slash optional); in the `<main>` of those 5 pages any element carries `border-line` with `rounded-card` or `rounded-inner` (hand-drawn card). `grep -c 'card-inner' src/scripts/search.ts` ≥ 1 | no |
| R8 | Search dialog uses the patterns | on the preview, both themes: open with ⌘K, type `devops` → the dialog computes `background-color` = probe `surface`, radius 20px; ≥ 1 result; every result link is a `.card-inner` (radius 14px, bg = probe `card`); the `esc` control is a `.pill`; Tab from the input reaches the first result, Escape closes | no |
| R9 | AI levels visually distinct, both themes | on `/transparence-ia` (3 banners), `/a-propos` (3 tiles) and `/blog/comment-jutilise-github-actions-au-quotidien/`, `/blog/k9s-kubernetes-terminal-ui/`, `/blog/docker-kubernetes-devops/` (one banner each), light and dark: each level's background, composited over its nearest painted ancestor, is at RGB distance ≥ 15 from that ancestor and ≥ 15 from the other two levels; label and description text ≥ 4.5:1 on it | no |
| R10 | Tag chips legible and stateful | light and dark: every chip on `/tags`, `/skills`, `/prompts/bootstrap-session-anti-drift/` → ink ≥ 4.5:1 on its composited background; on `/skills` a pressed tag pill differs from an unpressed one in `box-shadow`, `outline` or `border-color`; clicking `anti-drift` leaves 1 card (`anti-drift-planning`), `tous` brings back 2 | no |
| R11 | Layout at three widths | at 375, 768, 1180, both themes, `document.documentElement.scrollWidth <= innerWidth` on `/a-propos`, `/transparence-ia`, `/tags`, `/tags/devops/`, `/404`, `/prompts`, `/skills`, `/prompts/bootstrap-session-anti-drift/`, `/skills/anti-drift-planning/`, `/blog/docker-kubernetes-devops/`, and with the search dialog open on results; `/a-propos` at 1180: identity and terminal share a row (equal top), row 2 cards share a row; at 375 every block's top ≥ the previous block's bottom | no |
| R12 | Contract rules on the touched pages (V2, V3, V4, V5, V6) | on the 5 secondary pages + dialog, both themes: every `.card` has `bg` as nearest painted ancestor; every `.card-inner` has a `.card` or `.panel`; every non-zero radius ∈ {9, 10, 14, 20, 999}px; dark: no element carries accent green and `badgeInk`/`badgeBg`/`panel`/`panelLine` together; light: no computed colour `rgb(125, 211, 252)`; bio, row 2 paragraphs, AI paragraph, marker descriptions, 404 message, transparence descriptions compute `"Nebula Sans"`; terminal lines, toolbox names and tag chips compute `"JetBrains Mono` | no |
| R13 | No colour outside contract in touched code | `grep -rnE '(slate\|gray\|zinc\|neutral\|stone\|red\|orange\|amber\|yellow\|lime\|green\|emerald\|teal\|cyan\|sky\|blue\|indigo\|violet\|purple\|fuchsia\|pink\|rose)-[0-9]{2,3}' src/lib/aiUsage.ts src/lib/tones.ts src/components/AiBanner.astro src/components/TagChip.astro src/components/about src/pages/a-propos.astro src/pages/transparence-ia.astro src/pages/tags src/pages/404.astro src/scripts/search.ts` → empty | no |
| R14 | Home and details not regressed | `npm run build && node scripts/check-home.mjs` → the 7 lines of plan 9, exit 0; `node scripts/check-detail-tabs.mjs` → the 7 rows of plan 8, exit 0 | no |
| R15 | No fifth pattern class | `sed -n '/@layer components {/,/^}/p' src/styles/global.css \| grep -cE '^\s+\.[a-z-]+ \{'` → `4` | no |
| R16 | Frozen paths untouched | `git diff 6d4d8a7 --stat -- src/content.config.ts src/content public/admin/config.yml docs/anti-drift .github/workflows` → empty | no |
| R17 | Suite and types green; kept code kept | `npx vitest run` → 0 failed, count > 173; `npm run check` → `0 errors`; `grep -c 'export function matchesFilters' src/lib/projectFilters.ts` → `1`; `git diff 6d4d8a7 -- package.json` → empty | no |

## Shared resources
- `src/styles/global.css` — gains the 15 tone tokens per theme; `@layer components` keeps its 4 classes (R15).
- `src/lib/aiUsage.ts` — `scripts/check-home.mjs` reads it with `/emoji:\s*'…',\s*label:\s*'…'/`: keep `emoji` then `label` adjacent, single-quoted.
- `scripts/check-home.mjs`, `scripts/check-detail-tabs.mjs` — unchanged, re-run (R14).
- `dist/`, dev/preview server on port 4321. `package.json`: untouched (logo paths are copied once from the `simple-icons@16.31.0` tarball, like `Icon.astro`; no dependency, no version bump — `v1.4.0` is the end-of-run publication, D25).

## Tasks
### T1 — Tone tokens and pure tone logic
- Files: `src/styles/global.css`, `src/lib/tones.ts` (new), `src/lib/tones.test.ts` (new), `src/lib/tags.ts` (`tagTone`), `src/lib/tags.test.ts`, `src/lib/aiUsage.ts` (`tone` per level; banner classes built from `TONE_CLASSES`, Tailwind palette gone), `src/lib/aiUsage.test.ts` (new)
- Covers: R1, R2, R3, R13 (lib part)
- Acceptance: `npx vitest run` → 0 failed, every test named in R1–R3 present; `npm run build && node scripts/check-home.mjs` → 7 lines, exit 0
- Depends on: —

### T2 — Toned tag chips everywhere
- Files: `src/components/TagChip.astro` (new: `data-tag`, `data-tone`, tone utilities, mono, radius 999; `<a>` when given `href`, `<li>` otherwise), `src/components/PromptCard.astro`, `src/components/SkillCard.astro`, `src/pages/prompts/[...slug].astro`, `src/pages/skills/[...slug].astro`, `src/pages/skills/index.astro` (tag filter pills: tone classes; pressed = `ring` in `currentColor`), `src/pages/tags/index.astro`, `src/pages/tags/[tag].astro` (header chip), `scripts/check-secondary.mjs` (new, dependency-free like `check-home.mjs`; about/AI lines reported missing until T3–T4)
- Covers: R4
- Acceptance: `npm run build && node scripts/check-secondary.mjs` → `tags: 30 slugs · 88 chips on 37 pages · <n>/5 tones`, n ≥ 3, no tag error; `npx vitest run` → 0 failed
- Depends on: T1

### T3 — AI levels, `/transparence-ia`, `/tags`, `/tags/<tag>`, `/404`, search
- Files: `src/components/AiBanner.astro` (`data-tone`), `src/pages/transparence-ia.astro`, `src/pages/tags/index.astro`, `src/pages/tags/[tag].astro`, `src/pages/404.astro`, `src/components/SearchDialog.astro` (`esc` as `.pill`; backdrop untouched), `src/scripts/search.ts` (result links `.card-inner`), `scripts/check-secondary.mjs`
- Covers: R7, R8 (static), R13
- Acceptance: `npm run build && node scripts/check-secondary.mjs` → `ai-banner` and `tags` lines as expected, no pattern error; `npm run check` → `0 errors`
- Depends on: T2

### T4 — `/a-propos`
- Files: `src/lib/about.ts` + `src/lib/about.test.ts` (new: `collectStack` › "lists each stack item once, in project order"; `whoamiLines` › "derives écrit from the four published counts", "names the three most used tags as terrain", "drops a line whose source is empty"), `src/lib/stackLogos.ts` (new: 7 paths, source and licence in header), `src/components/about/*` (new: identity, terminal, AI panel, toolbox), `src/pages/a-propos.astro`, `src/components/Hero.astro` (deleted), `scripts/check-secondary.mjs`
- Covers: R5, R6, R13
- Acceptance: `npm run build && node scripts/check-secondary.mjs` → exactly the 12 expected lines, exit 0; `npx vitest run` → 0 failed
- Depends on: T1, T3

### T5 — Rendered measurement pass
- Files: fixes only, in T1–T4 files
- Covers: R0, R8–R12 (rendered), R14–R17
- Acceptance: run by the orchestrator (implementers have no browser, D20) on `npm run build && npx astro preview` (search needs Pagefind), both themes, 375 / 768 / 1180: every measure of R0, R8–R12 → as stated; R14–R17 commands → as stated
- Depends on: T4

## Out of scope
- Plan 11: AA of every pair and 375 px on routes this plan does not touch, V2 elsewhere, project-status palette (`projectStatus.ts`), search backdrop `backdrop:bg-black/60`, `aria-live` on list meta, plan-8 leftovers.
- Tone on the compact AI marker of `ArticleCard` and the home (stays emoji + label text); tags on article or project pages; making Infos chips links; `<option>` tag lists.
- Any change to `src/content/**`, `src/content.config.ts`, `public/admin/config.yml`, `docs/anti-drift/**`, `.github/workflows/**`; prototype demo values (email, LinkedIn, `github.com/bencat`, quotes, its stack list).
- Version bump, tag, merge, push, deploy.
