# astro-bencatdev — autonomous run brief

Date: 2026-09-24 · Integration branch: `claude/anti-drift-auto-start-532f11` · Messages in: français

## Vision
Wave 2 of the site redesign (visual contract `docs/anti-drift/specs/2026-09-12-refonte-visuelle-design.md`)
has shipped its design-system base (plan 6, `v1.1.0`), the four filterable lists (plan 7, `v1.2.0`) and the
three tabbed detail pages (plan 8, `v1.3.0`). This run closes the wave — the contract's plan 9
`accueil-et-finition`, split into three vertical slices: the home page takes the prototype's structure,
the secondary pages (about, AI transparency, tags, 404, search) take the new design with tag tones, and a
cross-cutting pass makes every route hold at 375 px, meet AA contrast and respect the surface hierarchy.
When it ends, every route of the site looks like the prototype, and the site is published once as `v1.4.0`.

## Roster
One row per vertical slice — an end-to-end, user-observable outcome, never a layer.

| Plan | Topic | Goal (binary, user-observable) | Depends on | Independent |
|---|---|---|---|---|
| 9 | accueil | On `/`, in both themes, the user sees, top to bottom, the prototype's home (contract E3): a featured-post card (cover or the derived placeholder, category · date, title, excerpt, the post's AI-usage marker, `Lire →` to the post) beside a `Derniers articles` panel listing the next 3 published posts with thumbnails and `Plus d'articles →` to `/blog`; then three section panels Projets · Prompts · Skills (pattern §5.3: 28×28 badge, title linking to the list page, `card-inner` entries fed by real content, each linking to its detail page); then an AI-transparency banner linking to `/transparence-ia/`. Every link resolves; at 375 px the page has no horizontal overflow | — | no |
| 10 | pages-secondaires | In both themes: `/a-propos` shows the prototype's about structure (contract E11: `~/ whoami` identity block in mono `clé: valeur`, links, `Ma boîte à outils` stack grid with logos, the AI-rule panel with the three AI-usage markers) using only facts the repo already holds; `/transparence-ia`, `/tags`, `/tags/<tag>`, `/404` and the search dialog use the contract patterns (`card` / `card-inner` / `panel` / `pill`); every tag chip on the site carries one of the 5 tag tones of §2.3, chosen by a stable hash of the tag's slug, so a given tag has the same tone on every page (E10); the three AI-usage levels are drawn with contract tones and are visually distinct from each other and from the page background in both themes | 9 | no |
| 11 | finition | On every route of the site (home, 4 lists, 4 kinds of detail page, about, AI transparency, tags, tag page, 404, search dialog open), in both themes: no horizontal overflow at 375 px; the contract pairs of V8 (`body` on `bg`, `muted` on `surface`, `accent` on `accentSoft`) and every rendered text/background pair measure ≥ 4.5:1 (≥ 3:1 for large text); no surface-level jump (V2 — `card` on `bg`, `rail` on `surface`); no colour outside the 23 tokens and the 5 tag tones (project status, search backdrop); the filterable lists announce their result count to screen readers (`aria-live`) | 10 | no |

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

**Publication — user decision at cadrage (2026-09-24): one publication at the end of the run**, not one
per plan. After the last plan ships, raise a single `publication` escalation. `main` is checked out in the
main worktree (`/Users/bencat/workspace/perso/astro-bencatdev`), so it cannot be switched to here. Ritual the
user approves: `git -C /Users/bencat/workspace/perso/astro-bencatdev merge --ff-only claude/anti-drift-auto-start-532f11`,
annotated tag `v1.4.0` on that tip, `git -C … push origin main v1.4.0 milestone-plan-9 milestone-plan-10 milestone-plan-11`
(a push to `main` triggers the GitHub Pages deploy), then a production check in the built-in browser.
A 403 on push is a keychain problem (see the user's `env-github-credentials` memory): escalate with the
exact command, never retry.

### Frozen — never edit
- `src/content.config.ts` — content model frozen (contract §9)
- `src/content/**` — real content; no demo data from the prototype (contract §9)
- `public/admin/config.yml` — CMS untouched (contract §9)
- `docs/anti-drift/**` — archive of plans 1–7, read-only context
- `.github/workflows/**`

### Commands
| Purpose | Command |
|---|---|
| Fresh tests (no cache) | `npx vitest run` (from this worktree's root — 168 tests green at brief time) |
| Typecheck | `npm run check` (0 errors expected; hints are tolerated) |
| Run the app | `npx astro dev --background` (stop: `npx astro dev stop`, status: `npx astro dev status`) — production-like: `npm run build && npx astro preview` |
| Deploy / publish | — (one escalation at the end of the run, see Pre-authorised) |

### Smoke surfaces
- Entry point: `http://localhost:4321/`
- Routes: `/`, `/blog`, `/blog/<slug>`, `/projets`, `/projets/gha-svu`, `/prompts`, `/prompts/macos-clone`,
  `/skills`, `/skills/superpowers`, `/a-propos`, `/transparence-ia`, `/tags`, `/tags/devops`, `/404`,
  the search dialog (loupe button or ⌘K)
- Server logs: `npx astro dev logs`
- Theme: the round theme toggle in the header (light and dark must both be checked); widths 375 / 768 / 1180
- Not agent-reachable: (none) — production at `https://bendevcat.github.io` is checked by the orchestrator in the
  built-in browser after the user publishes

## Context
- `CLAUDE.md` (dev server in background mode). Stack: Astro (static), Tailwind v4 tokens in `@theme`,
  vanilla TypeScript for interactivity — **no island framework** (contract §9).
- **Source of truth for structure**: the Claude Design artboard `bencat_ Prototype cliquable.dc.html` of project
  `bb013596-0cd6-4e70-afad-e92b42d3f7f6` (readable through the `claude-design` MCP tools `read_file`); the other
  artboards are working steps, not references. Visual contract: tokens §2–3, hybrid strategy §4 (patterns in
  `@layer components`, never re-arm the cascade trap), page patterns §5 (§5.3 = section panel), non-goals §9,
  verification criteria §10 (V1–V8, widths 375 / 768 / 1180). Its §7 plan table is authoritative; this run splits
  its P9 row into plans 9, 10 and 11.
- **What the prototype shows, extracted at cadrage (2026-09-24)**:
  - Home: no hero; row 1 = featured card (cover 196 px, chip `à la une`, `cat · date · read`, 29 px title,
    excerpt, footer `emoji label` of AI usage + `Lire →`) beside a `Derniers articles` panel (badge on the right,
    3 items: accent mono category, 17 px title, `meta · emoji label`, 72 px thumbnail; `Plus d'articles →`);
    row 2 = three `panel`s — Projets (folder icon; name + status chip, short text, mono stack), Prompts (bubble
    icon; format chip + mono tool, title, short text), Skills (wrench icon; title + version chip, short text,
    mono `type · name`), 2 cards each; row 3 = AI banner on `accentSoft`: « Chaque article affiche sa part
    d'IA : ✍️ 100% humain, 🤝 co-créé ou 🤖 IA relue. » + outlined pill `transparence IA →`.
  - About: `~/ whoami` + h1 + bio + mono links, beside a terminal window (`➜ ~ whoami --long`, `clé: valeur` lines,
    keys in blue); `Pourquoi ce site` card and `On parle ?` card; `Ma règle sur l'IA` panel with three marker
    cards (100% humain green, Co-créé amber, IA relue blue); `Ma boîte à outils` pill grid with logos.
  - Tags appear with tones only in the prototype's blog/article sidebars; search, 404 and the AI-transparency page
    are not drawn (derive them from the patterns, contract §1). The prototype has **no breakpoints**: 375 px
    behaviour is ours to design.
- **Cadrage decisions (2026-09-24)**:
  - *User — tag tones (§8.3): stable hash* of the tag slug onto the 5 tones; same tag, same tone everywhere; no table.
  - *User — publication: once, at the end of the run* (see Pre-authorised).
  - *Orchestrator, by precedent — no invented content.* The prototype's about and home copy are demo data
    (contract §9); the user's rule since the 2026-09-04 gate is "aucune phrase inventée", and plan 8's
    "pattern first" rule (D1) applies: a block or field is shown only when existing content, existing author
    texts (`src/pages/a-propos.astro`, `src/components/Hero.astro`, the post `bienvenue-dans-mon-foutoir`,
    `src/lib/aiUsage.ts`) or a derivation (counts, reading time from word count, stack from project entries)
    can feed it; otherwise it is omitted — never filled with the prototype's values (no `hello@bencat.dev`, no
    LinkedIn, no `github.com/bencat`: the real handle is `bendevcat`). Stack logos are self-hosted inline SVG,
    no external CDN; a tech with no logo shows as text.
  - *Orchestrator, by the source of truth — the home hero goes.* The prototype's home has no hero; the
    `~/ whoami` identity moves to `/a-propos`, where the prototype puts it. The AI banner links to the existing
    `/transparence-ia/` page (the prototype links to about only because it has no such page). ⚑ to re-read.
- Inherited items, each a **named** requirement of the plan it lands in:
  - plan 10: out-of-contract AI-usage palette `src/lib/aiUsage.ts` (P6 D02 — the light `none` banner is at
    ~1.02:1 against `bg`: invisible).
  - plan 11: criterion V2 deferred by P7 D04 (`docs/anti-drift/handoffs/plan-7-deviations.md`); project status
    palette `src/lib/projectStatus.ts` and search backdrop `backdrop:bg-black/60` (P6 D02,
    `docs/anti-drift/handoffs/plan-6-deviations.md`); missing `aria-live` on list meta lines (P7); plan-8
    leftovers from `docs/auto/reports/2026-09-24-run.md` › Follow-ups (`data-pagefind-ignore` on the no-JS
    fallback headings, the duplicated `[hidden]` rule, the stale line-number comment in
    `src/pages/skills/[...slug].astro`).
- Reusable: `src/lib/listPattern.ts`, `src/scripts/list-pattern.ts`, `src/components/Thumbnail.astro` (derived
  placeholder), `src/lib/detailTabs.ts`, `src/lib/tags.ts` (`tagSlug` — the hash input), `src/lib/posts.ts`
  (`featured`), `src/scripts/copy-code.ts`, `src/lib/clipboard.ts`. Do not delete `matchesFilters` in
  `src/lib/projectFilters.ts` (plan 7 decision I5).
- Method lesson of plans 6–8: most defects were found only by measuring the rendered page (computed styles,
  both themes, 375 px, a `sandbox` iframe without scripts for no-JS) — not by tests or diff review. Implementer
  agents have no browser: rendered measurements are done by the orchestrator or the verifier.
- Orphan milestones: none — `milestone-plan-1` … `milestone-plan-8` are all ancestors of the integration branch.
- Earlier planning: `docs/auto/` (plan 8, decisions D1–D23, report) and `docs/anti-drift/` (plans 1–7, archive).

| Plan | Prior spec (input for the plan author) |
|---|---|
| 9 | `docs/anti-drift/specs/2026-09-12-refonte-visuelle-design.md` (§5.3, §6 E3, §10) — no plan-9 spec was ever written |
| 10 | same contract (§2.3, §6 E10–E11, §8.3 settled above, §10); P6 D02 in `docs/anti-drift/handoffs/plan-6-deviations.md` |
| 11 | same contract (§2.1, §10 V2/V8); P7 D04 in `docs/anti-drift/handoffs/plan-7-deviations.md`; plan-8 follow-ups in `docs/auto/reports/2026-09-24-run.md` |
