# Plan 1 — Scope Ledger

Last updated: 2026-07-19 02:53
Last updated by: main (contrôleur SDD)

## Requirements (extracted from spec §3 Success criteria)

| ID | Requirement | Status | Notes |
|---|---|---|---|
| R1 | Un push sur `main` déclenche le workflow GitHub Actions (`withastro/action`) qui build et déploie le site (run vert **ET** `curl -sI https://bendevcat.github.io` = `200` HTML) | Pending | Dépend d'actions manuelles GitHub (création repo `bendevcat.github.io`, Pages source = Actions) |
| R2 | La home `/` affiche un hero + une grille d'articles récents (hero **ET** ≥ 3 cartes réelles : titre, date, catégorie, description) | Pending | |
| R3 | Un article `/blog/<slug>` : contenu complet + TOC (H2/H3) + blocs de code à bouton copier + bannière IA conditionnelle (visible si `aiUsage` défini) | Pending | |
| R4 | `/blog` liste **tous** les articles publiés (`draft:false`), tri anté-chronologique (nb cartes = nb publiés **ET** aucun `draft:true` visible) | Pending | |
| R5 | Toggle de thème clair/sombre persistant (change le thème **ET** reload conserve via localStorage **ET** 1er chargement suit `prefers-color-scheme`) | In progress | A3 — vérif navigateur (smoke) après implémentation |
| R6 | Tous les articles publiés de `bencat-website` migrés en entrées `blog`, schéma Zod valide, images co-localisées rendues (`astro build` OK **ET** count = ancien site **ET** images affichées) | Pending | Source = `../bencat-website/content/posts/` (15 fichiers, count publiés à établir en B2) |
| R7 | `/rss.xml` généré, listant les articles publiés (RSS valide, 1 `<item>`/article : titre, lien, date, description) | Pending | |
| R8 | Design system : tokens couleur (clair+sombre) + 3 polices via `@theme` Tailwind v4, mono sur les éléments techniques (3 polices chargées **ET** toggle applique `--color-*` **ET** méta/tags/code en JetBrains Mono) | In progress | A2 (tokens+fonts) puis A3 (toggle applique le thème) |
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
