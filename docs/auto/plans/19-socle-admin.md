# Plan 19 — socle-admin

Brief: `docs/auto/brief.md` · Branch: `auto/plan-19-socle-admin` · Base: `edd27912fe6429c0c629df3479507d63f4493a6c`

## Goal
The author opens `/admin/` **in dev and in production** (no more `/admin/index.html` in dev — D01 closed) and gets Sveltia **0.221.0**, served by `src/pages/admin/index.astro` (standalone page, `noindex`, no `BaseLayout`, not indexed by Pagefind) whose script `src/admin/cms.ts` imports `@sveltia/cms` from npm at an **exact** version; `public/admin/index.html` is gone, `public/admin/config.yml` stays YAML; opening any article, the preview pane shows the site's typography and colours (site CSS injected with `registerPreviewStyle`); no thematic break other than `---` remains in `src/content/**` and a test fails if one comes back; `delete` is re-enabled on the four collections **only if** deleting an entry in Sveltia 0.221 removes the references to it from other entries (proven), otherwise stays `false` with the finding logged; README updated

## Reachability
Dev: `npx astro dev --background` › `http://localhost:4321/admin/` › Sveltia sign-in (« Work with Local Repository », « Sign In Using Access Token » — the author's README paths). Agent path (no PAT, no directory picker): `http://localhost:4321/admin/?test-repo` › « Work with Test Repository » › board with the repo's 13 entries › Articles › any article › preview pane. Production: `npm run build && npx astro preview` › `/admin/` › GitHub sign-in. At base `/admin/` is a 404 in dev (only `/admin/index.html` works); T2 creates the route, T5 the agent path.

### Built facts (measured at base `edd2791`)
- `npm run build`: 51 pages + `public/admin/index.html` = 52 HTML files; Pagefind `Indexed 12 pages` (only pages with `data-pagefind-body` are indexed). No `dist/_astro/*.js` contains `/src/content/`.
- `@sveltia/cms@0.221.0` (unpacked): no auto-init when imported as a module (`CMS_MANUAL_INIT && (document.currentScript || script[src$="/sveltia-cms.js"])`) → `cms.ts` must call `CMS.init()`. Config defaults to `/admin/config.yml` next to the page, or `<link rel="cms-config-url">`. `init({ config })` merges with the YAML.
- `registerPreviewStyle(css, { raw: true })` turns the CSS into a `blob:` stylesheet: a root-relative `url(/_astro/…woff2)` inside cannot resolve there, so font URLs must be made absolute first.
- Probe (scratch page, then removed): `global.css?url` from a page script returned `/_astro/global.<hash>.css`, a file **absent** from `dist/` (the CSS was emitted as `BaseLayout.<hash>.css`) → `?url` is unusable. `global.css?inline` gives Tailwind-compiled CSS (`.prose{…}`, `--color-bg:#f1f4f7`, no `@theme`), fonts as `url(/_astro/nebula-sans-…woff2)`. **Design: `?inline` + absolute URLs + `raw: true`.**
- Test backend `test-repo`: reads/writes the origin-private file system under `sveltia-cms-test/<repo path>`; sign-in button « Work with Test Repository ». Seeding that directory from `src/content/**` before `CMS.init` gives the real board with no credential.
- Deletion: `src/lib/services/contents/collection/data/delete.js` › `deleteEntries` calls `planCascadeDelete`, which removes the deleted slugs from every referencing relation field **in the same commit**, and blocks only if a referencing field is `required`/`min` (ours are all optional). Source evidence only — R16 proves it.
- **Trap**: the rich-text editor (`@sveltia/ui` 0.77 `transformers/hr.js`) imports `---`, `***`, `___` as a rule (not `- - -` — the reported list-item bug) but **exports every rule as `***`**. A CMS save would bring `***` back and turn the guard test — hence CI (`npm test` in the deploy workflow) — red. Design: a `preSave` listener rewrites rule lines to `---` (R13, R14).
- Thematic breaks outside frontmatter and fenced code: 25 lines, all between blank lines — `- - -` × 23 (k9s 2, linux-commandes-essentielles 11, meilleurs-vpn-2025 10) and `***` × 2 (bienvenue-dans-mon-foutoir).

### Instrument `scripts/check-admin.mjs` (new; reads `dist/` and `public/admin/config.yml`) — expected output
```
admin page: /admin/index.html · noindex · cms-config-url /admin/config.yml · 1 module script · 0 stylesheet link · 0 site chrome
sveltia: @sveltia/cms 0.221.0 bundled · 0 CDN script tag
preview css: site CSS inlined in the admin bundle (.prose, --color-bg, @font-face Nebula Sans)
dev-only: 0 test-repo seed marker · 0 /src/content/ key in dist/_astro
isolation: admin bundle referenced by 1/52 pages
config: dist/admin/config.yml = public/admin/config.yml
```
Exit 1 if a line differs (e.g. a `<link rel="stylesheet">` or the site header in the admin page, an `unpkg.com` script, the seed marker or a `/src/content/` glob key in any `dist/_astro/*.js`, an admin chunk referenced by a site page).

## Criteria
| ID | Criterion | Measure | Guarantee |
|---|---|---|---|
| R0 | The author opens `/admin/` **in dev and in production** (no more `/admin/index.html` in dev — D01 closed) and gets Sveltia **0.221.0**, served by `src/pages/admin/index.astro` (standalone page, `noindex`, no `BaseLayout`, not indexed by Pagefind) whose script `src/admin/cms.ts` imports `@sveltia/cms` from npm at an **exact** version; `public/admin/index.html` is gone, `public/admin/config.yml` stays YAML; opening any article, the preview pane shows the site's typography and colours (site CSS injected with `registerPreviewStyle`); no thematic break other than `---` remains in `src/content/**` and a test fails if one comes back; `delete` is re-enabled on the four collections **only if** deleting an entry in Sveltia 0.221 removes the references to it from other entries (proven), otherwise stays `false` with the finding logged; README updated | reachability walkthrough on dev then on preview: every Reachability path reaches its screen; R1–R18 hold | no |
| R1 | The admin page is a standalone Astro page | `npx vitest run src/lib/cms-config.test.ts` → « sert /admin depuis une page Astro autonome, noindex, sans BaseLayout » (reads `src/pages/admin/index.astro`: `<meta name="robots" content="noindex">`, `cms-config-url` link to `/admin/config.yml`, no layout import, one `<script>` importing `../../admin/cms`) and « n’a plus de public/admin/index.html ; la config reste un YAML valide dans public/admin/ » pass | yes |
| R2 | Sveltia pinned exactly from npm | same file → « épingle @sveltia/cms à 0.221.0 exactement (package.json sans ^ ni ~, lock résolu) » and « importe @sveltia/cms depuis npm, sans CDN » (`src/admin/cms.ts` imports `@sveltia/cms`, no `unpkg`) pass | yes |
| R3 | Built output | `npm run build 2>&1 \| grep -o 'Indexed [0-9]* pages'` → `Indexed 12 pages`; `node scripts/check-admin.mjs` → the 6 lines above, exit 0; exit 1 on one injected defect per line | yes (check-admin) |
| R4 | Dev serves `/admin/` | dev server: `curl -s -o /dev/null -w '%{http_code}' http://localhost:4321/admin/` → `200`, body contains `noindex`; `curl -s http://localhost:4321/admin/config.yml \| cmp - public/admin/config.yml` → identical | no |
| R5 | Board loads in dev | walkthrough: `/admin/` shows « Work with Local Repository » and the access-token button; `/admin/?test-repo` › « Work with Test Repository » › collections Articles 6, Projets 2, Prompts 3, Skills 2 entries, titles = the repo's | no |
| R6 | Production path, no test backend | preview (`npm run build && npx astro preview`): `/admin/` shows the GitHub sign-in (access-token button); `/admin/?test-repo` shows the same screen, no « Work with Test Repository » | no |
| R7 | Clean load | during R5, R6 and R9: 0 console error, 0 request answered 4xx/5xx (fonts and Sveltia chunks included) | no |
| R8 | Preview CSS prepared for a `blob:` stylesheet | `npx vitest run src/admin/previewStyle.test.ts` → « rend absolues les url() racine vers l’origine », « laisse intactes les url absolues, data: et relatives », « enregistre le CSS du site en brut une seule fois » pass | yes |
| R9 | Article preview in the site's typography and colours | `/admin/?test-repo` › Articles › `k9s-kubernetes-terminal-ui` › preview iframe: `<html>` background `rgb(241, 244, 247)`, a body `<p>` colour `rgb(40, 50, 61)`, its `font-family` starts `"Nebula Sans"`, and after `document.fonts.ready` a `FontFace` « Nebula Sans » is `loaded`; same checks on `meilleurs-vpn-2025` | no |
| R10 | Native code colouring measured (input for plan 21) | same preview (k9s): evidence records the number of `<pre>` and of those holding ≥ 1 element with an inline or class colour, verdict « Sveltia colours code natively: yes/no » | no |
| R11 | Rule guard | `npx vitest run src/lib/thematicBreaks.test.ts` → « aucun séparateur autre que --- dans src/content/** », « signale - - -, ***, ___, * * *, _ _ _ et leurs variantes indentées », « ignore le frontmatter, les blocs de code ``` et ~~~, ***gras*** et les listes » pass; red when `***` is added between blank lines to any content body | yes |
| R12 | Normalisation is syntax only | `git diff -U0 edd2791 -- src/content \| grep -E '^[-+]' \| grep -vE '^(\+\+\+\|---) ' \| sort \| uniq -c` → `2 -***`, `23 -- - -`, `25 +---`; `git diff edd2791 --stat -- src/content` → 4 files; the 4 articles' `dist` HTML identical to a base build (hash-normalised) | no |
| R13 | Editor rules written back as `---` | `npx vitest run src/admin/hooks.test.ts` → « réécrit en --- un séparateur *** ou ___ du corps, hors blocs de code », « insère une ligne vide avant --- si la ligne précédente est du texte », « rend l’entrée telle quelle quand le corps n’a rien à changer », « cms.ts enregistre ce hook sur preSave » pass | yes |
| R14 | A CMS save keeps `---` | `/admin/?test-repo` › `bienvenue-dans-mon-foutoir` › add then remove one character in the body › Save › the OPFS file `sveltia-cms-test/src/content/blog/bienvenue-dans-mon-foutoir/index.md` has 2 `---` rule lines, 0 `***`/`___` rule lines | no |
| R15 | Delete option matches the proof | `npx vitest run src/lib/cms-config.test.ts` → if R16 holds: « autorise la suppression sur les quatre collections : Sveltia 0.221 retire les rétro-références » and « garde les quatre relations optionnelles (sinon Sveltia bloque la suppression) » pass; if R16 fails: « interdit la suppression sur les quatre collections (D08 maintenu) » passes and the finding is in README and the evidence | yes |
| R16 | Deletion removes back-references and keeps the build green | `/admin/?test-repo`, one delete per collection, reading OPFS after each: project `gha-svu` → `comment-jutilise-github-actions-au-quotidien` no longer lists it; article `bienvenue-dans-mon-foutoir` → `site-bencat.relatedPosts` no longer lists it; prompt `bootstrap-session-anti-drift` → `anti-drift-planning.relatedPrompts` = `[decouper-un-projet-en-plans-anti-drift]`; then skill `anti-drift-planning` → `decouper-un-projet-en-plans-anti-drift` no longer lists it. The rewritten files copied into a scratch worktree at the plan tip with the 4 folders removed: `npm run build` → 0 errors | no |
| R17 | README | `grep -c 'admin/index.html' README.md` → `0`; `grep -c 'localhost:4321/admin/' README.md` ≥ `1`; `grep -c '?test-repo' README.md` ≥ `1`; `grep -c '@sveltia/cms' README.md` ≥ `1`; the « Supprimer une entrée » section states the R15 outcome (`grep -c 'delete: false' README.md` → `0` if R16 holds); the `---` rule and its guard test are named | no |
| R18 | Nothing else moves | `npx vitest run` → 0 failed, > 399 tests; `npm run check` → `0 errors`; after build, the 51 site pages' HTML identical to base (hash-normalised) except the 4 articles of R12 — and those identical too; every other `scripts/check-*.mjs` prints its base lines; `git diff edd2791 --stat -- docs/anti-drift .github/workflows src/content.config.ts src/components src/layouts src/styles` → empty | no |

## Shared resources
- `package.json`, `package-lock.json` (one exact dependency added — T2 only).
- `src/admin/cms.ts` (T2 creates; T3, T4, T5 each add one registration — sequential).
- `src/lib/cms-config.test.ts` (T2 page tests, T6 delete tests), `public/admin/config.yml` (T6 only).
- `dist/`, port 4321, a base build in a scratch worktree at `edd2791` (R12, R18). The browser's OPFS `sveltia-cms-test` is reset by each `?test-repo` load. No version bump; publication is the run's single end escalation.

## Tasks
### T1 — Rule detector, guard test, content normalisation
- Files: `src/lib/thematicBreaks.ts` (new: `findThematicBreaks(markdown)` → `{ line, text }[]` for every rule not exactly `---`, skipping frontmatter and fenced code; `normalizeThematicBreaks(body)`), `src/lib/thematicBreaks.test.ts` (new), the 4 content files (rule lines only)
- Covers: R11, R12
- Acceptance: R11 tests pass (and red with a scratch `***` in a content copy); R12 diff counts; `npm run build` → the 4 articles' HTML identical to the base build
- Depends on: —

### T2 — Astro admin page on npm Sveltia
- Files: `package.json`, `package-lock.json` (`npm install --save-exact @sveltia/cms@0.221.0`), `src/pages/admin/index.astro` (new: `<html lang="fr">`, charset, viewport, `noindex`, title, `<link rel="cms-config-url" type="application/yaml" href="/admin/config.yml">`, one `<script>` importing `../../admin/cms`; no layout, no `data-pagefind-body`), `src/admin/cms.ts` (new: `import CMS from '@sveltia/cms'` then `CMS.init()`), delete `public/admin/index.html`, `src/lib/cms-config.test.ts` (« page /admin » block rewritten), `scripts/check-admin.mjs` (new), `astro.config.mjs` only if dev shows Sveltia chunk 404s (then `optimizeDeps.exclude`)
- Covers: R1, R2, R3 (page, sveltia, isolation, config lines), R4
- Acceptance: R1/R2 tests pass; `npm run check` → `0 errors`; `npm run build && node scripts/check-admin.mjs` → lines 1, 2, 5, 6 as above, `Indexed 12 pages`; dev server + R4 curls → `200` and identical config; 51 site pages' HTML identical to base (hash-normalised)
- Depends on: —

### T3 — Site CSS in the preview
- Files: `src/admin/previewStyle.ts` (new: `absolutizeCssUrls(css, origin)`, `registerSiteStyle(cms, css, origin)`), `src/admin/previewStyle.test.ts` (new), `src/admin/cms.ts` (`import siteCss from '../styles/global.css?inline'`, register with `{ raw: true }` before `init`), `scripts/check-admin.mjs` (line 3)
- Covers: R8, R3 (preview css line); rendered R9/R10 by the verifier
- Acceptance: R8 tests pass; `npm run build && node scripts/check-admin.mjs` → line 3 present, exit 0; `dist/admin/index.html` still has 0 stylesheet link
- Depends on: T2

### T4 — `preSave` rule normaliser
- Files: `src/admin/hooks.ts` (new: handler taking the Immutable-shaped entry — `get('data').get('body')`, `setIn(['data','body'], …)` — using `normalizeThematicBreaks`), `src/admin/hooks.test.ts` (new; a minimal `get`/`setIn` fake, and a source read of `cms.ts` for the registration), `src/admin/cms.ts` (`registerEventListener({ name: 'preSave', handler })`)
- Covers: R13; rendered R14 by the verifier
- Acceptance: R13 tests pass; `npm run check` → `0 errors`
- Depends on: T1, T3 (sequential edit of `cms.ts`)

### T5 — Dev-only test backend seeded from `src/content`
- Files: `src/admin/dev/testRepo.ts` (new: exported seed-marker constant; `import.meta.glob('/src/content/**/*', …)` — markdown `?raw`, images `?url` then fetched; clears then writes `sveltia-cms-test/<path>` in OPFS), `src/admin/dev/testRepo.test.ts` (new: path mapping and writes on a fake directory handle), `src/admin/cms.ts` (`if (import.meta.env.DEV && new URLSearchParams(location.search).has('test-repo'))` → dynamic import, seed, `CMS.init({ config: { backend: { name: 'test-repo' } } })`; else `CMS.init()`), `src/lib/cms-config.test.ts` or `hooks.test.ts` (« ne charge le dépôt de test que sous import.meta.env.DEV »), `scripts/check-admin.mjs` (line 4)
- Covers: R3 (dev-only line), R5, R6 (built by this task, walked by the verifier)
- Acceptance: new tests pass; `npm run build && node scripts/check-admin.mjs` → all 6 lines, exit 0, and exit 1 after a scratch build with the `DEV` guard removed
- Depends on: T4 (sequential edit of `cms.ts`)

### T6 — Delete re-enabled on the four collections
- Files: `public/admin/config.yml` (`delete: true` ×4, D08 comments replaced by the cascade finding), `src/lib/cms-config.test.ts` (D08 block replaced by the R15 tests)
- Covers: R15; R16 by the verifier — **if R16 fails, the fix round sets `delete: false` back, restores a four-collection D08 test and writes the finding in README**
- Acceptance: R15 tests pass; `node -e` over the YAML → 4 × `delete: true`, 4 relation fields without `required: true`
- Depends on: —

### T7 — README and no-regression pass
- Files: `README.md` (« Édition du contenu (Sveltia CMS) »: dev URL `/admin/`, npm-pinned 0.221.0 and how to bump it, `/admin/?test-repo` as a dev-only demo board reset on each load, preview CSS, « Supprimer une entrée » per R15, the `---` rule and `thematicBreaks.test.ts`; table row « Page admin » `src/pages/admin/index.astro` + `src/admin/`)
- Covers: R17, R18 (static)
- Acceptance: R17 greps; `npx vitest run` → 0 failed, > 399; `npm run check` → `0 errors`; build + every `scripts/check-*.mjs` → base lines, `check-admin` 6 lines; R18 `git diff --stat` → empty
- Depends on: T1–T6

### F1 — Cold dep cache: pre-bundle Sveltia (fix for R7, R0)
- Files: `astro.config.mjs` (`vite.optimizeDeps.include: ['@sveltia/cms']`, commented), `src/lib/cms-config.test.ts` (one test reading `astro.config.mjs`)
- Covers: R7, R0
- Acceptance: with `node_modules/.vite` removed, start the dev server, first visit `/admin/` then `/admin/?test-repo` → 0 request answered 4xx/5xx and 0 console error (walked by the orchestrator); `npx vitest run` green; the 51 site pages' built HTML identical to base
- Depends on: T7

### F2 — Test-board seed test must not pin the entry count (finding 1)
- Files: `src/admin/dev/testRepo.test.ts` (the glob must cover exactly the `index.md` files found on disk, counted at test time — no literal `13`)
- Covers: R18 (a CMS create/delete must not turn `npm test` red)
- Acceptance: tests green at tip; in a scratch copy, adding `src/content/blog/nouvel-article/index.md` (valid frontmatter) and deleting `src/content/projects/gha-svu/` leaves `npx vitest run src/admin/dev/testRepo.test.ts` green
- Depends on: F1

### F3 — Content-pinning tests tolerate the author's CMS deletes and edits (finding 2)
- Files: `src/lib/projectContent.test.ts`, `src/lib/promptContent.test.ts`, `src/lib/skillContent.test.ts`, `README.md` (« Supprimer une entrée »: CI runs `npm test`, and what the content tests still guard)
- Keep every **generic** invariant (roles verbatim from the project's own text, variables occur in their prompt, no `No content` body, excerpt limits, changelog order, unique relative paths, no e-mail). Turn every **entry-specific snapshot** (exact values of `gha-svu`, `site-bencat`, `bootstrap-session-anti-drift`, `macos-clone`, `superpowers`…) into a check that runs only while that entry still holds the value sourced at wave 3 — or drop it when it only restates the source — so that deleting or editing an entry through the CMS never turns `npm test` red; each changed test says why in its comment (D131)
- Covers: R16/R18 follow-up (CI stays green after a CMS delete or edit)
- Acceptance: tests green at tip; in a scratch copy, deleting `src/content/projects/gha-svu/` and `src/content/prompts/bootstrap-session-anti-drift/` (and removing their references), then editing `macos-clone`'s prompt to one line → `npx vitest run` 0 failed; the generic invariants still go red on an injected defect (a variable absent from its prompt; a body `No content`)
- Depends on: F2

## Out of scope
- Title, logo, icons, summaries, filters, groups, `preview_path` (plan 20); preview templates, dark theme or `.prose` wrapper in the preview, Shiki with `syntaxTheme` (plan 21); defaults, date hook, WebP, commit messages, ✏️ button (plan 22); editor blocks (plan 23).
- Cleaning links to a deleted entry inside prose bodies (not relation fields; they do not break the build).
- `@types/react` (optional peer of Sveltia's types; `npm run check` must pass without it), any content change beyond the 25 rule lines, any schema change.
- Version bump, tag, merge, push, deploy — the orchestrator's single end escalation.

## Evidence
### Verification attempt 1 (tip `deeaef5`, base `edd2791`) — 16/19 proven, R0 + R7 failed
| Criterion | Verdict | Evidence |
|---|---|---|
| R0 | failed | every Reachability path reaches its screen (dev `/admin/`, dev `/admin/?test-repo` › board › article › preview, preview `/admin/`), but a cold Vite dep cache makes the first `/admin/` visit answer a 504 (see R7) |
| R1 | proven | both named tests pass; red on a `BaseLayout` import, on `noindex` removed, on `public/admin/index.html` recreated |
| R2 | proven | both tests pass; red on `"^0.221.0"` and on an unpkg import in `cms.ts` |
| R3 | proven | `Indexed 12 pages`; check-admin 6 lines exit 0; exit 1 on one injected defect per line (stylesheet link, `<header>`, unpkg script, `.prose{` removed, seed marker, `/src/content/` key, admin chunk on `/`, config byte) and on a real rebuild without the DEV guard (`dev-only: 1 test-repo seed marker · 23 /src/content/ key`) |
| R4 | proven | `curl /admin/` → `200` with `<meta name="robots" content="noindex">`; `/admin/config.yml` `cmp` identical |
| R5 | proven | `/admin/` shows « Travailler avec un dépôt local », « Se connecter avec GitHub », « Se connecter avec un jeton d'accès »; `?test-repo` board Articles 6 · Projets 2 · Prompts 3 · Skills 2, titles = the 13 `index.md`; console `Parsed 13 entries (0 errors)` |
| R6 | proven | preview: `/admin/` and `/admin/?test-repo` show the same 3 buttons, no test-repo button; OPFS `[]`; 0 failed request; 0 console error |
| R7 | failed | warm dev and preview clean (67 requests, 0 4xx/5xx, 0 console error); cold dep cache: `GET /@id/astro/runtime/client/dev-toolbar/entrypoint.js → 504 (Outdated Optimize Dep)` after `optimized dependencies changed. reloading`, persisting until restart; reproduced twice; `vite.optimizeDeps.include: ['@sveltia/cms']` gives 200 in a scratch worktree |
| R8 | proven | 3 tests pass; red on identity `absolutizeCssUrls`, `{ raw: false }`, `//` URLs prefixed |
| R9 | proven | k9s preview iframe: `<html>` bg `rgb(241, 244, 247)`, `<p>` `rgb(40, 50, 61)`, font-family `"Nebula Sans", …`, Nebula Sans 400/700 `loaded` (200 from `/node_modules/@fontsource/…`); same on `meilleurs-vpn-2025` |
| R10 | proven | k9s: 29 `<pre>`, 29 coloured (`<pre class="shiki github-dark" …>`) — **Sveltia colours code natively: yes**, with `github-dark`, not the site's `syntaxTheme` (input for plan 21) |
| R11 | proven | 3 named tests pass; red on `***` in k9s, `- - -` in a prompt, indented `___` in a skill, `-`-only detector, fences not skipped |
| R12 | proven | `25 +---`, `2 -***`, `23 -- - -`, 4 files; the 3 built articles byte-identical to base; `bienvenue-dans-mon-foutoir` is a draft (not built) — rendered-markdown equality shown at T1 |
| R13 | proven | 4 tests pass; red on unchanged return, listener removed, `postSave`, no blank line |
| R14 | proven | `bienvenue-dans-mon-foutoir` edited then saved: OPFS rule lines `[33,"---"],[57,"---"]`, 0 `***`/`___`; the save also added `featured: false` (plan 21 byte-for-byte input) |
| R15 | proven | both tests pass; red on prompts `delete: false`, `required: true` and `min: 1` on `relatedSkills` |
| R16 | proven | confirm dialog « The reference to it in another entry will be removed as well »; after each delete only the referencing file changes (gha-svu → `comment-jutilise…` loses `relatedProjects`; bienvenue → `site-bencat` loses `relatedPosts`; bootstrap → `anti-drift-planning.relatedPrompts = [decouper-un-projet-en-plans-anti-drift]`; anti-drift-planning → `decouper…` loses `relatedSkills`); an emptied list is **omitted**; rewritten files (SHA-256 = OPFS) in a scratch tip worktree with the 4 folders removed: `npm run build` exit 0, 0 error |
| R17 | proven | greps 0 · 2 · 3 · 3 · 0 · 1; « Supprimer une entrée » states delete on with cascade; `---` section names hook and guard |
| R18 | proven | 428 passed, 0 failed; `0 errors`; 51 site pages byte-identical to base; 12 other `check-*.mjs` identical; frozen `git diff --stat` empty |

Findings outside criteria (attempt 1): (1) **high** `src/admin/dev/testRepo.test.ts:103` hard-codes `toBe(13)` — any CMS create/delete turns `npm test` red and CI blocks the deploy; (2) **medium** deleting `gha-svu` or `bootstrap-session-anti-drift` through the CMS turns 6 content-pinning tests red (`projectContent.test.ts` ×2, `promptContent.test.ts` ×4) — CI blocks the deploy although `npm run build` is green; the same pins block ordinary CMS edits of those entries; (3) low: `bienvenue-dans-mon-foutoir` body images requested at the site root in the preview (404 ×3) — plan 21 input; (4) low: a save rewrites the whole frontmatter — plan 21 input; (5) info: `dist/` 9.9 → 26 MB (admin-only chunks), Sveltia fetches `githubstatus.com` on load.
