# Plan 12 — coque-et-blog

Brief: `docs/auto/brief.md` · Branch: `auto/plan-12-coque-et-blog` · Base: `7160035b0e31c61822d15af542c2c2311085cf82`

## Goal
On every route, in both themes, the user sees the prototype's shell (inventory §0): content capped at 1180 px; a header of three separate pills — logo pill with the 28×28 accent tile, nav pill Blog · Projets · Skills · Prompts · À propos whose active item is accent on `accentSoft`, actions pill with three 34 px round buttons on `chip` — with no bottom border; a footer on every page. On `/blog` the user sees the prototype's blog list (inventory §1): one surface card with a left rail (Catégories with counts, clickable, filtering the list; Tags cloud in the 5 tones with counts) and a main column of compact rows (76×64 thumbnail, category pill · date · read time · AI marker, title, description) under a toolbar `N articles · catégorie : X` + a sort dropdown (plus récents / plus anciens / lecture la plus courte / lecture la plus longue — a custom popover with ✓, closing on Escape and outside click); no featured entry

## Reachability
From `http://localhost:4321/` the shell is on the page (`BaseLayout.astro` renders header, content and footer on each of the 51 site pages; `/admin/` is Sveltia's, not ours). From any page: header nav pill › `Blog` › `/blog/`; there, rail row › filter; toolbar trigger › sort popover; tag chip › `/tags/<slug>/` › `tous les tags` › `/tags/`. Every path exists; this plan changes what they render.

### Built facts (measured at base, `npm run build`)
Published posts, canonical order (`getPublishedPosts()`): `comment-jutilise-github-actions-au-quotidien` (DevOps), `linux-commandes-essentielles` (DevOps), `meilleurs-vpn-2025` (Outils), `docker-kubernetes-devops` (Outils), `k9s-kubernetes-terminal-ui` (Outils); all have a `cover` and an `aiUsage`; none sets `featured`. Their tags give 20 slugs: `devops` 3, `kubernetes` 2, `terminal` 2, 17 others 1. Base outputs: `check-finition.mjs` → `lists: 4 × 1 .card · 16 .card-inner entries` (6 of them on `/blog`), `v2: 0 … · 0 … · 10 derived thumbnails`; `check-secondary.mjs` → `tags: 30 slugs · 88 chips on 37 pages · 5/5 tones`; `npx vitest run` → 222 passed.

### Design rules (authoring choices, see decision candidates)
- **Shell**: `@theme` gains `--container-shell: 1180px` (utility `max-w-shell`) and `--radius-tag: 8px`. Three boxes carry `data-shell` and `mx-auto max-w-shell`: the header row (`header`), one wrapper around `<slot/>` in `BaseLayout` (`main`), the `<footer>` (`footer`). Horizontal padding 24 px from 640 px, 16 px below. Pages drop their own `mx-auto max-w-5xl px-*`; the 4 detail pages keep `mx-auto max-w-3xl` and drop `px-4` (plans 13, 15–17 rebuild them).
- **Header** (prototype 29–55): `padding-top: 20px`, no border, `justify-between flex-wrap`. Logo pill (`nav` bg, 1 px `line`, radius 999, padding 8 18 8 12): 28×28 radius-9 `accentSoft` tile with three `accent` bars (width 100/60/82 %, opacity 1/.7/.45), `bencat` mono 15 `ink` + `_` `accent`. Nav pill (padding 6, gap 4, `nav`, `line`): items padding 8 14, radius 999, 14 px, 15 px icon; active (`aria-current="page"`, same route-family rule as today) = `accent` on `accentSoft`, 600; inactive `muted`, transparent. Actions pill (padding 6, gap 6): search, GitHub, theme — each 34×34, radius 999, `chip`, `muted`; theme glyph sun in light / moon in dark (swapped by CSS on `data-theme`, no JS); the `⌘K` kbd is removed (the shortcut stays). Below 640 px the nav pill takes its own full-width row.
- **Footer** (1007–1011): `margin-top: 60px`, padding 24, `border-top: 1px line2`, space-between, mono 11 `muted`. Left `bencat_ — site perso de Benoît Catillon` (the home's meta description); right `Astro · GitHub Pages · Sveltia CMS`. Plain text. Never the demo copy `prototype cliquable`.
- **`/blog`** (163–227): `ListHeader.astro` (breadcrumb mono 13 `accent` `~/ blog`, h1 `Blog` 44 px / 700 / −.03em; 56 px above, 14 px gap, 26 px to the card). One `.card` (`overflow:hidden`, grid `250px | 1fr` from 768 px, rail stacked above below). Rail `[data-rail]` (`rail` bg, `border-right: 1px line2`, padding 22 16, gap 22): `Catégories` (label mono 10 uppercase .12em `muted`; rows `Tout 5`, `DevOps 2`, `Outils 3` — `<button aria-pressed>` padding 8 10, radius 10, 14 px sans, count mono 11 right, active `accent` on `accentSoft`, accessible name `<label> <count>`), then `Tags` (wrapping `TagChip`s, shape `tag`: radius 8, padding 4 9, mono 10, tone `tagTone`, text `<tag> <count>` counted over published posts, `href="/tags/<slug>/"`). Main (padding 24 28 30): toolbar (`border-bottom: 1px line2`) = meta `[data-list-meta]` mono 12 `muted` (`5 articles · catégorie : Tout` at rest) + sort dropdown right. Rows `ArticleRow.astro` (grid `76px | 1fr`, gap 16, padding 20 0, `border-bottom: 1px line2`, no background): thumbnail 76×64 radius 10 (cover, else derived `rail` + hatch carrying `data-rail`); meta mono 11 = category `.pill` · `date · N min` (fr-FR long date) · `emoji label` from `AI_USAGE_META` (`data-ai-marker`, nowrap); title 19 / 600 linking `/blog/<id>/`; description 14 `muted`. No featured block, no tag filter, no `tous les tags →`, no card-chip filter (`blog-filters.ts` deleted). The first row's image is `loading="eager"`.
- **Dropdown** (reusable, `Dropdown.astro` + `src/scripts/dropdown.ts` + pure `src/lib/dropdown.ts`): props `label`, `options {value, label, count?}[]`, `selected`, `minWidth` (216 default, 236 for sort), extra attributes. Root `[data-dropdown]` rendered `hidden`, revealed by the script (no dead control without JS). Trigger `<button aria-haspopup="listbox" aria-expanded>`: transparent, mono 11 `muted`, icon + `label :` + value `ink`/500 + caret. Popover `role="listbox"`, `top: calc(100% + 10px)`, right-aligned, max-height 300 scroll, padding 6, radius 14, `surface`, `line` border, `var(--shadow)` (never the `.shadow` utility). Options `role="option"` padding 9 11, radius 10; selected = `✓` + `accent` + `bg-accent/8` + 600, `aria-selected="true"`; optional count right, mono 10 `muted`. Keys: Enter / Space / ArrowDown / ArrowUp open with focus on the selected option; arrows move, Home / End jump; Enter / Space select, close, refocus the trigger; Escape closes and refocuses; Tab and any outside click close. The root keeps `data-value` and fires a bubbling `dropdown-change` event (`detail.value`); `setDropdownValue(root, value)` is exported for resets.
- **Engine** (`listPattern.ts`, `list-pattern.ts`, adapted not rewritten): several `[data-list-filters]` groups (rail + toolbar), each `hidden` server-side and revealed; sort read from `[data-sort]`, a `<select>` or a dropdown; no `[data-list-featured]` on the page → no featured entry and every entry in the list; a facet declaring an at-rest label (`data-facet-all-label="Tout"`) is always written `label : value` in the meta (`catégorie : Tout`), other facets keep today's `label value`. The server meta text equals the script's first computed text (no rewrite at load, D57). `/projets`, `/prompts`, `/skills` behave as at base.
- **V2 and the prototype's rail** (D67): an element carrying `data-rail` may paint `rail` on `surface`; every other V2 rule holds, in `check-finition.mjs` and `audit-rendered.js`.
- **AA over the prototype**: where the prototype draws `dim` (footer, rail labels and counts, dropdown counts) the site uses `muted` — `dim` measures 4.19:1 on `bg` and 3.93:1 on `rail` in light.

Expected output of `node scripts/check-shell-blog.mjs` after `npm run build`:
```
shell: 51/51 pages · header, main, footer on max-w-shell
nav: Blog Projets Skills Prompts À propos
active: 51/51 pages
actions: 3 round buttons on chip · no kbd
footer: bencat_ — site perso de Benoît Catillon | Astro · GitHub Pages · Sveltia CMS
blog header: ~/ blog · Blog
blog rail: Tout 5 · DevOps 2 · Outils 3
blog tags: 20 chips · devops 3 · kubernetes 2 · terminal 2 · 17 × 1 · all → /tags/<slug>/
blog rows: comment-jutilise-github-actions-au-quotidien | linux-commandes-essentielles | meilleurs-vpn-2025 | docker-kubernetes-devops | k9s-kubernetes-terminal-ui
blog meta: 5 articles · catégorie : Tout
blog sort: plus récents ✓ | plus anciens | lecture la plus courte | lecture la plus longue
```

## Criteria
| ID | Criterion | Measure | Guarantee |
|---|---|---|---|
| R0 | On every route, in both themes, the user sees the prototype's shell (inventory §0): content capped at 1180 px; a header of three separate pills — logo pill with the 28×28 accent tile, nav pill Blog · Projets · Skills · Prompts · À propos whose active item is accent on `accentSoft`, actions pill with three 34 px round buttons on `chip` — with no bottom border; a footer on every page. On `/blog` the user sees the prototype's blog list (inventory §1): one surface card with a left rail (Catégories with counts, clickable, filtering the list; Tags cloud in the 5 tones with counts) and a main column of compact rows (76×64 thumbnail, category pill · date · read time · AI marker, title, description) under a toolbar `N articles · catégorie : X` + a sort dropdown (plus récents / plus anciens / lecture la plus courte / lecture la plus longue — a custom popover with ✓, closing on Escape and outside click); no featured entry | reachability walkthrough on `npm run build && npx astro preview`, light then dark (`localStorage.theme` + reload): every smoke route shows header and footer; from `/` click `Blog`, filter by a rail row, sort through the popover, open a row, open a tag chip → each lands on a 200 page that is not `/404`; R5–R17 hold | no |
| R1 | Shell capped at 1180 px in source | `npx vitest run src/lib/shell.test.ts` → "caps the header, the page content and the footer at the 1180 px shell" passes (`--container-shell: 1180px` in `global.css`; `max-w-shell` + `data-shell` in `Header.astro`, `BaseLayout.astro`, `Footer.astro`; no `max-w-5xl` under `src/pages`, `src/components`, `src/layouts`) | yes |
| R2 | Built shell on every page | `npm run build && node scripts/check-shell-blog.mjs` → its first 5 lines as above; exit 1 if a non-`/admin/` page of `dist/` lacks exactly one `data-shell` of each kind with `max-w-shell`, has a `<header>` with a `border-b*` class, has an `aria-current="page"` item other than its route family's (none on `/`, `/tags/**`, `/transparence-ia/`, `/404`) or one without `text-accent bg-accentSoft font-semibold`, has an actions group ≠ 3 controls with `bg-chip` or a `<kbd>`, or a footer containing `prototype` | no |
| R3 | Nav order and active state | `npx vitest run src/lib/shell.test.ts` → "orders the nav Blog, Projets, Skills, Prompts, À propos" and "draws the active nav item accent on accentSoft at weight 600" pass | yes |
| R4 | No demo copy in the footer | `npx vitest run src/lib/shell.test.ts` → "keeps the prototype's demo copy out of the footer" passes; after build `grep -rl 'prototype cliquable' dist` → empty | yes |
| R5 | Shell geometry | preview, both themes, 1280 px, every smoke route: each `[data-shell]` has `width` 1180 and `left` = (`clientWidth` − 1180)/2 ± 1; header computed `border-bottom-width` 0 and its first pill top − page top = 20 ± 1; footer `margin-top` 60 px, padding 24 px, `border-top` 1 px of probe `line2` | no |
| R6 | Header pills | preview, 1280, both themes: logo pill bg probe `nav`, 1 px `line`, radius 999, padding 8/18/8/12; tile 28×28, radius 9, bg `accentSoft`, 3 bars bg `accent`; `bencat` mono 15 px `ink`, `_` `accent`; nav pill padding 6, bg `nav`; items padding 8/14, 14 px, icon 15 px; on `/blog/` and `/blog/linux-commandes-essentielles/` `Blog` computes colour `accent`, bg `accentSoft`, weight 600, others `muted` on transparent; actions: 3 controls 34×34, radius 999, bg `chip`, colour `muted`; theme glyph sun visible in light, moon in dark, the other `display: none`; items render Blog, Projets, Skills, Prompts, À propos left to right; at 375 every nav item's rect lies within 0…375 | no |
| R7 | Footer | preview, 1280, both themes, every smoke route: footer is the last visible block of `body` before the search dialog; both texts JetBrains Mono 11 px, colour `muted`; left text left edge = footer content left, right text right edge = footer content right (± 1) | no |
| R8 | Blog rail data | `npx vitest run src/lib/blogList.test.ts` → "counts every published post under Tout, then each used category in CATEGORIES order", "omits a category without published post", "counts blog tags over published posts only, one per post" pass | yes |
| R9 | Engine: no featured mode and meta format | `npx vitest run src/lib/listPattern.test.ts` → 0 failed, and "sans bloc à la une, ne désigne aucune entrée et les garde toutes visibles" and "écrit une facette à libellé de repos « catégorie : Tout », puis « catégorie : DevOps »" pass; `git diff 7160035 -- src/lib/listPattern.test.ts \| grep -c '^-[^-]'` → `0` | yes |
| R10 | Dropdown keyboard logic | `npx vitest run src/lib/dropdown.test.ts` → "opens on Enter, Space, ArrowDown and ArrowUp with the selected option active", "moves with ArrowDown and ArrowUp and stops at the ends", "jumps to the first and last option with Home and End", "selects the active option on Enter and Space and closes", "closes without selecting on Escape and Tab" pass | yes |
| R11 | Built `/blog` | `node scripts/check-shell-blog.mjs` → the 6 `blog` lines as above, exit 0; exit 1 if `dist/blog/index.html` has a `[data-list-featured]`, a tag `<select>`, a link to `/tags/` outside tag chips, ≠ 1 `.card` in `[data-list]`, a rail without `data-rail`, a row that is a `.card-inner` or paints a background, a row without thumbnail (`img` or `[data-thumb-derived]`) / `.pill` category / `<time>` / `N min` / AI marker / description, a row or chip href that does not resolve in `dist/`, a chip whose `aria-label` ≠ `<tag> <count>`, a category group or `[data-dropdown]` not `hidden` server-side, a first-row image not `eager` or another not `lazy` | no |
| R12 | `/blog` layout | preview, 1280, both themes: breadcrumb mono 13 `accent`; h1 44 px / 700 / letter-spacing −1.32 px; breadcrumb top − header bottom = 56, h1 top − breadcrumb bottom = 14, card top − h1 bottom = 26 (± 2); card radius 20, `overflow: hidden`, rail width 250; rail bg `rail`, `border-right` 1 px `line2`, padding 22/16; category rows padding 8/10, radius 10, 14 px, count mono 11; tag chips radius 8, padding 4/9, mono 10, colours of `tagTone`; main padding 24/28/30; toolbar `border-bottom` `line2`; meta mono 12 `muted`; rows padding 20/0, `border-bottom` `line2`, gap 16; thumbnail 76×64, radius 10; row meta mono 11; title 19 px / 600; description 14 px `muted`, Nebula Sans. Below 768 (measured at 375): rail above main; at 768 and above: rail beside main | no |
| R13 | Rail filters | preview, both themes: click `DevOps 2` → visible rows `comment-jutilise-github-actions-au-quotidien`, `linux-commandes-essentielles`; the same `[data-list-meta]` node reads `2 articles · catégorie : DevOps`; `DevOps` has `aria-pressed="true"`, colour `accent` on `accentSoft`; `Outils 3` → 3 rows, `Outils`; `Tout 5` → 5 rows, `5 articles · catégorie : Tout`; each row reachable by Tab and Enter | no |
| R14 | Sort dropdown | preview, both themes: trigger text reads `tri : plus récents`; click → `aria-expanded="true"`, popover top − trigger bottom = 10 ± 1, right edges equal ± 1, width ≥ 236, radius 14, bg `surface`; 4 options in the R-listed order, `✓` and `aria-selected="true"` only on the current one, colour `accent`, weight 600; choosing each option closes the popover, updates the trigger value and orders visible rows by `data-date` desc / asc, `data-minutes` asc / desc; Escape closes and focus returns to the trigger; a click outside closes; keyboard only (Tab, Enter, ArrowDown, Enter) selects `plus anciens`; at 375 the open popover lies within the viewport | no |
| R15 | Without JavaScript | the `/blog` page loaded in a `sandbox` iframe without scripts: 5 rows in canonical order, meta `5 articles · catégorie : Tout`, the tag cloud with working links; no category row, no dropdown trigger, no search button visible (no dead control) | no |
| R16 | Fidelity with the prototype | verifier renders the prototype (`claude-design` `render_preview`, project `bb013596-0cd6-4e70-afad-e92b42d3f7f6`, file `bencat_ Prototype cliquable.dc.html`; the URL is never written down) and the site at 1280 px, light and dark: for header, footer and `/blog`, a side-by-side table lists the same blocks, in the same order, in the same columns; differences allowed only where this plan's Design rules say so (footer left copy, `muted` for `dim`, site AI labels) | no |
| R17 | Audit on every route | `scripts/audit-rendered.js` on the preview, every smoke route and the open search dialog, light and dark, at 375, 768 and 1280: 0 overflow, 0 contrast failure, 0 off-token colour, 0 V2 jump (rule amended for `[data-rail]`); on `/blog` also with the popover open and with `DevOps` active | no |
| R18 | Radii and mono (V6 amended, V5) | preview, both themes: on `/blog/` and in header and footer of every smoke route, every non-zero computed `border-radius` ∈ {8, 9, 10, 14, 20, 999} px; counts, dates, meta lines, breadcrumb, category pills and footer texts compute `"JetBrains Mono`; titles, descriptions, nav items and category labels compute `"Nebula Sans"` | no |
| R19 | Earlier instruments still pass | after build: `node scripts/check-home.mjs` → its 7 base lines, exit 0; `node scripts/check-secondary.mjs` → its 12 base lines except `tags: 30 slugs · 108 chips on 38 pages · 5/5 tones`, exit 0; `node scripts/check-finition.mjs` → its 7 base lines except `lists: 4 × 1 .card · 10 .card-inner entries · 5 blog rows` and `v2: 0 card-level on bg · 0 rail off card level · 1 rail column · 10 derived thumbnails`, exit 0; `node scripts/check-detail-tabs.mjs` → 7 rows, exit 0; pattern-class count (`sed -n '/@layer components {/,/^}/p' src/styles/global.css \| grep -cE '^\s+\.[a-z-]+ \{'`) → `4`; `git diff 7160035 -- src/styles/global.css \| grep -cE '^[-+]\s*--color-'` → `0` | no |
| R20 | Frozen paths, suite, types | `git diff 7160035 --stat -- src/content src/content.config.ts public/admin/config.yml docs/anti-drift .github/workflows package.json package-lock.json` → empty; `npx vitest run` → 0 failed, > 222 tests; `npm run check` → `0 errors`; `grep -c 'export function matchesFilters' src/lib/projectFilters.ts` → `1` | no |

## Shared resources
- `src/styles/global.css` — two new `@theme` tokens (`--container-shell`, `--radius-tag`), `[data-dropdown][hidden]` in the `!important` hidden list; no `--color-` line and no fifth pattern class (R19).
- `src/layouts/BaseLayout.astro`, `src/components/Header.astro` — every page (T1, T2 in sequence).
- `src/scripts/list-pattern.ts`, `src/lib/listPattern.ts` — also drive `/projets`, `/prompts`, `/skills` (R9, R19).
- `src/components/TagChip.astro`, `src/components/Thumbnail.astro` — additive variants only (`shape="tag"`, `size="row"`).
- `scripts/check-*.mjs`, `scripts/audit-rendered.js` — earlier plans' instruments, amended in T6 only.
- `dist/`, port 4321. No version bump (`v1.5.0` is the end-of-run publication, D68).

## Tasks
### T1 — Shell container and footer
- Files: `src/styles/global.css`, `src/layouts/BaseLayout.astro`, `src/components/Footer.astro` (new), every `src/pages/**/*.astro` that sets `max-w-5xl` or a detail `px-4`, `src/lib/shell.test.ts` (new), `scripts/check-shell-blog.mjs` (new, dependency-free like `check-finition.mjs`; later lines reported missing until T2/T5)
- Covers: R1, R2 (`shell`, `footer`), R4
- Acceptance: `npx vitest run src/lib/shell.test.ts` → the R1 and R4 tests pass; `grep -rn 'max-w-5xl' src/pages src/components src/layouts` → empty; `npm run build && node scripts/check-shell-blog.mjs` → `shell:` and `footer:` lines as expected; `check-home`, `check-secondary`, `check-finition`, `check-detail-tabs` → exit 0 with their base lines
- Depends on: —

### T2 — Header in three pills
- Files: `src/components/Header.astro`, `src/components/ThemeToggle.astro` (keeps `id="theme-toggle"`), `src/components/Icon.astro` (`sun`, `moon`), `src/lib/shell.test.ts`, `scripts/check-shell-blog.mjs`
- Covers: R2 (`nav`, `active`, `actions`), R3
- Acceptance: `npx vitest run src/lib/shell.test.ts` → R3 tests pass; `npm run build && node scripts/check-shell-blog.mjs` → first 5 lines as expected; `npm run check` → `0 errors`
- Depends on: T1

### T3 — Reusable dropdown
- Files: `src/lib/dropdown.ts` + `dropdown.test.ts` (new, no DOM), `src/components/Dropdown.astro`, `src/scripts/dropdown.ts` (new), `src/styles/global.css`
- Covers: R10
- Acceptance: `npx vitest run src/lib/dropdown.test.ts` → the 5 R10 tests pass; `npm run check` → `0 errors`
- Depends on: —

### T4 — List engine: rail groups, dropdown sort, no featured
- Files: `src/lib/listPattern.ts`, `src/lib/listPattern.test.ts` (additions only), `src/scripts/list-pattern.ts`
- Covers: R9
- Acceptance: `npx vitest run src/lib/listPattern.test.ts` → R9 tests pass, the `git diff` count → `0`; `npm run build && node scripts/check-finition.mjs` → base lines, exit 0
- Depends on: T3

### T5 — `/blog` list
- Files: `src/pages/blog/index.astro`, `src/components/ListHeader.astro`, `src/components/blog/BlogRail.astro`, `src/components/blog/ArticleRow.astro` (new; `ArticleCard.astro` and `src/scripts/blog-filters.ts` deleted), `src/components/Thumbnail.astro`, `src/components/TagChip.astro`, `src/lib/blogList.ts` + `blogList.test.ts` (new), `src/lib/listPages.test.ts` (blog: rail + rows, no featured, rows not `.card-inner`), `scripts/check-shell-blog.mjs`
- Covers: R8, R11
- Acceptance: `npx vitest run` → 0 failed; `npm run build && node scripts/check-shell-blog.mjs` → the 11 expected lines, exit 0; `npm run check` → `0 errors`
- Depends on: T1, T4

### T6 — Earlier instruments follow the new `/blog`
- Files: `scripts/check-finition.mjs` (blog frame = rail + grid + empty, rows not `.card-inner`; `eager` = first row; V2 `[data-rail]` exemption and `rail column` count), `scripts/check-home.mjs` (home featured = the `/blog` row with `data-featured`, else the first row), `scripts/check-secondary.mjs` (chips `rounded-pill` or `rounded-tag`), `scripts/audit-rendered.js` + `src/lib/auditRendered.test.ts` (V2 skips `[data-rail]`)
- Covers: R19, R17 (instrument)
- Acceptance: `npm run build` then the four scripts of R19 → the stated lines, exit 0; `npx vitest run` → 0 failed; `grep -c 'data-rail' scripts/audit-rendered.js scripts/check-finition.mjs` → ≥ 1 each
- Depends on: T5

### F1 — Shell caps the content box at 1180 px; header pills top-aligned at 20 px
- Files: `src/layouts/BaseLayout.astro`, `src/components/Header.astro`, `src/components/Footer.astro`, `src/styles/global.css`, `src/lib/shell.test.ts`, `scripts/check-shell-blog.mjs`
- Covers: R5, R16 (difference 1)
- Acceptance (verifier failure): at 1280, both themes, every `[data-shell]` **content box** is 1180 wide at x 50–1230 (card 50/1180, logo pill left 50, actions pill right 1230, footer texts 50–1230), as in the prototype (`max-width:1180px` content-box + 24 px padding); the logo, nav and actions pills' tops are each 20 ± 1 px from the page top (today the logo sits at 22: the nav pill is 50 px tall vs the prototype's 47); 375 px unchanged (no overflow); `check-shell-blog.mjs` and `shell.test.ts` still pass
- Depends on: —

### F2 — Dropdown stays inside the viewport at 375 px
- Files: `src/components/Dropdown.astro`, `src/scripts/dropdown.ts`, `src/lib/dropdown.ts` (+ test if the placement rule is pure)
- Covers: R14
- Acceptance (verifier failure): at 375, both themes, on `/blog` with the sort popover open, the popover's bounding rect satisfies `left >= 0` and `right <= innerWidth` (today it spans x −35.8 → 200.2 and clips "plus récents"); every option text is fully visible; at 1280 the popover stays right-aligned to its trigger (right edges equal ± 1) with the 10 ± 1 px gap
- Depends on: —

### F3 — Sort options drawn like the prototype
- Files: `src/components/Dropdown.astro`, `src/components/Icon.astro`, `src/pages/blog/index.astro`
- Covers: R16 (difference 2)
- Acceptance (verifier failure): read the prototype's sort popover markup (lines ~163–227 and the dropdown logic ~1283 of `bencat_ Prototype cliquable.dc.html`, `claude-design` MCP `read_file`); the site's options use the prototype's font (JetBrains Mono 11 px), the prototype's per-option icons and its popover width (250 px for sort), in both themes; ✓ and `aria-selected` behaviour unchanged; `dropdown.test.ts` still passes
- Depends on: F2

### F4 — Sort reorders the DOM; check-home honours `featured`; stale comments
- Files: `src/scripts/list-pattern.ts`, `src/components/blog/ArticleRow.astro`, `src/pages/blog/index.astro`, `scripts/check-home.mjs`, `src/components/Thumbnail.astro`, `src/lib/aiUsage.ts`, `src/lib/posts.ts`
- Covers: findings outside criteria (verification 1)
- Acceptance: after choosing `plus anciens` on `/blog`, the first row in DOM order is the first row on screen (keyboard Tab reaches `docker-kubernetes-devops` … before `comment-jutilise…` per the sort) — the sort moves nodes instead of setting `style.order`, on all four lists; a `/blog` row whose post has `featured: true` carries `data-featured` so `check-home.mjs` compares the right post; `grep -rn ArticleCard src` → empty; `npx vitest run` 0 failed; the five check scripts exit 0
- Depends on: —

## Out of scope
- List header, segmented control and facet dropdowns on `/projets`, `/prompts`, `/skills` (plan 14 reuses `ListHeader` and `Dropdown`); inner layouts of the detail pages (13, 15–17); home and about gaps (18).
- Hover states' contrast; a tag filter on `/blog`; any content, schema or CMS change; token value changes; version bump, tag, merge, push, deploy.

## Evidence

### Verification 1 (2026-09-24)
| ID | Verdict | Evidence |
|---|---|---|
| R0 | failed | Walkthrough clean in both themes (`/` › Blog › DevOps 2 › sort › row › tag chip › `/tags/kubernetes/` › `/tags/`; all 200/304, no 5xx); fails through R5, R12, R14, R16 |
| R1 | proven | `shell.test.ts` passes; red on token 1024px, Footer `max-w-5xl`, missing `data-shell="main"` |
| R2 | proven | `check-shell-blog.mjs` first 5 lines exact, exit 0; exit 1 on 5 injected defects |
| R3 | proven | named tests pass; red on Skills/Prompts swap, neutral active, ternary removed |
| R4 | proven | test red on `prototype cliquable` inserted; `dist` clean |
| R5 | failed | shell 1180 at left 50 on 14 routes × 2 themes, no header border, footer ok; **logo pill top 22 px, not 20 ± 1** (nav pill 50 px tall vs prototype 47) |
| R6 | proven | every pill/item/button value measured on 14 routes × 2 themes; 375 px two rows within 0–375 |
| R7 | proven | footer last in body, mono 11 `muted`, edges ± 1 |
| R8 | proven | 3 tests pass; red on zero-count filter removed and drafts kept |
| R9 | proven | 30 tests; 0 deleted lines; red on featured flag and label format mutations |
| R10 | proven | 5 named tests, each red under a targeted mutation |
| R11 | proven | 6 blog lines exact; exit 1 on 12 injected defects |
| R12 | failed | all 1280 values hold, 375 stacks; **at 768 the rail is beside main** — plan text self-contradictory (D73: stacks below 768); measure text corrected |
| R13 | proven | DevOps 2 → 2 rows + meta `2 articles · catégorie : DevOps`; Outils 3 → 3; Tout 5 → 5; keyboard Tab/Enter works |
| R14 | failed | 1280 behaviour all correct (open, gap 10.7, width 236, ✓, sorts, Escape, outside click, keyboard); **375: popover spans x −35.8 → 200.2, text clipped** |
| R15 | proven | no-JS iframe: 5 rows, meta, 20 chip links, no dead control |
| R16 | failed | blocks and order match the prototype in both themes; **content 1132 px at x 74–1206 vs prototype 1180 at 50–1230** (max-width on border-box); **sort options sans 13 no icons 236 px vs prototype mono 11 with icons 250 px** |
| R17 | proven | `audit-rendered.js` 84 runs + 18 open-state runs: 0 overflow / contrast / off-token / V2 |
| R18 | proven | radii {999, 9, 20, 10, 8, 14}; mono only on machine data |
| R19 | proven | 4 earlier scripts identical to base except the amended lines; pattern classes 4; `--color-` diff 0 |
| R20 | proven | frozen diff empty; 251 tests; 0 errors; `matchesFilters` 1 |

Findings outside criteria → F4: sort sets `style.order` (keyboard order ≠ visual order); `check-home` ignores `featured`; stale `ArticleCard` comments; `max-w-[calc(100vw-2rem)]` overridden by inline `min-width`.

### Verification 2 (2026-09-24, after F1–F4)
| ID | Verdict | Evidence |
|---|---|---|
| R0 | proven | walkthrough light then dark (`/` › Blog › DevOps 2 › sort `plus anciens` › row › back › tag chip › `/tags/`); 20 routes 200 on preview, dev log only `[200]`, 0 console errors; R16 smoke (see below) |
| R1 | proven | test passes; red on 1024px token, Footer/Header/page `max-w-5xl`, missing `data-shell="main"` |
| R2 | proven | first 5 lines exact, exit 0; exit 1 on 5 injected defects |
| R3 | proven | named tests pass; red on swap, neutral active, active branch removed |
| R4 | proven | red on `prototype cliquable`; dist clean |
| R5 | proven | 14 routes × 2 themes: content box 1180 at x 50 (`box-content`), no header border, **pill tops 20/20/20**, footer 60 / 24 / `line2` |
| R6 | proven | every header value on 14 routes × 2 themes; sun/moon per theme; 375 two rows in bounds |
| R7 | proven | footer last, mono 11 `muted`, edges ± 1 |
| R8 | proven | 3 tests; red on 4 mutations |
| R9 | proven | 36/36, 0 deleted lines; red on 2 mutations |
| R10 | proven | 5 named tests, each red under a targeted mutation |
| R11 | proven | 6 blog lines exact; exit 1 on 9 injected defects |
| R12 | proven | all 1280 values both themes; rail above list at 375/767, beside at 768/1024 |
| R13 | proven | DevOps 2 / Outils 3 / Tout 5 rows and meta; real keyboard |
| R14 | proven | 1280: gap 10.0, right edges equal, width 250, ✓, 4 sorts, DOM order = screen order, Escape, outside click, keyboard; **375 and 320: x 8→258, 0 clipped** |
| R15 | proven | no-JS iframe both themes: 5 rows, meta, 20 chip links, no dead control of this plan |
| R16 | smoke | `claude-design` MCP refused (`needs_design_scopes`) for the verifier and the orchestrator; F1/F3 target values measured (content 1180 at 50–1230; options mono 11 + icons, 250 px). Orchestrator side-by-side at 1280 dark before F1 (header, /blog) matched in blocks and order. **Smoke step: user runs `/design-login`, then the side-by-side is replayed (header, footer, /blog, both themes).** |
| R17 | proven | `audit-rendered.js` 102 runs (14 routes × 3 widths × 2 themes + open states): 0 overflow / contrast / off-token / V2; injected `#ff0000` caught |
| R18 | proven | 2,342 elements: radii {999, 9, 20, 10, 8, 14}; mono/Nebula split as specified |
| R19 | proven | earlier scripts identical to base except amended lines; runtime filters intact on the 3 other lists |
| R20 | proven | frozen diff empty; 268 tests; 0 errors; `matchesFilters` 1 |

Finding outside criteria: the theme toggle stays visible and inert without JS (true since base) — carried to plan 18.
