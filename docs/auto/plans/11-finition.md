# Plan 11 — finition

Brief: `docs/auto/brief.md` · Branch: `auto/plan-11-finition` · Base: `05ceeff15fa3436521f2c31e06326ea31a9e367c`

## Goal
On every route of the site (home, 4 lists, 4 kinds of detail page, about, AI transparency, tags, tag page, 404, search dialog open), in both themes: no horizontal overflow at 375 px; the contract pairs of V8 (`body` on `bg`, `muted` on `surface`, `accent` on `accentSoft`) and every rendered text/background pair measure ≥ 4.5:1 (≥ 3:1 for large text); no surface-level jump (V2 — `card` on `bg`, `rail` on `surface`); no colour outside the 23 tokens and the 5 tag tones (project status, search backdrop); the filterable lists announce their result count to screen readers (`aria-live`)

## Reachability
From `http://localhost:4321/` (production-like: `npm run build && npx astro preview`): header pills › `/blog`, `/projets`, `/prompts`, `/skills`, `/a-propos`; any list card › its detail page; home banner pill › `/transparence-ia/`; `/blog` › `tous les tags →` › `/tags/` › a tag › `/tags/<tag>/`; an unknown URL › `/404`; loupe button or ⌘K › search dialog; theme toggle › other theme. Every path exists; this plan changes what they render.

### Measured states (used by R0, R7–R10)
**S** = `/`; `/blog/`, `/projets/`, `/prompts/`, `/skills/` at rest, plus on `/projets/` one active stack filter and the empty state; the 5 article pages; `/projets/gha-svu/`, `/projets/site-bencat/`, the 3 prompt pages and the 2 skill pages, each tab selected in turn; `/a-propos/`; `/transparence-ia/`; `/tags/`; `/tags/devops/`; an unknown URL (404); the search dialog open on `/`, empty (hint) and with `devops` typed (results). Each state in light and dark (`localStorage.theme` + reload), at 375 px unless stated.

Measurement rules (authoring choices, logged as decisions):
- **Contrast** — every visible element owning a non-whitespace text node, plus the search input's `::placeholder`: text colour composited over the stack of ancestor `background-color`s down to the page, `background-image` ignored (the `hatch` texture is decoration); large = ≥ 24 px, or ≥ 18.66 px at weight ≥ 700 (WCAG); emoji-only text nodes and visually hidden (`sr-only`) text excluded; rest state only (no hover).
- **Token colour** — a computed `color`, `background-color`, border colour (width > 0), outline colour (style ≠ `none`), SVG `fill`/`stroke` (≠ `none`), text-decoration colour (line ≠ `none`) and the open dialog's `::backdrop` colour, normalised to sRGB, has the RGB (±2 per channel) of one of the 38 values of the active theme (23 tokens + 15 tone tokens), any alpha (Tailwind `/NN` modifiers on a token), or is transparent. Out of this rule: images, emoji glyphs, `box-shadow`, native UI the page does not paint (open `<select>` popup, scrollbars, `::selection`).
- **V2** — in dark, where the four levels have distinct values (`bg` #0A0C0F, `surface` #12161B, `card` #181D24, `rail` #0E1216): no element whose `background-color` is `card` has `bg` as nearest painted ancestor; no element whose background is `rail` has `surface` as nearest painted ancestor. The DOM is the same in light (checked statically by R7).

## Criteria
| ID | Criterion | Measure | Guarantee |
|---|---|---|---|
| R0 | On every route of the site (home, 4 lists, 4 kinds of detail page, about, AI transparency, tags, tag page, 404, search dialog open), in both themes: no horizontal overflow at 375 px; the contract pairs of V8 (`body` on `bg`, `muted` on `surface`, `accent` on `accentSoft`) and every rendered text/background pair measure ≥ 4.5:1 (≥ 3:1 for large text); no surface-level jump (V2 — `card` on `bg`, `rail` on `surface`); no colour outside the 23 tokens and the 5 tag tones (project status, search backdrop); the filterable lists announce their result count to screen readers (`aria-live`) | reachability walkthrough on the preview, light then dark: follow every Reachability path to each state of **S**; R1–R10 hold on each | no |
| R1 | V8 pairs pass by construction | `npx vitest run src/lib/contrast.test.ts` → 0 failed; "measures the V8 contract pairs at 4.5:1 or more in both themes" passes (token values read from `global.css`; `accentSoft` composited over `bg` and over `surface`) | yes |
| R2 | No off-contract colour in the source (P6 D02 remainder) | `npx vitest run src/lib/palette.test.ts` → 0 failed; "finds no colour outside the contract tokens and tones in src" passes: in every non-test `.astro`/`.ts`/`.mjs` under `src/` (not `src/content`) no utility naming a Tailwind palette colour (`<palette>-<shade>`), `black` or `white`, no arbitrary colour (`-[#…]`, `-[rgb…]`, `-[hsl…]`, `-[oklch…]`), no colour literal in a `style` attribute; in `global.css` no colour literal outside the two token blocks. `grep -rnE 'amber-[0-9]\|bg-black' src/lib/projectStatus.ts src/components/SearchDialog.astro` → empty | yes |
| R3 | Project status on contract colours | `npx vitest run src/lib/projectStatus.test.ts` → "draws wip with the amber tone" (chip = `TONE_CLASSES.amber`) and "draws actif with the accent and archivé with neutral tokens" pass | yes |
| R4 | Search backdrop and `<mark>` on tokens | on the preview, both themes, dialog open with `devops`: `getComputedStyle(dialog,'::backdrop').backgroundColor` has the RGB of probe `bg` and alpha ≥ 0.8; every `mark` in the results computes background = probe `accentSoft`, colour = probe `accent`, ≥ 4.5:1 on its composited background | no |
| R5 | Syntax highlighting from tokens, AA | `npx vitest run src/lib/syntaxTheme.test.ts` → "names a contract token for every syntax colour" and "keeps every syntax colour at 4.5:1 or more on `code` in both themes" pass; after `npm run build`, `grep -ohE 'style="[^"]*#[0-9a-fA-F]{3,8}' dist/blog/*/index.html \| wc -l` → `0` (at base: `#6A737D` comments, 4.07:1 on dark `code`) | yes |
| R6 | Lists announce their count (P7) | `npx vitest run src/lib/listPages.test.ts` → "marks the meta line of each filterable list as a polite, atomic live region" passes (reads the 4 list pages: the `data-list-meta` element carries `aria-live="polite"` and `aria-atomic="true"`); `node scripts/check-finition.mjs` → line `live: blog projets prompts skills`; on the preview, clicking a filter on each list changes the text of that same `[data-list-meta]` node, which keeps both attributes | yes |
| R7 | No surface-level jump (P7 D04, V2) | on each list, `featured`, grid and empty state sit in one `.card` and every entry is a `.card-inner`; `node scripts/check-finition.mjs` → lines `lists: 4 × 1 .card · 16 .card-inner entries` and `v2: 0 card-level on bg · 0 rail off card level · 10 derived thumbnails`, exit 0 — it exits 1 if, on any built page, a `.card-inner`/`bg-card` element has no `.card`/`bg-surface`/`.panel`/`.card-inner`/`bg-card` ancestor, or a `[data-thumb-derived]`'s nearest such ancestor is not `.card-inner`/`bg-card`; rendered: 0 V2 jump on every state of **S** (dark rule) | no |
| R8 | Every rendered pair passes | 0 contrast failure on every state of **S**, both themes (contrast rule) — including the 4 list meta lines (base: `text-dim` on `bg`, 4.19:1 light) and the derived-thumbnail monogram | no |
| R9 | No rendered colour outside the contract | 0 off-token colour on every state of **S**, both themes (token rule) | no |
| R10 | No horizontal overflow at 375 | `document.documentElement.scrollWidth <= innerWidth` at 375 px, both themes, on every state of **S** and every other built `/tags/<slug>/` page | no |
| R11 | Plan-8 leftovers | `node scripts/check-finition.mjs` → line `fallback: 15/15 data-pagefind-ignore` (one per tab on the 7 detail pages); `grep -cE '^\[data-detail-tabs\] \[role="tabpanel"\]\[hidden\]' src/styles/global.css` → `0`; `grep -rnE 'global\.css:[0-9]' src` → empty; `node scripts/check-detail-tabs.mjs` → its 7 rows, exit 0; preview: with JS a click on each tab leaves only its panel visible; in a `sandbox` iframe without scripts every panel and fallback heading is visible | no |
| R12 | Above-the-fold covers load eagerly | `node scripts/check-finition.mjs` → line `eager: / · /blog/`: the `<img>` in `[data-home="featured"]` of `dist/index.html` and in `[data-list-featured]` of `dist/blog/index.html` carry `loading="eager"`; every other `<img>` of both pages keeps `loading="lazy"` | no |
| R13 | AI markers do not break at 375 | `node scripts/check-finition.mjs` → line `ai-markers: <n> on /`, n ≥ 4 (featured footer, latest items, the 3 banner pairs each an element with `data-ai-marker`); preview at 375, both themes: every `[data-ai-marker]` on `/` has `getClientRects().length === 1` | no |
| R14 | Contract-coloured focus ring | Tab from the top of `/`, of `/projets/gha-svu/` (to a tab) and into the open search dialog, both themes: each focused element computes `outline-style: solid`, width ≥ 2 px, colour = probe `accent` (tabs may keep `ink`), ≥ 3:1 against its composited background; `grep -n 'outline-none' src/components/SearchDialog.astro` → empty | no |
| R15 | `/tags` link names readable | `node scripts/check-finition.mjs` → line `tags: 30/30 named "<label> <count>"`: every `/tags/<slug>/` link on `/tags` has `aria-label` = its tag label, one space, its count (base: text reads `claude-code5`) | no |
| R16 | Earlier plans not regressed | `node scripts/check-home.mjs` → its 7 lines, exit 0; `node scripts/check-secondary.mjs` → its 12 lines, exit 0; `sed -n '/@layer components {/,/^}/p' src/styles/global.css \| grep -cE '^\s+\.[a-z-]+ \{'` → `4`; the 38 token values in `global.css` equal base (`git diff 05ceeff -- src/styles/global.css` adds, removes or edits no line matching `^\s*--color-`) | no |
| R17 | Frozen paths untouched | `git diff 05ceeff --stat -- src/content.config.ts src/content public/admin/config.yml docs/anti-drift .github/workflows` → empty | no |
| R18 | Suite and types green; kept code kept | `npx vitest run` → 0 failed, count > 189; `npm run check` → `0 errors`; `grep -c 'export function matchesFilters' src/lib/projectFilters.ts` → `1`; `git diff 05ceeff -- package.json package-lock.json` → empty | no |

## Shared resources
- `src/styles/global.css` — token values frozen by the contract (R16: a failing pair is fixed by using a passing token, never by retuning one); `@layer components` keeps 4 classes; the no-JS `@layer base` rule is guarded by `check-detail-tabs.mjs`.
- `astro.config.mjs` — Shiki theme (T2). `package.json`: untouched, no version bump (`v1.4.0` is the end-of-run publication, D25); `shiki` is not imported.
- `scripts/check-home.mjs`, `check-secondary.mjs`, `check-detail-tabs.mjs` — unchanged, re-run (R16). `src/lib/aiUsage.ts` keeps `emoji` then `label` adjacent (read by `check-home.mjs`).
- `dist/`, preview/dev server on port 4321.

## Tasks
### T1 — Colours inside the contract
- Files: `src/lib/contrast.ts` + `contrast.test.ts` (new: parse token values of both themes from `global.css`, composite, WCAG ratio), `src/lib/palette.test.ts` (new), `src/lib/projectStatus.ts` (`wip` → `TONE_CLASSES.amber`; `actif`, `archivé` unchanged) + `projectStatus.test.ts` (new), `src/components/SearchDialog.astro` (backdrop on the `bg` token, alpha ≥ 0.8, `backdrop-blur`; drop `outline-none` on the input), `src/scripts/search.ts` or `SearchDialog.astro` (`mark` → `accentSoft` / `accent`)
- Covers: R1, R2, R3, R4 (static), R14 (input)
- Acceptance: `npx vitest run` → 0 failed, the tests named in R1–R3 present; `npm run check` → `0 errors`
- Depends on: —

### T2 — Syntax highlighting from tokens
- Files: `src/lib/syntaxTheme.mjs` (new: a TextMate theme object whose every colour is `var(--color-<token>)` — foreground `body`, comments `muted`, the other scopes on `accent` and the five `tag<Tone>Ink` tokens) + `syntaxTheme.test.ts` (new, uses `contrast.ts`), `astro.config.mjs` (`shikiConfig.theme`, no more `themes`), `src/styles/global.css` (drop the `[data-theme='dark'] .astro-code` `--shiki-dark` block, keep `.astro-code` on `code`)
- Covers: R5
- Acceptance: `npx vitest run src/lib/syntaxTheme.test.ts` → both named tests pass; `npm run build` → the R5 `grep` → `0`, and `grep -c 'var(--color-' dist/blog/linux-commandes-essentielles/index.html` ≥ 1
- Depends on: T1

### T3 — Lists: surface hierarchy, live count, passing meta
- Files: `src/components/ArticleCard.astro`, `ProjectCard.astro`, `PromptCard.astro`, `SkillCard.astro` (root: `card-inner` instead of `rounded-card border border-line bg-surface`), the 4 `src/pages/*/index.astro` lists (one `.card` around featured + grid + empty; meta `<p>`: `aria-live="polite" aria-atomic="true"`, `text-muted` instead of `text-dim`), `src/components/Thumbnail.astro` (monogram `text-muted`), `src/lib/listPages.test.ts` (new), `scripts/check-finition.mjs` (new, dependency-free like `check-detail-tabs.mjs`: `live`, `lists`, `v2` lines; later lines reported missing until T4)
- Covers: R6, R7 (static), R8 (meta, monogram)
- Acceptance: `npm run build && node scripts/check-finition.mjs` → the `live`, `lists`, `v2` lines as in R6–R7; `node scripts/check-home.mjs` and `node scripts/check-secondary.mjs` → exit 0; `npx vitest run` → 0 failed
- Depends on: T1

### T4 — Carried leftovers
- Files: `src/components/DetailTabs.astro` (`data-pagefind-ignore` on the fallback heading), `src/styles/global.css` (remove the unlayered `[data-detail-tabs] [role="tabpanel"][hidden]` rule; add `:focus-visible` 2 px `accent` outline in `@layer base`), `src/pages/skills/[...slug].astro` (comment cites selectors, not line numbers), `src/components/TagChip.astro` + `src/pages/tags/index.astro` (`aria-label`), `src/components/Thumbnail.astro` + `home/FeaturedPost.astro` + `ArticleCard.astro` (`loading="eager"` on the two featured covers), `home/FeaturedPost.astro`, `home/LatestPosts.astro`, `home/AiTransparencyBanner.astro` (each marker a `whitespace-nowrap` element with `data-ai-marker`; banner text unchanged), `scripts/check-finition.mjs`
- Covers: R11, R12, R13 (static), R14, R15
- Acceptance: `npm run build && node scripts/check-finition.mjs` → all 7 lines (`live`, `lists`, `v2`, `fallback`, `eager`, `tags`, `ai-markers`), exit 0; `node scripts/check-detail-tabs.mjs` → 7 rows, exit 0; `node scripts/check-home.mjs` → 7 lines, exit 0
- Depends on: T3

### T5 — Rendered audit instrument
- Files: `scripts/audit-rendered.js` (new, classic browser script, no dependency: defines `window.__audit(doc)` returning `{ overflow, contrast[], offToken[], v2[] }` per the Measurement rules; token values read from probes with `var(--color-…)` in the audited document)
- Covers: tooling for R7–R10
- Acceptance: run by the orchestrator (implementers have no browser, D20) on a base build (`git archive 05ceeff` in a scratch dir, `node_modules` symlinked, `npm run build && npx astro preview --port 4322`): light `/skills/` reports the meta line at 4.19:1; dark `/projets/` reports a V2 jump (`rail` on `surface`); dark `/blog/linux-commandes-essentielles/` reports a comment below 4.5:1; the open dialog reports the backdrop off-token; each audited state of **S** returns within the page
- Depends on: —

### T6 — Rendered measurement pass
- Files: fixes only, in T1–T4 files
- Covers: R0, R4, R6–R10, R13, R14 (rendered), R16–R18
- Acceptance: run by the orchestrator on `npm run build && npx astro preview`, through same-origin iframes (D49) with `audit-rendered.js`: every state of **S**, both themes → 0 overflow, 0 contrast failure, 0 off-token colour, 0 V2 jump; R4, R6, R11, R13, R14 rendered steps as stated; R16–R18 commands as stated
- Depends on: T2, T4, T5

## Out of scope
- Retuning any contract token value (§2), a fifth pattern class, URL or content-model changes, an island framework (§9).
- Hover and pressed-state contrast; native UI the page does not paint; the home's derived-thumbnail fallback on `surface` — not rendered today (every home post has a cover) and caught by R7's check the day it would be.
- `scripts/check-detail-tabs.mjs` regex parsing of minified CSS; the `docs/anti-drift/` pointer to `docs/auto/` (frozen path).
- Version bump, tag, merge, push, deploy (one publication at the end of the run, D25).

## Fix tasks (verification attempt 1)
### F1 — Header focus rings on the accent
- Files: `src/components/Header.astro` (the three `focus-visible:outline-ink` → `focus-visible:outline-accent`, offset kept)
- Covers: R14 (failed at attempt 1: the 9 header controls computed an `ink` ring; only tabs may keep `ink`)
- Acceptance: `grep -c 'focus-visible:outline-ink' src/components/Header.astro` → `0`; rendered (orchestrator): Tab from the top of `/`, both themes → every header stop computes a solid ≥ 2 px `accent` outline, ≥ 3:1 on its composited background
- Depends on: —

### F2 — Empty state centred in the list frame
- Files: the 4 list pages and/or `src/scripts/list-pattern.ts`
- Covers: finding of attempt 1 — with no result, the zero-height grid still takes a `gap-6` slot, so the empty block sits 40 px below the frame top but 16 px above its bottom (`/projets/`, status `archivé`, 375)
- Acceptance: on each list with a filter that empties it, the grid is not rendered as a flex item (`display: none` or `hidden`) and the empty block's distance to the frame's top and bottom inner edges are equal (±1 px); with results again, the grid is back; no-JS rendering unchanged; `check-finition.mjs` exit 0
- Depends on: —
