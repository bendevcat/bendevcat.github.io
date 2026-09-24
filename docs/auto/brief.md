# astro-bencatdev — autonomous run brief

Date: 2026-09-24 · Integration branch: `claude/migration-ux-ui-incomplete-7afdfa` · Messages in: français

## Vision
Wave 2 (plans 6–11, `v1.1.0` → `v1.4.0`) proved every criterion it set, yet only the home and about pages
look like the prototype. Measured side by side at cadrage (`docs/auto/fidelity-inventory.md`): the blog,
article, projects, prompts and skills pages, and the three detail pages, keep structures the prototype
does not have. Three causes, all in the specs: contract §5.1 merged four different list designs into one
pattern (featured entry + thumbnail everywhere); the article page never had a gap id nor a plan; the frozen
content model (§9) plus plan 8's "pattern first" rule stripped the detail pages. Criteria checked pattern
compliance, never fidelity. This run closes that gap: when it ends, **every one of the prototype's 10 screens
matches the prototype** in structure, in both themes, and the site is published once as `v1.5.0`.

## Roster
One row per vertical slice — an end-to-end, user-observable outcome, never a layer.

| Plan | Topic | Goal (binary, user-observable) | Depends on | Independent |
|---|---|---|---|---|
| 12 | coque-et-blog | On every route, in both themes, the user sees the prototype's shell (inventory §0): content capped at 1180 px; a header of three separate pills — logo pill with the 28×28 accent tile, nav pill Blog · Projets · Skills · Prompts · À propos whose active item is accent on `accentSoft`, actions pill with three 34 px round buttons on `chip` — with no bottom border; a footer on every page. On `/blog` the user sees the prototype's blog list (inventory §1): one surface card with a left rail (Catégories with counts, clickable, filtering the list; Tags cloud in the 5 tones with counts) and a main column of compact rows (76×64 thumbnail, category pill · date · read time · AI marker, title, description) under a toolbar `N articles · catégorie : X` + a sort dropdown (plus récents / plus anciens / lecture la plus courte / lecture la plus longue — a custom popover with ✓, closing on Escape and outside click); no featured entry | — | no |
| 13 | article | From `/blog`, the user opens any published post and sees the prototype's article (inventory §2): breadcrumb, 40 px title, meta row (category · date · read time · AI marker) above one surface card in three columns — left rail (Catégories, Tags, 3 related posts of the same category, `Plus d'articles →`), centre (lead, cover, prose, code blocks with Copier, AI-marker card linking to `/transparence-ia/`, previous / next tiles), right rail (Sommaire from the post's headings, Projets liés from `relatedProjects`); every link resolves | 12 | no |
| 14 | listes-projets-prompts-skills | On `/projets`, `/prompts`, `/skills`, in both themes, the user sees the prototype's lists (inventory §3, §5, §7): a segmented control with counts for the primary facet (status · format · type) and a dropdown for the secondary one (techno · outil · tag), both filtering; on `/projets` a two-column featured hero with démo / code source buttons shown only when no filter is active, then a 3-column grid; on `/prompts` and `/skills` a 3-column grid of compact cards with **no thumbnail, no featured entry, no tag chips** — prompt cards show format, tool, version, `N l.` · `~N tk` (and `N variables` when the prompt has any); skill cards show type, licence, version, the install command and a content summary; each list has its contextual empty state with a reset link | 12 | no |
| 15 | fiche-projet | From `/projets`, the user opens any project and sees the prototype's project page (inventory §4): a main surface card (banner, `← tous les projets`, title, description, **underline** tabs Aperçu · Stack (n) · Articles liés (n) — a tab without data is omitted) beside a 280 px sidebar (statut, depuis, licence, full-width `code source ↗`; Articles liés); Stack shows one tile per tech with its logo (text when none) and its role when sourced; Aperçu shows a dark line-numbered code window with Copier when the project has a code snippet | 12 | no |
| 16 | fiche-prompt | From `/prompts`, the user opens any prompt and sees the prototype's prompt page (inventory §6): header meta row (format, tool, model, version and date when sourced, line and token counts); a dark prompt window (both themes) with the prompt's line breaks, `.md` and Copier → `Copié`; beside it a 340 px column with the pill tab track (variables · décryptage · sortie · infos — a tab without data is omitted) whose variable inputs rewrite the highlighted segments of the prompt live, then Skills liés and Prompts liés cards; the literal `No content` is shown nowhere | 12 | no |
| 17 | fiche-skill | From `/skills`, the user opens any skill and sees the prototype's skill page (inventory §8): header meta row (type, version, licence, content summary, update date); a dark install window with numbered steps and Copier; `Ce que fait ce skill` bullets; a dark file explorer where clicking an entry swaps the preview; beside them a sticky 340 px column with the tab track déclencheurs · versions · infos and a `Prompts du skill` card. Every value is sourced from the real plugin (see Context); the literal `No content` is shown nowhere | 12 | no |
| 18 | finition-fidelite | On every route (home, 4 lists, article, 3 detail pages, about, AI transparency, tags, tag page, 404, search open), in both themes: each of the prototype's 10 screens matches its prototype screenshot at 1280 px in structure (same blocks, same order, same columns — a side-by-side table in the evidence); the home and about small gaps of inventory §10 are closed; at 375 px no horizontal overflow; every text/background pair ≥ 4.5:1 (≥ 3:1 large text); no surface-level jump (V2); no colour outside the tokens (the always-dark windows use named tokens) | 13, 14, 15, 16, 17 | no |

## Charter

### Escalate — never decide alone
- **irreversible** — migrations or deletions on production data, force-push, deleting
  branches or tags, anything `git revert` cannot undo
- **scope** — adding or removing a whole feature relative to this brief; dropping,
  deferring or narrowing a roster goal
- **publication** — any publication not listed under Pre-authorised

### Pre-authorised
| Action | Command | Announce first |
|---|---|---|
| (none) — plans integrate on the integration branch only | — | — |

**Publication — user decision at cadrage (2026-09-24): one publication at the end of the run.** After the
last plan ships, raise a single `publication` escalation. `main` is checked out in the main worktree
(`/Users/bencat/workspace/perso/astro-bencatdev`) and cannot be switched to here. Ritual the user approves:
`git -C /Users/bencat/workspace/perso/astro-bencatdev merge --ff-only claude/migration-ux-ui-incomplete-7afdfa`,
annotated tag `v1.5.0` on that tip, `git -C … push origin main v1.5.0 milestone-plan-12 … milestone-plan-18`
(a push to `main` triggers the GitHub Pages deploy), then a production check in the built-in browser. A 403 on
push is a keychain problem (user memory `env-github-credentials`): escalate with the exact command, never retry.

### Frozen — never edit
- `docs/anti-drift/**` — archive of plans 1–7, read-only context
- `.github/workflows/**`
- `src/content/blog/**` — posts are the author's prose; nothing in the blog needs new data
- **Not frozen this run (user decision A at cadrage)**: `src/content.config.ts`, `public/admin/config.yml`,
  `src/content/{projects,prompts,skills}/**` — see "Content rule" below.

### Content rule (user decisions at cadrage, 2026-09-24)
- **Schema unfrozen, sourced filling only.** New fields are **optional**, added to `src/content.config.ts`
  **and** to `public/admin/config.yml` (Sveltia must be able to edit them). A value is written into
  `src/content/**` only when a verifiable source states it — the plugin's own `LICENSE`, `CHANGELOG.md`,
  `SKILL.md` descriptions / trigger phrases, command and skill files, git tags, the prompt's own text. Each
  content file touched gets a decision entry `⚑ à relire` naming its source. **No invented value**: a block
  without data is omitted, never filled with the prototype's demo data (contract §9).
- **`No content` bodies**: `superpowers` — body written from the plugin's README / SKILL.md, `⚑ à relire`;
  `macos-clone` — no source, so the body is emptied and its block hidden.
- **The prototype outranks the contract text where they disagree** (it is the contract's own §0 source of
  truth): §5.1 "four identical lists" and §8.2 "thumbnail + featured on every list" are superseded by the
  prototype's per-list designs; radii the prototype actually draws (7, 8, 12, 16, 18, 24 px) are allowed
  alongside V6's set; the always-dark windows get named tokens rather than raw hex. Everything else in the
  contract (23 tokens, accent grammar V3/V4, mono = machine data V5, AA V8, no island framework §9) holds.

### Commands
| Purpose | Command |
|---|---|
| Fresh tests (no cache) | `npx vitest run` (from this worktree's root — 222 tests green at brief time) |
| Typecheck | `npm run check` (0 errors expected; hints tolerated) |
| Run the app | `npx astro dev --background` (stop `npx astro dev stop`, status `npx astro dev status`) — production-like: `npm run build && npx astro preview` |
| Deploy / publish | — (one escalation at the end of the run, see Pre-authorised) |

### Smoke surfaces
- Entry point: `http://localhost:4321/`
- Routes: `/`, `/blog`, `/blog/linux-commandes-essentielles`, `/projets`, `/projets/site-bencat`, `/projets/gha-svu`,
  `/prompts`, `/prompts/macos-clone`, `/prompts/bootstrap-session-anti-drift`, `/skills`,
  `/skills/anti-drift-planning`, `/skills/superpowers`, `/a-propos`, `/transparence-ia`, `/tags`, `/tags/devops`,
  `/404`, the search dialog (loupe button or ⌘K)
- **Fidelity reference**: the prototype, rendered through the `claude-design` MCP (`render_preview` on project
  `bb013596-0cd6-4e70-afad-e92b42d3f7f6`, file `bencat_ Prototype cliquable.dc.html` → a short-lived URL for the
  browser tools; never paste that URL into a file or message). Compare at a 1280 px viewport, both themes (the
  prototype's own toggle). Every plan's verifier adds a side-by-side row per screen it touches.
- Server logs: `npx astro dev logs`
- Theme: the round theme toggle (light and dark must both be checked; set `localStorage.theme` then reload
  before measuring colours — plan 7 trap); widths 375 / 768 / 1280
- Not agent-reachable: (none) — production at `https://bendevcat.github.io` is checked by the orchestrator in
  the built-in browser after the user publishes

## Context
- `CLAUDE.md` (dev server in background mode). Stack: Astro (static), Tailwind v4 tokens in `@theme`, vanilla
  TypeScript for interactivity — no island framework.
- **Primary input for every plan author: `docs/auto/fidelity-inventory.md`** — per screen: skeleton with px
  values, prototype line numbers, and each data field classified exists / derivable / missing. The prototype
  source itself is readable with the `claude-design` MCP `read_file` (1811 lines; read windows of ~150).
- Visual contract `docs/anti-drift/specs/2026-09-12-refonte-visuelle-design.md` (tokens §2–3, strategy §4,
  V1–V8 §10) — amended by the Content rule above.
- **Sources for sourced filling**: `~/workspace/claudeworkspaces/anti-drift-planning` (the user's own plugin:
  LICENSE MIT © bendevcat, CHANGELOG.md, skills/, commands/, git tags); `~/.claude/plugins/cache/
  claude-plugins-official/superpowers/` (versions 6.3.0, 6.4.1). Projects: their own repos only if reachable
  locally; otherwise the field stays empty.
- Reusable: `src/lib/listPattern.ts` + `src/scripts/list-pattern.ts` (filter/count/empty-state engine — adapt,
  do not rewrite), `src/lib/detailTabs.ts` + `src/components/DetailTabs.astro` + `src/scripts/detail-tabs.ts`
  (roving tabindex, no-JS fallback), `src/lib/tones.ts` (`tagTone`), `src/lib/aiUsage.ts`,
  `src/lib/stackLogos.ts`, `src/components/TableOfContents.astro`, `src/scripts/copy-code.ts`,
  `src/lib/clipboard.ts`, `scripts/audit-rendered.js` (contrast / tokens / V2 / overflow audit in a same-origin
  iframe — neutralise transitions first). Keep `matchesFilters` in `src/lib/projectFilters.ts` (plan 7 I5).
- Known traps: Tailwind scans `docs/**/*.md` (hence `@source not` in `global.css`); the preflight's
  `[hidden]` rule broke the no-JS fallback in plan 8; implementer agents have no browser — rendered checks are
  done by the orchestrator or the verifier; `vitest.config.ts` excludes `.claude/**`.
- Decisions superseded by this brief (to be logged at D65+): D1 (pattern first), D4 (`No content` counts as
  content), D7/D8 (metadata and install command moved into Infos) — the prototype places them otherwise.
- Orphan milestones: none — `milestone-plan-1` … `milestone-plan-11` are all ancestors of the integration branch.
- Earlier planning: `docs/auto/` (plans 8–11, decisions D1–D64, reports) and `docs/anti-drift/` (plans 1–7).

| Plan | Prior spec (input for the plan author) |
|---|---|
| 12 | `docs/auto/fidelity-inventory.md` §0, §1 |
| 13 | `docs/auto/fidelity-inventory.md` §2 |
| 14 | `docs/auto/fidelity-inventory.md` §3, §5, §7, §11 |
| 15 | `docs/auto/fidelity-inventory.md` §4, §11 |
| 16 | `docs/auto/fidelity-inventory.md` §6, §11 |
| 17 | `docs/auto/fidelity-inventory.md` §8, §11 |
| 18 | `docs/auto/fidelity-inventory.md` §9, §10; contract §10 |
