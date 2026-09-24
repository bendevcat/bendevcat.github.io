# Plan 9 — accueil

Brief: `docs/auto/brief.md` · Branch: `auto/plan-9-accueil` · Base: `bce581d7c55e7dd13587931a153f661044b7e5c1`

## Goal
On `/`, in both themes, the user sees, top to bottom, the prototype's home (contract E3): a featured-post card (cover or the derived placeholder, category · date, title, excerpt, the post's AI-usage marker, `Lire →` to the post) beside a `Derniers articles` panel listing the next 3 published posts with thumbnails and `Plus d'articles →` to `/blog`; then three section panels Projets · Prompts · Skills (pattern §5.3: 28×28 badge, title linking to the list page, `card-inner` entries fed by real content, each linking to its detail page); then an AI-transparency banner linking to `/transparence-ia/`. Every link resolves; at 375 px the page has no horizontal overflow

## Reachability
From `http://localhost:4321/` the user is on the feature. From any other page: header logo `bencat_` (`Header.astro`, `href="/"`) › `/`.
The path exists today; the plan replaces what `/` renders (`src/pages/index.astro`: `Hero` + grid of `ArticleCard`).

### Home map (what feeds each block, measured at base)
Published posts, canonical order (`getPublishedPosts()`, drafts dropped, `pubDate` desc; `bienvenue-dans-mon-foutoir` is a draft; no post sets `featured`): `comment-jutilise-github-actions-au-quotidien`, `linux-commandes-essentielles`, `meilleurs-vpn-2025`, `docker-kubernetes-devops`, `k9s-kubernetes-terminal-ui`. All five have a `cover` and an `aiUsage`.

| Block | Class | Fed by | Shows |
|---|---|---|---|
| À la une | `.card` on `bg` | `pickFeaturedEntry` over published posts — the same derivation and entry as `/blog`'s `data-featured` | cover at 196 px high, or the derived placeholder; chip `à la une`; `category · date · reading time` (mono); title (29 px / 700); `description` as excerpt; footer `emoji label` from `AI_USAGE_META` (omitted if `aiUsage` is unset) + `Lire →` |
| Derniers articles | `.card` on `bg`, 28×28 badge (blog glyph) at the right of its title | the next 3 published posts after the featured one | per item: 72 px thumbnail, category (accent mono), title (17 px / 500), `date · reading time · emoji label`; footer `Plus d'articles →` to `/blog/` |
| Projets · Prompts · Skills | `.panel` (§5.3), badge = the header glyph of the section, title links to `/projets/`, `/prompts/`, `/skills/` | first 2 entries of `getSortedProjects()` / `getSortedPrompts()` / `getSortedSkills()` (the list pages' order) | `.card-inner` links to the detail page. Project: title + status chip (`PROJECT_STATUS_META`), description, stack in mono joined by ` · `. Prompt: format chip + tool in mono, title, description. Skill: title + `v<version>` chip when set, description, `type · name` in mono (`type` alone when `name` is unset) |
| AI banner | `accentSoft` background, no pattern class | `AI_USAGE_META` + the sentence already on `/transparence-ia` | « Chaque article déclare son niveau de contribution IA : ✍️ 100% humain, 🤝 co-créé avec IA ou 🤖 IA relue. » (labels read from `AI_USAGE_META`, never retyped) + outlined pill `transparence IA →` to `/transparence-ia/` |

The page keeps exactly one `<h1>`: a visually hidden `bencat_` (the site name). Rule D26 applies to every field: shown only when content or a derivation feeds it, never a prototype value.

Expected output of the check script (T2/T3):
```
featured: /blog/comment-jutilise-github-actions-au-quotidien/ · DevOps · ✍️ 100% humain
latest: /blog/linux-commandes-essentielles/ | /blog/meilleurs-vpn-2025/ | /blog/docker-kubernetes-devops/
more: /blog/
section Projets /projets/: /projets/site-bencat/ | /projets/gha-svu/
section Prompts /prompts/: /prompts/decouper-un-projet-en-plans-anti-drift/ | /prompts/macos-clone/
section Skills /skills/: /skills/anti-drift-planning/ | /skills/superpowers/
banner: /transparence-ia/
```

## Criteria
| ID | Criterion | Measure | Guarantee |
|---|---|---|---|
| R0 | On `/`, in both themes, the user sees, top to bottom, the prototype's home (contract E3): a featured-post card (cover or the derived placeholder, category · date, title, excerpt, the post's AI-usage marker, `Lire →` to the post) beside a `Derniers articles` panel listing the next 3 published posts with thumbnails and `Plus d'articles →` to `/blog`; then three section panels Projets · Prompts · Skills (pattern §5.3: 28×28 badge, title linking to the list page, `card-inner` entries fed by real content, each linking to its detail page); then an AI-transparency banner linking to `/transparence-ia/`. Every link resolves; at 375 px the page has no horizontal overflow | reachability walkthrough on the running app: open `/`, light then dark theme (set via `localStorage.theme` + reload), widths 1180 and 375; the blocks appear in the Home map order with the Home map content; click `Lire →`, one latest item, `Plus d'articles →`, each section title, one entry per section and the banner pill → each lands on a 200 page that is not `/404` | no |
| R1 | Post selection follows the Home map | `npx vitest run src/lib/home.test.ts` → 0 failed, and these tests exist and pass: `pickHomePosts` › "features the post flagged featured, else the first published post", "lists the next 3 posts in order and never the featured one", "lists fewer items when fewer posts remain", "returns no featured post and no item when there is no post"; `takeSectionEntries` › "keeps the first N entries in the given order" | yes |
| R2 | Built home has the expected blocks, order and links | `npm run build && node scripts/check-home.mjs` → prints exactly the 7 expected lines above and exits 0. The script exits 1 if, in `dist/index.html`: the `data-home` blocks are not in the order featured, latest, Projets, Prompts, Skills, banner; any `<a href>` starting with `/` does not resolve to a file in `dist/` (`<path>/index.html` or the file itself); the featured post id differs from the `data-featured` entry of `dist/blog/index.html`; the featured block lacks a `Lire →` link to the same href as its title, or an `<img>` / derived placeholder; a latest item lacks an `<img>` / derived placeholder; a section is not a `.panel`, has no `.card-inner` entry, or its title link does not target its list page; the page has ≠ 1 `<h1>` or contains `whoami` | no |
| R3 | Section entries show their fields | in `dist/index.html`, entry text contains: `site-bencat` → `wip`, `Astro · Tailwind CSS · TypeScript · Sveltia CMS · GitHub Pages`; `gha-svu` → `actif`, `GitHub Actions · Bash · Go · SVU`; `decouper-un-projet-en-plans-anti-drift` → `guide`, `Claude Code`; `macos-clone` → `fiche`, `Claude`; `anti-drift-planning` → `v0.4.0`, `claude-code · anti-drift-planning`; `superpowers` → `v6.2.0`, `claude-code · superpowers`; every entry contains its `title` and `description` | no |
| R4 | AI banner text is derived, not retyped | `grep -c 'AI_USAGE_META' src/components/home/AiTransparencyBanner.astro` ≥ 1 and that file contains none of the literals `100% humain`, `co-créé`, `IA relue`; in `dist/index.html` the banner text contains `✍️ 100% humain`, `🤝 co-créé avec IA`, `🤖 IA relue` in that order | no |
| R5 | Section panel pattern §5.3, both themes | on `/`, light and dark, probe elements with `var(--color-…)` backgrounds: each `.panel` computes `background-color` = probe `panel`, `border-top-color` = probe `panelLine`, `border-radius: 20px`; each badge is 28×28, `border-radius: 9px`, `background-color` = probe `badgeBg`, `color` = probe `badgeInk`; each `.card-inner` computes `background-color` = probe `card`, `border-radius: 14px`, a non-`none` `box-shadow` that differs between themes | no |
| R6 | Type scale §3.3 | at 1180 px: featured title `font-size: 29px`, `font-weight: 700`; section and `Derniers articles` titles `17px` / `600`; latest item titles `17px` / `500` | no |
| R7 | Layout at three widths | 1180 px: featured and `Derniers articles` share a row (equal `getBoundingClientRect().top`), the three panels share a row, the banner is below them; 375 px: every block's top ≥ the previous block's bottom (DOM order); at 375, 768 and 1180, both themes: `document.documentElement.scrollWidth <= innerWidth` | no |
| R8 | Mono only for machine data (V5) | on `/`: the featured excerpt, every entry description and the banner sentence compute a `font-family` starting with `"Nebula Sans"`; categories, dates, stack, tool and `type · name` start with `"JetBrains Mono` | no |
| R9 | No new surface-level jump (V2 on `/`) | dark theme: each `.card` on `/` has `bg` as nearest painted ancestor background; each `.card-inner` has a `.panel` as nearest painted ancestor | no |
| R10 | Radii and accents (V6, V3, V4) | on `/`, both themes: every non-zero computed `border-radius` ∈ {9, 10, 14, 20, 999} px; dark: no element carries both an accent-green value (`accent`, `accentSoft`) and a blue value (`badgeInk`, `badgeBg`, `panel`, `panelLine`) among its own `color` / `background-color` / `border-color`; light: no computed colour equals `rgb(125, 211, 252)` | no |
| R11 | The four lists are unchanged | build base `bce581d` in a scratch copy (`git archive bce581d \| tar -x -C <scratch>/base`, symlink `node_modules`, `npm run build`); for `/blog`, `/projets`, `/prompts`, `/skills`: the text of `<main>` and the multiset of `class` attribute values inside `<main>` are identical in base and branch | no |
| R12 | No fifth pattern class | `sed -n '/@layer components {/,/^}/p' src/styles/global.css \| grep -cE '^\s+\.[a-z-]+ \{'` → `4` | no |
| R13 | Frozen paths untouched | `git diff bce581d --stat -- src/content.config.ts src/content public/admin/config.yml docs/anti-drift .github/workflows` → empty output | no |
| R14 | Suite and types green; kept code kept | `npx vitest run` → 0 failed, test count > 168; `npm run check` → `0 errors`; `grep -c 'export function matchesFilters' src/lib/projectFilters.ts` → `1` | no |

## Shared resources
- `src/components/Thumbnail.astro` — used by the four list cards; new sizes are additive (R11 guards the lists).
- `src/styles/global.css` — tokens and the 4-class `@layer components` (read; not extended, R12).
- `src/components/Icon.astro` — read only; badges reuse the header glyphs `blog`, `projets`, `prompts`, `skills`.
- `dist/` build output, dev/preview server on port 4321.
- Version files: none — `package.json` is not bumped; `v1.4.0` belongs to the end-of-run publication (D25).

## Tasks
### T1 — Pure home selection logic
- Files: `src/lib/home.ts`, `src/lib/home.test.ts` (new)
- Covers: R1
- Content: `pickHomePosts(posts, latestCount = 3)` → `{ featured, latest }`, reusing `pickFeaturedEntry` from `listPattern.ts`; `takeSectionEntries(entries, count = 2)`. Generic over plain objects; no `astro:content` import.
- Acceptance: `npx vitest run src/lib/home.test.ts` → all pass, including every test named in R1
- Depends on: —

### T2 — Row 1: featured card and `Derniers articles`
- Files: `src/pages/index.astro` (drop `Hero` and the `ArticleCard` grid; sr-only `<h1>`), `src/components/home/FeaturedPost.astro`, `src/components/home/LatestPosts.astro` (new), `src/components/Thumbnail.astro` (additive sizes: 196 px header, 72 px square), `scripts/check-home.mjs` (new, dependency-free like `check-detail-tabs.mjs`; sections and banner reported as missing until T3)
- Covers: R2 (featured, latest, more lines), R6, R8, R11 on row 1
- Acceptance: `npm run build && node scripts/check-home.mjs` → first 3 lines equal the expected `featured`, `latest`, `more` lines, only the missing-section/banner errors remain; `npm run check` → `0 errors`
- Depends on: T1

### T3 — Row 2 section panels and row 3 AI banner
- Files: `src/components/home/SectionPanel.astro` (new: `.panel`, badge, title link, slot), `src/components/home/SectionEntry.astro` (new: `.card-inner` link; project / prompt / skill field sets), `src/components/home/AiTransparencyBanner.astro` (new), `src/pages/index.astro`, `scripts/check-home.mjs`
- Covers: R2, R3, R4, R5, R9 (static part)
- Rule: one `SectionPanel` for the three sections, never a per-section copy.
- Acceptance: `npm run build && node scripts/check-home.mjs` → exactly the 7 expected lines, exit 0; `npx vitest run` → 0 failed
- Depends on: T2

### T4 — Rendered measurement pass
- Files: fixes only, in T2/T3 files
- Covers: R0, R5–R11 (rendered), R12–R14
- Acceptance: run by the orchestrator (implementers have no browser, D20): every measure of R0, R5–R10 on `npx astro dev --background`, both themes, 375 / 768 / 1180 → as stated; R11 on base and branch builds → identical; R12–R14 commands → as stated
- Depends on: T3

## Out of scope
- `/a-propos` and moving the `~/ whoami` identity there (plan 10, D27); `src/components/Hero.astro` is left unused in place so plan 10 can reuse its author text.
- AI-usage palette, tag tones, status-chip palette, search backdrop (plans 10–11); AA contrast of every pair and 375 px on routes other than `/` (plan 11).
- Changes to `ArticleCard`, `ProjectCard`, `PromptCard`, `SkillCard`, `Header.astro`, `Icon.astro`, the list pages.
- Any change to `src/content/**`, `src/content.config.ts`, `public/admin/config.yml`, `docs/anti-drift/**`, `.github/workflows/**`; prototype demo values (email, LinkedIn, handles, quotes).
- Version bump, tag, merge, push, deploy.
