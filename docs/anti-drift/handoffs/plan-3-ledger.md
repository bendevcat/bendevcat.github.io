# Plan 3 — Scope Ledger

Last updated: 2026-07-31 (pré-flight)
Last updated by: main (contrôleur SDD)

## Requirements (extracted from spec §3 Success criteria)

| ID | Requirement | Status | Notes |
|---|---|---|---|
| R1 | Collection `projects` + schéma Zod (page bundles) — `astro build` valide le schéma **ET** ≥ 2 fiches réelles chargées | In progress | T-A1 (schéma + helpers + tests) puis T-A2 (fiches réelles). Le schéma est repris **verbatim** de la spec de design §3.2 — pas de champ `draft` pour les projets. |
| R2 | `/projets` rend une grille de cartes (titre, desc, statut, stack) — la page rend ≥ 2 cartes affichant ces 4 champs | Pending | T-B1. Carte = **variante** de `ArticleCard.astro` (spec §6.2), pas un nouveau design system. |
| R3 | Filtre par statut et par stack — choisir un statut → **seules** les fiches de ce statut restent visibles (idem pour une techno) | Pending | T-B2. JS vanilla progressif (spec §6.1), aucun framework. Prédicat pur testé unitairement + vérification par comptage dans le navigateur. |
| R4 | `/projets/<slug>` rend la fiche (corps + repo + démo) — corps rendu **ET** liens `repoUrl`/`demoUrl` présents quand définis | Pending | T-B3. |
| R5 | Relation bidirectionnelle `blog ↔ projects` résolue — liens cliquables, **aucun `undefined`** | Pending | Trois tâches : T-A2 (données des deux côtés), T-B3 (projet → articles), T-B4 (article → projets). `relatedProjects` existe déjà dans le schéma blog depuis le Plan 1 (`src/content.config.ts:20`) mais n'a jamais été rendu. |
| R6 | Projets éditables via le CMS — collection ajoutée au `config.yml` → créer un projet via `/admin` produit un fichier conforme au schéma | Pending | T-C1 (config + garde-fou de test) puis **T-C2, geste utilisateur** : un agent ne peut ni fournir le PAT ni actionner le sélecteur de dossier natif (établi au Plan 2). |
| R7 | Cartes/fiches en direction dark editorial-dev, responsive 375px — visuel cohérent avec le blog **ET** pas de scroll horizontal à 375px | Pending | Contrôle 375px + dark/light dans T-B1, T-B2, T-B3 et T-B4 (pas de tâche dédiée : chaque tâche livrant du gabarit le vérifie). |

## Status legend
- **Done** — verified, criteria passed (link to commit SHA)
- **In progress** — actively being worked
- **Pending** — not yet started
- **Deferred** — moved to a later plan (must have an approved deviation)
- **Cut** — removed from scope (must have an approved deviation)

## Task index → requirement(s) covered

| Task | Phase | Covers |
|---|---|---|
| A1 | A | R1 (collection `projects`, schéma Zod, helpers d'ordre + tests) |
| A2 | A | R1 (≥ 2 fiches réelles), R5 (données des deux sens) |
| B1 | B | R2 (grille + carte), R7 |
| B2 | B | R3 (filtre statut/stack), R7 |
| B3 | B | R4 (fiche + repo/démo), R5 (projet → articles), R7 |
| B4 | B | R5 (article → projets), R7 · **+ addition n°1** (lien de nav « Projets ») |
| C1 | C | R6 (collection CMS + garde-fou de test) · **+ addition n°2** (`relatedProjects` mappé côté blog) |
| C2 | C | R6 (création réelle via `/admin` — **action utilisateur**) |
| Z1 | Z | Audit `/anti-drift-planning:verify 3` (couverture R1–R7) |

## Additions au-delà de la lettre de la spec (à ratifier au gate de pré-flight)

Aucune n'est exigée par un critère R. Elles sont listées ici pour être approuvées ou coupées **explicitement**, jamais glissées en silence.

1. **Lien de nav « Projets » activé** (T-B4) — `src/components/Header.astro` le rend aujourd'hui non cliquable. Sans cette activation, `/projets` n'est atteignable qu'en tapant l'URL.
2. **`relatedProjects` mappé dans la collection `blog` du CMS** (T-C1) — champ explicitement différé par le Plan 2 (« collection `projects` = Plan 3 », omission approuvée). Sans lui, le sens article → projets reste éditable uniquement à la main.

## Updates log

(Append a one-liner each time the ledger is updated, with the new status and the commit SHA.)

- 2026-07-31 — **Ledger seeded (pré-flight)** — 7 lignes `Pending`. Branche `plan-3-vitrine-projets` créée depuis `main` (`9793f6b`, Plan 2 vérifié PASS). Plan d'implémentation écrit (`docs/anti-drift/plans/2026-07-19-plan-3-vitrine-projets.md`), log de déviations créé. **En attente de validation utilisateur avant T-A1**, avec deux questions ouvertes : les données réelles des ≥ 2 fiches projets (que le plan ne peut pas inventer) et les deux additions ci-dessus.
- 2026-07-31 — **GATE DE PRÉ-FLIGHT — plan validé par l'utilisateur.** Réponses explicites transcrites : (1) « Validé, démarre T-A1 » ; (2) **addition n°1 approuvée** — le lien de nav « Projets » sera activé en T-B4 ; (3) **addition n°2 approuvée** — `relatedProjects` sera mappé dans la collection `blog` du CMS en T-C1 ; (4) fiches retenues pour T-A2 : **`bendevcat.github.io`** (ce site) et **`awesome-french-tech-rss-feeds`**. Les deux additions étant ratifiées **avant** exécution, ce ne sont pas des déviations.
- 2026-07-31 — T-A1 (collection `projects` + schéma Zod + helpers d'ordre + tests) → **In progress** — R1 In progress.
- 2026-07-31 — T-A1 → **Done** — commit `d3978aa`. `src/content.config.ts` gagne `PROJECT_STATUSES` et la collection `projects` (schéma **verbatim** de la spec de design §3.2, sans champ `draft`) ; `src/lib/projects.ts` (`sortProjects`, `collectStacks`, `getSortedProjects`) ; `src/lib/projects.test.ts` (7 tests). **Vérifié indépendamment par le contrôleur** : `vitest` **22/22** (15 préexistants + 7), `astro check` **0 error / 0 warning** (30 hints, contre 14 au Plan 2 — hints uniquement, aucun n'est bloquant), `astro build` **8 pages**. **Revue de tâche : spec ✅ / qualité Approved**, 0 Critical, 0 Important, **1 Minor déféré** (le commentaire JSDoc de `sortProjects` affirme que `localeCompare('fr')` « ignore casse et accents » — le relecteur a vérifié en Node que c'est faux : ce sont des critères de départage secondaires. Sans conséquence fonctionnelle ; à corriger au passage d'une tâche ultérieure ou à la revue finale). Le relecteur a confronté le schéma à la **spec de design elle-même**, pas au brief. **R1 reste In progress** : sa clause « ≥ 2 fiches réelles chargées » exige T-A2. Constat honnête reporté par l'implémenteur : le build émet `[WARN] [glob-loader] No files found matching …` tant que la collection est vide — attendu, disparaît en T-A2.
- 2026-07-31 — **Constat de pré-flight, hors périmètre du Plan 3** : le tag `milestone-plan-2` et la version `v0.2.0` **n'existent pas** (`git tag -l` → `milestone-plan-1`, `plan-2-b2-evidence`, `v0.1.0`). La Phase Z du Plan 2 a bien rendu un verdict PASS (`9793f6b`), mais le ship — script de release + tag — était noté comme une action utilisateur distincte de l'audit et n'a pas été faite. La spec du Plan 3 dit « off `main` @ `milestone-plan-2` » : la branche part donc du commit **que ce tag devrait désigner**. Aucun impact sur l'exécution du Plan 3 ; à trancher par l'utilisateur (poser le tag rétroactivement ou l'assumer manquant).
