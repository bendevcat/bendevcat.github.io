# Plan 1 — Scope Ledger

Last updated: 2026-07-19 04:28
Last updated by: main (contrôleur SDD)

## Requirements (extracted from spec §3 Success criteria)

| ID | Requirement | Status | Notes |
|---|---|---|---|
| R1 | Un push sur `main` déclenche le workflow GitHub Actions (`withastro/action`) qui build et déploie le site (run vert **ET** `curl -sI https://bendevcat.github.io` = `200` HTML) | Pending | Dépend d'actions manuelles GitHub (création repo `bendevcat.github.io`, Pages source = Actions) |
| R2 | La home `/` affiche un hero + une grille d'articles récents (hero **ET** ≥ 3 cartes réelles : titre, date, catégorie, description) | In progress | C1 — 6 cartes (≥3 OK). 3 sans cover (D03) → carte gère l'absence. |
| R3 | Un article `/blog/<slug>` : contenu complet + TOC (H2/H3) + blocs de code à bouton copier + bannière IA conditionnelle (visible si `aiUsage` défini) | In progress | C3 — gotchas : copie=contenu seul (pas le label bouton), CSS bascule shiki dual-thème, TOC conditionnel, AiBanner réutilise `aiUsage.ts` |
| R4 | `/blog` liste **tous** les articles publiés (`draft:false`), tri anté-chronologique (nb cartes = nb publiés **ET** aucun `draft:true` visible) | In progress | C2 — 6 cartes attendues ; test draft d'exclusion |
| R5 | Toggle de thème clair/sombre persistant (change le thème **ET** reload conserve via localStorage **ET** 1er chargement suit `prefers-color-scheme`) | Done | A3 `2c9a2ad` — smoke contrôleur ✅ 4/4 : clic flip dark→light, reload persiste (localStorage l'emporte sur média `prefersDark`), sans stockage suit `prefers-color-scheme` (→dark), no-flash (script inline = 1er nœud `<head>`) |
| R6 | Tous les articles publiés de `bencat-website` migrés en entrées `blog`, schéma Zod valide, images co-localisées rendues (`astro build` OK **ET** count = ancien site **ET** images affichées) | In progress | **Compte publié établi = 6** (draft:false ; 9 drafts + 3 trash exclus ; le « ~15 » du design spec = total, pas publiés). B1 fait ; B2 en cours. D03 : 3 covers Unsplash distantes omises. |
| R7 | `/rss.xml` généré, listant les articles publiés (RSS valide, 1 `<item>`/article : titre, lien, date, description) | Pending | |
| R8 | Design system : tokens couleur (clair+sombre) + 3 polices via `@theme` Tailwind v4, mono sur les éléments techniques (3 polices chargées **ET** toggle applique `--color-*` **ET** méta/tags/code en JetBrains Mono) | In progress | A2+A3 vérifiés (smoke : 3 familles `loaded`, toggle applique `--color-bg/acc`, mono sur logo). Reste la clause « méta/tags/code en JetBrains Mono » → prouvée à C1 (cartes) / C3 (code) |
| R9 | Home + article lisibles sur mobile (~375px) : **aucun** scroll horizontal **ET** grille en 1 colonne **ET** nav utilisable | Pending | |

## Status legend
- **Done** — verified, criteria passed (link to commit SHA)
- **In progress** — actively being worked
- **Pending** — not yet started
- **Deferred** — moved to a later plan (must have an approved deviation)
- **Cut** — removed from scope (must have an approved deviation)

## Task index → requirement(s) covered

| Task | Phase | Covers |
|---|---|---|
| A1 | A | Socle (scaffold Astro) — prérequis, aucun R livré directement |
| A2 | A | R8 |
| A3 | A | R5, R8 |
| B1 | B | R6 (schéma collection + helper `getPublishedPosts`) |
| B2 | B | R6 (migration des articles) |
| C1 | C | R2 |
| C2 | C | R4 |
| C3 | C | R3 |
| C4 | C | R7 |
| C5 | C | R9 |
| D1 | D | R1 |
| Z1 | Z | Audit `/anti-drift-planning:verify 1` (couverture R1–R9) |

## Updates log

(Append a one-liner each time the ledger is updated, with the new status and the commit SHA.)

- 2026-07-19 02:11 — Ledger seeded (pré-flight) — all rows Pending
- 2026-07-19 02:21 — A1 (scaffold Astro) → In progress
- 2026-07-19 02:35 — A1 → **Done** — commit `d08debf` — build PASS, review ✅ Approved (3 Minor rolled up : nom `astro-tmp`, `CLAUDE.md` stock, Astro v7). Déviations D01+D02 loggées `pending-user`.
- 2026-07-19 02:40 — A2 (Tailwind v4 + tokens + fonts) → In progress — R8 In progress
- 2026-07-19 02:47 — A2 → **Done** — commit `37709c6` — build PASS, review ✅ Approved. `--color-acc-dim` complété (dark `rgb(74 222 128 /.12)`). R8 reste In progress (attend A3).
- 2026-07-19 02:52 — A3 (BaseLayout + toggle no-flash) → In progress — R5 In progress
- 2026-07-19 03:10 — A3 → **Done** — commit `2c9a2ad` — build PASS, review ✅ Approved, smoke navigateur contrôleur ✅. **R5 → Done.** R8 reste In progress (attend C1/C3). **Phase A terminée.** 1 Minor (indent tab index.astro).
- 2026-07-19 03:18 — B1 (schéma collection blog + helper `getPublishedPosts`, TDD) → In progress — R6 In progress
- 2026-07-19 03:30 — B1 → **Done** — commit `81fa99d` — TDD RED→GREEN (vitest 1/1), `astro check` 0 erreur. `relatedProjects` **conservé** (comportement Astro documenté, sûr Plan 1) → pas de déviation. `src/content/blog/.gitkeep` = autorisé par le contrôleur (dispatch B1). R6 reste In progress (attend B2). Minor : hints `z` deprecated (v7).
- 2026-07-19 03:40 — Survey source (contrôleur) : **6 publiés** à migrer, tout YAML, pas de shortcode, pas de `description` en source, 3 covers Unsplash distantes. Déviation **D03** loggée (`1938eca`, pending-user).
- 2026-07-19 03:41 — B2 (migration des 6 articles publiés) → In progress — R6 In progress
- 2026-07-19 03:55 — B2 → **Done** — commit `6576f8e` — 6 bundles, `getPublishedPosts()`=6, build PASS 0 erreur schéma, 3 covers locales + 3 body screenshots co-localisées (reviewer a checksummé les images + diffé les bodies vs source = identiques). **Phase B terminée.** R6 : build+count(6) ✅, clause « images s'affichent » → smoke C1/C3. Minor : 2 descriptions à re-tutoyer.
- 2026-07-19 04:00 — C1 (ArticleCard + Hero + Home) → In progress — R2 In progress
- 2026-07-19 04:12 — C1 → **Done** — commit `c32fa53` — build/check/vitest PASS, review ✅ Approved. Home = hero + 6 cartes, 3 sans cover rendues proprement (sans `<img>`), CTA réels (pas de `/a-propos`). `aiUsage` mappé en helper partagé `src/lib/aiUsage.ts` (réutilisé par C3). R2 : impl-smoke + review ✅ → smoke contrôleur consolidé après C3. Minor : temps de lecture ~haut (tokens md).
- 2026-07-19 04:17 — C2 (index /blog) → In progress — R4 In progress
- 2026-07-19 04:25 — C2 → **Done** — commit `3f1d8af` — build PASS, `/blog`=6 cartes, test draft d'exclusion passé (créé→absent→supprimé, tree propre), review ✅ Approved. R4 : build+draft-test+review ✅ → smoke contrôleur consolidé après C3. Observation (non-déviation, adjugée) : tri featured home vs /blog (no-op Plan 1) → minor-findings + user.
- 2026-07-19 04:28 — C3 (page article : TOC + copie + bannière IA) → In progress — R3 In progress
