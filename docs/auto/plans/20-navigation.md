# Plan 20 — navigation

Brief: `docs/auto/brief.md` · Branch: `auto/plan-20-navigation` · Base: `a5926042e772062244572beee99a0a4f65f3d017`

## Goal
In `/admin`, the author sees the title `benCat · Studio` and the site's logo; each collection has its icon (Articles `article`, Projets `rocket_launch`, Prompts `terminal`, Skills `extension`); list rows show a summary (articles: title · date · category + 📝 when draft, ⭐ when featured; projects: title · status + ⭐; prompts: title · format · tool + version + 📝; skills: title · version · licence + 📝); cover thumbnails on articles and projects only; default sort pubDate ↓ / startDate ↓ / updated ↓ / title; preset filters (Brouillons, Publiés everywhere; articles: Mis en avant, Sans couverture, IA partielle, IA totale; projects: one per status; prompts: Fiches, Guides) each showing exactly the matching entries; groups (articles by year and by category, projects by status, prompts by tool); every entry has a working "view on site" link to its `/blog/`, `/projets/`, `/prompts/`, `/skills/` page. Tests tie filter values to the Zod enums, `preview_path`s to real routes, and summary fields to existing fields

## Reachability
Agent path (dev): `npx astro dev --background` (another worktree may hold 4321: use the port it prints) › `http://localhost:4321/admin/?test-repo` › « Work with Test Repository » › the board: header logo, collection sidebar with icons, tab title › a collection › list rows (summaries, thumbnails), toolbar « Sort » / « Filter » / « Group » › an entry › toolbar « View on Live Site » (fr UI: « Afficher sur le site en ligne »), which opens `<origin>/<route>/<slug>` in a new tab. Author path: the same screens after the GitHub sign-in (production) or « Work with Local Repository » (dev). Before sign-in: `/admin/` entrance page (dev and `npm run build && npx astro preview`) shows the title and logo. Every screen exists at base (plan 19); this plan only configures it (`public/admin/config.yml`) and adds the logo file.

### Built facts (measured at base `a592604`, `node_modules/@sveltia/cms` 0.221.0: `schema/sveltia-cms.json` + sources embedded in `npm/index.js.map`)
- Keys exist in the shipped schema: `app_title`, `logo.{src,show_in_header}`, `site_url`; collection `icon`, `summary`, `thumbnail` (string | bool | string[]), `sortable_fields: {fields, default: {field, direction: ascending|descending}}`, `view_filters` / `view_groups` (array or `{filters|groups, default}`; items `name`, `label`, `field`, `pattern`, `eq`, `ne`, `in`, `not_in`, `lt…gte`, `empty`), `preview_path`. `EntryCollection` and `CmsConfig` are `additionalProperties: false`: ajv 8.20.0 (already in the tree via `@astrojs/check`) validates today's config and rejects a misspelt key.
- **A filter, group or sortable field naming a field the collection does not declare is a config error** (`invalid_view_filter_field`, parser `views.js`, `addMessage` default type `error`). Projects have no `draft` field (Zod or CMS), so « Brouillons / Publiés everywhere » is read as *every collection that has a `draft` field*: articles, prompts, skills — consistent with the goal's project summary, which has no 📝. Decision candidate 1.
- `ne` matches an entry without the field (so `draft ne true` = published, `draft` key absent included); `empty: true` matches a missing key, `null`, `''`, `[]`.
- Summary template: `{{field}}` shows a select's **label** (prompt `format` → « Fiche — prompt copiable + notes »); `date('…')` and `ternary('a','b')` read the raw value; a missing key yields `''` **before** any transformation (so `default()` never fires on a missing key, and `ternary` on a missing key gives `''`). The result goes through inline Markdown + sanitising.
- Grouping with `pattern` groups by the first regex match (`'^\d{4}'` on `pubDate` → the year); without pattern, by the raw value; groups are reversed when the list is sorted descending on the same field.
- Thumbnails default to auto-detected image fields; `thumbnail: false` disables them.
- `site_url` unset → `window.location.origin` (the npm build has `DEV` compiled to `false`): links go to `localhost:<port>` in dev and `https://bendevcat.github.io` in production, where `/admin/` is served. Setting `site_url` would send dev links to production. Decision candidate 3.
- The « View on Live Site » control pings its URL (liveness) and stays enabled whatever the answer.
- **Drafts have no page** (every detail route's `getStaticPaths` filters `draft: true`): the one draft (`bienvenue-dans-mon-foutoir`) gets a link to the URL its page will have once published, which answers 404 until then. « Working » is measured on the 12 published entries; the draft's link target is measured separately (R18). Decision candidate 2.
- Content at base (13 entries): articles 6 (1 draft, 0 featured, 0 without cover, aiUsage partial 1 / full 3 / none 2, categories Actus 1 · DevOps 2 · Outils 3, all pubDate in 2025); projects 2 (actif `gha-svu`, wip `site-bencat` ⭐, no cover); prompts 3 (fiche 2, guide 1; tool Claude 1, Claude Code 2; none has `version`, `updated` or `draft: true`); skills 2 (versions `0.4.0`, `6.4.1`, licence MIT, no draft).
- Material Symbols Outlined ships in full inside the npm build (`npm/assets/material-symbols-outlined-latin-wght-normal-*.woff2`, 753 kB).
- The site's logo tile (`src/components/Header.astro`): 28×28, radius 9 (`--radius-badge`), `accentSoft` ground, three `accent` bars 3 px high, inner width 14 (padding 7), widths 100/60/82 %, opacities 1/.7/.45, gap 3. Tokens (`src/styles/global.css`): light `--color-accent #0B6B4C`, `--color-accentSoft rgba(11,107,76,.10)`; dark `#4ADE80`, `rgba(74,222,128,.12)`.

### Config written by this plan (per collection)
| | icon | summary | thumbnail | sort default | filters (label → condition) | groups |
|---|---|---|---|---|---|---|
| blog | `article` | `{{title}} · {{pubDate \| date('YYYY-MM-DD')}} · {{category}}{{draft \| ternary(' 📝','')}}{{featured \| ternary(' ⭐','')}}` | `cover` | `pubDate` descending (fields `pubDate`, `updatedDate`, `title`) | Brouillons → `draft eq true`; Publiés → `draft ne true`; Mis en avant → `featured eq true`; Sans couverture → `cover empty true`; IA partielle → `aiUsage eq partial`; IA totale → `aiUsage eq full` | Année → `pubDate` pattern `^\d{4}`; Catégorie → `category` |
| projects | `rocket_launch` | `{{title}} · {{status}}{{featured \| ternary(' ⭐','')}}` | `cover` | `startDate` descending (`startDate`, `title`) | actif / wip / archivé → `status eq <value>` (one per `PROJECT_STATUSES`, labels as the site's status badges) | Statut → `status` |
| prompts | `terminal` | `{{title}} · {{format}} · {{tool}}{{version \| ternary(' v','')}}{{version}}{{draft \| ternary(' 📝','')}}` | `false` | `updated` descending (`updated`, `title`) | Brouillons; Publiés; Fiches → `format eq fiche`; Guides → `format eq guide` | Outil → `tool` |
| skills | `extension` | `{{title}}{{version \| ternary(' · v','')}}{{version}}{{license \| ternary(' · ','')}}{{license}}{{draft \| ternary(' 📝','')}}` | `false` | `title` ascending (`title`) | Brouillons; Publiés | — |

`preview_path`: `/blog/{{slug}}`, `/projets/{{slug}}`, `/prompts/{{slug}}`, `/skills/{{slug}}`. Global: `app_title: benCat · Studio`, `logo: { src: /admin/logo.svg, show_in_header: true }`, no `site_url`. Filters and groups use the array form, each with a unique `name`; no default filter or group.

### Instrument `scripts/check-admin.mjs` — two lines appended (the 6 lines of plan 19 unchanged)
```
logo: dist/admin/logo.svg = public/admin/logo.svg · config logo.src /admin/logo.svg
view on site: <P>/<P> published entries built at their preview_path · <D> draft(s) without page
```
`<P>`, `<D>` counted on disk from `src/content/<folder>/*/index.md` (`draft: true` or not) — no pinned count (plan 19 F2 lesson); routes read from each collection's `preview_path` in `public/admin/config.yml` (`{{slug}}` → folder name, file `dist/<path>/index.html`). Exit 1 if a published entry has no page, a draft has one, or the logo line differs.

## Criteria
| ID | Criterion | Measure | Guarantee |
|---|---|---|---|
| R0 | In `/admin`, the author sees the title `benCat · Studio` and the site's logo; each collection has its icon (Articles `article`, Projets `rocket_launch`, Prompts `terminal`, Skills `extension`); list rows show a summary (articles: title · date · category + 📝 when draft, ⭐ when featured; projects: title · status + ⭐; prompts: title · format · tool + version + 📝; skills: title · version · licence + 📝); cover thumbnails on articles and projects only; default sort pubDate ↓ / startDate ↓ / updated ↓ / title; preset filters (Brouillons, Publiés everywhere; articles: Mis en avant, Sans couverture, IA partielle, IA totale; projects: one per status; prompts: Fiches, Guides) each showing exactly the matching entries; groups (articles by year and by category, projects by status, prompts by tool); every entry has a working "view on site" link to its `/blog/`, `/projets/`, `/prompts/`, `/skills/` page. Tests tie filter values to the Zod enums, `preview_path`s to real routes, and summary fields to existing fields | reachability walkthrough in dev (`?test-repo`) and on the entrance page of the preview build; R1–R20 hold | no |
| R1 | The config is valid for Sveltia 0.221.0 | `npx vitest run src/lib/cms-navigation.test.ts` → « valide config.yml contre le schéma JSON livré par @sveltia/cms » passes (ajv, `strict: false`, schema read from `node_modules/@sveltia/cms/schema/sveltia-cms.json`); red when any key is misspelt (e.g. `view_filtrs`) | yes |
| R2 | Title and logo configured | same file → « titre benCat · Studio, logo /admin/logo.svg affiché dans l’en-tête » (config `app_title`, `logo.src`, `logo.show_in_header: true`, `public/admin/logo.svg` exists, `src/pages/admin/index.astro` `<title>benCat · Studio</title>`) and « le logo reprend la tuile 28×28 de l’en-tête aux couleurs accent/accentSoft des deux thèmes » (viewBox `0 0 28 28`, `rx="9"`, 3 bars height 3 with opacities 1/.7/.45, light and dark colours equal to the `--color-accent` / `--color-accentSoft` values read from `global.css`) pass | yes |
| R3 | Title and logo on screen | dev `/admin/` and preview `/admin/`: entrance `<h1>` text `benCat · Studio`, an `<img>` with `src` ending `/admin/logo.svg` and `naturalWidth > 0`; `/admin/?test-repo` board: header button « Visit Live Site » holds that `<img>` loaded; `document.title` ends with `benCat · Studio`; `link[rel~=icon]` `href` ends with `/admin/logo.svg` | no |
| R4 | Icons configured | same file → « une icône Material Symbols par collection : article, rocket_launch, terminal, extension » passes | yes |
| R5 | Icons on screen | board sidebar: each collection item holds an icon element whose text is its configured name, and `document.fonts.check('24px "Material Symbols Outlined"')` → `true` (glyphs drawn, not words) | no |
| R6 | Summaries tied to fields | same file → « chaque résumé ne cite que des champs de sa collection, présents dans le schéma Zod » (every `{{key}}` of every `summary` ∈ the collection's CMS fields ∩ Zod keys; transformations ⊂ {`date`, `ternary`}; `date` only on `datetime` fields; the ⭐ `ternary` on `featured`, the 📝 on `draft`) and « écrit les quatre résumés du tableau du plan » (exact templates of the table above) pass; red when a summary cites `categorie` | yes |
| R7 | Summaries on screen | `?test-repo`, list view, browser time zone Europe/Paris: rows read exactly — articles `Comment j'utilise GitHub Actions au quotidien · 2025-10-28 · DevOps`, `Commandes Linux : du basique au one-liner surpuissant · 2025-10-26 · DevOps`, `Les 5 meilleurs VPN en 2025 : comparatif complet et benchmarks · 2025-10-26 · Outils`, `Docker et Kubernetes : Guide complet du DevOps moderne · 2025-10-20 · Outils`, `k9s : Gérez vos clusters Kubernetes like a boss · 2025-10-20 · Outils`, `Bienvenue dans mon foutoir ! 🚀 · 2025-10-20 · Actus 📝`; projects `bencat_ — ce site · wip ⭐`, `gha-svu — le versionnage sémantique dans GitHub Actions · actif`; prompts `MacOS Clone · Fiche — prompt copiable + notes · Claude`, `Prompt de bootstrap d'une session d'exécution anti-drift · Fiche — prompt copiable + notes · Claude Code`, `Découper un projet multi-sessions en plans anti-drift · Guide — write-up long · Claude Code`; skills `Anti-Drift Planning · v0.4.0 · MIT`, `SuperPowers · v6.4.1 · MIT`. Then set `featured` on k9s and save → its row ends `· Outils ⭐` | no |
| R8 | Thumbnails configured | same file → « vignettes : cover pour articles et projets, aucune pour prompts et skills » (`thumbnail: cover` on blog and projects, where `cover` is an `image` field; `thumbnail: false` on prompts and skills) passes | yes |
| R9 | Thumbnails on screen | `?test-repo`: the 6 article rows each hold an `<img>` with `naturalWidth > 0`; prompts and skills lists hold 0 `<img>` in their rows; on `gha-svu`, upload any PNG as cover and save → its row holds a loaded `<img>`, `site-bencat`'s row none | no |
| R10 | Default sort configured | same file → « tri par défaut : pubDate ↓, startDate ↓, updated ↓, title ↑ » (`sortable_fields.default` = `{pubDate, descending}`, `{startDate, descending}`, `{updated, descending}`, `{title, ascending}`; every sortable field ∈ the collection's fields) passes | yes |
| R11 | Default sort on screen | fresh browser profile (no saved view), `?test-repo`: article rows in the R7 order (Docker and k9s, same instant, in either order); projects `bencat_ — ce site` then `gha-svu …`; skills `Anti-Drift Planning` then `SuperPowers`; the Sort menu of prompts shows `updated` (« Date de mise à jour ») descending selected | no |
| R12 | Filters tied to the Zod enums | same file → « filtres Brouillons / Publiés sur chaque collection qui a un champ draft » (blog, prompts, skills: `draft eq true` and `draft ne true`; projects: none, since `draft` ∉ its Zod keys), « un filtre par statut de PROJECT_STATUSES », « Fiches et Guides couvrent PROMPT_FORMATS », « filtres IA partielle / IA totale pris dans l’enum aiUsage du schéma », « Mis en avant et Sans couverture visent featured et cover » and « chaque filtre et chaque groupe désigne un champ de sa collection » pass; red when a status is added to `PROJECT_STATUSES` without its filter, or a filter value is misspelt (`archive`) | yes |
| R13 | Each filter shows exactly its entries | `?test-repo`, each filter applied alone, rows listed: articles Brouillons = {bienvenue}, Publiés = the other 5, Mis en avant = ∅, Sans couverture = ∅, IA partielle = {k9s}, IA totale = {docker, linux, vpn}; projects actif = {gha-svu}, wip = {site-bencat}, archivé = ∅; prompts Brouillons = ∅, Publiés = all 3, Fiches = {bootstrap, macos-clone}, Guides = {decouper}; skills Brouillons = ∅, Publiés = both. Then, one edit each (saved in the test board): `featured` on k9s → Mis en avant = {k9s}; cover removed from k9s → Sans couverture = {k9s}; `gha-svu` status archivé → archivé = {gha-svu}; `draft` on macos-clone → prompts Brouillons = {macos-clone}, Publiés loses it; `draft` on superpowers → skills Brouillons = {superpowers} | no |
| R14 | Groups configured | same file → « groupes : articles par année et par catégorie, projets par statut, prompts par outil » and « le motif Année extrait l’année de chaque pubDate du contenu » (`^\d{4}` matched against every article's `pubDate` on disk gives its 4-digit year) pass | yes |
| R15 | Groups on screen | `?test-repo`: articles by Année → one heading `2025` (6 rows); by Catégorie → `Actus` 1, `DevOps` 2, `Outils` 3; projects by Statut → `actif` 1, `wip` 1; prompts by Outil → `Claude` 1, `Claude Code` 2 | no |
| R16 | `preview_path` tied to real routes | same file → « preview_path mène à la route réelle de chaque collection » (`/blog/{{slug}}`, `/projets/{{slug}}`, `/prompts/{{slug}}`, `/skills/{{slug}}`; `src/pages/<route>/[...slug].astro` exists and its `getStaticPaths` returns `params: { slug: <entry>.id }`) passes; red when a path reads `/projects/{{slug}}` | yes |
| R17 | Every published entry is built where its link points | `npm run build && node scripts/check-admin.mjs` → the 6 plan-19 lines then `logo: …` and `view on site: 12/12 published entries built at their preview_path · 1 draft(s) without page`, exit 0; exit 1 when a `preview_path` is broken (e.g. `/projects/{{slug}}`) or `dist/admin/logo.svg` differs | yes (check-admin) |
| R18 | « View on Live Site » works | `?test-repo`, for each of the 13 entries: the control is present and enabled; for the 12 published ones the opened tab is `http://localhost:<port>/<route>/<slug>` answering 200 whose `<h1>` text equals the entry's title; for the draft `bienvenue-dans-mon-foutoir` the target is `http://localhost:<port>/blog/bienvenue-dans-mon-foutoir` (404 until published — the site's draft rule) | no |
| R19 | Clean load | during R3–R18: no Sveltia config error or warning (no error screen, no console message from the config parser), 0 console error, 0 request answered ≥ 400 except the draft's liveness ping of R18 | no |
| R20 | Nothing else moves | `npx vitest run` → 0 failed, > 423 tests; `npm run check` → `0 errors`; after build, the 51 site pages' HTML identical to a base build (hash-normalised); every other `scripts/check-*.mjs` prints its base lines; `git diff a592604 --stat -- src/content src/content.config.ts src/components src/layouts src/styles src/admin .github/workflows docs/anti-drift` → empty; README: `grep -c 'benCat · Studio' README.md` ≥ 1 and the new « Tableau de bord » section names the filters, the groups and the draft link behaviour | no |

## Shared resources
- `public/admin/config.yml` — T2 then T3 then T4 (sequential edits).
- `src/lib/cms-navigation.test.ts` (new) — T1 creates, T2–T4 append (sequential).
- `package.json`, `package-lock.json` — T1 only (`ajv` exact devDependency, version already in the lock).
- `scripts/check-admin.mjs` — T2 (logo line), T4 (view-on-site line).
- Design tokens `src/styles/global.css` — read only (logo colours).
- `dist/`, port 4321 (may be held by another worktree), a base build in a scratch worktree at `a592604` (R20), the browser's OPFS `sveltia-cms-test` (reset by each `?test-repo` load; R13 edits vanish on reload) and saved view settings (use a fresh profile for R11). No version bump.

## Tasks
### T1 — Schema guard
- Files: `package.json`, `package-lock.json` (`npm install --save-dev --save-exact ajv@8.20.0`), `src/lib/cms-navigation.test.ts` (new: loads the YAML and the shipped schema; R1 test)
- Covers: R1
- Acceptance: `npx vitest run src/lib/cms-navigation.test.ts` → 1 passed; with `view_filtrs: []` added to a scratch copy of the config → red; `npm ls ajv --depth=0` → `ajv@8.20.0`
- Depends on: —

### T2 — Title and logo
- Files: `public/admin/logo.svg` (new, per Built facts: tile + 3 bars, `<style>` with `prefers-color-scheme: dark`, no text, no other shape), `public/admin/config.yml` (`app_title`, `logo`), `src/pages/admin/index.astro` (`<title>`), `src/lib/cms-navigation.test.ts` (R2), `scripts/check-admin.mjs` (logo line, header doc comment)
- Covers: R2, R17 (logo line); rendered R3 by the verifier
- Acceptance: R2 tests pass; `npm run build && node scripts/check-admin.mjs` → the 6 base lines + `logo: dist/admin/logo.svg = public/admin/logo.svg · config logo.src /admin/logo.svg`, exit 0; `npx vitest run src/lib/cms-config.test.ts` → 0 failed
- Depends on: T1

### T3 — Lists: icons, summaries, thumbnails, sort, filters, groups
- Files: `public/admin/config.yml` (per the table; the old `sortable_fields` arrays replaced; a comment per block citing R-ids and the projects/draft reading), `src/lib/cms-navigation.test.ts` (R4, R6, R8, R10, R12, R14 — enums imported from `src/content.config.ts`, Zod keys read like `schemaFieldNames` in `cms-config.test.ts`, content frontmatter read from disk for R14)
- Covers: R4, R6, R8, R10, R12, R14; rendered R5, R7, R9, R11, R13, R15 by the verifier
- Acceptance: all tests of the file pass, R1 included; each named red case of R6, R12 turns its test red; `npx vitest run src/lib/cms-config.test.ts` → 0 failed
- Depends on: T2

### T4 — « View on site » paths and build check
- Files: `public/admin/config.yml` (`preview_path` ×4), `src/lib/cms-navigation.test.ts` (R16), `scripts/check-admin.mjs` (view-on-site line)
- Covers: R16, R17; rendered R18 by the verifier
- Acceptance: R16 test passes and is red with `/projects/{{slug}}`; `npm run build && node scripts/check-admin.mjs` → 8 lines, the last `view on site: 12/12 published entries built at their preview_path · 1 draft(s) without page`, exit 0, and exit 1 on a scratch config with `/projects/{{slug}}`
- Depends on: T3

### T5 — README and no-regression pass
- Files: `README.md` (« Édition du contenu (Sveltia CMS) »: new « Tableau de bord » subsection — title/logo (`public/admin/logo.svg` derived from the header tile), icons, what each summary shows (📝 draft, ⭐ featured), filters and groups, default sorts, « Afficher sur le site en ligne » and why a draft's link is a 404 until published; `cms-navigation.test.ts` named)
- Covers: R20 (static)
- Acceptance: `npx vitest run` → 0 failed, > 423; `npm run check` → `0 errors`; build + every `scripts/check-*.mjs` → base lines (check-admin: 8 lines); 51 site pages identical to a base build; R20 `git diff --stat` → empty; README greps
- Depends on: T4

## Out of scope
- A `draft` field on projects (schema and site change) — the Brouillons/Publiés pair stays on the three collections that have one.
- Pages for drafts (in dev or production) and hiding the link for drafts.
- `site_url` / `display_url`; editorial workflow; saved default filter or group.
- Preview templates and the `code` widget (plan 21); defaults, date hook, commit messages, WebP, ✏️ button (plan 22); editor blocks (plan 23).
- Any change to `src/content/**`, `src/content.config.ts`, the site's pages or components; version bump, tag, merge, push.

## Evidence
### Verification attempt 1 (tip `452653a`, base `a592604`) — 20/21 proven, R19 failed
| Criterion | Verdict | Evidence |
|---|---|---|
| R0 | proven | dev `/admin/?test-repo` (port 4322): board → 4 collections → rows, Sort/Filter/Group, entry, « Afficher sur le site en ligne »; preview entrance on :4391; no 5xx; (R19 fails as worded) |
| R1 | proven | 17 passed; red on `view_filtrs: []` (skills) and on `sumary` (projects) |
| R2 | proven | both tests pass; red on `app_title` change, `show_in_header: false`, `<title>` reverted, dark bar `#4ADE81`, opacity `.5`, `rx="8"`, accent changed in `global.css` |
| R3 | proven | dev + preview `/admin/`: `<h1>` « benCat · Studio », `img[src=/admin/logo.svg]` naturalWidth 28, favicon `/admin/logo.svg`; board header button holds `img.logo`; `document.title` « Collection Articles – benCat · Studio » |
| R4 | proven | test passes; red on `rocket` |
| R5 | proven (instrument deviates) | sidebar icon texts `article`, `rocket_launch`, `terminal`, `extension` in « Material Symbols Outlined », 24×24 glyph boxes, glyphs drawn (screenshot); `document.fonts.check(…)` returns false because Sveltia also declares an inline CDN `@font-face` that is never loaded — the bundled face is loaded |
| R6 | proven | 2 tests; red on `{{categorie}}` |
| R7 | proven | Europe/Paris; the 13 row texts match the plan exactly; after `featured` on k9s: `… · Outils ⭐` |
| R8 | proven | test; red on `thumbnail: cover` for prompts |
| R9 | proven | 6 article rows with a loaded `<img>`; none on prompts/skills; a cover attached to `gha-svu` shows on its row only |
| R10 | proven | test; red on `startDate` ascending and on an extra sortable field |
| R11 | proven | row orders as planned; Sort menus show the configured defaults selected |
| R12 | proven | 6 tests; red on `archive`, `"pause"` added to `PROJECT_STATUSES`, `"note"` added to `PROMPT_FORMATS`, Brouillons `eq: false`, `aiUsage eq: total`, group on `outil` |
| R13 | proven | every filter's rows match the plan (IA totale = linux, vpn, docker; Fiches = bootstrap, macos-clone; archivé = ∅), and follow saved edits |
| R14 | proven | 2 tests; red on `^\d{2}` |
| R15 | proven | Année `2025:6`; Catégorie `Actus:1, DevOps:2, Outils:3`; Statut `actif:1, wip:1`; Outil `Claude:1, Claude Code:2` |
| R16 | proven | test; red on `/projects/{{slug}}` and on a route keyed by title |
| R17 | proven | check-admin 8 lines exit 0; exit 1 on `/projects/{{slug}}` (10/12), changed logo, `.png` src, a page for the draft, a published page removed (11/12) |
| R18 | proven | 13 controls `aria-disabled="false"`; `window.open` targets `http://localhost:4322/<route>/<slug>`; 12 published → 200 with `<h1>` = title; draft → 404 « Page introuvable »; a real click loads `/skills/superpowers` |
| R19 | failed | (1) two config-parser warnings on every `?test-repo` load: `backend.repo` / `backend.branch` not in the `test-repo` schema — present at base (plan 19 `cms.ts` merges `{ backend: { name: 'test-repo' } }` into a config holding `repo`/`branch`); (2) dev log `[404] /screenshot-2025-10-26-at-….png` ×3, aborted, right after opening the draft — the preview iframe (base URL `/`) requests the body's relative images before Sveltia swaps them to blob URLs; not reproduced on a slower second open |
| R20 | proven | 440 passed; 0 errors; 51 site pages identical to base; 12 other checks identical; frozen diff empty; README greps; `ajv@8.20.0` |

Mutations: 28 planted defects (23 on the tests, 5 on check-admin), all red. Findings outside criteria: R5's `fonts.check` instrument cannot pass while Sveltia declares its CDN face; check-admin parses `config.yml` twice (harmless); `/admin/logo.svg` re-requested on re-renders (harmless, cached 200).

### F1 — Clean test-repo config (fix for R19 (1))
- Files: `src/admin/cms.ts`, `src/admin/dev/testRepo.ts` (+ its test), `src/lib/cms-config.test.ts` if the DEV-guard test's shape changes
- In test-repo mode only (still behind `import.meta.env.DEV` and dynamic import), build the config from `/admin/config.yml` itself — parsed with the `yaml` package — with `backend` replaced by `{ name: 'test-repo' }`, and call `CMS.init({ config, load_config_file: false })` (verify the exact option name/shape in the 0.221 npm source) so no `repo`/`branch` key reaches the test-repo schema. Production path unchanged (`CMS.init()`); check-admin `dev-only` line still 0/0.
- Covers: R19 (1)
- Acceptance: unit test on the config transform (backend = `{ name: 'test-repo' }` only, every other key identical to `config.yml`); `npx vitest run` 0 failed; build + check-admin 8 lines exit 0; the orchestrator walks `/admin/?test-repo` in a fresh tab → 0 console warning/error from the config parser
- Depends on: T5

### Verification attempt 2 (tip `7684655`) — 21/21 proven
| Criterion | Verdict | Evidence |
|---|---|---|
| R0 | proven | cold cache, fresh tabs on :4322 `/admin/?test-repo`: entrance `<h1>` « benCat · Studio », logo 28 px, one test-repo button → board → 4 collections → rows → Trier/Filtrer/Grouper → one entry per collection → « Afficher sur le site en ligne » → `/skills/anti-drift-planning` loads; no 5xx |
| R1, R2, R4, R6, R8, R10, R12, R14, R16 | proven | tests re-run fresh (447 passed); attempt-1 mutations carried |
| R3 | proven | `document.title` « Collection Articles – benCat · Studio »; favicon `/admin/logo.svg`; header `img.logo` 28 px; entrance `<h1>` |
| R5 | proven (D136) | icon texts `article`, `rocket_launch`, `terminal`, `extension` drawn in Material Symbols Outlined, 24 px boxes |
| R7 | proven | the 13 rows read exactly as planned |
| R9 | proven | 6 article rows with a 512 px `<img>`; 0 on projects/prompts/skills (upload carried) |
| R11 | proven | default sorts checked in the 4 Sort menus; row orders as planned |
| R13 | proven | every filter alone gives the planned rows (blog, projects, prompts, skills) |
| R15 | proven | Année `2025:6`; Catégorie `Actus 1 · DevOps 2 · Outils 3`; Statut `actif 1 · wip 1`; Outil `Claude 1 · Claude Code 2` |
| R17 | proven | check-admin 8 lines exit 0; exit-1 mutations carried |
| R18 | proven | 5 re-walked (4 published → 200 with `<h1>` = title; draft → 404), 8 carried |
| R19 | proven (D136) | 3 fresh loads: no config-parser warning or error (`[debug] CMS configuration` only); `config.yml` fetched once; every request 200/304 except the draft's exempt liveness 404 |
| R20 | proven | 447 passed; 0 errors; 51 site pages identical to base; 12 other checks identical; frozen diff = F1's files only (D137); README greps |

F1 mutations: 7 planted defects (backend keeps `repo`, `load_config_file` dropped, placed beside `config`, plan-19 merge restored, key altered, config altered, non-200 accepted) each red; production `dist/_astro` byte-identical to base. Findings outside criteria: `src/admin/dev/testRepo.ts:89` seed-fetch `!res.ok` guard untested (plan-19 code); console warnings not from the config parser — iframe `allow-scripts` + `allow-same-origin` on each preview open and Svelte `derived_inert` ×3–9 per entry switch (plan 21 input); Sveltia rewrites `/admin/?test-repo` to `/admin/#/…`, so a reload takes the production path (dev convenience, plan 22 input).
