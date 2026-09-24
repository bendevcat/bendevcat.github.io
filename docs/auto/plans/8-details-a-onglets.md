# Plan 8 — details-a-onglets

Brief: `docs/auto/brief.md` · Branch: `auto/plan-8-details-a-onglets` · Base: `19759e746edac44e5d6e7ce5ba3fbd97cf4d5602`

## Goal
From the home page, the user reaches any project, prompt or skill detail page (`/projets/<slug>`, `/prompts/<slug>`, `/skills/<slug>`) and sees the tabbed-detail pattern of contract §5.2: a tab row in which clicking a tab shows that tab's panel only and marks it active (active: `card` background + `line` border; inactive: transparent, `muted` text), in both light and dark themes, on every existing entry of the three collections; a tab appears only when existing content can feed it, and no content schema or CMS config changes

## Reachability
From `http://localhost:4321/`, the user reaches the feature by: header nav pill **Projets** / **Prompts** / **Skills** › click any card (`ProjectCard`, `PromptCard`, `SkillCard` link to `/<coll>/<id>/`) › the detail page.
This path exists today; the plan changes only the detail pages.

### Tab map (what existing content feeds each tab)
Measured at base. `body` = the entry's markdown body; "blank" = empty after trim. Order in the row = order below; the first tab is selected on load.

| Page | Tab | Shown when | Panel holds |
|---|---|---|---|
| projet | Aperçu | body not blank, or `cover` set | cover image, body |
| projet | Stack | `stack` not empty | one chip per tech (no roles: no data) |
| projet | Articles liés | ≥ 1 related post after `sortAndFilter` (drafts dropped) | links to posts |
| prompt | Pourquoi | body not blank | body |
| prompt | Infos | always (`format`, `tool` have defaults) | format, tool, model, tags, related skills |
| skill | Aperçu | body not blank | body |
| skill | Infos | always (`type` has a default) | type, name, version, tags, install command (with Copier), related prompts |

Stays above the tab row: breadcrumb, title, description; project status + start date + repo/demo links; skill repo link; the prompt block with its Copier button (fiche prompts). Fewer than 2 tabs → no tab row, the single panel renders bare (no current entry hits this).
Omitted, no data today: Variables, Sortie (prompt), Déclencheurs, Versions (skill), stack roles, numbered code block (no code fence in any entry), file tree and preview.

Expected rows (`site-bencat`'s only related post `bienvenue-dans-mon-foutoir` is `draft: true`):
```
projets/gha-svu: Aperçu | Stack | Articles liés
projets/site-bencat: Aperçu | Stack
prompts/bootstrap-session-anti-drift: Pourquoi | Infos
prompts/decouper-un-projet-en-plans-anti-drift: Pourquoi | Infos
prompts/macos-clone: Pourquoi | Infos
skills/anti-drift-planning: Aperçu | Infos
skills/superpowers: Aperçu | Infos
```
The bodies of `macos-clone` and `superpowers` are the literal text `No content`, kept on purpose by the user (plan 4 ledger); it is non-blank, so it feeds its tab.

## Criteria
| ID | Criterion | Measure | Guarantee |
|---|---|---|---|
| R0 | From the home page, the user reaches any project, prompt or skill detail page (`/projets/<slug>`, `/prompts/<slug>`, `/skills/<slug>`) and sees the tabbed-detail pattern of contract §5.2: a tab row in which clicking a tab shows that tab's panel only and marks it active (active: `card` background + `line` border; inactive: transparent, `muted` text), in both light and dark themes, on every existing entry of the three collections; a tab appears only when existing content can feed it, and no content schema or CMS config changes | reachability walkthrough on the running app: for each of the 7 smoke pages, reached from `/` via nav pill › card, click every tab in turn, in light then dark theme; R3–R5 hold at each step | no |
| R1 | Tab selection follows the Tab map rules | `npx vitest run src/lib/detailTabs.test.ts` → 0 failed, and these tests exist and pass: `projectTabs` › "omits Stack when the stack is empty", "omits Articles liés when no published related post remains", "omits Aperçu when the body is blank and there is no cover"; `promptTabs` › "omits Pourquoi when the body is blank", "always lists Infos"; `skillTabs` › "omits Aperçu when the body is blank", "always lists Infos"; `hasTabRow` › "is false below two tabs" | yes |
| R2 | Each real entry shows exactly its expected tabs, and no panel is empty | `npm run build && node scripts/check-detail-tabs.mjs` → prints exactly the 7 "Expected rows" above and exits 0. The script walks every `dist/{projets,prompts,skills}/<slug>/index.html` and exits 1 if a page has tab count ≠ panel count or a panel whose text (tags stripped, trimmed) is empty | no |
| R3 | Selection state is exclusive | `npx vitest run src/lib/detailTabs.test.ts` → 0 failed, including `computeTabState` › "selects exactly one tab and shows only its panel" (n tabs, index k → only k has `selected: true`, `tabIndex: 0`, `panelHidden: false`) | yes |
| R4 | Clicking a tab shows that panel only and marks it active | on each of the 7 pages, click each tab: exactly one `[role=tabpanel]` computes `display` ≠ `none` (the clicked tab's), and exactly one `[role=tab]` has `aria-selected="true"` (the clicked one) | no |
| R5 | Active and inactive tab look, both themes | theme set via `localStorage.theme` then reload (plan 7 trap). On `/projets/gha-svu`, `/prompts/macos-clone`, `/skills/superpowers`, light and dark: the selected tab's `background-color` equals a probe element's `background: var(--color-card)` and its `border-top-color` equals a probe `var(--color-line)`; every other tab computes `background-color: rgba(0, 0, 0, 0)`, `border-top-color: rgba(0, 0, 0, 0)` and `color` equal to a probe `var(--color-muted)`; after clicking another tab the values swap. Every tab computes `border-radius: 999px` and a `font-family` starting with `"Nebula Sans"` | no |
| R6 | No surface-level jump: the tab row sits on `surface` | dark theme, the 7 pages: the nearest ancestor of `[role=tablist]` with a non-transparent `background-color` equals a probe `var(--color-surface)` | no |
| R7 | Keyboard: roving tabindex, automatic activation | `npx vitest run src/lib/detailTabs.test.ts` → 0 failed, including `nextTabIndex` › "wraps ArrowRight from last to first and ArrowLeft from first to last", "maps Home and End to first and last", "returns null for other keys". Walkthrough on `/projets/gha-svu`: only the selected tab has `tabindex="0"`; with focus on it, ArrowRight / ArrowLeft / Home / End move focus **and** selection (panel follows); Tab from the selected tab focuses the visible panel | yes |
| R8 | ARIA wiring and load state are in the static HTML | `node scripts/check-detail-tabs.mjs` (after build) exits 1 unless, on every page: one `role="tablist"` with an `aria-label`; each `role="tab"` is a `<button>` whose `aria-controls` names an existing `role="tabpanel"` whose `aria-labelledby` names that tab; the first tab has `aria-selected="true"` and every other panel carries `hidden`; `<article>` keeps `data-pagefind-body` | no |
| R9 | Without JavaScript nothing is lost | `npm run build && npx astro preview`, JavaScript disabled in the browser, the 7 pages: `[role=tablist]` computes `display: none` and every `[role=tabpanel]` computes `display` ≠ `none` | no |
| R10 | Copy buttons still work, including inside a hidden-at-load panel | on `/prompts/bootstrap-session-anti-drift` and `/prompts/macos-clone`, the prompt block is above the tab row and its **Copier** turns to `Copié !`; on `/skills/superpowers`, select **Infos**, click **Copier** on the install command → label `Copié !` and `navigator.clipboard.readText()` returns `/plugin install superpowers@claude-plugins-official` | no |
| R11 | No content is dropped by the restructure | build base `19759e7` in a scratch copy (`git archive 19759e7 \| tar -x -C <scratch>/base`, symlink `node_modules`, `npm run build`). For each of the 7 pages: the sorted `href` list inside `<article>` is identical in base and branch, and every whitespace-separated word of the base `<article>` text occurs in the branch `<article>` text | no |
| R12 | 375 px, both themes | viewport 375 px, light and dark, the 7 pages, every tab selected in turn: `document.documentElement.scrollWidth <= innerWidth`, and every `[role=tab]` has `getBoundingClientRect().right <= innerWidth` | no |
| R13 | No fifth pattern class | `sed -n '/@layer components {/,/^}/p' src/styles/global.css \| grep -cE '^\s+\.[a-z-]+ \{'` → `4` | no |
| R14 | Frozen paths untouched | `git diff 19759e7 --stat -- src/content.config.ts src/content public/admin/config.yml docs/anti-drift .github/workflows` → empty output | no |
| R15 | Suite and types green; kept code kept | `npx vitest run` → 0 failed, test count > 144; `npm run check` → `0 errors`; `grep -c 'export function matchesFilters' src/lib/projectFilters.ts` → `1` | no |

## Shared resources
- `src/styles/global.css` — design tokens and the `@layer components` pattern layer (read, not extended; only the tab hidden / no-JS rules are added outside the layer).
- `src/layouts/BaseLayout.astro` — every page; its inline head script gains one line setting `document.documentElement.dataset.js`.
- `dist/` build output, dev/preview server on port 4321, browser clipboard permission.
- Version files: none — `package.json` version is not bumped; tag `v1.3.0` belongs to the user's closing ritual.

## Tasks
### T1 — Pure tab logic
- Files: `src/lib/detailTabs.ts`, `src/lib/detailTabs.test.ts`
- Covers: R1, R3, R7 (logic)
- Content: `projectTabs`, `promptTabs`, `skillTabs` (inputs: body text, cover flag, stack length, published related count → ordered `{ id, label }[]`), `hasTabRow`, `computeTabState(count, selected)`, `nextTabIndex(current, key, count)`. No imports from `astro:content`.
- Acceptance: `npx vitest run src/lib/detailTabs.test.ts` → all pass, including every test named in R1, R3, R7
- Depends on: —

### T2 — Resolve the pattern once, on `/projets/[slug]`
- Files: `src/components/DetailTabs.astro` (new: `.card` wrapper, `role=tablist` row of `<button role=tab>` in utilities — `rounded-pill border px-3 py-1.5 text-sm`, `aria-selected:bg-card aria-selected:border-line aria-selected:text-ink`, otherwise `border-transparent bg-transparent text-muted`, focus ring `outline-ink` — and panel wrappers; ids prefixed `tab-` / `tabpanel-` so they never collide with heading slugs), `src/scripts/detail-tabs.ts` (new: click + keydown glue calling T1, no rule of its own), `src/styles/global.css` (`[role=tabpanel][hidden]` forced `display:none`; `html:not([data-js])` hides the tablist and shows every panel), `src/layouts/BaseLayout.astro` (inline script sets `data-js`), `src/pages/projets/[...slug].astro`, `scripts/check-detail-tabs.mjs` (new)
- Covers: R2, R4, R5, R6, R8, R9, R13 on projects
- Acceptance: `npm run build && node scripts/check-detail-tabs.mjs` → first 2 lines are the two `projets/` expected rows, exit 0; `npm run check` → `0 errors`
- Depends on: T1

### T3 — Replicate on `/prompts/[slug]` and `/skills/[slug]`
- Files: `src/pages/prompts/[...slug].astro`, `src/pages/skills/[...slug].astro`
- Covers: R2, R8, R10 on prompts and skills; R0
- Rule: if replication needs a change to `DetailTabs.astro` or `detail-tabs.ts`, make it there (T2's files), never a page-local variant.
- Acceptance: `npm run build && node scripts/check-detail-tabs.mjs` → exactly the 7 expected rows, exit 0; `npx vitest run` → 0 failed
- Depends on: T2

### T4 — Rendered measurement pass
- Files: fixes only, in T2/T3 files
- Covers: R0, R4, R5, R6, R7 (walkthrough), R9, R10, R11, R12, R14, R15
- Acceptance: every measure of R4–R7, R9–R12 run on `npx astro dev --background` (R9, R11 on build/preview) in both themes and at 375 px → all as stated; `git diff 19759e7 --stat -- src/content.config.ts src/content public/admin/config.yml docs/anti-drift .github/workflows` → empty
- Depends on: T3

## Out of scope
- Prompt tabs Variables and Sortie, skill tabs Déclencheurs and Versions, stack roles, numbered code block, skill file tree and coloured preview — no existing content feeds them (cadrage decision "pattern first").
- Any change to `src/content/**` — including replacing the `No content` bodies — to `src/content.config.ts`, `public/admin/config.yml`, `docs/anti-drift/**`, `.github/workflows/**`.
- A fifth pattern class, and refactoring the header nav pills (`Header.astro` is not touched).
- Tab state in the URL (hash / query) and deep links to a tab.
- Plan 9 items: V2 audit of pre-existing surface jumps, tag tones (E10), `/a-propos` (E11), `aria-live` on list meta lines, out-of-contract palettes.
- Version bump, tag, merge, push, deploy.

## Evidence
Verifier, attempt 1 (2026-09-24, HEAD `0c19970`). All criteria proven; guarantees R1, R3, R7 mutation-tested in a detached worktree (every mutation turned its named test red).

| ID | Verdict | Evidence |
|---|---|---|
| R0 | proven | Dev server; from `/` via nav pill › card to all 7 pages; every tab clicked in light and dark; R3–R5 held at every step (`errs: []` on 14 page×theme runs); rows as expected; dev logs only `[200]`, no console error |
| R1 | proven | `detailTabs.test.ts` 24 passed, the 8 named tests present; 8 mutations (Stack / Articles liés / Aperçu / Pourquoi always pushed, Infos removed ×2, `hasTabRow >= 1`) each turned its test red |
| R2 | proven | `npm run build && node scripts/check-detail-tabs.mjs` → the 7 expected rows, exit 0; checker exits 1 on a removed `hidden`, an emptied panel, a broken `aria-labelledby` |
| R3 | proven | `computeTabState` test passes; 3 mutations (`i===active \|\| i===0`, `panelHidden:false`, `tabIndex:0`) each red |
| R4 | proven | 7 pages × 2 themes, each tab clicked: exactly 1 visible panel (the clicked one), exactly 1 `aria-selected="true"` |
| R5 | proven | Transitions neutralised, probes compared. Dark: active bg `rgb(24,29,36)`=card, border `rgba(255,255,255,0.08)`=line; inactive transparent, `rgb(154,166,180)`=muted. Light: active `rgb(255,255,255)`=card, `rgba(16,24,34,0.11)`=line; inactive transparent, `rgb(84,97,111)`=muted. Values swap on click; radius 999px; font `"Nebula Sans"`; all 7 pages |
| R6 | proven | Dark, 7 pages: nearest painted ancestor of the tablist is `.card`, bg `rgb(18,22,27)` = surface |
| R7 | proven | 3 named tests pass; mutations (no wrap, Home/End removed or off by one, default returns `current`) each red. Real keys on `/projets/gha-svu`: ArrowRight/End/wrap/ArrowLeft/Home move focus + selection + panel; Tab → focused panel; only the selected tab has `tabindex="0"` |
| R8 | proven | Checker exits 0 on the real build; exits 1 when `data-pagefind-body` is removed; covers tablist `aria-label`, `<button>` tabs, `aria-controls` ↔ `aria-labelledby`, first tab selected, `hidden` on others |
| R9 | proven | `astro preview`, iframe `sandbox="allow-same-origin"` (`dataJs: false`): 7 pages, tablist `none`, every panel `block`, fallback headings shown; control with JS: tablist `flex`, other panels `none` |
| R10 | proven | Prompt Copier above the tablist on bootstrap and macos-clone → `Copié !`, `writeText` received the prompt (10579 / 2424 chars); superpowers Infos (hidden at load) Copier → `Copié !`, `writeText` = `/plugin install superpowers@claude-plugins-official` (`readText` denied by the browser) |
| R11 | proven | Base `19759e7` built in scratch; 7 pages: sorted `<article>` hrefs identical (6, 4, 4, 11, 0, 9, 2), 0 base words missing |
| R12 | proven | 375 px iframe, both themes, 7 pages, every tab: `scrollWidth` 375 = `innerWidth`; rightmost tab edge ≤ 291.5; pane at 375×812 cross-check on superpowers Infos |
| R13 | proven | Plan command → `4` |
| R14 | proven | Frozen-paths diff → empty |
| R15 | proven | `npx vitest run` 168 passed (> 144); `npm run check` 0 errors; `matchesFilters` count `1` |

Findings outside the criteria (none blocking): (1) the unlayered `[data-detail-tabs] [role="tabpanel"][hidden]{display:none!important}` duplicates the preflight rule; (2) the no-JS fallback headings (`// aperçu`…) sit inside `<article data-pagefind-body>`, so Pagefind indexes them; (3) small spacing changes (project links `mt-8` → `mt-6`) and D7's move of header chips into Infos; (4) the CSS-layer check in `check-detail-tabs.mjs` parses minified output with a regex; (5) a comment in `src/pages/skills/[...slug].astro` cites `global.css` line numbers written before this plan.
