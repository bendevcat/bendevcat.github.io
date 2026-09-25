# Plan 18 — finition-fidelite

Brief: `docs/auto/brief.md` · Branch: `auto/plan-18-finition-fidelite` · Base: `59d66a4578a580f1fbfb4fee5b797812e6d6c459`

## Goal
On every route (home, 4 lists, article, 3 detail pages, about, AI transparency, tags, tag page, 404, search open), in both themes: each of the prototype's 10 screens matches its prototype screenshot at 1280 px in structure (same blocks, same order, same columns — a side-by-side table in the evidence); the home and about small gaps of inventory §10 are closed; at 375 px no horizontal overflow; every text/background pair ≥ 4.5:1 (≥ 3:1 large text); no surface-level jump (V2); no colour outside the tokens (the always-dark windows use named tokens)

## Reachability
From `http://localhost:4321/`: header nav › `/blog/`, `/projets/`, `/skills/`, `/prompts/`, `/a-propos/`; a list entry › its article / detail page; home banner `transparence IA →` › `/transparence-ia/`; any tag chip › `/tags/<slug>/`; the `/blog` rail or `/tags/` link › `/tags/`; an unknown URL › `/404`; loupe button or ⌘K › search dialog. Every path exists at base; this plan changes no route.

### Built facts (measured at base `59d66a4`, `npm run build`)
51 pages. Every `scripts/check-*.mjs` exits 0 (their lines are the base reference for R17). `npx vitest run` → 379 passed. Home: `<main>` and both row grids `gap-5` (20 px); the 4 panel headers `justify-between` (title left, badge right). About: identity links `github.com/bendevcat` and `rss.xml` only (D42); `Pourquoi ce site` is a plain `.card` (1 px `line` border). The superpowers description (English) renders on 5 pages, only `/skills/superpowers/` marks it `lang="en"` (`/`, `/skills/`, `/tags/claude-code/`, `/prompts/macos-clone/` do not). `PromptInfos` tag chips (7, on 2 prompt pages) are plain text. Without JS the theme toggle shows and does nothing; the bootstrap prompt's 4 variables show name and hint, no value. `BlogRail` `Catégories` block is `gap-2` (8 px; prototype 174: `margin:0 0 10px`). Skill aside: `lg:max-h-[calc(100vh-40px)] lg:overflow-y-auto lg:pb-5`, no scroll padding. `DetailTabs` still has the `pill` variant (default, unused); `ProjectAside` a `class` prop no caller passes.

### Design rules (prototype home 57–161 from the decoded cache; about from inventory §10)
- **Home** (§10): `<main>` and both row grids 16 px apart (rows and columns — prototype `gap:16px` on all three). Each of the 4 headers (`Derniers articles`, Projets, Prompts, Skills) follows `flex-direction:row-reverse; justify-content:flex-start` (+ `flex:1; text-align:right` on the panel titles): the badge sits at the right edge and the title right-aligned immediately to its left, 10 px apart. Title link, `data-home*` hooks and the badge's `aria-hidden` unchanged.
- **About** (§10): identity links stay exactly `github.com/bendevcat` · `rss.xml` (no mail, no LinkedIn); `Pourquoi ce site` card gets a 3 px `accent` left border (other sides unchanged); `On parle ?` stays dropped (D42, D63).
- **English descriptions**: wherever an entry description renders in `<body>`, `quoteLang(description) === 'en'` puts `lang="en"` on its element (French: no attribute, as `SkillHeader`). Today: `SkillCard`, home `SectionEntry`, `RelatedSkillsCard`, `/tags/[tag]`.
- **Without JS**: `#theme-toggle` is `display:none` when `<html>` lacks `data-js` (unlayered rule beside `[data-search-open][hidden]`; no markup change, no flash). Each prompt variable with a default shows one line `défaut : <value>` (label mono 11 `muted`, value mono 13 `ink`, `data-var-static`), `display:none` when `data-js` is set; the input stays server-`hidden`.
- **Prompt infos**: each tag chip is `TagChip href="/tags/<tagSlug>/"`, list named by its `dt` (`aria-labelledby`), as `SkillInfos` (plan 17 F1).
- **Rail**: `Catégories` label → first row 10 px, both `BlogRail` variants (`/blog`, article rail).
- **Skill aside**: `scroll-padding-bottom` 8 px from 1024 px, so a focused last link's 2 px + 2 px ring stays inside the scrollport.
- **Dead code**: `DetailTabs` `variant` becomes required `'underline' | 'track'` (pill classes and comments gone); `ProjectAside` loses `class`. Built HTML unchanged.
- **Search Escape**: kept as native `type=search` (first Escape clears a non-empty field, next closes the dialog) — logged, not changed.
- **macos-clone**: a test pins single spaces inside each line (plan 16 finding) — cheap guard of a sourced text.
- No token, no content file, no schema change.

### Structure reference at 1280 (inventory §0–§10; used by R14)
| Screen | Blocks in order · columns |
|---|---|
| Home | featured \| Derniers articles (1.35 : 1) · Projets \| Prompts \| Skills (equal) · AI banner |
| Blog list | header (`~/ blog`, h1) · one card: rail 250 (Catégories, Tags) \| main (toolbar + sort, rows 76 px thumb) |
| Article | breadcrumb, h1, meta · one card: rail 250 \| centre \| rail 230 (Sommaire, Projets liés) |
| Projects list | header · segmented statut + techno dropdown · hero 1 : 1.1 · 3-column grid (gap 18) |
| Project | main card (banner, back link, h1, underline tabs) \| aside 280, gap 26 |
| Prompts list | header · segmented format + outil dropdown · 3-column grid (gap 16), no thumbnail |
| Prompt | header + meta · dark window \| column 340 (track tabs, Skills liés, Prompts liés), gap 22 |
| Skills list | header · segmented type + tag dropdown · 3-column grid (gap 16), no thumbnail |
| Skill | header + meta · install window, highlights, explorer \| sticky column 340, gap 22 |
| About | identity \| terminal · Qui je suis \| Pourquoi ce site · AI panel · toolbox |

Accepted differences = logged decisions (e.g. D42 no `On parle ?`, D92 no list frame / no `prochain projet`, D87 AI card, D103 real workflow files, D114 window colours, `En détail` card).

### Instrument `scripts/check-fidelity.mjs` (new; reads `dist/`) — expected output
```
home: rows and columns 16 px apart · 4/4 headers title then badge, right-aligned
about: links github.com/bendevcat | rss.xml · Pourquoi ce site left border 3 px accent · 2 row-2 cards · no contact card
lang: 1 English description (superpowers) · 5/5 renderings inside lang="en"
no-js: #theme-toggle hidden without data-js · [data-search-open] hidden on 51/51 pages · 4 variable defaults as text (bootstrap-session-anti-drift)
prompt tags: 7 chips on 2 pages · all → /tags/<slug>/ and resolve
rail: Catégories label 10 px above its rows on 6/6 pages
skill aside: scroll padding bottom ≥ 6 px on 2/2
```
Exit 1 when a line differs: a home grid not 16 px or a header whose badge is not after a right-aligned title; an extra/missing identity link or a `mailto:`/`linkedin`; the 3 px accent border missing; an English description (any collection, `quoteLang`) rendered in `<body>` without `lang="en"` on itself or an ancestor; the CSS bundle lacking the no-JS toggle rule; a variable default missing its `data-var-static` line; a prompt tag chip that is not a resolving `/tags/<slug>/` link; the rail or aside classes reverted.

## Criteria
| ID | Criterion | Measure | Guarantee |
|---|---|---|---|
| R0 | On every route (home, 4 lists, article, 3 detail pages, about, AI transparency, tags, tag page, 404, search open), in both themes: each of the prototype's 10 screens matches its prototype screenshot at 1280 px in structure (same blocks, same order, same columns — a side-by-side table in the evidence); the home and about small gaps of inventory §10 are closed; at 375 px no horizontal overflow; every text/background pair ≥ 4.5:1 (≥ 3:1 large text); no surface-level jump (V2); no colour outside the tokens (the always-dark windows use named tokens) | reachability walkthrough on `npm run build && npx astro preview`, light then dark (`localStorage.theme` + reload): every Reachability path lands on a 200 page that is not `/404`; R1–R19 hold (R13 may be smoke only if the design MCP cannot render — R14 then carries structure) | no |
| R1 | Home spacing and headers | `npx vitest run src/lib/pageLayout.test.ts` → "spaces the home rows and columns 16 px apart", "puts each home header title right-aligned beside its badge, 10 px apart" pass | yes |
| R2 | About gaps | `npx vitest run src/lib/pageLayout.test.ts` → "draws a 3 px accent left border on Pourquoi ce site only", "keeps the identity links to github and rss only" pass | yes |
| R3 | English descriptions marked | `npx vitest run src/components/SkillCard.test.ts src/components/home/SectionEntry.test.ts src/components/prompt/RelatedSkillsCard.test.ts` → in each, "marks an English description lang=\"en\"" and "leaves a French description without lang" pass | yes |
| R4 | Theme toggle hidden without JS | `npx vitest run src/lib/shell.test.ts` → "hides the theme toggle without JavaScript, like the search trigger" pass | yes |
| R5 | Variable defaults without JS | `npx vitest run src/components/prompt/PromptVariables.test.ts` → "shows each default as text for the no-JS page", "shows no value line for a variable without default", "hides the value lines once JavaScript runs" (reads the `html[data-js] [data-var-static]` rule) pass | yes |
| R6 | Prompt infos tags link | `npx vitest run src/components/prompt/PromptInfos.test.ts` → "links each tag chip to /tags/<slug>/" pass | yes |
| R7 | macos-clone whitespace | `npx vitest run src/lib/promptContent.test.ts` → "macos-clone has no tab, trailing space or double space inside a line" pass; red after inserting a second space inside one bullet | yes |
| R8 | Rail gap and aside padding | `npx vitest run src/components/blog/BlogRail.test.ts src/lib/pageLayout.test.ts` → "puts 10 px between the Catégories label and its first row, in both variants", "pads the sticky skill column's scroll by at least 6 px at the bottom" pass | yes |
| R9 | Dead code gone, output unchanged | `grep -c "'pill'" src/components/DetailTabs.astro` → `0`; `grep -c "class?:" src/components/project/ProjectAside.astro` → `0`; `dist/**/*.html` of this task's commit identical to its parent's build after replacing `/_astro/<name>.<hash>.<ext>` by `/_astro/<name>.<ext>` | no |
| R10 | Built site | `npm run build && node scripts/check-fidelity.mjs` → the 7 lines above, exit 0; exit 1 on one injected defect per line | no |
| R11 | Rendered gaps | preview, 1280, both themes: home row and column gaps 16 (± 1); in each of the 4 headers badge right = header right (± 1) and title right = badge left − 10 (± 1); `/a-propos` `Pourquoi ce site` `border-left-width` 3 px computing `accent`, other sides 1 px `line`; `/blog` and `/blog/linux-commandes-essentielles/` first category row top − `Catégories` bottom = 10 (± 1) | no |
| R12 | Keyboard, no-JS, Escape | 1024×768, both skill pages: Tab to the aside's last link → its outline box (rect ± 4 px) lies inside the aside's scrollport; in a `sandbox="allow-same-origin"` iframe (no scripts) on `/`, `/prompts/bootstrap-session-anti-drift/`: no theme toggle, no search button rendered (0×0), 4 lines `défaut : 4 · librairies-prompts-skills · main · français`; with JS: toggle works, the value lines are `display:none`, inputs shown; search dialog: type `devops`, Escape → field empty, dialog open; Escape → dialog closed, focus on the loupe button | no |
| R13 | Side-by-side with the prototype | verifier renders each of the 10 prototype screens (`claude-design` `render_preview`, project `bb013596-0cd6-4e70-afad-e92b42d3f7f6`, prototype's own theme toggle; URL never written down) and the matching route at 1280, light and dark: one row per screen in the evidence, verdict "same blocks, order, columns" or the difference and its decision. **If the MCP cannot render: smoke** — R14 is the proof of structure | no |
| R14 | Structure against the inventory | preview, 1280, both themes, the 10 routes of the structure table (`/`, `/blog/`, `/blog/linux-commandes-essentielles/`, `/projets/`, `/projets/gha-svu/`, `/prompts/`, `/prompts/bootstrap-session-anti-drift/`, `/skills/`, `/skills/anti-drift-planning/`, `/a-propos/`): blocks present in the listed order; measured column widths / ratios / gaps as listed (± 1 px, ratios ± 0.02); one evidence row per screen | no |
| R15 | Full rendered audit | `scripts/audit-rendered.js` (transitions neutralised, `localStorage.theme` + reload) on every smoke route plus `/blog/<each of 5>`, `/prompts/decouper-un-projet-en-plans-anti-drift/`, × 375 / 768 / 1280 × light / dark, and open states: search dialog (`devops` results, `zz` no result, 1 character), each dropdown open (blog sort, techno, outil, tag), each list's empty state, each tab of the 5 multi-tab detail pages, the no-JS iframe of one list, one prompt, one skill page → 0 overflow, 0 contrast failure, 0 off-token colour, 0 V2 jump (with D74 / D88 / D96 narrowings); run count in the evidence | no |
| R16 | 375 everywhere | every one of the 51 built pages in a 375 px iframe (light): `scrollWidth` = `clientWidth` | no |
| R17 | Nothing else moves | after build, every other `scripts/check-*.mjs` prints the same lines as a base build (scratch worktree at `59d66a4`); `dist/**/*.html` identical to base after hash normalisation except `index.html`, `a-propos/`, `blog/` + 5 articles, `skills/` + 2 skills, the 3 prompts, `tags/claude-code/`; `node scripts/check-skill-sources.mjs` → its 2 base lines | no |
| R18 | Tokens, palette, contrast guards | `npx vitest run src/lib/palette.test.ts src/lib/contrast.test.ts src/lib/auditRendered.test.ts` → 0 failed; `git diff 59d66a4 -- src/styles/global.css \| grep -vE '^(\+\+\+\|---) ' \| grep -cE '^[+-]\s*--'` → `0`; `sed -n '/@layer components {/,/^}/p' src/styles/global.css \| grep -cE '^\s+\.[a-z-]+ \{'` → `4` | no |
| R19 | Frozen paths, suite, types | `git diff 59d66a4 --stat -- src/content src/content.config.ts public/admin/config.yml docs/anti-drift .github/workflows package.json package-lock.json` → empty; `npx vitest run` → 0 failed, > 379 tests; `npm run check` → `0 errors`; `grep -c 'export function matchesFilters' src/lib/projectFilters.ts` → `1` | no |

## Shared resources
- `src/styles/global.css` (no-JS rules only, no token), `src/lib/pageLayout.test.ts` (new, T1 then T5), `src/lib/shell.test.ts`.
- `dist/`, port 4321, a base build in a scratch worktree for R9 / R17. No version bump (D68); publication is the run's single escalation after this plan.

## Tasks
### T1 — Home and about gaps
- Files: `src/pages/index.astro`, `src/components/home/SectionPanel.astro`, `src/components/home/LatestPosts.astro`, `src/pages/a-propos.astro`, `src/lib/pageLayout.test.ts` (new, source-reading)
- Covers: R1, R2
- Acceptance: `npx vitest run src/lib/pageLayout.test.ts` → the 4 named tests pass; `npm run build && node scripts/check-home.mjs && node scripts/check-secondary.mjs` → base lines, exit 0
- Depends on: —

### T2 — English descriptions in `lang="en"`
- Files: `src/components/SkillCard.astro`, `src/components/home/SectionEntry.astro`, `src/components/prompt/RelatedSkillsCard.astro`, `src/pages/tags/[tag].astro`, 3 component tests (new, Astro container as `SkillHeader.test.ts`)
- Covers: R3
- Acceptance: the R3 tests pass; `npm run build`, then `grep -rhoE '<(p|span)[^>]*>Superpowers is a complete' dist | grep -c 'lang="en"'` → `5` (base `1`) and the same with `grep -vc` → `0` (base `4`)
- Depends on: —

### T3 — Without JavaScript: toggle hidden, defaults shown
- Files: `src/styles/global.css`, `src/lib/shell.test.ts`, `src/components/prompt/PromptVariables.astro`, `src/components/prompt/PromptVariables.test.ts` (new)
- Covers: R4, R5
- Acceptance: the R4 / R5 tests pass; `npm run build && node scripts/check-prompt.mjs && node scripts/check-shell-blog.mjs` → base lines, exit 0
- Depends on: —

### T4 — Prompt infos tag links; macos-clone whitespace guard
- Files: `src/components/prompt/PromptInfos.astro`, `src/components/prompt/PromptInfos.test.ts` (new), `src/lib/promptContent.test.ts`
- Covers: R6, R7
- Acceptance: the R6 / R7 tests pass (R7 shown red with a scratch double space, then restored); `npm run build && node scripts/check-prompt.mjs && node scripts/check-secondary.mjs` → base lines (report any line change), exit 0
- Depends on: —

### T5 — Rail gap and skill aside scroll padding
- Files: `src/components/blog/BlogRail.astro`, `src/components/blog/BlogRail.test.ts`, `src/pages/skills/[...slug].astro`, `src/lib/pageLayout.test.ts`
- Covers: R8
- Acceptance: the R8 tests pass; `npm run build && node scripts/check-shell-blog.mjs && node scripts/check-article.mjs && node scripts/check-skill.mjs` → base lines, exit 0
- Depends on: T1 (shared test file)

### T6 — Remove the `pill` tab variant and the unused `class` prop
- Files: `src/components/DetailTabs.astro`, `src/components/project/ProjectAside.astro`
- Covers: R9
- Acceptance: the two greps → `0`; `npm run build` then `dist/**/*.html` identical to a scratch build of the parent commit after hash normalisation; `node scripts/check-detail-tabs.mjs` → 7 base rows; `npm run check` → `0 errors`
- Depends on: —

### T7 — Instrument and no-regression pass
- Files: `scripts/check-fidelity.mjs` (new, parser style of `check-home.mjs`)
- Covers: R10, R17, R18, R19 (static); rendered R11–R16 are measured by the verifier
- Acceptance: `npm run build && node scripts/check-fidelity.mjs` → the 7 lines, exit 0, and exit 1 on one scratch defect per line; every other instrument → base lines; the R17 HTML diff limited to the listed files; `npx vitest run` → 0 failed; `npm run check` → `0 errors`
- Depends on: T1, T2, T3, T4, T5, T6

## Out of scope
- Home / about pixel values beyond inventory §10 (panel paddings 22/24, `Plus d'articles →` right-aligned, 64 px top offset, about gaps — the about markup 925–1005 is not cached).
- Changing the search dialog's Escape behaviour (logged); `lang` inside Pagefind result excerpts; any content, schema or token change; TZ pinning (done in plan 17 F2).
- Version bump, tag, merge to `main`, push, deploy — the orchestrator raises the single `publication` escalation after this plan.

## Evidence

### Verification 1 (2026-09-25)
| ID | Verdict | Evidence |
|---|---|---|
| R0 | proven | walk on preview, light then dark: 5 nav links, an entry of each list → detail, home banner → `/transparence-ia/`, blog and prompt tag chips → tag pages, `/tags/` from tag page and 404, unknown URL → 404 page, ⌘K and loupe open search; no 5xx; R1–R19 below (R13 smoke) |
| R1–R8 | proven | named tests pass; 23 targeted mutations each turn their test red |
| R9 | proven | both greps `0`; 51 HTML files identical between T5 and T6 builds |
| R10 | proven | `check-fidelity` 7 lines, exit 0; exit 1 on one injected defect per line (10 cases) |
| R11 | proven | 1280 both themes: home gaps 16/16/16, badges flush right, titles 10 px before; about 3 px accent left border, other sides 1 px `line`; rail label gap 10 on `/blog` and article |
| R12 | proven | 1024×768: last aside link's focus ring inside the scroll area (4.16 / 38.35 px spare); no-JS: toggle and search hidden, 4 `défaut :` lines; with JS lines hidden, inputs shown, toggle works; search Escape clears then closes, focus back on loupe |
| R13 | smoke | design MCP refused (`needs_design_scopes`) |
| R14 | proven | 10 screens at 1280 both themes: blocks, order and column widths match the inventory (home 1.35 split, blog rail 250, article 250 / 698 / 230, projects hero 1.1, project 874 / 280, prompts / skills 3 cols, prompt window + 340, skill 818 / 340 sticky, about); differences all covered by D42, D92, D111, D117 |
| R15 | proven | `audit-rendered.js` 309 runs (23 routes × 3 widths × 2 themes + 171 open states: search, dropdowns, empty states, every tab, no-JS): 0 overflow / contrast / off-token / V2; negative control caught |
| R16 | proven | 51 pages at 375: `scrollWidth = clientWidth` |
| R17 | proven | 11 other instruments byte-identical to base; HTML diff limited to the 15 listed pages, each change intended |
| R18 | proven | guard tests 26 passed; token grep `0`; component classes `4` |
| R19 | proven | frozen diff empty; 399 tests; 0 errors; `matchesFilters` 1 |

Not taken (outside this plan, logged for the report): Pagefind returns weak matches for nonsense Latin queries; blog and skills empty states unreachable with today's content; header nav links without trailing slash (served 200).
