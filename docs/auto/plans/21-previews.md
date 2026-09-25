# Plan 21 — previews

Brief: `docs/auto/brief.md` · Branch: `auto/plan-21-previews` · Base: `9f61c41dd1b94cc5c9557bf5384521532bb040d8`

## Goal
For each of the 13 real entries, the `/admin` preview pane shows the **centre column of its real page** in the site's style, with the same text as the site (proven by tests over every entry): prompt → the always-dark prompt window (`# ` lines coloured, `{variables}` highlighted, bar `<id>.md · N l. · ~N tk`), its variables, its body; article → lead, cover, prose with code blocks coloured like the site, AI-transparency card; project → status/dates header, the numbered code window of `snippet`, stack tiles with roles, body; skill → install window, highlights, triggers, first file. Templates are pure functions `(data, h) => tree` in `src/admin/previews/` reusing `src/lib/`. `prompts.prompt`, `projects.snippet` and `skills.files[].excerpt` are edited with the `code` widget (monospace, coloured) and saving an unchanged entry rewrites its file byte for byte

## Reachability
Agent path (dev): `npx astro dev --background` (use the port it prints) › **fresh tab** `http://localhost:<port>/admin/?test-repo` (a reload drops `?test-repo`) › « Work with Test Repository » › a collection › an entry › the preview pane (right of the editor; toolbar « Show Preview » if hidden). Author path: the same screens after GitHub sign-in (production) or « Work with Local Repository » (dev). Every screen exists at base; this plan replaces what the preview pane renders and the editor of three fields.

### Built facts (measured at base `9f61c41`; Sveltia 0.221.0 sources from `npm/index.js.map`)
- **Template contract**: `CMS.registerPreviewTemplate(name, component)` requires `typeof component === 'function'`, keyed by collection name; rendered as `createElement(component, props)` in a React root on the iframe `<body>` → a function component or a `createClass` component both work. Props: `entry` (Immutable Map: `getIn(['data', field])`, `get('slug')`), `widgetFor`, `widgetsFor`, `getAsset(path) → { url, path, toBase64() }`, `getCollection`, `fieldsMetaData`, `document`, `window`. `h`: importing `@sveltia/cms` sets `window.h = window.createElement = React.createElement`, `window.createClass` (create-react-class), `window.rf = Fragment`; no `h` export, no hooks exposed.
- **Iframe**: `sandbox="allow-same-origin allow-scripts allow-popups allow-forms"` and `<base href="<origin>">` are Sveltia's (entry-preview-iframe.svelte) — the sandbox console warning cannot be removed by this plan. Registered preview styles (the site CSS, plan 19) stay injected.
- **D136 cause**: `getAsset(p).url` starts as `asset.blobURL ?? <relative path>` and switches to the blob URL asynchronously; any `<img src="./x.png">` inserted before that resolves against `<base href="<origin>">` → 404. `toBase64()` awaits the blob, after which a new `getAsset(p).url` is `blob:`.
- **Target pipeline runs in the browser** (spike, removed): an admin-only Vite 8.1.5 bundle of `createMarkdownProcessor` (`@astrojs/markdown-remark` 7.2.1, already a dependency; its `#import-plugin` has a `browser` export) + `rehype-slug` + `rehype-autolink-headings` + `syntaxTheme` builds with no node-builtin externals; run in headless Chromium on the k9s body: 29 `pre.astro-code`, 269 coloured spans, 12 `h2[id]` wrapped in `#` links, 103 ms, Shiki grammars lazy-loaded (`yaml`, `shellscript`). One runtime trap: an unguarded `process.env.ASTRO_PERFORMANCE_BENCHMARK` (ReferenceError in a browser) — needs `globalThis.process ??= { env: {} }` before the module is imported (or a `define`). The same options in Node give prose HTML **byte-identical** to `dist/blog/<slug>/index.html` for the 5 published articles (Shiki warns `promql`, `rego` unknown on `docker-kubernetes-devops`, as the site build does). **Plan picks the target, not the fallback.** Body images come out as `__ASTRO_IMAGE_` placeholders (no `src`).
- **Chunk-sharing trap**: importing `src/lib/promptWindow.ts` and `src/lib/article.ts` from `src/admin/` made Rollup share chunks with site scripts → `check-admin` isolation `8/52` and 8 site pages' HTML changed. A Vite `resolveId` plugin (enforce `pre`) that resolves every `src/lib/**` import made from `src/admin/**` (or from an already-suffixed module) to `<file>?admin` gives the admin its own copy: isolation `1/52`, every site page byte-identical to base (spike, reverted).
- `code` widget (0.221): options `default_language`, `allow_language_selection` (default `true`), `output_code_only` (default `false` → stores `{code, lang}`, a type change — forbidden), `keys`; allowed by the shipped JSON schema (`CodeField`, `additionalProperties: false`). The editor is Lexical: the value goes through `` ```lang\n<code>\n``` `` and back (`parseCodeBlock`); no stored value contains ```` ``` ````, a tab, CR, NBSP or trailing spaces. Values: 2 `prompt` (bootstrap `|` 130 lines, macos-clone `|-`), 2 `snippet` (`|`, `.yml` files), 20 `excerpt` (`|-`) in 6 entries.
- Sveltia's Save is disabled while the draft is unmodified (`toolbar.svelte`: `disabled={… || !modified}`): an unchanged entry cannot be saved, hence cannot be rewritten; a real edit rewrites the whole frontmatter (plan 19 R14: adds `featured: false`).
- Site page regions (hooks already in the built HTML): prompt `[data-prompt-window]`, `[data-prompt-variables]`, `[data-prompt-notes]`; article = the parent of `.prose` inside `article` minus its `nav`; project `[data-project-header]` minus `[data-project-back]`, `[data-project-meta] dl`, the Aperçu `.prose`, `[data-code-window]`, `ul[aria-label="Technologies"]` with its `[data-panel-label]`; skill `[data-install-window]`, `[data-skill-highlights]`, `[data-skill-triggers]`, `[data-explorer-preview]` not `hidden`, `[data-skill-notes]`. Dates in these regions are formatted in UTC (time-zone independent). Only `bienvenue-dans-mon-foutoir` (draft) has body images (3); the 6 articles have a cover.

### Design (binding)
- `src/admin/previews/<collection>.ts`: `(data, h) => tree`, pure, no `window`/`document`, data = plain object (`entry.getIn(['data']).toJS()` + `id` = slug, `body`, `bodyHtml`, `images` map path → resolved src or `null`). Each region carries the **same `data-*` hook as the page** and the same class strings (only classes the site already compiles — site CSS must not change). Order: prompt = window, variables (if `promptPageTabs` shows it), body prose (if it shows `décryptage`; a guide's body is the window); article = lead, cover, prose, AI card; project = header (title, description, `projectMetaRows`), body prose, code window, stack tiles; skill = install window, highlights, triggers, first file (`defaultFile`, the file the page opens on), body (« En détail »). Empty data → section omitted by the page's own rule. New entry without slug → bar `nouveau.md`.
- `src/admin/previews/register.ts`: one `window.createClass` component per collection holding `bodyHtml` and resolved images in state (latest body wins; images get a `src` only once it is `blob:`/`data:`/`http(s):`, via `getAsset` then `toBase64()`), calling the pure template with `window.h`.
- Body HTML = the site's pipeline with **one options object** (`src/lib/markdownOptions.mjs`) imported by both `astro.config.mjs` (`markdown:`) and the preview renderer; loaded by dynamic `import()` after the `process` guard.
- Light theme only (no `data-theme` in the iframe); the prompt, code, install and file windows are dark in both themes anyway.

## Criteria
| ID | Criterion | Measure | Guarantee |
|---|---|---|---|
| R0 | For each of the 13 real entries, the `/admin` preview pane shows the **centre column of its real page** in the site's style, with the same text as the site (proven by tests over every entry): prompt → the always-dark prompt window (`# ` lines coloured, `{variables}` highlighted, bar `<id>.md · N l. · ~N tk`), its variables, its body; article → lead, cover, prose with code blocks coloured like the site, AI-transparency card; project → status/dates header, the numbered code window of `snippet`, stack tiles with roles, body; skill → install window, highlights, triggers, first file. Templates are pure functions `(data, h) => tree` in `src/admin/previews/` reusing `src/lib/`. `prompts.prompt`, `projects.snippet` and `skills.files[].excerpt` are edited with the `code` widget (monospace, coloured) and saving an unchanged entry rewrites its file byte for byte | reachability walkthrough in dev (`?test-repo`) over the 13 entries; R1–R20 hold | no |
| R1 | One template per collection, registered before `init()` | `npx vitest run src/admin/previews/register.test.ts` → « enregistre un gabarit d’aperçu pour chaque collection de config.yml, avant init() » (fake CMS; names = `config.yml` collection names; `cms.ts` source calls the registration before `CMS.init`) and « rend le gabarit de la collection avec les données Immutable de l’entrée et window.h » pass; red when `skills` is not registered | yes |
| R2 | Templates are pure and emit valid React props | `npx vitest run src/admin/previews/templates.test.ts` → « chaque gabarit est une fonction pure (data, h) : même entrée, même arbre, sans window ni document » (node environment, called twice per real entry) and « produit des props React : className, htmlFor, style objet, key unique dans chaque liste » pass; red on a `class` prop or a list child without `key` | yes |
| R3 | Prompt text = the site's, every prompt on disk | `npx vitest run src/admin/previews/prompt.test.ts` → « fenêtre = measurePromptText, barre <id>.md · windowCounts, titres et variables de promptWindowLines » (code text exact, newlines kept; `[data-prompt-heading]` = exactly the lines `promptWindowLines` flags — the site's rule `#{2,6} `; `[data-var]` spans = its variable segments) and « variables et décryptage comme la fiche (promptPageTabs, PromptVariables) » pass; entries read from disk, no pinned value (D131) | yes |
| R4 | Article text = the site's, every article | `npx vitest run src/admin/previews/article.test.ts` → « chapô, couverture, prose et carte IA de chaque article » (lead = `description`; one `<img>` iff `cover`, `alt` = `coverAlt ?? ''`; prose = `bodyHtml`; `[data-ai-card]` = `AI_USAGE_META[aiUsage]` label, description, « ma règle sur l'IA → », absent without `aiUsage`) passes | yes |
| R5 | Project text = the site's, every project | `npx vitest run src/admin/previews/project.test.ts` → « en-tête statut/dates, prose, fenêtre de code numérotée et tuiles de stack » (`projectMetaRows` labels/values; gutter `1…N`; code = `codeWindowText(snippet)`, `[data-code-key]`/`[data-code-value]` per `codeWindowLines`; file chip = `snippetFile`; tiles = `stackTiles(stack, stackRoles)` names, roles, logo or monogram) passes | yes |
| R6 | Skill text = the site's, every skill | `npx vitest run src/admin/previews/skill.test.ts` → « installation, points, déclencheurs, premier fichier et corps » (`installation · toolLabel(type)`, steps = `installSteps`, note; « Ce que fait ce skill » + highlights; « Quand il se déclenche » + intro + « trigger »; file = `defaultFile`, `previewRange`, tones of `explorerLines`; « En détail » + `bodyHtml`) passes | yes |
| R7 | Bodies go through the site's own pipeline | `npx vitest run src/admin/previews/markdown.test.ts` → « astro.config.mjs et l’aperçu lisent le même objet d’options markdown » and « rend le corps de chaque entrée comme le pipeline du site » (every body on disk: `renderBody` = `createMarkdownProcessor(markdownOptions).render(body).code`, images aside) pass; red when the preview drops `rehype-autolink-headings` or uses `github-dark` | yes |
| R8 | Preview text = built page text | `npm run build && node scripts/check-previews.mjs` → `previews: blog <P>/<P> · projects <P>/<P> · prompts <P>/<P> · skills <P>/<P> published entries — centre-column text = page` and `drafts: <D> previewed without page`, counts from disk, exit 0 (region = the hooks of Built facts; text = text nodes minus `button`, `[hidden]`, `input`, `svg`, `script`; NBSP → space; whitespace collapsed; templates loaded through Vite SSR). Exit 1 on a template that drops one stack role, one prompt line or the AI card link | yes (check-previews) |
| R9 | The pane shows the templates, text = page | each of the 13 entries: the iframe `<body>` has exactly one element child, `[data-preview="<collection>"]` (Sveltia's field-label preview gone); for the 12 published, every region's text (R8 rules, read in the iframe) equals the same region of `fetch('/<route>/<slug>')` parsed with `DOMParser` | no |
| R10 | Site style | preview vs page (light theme, 1280 px), computed `color`, `background-color`, `font-family`, `font-size` equal on: `[data-prompt-window] pre`, first `[data-prompt-heading]`, first `[data-var]` (bg `rgba(74, 222, 128, 0.16)`), bar; `.prose p`, `.prose h2`, first `pre.astro-code`, `[data-ai-card]`; `[data-code-window] pre`, first `[data-code-key]`, first `[data-stack-tile]`; `[data-install-window]`, `[data-skill-highlights] h2`, first `[data-trigger]`'s `li`, first `[data-explorer-tone="heading"]` | no |
| R11 | Code blocks coloured like the site | k9s and docker previews: 0 element with class `github-dark`; `pre.astro-code` count = the page's; for the first 3 blocks the list of computed token-span colours equals the page's | no |
| R12 | Rendered bodies never carry a relative image | `npx vitest run src/admin/previews/images.test.ts` → « aucune <img> rendue n’a de src relative : blob:, data:, http(s): ou pas de src » (bienvenue body: 3 images; unresolved → no `src`; resolved → the given blob URL; cover likewise) passes; red when a placeholder keeps `./screenshot-….png` | yes |
| R13 | Images load without 404 | open each article (bienvenue first, cold): 0 request answered ≥ 400 except the draft's liveness ping of its `preview_path` (D134); bienvenue's 3 body `<img>` and every cover in the iframe have a `blob:` `src` and `naturalWidth > 0` | no |
| R14 | Previews follow edits | k9s: set `description` to `Essai` → the iframe lead reads `Essai` within 2 s; macos-clone: append the line `## Essai` to `prompt` → a new `[data-prompt-heading]` `## Essai`, bar lines + 1 | no |
| R15 | `code` widget configured | `npx vitest run src/lib/cms-config.test.ts` → « édite prompt, snippet et excerpt avec le widget code, sortie texte seule » (`widget: code`, `output_code_only: true`, `allow_language_selection: false`, `default_language` `markdown` / `yaml` / `markdown`, `hint` and `required` kept) passes, and `src/lib/cms-navigation.test.ts` (schema) stays green; red on `output_code_only: false` | yes |
| R16 | Code editor on screen | each of the 6 entries holding those values: every such field shows an editor whose computed `font-family` is monospace and holds ≥ 1 coloured token span; after load, Save stays disabled | no |
| R17 | No byte moves | (a) the 6 entries opened then left: OPFS files `sveltia-cms-test/src/content/…/index.md` byte-identical to `src/content/…` (nothing written); (b) same edit (title + ` ✎`, Save) on each at base (scratch worktree dev server) and at tip: the two OPFS files byte-identical, and every `prompt`/`snippet`/`excerpt` value YAML-equal to the original; (c) `git diff 9f61c41 --stat -- src/content` → empty. If (a) or (b) fails, stop and escalate (scope) — no silent return to `text` | no |
| R18 | Clean console | same walk at base and at tip, fresh tabs: 0 console error at tip; tip warnings ⊆ base warnings (by message; iframe sandbox, Svelte `derived_inert` counts recorded) ∪ `[Shiki] The language "promql"/"rego" doesn't exist` | no |
| R19 | Nothing else moves | `npx vitest run` → 0 failed, > 447; `npm run check` → `0 errors`; build: every site page's HTML and the site CSS **byte-identical** to a base build (not only hash-normalised); `node scripts/check-admin.mjs` → its 8 base lines (isolation `1/52`); every other `scripts/check-*.mjs` prints its base lines; `git diff 9f61c41 --stat -- src/content src/content.config.ts src/components src/layouts src/pages src/styles src/scripts .github/workflows docs/anti-drift` → empty | no |
| R20 | README | « Édition du contenu (Sveltia CMS) » gains « Aperçu » (what each preview shows, pure templates + site pipeline, admin-only `?admin` copy of `src/lib`, `check-previews.mjs`) and « Champs de code » (`code` widget, Save disabled on an unchanged entry, a real edit rewrites the whole frontmatter): `grep -c 'check-previews' README.md` ≥ 1, `grep -c 'output_code_only' README.md` ≥ 1 | no |

## Shared resources
- `astro.config.mjs` — T1 only (plugin, `markdown: markdownOptions`, `optimizeDeps.include` + `@astrojs/markdown-remark`, `rehype-slug`, `rehype-autolink-headings`, per D132).
- `src/admin/cms.ts` — T6 only. `public/admin/config.yml`, `src/lib/cms-config.test.ts` — T7 only.
- `package.json`, `package-lock.json` — T8 only (`hast-util-from-html@2.0.3` exact devDependency, already in the lock, if the script parses HTML with it).
- Design tokens `src/styles/global.css` — read only; templates use only classes the site already compiles.
- `dist/`, port 4321 (may be held elsewhere), a base build and a base dev server in a scratch worktree at `9f61c41` (R17 b, R18, R19), the browser OPFS `sveltia-cms-test` (reset on each fresh `?test-repo` load). No version bump.

## Tasks
### T1 — One markdown config; admin-only copy of `src/lib`
- Files: `src/lib/markdownOptions.mjs` (new: `{ shikiConfig: { theme: syntaxTheme }, rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, { behavior: 'wrap' }]] }`), `src/admin/viteAdminLib.mjs` (new plugin) + `src/admin/viteAdminLib.test.ts` (« donne à src/admin sa propre copie de src/lib », fake `this.resolve`), `astro.config.mjs`
- Covers: R7 (first test), R19 (site byte identity)
- Acceptance: `npx vitest run src/admin/viteAdminLib.test.ts` green; `npm run build` → every site page and site CSS byte-identical to the base build, `node scripts/check-admin.mjs` 8 base lines
- Depends on: —

### T2 — Body renderer and image resolution
- Files: `src/admin/previews/markdown.ts` (`process` guard, dynamic import, `renderBody(md)`), `src/admin/previews/images.ts` (placeholder → `<img>` with resolved src or none), `markdown.test.ts`, `images.test.ts`
- Covers: R7, R12
- Acceptance: both files green; R7/R12 named red cases red
- Depends on: T1

### T3 — Tree tools and prompt template
- Files: `src/admin/previews/html.ts` (tree → HTML serializer, region text per R8 rules — shared by tests and T8), `src/admin/previews/prompt.ts`, `prompt.test.ts`, `templates.test.ts` (R2, extended by T4/T5)
- Covers: R2, R3
- Acceptance: `npx vitest run src/admin/previews` green; red on a heading rule changed to `^# `
- Depends on: T2

### T4 — Article and project templates
- Files: `src/admin/previews/article.ts`, `project.ts`, their tests, `templates.test.ts`
- Covers: R4, R5
- Acceptance: tests green; red on a dropped role or on `codeWindowText` replaced by the raw snippet
- Depends on: T3

### T5 — Skill template
- Files: `src/admin/previews/skill.ts`, `skill.test.ts`, `templates.test.ts`
- Covers: R6
- Acceptance: tests green; red when the first file is `files[0]` instead of `defaultFile`
- Depends on: T3

### T6 — Registration and wiring
- Files: `src/admin/previews/register.ts`, `register.test.ts`, `src/admin/cms.ts` (register after `registerSiteStyle`, before `init`; header comment)
- Covers: R1; rendered R9–R11, R13, R14, R18 by the verifier
- Acceptance: tests green; `npm run check` → `0 errors`; `npm run build && node scripts/check-admin.mjs` → 8 base lines (isolation `1/52`)
- Depends on: T4, T5

### T7 — `code` widget on the three fields
- Files: `public/admin/config.yml` (3 fields, comment citing R15/R17 and the Save-disabled fact), `src/lib/cms-config.test.ts` (`snippet.widget` expectation → `code`; new R15 test)
- Covers: R15; rendered R16, R17 by the verifier
- Acceptance: `npx vitest run src/lib/cms-config.test.ts src/lib/cms-navigation.test.ts` green; `git diff 9f61c41 --stat -- src/content` empty
- Depends on: —

### T8 — Built-page parity check
- Files: `scripts/check-previews.mjs` (new; Vite `createServer` + `ssrLoadModule` for the templates, `yaml` for frontmatter, regions per Built facts), `package.json`/lock if a parser is added
- Covers: R8
- Acceptance: `npm run build && node scripts/check-previews.mjs` → the 2 lines, exit 0; exit 1 on each of the 3 planted defects of R8 (scratch copies)
- Depends on: T6

### T9 — README and no-regression pass
- Files: `README.md`
- Covers: R19, R20 (static)
- Acceptance: R20 greps; `npx vitest run` → 0 failed, > 447; `npm run check` → `0 errors`; build + every `scripts/check-*.mjs` → base lines (+ check-previews); R19 byte identity and frozen `git diff --stat` empty
- Depends on: T7, T8

## Out of scope
- Rails, related entries, prev/next, article header/breadcrumb, project banner, tab rows, copy/download buttons, variable inputs (the preview shows the page's static centre column).
- Dark theme inside the preview; responsive widths of the preview pane.
- Preserving Sveltia's frontmatter formatting on a **real** edit (custom file format) — the whole-frontmatter rewrite stays (plan 19 finding 4).
- Removing Sveltia's iframe sandbox warning or Svelte `derived_inert` warnings (Sveltia internals).
- Defaults, date hook, WebP, commit messages, ✏️ button (plan 22); editor blocks (plan 23); any change to `src/content/**`, the schema, site pages or components; version bump, tag, merge, push.

## Evidence
### Verification attempt 1 (tip `20330d8`, base `9f61c41`) — 19/21 proven, R16 + R17(b) failed (both identical at base), R0 failed as a consequence
| Criterion | Verdict | Evidence |
|---|---|---|
| R0 | failed | preview part holds (13/13 entries show their `[data-preview]` template, text and style = page); fails only because R16 and R17(b) do not hold |
| R1 | proven | 6/6; red on `skills` dropped from `PREVIEWS`, registration after `init`, a render dropping entry data |
| R2 | proven | red on `{ class: … }` and a keyless `data-var` span |
| R3 | proven | red on `^# ` heading rule, last window line dropped, changed `data-var` |
| R4 | proven | red on AI-card link text emptied, `coverAlt` replaced, lead from `title` |
| R5 | proven | red on a dropped role and on a raw snippet with extra `\n` |
| R6 | proven | red on `defaultFile` → `paths[0]` |
| R7 | proven | red on 5 mutations (autolink dropped / `github-dark` in preview or shared options / `{...markdownOptions}` copy) |
| R8 | proven | `previews: blog 5/5 · projects 2/2 · prompts 3/3 · skills 2/2`, `drafts: 1 previewed without page`, exit 0; exit 1 on a dropped role (`projects 1/2`), a dropped prompt line (`prompts 0/3`), AI link removed (`blog 0/5`) |
| R9 | proven (caveat) | 13/13 iframe bodies have one `[data-preview]` child; 12/12 published match the page region by region (docker `column:eq(27736)`, bootstrap `window:eq(10527)`); caveat: after the markdown editor is scrolled into view, Sveltia's load-time rewrite (see failures) changes 3 drafts |
| R10 | proven | computed `color`, `background-color`, `font-family`, `font-size` equal to the page for every listed selector; first `[data-var]` bg `rgba(74, 222, 128, 0.16)` |
| R11 | proven | k9s 29/29 `pre.astro-code`, docker 32/32, no `.github-dark`, token colours = page |
| R12 | proven | red on `displayableSrc` accepting anything, raw path kept, non-blob accepted |
| R13 | proven | bienvenue cold: 3 body images + cover `blob:` (naturalWidth 1704/1504/1502/1600); no request to `/screenshot-…`; only ≥ 400 = the D134 ping |
| R14 | proven | lead updates 55 ms after a description edit; macos-clone bar `48 l. · ~607 tk` → `49 l. · ~609 tk` with a new `## Essai`; 13 fast keys end with the last text |
| R15 | proven | 78 passed; red on `output_code_only: false` and `excerpt` back to `text` |
| R16 | failed (Save part) | editors are monospace Lexical code editors with coloured spans (22 editors, 6 entries); but Save is **enabled right after load** on bootstrap, gha-svu, site-bencat (and anti-drift-planning, superpowers once scrolled) — identical at base |
| R17 | failed (b) | (a) opening all 13 entries writes nothing; (b) the same edit gives byte-identical files at base and tip for the 6 entries, but bootstrap `prompt`, gha-svu and site-bencat `snippet` lose their final `\n` (`|` → `|-`) — at base too; (c) `src/content` diff empty |
| R18 | proven | same walk base vs tip: 38 sandbox warnings both, `derived_inert` 506 → **0**, same D134 404, + allowed Shiki `promql`/`rego`; no `console.error` at tip |
| R19 | proven | 490 passed; 0 errors; 51 pages + 4 CSS byte-identical to base; 13 checks identical; frozen diff empty |
| R20 | proven | greps 1 · 1; « Aperçu » and « Champs de code » complete |

Findings outside criteria: (1) **Sveltia's markdown editor rewrites bodies on load** (base too): bold spanning a line break → escaped `\*\*…\*\*` (literal asterisks once saved and published), `*x*` → `_x_`, `|---|` → `| --- |`; affects bootstrap-session-anti-drift, anti-drift-planning, decouper-un-projet-en-plans-anti-drift (notes/bodies) → escalation E1 (scope: `src/content` frozen); (2) **security**: preview body HTML reaches `dangerouslySetInnerHTML` unsanitised — `<img onerror>` / `<svg onload>` survive `renderBody` and `resolveBodyImages`; Sveltia's default preview sanitised (`sanitize_preview` default true) → fix task F1; (3) D142's unpkg Shiki request not observed by the recorder (possibly from a worker); (4) no debug output.

### F1 — Sanitise the preview body HTML (security finding 2)
- Files: `src/admin/previews/sanitize.ts` (+ test), `src/admin/previews/register.ts` (or wherever the body HTML enters the tree), `package.json`/lock only if a sanitiser dependency is added (exact version)
- Sanitise the rendered body HTML before it reaches `dangerouslySetInnerHTML`: no event-handler attributes, no `<script>`/`<iframe>`/`<object>`/`<embed>`/`<style>`, no `javascript:`/`vbscript:` URLs (href, src, xlink:href, formaction), SVG script vectors removed — while keeping everything the site pipeline emits (Shiki `style` colours on spans, `class`, `id`, heading anchors `href="#…"`, `lang`, `data-*`, image placeholders). Prefer a proven sanitiser (DOMPurify, which Sveltia already ships — check whether it is importable from the npm package, else add `dompurify` at an exact version) with a config tested against the site's real output.
- Covers: security finding 2 (and keeps R7–R11, R13, R14, R8 green)
- Acceptance: unit tests — every payload of a list (`<img src=x onerror>`, `<svg onload>`, `<a href="javascript:…">`, `<iframe>`, `<script>`, `<math><mi xlink:href="javascript:…">`, `<style>@import`, `<form><button formaction=javascript:…>`) comes out inert; for every real entry the sanitised body HTML equals the unsanitised one (the site output is untouched); `npx vitest run` 0 failed; `node scripts/check-previews.mjs` exit 0; build + check-admin isolation 1/52
- Depends on: T9

### F2 — Content in Sveltia's canonical markdown + guard (E1 answered A, D145)
- Files: `src/lib/cmsCanonical.ts` (new: detector of the constructs Sveltia's Lexical editors rewrite on load — emphasis/strong spanning a line break, `*`-emphasis, tables not in `| --- |` form, code-field values ending in a newline — plus a normaliser), `src/lib/cmsCanonical.test.ts` (new guard over every `src/content/**` entry: body and the three code fields), the affected `src/content/**` files (syntax only — not a word of prose; D145 exception), README (the rule and its guard next to the `---` rule)
- First establish, from Sveltia 0.221's npm source (`npm/index.js.map` sourcesContent: the Lexical markdown transformers/exporter and the code editor), the full list of constructs the round trip rewrites, and check every entry against it — not only the 6 the verifier saw. For code fields, prove the site renders a value with and without its final newline identically (`measurePromptText`, `codeWindowText`, `explorerLines`, built HTML) before stripping it.
- Covers: R16, R17 (and R0); keeps R3–R11, R19 green
- Acceptance: guard tests green, and red when a spanning `**…⏎…**`, a `*x*`, a `|---|` table or a code value ending in `\n` is planted; `git diff <base> -- src/content` shows only syntax lines (listed in the report with counts); all 51 built site pages identical to base after whitespace normalisation of text nodes (byte-identical where no emphasis moved), `node scripts/check-previews.mjs` exit 0, every other `scripts/check-*.mjs` = base; `npx vitest run` 0 failed. Rendered (verifier): after load and full scroll, Save stays disabled on all 13 entries; the same edit saves only the edited field and Sveltia's frontmatter re-formatting (no body or code-value change)
- Depends on: F1

### F3 — Last two non-canonical entries (D146)
- Files: `src/content/prompts/decouper-un-projet-en-plans-anti-drift/index.md`, `src/content/blog/meilleurs-vpn-2025/index.md` (syntax only), `src/lib/cmsCanonical.test.ts` (`PENDING` emptied), README if it names them
- Canonicalise both (decouper: its 2 spanning bold, `*encore*`, `|---|`; meilleurs-vpn: the loose nested list in Sveltia's tight form); word sequence unchanged; report the visible deltas (decouper window/card token count; meilleurs-vpn list HTML)
- Covers: R16, R17 (with D146's reading of R16's Save clause)
- Acceptance: guard green with an empty `PENDING`; the F2 Lexical replica returns every body and code value unchanged except `---` rules; `npx vitest run` 0 failed; build: site pages identical to the F2 build except decouper (`/prompts/decouper…`, `/prompts` card) and `/blog/meilleurs-vpn-2025`, each delta listed; all `scripts/check-*.mjs` exit 0
- Depends on: F2
