# astro-bencatdev — autonomous run brief

Date: 2026-09-24 · Integration branch: `claude/plan-8-anti-drift-auto-abb7ce` · Messages in: français

## Vision
Wave 2 of the site redesign (visual contract `docs/anti-drift/specs/2026-09-12-refonte-visuelle-design.md`)
has shipped its design-system base (plan 6, `v1.1.0`) and the four filterable lists (plan 7, `v1.2.0`).
This run ships plan 8: the three detail pages — project, prompt, skill — take the "tabbed detail"
pattern of the contract §5.2, so a visitor reads a long entry section by section instead of one
scroll. The content model stays frozen: tabs are fed by what the content already holds.
This is the first run of `anti-drift-auto` on this repo; plans 1–7 were run with `anti-drift-planning`.

## Roster
One row per vertical slice — an end-to-end, user-observable outcome, never a layer.

| Plan | Topic | Goal (binary, user-observable) | Depends on | Independent |
|---|---|---|---|---|
| 8 | details-a-onglets | From the home page, the user reaches any project, prompt or skill detail page (`/projets/<slug>`, `/prompts/<slug>`, `/skills/<slug>`) and sees the tabbed-detail pattern of contract §5.2: a tab row in which clicking a tab shows that tab's panel only and marks it active (active: `card` background + `line` border; inactive: transparent, `muted` text), in both light and dark themes, on every existing entry of the three collections; a tab appears only when existing content can feed it, and no content schema or CMS config changes | — | no |

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
| (none) — every publication escalates | — | — |

Publication, for the escalation message: `main` is checked out in the main worktree
(`/Users/bencat/workspace/perso/astro-bencatdev`), so it cannot be switched to here. Closing
ritual the user runs: `git -C /Users/bencat/workspace/perso/astro-bencatdev merge --ff-only claude/plan-8-anti-drift-auto-abb7ce`,
annotated tag `v1.3.0` on that tip, `git push origin main v1.3.0 milestone-plan-8` (a push to
`main` triggers the GitHub Pages deploy), then a production check.

### Frozen — never edit
- `src/content.config.ts` — content model frozen (contract §9)
- `src/content/**` — real content; no demo data from the prototype (contract §9)
- `public/admin/config.yml` — CMS untouched (contract §9)
- `docs/anti-drift/**` — archive of plans 1–7, read-only context
- `.github/workflows/**`

### Commands
| Purpose | Command |
|---|---|
| Fresh tests (no cache) | `npx vitest run` (from this worktree's root — 144 tests green at brief time) |
| Typecheck | `npm run check` (0 errors expected; hints are tolerated) |
| Run the app | `npx astro dev --background` (stop: `npx astro dev stop`, status: `npx astro dev status`) — production-like: `npm run build && npx astro preview` |
| Deploy / publish | — (escalated, see Pre-authorised) |

### Smoke surfaces
- Entry point: `http://localhost:4321/` → nav pills Projets / Prompts / Skills → any card
- Detail pages today: `/projets/gha-svu`, `/projets/site-bencat`, `/prompts/bootstrap-session-anti-drift`,
  `/prompts/decouper-un-projet-en-plans-anti-drift`, `/prompts/macos-clone`,
  `/skills/anti-drift-planning`, `/skills/superpowers`
- Server logs: `npx astro dev logs`
- Theme: the round theme toggle in the header (light and dark must both be checked)
- Not agent-reachable: (none) — production at `https://bendevcat.github.io` is checked by the user after publication

## Context
- `CLAUDE.md` (dev server in background mode). Stack: Astro (static), Tailwind v4 tokens in `@theme`,
  vanilla TypeScript for interactivity — **no island framework** (contract §9).
- Visual contract `docs/anti-drift/specs/2026-09-12-refonte-visuelle-design.md`: tokens §2–3, the
  hybrid strategy §4 (tokens + a small set of pattern classes in `@layer components`), the tabbed
  pattern §5.2, non-goals §9. **Its §7 table is authoritative for the plan split**: E7, E8, E9 belong
  to plan 8; E10 (tag tones) and E11 (`/a-propos`) belong to plan 9. The §6 table still shows the
  pre-split assignment (E7–E9 → P7, E10–E11 → P8) — stale, ignore it.
- §5.2 tab sets from the prototype: `/projets/[slug]` Aperçu · Stack · Articles liés;
  `/prompts/[slug]` Variables · Pourquoi · Sortie · Infos; `/skills/[slug]` Déclencheurs · Versions · Infos.
  E7 adds a numbered code block and stack roles; E8 interactive variables and a Copy button with
  visual feedback; E9 a clickable file tree with a coloured file preview.
- **User decision at cadrage (2026-09-24): pattern first.** The content model has no data for
  several prototype tabs (skill triggers and version history, prompt variables and output, stack
  roles, skill file trees — each skill is a single `index.md`). A tab or feature is shipped only
  where existing content can feed it (frontmatter, body sections, derivation); otherwise it is
  omitted — never shown empty, never fed by new schema fields or invented content.
- Carried over from plan 7 (its closing notes):
  - The tabs have the same shape as the nav pills, which have no pattern class yet (open finding of
    plan 6). Plan 8 is their second consumer: whether a fifth pattern class is created is decided here.
  - The cascade trap is disarmed (plan 7 / R1): pattern classes live in `@layer components` so a
    utility can override them. Do not re-arm it.
  - Reusable: `src/lib/listPattern.ts` (pure list-pattern logic), `src/scripts/list-pattern.ts`
    (generic DOM glue), `src/components/Thumbnail.astro`, `src/scripts/copy-code.ts`, `src/lib/clipboard.ts`,
    `src/lib/promptView.ts`.
  - Do not delete `matchesFilters` in `src/lib/projectFilters.ts`: it has no production caller but is
    kept on purpose (plan 7 decision I5).
  - Method lesson of plans 6–7: most defects were found only by measuring the rendered page, not by
    tests or diff review — check computed styles in the browser, both themes, 375 px.
- Inherited by plan 9, **not** in this run: criterion V2 deferred (surface-level jump), out-of-contract
  palettes (`src/lib/aiUsage.ts`, `src/lib/projectStatus.ts`), missing `aria-live` on list meta lines.
- Orphan milestones: none — `milestone-plan-1` … `milestone-plan-7` are all ancestors of the integration branch.

| Plan | Prior spec (input for the plan author) |
|---|---|
| 8 | `docs/anti-drift/specs/2026-09-12-refonte-visuelle-design.md` (§5.2, §7, §9) — no plan-8 spec was ever written; patterns to mirror: `docs/anti-drift/specs/2026-09-13-plan-7-listes-filtrables.md` |
