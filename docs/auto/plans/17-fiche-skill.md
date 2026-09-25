# Plan 17 — fiche-skill

Brief: `docs/auto/brief.md` · Branch: `auto/plan-17-fiche-skill` · Base: `00462cb1d5711d2a090099af6e55e6dc9ffb1b57`

## Goal
From `/skills`, the user opens any skill and sees the prototype's skill page (inventory §8): header meta row (type, version, licence, content summary, update date); a dark install window with numbered steps and Copier; `Ce que fait ce skill` bullets; a dark file explorer where clicking an entry swaps the preview; beside them a sticky 340 px column with the tab track déclencheurs · versions · infos and a `Prompts du skill` card. Every value is sourced from the real plugin (see Context); the literal `No content` is shown nowhere

## Reachability
From `http://localhost:4321/`: header nav `Skills` › `/skills/` › a card title › `/skills/<id>/` (also: the home's Skills panel, a prompt page's `Skills liés` / `Vient du skill`, `/tags/<tag>/`, search). The path exists; this plan changes what `src/pages/skills/[...slug].astro` renders. From the page: `~/ skills` › `/skills/`; each `Prompts du skill` entry › `/prompts/<id>/`; `Tous les prompts →` › `/prompts/`; tag chips › `/tags/<tag>/`; `code source ↗` (superpowers) › `https://github.com/obra/superpowers`.

### Built facts (measured at base)
Two published skills, both `type: claude-code`, `license: MIT`. `anti-drift-planning`: `version 0.4.0`, `installCmd` = `claude plugin marketplace add ~/workspace/anti-drift-planning && claude plugin install anti-drift-planning@anti-drift-marketplace`, 4 tags, relatedPrompts `[bootstrap-session-anti-drift, decouper-un-projet-en-plans-anti-drift]`, body = the author's French prose (h2s, a command table, an `## Installation` section saying the command is not runnable as is — the repo is private). `superpowers`: `version 6.2.0`, `installCmd` `/plugin install superpowers@claude-plugins-official`, `repoUrl`, 1 tag, relatedPrompts `[macos-clone]`, body = literal `No content`. The page is one column, pill tabs `Aperçu | Infos`. `check-lists` prints `skills cards: anti-drift-planning claude-code · MIT · v0.4.0 · install · 2 prompts | superpowers claude-code · MIT · v6.2.0 · install · 1 prompt`; `check-finition` prints `fallback: 12/12 data-pagefind-ignore`; `npx vitest run` → 348 passed.

### Sources (Content rule, D65/D66) — each touched file gets a decision entry `⚑ à relire`
Normalisation used by every "quoted" check below: strip `**` and backticks, collapse `\s+` to one space, compare case-insensitively, ignore a final `.`/`:`.
- **anti-drift-planning** ← `~/workspace/claudeworkspaces/anti-drift-planning` at commit `3dc3336` (read with `git show 3dc3336:<path>`). `version 0.4.0` = `.claude-plugin/plugin.json`. **Triggers** (7) = the quoted phrases of `skills/anti-drift-planning/SKILL.md`'s `description`: `roadmap`, `split into plans`, `multi-phase feature`, `avoid drift`, `session per plan`, `ne rien perdre entre les sessions`, `decompose into specs`. **Changelog** (4) from `CHANGELOG.md` headings `## [x.y.z] - date`: `0.4.0` 2026-07-31 `Lock 5 — mechanical invariants`; `0.3.0` 2026-06-27 `Session chaining: /anti-drift-planning:verify N on a PASS verdict now emits the next actionable step automatically`; `0.2.0` 2026-06-11 `Binary deviation test in the bootstrap prompt`; `0.1.0` 2026-05-10 `Initial scaffold: plugin manifest, anti-drift-planning skill, 4 commands`. **Highlights** (5, French) quoted from the skill's own body, section `Les cinq verrous`: `Specs binaires. Chaque spec a une table de critères de succès avec une mesure pass/fail par exigence` · `Anti-arbitrage silencieux. Toute déviation est loggée avant d'être exécutée` · `Scope ledger. Un fichier par plan suit chaque exigence` · `Phase de vérification. La dernière phase de chaque plan est /anti-drift-planning:verify <N>` · `Invariants mécaniques. Ce qui est comptable est compté par du code`. **Install note** quoted from the body: `La commande d'installation de cette fiche n'est pas exécutable en l'état.` **Counts**: `skillCount 1` (`skills/*/SKILL.md`), `commandCount 7` (`commands/*.md`). **Files** (9): `.claude-plugin/plugin.json`, `commands/{init,lint,new-plan,resume,start-session,status,verify}.md`, `skills/anti-drift-planning/SKILL.md`; `filesSource: 3dc3336`. Body unchanged.
- **superpowers** ← `~/.claude/plugins/cache/claude-plugins-official/superpowers/6.4.1/` (the installed version; `6.3.0` also cached). `version` 6.2.0 → **6.4.1** (`.claude-plugin/plugin.json`; D94 deferred it here). **Triggers** (7) = README `## The Basic Workflow`, each step's first sentence: `brainstorming - Activates before writing code.`, `using-git-worktrees - Activates after design approval.`, `writing-plans - Activates with approved design.`, `subagent-driven-development or executing-plans - Activates with plan.`, `test-driven-development - Activates during implementation.`, `requesting-code-review - Activates between tasks.`, `finishing-a-development-branch - Activates when tasks complete.` **Changelog** (3, newest) from `RELEASE-NOTES.md` headings `## vX.Y.Z (date)`: `6.4.1` 2026-09-18 `The new diagnosing-superpowers skill figures out what went wrong in a session.`; `6.3.0` 2026-08-12 `Worktree removal no longer destroys untracked files.`; `6.2.0` 2026-07-23 `Two structural changes to how SDD tracks progress and closes out review findings, both developed against live eval campaigns.` **Highlights** (4) = README `## Philosophy` bullets (`Test-Driven Development - Write tests first, always`, …). **Install note** = README `Install the plugin from Anthropic's official marketplace`. **Counts**: `skillCount 15`, no `commandCount` (no `commands/`). **Files** (11): `.claude-plugin/plugin.json`, `hooks/hooks.json`, `skills/<n>/SKILL.md` for `using-superpowers` and the 8 Basic Workflow skills; `filesSource: 6.4.1`. **Body** (D66) replaces `No content`: one French intro paragraph stating only facts in `plugin.json` / README (Jesse Vincent and Prime Radiant, MIT, Claude Code among other agents, the official marketplace); `## Comment il travaille` + the README `## How it works` paragraphs verbatim as blockquotes; `## Ce qu'il contient` + one sentence: 15 skills, which the README groups as Testing, Debugging, Collaboration, Meta.
- **Excerpts**: each `files[].excerpt` = the file's first lines verbatim, at most 16, stopping before the first line holding an e-mail address (both `plugin.json` → lines 1–6; the maintainers' addresses never enter the repo); `files[].lines` = the file's total line count.
- No `updated` field: `maj.` = the date of the changelog row whose version equals `version` (omitted when none).

### Design rules (prototype 795–923 via inventory §8, §9; authoring choices are decision candidates)
- **Page**: `<main>` › `<article data-pagefind-body class="pt-10">`. Header (no card, gap 12): breadcrumb mono 13 — `~/ skills` link `accent` → `/skills/`, then ` / <name ?? id>` `muted`; h1 36 px / 700 `ink`; description 16.5 px `muted`, `max-w-[660px]`; meta row mono 11, wraps: type pill `bg-accentSoft text-accent`, `v<version>` and licence pills `bg-chip text-muted` (each omitted when unset), `· <summary>` (the `/skills/` card's summary), `· maj. <date fr-FR long, UTC>`. Grid 28 px below: from 1024 px `minmax(0,1fr) 340px`, gap 22, `items-start`; below one column, left blocks then the column (DOM order).
- **Left column** (`flex-col gap-4`): install window › `Ce que fait ce skill` › explorer › `En détail` (the body, when not blank).
- **Install window** `<figure data-install-window aria-label="Installation">`, `rounded-aside`, border `windowLine`, same colours in both themes. Bar `windowHead`, padding 10/14: `installation · <tool>` mono 11 (`windowInk` / `windowDim`; tool = `Claude Code` for `claude-code`, else the raw type) + `Copier` (mono 10 `windowAccent` on `windowAccentInk`, radius 7, rendered `hidden`, revealed by the script; copies `installCmd` verbatim; `Copié` 1.4 s, `Échec — copie manuelle` on failure; `aria-live="polite"`). Body `windowBg`, `<ol>` mono 13 / 1.9, padding 18/20: steps = `installCmd` split on `&&`, trimmed; number `N.` `windowDim`, command `windowInk`, wrapped (`[overflow-wrap:anywhere]`, no horizontal scroll); `installNote` below in mono 11 `windowDim`. Whole window `data-pagefind-ignore`.
- **Ce que fait ce skill**: `.card rounded-aside`, padding 26/28, shadow `var(--shadow)`; h2 17 px / 600 `ink`; `<ul>` gap 10, each item a 15 px `check` icon (new `Icon` name) in `accent` + text 14.5 px `body`; English items `lang="en"`. Omitted without `highlights`.
- **Explorer** `<figure data-skill-explorer aria-label="Fichiers du plugin">`, `rounded-aside`, border `windowLine`, `data-pagefind-ignore`; from 640 px grid `236px 1fr`, below tree above preview. Tree pane `windowHead`, padding 10: header mono 10 uppercase `windowDim` `fichiers · <filesSource>`; rows from `fileTree(paths)` — directories before files, each level A→Z by code point; a directory holding one file only is merged into that file's row (`hooks/hooks.json`), a directory holding one directory only is merged with it; directory rows `▸ name/` `windowDim` (not interactive), file rows `<button aria-pressed aria-controls>` `· name` mono 12 `windowInk`, indented 12 px per depth; selected row `bg-windowLine`, its marker `windowAccent`. Preview pane `windowBg`: bar mono 11 `<path>` `windowInk` + ` · l. 1–K / N` (` · N l.` when K = N) `windowDim`; `<pre>` mono 12.5 / 1.7, padding 16, `whitespace-pre-wrap` + `[overflow-wrap:anywhere]`, text exactly the excerpt; tones (`explorerLines`): `#`–`######` + space → `windowKey` 600; a `---` line → `windowDim`; in a `.md` front matter or a `.json` file, a key → `windowKey` and the rest of that line → `windowValue`; everything else `windowInk`; render guard: segments rebuild the excerpt. Default selection: `skills/<name>/SKILL.md`, else the first `SKILL.md` in tree order, else the first file. One preview per file, all but the selected `hidden`. Script: click → swap `hidden` / `aria-pressed`. Without JS: tree hidden, every preview shown (rule in `@layer base` beside the tabs fallback).
- **En détail**: `.card rounded-aside` padding 26/28, shadow; h2 17 px / 600 `En détail`; body as `.prose` (indexed).
- **Column** `<aside aria-label="Autour du skill" data-skill-aside>`, `flex-col gap-3`, from 1024 px `sticky top-5`. `DetailTabs variant="track"` (unchanged), tabs from `skillPageTabs` in fixed order: `déclencheurs` when `triggers` non-empty; `versions` when `changelog` non-empty; `infos` always.
  - déclencheurs: `Quand il se déclenche` 13 / 600; intro 12.5 px `muted` `Cité de la documentation du plugin.`; each trigger a `bg-code rounded-thumb` box padding 10/12, mono 12 `ink`, `« … »`, `lang="en"` unless French (anti-drift's `ne rien perdre entre les sessions` is `lang="fr"`). Indexed.
  - versions (`data-pagefind-ignore`): `Notes de version` 13 / 600; rows as stored (newest first): version mono 11 `accent` min-w 44, text 12.5 px `body` `lang="en"`, date mono 10 `muted` `18 sept. 2026` (fr-FR short, UTC).
  - infos (`data-pagefind-ignore`): `Fiche technique` 13 / 600; `<dl>` mono 11 label `muted`: type (accent pill), version, licence, contenu (summary), maj. (each omitted when unset), `code source ↗` when `repoUrl` (`rel="noopener noreferrer"`, new tab); tag `TagChip`s (kept from base).
  - `Prompts du skill`: `RelatedPromptsCard` with new optional props `label` / `headingId` (defaults = today's), items in `sortAndFilterPrompts` order (published only) without the `tool` line on this page; omitted when empty.
- **Content summary** (`skillCardData().summary`, shared by card and header): `N skill(s) · N commande(s) · N prompt(s)`, each part omitted at 0 or unset, `null` when all are.
- **Tokens**: none added — windows reuse `--color-window*` and `--radius-aside`; the prototype's tree `#12161B` → `windowHead`, selection `rgba(255,255,255,.08)` → `windowLine` (D114 logic).
- **Schema / CMS** (all optional, both files): skills `skillCount`, `commandCount` (int ≥ 0), `installNote`, `highlights: string[]`, `triggers: string[]`, `changelog: {version, date (coerce.date), text}[]`, `files: {path, lines (int > 0), excerpt}[]`, `filesSource`; CMS skills `body` `required: false`.

Expected output of `node scripts/check-skill.mjs` after `npm run build`:
```
skills: 2/2 · ~/ skills → /skills/ · h1 · install window · explorer · sticky aside · no "No content"
anti-drift-planning: claude-code · v0.4.0 · MIT · 1 skill · 7 commandes · 2 prompts · maj. 31 juillet 2026
anti-drift-planning install: installation · Claude Code · 2 steps · Copier · note · copy = installCmd
anti-drift-planning left: 5 highlights · explorer 9 files / 10 rows · selected skills/anti-drift-planning/SKILL.md · 1 preview shown · source 3dc3336 · en détail
anti-drift-planning aside: déclencheurs | versions | infos · 7 triggers · versions 0.4.0 0.3.0 0.2.0 0.1.0 · prompts du skill decouper-un-projet-en-plans-anti-drift, bootstrap-session-anti-drift
superpowers: claude-code · v6.4.1 · MIT · 15 skills · 1 prompt · maj. 18 septembre 2026
superpowers install: installation · Claude Code · 1 step · Copier · note · copy = installCmd
superpowers left: 4 highlights · explorer 11 files / 12 rows · selected skills/brainstorming/SKILL.md · 1 preview shown · source 6.4.1 · en détail
superpowers aside: déclencheurs | versions | infos · 7 triggers · versions 6.4.1 6.3.0 6.2.0 · prompts du skill macos-clone
counts: header summary = /skills/ card on 2/2
links: every internal href resolves in dist/
search: 2 fragments · title, highlights, triggers and body indexed · install window, explorer, versions, infos and prompts card not indexed
```
Exit 1 if a page lacks a block above; if `Copier` is not `hidden` in the HTML; if a preview's `<pre>` text ≠ its `excerpt`, or ≠ 1 preview is shown, or the shown one is not the `aria-pressed="true"` button's; if the header summary ≠ the page's `/skills/` card summary; if `No content` appears in `dist/skills/**/index.html`; if an internal `href` does not resolve in `dist/`; or if a skill fragment (read as in `check-article.mjs`) lacks its title or first highlight, or contains `Copier`, `Fiche technique`, `Notes de version`, `Prompts du skill` or `fichiers ·`.

Expected output of `node scripts/check-skill-sources.mjs` (local only — reads the two plugin paths above; exit 2 `source introuvable` if one is missing):
```
anti-drift-planning @ 3dc3336: version 0.4.0 = plugin.json · license MIT = plugin.json · 7/7 triggers quoted · 4/4 changelog rows (heading, date, text) · 5/5 highlights quoted · install note quoted · 1 skill · 7 commands · 9/9 excerpts verbatim, no e-mail
superpowers @ 6.4.1: version 6.4.1 = plugin.json · license MIT = plugin.json · 7/7 triggers quoted · 3/3 changelog rows (heading, date, text) · 4/4 highlights quoted · install note quoted · 15 skills · 0 commands · 11/11 excerpts verbatim, no e-mail · body: 5/5 blockquotes quoted
```
"Quoted" = normalised substring of: SKILL.md descriptions or README (triggers); README, `plugin.json` description or the skill's own body (highlights, install note); the version's own section (changelog text). Exit 1 on any mismatch.

## Criteria
| ID | Criterion | Measure | Guarantee |
|---|---|---|---|
| R0 | From `/skills`, the user opens any skill and sees the prototype's skill page (inventory §8): header meta row (type, version, licence, content summary, update date); a dark install window with numbered steps and Copier; `Ce que fait ce skill` bullets; a dark file explorer where clicking an entry swaps the preview; beside them a sticky 340 px column with the tab track déclencheurs · versions · infos and a `Prompts du skill` card. Every value is sourced from the real plugin (see Context); the literal `No content` is shown nowhere | reachability walkthrough on `npm run build && npx astro preview`, light then dark: `/` › Skills › each of the 2 cards › every block above present › click 3 explorer entries → the preview shows each file › scroll → the column stays 20 px from the top; every link on the page → a 200 page that is not `/404`; R1–R21 hold | no |
| R1 | Skill page data | `npx vitest run src/lib/skillDetail.test.ts` → "splits the install command on && into numbered steps", "keeps a one-part command as one step", "takes maj. from the changelog row of the declared version and omits it otherwise", "labels claude-code as Claude Code and keeps other types as written", "formats version dates as 18 sept. 2026 and maj. as 18 septembre 2026 in UTC" pass | yes |
| R2 | Summary shared with the card | `npx vitest run src/lib/listCards.test.ts` → "summarises skills, commands and prompts in that order, omitting zeros", "uses singular forms for 1 skill, 1 commande, 1 prompt", "returns null when nothing is counted" pass | yes |
| R3 | Explorer rules | `npx vitest run src/lib/skillExplorer.test.ts` → "lists directories before files, each level by code point", "merges a single-file directory into its file row and a single-directory chain into one row", "selects the SKILL.md of the skill's name, else the first SKILL.md, else the first file", "tones headings, rules, front-matter and JSON keys and values", "rebuilds each excerpt from its segments" pass | yes |
| R4 | Tab rules | `npx vitest run src/lib/detailTabs.test.ts` → "gives a skill déclencheurs, versions and infos in that order when fed", "omits déclencheurs without triggers and versions without changelog" pass; no skill tab has id `apercu` | yes |
| R5 | Content invariants (CI) | `npx vitest run src/lib/skillContent.test.ts` → "no skill body is the literal No content", "each changelog is newest first and holds the declared version", "each excerpt has at most 16 lines, no more than its file, and no e-mail address", "file paths are unique, relative and without ..", "superpowers is at 6.4.1 with a written body" pass | yes |
| R6 | Values match the plugins | `node scripts/check-skill-sources.mjs` → the 2 lines above, exit 0; exit 1 after changing any one trigger, changelog date or excerpt line in a scratch copy of a skill file | no |
| R7 | Schema and CMS agree | `npx vitest run src/lib/cms-config.test.ts` → 0 failed; `sed -n '/^const skills/,/^});/p' src/content.config.ts \| grep -cE '^\s+(skillCount\|commandCount\|installNote\|highlights\|triggers\|changelog\|files\|filesSource):'` → `8`; `sed -n '/^  - name: skills/,$p' public/admin/config.yml \| grep -cE 'name: (skillCount\|commandCount\|installNote\|highlights\|triggers\|changelog\|files\|filesSource)\b'` → `8`; `… \| grep -cE 'name: body.*required: false'` → `1` | no |
| R8 | Built skill pages | `npm run build && node scripts/check-skill.mjs` → the 12 lines above, exit 0; exit 1 on each defect class listed under the block | no |
| R9 | Tab rows | `node scripts/check-detail-tabs.mjs` → 7 rows, exit 0; the 2 skill rows read `déclencheurs \| versions \| infos`; the 5 project / prompt rows unchanged | no |
| R10 | Layout and header | preview, 1280, both themes, 2 skills: column 340 wide, left column = 1180 − 362 (± 1), gap 22; breadcrumb mono 13 with `~/ skills` `accent`; h1 36 px / 700; description 16.5 px `muted`, width ≤ 660; meta row mono 11 as R8, type pill on `accentSoft`, version / licence pills on `chip` | no |
| R11 | Install window | preview, 1280: body `#0B1017`, bar `#111823` in light and dark; anti-drift shows `1.` and `2.` rows, superpowers one row; the note sits under the steps; no horizontal scroll at 375; `Copier` → `Copié` then back after ≈ 1.4 s, `navigator.clipboard.readText()` = `installCmd` | no |
| R12 | Highlights and body | preview, both themes: 5 / 4 bullets, each led by a 15 px icon computing `accent`; `En détail` shows the body (anti-drift keeps its command table and `## Installation`; superpowers shows its intro, blockquotes and `Ce qu'il contient`) | no |
| R13 | Explorer | preview, both themes, 1280: tree 236 wide on `#111823`, preview on `#0B1017`; clicking each of 3 file rows shows that file's excerpt and path bar, sets its `aria-pressed="true"` and its background `windowLine`, and hides the previous preview; directory rows do nothing; below 640 the tree sits above the preview; no horizontal scroll in any preview | no |
| R14 | Column | preview, 1280, both themes: 3 pills on `chip`, selected `card` + `line` + `ink`; each panel card radius 18 with shadow; déclencheurs boxes on `code`; after scrolling 1500 px the aside's `getBoundingClientRect().top` = 20 (± 1) while the left column scrolls; at 768 the aside is `position: static` below the left column; `Prompts du skill` entries and `Tous les prompts →` open 200 pages | no |
| R15 | Keyboard and without JavaScript | roving tabindex on the track (ArrowRight / Left / Home / End); explorer file rows reachable with Tab, activated by Enter and Space; in a `sandbox` iframe without scripts, on both pages: no track, each panel under its fallback heading, no `Copier`, no tree, every excerpt visible under its path bar | no |
| R16 | Search | `check-skill.mjs` `search:` line as above; preview, search dialog: `roadmap` → `Anti-Drift Planning` among the results; `Notes de version` → no `/skills/<id>/` result | no |
| R17 | Fidelity with the prototype | verifier renders the prototype's skill screen (`claude-design` `render_preview`, project `bb013596-0cd6-4e70-afad-e92b42d3f7f6`; URL never written down) and `/skills/anti-drift-planning/` at 1280, light and dark: side-by-side table, same blocks, order and two columns; allowed differences = the Design rules (`En détail` card, CLI install form, English quotes, window colours from plan 15). **If the MCP is unavailable: smoke**, static comparison with inventory §8 in the evidence | no |
| R18 | Audit | `scripts/audit-rendered.js` on both skill pages, each tab selected in turn, light and dark, 375 / 768 / 1280: 0 overflow, 0 contrast failure, 0 off-token colour, 0 V2 jump | no |
| R19 | Radii and mono | preview, both themes: every non-zero `border-radius` ∈ {7, 8, 9, 10, 12, 13, 14, 16, 18, 20, 24, 999} px; breadcrumb, meta row, window texts, tree, preview, tab pills, trigger boxes, version rows, infos rows compute `"JetBrains Mono`; h1, description, highlights, body prose compute `"Nebula Sans"` | no |
| R20 | Nothing else moves | after build: `check-shell-blog`, `check-article`, `check-home`, `check-secondary`, `check-project`, `check-prompt` → base lines; `check-lists` → base lines except `skills cards: anti-drift-planning claude-code · MIT · v0.4.0 · install · 1 skill · 7 commandes · 2 prompts \| superpowers claude-code · MIT · v6.4.1 · install · 15 skills · 1 prompt`; `check-finition` → base lines except `fallback: 14/14 data-pagefind-ignore`; `dist/projets/*/index.html` and `dist/prompts/*/index.html` identical to a base build's after replacing `/_astro/<name>.<hash>.<ext>` by `/_astro/<name>.<ext>`, except `v6.2.0` → `v6.4.1` in `prompts/macos-clone`'s Skills liés; `git diff 00462cb -- src/styles/global.css \| grep -vE '^(\+\+\+|---) ' \| grep -cE '^[+-]\s*--'` → `0` (diff header lines excluded); pattern classes (`sed -n '/@layer components {/,/^}/p' src/styles/global.css \| grep -cE '^\s+\.[a-z-]+ \{'`) → `4` | no |
| R21 | Frozen paths, suite, types, `No content` | `git diff 00462cb --stat -- src/content/blog src/content/projects src/content/prompts docs/anti-drift .github/workflows package.json package-lock.json` → empty; `git diff 00462cb --name-only -- src/content` → the 2 skill `index.md`; `grep -rl 'No content' src/content dist` → empty; `npx vitest run` → 0 failed, > 348 tests; `npm run check` → `0 errors`; `grep -c 'export function matchesFilters' src/lib/projectFilters.ts` → `1` | no |

## Shared resources
- `src/content.config.ts`, `public/admin/config.yml` — skill fields added; nothing removed.
- `src/lib/listCards.ts` — `/skills/` card summary; `src/lib/detailTabs.ts` — `skillPageTabs` replaces `skillTabs`.
- `src/components/prompt/RelatedPromptsCard.astro` (optional props), `src/components/Icon.astro` (`check`), `src/styles/global.css` (no-JS explorer rule only, no token).
- The two plugin sources — read only, never modified. `dist/`, port 4321. No version bump (D68).

## Tasks
### T1 — Skill data: steps, dates, summary, explorer, tabs
- Files: `src/lib/skillDetail.ts` + test (new: `installSteps`, `toolLabel`, `skillUpdated`, `versionDate`, `updatedLabel`), `src/lib/skillExplorer.ts` + test (new: `fileTree`, `defaultFile`, `explorerLines`), `src/lib/listCards.ts` + test (`skillContentSummary`, used by `skillCardData`), `src/lib/detailTabs.ts` + test (`skillPageTabs`; `skillTabs` stays until T4); no `astro:content` import
- Covers: R1, R2, R3, R4
- Acceptance: `npx vitest run src/lib/skillDetail.test.ts src/lib/skillExplorer.test.ts src/lib/listCards.test.ts src/lib/detailTabs.test.ts` → the named tests pass, 0 failed; `npm run check` → `0 errors`
- Depends on: —

### T2 — Schema, CMS and sourced skill content
- Files: `src/content.config.ts`, `public/admin/config.yml`, `src/content/skills/anti-drift-planning/index.md`, `src/content/skills/superpowers/index.md` (per Sources), `src/lib/skillContent.test.ts` (new), `scripts/check-skill-sources.mjs` (new)
- Covers: R5, R6, R7, R21 (content side)
- Acceptance: `npx vitest run src/lib/cms-config.test.ts src/lib/skillContent.test.ts` → 0 failed; `node scripts/check-skill-sources.mjs` → the 2 expected lines, exit 0; the R7 greps → `8`, `8`, `1`; `npm run build && node scripts/check-lists.mjs` → `skills cards:` line as in R20
- Depends on: T1

### T3 — Shared pieces unchanged for their current users
- Files: `src/components/prompt/RelatedPromptsCard.astro` (optional `label`, `headingId`, `tool`), `src/components/Icon.astro` (`check`)
- Covers: R20 (prompt pages)
- Acceptance: `npm run build` then `dist/prompts/*/index.html` and `dist/projets/*/index.html` identical to a build of the T2 commit after hash normalisation (scratch build in the scratchpad)
- Depends on: —

### T4 — The skill page
- Files: `src/pages/skills/[...slug].astro`, `src/components/skill/{SkillHeader,InstallWindow,SkillHighlights,FileExplorer,SkillNotes,SkillTriggers,SkillVersions,SkillInfos}.astro` (new), `src/scripts/skill-page.ts` (new: Copier, explorer), `src/styles/global.css` (no-JS explorer rule in `@layer base`), `src/lib/detailTabs.ts` + test (`skillTabs` and its tests removed), `scripts/check-skill.mjs` (new, like `check-prompt.mjs`)
- Covers: R8, R9, R16 (built), R20, R21; rendered rows R10–R15, R17–R19 are measured by the verifier
- Acceptance: `npm run build && node scripts/check-skill.mjs` → the 12 expected lines, exit 0; `node scripts/check-detail-tabs.mjs` → the R9 rows; the other instruments → the R20 lines; `grep -rl 'No content' dist` → empty; `npx vitest run` → 0 failed; `npm run check` → `0 errors`
- Depends on: T1, T2, T3

### F1 — Tag chips in the skill infos link to their tag pages
- Files: `src/components/skill/SkillInfos.astro` (and `scripts/check-skill.mjs` if it pins chip markup)
- Covers: R0 / Reachability ("tag chips › `/tags/<tag>/`"), T4 report
- Acceptance: every tag chip in the skill `infos` panel is a link to `/tags/<tagSlug>/` that resolves in `dist/`; `check-secondary` and `check-skill` exit 0 with their lines (update expected lines only if the chip count per page is unchanged and only markup differs — report any change); `npx vitest run` 0 failed
- Depends on: —

### F2 — Date helpers guarded in UTC on any machine
- Files: `src/lib/skillDetail.test.ts`, `src/lib/projectDetail.test.ts`, `src/lib/listCards.test.ts`
- Covers: R1 (guarantee), plan 14 / 15 carried findings
- Acceptance (verifier failure): add boundary cases (e.g. `new Date('2026-07-23T23:30:00Z')` → `23 juil. 2026`; a month boundary such as `2026-08-01T00:00:00Z` → `août 2026`) so that removing `timeZone: 'UTC'` from `versionDate`, `updatedLabel`, `projectMetaRows` (depuis) or `featuredSince` turns a test red **in this machine's time zone (Europe/Paris), with `TZ=America/New_York` and with `TZ=Asia/Tokyo`** (under `TZ=UTC` the option is a no-op, so no test can fail) — demonstrate each mutation red then restore; `npx vitest run` 0 failed
- Depends on: —

### F3 — Tab labels out of the search index; the sticky column fits the viewport
- Files: `src/components/DetailTabs.astro`, `src/pages/skills/[...slug].astro` (and check scripts whose search lines change — report them)
- Covers: R16, R14, verification 1 findings 1 and 3
- Acceptance (verifier failure): the tab row (`[role=tablist]`, every variant) carries `data-pagefind-ignore`, so the search dialog query `Notes de version` returns no skill page and no fragment contains `déclencheurs versions infos`; the skill aside is sticky only while it fits: from 1024 px it gets `max-height: calc(100vh - 40px)` with internal scrolling (or equivalent), so at 1024×768 its bottom stays within the viewport; `check-skill`, `check-prompt`, `check-project`, `check-detail-tabs` exit 0 (stated line changes reported)
- Depends on: —

### F4 — English quotes marked `lang="en"`
- Files: `src/content/skills/superpowers/index.md` (the 5 README blockquotes as `<blockquote lang="en">`, text unchanged), `src/components/skill/SkillHeader.astro` / `InstallWindow.astro` (apply `quoteLang` to the description and the install note)
- Covers: verification 1 finding 2 (WCAG 3.1.2)
- Acceptance: on `/skills/superpowers/`, the 5 blockquotes, the English install note and any English description carry `lang="en"`; `node scripts/check-skill-sources.mjs` still exits 0 with its two lines (blockquote text verbatim); `check-skill` exits 0
- Depends on: F3

## Out of scope
- An `updated` field; a `sortie`-like block; the prototype's in-session `/plugin marketplace add` form (the stored CLI command stays); translating quoted English; the `references/` templates, tests and scripts in the explorer; live file reading at build time (CI has no plugin paths); making the anti-drift install command runnable.
- Removing the now-unused `pill` variant of `DetailTabs` (→ plan 18); any change to posts, projects, prompts content, `.github/workflows/**`, `docs/anti-drift/**`; version bump, tag, merge, push, deploy.

## Evidence

### Verification 1 (2026-09-25)
| ID | Verdict | Evidence |
|---|---|---|
| R0 | failed | walk `/` › Skills › each card, both themes: every block, 6 explorer clicks, sticky at 20, all links 200, prompt and tag links; fails only through R1 and R16 |
| R1 | failed | named tests pass and 5 mutations go red, but removing `timeZone:'UTC'` from `versionDate` / `updatedLabel` stays green in Paris and with TZ=UTC (red only with TZ=America/New_York) |
| R2–R5 | proven | named tests pass; each red under targeted mutations |
| R6 | proven | both source lines, exit 0; exit 1 on 4 content mutations; verifier's own re-check of all 20 excerpts, versions, changelogs, bullets, blockquotes; no e-mail in `src/`, `dist/`, `public/` |
| R7 | proven | CMS tests 0 failed; greps `8` / `8` / `1` |
| R8 | proven | `check-skill` 12 lines exact; exit 1 on 8 injected defects |
| R9 | proven | 7 rows; skills `déclencheurs \| versions \| infos`; other rows identical to base |
| R10–R15 | proven | layout 818 + 22 + 340; windows identical both themes; Copier = `installCmd`; highlights and body; explorer clicks; sticky 20 at ≥ 1024, static below; roving keys; no-JS iframe shows every preview |
| R16 | failed | `roadmap` → anti-drift only; **`Notes de version` → both skill pages** (tab labels indexed) |
| R17 | smoke | design MCP refused; inventory §8 matches |
| R18 | proven | audit 36 runs: 0 / 0 / 0 / 0 |
| R19 | proven | radii {7, 9, 10, 14, 18, 999}; fonts as specified |
| R20 | proven | other instruments identical except stated lines; project / prompt HTML differs only by script hashes and `v6.4.1` |
| R21 | proven | frozen diff empty; 2 skill files; no `No content`; 375 tests; 0 errors |

Findings → F3 (aside 754–789 px tall overflows a 1024×768 viewport; tab labels indexed), F4 (English quotes without `lang="en"`). Not taken: `En détail` h2 with body h2s at the same level; 15-line excerpts (verbatim, within the rule).
