# Plan 13 — article

Brief: `docs/auto/brief.md` · Branch: `auto/plan-13-article` · Base: `757cf049d58debc946ab3b5d99ad08bb89defed5`

## Goal
From `/blog`, the user opens any published post and sees the prototype's article (inventory §2): breadcrumb, 40 px title, meta row (category · date · read time · AI marker) above one surface card in three columns — left rail (Catégories, Tags, 3 related posts of the same category, `Plus d'articles →`), centre (lead, cover, prose, code blocks with Copier, AI-marker card linking to `/transparence-ia/`, previous / next tiles), right rail (Sommaire from the post's headings, Projets liés from `relatedProjects`); every link resolves

## Reachability
From `http://localhost:4321/`: header nav `Blog` › `/blog/` › a row title › `/blog/<id>/` (also: the home's featured and latest posts, search results, `/tags/<slug>/`). The path exists; this plan changes what `src/pages/blog/[...slug].astro` renders. New path: an article's category row › `/blog/?categorie=<value>`, which `/blog` opens filtered (T1).

### Built facts (measured at base, `npm run build`)
Canonical order (`getPublishedPosts()`, pubDate desc; `docker-…` and `k9s-…` share a timestamp and keep collection order): `comment-jutilise-github-actions-au-quotidien` (DevOps, 28 octobre 2025, 2 min, none, relatedProjects `gha-svu`, no tags, 1 h2, 0 `<pre>`), `linux-commandes-essentielles` (DevOps, 26 octobre 2025, 14 min, full, 12 h2 + 38 h3, 42 `<pre>`), `meilleurs-vpn-2025` (Outils, 26 octobre 2025, 14 min, full, 9 + 19, 1), `docker-kubernetes-devops` (Outils, 20 octobre 2025, 18 min, full, 16 + 35, 32), `k9s-kubernetes-terminal-ui` (Outils, 20 octobre 2025, 7 min, partial, 12 + 27, 29). All have a cover. Pagefind indexes each article's whole `<article>` today, `AiBanner` text included. Base instrument outputs are plan 12's Verification 2 lines; `check-secondary` → `tags: 30 slugs · 108 chips on 38 pages · 5/5 tones`; `check-finition` → `v2: 0 card-level on bg · 0 rail off card level · 1 rail column · 10 derived thumbnails`.

### Design rules (prototype 230–342; authoring choices listed as decision candidates)
- **Page**: `<main>` › `<article data-pagefind-body>` holding the header and the card. Header (`pt-14`, gap 14): breadcrumb mono 13 — `~/ blog` link `/blog/` `accent` (hover underline) + ` / article` `muted`, `data-pagefind-ignore`; h1 40 px / 1.12 / 700 / −.03em `ink`, `max-w-[860px]`, `text-pretty` (32 px below 640); meta row mono 12 `muted`, gap 10: category `.pill` (padding 4/10), `<time>` fr-FR long date ` · N min` (`estimateReadingMinutes`), AI marker `emoji label` in its tone's ink (`text-tag<Tone>Ink`, `data-ai-marker`). Card 26 px below.
- **Card**: one `.card overflow-hidden`; from 1024 px grid `250px | minmax(0,1fr) | 230px`. **DOM order centre → right rail → left rail**, placed by grid columns from 1024 px; below 1024 the three stack in DOM order (article first, then Sommaire / Projets liés, then Catégories / Tags / Articles liés), each rail full width with `border-top: 1px line2`. A right rail with neither Sommaire nor Projets liés is omitted and the grid becomes `250px | 1fr`.
- **Left rail** `<aside data-rail data-pagefind-ignore>` = `BlogRail` in a link variant (bg `rail`, `border-right: 1px line2` from 1024, padding 22/16, gap 22): Catégories rows are `<a>` — `Tout` → `/blog/`, others → `/blog/?categorie=<encodeURIComponent(value)>` — same box as `/blog` rows (padding 8/10, radius 10, 14 px, count mono 11), `muted`, hover `chip`/`ink`, no active state, visible without JS; Tags = the `/blog` cloud unchanged (`shape="tag"`, counts, `/tags/<slug>/`); then `<hr>` (margin 2/8, `line`); **Articles liés**: label mono 10 uppercase .12em `muted` + 22×22 radius-7 `badgeBg`/`badgeInk` file icon at the right; up to 3 cards (gap 8) = `<a href="/blog/<id>/">` `.card-inner` radius 12, padding 12: category mono 10 `accent`, title 13 / 500 / 1.35 `ink`, `date · N min` mono 10 `muted` (D71); block omitted when empty; then `Plus d'articles →` 13 / 600 `accent` → `/blog/`.
- **Centre** (padding 34/40/44; 28/20/32 below 640): lead = `description` 17 / 1.6 `muted`; cover 24 px below, height 210, radius 16, `object-cover`, bg `chip`, `loading="eager"`; `.prose` (site-wide, shared): h2 23 px / 700 `ink`, margin 32/0/12; h3 unchanged; p 16 / 1.75 `body`, margin 0/0/14; lists line-height 1.85; `pre` radius 12, padding 16, 1 px `line`, bg `code`, mono 13 / 1.7; `.copy-btn` (site-wide) top 9 / right 9, padding 4/9, radius 7, bg `chip`, no border, mono 10 `muted`, hover `ink`. **AI card** 34 px below the prose (`data-pagefind-ignore`, omitted without `aiUsage`): `.card-inner` radius 16, padding 16/17, gap 14, hover `translateY(-3px)` (tile `scale(1.06)`, shadow stays `var(--shadow)`); 40×40 radius-13 tile with the level's emoji in `TONE_CLASSES` carrying `data-ai-usage` + `data-tone`; label 15.5 / 600 `ink` and description 13.5 / 1.5 `muted` from `AI_USAGE_META`; link `ma règle sur l'IA →` mono 11 `muted` (hover `ink`) → `/transparence-ia/`. `AiBanner` leaves the article (kept for `/transparence-ia`). **Prev/next** `<nav aria-label="Articles précédent et suivant" data-pagefind-ignore>` 24 px below, `padding-top: 22px`, `border-top: 1px line2`, grid 2 × 1fr gap 12 (one column below 640): `← précédent` = the next-older post (left), `suivant →` = the next-newer (right, text-right); each a `.card-inner` `<a>` padding 16/18, label mono 10 `muted`, title 14 / 500 `ink`. **No wrap**: the oldest post has no précédent tile, the newest no suivant tile; the empty cell stays empty.
- **Right rail** `<aside data-rail data-pagefind-ignore>` (bg `rail`, `border-left: 1px line2` from 1024, padding 22/16): **Sommaire** = `TableOfContents.astro` restyled — `<nav aria-label="Sommaire de l'article">`, label mono 10 uppercase `muted`, h2/h3 links 12 / 1.4 `muted` (hover `ink`), gap 9, h3 indented 14 px, `href="#<slug>"`; omitted without headings. **Projets liés** (22 px below, `padding-top: 16px`, `border-top: 1px line2`; omitted without `relatedProjects`): label + folder badge as Articles liés; one `.card-inner` radius 12 `<a href="/projets/<id>/">` per project (`sortProjects` order): 6 px `accent` dot, title 13 / 600 `ink`, status mono 10 `accent`, description 12 / 1.45 `muted`.
- **Tokens** (`@theme`, radius only): `--radius-small: 7px`, `--radius-nested: 12px`, `--radius-tile: 13px`, `--radius-hero: 16px` (D67 allows the prototype's radii; 13 is the AI tile's own value).
- **Deep link**: `/blog` reads `?categorie=` once at load; a value matching a rail row pre-selects it (meta rewritten accordingly); anything else is ignored and the page behaves as at base.

Expected output of `node scripts/check-article.mjs` after `npm run build`:
```
articles: 5/5 · ~/ blog / article · h1 · meta · 1 .card · rails left+right
rail: Tout 5 → /blog/ · DevOps 2 → /blog/?categorie=DevOps · Outils 3 → /blog/?categorie=Outils · 20 tags · Plus d'articles → /blog/
comment-jutilise-github-actions-au-quotidien: DevOps · 28 octobre 2025 · 2 min · ✍️ 100% humain | related linux-commandes-essentielles | ← linux-commandes-essentielles | → — | toc 1 | projects gha-svu | code 0 | ai none
linux-commandes-essentielles: DevOps · 26 octobre 2025 · 14 min · 🤖 IA relue | related comment-jutilise-github-actions-au-quotidien | ← meilleurs-vpn-2025 | → comment-jutilise-github-actions-au-quotidien | toc 50 | projects — | code 42 | ai full
meilleurs-vpn-2025: Outils · 26 octobre 2025 · 14 min · 🤖 IA relue | related docker-kubernetes-devops, k9s-kubernetes-terminal-ui | ← docker-kubernetes-devops | → linux-commandes-essentielles | toc 28 | projects — | code 1 | ai full
docker-kubernetes-devops: Outils · 20 octobre 2025 · 18 min · 🤖 IA relue | related meilleurs-vpn-2025, k9s-kubernetes-terminal-ui | ← k9s-kubernetes-terminal-ui | → meilleurs-vpn-2025 | toc 51 | projects — | code 32 | ai full
k9s-kubernetes-terminal-ui: Outils · 20 octobre 2025 · 7 min · 🤝 co-créé avec IA | related meilleurs-vpn-2025, docker-kubernetes-devops | ← — | → docker-kubernetes-devops | toc 39 | projects — | code 29 | ai partial
links: every internal href resolves in dist/ · every #anchor exists
search: 5 fragments · title and prose indexed · rails, AI card, prev/next not indexed
```
Exit 1 if an article lacks one of these, if a rail lacks `data-rail` or `data-pagefind-ignore`, if a TOC link targets a missing id, if an internal `href` (with its query stripped) does not resolve in `dist/`, or if a Pagefind fragment (`dist/pagefind/fragment/*.pf_fragment`, gunzip, JSON after `pagefind_dcd`) of an article lacks its title or first prose sentence, or contains `Articles liés`, `Plus d'articles`, `Sommaire`, `Projets liés`, `ma règle sur l'IA`, `← précédent` or `suivant →`.

## Criteria
| ID | Criterion | Measure | Guarantee |
|---|---|---|---|
| R0 | From `/blog`, the user opens any published post and sees the prototype's article (inventory §2): breadcrumb, 40 px title, meta row (category · date · read time · AI marker) above one surface card in three columns — left rail (Catégories, Tags, 3 related posts of the same category, `Plus d'articles →`), centre (lead, cover, prose, code blocks with Copier, AI-marker card linking to `/transparence-ia/`, previous / next tiles), right rail (Sommaire from the post's headings, Projets liés from `relatedProjects`); every link resolves | reachability walkthrough on `npm run build && npx astro preview`, light then dark (`localStorage.theme` + reload): `/` › Blog › each of the 5 rows › every block above present › click one link of each kind (breadcrumb, category row, tag chip, related card, `Plus d'articles →`, AI link, prev, next, TOC entry, project card) → a 200 page that is not `/404` (TOC: the heading scrolls into view); R1–R20 hold | no |
| R1 | Related posts | `npx vitest run src/lib/article.test.ts` → "lists up to 3 published posts of the same category, newest first, never the post itself" and "returns no related post when the category has no other published post" pass | yes |
| R2 | Previous / next without wrap | `npx vitest run src/lib/article.test.ts` → "returns the next-older post as previous and the next-newer as next" and "does not wrap at the newest and the oldest post" pass | yes |
| R3 | Sommaire entries | `npx vitest run src/lib/article.test.ts` → "keeps h2 and h3 headings in document order and marks h3 as indented" passes | yes |
| R4 | Category deep link | `npx vitest run src/lib/listPattern.test.ts` → "pre-selects a known category from ?categorie= and ignores an unknown or empty one" passes; `git diff 757cf04 -- src/lib/listPattern.test.ts \| grep -c '^-[^-]'` → `0` | yes |
| R5 | Built articles | `npm run build && node scripts/check-article.mjs` → the 9 lines above, exit 0; exit 1 on each defect class listed under the block | no |
| R6 | Deep link lands filtered | preview, both themes: on `/blog/linux-commandes-essentielles/` click `DevOps 2` → URL `/blog/?categorie=DevOps`, 2 visible rows, `[data-list-meta]` reads `2 articles · catégorie : DevOps`, `DevOps` has `aria-pressed="true"`; `/blog/?categorie=Inconnu` → 5 rows, `5 articles · catégorie : Tout` | no |
| R7 | Header and card geometry | preview, 1280, both themes, 5 articles: breadcrumb mono 13, `~/ blog` `accent`, `/ article` `muted`; breadcrumb top − header bottom = 56, h1 top − breadcrumb bottom = 14 (± 2); h1 40 px / 700 / line-height 44.8 px, width ≤ 860; meta row mono 12, pill bg `accentSoft` colour `accent`; card top − meta bottom = 26 ± 2, radius 20, bg `surface`; columns left 250, right 230, centre = card width − 482 (± 1); rails bg `rail`, padding 22/16, borders 1 px `line2` | no |
| R8 | Centre | preview, 1280, both themes: lead 17 px `muted`; cover height 210, radius 16, top − lead bottom = 24 ± 1; prose h2 23 px / 700, p 16 px / line-height 28 px `body`; `pre` radius 12, padding 16, 13 px JetBrains Mono, bg `code`; on `/blog/linux-commandes-essentielles/` each `pre` has one `Copier` chip (radius 7, bg `chip`, 10 px `muted`, top/right 9 ± 1); clicking one shows `Copié !` and puts exactly that block's code on the clipboard | no |
| R9 | AI card and prev/next | preview, 1280, both themes: AI card radius 16, bg `card`, top − last prose block bottom = 34 ± 2; tile 40×40 radius 13 in the post's tone; label 15.5 px / 600, text 13.5 px `muted` = `AI_USAGE_META` description; `ma règle sur l'IA →` → `/transparence-ia/`; hover moves the card up 3 px; prev/next tiles radius 14, labels mono 10, titles 14 px / 500; on `k9s-…` only a `suivant →` tile (right column), on `comment-…` only `← précédent` (left column) | no |
| R10 | Rails | preview, 1280, both themes: left rail rows padding 8/10, radius 10, 14 px `muted`, counts mono 11; 20 tag chips radius 8 mono 10 in `tagTone`; `<hr>` then `Articles liés` with a 22×22 radius-7 badge; related cards radius 12, padding 12, category mono 10 `accent`, title 13 px / 500, date line mono 10 `muted`; `Plus d'articles →` 13 px / 600 `accent`. Right rail: `Sommaire` entries 12 px `muted`, row gap 9, h3 left edge = h2 left edge + 14 (± 1); on `comment-…` `Projets liés` card with 6 px `accent` dot, title 13 px / 600, `actif` mono 10 `accent`, description 12 px `muted`; other articles show no `Projets liés` | no |
| R11 | Stacking below 1024 | preview, both themes, 375 and 768: one column, blocks top to bottom = centre, right rail (Sommaire first), left rail (Catégories first); each rail as wide as the card (± 1); 0 horizontal overflow (`scrollWidth` = `clientWidth`); at 375 h1 32 px and prev/next one column; at 1024 three columns side by side | no |
| R12 | Without JavaScript | each article loaded in a `sandbox` iframe without scripts: header, prose, rails and every link present and working; no `Copier` chip; no control of this plan visible and inert | no |
| R13 | Search indexes the article, not the rails | `node scripts/check-article.mjs` → `search:` line as above; preview: the search dialog, query `ma règle sur l'IA` → no `/blog/<slug>/` result (prompts and skills may match scattered words); query `journalctl` → `Commandes Linux : du basique au one-liner surpuissant` among the results | no |
| R14 | Fidelity with the prototype | verifier renders the prototype (`claude-design` `render_preview`, project `bb013596-0cd6-4e70-afad-e92b42d3f7f6`, file `bencat_ Prototype cliquable.dc.html`, article screen; the URL is never written down) and `/blog/linux-commandes-essentielles/` at 1280, light and dark: a side-by-side table lists the same blocks in the same order and the same three columns; differences allowed only where the Design rules say so (emoji AI markers, `muted` for `dim`, tag counts, real prose). **If the MCP is unavailable: smoke**, with the replay step written in the evidence | no |
| R15 | Audit on every article | `scripts/audit-rendered.js` on the preview, the 5 articles, light and dark, at 375, 768 and 1280: 0 overflow, 0 contrast failure, 0 off-token colour, 0 V2 jump | no |
| R16 | Radii and mono (V6 amended, V5) | preview, both themes, the 5 articles: every non-zero computed `border-radius` ∈ {7, 8, 9, 10, 12, 13, 14, 16, 20, 999} px; breadcrumb, meta row, counts, rail labels, dates, statuses, `Copier`, prev/next labels, `ma règle sur l'IA →` and code compute `"JetBrains Mono`; h1, lead, prose, titles, descriptions compute `"Nebula Sans"` | no |
| R17 | `/blog` and the list engine unchanged | after build `node scripts/check-shell-blog.mjs` → its 11 base lines, exit 0; preview `/blog/` without query → plan 12's R13 walkthrough holds | no |
| R18 | Earlier instruments | after build: `check-home.mjs` → its 7 base lines; `check-secondary.mjs` → its 12 base lines except `tags: 30 slugs · 208 chips on 43 pages · 5/5 tones`; `check-finition.mjs` → its 7 base lines except `v2: 0 card-level on bg · 0 rail off card level · 11 rail column · 10 derived thumbnails`; `check-detail-tabs.mjs` → 7 rows; all exit 0; pattern-class count (`sed -n '/@layer components {/,/^}/p' src/styles/global.css \| grep -cE '^\s+\.[a-z-]+ \{'`) → `4`; `git diff 757cf04 -- src/styles/global.css \| grep -cE '^[-+]\s*--color-'` → `0` | no |
| R19 | `AiBanner` still serves `/transparence-ia` only | `grep -rl 'AiBanner' src/pages` → `src/pages/transparence-ia.astro`; `check-secondary.mjs` → `ai-banner: none green \| partial amber \| full blue` | no |
| R20 | Frozen paths, suite, types | `git diff 757cf04 --stat -- src/content src/content.config.ts public/admin/config.yml docs/anti-drift .github/workflows package.json package-lock.json` → empty; `npx vitest run` → 0 failed, > 268 tests; `npm run check` → `0 errors`; `grep -c 'export function matchesFilters' src/lib/projectFilters.ts` → `1` | no |

## Shared resources
- `src/styles/global.css` — 4 radius tokens; `.prose` h2/p/lists/`pre` and `.copy-btn` change on every page using them (project, prompt, skill details too); no `--color-` line, no fifth pattern class (R18).
- `src/components/blog/BlogRail.astro` — also `/blog`: the filter variant must render as at base (R17).
- `src/lib/listPattern.ts`, `src/scripts/list-pattern.ts` — drive the 4 lists; additions only.
- `src/components/TableOfContents.astro`, `src/components/Icon.astro` (`file-text`, `folder`).
- `scripts/check-*.mjs` — amended in T5 only. `dist/`, port 4321. No version bump (D68).

## Tasks
### T1 — Article data and the category deep link
- Files: `src/lib/article.ts` + `article.test.ts` (new, no Astro import: related posts, neighbours, TOC entries, category href), `src/lib/listPattern.ts` + `listPattern.test.ts` (additions only), `src/scripts/list-pattern.ts`
- Covers: R1, R2, R3, R4
- Acceptance: `npx vitest run src/lib/article.test.ts src/lib/listPattern.test.ts` → the 6 named tests pass, 0 failed; the R4 `git diff` count → `0`; `npm run check` → `0 errors`
- Depends on: —

### T2 — Radius tokens, prose and Copier chip
- Files: `src/styles/global.css`
- Covers: R8 (styles), R18 (token rules)
- Acceptance: `npm run build` → exit 0; `grep -cE -- '--radius-(small|nested|tile|hero):' src/styles/global.css` → `4`; the two R18 `global.css` commands → `4` and `0`
- Depends on: —

### T3 — Link variant of the blog rail
- Files: `src/components/blog/BlogRail.astro` (prop for links + default slot after Tags), `src/lib/blogList.ts` (reuse; no behaviour change)
- Covers: R10 (left rail), R17
- Acceptance: `npm run build && node scripts/check-shell-blog.mjs` → its 11 base lines, exit 0; `npx vitest run src/lib/blogList.test.ts` → 0 failed
- Depends on: T1 (category href)

### T4 — The article page
- Files: `src/pages/blog/[...slug].astro`, `src/components/blog/ArticleHeader.astro`, `src/components/blog/RelatedPosts.astro`, `src/components/blog/AiMarkerCard.astro`, `src/components/blog/PrevNext.astro`, `src/components/blog/ArticleAside.astro` (new), `src/components/TableOfContents.astro`, `src/components/Icon.astro`, `scripts/check-article.mjs` (new, dependency-free like `check-shell-blog.mjs`)
- Covers: R5, R13 (built), R19
- Acceptance: `npm run build && node scripts/check-article.mjs` → the 9 expected lines, exit 0; `grep -rl AiBanner src/pages` → `src/pages/transparence-ia.astro`; `npx vitest run` → 0 failed; `npm run check` → `0 errors`
- Depends on: T1, T2, T3

### T5 — Earlier instruments follow the article
- Files: `scripts/check-secondary.mjs`, `scripts/check-finition.mjs` (expected lines and comments only, if they hard-code counts), `scripts/audit-rendered.js` only if an article element trips a rule the Design rules allow
- Covers: R18
- Acceptance: after `npm run build`, the four scripts of R18 → the stated lines, exit 0; `node scripts/check-shell-blog.mjs` and `node scripts/check-article.mjs` → exit 0; `npx vitest run` → 0 failed
- Depends on: T4

### F1 — Audit exemption only for a card painted on a rail colour
- Files: `scripts/audit-rendered.js`, `src/lib/auditRendered.test.ts`, `src/styles/global.css` (stray double blank line after `.prose :where(p)`)
- Covers: R15 (instrument), verification 1 finding 1
- Acceptance: the V2 "card on bg" exemption applies only when the card's nearest painted ancestor **paints the `rail` colour** and is (or sits inside) a non-thumbnail `[data-rail]`; a unit test proves a card whose painted parent paints `bg` inside a `[data-rail]` is still flagged; `npx vitest run` 0 failed; the six check scripts exit 0 with their current lines
- Depends on: —

### F2 — Rail labels and tag cloud inset like the prototype
- Files: `src/components/blog/BlogRail.astro` (and its test)
- Covers: R10, plan 12 R12 (fidelity), verification 1 finding 2
- Acceptance: in the rail (both variants), the `Catégories` and `Tags` labels get the prototype's `padding:0 8px` (x = 24 inside the rail at 1280) and the tag cloud `padding:0 6px` (chips from x = 22); category rows unchanged (8/10 padding, x = 16 box); `check-shell-blog.mjs` and `check-article.mjs` exit 0 with their lines
- Depends on: —

## Out of scope
- Sticky rails, reading progress, share or comment blocks; updating the URL when a `/blog` rail row is clicked; a tag filter on `/blog`.
- The inner layouts of the project, prompt and skill pages (plans 15–17) beyond the shared `.prose` / `.copy-btn` values; home and about gaps (18).
- Any change to posts (`src/content/blog/**` frozen), schema, CMS, token colours; version bump, tag, merge, push, deploy.

## Evidence

### Verification 1 (2026-09-24)
| ID | Verdict | Evidence |
|---|---|---|
| R0 | failed | full walk both themes on the 5 posts (breadcrumb, category row, tag chip, related card, `Plus d'articles →`, AI link, prev, next, project card) → all 200, no 404; fails only through R13's literal measure |
| R1 | proven | named tests pass; red without self-exclusion, draft filter or category filter |
| R2 | proven | named tests pass; red on swap and on wrap-around |
| R3 | proven | red on `indented: false` and on h4 kept |
| R4 | proven | named test passes, 0 deleted lines; red on accept-any and ignore-query |
| R5 | proven | 9 lines exact, exit 0; exit 1 on 8 injected defects |
| R6 | proven | real click `DevOps 2` → `/blog/?categorie=DevOps`, 2 rows, meta, `aria-pressed`; unknown / empty / wrong-case ignored |
| R7 | proven | 1280 both themes: breadcrumb, h1 40/700, meta, gaps 56/14/26, grid 250 / 698 / 230 in 1180, rails `rail` + `line2` |
| R8 | proven | lead 17 `muted`, cover 210 r16 eager, prose values, 42 `pre` / 42 Copier chips, `Copié !` + exact block text |
| R9 | proven | AI card r16, 34 px below prose, tile 40 r13 toned, text = `AI_USAGE_META`, link `/transparence-ia/`, hover lift; prev/next placement without wrap |
| R10 | proven | rail rows, 20 toned chips, `<hr>`, badge, related cards, `Plus d'articles →`, TOC indent 14, Projets liés on `comment-…` |
| R11 | proven | 375/768: centre → right rail → left rail, 0 overflow, h1 32; 1024: three columns |
| R12 | proven | no-JS iframe: all content and links visible, 0 Copier chips, navigation works |
| R13 | failed → measure corrected | `search:` line ok, fragments free of rail strings, `journalctl` finds the post; `ma règle sur l'IA` → 3 results (2 prompts, 1 skill, scattered words), **no `/blog/` result** — the "0 results" measure was wrong for this site; text corrected to "no `/blog/<slug>/` result" (D90) |
| R14 | smoke | design MCP refused; static comparison with prototype lines 231–343: same blocks, order, columns, px values; differences all under the design rules |
| R15 | proven | `audit-rendered.js` 30 runs: 0 overflow / contrast / off-token / V2 |
| R16 | proven | radii {7, 8, 9, 10, 12, 13, 14, 16, 20, 999}; mono / Nebula split as specified |
| R17 | proven | `check-shell-blog` identical to base; `/blog` HTML identical after hash normalisation; plan 12 walk holds |
| R18 | proven | earlier scripts identical except stated lines; pattern classes 4; `--color-` diff 0 |
| R19 | proven | `AiBanner` only in `transparence-ia.astro`; `ai-banner` line ok |
| R20 | proven | frozen diff empty; 282 tests; 0 errors; `matchesFilters` 1 |

Findings → F1 (audit exemption too wide; stray blank line), F2 (rail label / cloud inset 16 vs prototype 24 / 22). Not taken: dev-log errors during file-watch reloads (no 5xx, not recurring); Copier focus keeps the global outline.
