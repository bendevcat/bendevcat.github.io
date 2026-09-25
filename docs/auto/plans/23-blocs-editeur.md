# Plan 23 — blocs-editeur

Brief: `docs/auto/brief.md` · Branch: `auto/plan-23-blocs-editeur` · Base: `ead7b81` (plans 19–22 merged)

## Goal
In the article editor the author inserts, from the toolbar, four blocks through a form — callout (note / astuce / attention / danger), titled terminal (CodeWindow style), card to a site entry (chosen from the real entries, not a typed URL), video embed (YouTube or asciinema by id, loaded on demand behind a facade) — each stored as a `:::` directive; the preview pane and the published article render each block in the site's style (tokens only, both themes, AA); markdown → form → markdown round-trips identically for each block (multiline included)

Carried from plan 22's verification: the site CSS stops being fed by admin files (`.lowercase` from `public/admin/config.yml`), and the README's « Cancel » becomes « Annuler ».

## Reachability
Author: `/admin/` › Articles › an article (or « New Article ») › Contenu › the toolbar's Insert menu › Encadré / Terminal / Carte / Vidéo › form › Save; the preview pane shows the block; after the deploy, `/blog/<slug>/` shows it. No path exists today: T4 creates the menu items, T1 the rendering.
Agent (dev): `npx astro dev --background` › fresh tab `/admin/?test-repo` › « Work with Test Repository » › same steps (OPFS). No `src/content/**` entry uses a block (content frozen, no sourced use — no demo content is added), so the published rendering is reached through a **scratch build**: a disposable worktree at the tip, `src/lib/blocks/fixtures/blocs-demo.md` copied to `src/content/blog/blocs-demo/index.md`, `npm run build && npx astro preview` › `/blog/blocs-demo/`.

### Built facts (Sveltia 0.221.0 `npm/index.js.map` sources; Astro 7 `@astrojs/markdown-remark`)
- `registerEditorComponent` throws unless `id`, `label` non-empty, `pattern` a RegExp, `toBlock` **and `toPreview`** functions, `fields` an array (`services/api/index.js`). Options: `icon`, `trigger` (`menuitem` = Insert menu, default; `button`), `mode` (`block` default, `dialog`), `collapsed`, `summary`. Stored under id `x-<id>`.
- Components enabled per field by `editor_components` (default: `code-block`, `image` + **every** registered custom component, on every markdown field); a component's nested markdown field inherits `allow_nested_components` from the parent field.
- A pattern is multiline when it has `m`/`s` flags or `[\s\S]` (`components/utils.js`). Import: at each line, the rest of the document is matched with the non-global pattern and must **start** at that line; props = `fromBlock(match) ?? match.groups`. Export: `toBlock(props)` minus `__sc_*` keys. On open, component values pass `normalizeContent(fillDefaults: false)`.
- Component fields are ordinary fields (`FieldEditor`). `relation` takes one `collection`; no public API exposes loaded entries (API = `getFieldType, init, registerCustomFormat, registerEditorComponent, registerEventListener, registerFieldType, registerPreviewStyle, registerPreviewTemplate, renderRichText`). Bundled Lexical: 0.51.0.
- Site pipeline order: remark-parse › gfm › smartypants › **user remark plugins** › remark-rehype › Shiki › user rehype plugins. Shiki highlights only a `pre` whose single child is `code`: CodeWindow's gutter + `code` markup is left alone.
- `src/content/**`: no line starts with `:::`; `:name` text appears in k9s (tables, code). `remark-directive` is not installed; `micromark-extension-directive@4.0.0`, `mdast-util-directive@3.1.0` are current.

### Design (binding)
- **Syntax** (all container directives, fence `:::`, longer when the content holds a line starting with `:::`):
  `:::note` / `:::astuce` / `:::attention` / `:::danger` + markdown + `:::` ·
  `:::terminal[<titre>]` + one fenced code block (```` ```<lang?> ````, fence longer than any backtick run in the code) + `:::` ·
  `:::carte{ref="<collection>/<id>"}` + `:::` ·
  `:::video[<titre>]{youtube="<id>"}` or `{asciinema="<id>"}` + `:::`.
  Canonical = what `toBlock` writes, blank line before and after. Titles: one line, no `[`/`]`. Ids: YouTube `^[A-Za-z0-9_-]{11}$`, asciinema `^[A-Za-z0-9]{1,32}$`; ref `^(blog|projects|prompts|skills)/[a-z0-9-]+$`.
- **One syntax module** `src/lib/blocks/syntax.mjs` (`@ts-check`): names, patterns, `fromBlock`, `toBlock`, validators — imported by the site plugin, the Sveltia definitions and the canonical guard.
- **Parser**: only the container construct of `micromark-extension-directive` is registered (text `:x` and leaf `::x` are not parsed at all), plus `mdast-util-directive`'s from-markdown; both exact versions in `dependencies`. `remarkBlocks` is added to `markdownOptions.mjs` (the object stays shared by `astro.config.mjs` and the preview, D138).
- **Rendering** (mdast `data.hName/hProperties/hChildren`; classes written in full, tokens only):
  callout = `<aside role="note" data-callout="<kind>" aria-label="<Note|Astuce|Attention|Danger>">` with its label and the rendered markdown, tones note→blue, astuce→green, attention→amber, danger→rose (`tag<Tone>*` tokens), indexed by Pagefind;
  terminal = CodeWindow's markup (`figure[data-code-window][data-terminal]`, bar, dots, title chip, hidden « Copier », numbered gutter, lines from `codeWindowLines(code, title)`), not Shiki-coloured, indexed like article code;
  card = `<a data-entry-card="<ref>" data-pagefind-ignore href="/<blog|projets|prompts|skills>/<id>/">` with kind label, title and description of the target (base paths tied to `preview_path`);
  video = `<figure data-video data-provider data-video-id data-pagefind-ignore>` holding one `<a href>` to `https://www.youtube.com/watch?v=<id>` / `https://asciinema.org/a/<id>` with the title, a play glyph and « Lecture sur <fournisseur> au clic » — always-dark `window*` tokens, 16:9; no `<img>`, no `<iframe>`, no third-party URL other than that `href`.
  Unknown container name → error. Scripts: the article page adds `src/scripts/video-facade.ts` / `code-window.ts` only when its body holds a video / terminal (flag from `remarkPluginFrontmatter`).
- **Facade script** (vanilla, `src/scripts/video-facade.ts`; URLs from `src/lib/videoEmbed.ts`): plain click or Enter on the link (no modifier, primary button) → `preventDefault`, the link is replaced by `<iframe title="<titre>" src="https://www.youtube-nocookie.com/embed/<id>?autoplay=1">` (asciinema: `https://asciinema.org/a/<id>/iframe?autoplay=1`), `allow` autoplay/encrypted-media/picture-in-picture/fullscreen, `allowfullscreen`, focus moved to it; nothing is requested before.
- **Entry index** `{collection, id, title, description, draft}`: in Node read from `src/content/*/*/index.md` on each render that holds a card (`src/lib/blocks/readSiteEntries.mjs`, Node-only); in `/admin/` a build-time virtual module (Vite plugin in `src/admin/`, admin graph only). `src/lib/blocks/siteEntries.mjs` holds the provider and the missing policy: **site** (`astro.config.mjs` provides the disk reader) → unknown ref, or draft target cited by a non-draft article, **throws** naming the file and the ref (build fails); **preview** → a visible error card « Entrée introuvable : <ref> », no throw. No provider → throws.
- **Sveltia** (`src/admin/blocks/editorComponents.ts`, registered by `cms.ts` before `init`; `trigger: menuitem`, `mode: block`; `toPreview` = short escaped summary, our templates replace Sveltia's preview): Encadré (`info`; `kind` select Note/Astuce/Attention/Danger; `content` markdown with `editor_components: []`, buttons bold/italic/code/link/bulleted-list/numbered-list) · Terminal (`terminal`; `title` string; `lang` string optional; `code` = `code` widget, `output_code_only`, no language selection) · Carte (`bookmark`; `ref` select, options = the index, label `<Article|Projet|Prompt|Skill> · <titre>` + ` 📝` on drafts; no URL field) · Vidéo (`smart_display`; `provider` select YouTube/asciinema; `id` string with a pattern; `title` string). `config.yml`: blog body `editor_components: [code-block, image, encadre, terminal, carte, video]`, `allow_nested_components: false`; projects/prompts/skills bodies `[code-block, image]` (their current set).

## Criteria
| ID | Criterion | Measure | Guarantee |
|---|---|---|---|
| R0 | In the article editor the author inserts, from the toolbar, four blocks through a form — callout (note / astuce / attention / danger), titled terminal (CodeWindow style), card to a site entry (chosen from the real entries, not a typed URL), video embed (YouTube or asciinema by id, loaded on demand behind a facade) — each stored as a `:::` directive; the preview pane and the published article render each block in the site's style (tokens only, both themes, AA); markdown → form → markdown round-trips identically for each block (multiline included) | Reachability walked (agent path + scratch build); R1–R20 hold | no |
| R1 | Canonical syntax | `npx vitest run src/lib/blocks/syntax.test.ts` → « forme canonique des quatre blocs », « toBlock(fromBlock(m)) = m et fromBlock(toBlock(p)) = p » (multiline callout, code holding ```` ``` ```` and `:::`, accents, quotes, empty lang), « ids, titres et ref invalides refusés » pass; red when `toBlock` drops the blank-line rule or the fence lengthening | yes |
| R2 | Site HTML of each block | `npx vitest run src/lib/blocks/remarkBlocks.test.ts` → « encadrés : aside role=note, libellé, markdown rendu, ton » ×4, « terminal : balisage CodeWindow, texte du code exact, non colorié par Shiki », « carte : lien, titre et description de l'entrée, pagefind-ignore », « vidéo : un lien vers le fournisseur, 0 iframe, 0 img, pagefind-ignore » pass | yes |
| R3 | Build fails on a bad block | same file → « ref inconnue : erreur nommant le fichier et la ref », « cible brouillon citée par un article publié : erreur », « id vidéo invalide : erreur », « nom de bloc inconnu : erreur », « sans index fourni : erreur » pass; scratch build with the fixture's ref changed to `blog/inexistant` → exit ≠ 0, output names `blocs-demo` and `blog/inexistant` | yes |
| R4 | Other syntax untouched | same file → « `:pods`, `a:b`, `::x`, `:x[y]{z}` rendus comme sans le plugin » passes; R17 | yes |
| R5 | Preview = site for blocks | `npx vitest run src/admin/previews/markdown.test.ts src/admin/previews/sanitize.test.ts` → existing tests plus « le corps de la fixture est rendu comme par le pipeline du site » and « le HTML des quatre blocs traverse l'assainisseur inchangé ; un <iframe> du contenu est retiré » pass; red when the sanitiser config forbids `aside` or `data-*`, and when `remarkBlocks` leaves `markdownOptions` | yes |
| R6 | Admin entry index | `npx vitest run src/admin/blocks/siteEntries.test.ts` → « module virtuel = entrées lues sur disque (13, brouillons marqués) », « aperçu : ref inconnue → carte d'erreur, pas d'exception », « chemins de carte = preview_path de config.yml » pass | yes |
| R7 | Sveltia definitions and config | `npx vitest run src/admin/blocks/editorComponents.test.ts src/lib/cms-navigation.test.ts` → « quatre composants valides pour registerEditorComponent (id, label, icon, fields, pattern multiligne, toBlock, toPreview) », « options de carte = index, aucune saisie d'URL », « enregistrés avant init », « editor_components : blocs sur les articles seulement » and the Sveltia JSON-schema test pass | yes |
| R8 | Lexical round trip | `npx vitest run src/admin/blocks/roundTrip.test.ts` → « chaque bloc revient identique par l'aller-retour Lexical de Sveltia 0.221 » (fixture, each block alone, adjacent blocks, block at document end, multiline callout and code, nested callout content through its own editor), « les corps réels de src/content reviennent identiques (hors `---`) » pass; red when a pattern loses its `^` anchor | yes |
| R9 | Canonical guard knows blocks | `npx vitest run src/lib/cmsCanonical.test.ts` → « blocs canoniques acceptés » and « bloc non canonique signalé » (unquoted attribute, no blank line around, fence inside a callout, `:::` inside a callout at the same fence length) pass; `node scripts/canonicalize-content.mjs --check` → `canonical: 13/13 entries` | yes |
| R10 | Board: insert and round trip | test board, article « bienvenue »: Insert menu lists Encadré, Terminal, Carte, Vidéo; each inserted through its form and saved → OPFS body holds the canonical directive of R1; reopen → each form shows the saved values; an unedited save is byte-identical (or Save stays disabled); Raw mode: paste the fixture body › rich text › raw → identical text; Carte's select lists every disk entry (count = `src/content/*/*/index.md`), no free URL field; a `ref` absent from the index survives an unedited save; projects/prompts/skills editors offer none of the four | no |
| R11 | Preview pane | same board: each block of the fixture shows in the preview in the site's style; the video shows its facade and 0 request leaves for youtube*, ytimg, asciinema (network panel); the card links to its entry | no |
| R12 | Published rendering | scratch build (Reachability) + `node scripts/check-blocks.mjs --dist <scratch>/dist` → `blocks: /blog/blocs-demo/ · 4 callouts (note, astuce, attention, danger) · 1 terminal · 1 card → /projets/gha-svu/ · 2 video facades (youtube, asciinema)`, `facade: 0 iframe · 0 img · third-party URLs = the 2 facade links · video script loaded`, `pagefind: callout text indexed · card and video text absent`; `node scripts/check-previews.mjs` in the scratch tree → blog count includes `blocs-demo`; exit 1 on a planted iframe | yes (check-blocks) |
| R13 | Facade behaviour | `npx vitest run src/lib/videoEmbed.test.ts` → « youtube-nocookie, autoplay, id validé », « asciinema /iframe » pass; rendered (scratch preview): before click 0 request to a third party; click / Enter → iframe `youtube-nocookie.com/embed/<id>?autoplay=1` focused; asciinema iframe; Ctrl/⌘-click opens the provider page; JS disabled → the link opens `youtube.com/watch?v=<id>` | yes (URL builder) |
| R14 | Site style, both themes, AA | `npx vitest run src/lib/blocks/tokens.test.ts` → « aucune couleur littérale », « paires texte/fond des blocs ≥ 4.5:1 dans les deux thèmes (global.css) » pass; rendered `/blog/blocs-demo/` at 375 and 1280, light and dark: `scripts/audit-rendered.js` → 0 overflow, 0 contrast finding, 0 off-token colour; terminal and facade identical in both themes | yes (test) |
| R15 | Scripts only where used | `node scripts/check-blocks.mjs --dist dist` (real content) → `blocks: 0 on <n> pages · video script on 0 pages · terminal script on 0 blog pages`; scratch: loaded on `blocs-demo` | yes (check-blocks) |
| R16 | Site CSS not fed by admin files | `global.css` has `@source not` for `public/admin` and `src/admin`; built site CSS: no `.lowercase` rule; every other base declaration present; `node scripts/check-previews.mjs` green | no |
| R17 | Existing site unchanged | `node scripts/check-blocks.mjs --dist dist --base <base dist>` → `site pages: <n> identical to base` (stylesheet hash normalised, as check-edit-link) and Pagefind index/fragments identical; `Indexed 12 pages` | yes (check-blocks) |
| R18 | README | « Édition du contenu » gains « Blocs de l'éditeur » (syntax, forms, entry list refreshed at each deploy / dev restart, deleting an entry cited by a card fails the build — remove the card first, video privacy); `grep -c 'Blocs de l' README.md` ≥ 1, `grep -c 'Cancel' README.md` → 0, `grep -c 'Annuler' README.md` ≥ 1 | no |
| R19 | Nothing else moves | `npx vitest run` → 0 failed, > 559; `npm run check` → `0 errors`; every `scripts/check-*.mjs` prints its base lines (check-admin isolation `1/<pages>`, dev-only unchanged); `git diff ead7b81 --stat -- .github/workflows docs/anti-drift src/content.config.ts src/content` → empty | no |
| R20 | Clean console | R10, R11, R13 walks: 0 console error; warnings ⊆ base | no |

## Shared resources
- `package.json`/lock: T1 (`micromark-extension-directive`, `mdast-util-directive`, exact, `dependencies`), then T5 (`lexical` + `@lexical/{markdown,code-core,extension,link,list,rich-text,table}` 0.51.0 exact, `devDependencies`).
- `src/lib/markdownOptions.mjs`, `astro.config.mjs`: T1 (provider), then T4 (virtual-module plugin). `public/admin/config.yml`, `src/admin/cms.ts`: T4. `src/lib/cmsCanonical.ts`: T5. `src/styles/global.css`, `README.md`: T7. Design tokens: read only.
- Fixture `src/lib/blocks/fixtures/blocs-demo.md` (T1; valid published frontmatter, card → `projects/gha-svu`, one video per provider, unique callout words). Base build in a scratch worktree at `ead7b81`; scratch tip worktree with the fixture; dev port; OPFS `sveltia-cms-test`. No version bump.

## Tasks
### T1 — Syntax, parser, site rendering, entry index
- Files: `src/lib/blocks/{syntax.mjs,remarkBlocks.mjs,siteEntries.mjs,readSiteEntries.mjs}` + tests, fixture, `src/lib/markdownOptions.mjs`, `astro.config.mjs`, `src/admin/previews/diskEntries.ts` (Node provider for check-previews), `package.json`/lock
- Covers: R1–R4, R14 (test)
- Acceptance: the three test files and `tokens.test.ts` green, named red cases red; `npx vitest run` 0 failed; `npm run build` exit 0, `Indexed 12 pages`
- Depends on: —

### T2 — Facade and conditional scripts
- Files: `src/lib/videoEmbed.ts` + test, `src/scripts/video-facade.ts`, `src/pages/blog/[...slug].astro`
- Covers: R13 (URL builder), R15
- Acceptance: `npx vitest run src/lib/videoEmbed.test.ts` green; build → no page references `video-facade`; scratch build → `blocs-demo` does
- Depends on: T1

### T3 — `scripts/check-blocks.mjs`
- Files: `scripts/check-blocks.mjs`
- Covers: R12, R15, R17
- Acceptance: R15/R17 lines on `dist` vs a base build; R12 lines on the scratch build; exit 1 on a planted iframe and on a removed `data-pagefind-ignore` (scratch copies)
- Depends on: T1, T2

### T4 — Sveltia components and admin index
- Files: `src/admin/blocks/{editorComponents.ts,siteEntries.test.ts,editorComponents.test.ts}`, `src/admin/viteSiteEntries.mjs` (virtual module), `astro.config.mjs`, `src/admin/cms.ts`, `public/admin/config.yml`, `src/admin/previews/{markdown,sanitize}.test.ts`
- Covers: R5, R6, R7
- Acceptance: named tests green; `npm run check` → `0 errors`; build + `node scripts/check-admin.mjs` → base lines (isolation `1/<pages>`, dev-only 0)
- Depends on: T1

### T5 — Lexical round-trip replica and canonical guard
- Files: `src/admin/blocks/lexicalRoundTrip.ts` (test-only, never imported by `cms.ts`: plan 21 F2 replica — @sveltia/ui 0.77.0 transformers, Sveltia's `createTransformer` for custom components, MIT notice) + `roundTrip.test.ts`, `src/lib/cmsCanonical.ts` + test, `package.json`/lock
- Covers: R8, R9
- Acceptance: named tests green, red cases red; `node scripts/canonicalize-content.mjs --check` → `canonical: 13/13 entries`; `check-admin` dev-only and isolation unchanged
- Depends on: T1, T4

### T6 — README
- Files: `README.md`
- Covers: R18
- Acceptance: R18 greps
- Depends on: T4

### T7 — CSS sources and no-regression pass
- Files: `src/styles/global.css` (`@source not "../../public/admin"`, `@source not "../admin"`)
- Covers: R16, R17, R19 (static)
- Acceptance: built CSS without `.lowercase`, base declarations otherwise present; `npx vitest run` > 559, 0 failed; `npm run check` 0 errors; every `scripts/check-*.mjs` + `check-blocks --base` → expected lines; frozen diff empty
- Depends on: T1–T6

## Out of scope
- Demo content in `src/content/**` (frozen; no sourced use); blocks in the project, prompt and skill editors (the site renders them if hand-written; their scripts are wired on article pages only).
- Nested blocks, code fences inside a callout; callout titles; a live entry list inside Sveltia (relation per collection); video thumbnails (third-party request); self-hosting Sveltia's Shiki (D142).
- Version bump, tag, merge, push.

### T4b — Terminal code field refuses ``` runs (D156)
- Files: `src/admin/blocks/editorComponents.ts` (+ test), the replica test (`roundTrip.test.ts`) if useful
- The Terminal component's `code` field gets a `pattern` refusing any run of 3+ backticks, with a French message; verify the pattern option is honoured for the `code` widget inside an editor component in Sveltia 0.221 (source); if it is not, use the `text` widget and prove the round trip still holds
- Acceptance: tests (a code value with ``` is refused by the field validation used by Sveltia — test through the same validator code path, or prove from source); round-trip tests green
- Depends on: T5

## Evidence
### Verification attempt 1 — 19/21 proven; R20 and T4b failed; R0 failed through them
| Criterion | Verdict | Evidence |
|---|---|---|
| R0 | failed | reachability walks pass (board by clicks, scratch `/blog/blocs-demo/`); fails through R20 and T4b |
| R1 | proven | 19 tests; red on blank-line rule removed (3), fixed `:::` (3), fixed ``` (1), permissive ref |
| R2 | proven | red on no `role=note` (4), terminal left to Shiki (2), card/video without pagefind-ignore, `<img>` in facade |
| R3 | proven | 5 tests, red on each mutation; scratch build with `ref="blog/inexistant"` exit 1 « ref inconnue », card to the draft exit 1 « brouillon (draft: true) cité par une entrée publiée » (no-provider test weak — finding 3) |
| R4 | proven | `:pods`, `a:b`, `::x`, `:x[y]{z}` stay text; red with full `directive()` |
| R5 | proven | red on FORBID `aside` (1), `ALLOW_DATA_ATTR:false` (3), `remarkBlocks` removed (2) |
| R6 | proven | red on draft forced false (2), `/projects/` (1), preview mode throwing (1) |
| R7 | proven | red on registration after `init`, `encadre` on projects, URL field on Carte (2), icon removed, bad `allow_nested_components`, `carte` dropped |
| R8 | proven | 9 tests; red on internal `^` anchors removed (3 each); leading `^` redundant under Sveltia's line-start rule |
| R9 | proven | 13/13 canonical; red on each guard mutation |
| R10 | proven | Insérer lists Encadré/Terminal/Carte/Vidéo on the article body only (no Insérer on projects/prompts/skills); 8 blocks inserted via forms, card from 13 options; OPFS blocks = `toBlock(fromBlock(m))`; reopen shows the values; unedited save byte-identical; raw-mode paste identical; unknown ref survives an unedited save |
| R11 | proven | preview: 4 callouts in tone tokens, terminal, card → `/projets/gha-svu/`, 2 facades, 0 iframe; 0 request to youtube/ytimg/asciinema in ~1 250 requests (light only in this walk) |
| R12 | proven | `check-blocks --dist <fixture dist>` 3 lines exit 0; exit 1 on iframe, card pagefind attr removed, extra ytimg URL; check-previews `blog 6/6` in the scratch build |
| R13 | proven | click → `youtube-nocookie.com/embed/aqz-KE-bpKQ?autoplay=1` focused; Enter → asciinema `/a/335480/iframe?autoplay=1` focused; ⌘-click opens the provider page; JS off → plain provider links; 0 third-party request before click |
| R14 | proven | tokens test red on a literal colour / unmeasured token / palette class; audit-rendered at 375/1280, light/dark: no overflow, 0 contrast finding, 0 off-token colour |
| R15 | proven | real content: 0 blocks, 0 block scripts; fixture: both scripts on `blocs-demo`; planted video script on k9s → exit 1 |
| R16 | proven | both `@source not`; only `.lowercase` lost; check-previews green |
| R17 | proven | 51 pages + Pagefind identical to ead7b81; one byte changed → exit 1 |
| R18 | proven | greps 4 / 0 / 1; section complete |
| R19 | proven | 648 passed; 0 errors; 15 checks identical base vs tip; check-edit-link green vs 74bc756; frozen diff empty |
| R20 | failed | (a) Terminal/Carte/Vidéo inserted → 2 `console.error` per keystroke until required fields are filled (« Bloc « video » … : titre vide », « Aperçu blog : rendu du corps impossible »); (b) facade click → « Allow attribute will take precedence over 'allowfullscreen' »; (c) typing ``` in the code editor → « Minified Lexical error #66 » |
| T4b | failed | the `pattern` never sees the value: Sveltia's code editor empties or truncates the code as soon as ``` is typed (3 attempts: empty code saved; `echo x ``` y` saved empty; key-by-key leaves `fin`) — silent data loss persists |

Findings: the site iframe `sandbox` / narrowed asciinema `allow` (plan did not specify; D153 context); an unreferenced terminal-script asset in `dist/_astro` on real content (harmless); « sans index fourni : erreur » matches any throw (weak test); separate `terminal-block.ts` (documented); vendored replica not in `dist`.

### F1 — Terminal code through the `text` widget (T4b)
- Files: `src/admin/blocks/editorComponents.ts` (+ tests), round-trip replica tests
- The Terminal `code` field becomes `widget: text` (no Lexical code editor, so ``` survives); drop the useless pattern; `toBlock` keeps a fence longer than any backtick run; prove with the replica that markdown → form → markdown is identical for code containing ```, and that the Lexical body import leaves the block intact
- Acceptance: replica tests incl. ``` inside terminal code; verifier: typing ``` in the form keeps the code and saves it; reopen shows it; unedited save byte-identical
- Depends on: T7

### F2 — Quiet preview for incomplete blocks; iframe attributes; stronger test
- Files: `src/lib/blocks/remarkBlocks.mjs` (preview mode: an incomplete or invalid block renders a neutral placeholder « Bloc incomplet : … » instead of throwing — the site build still throws), `src/admin/previews/register.ts` if needed (no `console.error` for a block validation error in preview), `src/lib/videoEmbed.ts` (drop `allowfullscreen`; `allow` carries fullscreen), the weak « sans index fourni » test (assert the specific message)
- Acceptance: tests (preview mode placeholder; site mode still throws; iframe has no `allowfullscreen`); verifier: inserting each block and typing shows 0 console error / warning until filled; facade click 0 warning
- Depends on: F1
