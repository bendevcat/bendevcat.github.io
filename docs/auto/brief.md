# astro-bencatdev — autonomous run brief (wave 4 · Sveltia board)

Date: 2026-09-25 · Integration branch: `claude/sveltia-cms-integration-e3d469` · Messages in: français

## Vision
The CMS at `/admin` works but was never finished: Sveltia is pinned at 0.175.1 (0.221.0 is out), the preview
pane is an unstyled iframe (a prompt previews exactly like its edit form; an article previews worse than its
editor — no site CSS, no code colouring), lists are bare titles, creation has no defaults, and Lexical reads
the `- - -` rule of three posts as a list item. When this run ends the author has **a complete, simple board**:
`/admin` is an Astro page running Sveltia 0.221 from npm; each collection has an icon, readable summaries,
filters, groups and a "view on site" link; each entry previews like its real page; new entries start as drafts
with sensible defaults and a date hook; ideas are captured in one click; the site shows an ✏️ button to the
author only; and the editor offers four custom blocks that the site renders. Published once as `v1.6.0`.

The design was validated section by section with the user in the cadrage session (brainstorming); the choices
below are theirs and are not reopened by plan authors.

## Roster
One row per vertical slice — an end-to-end, user-observable outcome, never a layer.

| Plan | Topic | Goal (binary, user-observable) | Depends on | Independent |
|---|---|---|---|---|
| 19 | socle-admin | The author opens `/admin/` **in dev and in production** (no more `/admin/index.html` in dev — D01 closed) and gets Sveltia **0.221.0**, served by `src/pages/admin/index.astro` (standalone page, `noindex`, no `BaseLayout`, not indexed by Pagefind) whose script `src/admin/cms.ts` imports `@sveltia/cms` from npm at an **exact** version; `public/admin/index.html` is gone, `public/admin/config.yml` stays YAML; opening any article, the preview pane shows the site's typography and colours (site CSS injected with `registerPreviewStyle`); no thematic break other than `---` remains in `src/content/**` and a test fails if one comes back; `delete` is re-enabled on the four collections **only if** deleting an entry in Sveltia 0.221 removes the references to it from other entries (proven), otherwise stays `false` with the finding logged; README updated | — | no |
| 20 | navigation | In `/admin`, the author sees the title `benCat · Studio` and the site's logo; each collection has its icon (Articles `article`, Projets `rocket_launch`, Prompts `terminal`, Skills `extension`); list rows show a summary (articles: title · date · category + 📝 when draft, ⭐ when featured; projects: title · status + ⭐; prompts: title · format · tool + version + 📝; skills: title · version · licence + 📝); cover thumbnails on articles and projects only; default sort pubDate ↓ / startDate ↓ / updated ↓ / title; preset filters (Brouillons, Publiés everywhere; articles: Mis en avant, Sans couverture, IA partielle, IA totale; projects: one per status; prompts: Fiches, Guides) each showing exactly the matching entries; groups (articles by year and by category, projects by status, prompts by tool); every entry has a working "view on site" link to its `/blog/`, `/projets/`, `/prompts/`, `/skills/` page. Tests tie filter values to the Zod enums, `preview_path`s to real routes, and summary fields to existing fields | 19 | no |
| 21 | previews | For each of the 13 real entries, the `/admin` preview pane shows the **centre column of its real page** in the site's style, with the same text as the site (proven by tests over every entry): prompt → the always-dark prompt window (`# ` lines coloured, `{variables}` highlighted, bar `<id>.md · N l. · ~N tk`), its variables, its body; article → lead, cover, prose with code blocks coloured like the site, AI-transparency card; project → status/dates header, the numbered code window of `snippet`, stack tiles with roles, body; skill → install window, highlights, triggers, first file. Templates are pure functions `(data, h) => tree` in `src/admin/previews/` reusing `src/lib/`. `prompts.prompt`, `projects.snippet` and `skills.files[].excerpt` are edited with the `code` widget (monospace, coloured) and saving an unchanged entry rewrites its file byte for byte | 19 | no |
| 22 | creation-rapide | Creating an article pre-fills `pubDate` with now; every new article, prompt or skill starts with `draft: true`; saving a **published** article whose **body** changed sets `updatedDate` to now (any other change leaves it alone); saving a prompt whose **version** changed sets `updated` to now; an uploaded image is stored as WebP, ≤ 1600 px wide, quality 80, size-capped; CMS commits read `content(<collection>): <action> "<slug>"`; Duplicate works on `{slug}/index.md` entries; `/admin/raccourcis` (noindex) offers two bookmarklets — 💡 Idée d'article (draft, title = selection or page title, source link in description) and 💬 Nouveau prompt (selection → `prompt`, draft) — plus plain links for mobile, all opening a pre-filled new entry; on every article, project, prompt and skill page an ✏️ Éditer button opening that entry in the CMS is visible **only** in a browser where `/admin` has set a localStorage marker (absent for visitors and without JS; documented as a convenience, never as security) | 21 | no |
| 23 | blocs-editeur | In the article editor the author inserts, from the toolbar, four blocks through a form — callout (note / astuce / attention / danger), titled terminal (CodeWindow style), card to a site entry (chosen from the real entries, not a typed URL), video embed (YouTube or asciinema by id, loaded on demand behind a facade) — each stored as a `:::` directive; the preview pane and the published article render each block in the site's style (tokens only, both themes, AA); markdown → form → markdown round-trips identically for each block (multiline included) | 21 | no |

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

**Publication — user decision (same as waves 2 and 3): one publication at the end of the run.** After the last
plan ships, raise a single `publication` escalation. `main` is checked out in the main worktree
(`/Users/bencat/workspace/perso/astro-bencatdev`) and cannot be switched to here. Ritual the user approves:
`git -C /Users/bencat/workspace/perso/astro-bencatdev merge --ff-only claude/sveltia-cms-integration-e3d469`,
annotated tag `v1.6.0` on that tip, `git -C … push origin main v1.6.0 milestone-plan-19 … milestone-plan-23`
(a push to `main` triggers the GitHub Pages deploy), then a production check in the built-in browser. A 403 on
push is a keychain problem (user memory `env-github-credentials`): escalate with the exact command, never retry.

### Frozen — never edit
- `docs/anti-drift/**` — archive of plans 1–7, read-only context
- `.github/workflows/**`
- `src/content/**` — **except** plan 19's thematic-break normalisation (syntax only, not a word of prose —
  user decision at cadrage). The `code` widget switch (plan 21) must leave every content file unchanged.
- Not frozen: `src/content.config.ts` only if a plan proves it necessary (none is expected: every CMS change
  here keeps the stored value's type), `public/admin/config.yml`, `src/pages/**`, `src/lib/**`, `README.md`.

### Product decisions taken at cadrage (do not reopen)
- **Architecture B**: Sveltia from npm inside an Astro page, so previews reuse `src/lib/` and `global.css`
  (no hand-copied CSS or rendering logic). Config stays hand-written YAML (generating it from Zod: out of scope).
- Previews show the page's **centre column only** (no rails, no related entries).
- Markdown body in previews: target = the site's own pipeline (`@astrojs/markdown-remark` — Shiki with
  `syntaxTheme`, `rehype-slug`, `rehype-autolink-headings`) running in the browser; fallback if it cannot run
  there = Sveltia's rendered body + site CSS + Shiki with `syntaxTheme` applied to code blocks. Either way the
  code colours match the site.
- Date hook = **rule B** (body changed on a published post → `updatedDate`; version changed → prompt
  `updated`). `draft: true` on creation. 
- **Out of scope**: editorial workflow by PR (single author, `draft` suffices, Pages has no PR previews);
  config generated from Zod; rails in previews.

### Commands
| Purpose | Command |
|---|---|
| Fresh tests (no cache) | `npx vitest run` (from this worktree's root — 399 tests green at brief time) |
| Typecheck | `npm run check` (0 errors expected; hints tolerated) |
| Run the app | `npx astro dev --background` (stop `npx astro dev stop`, status `npx astro dev status`) — production-like: `npm run build && npx astro preview` |
| Deploy / publish | — (one escalation at the end of the run, see Pre-authorised) |

### Smoke surfaces
- Entry points: `http://localhost:4321/admin/` (the board) and the site's detail pages
  (`/blog/k9s-kubernetes-terminal-ui`, `/projets/gha-svu`, `/prompts/macos-clone`, `/skills/superpowers`).
- **Reaching the CMS UI without the user's credentials**: the real GitHub login (needs the user's PAT — never
  typed by an agent) and "Work with Local Repository" (native directory picker) are not agent-reachable. Plans
  may add a **dev-only** way to load the board against the repo's real entries without either (e.g. Sveltia's
  test backend fed from `src/content/**` at dev time); it must be absent from the production build, and a test
  must prove that. Behaviours only the real backend has (commit messages, WebP upload landing in the repo,
  Duplicate on disk) are proven by unit tests on the config plus a user smoke listed in the final report.
- Server logs: `npx astro dev logs`
- Theme: the round theme toggle (both themes; set `localStorage.theme` then reload before measuring colours —
  plan 7 trap); widths 375 / 1280 for the site-side changes (✏️ button, plan 23 blocks)
- Not agent-reachable: signing in to `/admin` in production with the PAT; bookmarklets dragged to the user's
  own bookmarks bar — both go to the user smoke list of the final report.

## Context
- `CLAUDE.md` (dev server in background mode). Stack: Astro 7 (static), Tailwind v4 tokens in `@theme`, vanilla
  TypeScript for interactivity — no island framework on the site (the admin page bundles Sveltia, which carries
  its own React-compatible runtime; site pages must not load it).
- **Sveltia facts gathered at cadrage** (docs `https://sveltiacms.app/en/docs`, v0.221.0 released 2026-09-24):
  npm package exports `CMS` by default with types (`main.d.ts`); since 0.221 the npm build loads nothing from
  CDNs and needs a bundler (Vite: fine). `registerPreviewStyle(url | css, { raw })`, `registerPreviewTemplate`
  (React-class-shaped component, `h`/`createClass`, props `entry`, `widgetFor`), `registerEventListener`
  (`preSave` can return a modified entry), `registerEditorComponent` (`id`, `fields`, `pattern`, `fromBlock`,
  `toBlock`, `toPreview`; multiline pattern pitfall, issue #410). Collection options `icon`, `summary` with
  filters (`date`, `ternary`, `truncate`, `default`), `thumbnail`, `sortable_fields: { fields, default }`,
  `view_filters` (incl. `empty`, new in 0.221), `view_groups`, `preview_path`. Global `app_title`, `logo`,
  `site_url`, `commit_messages`, `media_libraries.default.config.transformations`. New-entry pre-fill by URL:
  `/admin/#/collections/<name>/new?field=value&_slug=…`. `code` widget: `output_code_only`, `default_language`,
  `allow_language_selection`. Unverified claims to prove before relying on them: deletion updating relation
  references (plan 19), native code colouring in the preview (plan 19), `relation` inside an editor component
  (plan 23), previous entry state available to `preSave` (plan 22).
- Current CMS: `public/admin/config.yml` (4 collections, `delete: false` per D08, URL patterns per D03/D10,
  `omit_empty_optional_fields`, entry-relative media), guarded by `src/lib/cms-config.test.ts` (CMS fields ==
  Zod keys). README section "Édition du contenu (Sveltia CMS)" documents prod and local workflows and D01.
- Reusable for previews: `src/lib/promptWindow.ts` (`promptWindowLines`, `rebuildWindowText`),
  `src/lib/listCards.ts` (`measurePromptText`), `src/lib/codeWindow.ts`, `src/lib/aiUsage.ts`,
  `src/lib/stackLogos.ts`, `src/lib/syntaxTheme.mjs`; components to mirror (read only):
  `src/components/prompt/PromptWindow.astro`, `src/components/project/*`, `src/components/skill/*`,
  `src/components/blog/*`.
- Thematic breaks at brief time: `- - -` in `src/content/blog/{k9s-kubernetes-terminal-ui,meilleurs-vpn-2025,
  linux-commandes-essentielles}/index.md`.
- Known traps: Tailwind scans `docs/**/*.md` (hence `@source not` in `global.css`); `vitest.config.ts` excludes
  `.claude/**`; implementer agents have no browser — rendered checks are done by the orchestrator or the
  verifier; the preflight's `[hidden]` rule (plan 8) matters for the ✏️ button's no-JS state.
- Decisions: `docs/auto/decisions.md` — this run numbers from **D124**. D01 (dev URL) and D08 (delete disabled)
  are revisited by plan 19.
- Orphan milestones: none — `milestone-plan-1` … `milestone-plan-18` are all ancestors of the integration branch.
- Earlier planning: `docs/auto/` (plans 8–18, reports) and `docs/anti-drift/` (plans 1–7, plan 2 = the CMS).

| Plan | Prior spec (input for the plan author) |
|---|---|
| 19 | `docs/anti-drift/specs/2026-07-19-plan-2-cms-sveltia.md` (original CMS spec, context only) · this brief |
| 20 | this brief |
| 21 | this brief · `docs/auto/fidelity-inventory.md` §2, §4, §6, §8 (centre columns) |
| 22 | this brief |
| 23 | this brief · `docs/auto/fidelity-inventory.md` §2 (article prose) |
