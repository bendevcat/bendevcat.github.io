# Plan 22 — creation-rapide

Brief: `docs/auto/brief.md` · Branch: `auto/plan-22-creation-rapide` · Base: `74bc756` (plans 19–21 merged)

## Goal
Creating an article pre-fills `pubDate` with now; every new article, prompt or skill starts with `draft: true`; saving a **published** article whose **body** changed sets `updatedDate` to now (any other change leaves it alone); saving a prompt whose **version** changed sets `updated` to now; an uploaded image is stored as WebP, ≤ 1600 px wide, quality 80, size-capped; CMS commits read `content(<collection>): <action> "<slug>"`; Duplicate works on `{slug}/index.md` entries; `/admin/raccourcis` (noindex) offers two bookmarklets — 💡 Idée d'article (draft, title = selection or page title, source link in description) and 💬 Nouveau prompt (selection → `prompt`, draft) — plus plain links for mobile, all opening a pre-filled new entry; on every article, project, prompt and skill page an ✏️ Éditer button opening that entry in the CMS is visible **only** in a browser where `/admin` has set a localStorage marker (absent for visitors and without JS; documented as a convenience, never as security)

**Added scope (E2 answered A, D148):** every `src/content/**` frontmatter is rewritten in the exact form Sveltia 0.221 writes on save (syntax only, values unchanged — same freeze exception as D145) so an unedited save is byte-identical, with a guard test; README corrected; `normalizeBody` / `normalizeCodeField` get a real caller.

## Reachability
Author: `/admin/` (signed in) › a collection › « New … » (pre-filled form) · an entry › edit › Save (date rule, WebP upload, commit message) · entry menu › Duplicate. `/admin/raccourcis` is typed once (URL in the README) and its bookmarklets dragged to the bookmarks bar; plain links open the pre-filled form. Site: after one visit to `/admin/`, any detail page (`/blog/k9s-kubernetes-terminal-ui`, `/projets/gha-svu`, `/prompts/macos-clone`, `/skills/superpowers`) › ✏️ Éditer › the entry's editor.
Agent (dev): `npx astro dev --background` › **fresh tab** `http://localhost:<port>/admin/?test-repo` › « Work with Test Repository » (a reload drops `?test-repo`; a pre-fill or entry route is reached as `/admin/?test-repo#/collections/…` or by setting `location.hash` after sign-in). `/admin/raccourcis` and the ✏️ link do not exist at base: T4 and T5 create them.

### Built facts (Sveltia 0.221.0 sources from `npm/index.js.map`; probes at authoring)
- **Serialiser** (`contents/file/format.js`, `draft/save/serialize.js`): YAML via `yaml` `stringify(obj, null, { indent: 2, indentSeq: true, lineWidth: 0, defaultKeyType: 'PLAIN', defaultStringType: 'PLAIN', singleQuote: true }).trim()`; file = `---\n<head>\n---\n` + (`\n<body>\n` if body non-empty). Keys follow `config.yml` field order (list items by sub-field order), `omit_empty_optional_fields` drops empty optionals, unknown keys last (sorted). **Parser** (`file/parse.js`): `text.trim()`, CRLF → LF, `^---\n(head)\n---(?:\n(body))?$`, one leading `\n` stripped from the body. Sveltia bundles `yaml@2.9.1`; the repo's devDependency resolves `2.9.0`.
- **Defaults on open** (`draft/create/normalize.js` → `populateDefaultValue`): a field missing from an existing file is filled with its default (boolean → `default` or `false`; string → `default`). Hence the D147 re-serialisation (`featured: false`, `draft: false`) — and **a `draft` default of `true` would turn every entry lacking `draft` into a draft on its next save.**
- Rough replica over the 13 files: 12 change (all but `macos-clone`): quotes, flow → block lists, key order, explicit defaults, blank line after `---` on k9s / docker / linux / meilleurs-vpn.
- **`preSave`** (`draft/save/changes.js` › `api/events.js` › `api/helpers.js#createEntryMap`): the Map holds `data`, `i18n`, `slug`, `path`, `newRecord`, `collection`, `mediaFiles` — **no previous values**; handlers are awaited in order; any returned Map replaces the default-locale content. `postSave` gets the saved entry.
- **URL pre-fill** (`app/navigation.js#parseLocation`, `contents/navigation.js`, `draft/defaults.js`): `#/collections/<name>/new?…` params decoded by `URLSearchParams` (repeated keys joined with `,`), `_slug` removed, each value `trim()`med (empty → ignored); boolean `'true'` → `true`; datetime `'{{now}}'` → now in the field format; `code` with `output_code_only` → the string; list paths (`tags.0`) ignored. Applies to new entries only.
- **Commit messages** (`git/shared/commits.js`): `backend.commit_messages.{create,update,delete,uploadMedia,deleteMedia,openAuthoring}`; `{{collection}}` = the collection's **singular label** (no name placeholder exists), `{{slug}}`, `{{path}}`; ` +N` appended when N more files; `fs/test.js` ignores messages → real-backend only.
- **Media** (schema `DefaultMediaLibraryConfig`: `multiple`, `max_file_size`, `slugify_filename`, `transformations`; `ImageTransformations.raster_image`: `format: webp`, `quality`, `width`, `height`): `assets/process.js` transforms client-side before any backend, then `oversized = transformed.size > max_file_size` → the test repo exercises it.
- **Duplicate** (`draft/create/duplicate.js`): copies every value (`draft` included) and the entry-relative assets, files the copy in its own folder beside the original, `isNew: true`.
- GitHub contents API, unauthenticated, `…/repos/bendevcat/bendevcat.github.io/contents/<path>?ref=main` with `Accept: application/vnd.github.raw+json` → 200, `access-control-allow-origin: *`, `max-age=60`, 60 req/h.
- Entry route `#/collections/<name>/entries/<subPath>`, subPath from `fullPathRegEx` of `path: '{{slug}}/index'` (expected `<id>/index`; T5 confirms against the link the entry list itself opens).

### Design (binding)
- **Order**: T1 makes `draft` explicit in every blog/prompt/skill file **before** T2 flips its default to `true`; the T1 guard keeps it explicit.
- **Date rules** (pure, `src/admin/dateRules.ts`): skip when `newRecord`; `blog`: previous and new `draft !== true`, and `normalizeThematicBreaks(newBody) !== previous.body` → `updatedDate = now`; `prompts`: new `version` non-empty and `!== String(previous.version ?? '')` → `updated = now`; otherwise data untouched. Previous unknown → untouched (+ one `console.warn`). `now` formatted `YYYY-MM-DDTHH:mm:ssZ` in the browser's offset (the widget's format).
- **Previous state** (`src/admin/previousEntry.ts`): the committed file at `entry.get('path')`, parsed exactly like Sveltia; source = in-memory map filled by `postSave` (same session) → else dev: the working tree through a `?raw` glob in `src/admin/dev/` (dynamic import under `import.meta.env.DEV`, shares `testRepo.ts`'s glob) → else prod: the GitHub contents API above (`cache: 'no-store'`, no token; 404 → new file; any failure → unknown). Repo/branch constants tested equal to `config.yml`. Fetch only when a rule could fire.
- One `preSave` handler: thematic breaks (plan 19) then date rules; one `postSave` handler: memory. Registered in `cms.ts` before `init`.
- ✏️: `src/components/EditLink.astro` = `<a data-edit-link data-pagefind-ignore hidden href="/admin/#/collections/<name>/entries/<id>/index">✏️ Éditer</a>`, fixed bottom-right, tokens only, placed in `<main>` after `<article data-pagefind-body>` on the 4 detail templates; `src/scripts/edit-link.ts` removes `hidden` when `localStorage['bencat:author'] === '1'` (errors → stays hidden); no `!important` utility (plan 8 `[hidden]` trap). `cms.ts` sets the marker on every `/admin/` load. Key and href builder in `src/lib/editLink.ts`.
- `/admin/raccourcis`: `src/pages/admin/raccourcis.astro`, standalone (no BaseLayout, `noindex`, no `data-pagefind-body`, no script), `global.css` for tokens; bookmarklet hrefs built at build time by `src/lib/bookmarklets.ts` against `new URL('/admin/', Astro.site)`; they `window.open` `#/collections/blog/new?title=<selection‖document.title>&description=Source : <location.href>&draft=true` and `#/collections/prompts/new?prompt=<selection>&draft=true`; plain links `/admin/#/collections/blog/new?draft=true` and `/admin/#/collections/prompts/new?draft=true`.

## Criteria
| ID | Criterion | Measure | Guarantee |
|---|---|---|---|
| R0 | Creating an article pre-fills `pubDate` with now; every new article, prompt or skill starts with `draft: true`; saving a **published** article whose **body** changed sets `updatedDate` to now (any other change leaves it alone); saving a prompt whose **version** changed sets `updated` to now; an uploaded image is stored as WebP, ≤ 1600 px wide, quality 80, size-capped; CMS commits read `content(<collection>): <action> "<slug>"`; Duplicate works on `{slug}/index.md` entries; `/admin/raccourcis` (noindex) offers two bookmarklets — 💡 Idée d'article (draft, title = selection or page title, source link in description) and 💬 Nouveau prompt (selection → `prompt`, draft) — plus plain links for mobile, all opening a pre-filled new entry; on every article, project, prompt and skill page an ✏️ Éditer button opening that entry in the CMS is visible **only** in a browser where `/admin` has set a localStorage marker (absent for visitors and without JS; documented as a convenience, never as security) | reachability walkthrough (agent path) through every Reachability step; R1–R24 hold (R10's commit text and R6's GitHub branch in production are user smokes) | no |
| R1 | Creation defaults configured | `npx vitest run src/lib/cms-config.test.ts` → « pré-remplit pubDate avec {{now}} » and « crée articles, prompts et skills en brouillon (draft default true) » pass; red on `default: false` for `skills.draft` | yes |
| R2 | New entries start as drafts with now | test board: New Article → Date de publication shows now (±2 min), Brouillon on; New Prompt, New Skill → Brouillon on; save a new article (title `Essai création`, a category, a description) → its new OPFS `src/content/blog/<slug>/index.md` has `draft: true` and that `pubDate` | no |
| R3 | Every blog/prompt/skill file declares `draft` | `npx vitest run src/lib/cmsFrontmatter.test.ts` → « chaque article, prompt et skill déclare draft (le défaut du CMS est true) » passes; red when `draft:` is removed from `macos-clone` | yes |
| R4 | Date rules | `npx vitest run src/admin/dateRules.test.ts` → « article publié, corps changé : updatedDate = maintenant », « titre seul, brouillon, première publication, nouvelle entrée ou état précédent inconnu : rien ne change », « séparateurs normalisés avant la comparaison », « prompt : version changée → updated ; inchangée ou vidée → rien », « format YYYY-MM-DDTHH:mm:ssZ au décalage local » pass; red when the draft test is dropped | yes |
| R5 | Previous state source | `npx vitest run src/admin/previousEntry.test.ts` → « lit le fichier comme Sveltia (trim, corps sans saut initial) », « la mémoire postSave prime », « prod : API contents GitHub sans jeton, cache no-store, 404 = nouveau, échec = inconnu » (fake fetch), « dépôt et branche = backend de config.yml » pass; red when the `Authorization` header or `cache: 'no-store'` changes | yes |
| R6 | Hooks wired | `npx vitest run src/admin/hooks.test.ts` → existing R13 tests plus « un seul preSave : séparateurs puis dates » and « cms.ts enregistre preSave et postSave avant init » pass | yes |
| R7 | Date rules on the board | fresh test board per case, OPFS read after Save: k9s body + one word → `updatedDate` = now (±2 min, browser offset), nothing else changed but that key and the body; k9s title only → file = the title edit alone (no `updatedDate`); bienvenue (draft) body edit → no `updatedDate`; macos-clone `version` `1.0.0` → `updated` = now; macos-clone title only → no `updated`; k9s body edited twice in one session → second save's `updatedDate` ≥ first | no |
| R8 | Media config | `npx vitest run src/lib/cms-config.test.ts` → « images : WebP, 1600 px, qualité 80, plafond de taille » (`media_libraries.default.config.transformations.raster_image` = `{format: webp, quality: 80, width: 1600}`, `max_file_size: 1048576`) passes; `src/lib/cms-navigation.test.ts` (schema) green; red on `quality: 85` | yes |
| R9 | Upload lands as WebP | test board, bienvenue: upload a 3000×2000 PNG as cover → Save → OPFS holds `<name>.webp` beside the entry, decoded width 1600, `cover: <name>.webp`; a 1600×1600 random-noise PNG is refused (oversized notice, nothing written) | no |
| R10 | Commit messages | `npx vitest run src/lib/cms-config.test.ts` → « messages de commit content(<collection>): <action> "<slug>" » (templates `content({{collection}}): create/update/delete "{{slug}}"`, media `content(media): upload/delete "{{path}}"`; rendered with Sveltia's substitution → `content(Article): update "k9s-kubernetes-terminal-ui"`) passes; red on `Update`; user smoke in the final report | yes |
| R11 | Duplicate | test board: k9s › Duplicate › title `k9s copie` › Save → OPFS `src/content/blog/k9s-copie/index.md` exists with the copied values and `cover: k9s-header.png`, `k9s-copie/k9s-header.png` present; `k9s-kubernetes-terminal-ui/index.md` unchanged; same on `gha-svu` (projects) | no |
| R12 | Shortcuts page built | `npm run build && node scripts/check-admin.mjs` → base lines with isolation `1/<pages>` plus `raccourcis: /admin/raccourcis/index.html · noindex · 0 script · 2 bookmarklets (💡 Idée d'article, 💬 Nouveau prompt) · 2 plain links · 0 site chrome`; `Indexed 12 pages`; exit 1 when a bookmarklet is removed | yes (check-admin) |
| R13 | Bookmarklets produce the right URL | `npx vitest run src/lib/bookmarklets.test.ts` → « 💡 : sélection sinon titre de page, source dans la description, draft=true », « 💬 : sélection multiligne → prompt, draft=true », « relu par URLSearchParams comme Sveltia : valeurs exactes (espaces, +, &, #, accents, sauts de ligne) », « liens simples » pass (bookmarklet source run in `node:vm` with stubbed `getSelection`, `document`, `location`, `open`) | yes |
| R14 | Pre-filled forms | test board, URLs from R13 with origin → dev and `?test-repo`: 💡 → form title = selection, description = `Source : <url>`, Brouillon on, pubDate now; no selection → title = page title; 💬 → the prompt editor holds the 3-line selection, Brouillon on; each plain link → empty form, Brouillon on | no |
| R15 | ✏️ markup | `npm run build && node scripts/check-edit-link.mjs --base <base dist>` → `edit link: 12/12 detail pages · 1 a[data-edit-link][hidden] each · href = /admin/#/collections/<name>/entries/<id>/index · outside data-pagefind-body · 0 elsewhere` and `site pages: <n> identical to base once the edit link and its script are removed`; exit 1 on a missing `hidden`, a wrong href, or a link on `/blog` | yes (check-edit-link) |
| R16 | Href and marker | `npx vitest run src/lib/editLink.test.ts` → « href d'édition = route d'entrée de config.yml (path {{slug}}/index) pour les quatre collections » and « cms.ts pose le marqueur bencat:author avant init » pass | yes |
| R17 | Visible only with the marker | fresh profile, the 4 smoke pages at 375 and 1280, both themes: link not displayed (computed `display: none`); JS disabled: not displayed; after opening `/admin/` once: displayed, box inside the viewport, text contrast ≥ 4.5:1; click → `/admin/#/collections/<name>/entries/<id>/index`; that route on a signed-in test board opens the entry (title field = entry title); marker removed + reload → not displayed | no |
| R18 | Canonical frontmatter guard | `npx vitest run src/lib/cmsFrontmatter.test.ts` → « chaque fichier = ce que Sveltia 0.221 écrit pour lui (frontmatter, ligne vide, fin) » passes; red on each planted defect: `title: "x"`, `tags: [a]`, keys out of order, `featured` missing on an article, no blank line after `---` | yes |
| R19 | Content change is syntax only | `node scripts/canonicalize-content.mjs --check` → `canonical: 13/13 entries`, exit 0; for every file changed since `74bc756`: parsed frontmatter deep-equal to base except added keys whose value = the config default, and body (as Sveltia parses it) byte-equal to base; build: site pages identical to base (R15 rule) | no |
| R20 | Unedited save is byte-identical | each of the 13 entries on a fresh test board: open, scroll the whole form; Save enabled → click; else type then delete one title character and Save if enabled; OPFS file byte-identical to `src/content/…` at tip — 13/13 | no |
| R21 | `normalizeBody` / `normalizeCodeField` have a caller | `grep -l "normalizeBody\|normalizeCodeField" scripts/*.mjs` → `scripts/canonicalize-content.mjs`; `--write` on a scratch copy with `*x*` and `snippet: \|` rewrites them to `_x_` and `\|-` | no |
| R22 | README | « Édition du contenu » documents defaults, date rules (source of the previous state, fail-safe), WebP, commit messages, Duplicate, `/admin/raccourcis`, ✏️ (« commodité, jamais une sécurité »), canonical frontmatter + script; the false Save claim is replaced: `grep -c 'raccourcis' README.md` ≥ 1, `grep -c 'canonicalize-content' README.md` ≥ 1, `grep -c 'commodité' README.md` ≥ 1, `grep -c 'un fichier non modifié ne peut donc pas être' README.md` → 0 | no |
| R23 | Clean console | R2, R7, R14 walks at tip vs base (same steps where they exist): 0 console error; warnings ⊆ base ∪ the date-rule `console.warn` only when forced (offline GitHub adapter test) | no |
| R24 | Nothing else moves | `npx vitest run` → 0 failed, > 506; `npm run check` → `0 errors`; every other `scripts/check-*.mjs` prints its base lines (deliberate changes listed in the report); base CSS rules all present in the tip CSS; `git diff 74bc756 --stat -- .github/workflows docs/anti-drift src/content.config.ts` → empty; `src/content` diff = R19 only | no |

## Shared resources
- `src/content/**` — T1 only (D148 exception). `package.json`/lock — T1 only (`yaml` devDependency → `2.9.1` exact, Sveltia's bundled version).
- `public/admin/config.yml`, `src/lib/cms-config.test.ts` — T2 only. `src/admin/cms.ts` — T3 then T5. `scripts/check-admin.mjs` — T4. `README.md` — T6.
- Marker key `bencat:author` and href builder: `src/lib/editLink.ts` (site and admin; the admin gets its `?admin` copy, D138). Design tokens `global.css`: read only.
- `dist/`, the dev port, a base build in a scratch worktree at `74bc756` (R15, R19, R24), the browser OPFS `sveltia-cms-test`. No version bump.

## Tasks
### T1 — Canonical frontmatter, guard, canonicaliser, content rewrite
- Files: `src/lib/cmsFrontmatter.ts` (new: pure parse + serialise replica of Built facts, config fields/defaults read from `config.yml`), `src/lib/cmsFrontmatter.test.ts`, `scripts/canonicalize-content.mjs` (new: `--check` / `--write`; frontmatter replica + `normalizeBody` + `normalizeCodeField`; TS loaded like `check-previews.mjs`), the 12 changed `src/content/**/index.md`, `package.json`/lock
- Covers: R3, R18, R19, R21
- Acceptance: guard green, red on each R18/R3 plant; `node scripts/canonicalize-content.mjs --check` → `canonical: 13/13 entries`; R19 diff rule holds; `npm run build` → site pages byte-identical to the base build; `npx vitest run` 0 failed
- Depends on: —

### T2 — Config: defaults, media, commit messages
- Files: `public/admin/config.yml` (`pubDate` `default: '{{now}}'`; `draft` `default: true` ×3; `media_libraries.default.config`; `backend.commit_messages`; comments citing Built facts), `src/lib/cms-config.test.ts`
- Covers: R1, R8, R10
- Acceptance: `npx vitest run src/lib/cms-config.test.ts src/lib/cms-navigation.test.ts src/lib/cmsFrontmatter.test.ts` green; `testRepoConfig` still drops `backend` extras (`src/admin/dev/testRepo.test.ts` green)
- Depends on: T1

### T3 — Date rules and previous state
- Files: `src/admin/dateRules.ts` + test, `src/admin/previousEntry.ts` + test, `src/admin/dev/` reader (glob shared with `testRepo.ts`), `src/admin/hooks.ts` + test, `src/admin/cms.ts`
- Covers: R4, R5, R6
- Acceptance: the three test files green, named red cases red; `npm run check` → `0 errors`; `npm run build && node scripts/check-admin.mjs` → `dev-only` line unchanged (no `/src/content/` key in `dist/_astro`)
- Depends on: —

### T4 — `/admin/raccourcis`
- Files: `src/lib/bookmarklets.ts` + test, `src/pages/admin/raccourcis.astro`, `scripts/check-admin.mjs` (raccourcis line)
- Covers: R12, R13
- Acceptance: `npx vitest run src/lib/bookmarklets.test.ts` green; build → R12 lines, `Indexed 12 pages`; exit 1 on a removed bookmarklet (scratch copy)
- Depends on: —

### T5 — ✏️ Éditer
- Files: `src/lib/editLink.ts` + test, `src/components/EditLink.astro`, `src/scripts/edit-link.ts`, the 4 `src/pages/{blog,projets,prompts,skills}/[...slug].astro`, `src/admin/cms.ts` (marker), `scripts/check-edit-link.mjs` (new), any `scripts/check-*.mjs` whose output the link changes (deliberate, listed)
- Covers: R15, R16; rendered R17 by the verifier
- Acceptance: `npx vitest run src/lib/editLink.test.ts` green; build + `node scripts/check-edit-link.mjs --base <base dist>` → R15 lines; planted defects exit 1; `check-admin` isolation still `1/<pages>`
- Depends on: T3

### T6 — README and no-regression pass
- Files: `README.md`
- Covers: R22, R24 (static)
- Acceptance: R22 greps; `npx vitest run` → 0 failed, > 506; `npm run check` → `0 errors`; build + every `scripts/check-*.mjs` → expected lines; frozen diff empty
- Depends on: T1, T2, T3, T4, T5

## Out of scope
- A custom file format preserving hand-written frontmatter (the content follows Sveltia's form instead, D148).
- Draft on Duplicate (Sveltia copies the original's `draft`); date rules on new records; `pubDate` on first publication.
- A UI to clear the ✏️ marker (README gives the console line); a link to `/admin/raccourcis` inside Sveltia's UI.
- Editorial workflow, config generated from Zod, previews (plan 21), editor blocks (plan 23); schema changes; version bump, tag, merge, push.

## Evidence
### Verification attempt 1 (tip `36ff7ce`, clean base `74bc756`) — 21/25 proven; R9, R11 failed on the plan's own text (fixed: Sveltia writes `cover: <name>`, no `./` — a plan-text defect, the product works); R10 proven + smoke; R0 proven
| Criterion | Verdict | Evidence |
|---|---|---|
| R0 | proven | agent path walked end to end (Create ×3, edit + rule B, WebP upload, Duplicate, `/admin/raccourcis` bookmarklets + links, ✏️ link and entry route); dev log 115×200, 9×404 on the draft page (base too); no 5xx |
| R1 | proven | tests pass; red on `skills.draft` default false and on `pubDate` default removed |
| R2 | proven | new article: pubDate = browser now (0 min), Brouillon checked; new prompt/skill: Brouillon checked; saved OPFS file `pubDate: 2026-09-25T17:26:00+02:00`, `draft: true` |
| R3 | proven | test; red on `draft:` removed from macos-clone |
| R4 | proven | 5 tests; red on 5 mutations (one equivalent mutant noted) |
| R5 | proven | 5 tests; red on `Authorization`, `no-cache`, `credentials: 'include'`, 404 branch dropped, memory bypassed, branch `master`; live contents API 200 with CORS without token, 404 for a missing path |
| R6 | proven | red on swapped steps, `postSave` removed, `preSave` after `init`, a second `preSave` |
| R7 | proven | k9s body edit → only `+updatedDate: 2026-09-25T17:27:45+02:00` + body line; title only → title line only; bienvenue (draft) body → body only; macos-clone version → `+version` `+updated`; title only → title only; two body saves → second ≥ first |
| R8 | proven | test; red on quality 85, width 1920, 2 MiB |
| R9 | failed (plan text) | 3000×2000 PNG → `grand-test.webp` RIFF/WEBP 1600×1066, 13 904 B beside the entry; 1600×1600 noise PNG refused (« Fichier volumineux… 1 Mo »), nothing written; stored `cover: grand-test.webp` (no `./`, base writes the same form; a build with a bare cover emits the image) |
| R10 | proven + smoke | test; red on `Update` / `Upload`; real commit text = production smoke |
| R11 | failed (plan text) | `k9s-copie/index.md` = original except title and `cover: k9s-header.png` (no `./`); image copied byte-identical; original unchanged; gha-svu duplicate: title only |
| R12 | proven | exact `raccourcis:` line, isolation 1/53, `Indexed 12 pages`; exit 1 on a bookmarklet removed; 375/1280 no overflow, 0 contrast/off-token finding |
| R13 | proven | 7 tests; red on 5 mutations |
| R14 | proven | both bookmarklets run on a page with a `<pre>` selection (quotes, `&`, `#`, `+`, `%`, `?`, `=`, emoji, ZWJ, `<b>&amp;</b>`, newlines), `window.open` intercepted, origin rewritten to the dev test board: 💡 title = selection (newlines collapsed) / page title without selection, description `Source : <full URL>`, Brouillon on, pubDate now; 💬 saved `prompt` = the 3-line selection exactly, `draft: true`; plain links: empty forms, Brouillon on; 0 console error |
| R15 | proven | exact lines; exit 1 on `hidden` removed, wrong href, link on `/blog` |
| R16 | proven | tests; red on href without `/index`, marker after `init`, wrong key |
| R17 | proven | preview, 12 pages × 375/1280 × light/dark: fresh profile 48/48 hidden; JS off 48/48 hidden (also with the marker); after one `/admin/` visit 48/48 shown, in viewport, contrast 6.20:1 / 9.78:1, 2 px ink focus outline; click → `/admin/#/collections/prompts/entries/macos-clone/index` (sign-in screen on the real backend, entry opens on a signed-in test board for the 4 collections); marker removed → hidden; 0 Pagefind fragment |
| R18 | proven | guard; red on quoted title, flow list, reordered keys, `featured` removed, blank line removed |
| R19 | proven | 13/13 canonical; 12 changed files: equal values, byte-equal bodies; additions `featured=false` ×6, `draft=false` ×3 |
| R20 | proven | 13 fresh boards, load + full scroll + Save: 11 saved byte-identical, 2 keep Save disabled → 13/13 |
| R21 | proven | caller found; `--check` exit 1 on plants, `--write` 2/13, then 13/13 |
| R22 | proven | greps 5 · 4 · 1 · 0 |
| R23 | proven (relative to base) | 0 console error in R2/R14/R7 walks except the draft-page 404 (base too); warnings = sandbox notice (base too) |
| R24 | proven | 549 passed; 0 errors; 13 checks = base; check-admin only `1/52`→`1/53` + `raccourcis:`; CSS: 0 base declarations missing, + `.bottom-4` `.z-30`; frozen diff empty; content diff = R19 |

Findings outside criteria: (1) **rule B writes seconds but Sveltia's datetime widget holds minutes** — an unedited save after a rule-B save rewrites `17:32:52` as `17:32:00` (breaks D148; the guard misses it) → F1; (2) a refused oversized image empties the cover field and a later Save drops `cover:` → README (F3); (3) slugs keep accents (`essai-création/`, frequent with the 💡 bookmarklet) → F2; (4) minor: fixed ✏️ overlaps the bottom of the TOC at 1280; ~180 Tabs to reach it; `/admin/raccourcis` light only (by design); a duplicate of a published article is published (D150).

Real-backend smoke for the final report: commit text `content(Article): update "<slug>"`; rule B through GitHub in production; WebP cover landing in the repo + deploy; Duplicate on disk; ✏️ opens the entry directly when signed in.

### F1 — Rule-B timestamps at minute precision + guard (finding 1)
- Files: `src/admin/dateRules.ts` (`formatLocalTimestamp` writes seconds `00`) + test; `src/lib/cmsFrontmatter.ts` / its test (the replica truncates datetime values the way Sveltia's widget does, so a value with non-zero seconds is flagged non-canonical)
- Acceptance: tests; red on a planted `updatedDate: …:52+02:00` in a content copy; verifier: rule-B save then an unedited save → byte-identical
- Depends on: T6

### F2 — ASCII slugs (finding 3)
- Files: `public/admin/config.yml` (global `slug` options per Sveltia 0.221's schema: transliterate accents, lowercase), `src/lib/cms-config.test.ts` (test tied to the schema + a slug computed with the same options for « Essai création à la une » → `essai-creation-a-la-une`)
- Acceptance: tests; ajv schema test green; verifier: a new article titled with accents saves under an ASCII folder
- Depends on: F1

### F3 — README fixes (cover form, refused image)
- Files: `README.md` — `cover: <nom>.webp` (Sveltia's form, no `./`; both resolve), and the trap: an image refused for size empties the cover field — do not Save, or re-pick a smaller image
- Acceptance: greps (`cover: ./<nom>` → 0; the trap stated once)
- Depends on: F2
