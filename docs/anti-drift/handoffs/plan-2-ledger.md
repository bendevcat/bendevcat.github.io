# Plan 2 — Scope Ledger

Last updated: 2026-07-30 20:35
Last updated by: main (contrôleur SDD)

## Requirements (extracted from spec §3 Success criteria)

| ID | Requirement | Status | Notes |
|---|---|---|---|
| R1 | `/admin/` sert Sveltia CMS depuis le CDN (**version épinglée**) — ouvrir `/admin` → l'UI Sveltia se charge, **0 erreur** en console | Done | T-A1 `68ed21a` — **smoke contrôleur ✅** : UI Sveltia rendue (logo + 3 boutons d'auth + « select the root directory of the "bendevcat.github.io" repository »), **0 erreur console**, script servi depuis `unpkg.com/@sveltia/cms@0.175.1` (épinglé). Routage vérifié en production-like (`astro build` + `astro preview`) : `/admin`, `/admin/`, `/admin/index.html`, `/admin/config.yml` = **200**. En `astro dev` seul, `/admin/` = 404 → **déviation D01** (n'affecte pas R1, affecte la doc du workflow local). Reconfirmation sur `bendevcat.github.io` groupée avec R5 (T-C2). |
| R2 | Auth GitHub via PAT « Sign In with Token », sans backend — coller un PAT valide → session authentifiée, le repo `bendevcat.github.io` est listé | In progress | Config backend livrée par T-A1 ; la vérification elle-même est côté utilisateur (un agent ne manipule pas de PAT) → T-A2. |
| R3 | Collection `blog` éditable, champs mappés sur le schéma Zod — créer un article → fichier dans `src/content/blog/<slug>/index.md` avec frontmatter conforme au schéma | Pending | |
| R4 | `omit_empty_optional_fields: true` actif — créer un article en laissant `updatedDate` et `cover` vides → le frontmatter **n'a aucune clé vide** **ET** `astro build` passe | Pending | Le défaut Sveltia est `false` → déclaration explicite obligatoire. |
| R5 | Un enregistrement CMS commit sur `main` et déclenche le déploiement — sauver dans le CMS → nouveau commit sur `main` **ET** run Actions déclenché | Pending | Vérifiable seulement après merge sur `main` (post-merge, comme R1 au Plan 1). |
| R6 | Upload d'image géré et rendu — uploader une cover via le CMS → fichier écrit dans le dossier média configuré **ET** visible sur l'article publié | Pending | |
| R7 | Workflow d'édition locale documenté (Chromium / File System Access API) — suivre le README : `astro dev` → `/admin` → « Work with Local Repository » édite les fichiers locaux **sans** decap-server | Pending | |

## Status legend
- **Done** — verified, criteria passed (link to commit SHA)
- **In progress** — actively being worked
- **Pending** — not yet started
- **Deferred** — moved to a later plan (must have an approved deviation)
- **Cut** — removed from scope (must have an approved deviation)

## Task index → requirement(s) covered

| Task | Phase | Covers |
|---|---|---|
| A1 | A | R1 (page `/admin` + config valide + test de non-régression), R2 (config backend) |
| A2 | A | R2 (vérification auth PAT — action utilisateur) |
| B1 | B | R3, R4, R6 (mapping des champs, `output`, médias entry-relative) |
| B2 | B | R3, R4, R6 (création/édition réelle via le workflow local) |
| C1 | C | R7 (README : workflows prod + local) |
| C2 | C | R5 (boucle commit → Actions — vérification post-merge) |
| Z1 | Z | Audit `/anti-drift-planning:verify 2` (couverture R1–R7) |

## Updates log

(Append a one-liner each time the ledger is updated, with the new status and the commit SHA.)

- 2026-07-30 20:35 — Ledger seeded (pré-flight) — 7 lignes `Pending`. Branche `plan-2-cms-sveltia` créée depuis `main` (`4fabccf`). Plan d'implémentation écrit (`docs/anti-drift/plans/2026-07-19-plan-2-cms-sveltia.md`), en attente de validation utilisateur avant T-A1. Commit `7b25cd7`.
- 2026-07-30 20:45 — **Plan validé par l'utilisateur** (gate de pré-flight). 3 décisions prises AVANT exécution, plan amendé en conséquence (`ccde9fd`) : (1) plan validé tel quel → démarrer T-A1 ; (2) `relatedProjects` **non mappé** dans le CMS (référence la collection `projects` du Plan 3) → **approuvé explicitement**, donc pas de déviation ; (3) version CDN épinglée = **`0.175.1`** (et non `0.176.0`, sortie le jour même) → amendement du plan avant toute exécution, donc pas de déviation.
- 2026-07-30 20:47 — T-A1 (page `/admin` + config valide + test de non-régression) → **In progress** — R1 In progress, R2 In progress (partie config).
- 2026-07-30 21:05 — **Déviation D01 loggée** (`111f46e`, `pending-user`) : en `astro dev`, l'URL du CMS est `/admin/index.html` (`/admin/` = 404, mesuré) ; en production-like tout répond 200. Réversibilité `cheap` → on procède, remédiation portée par T-B2 (Step 1) et T-C1 (README).
- 2026-07-30 21:20 — T-A1 → **Done** — commit `68ed21a`. Tests : `vitest` 3/3 sur `src/lib/cms-config.test.ts` (+ `sortAndFilter` 1/1 intact), `astro build` OK, `dist/admin/{index.html,config.yml}` présents. **Revue de tâche : spec ✅ / qualité Approved**, 0 Critical ; 1 Important = l'écart D01 (le relecteur le renvoie explicitement à T-C1, hors périmètre A1) ; 3 Minor (libellé réel du bouton = « Sign In Using Access Token » et non « Sign In with Token » comme écrit en spec R2 — libellé du bundle CDN, pas de notre fait ; warning Sveltia « version plus récente disponible » ; 1 vulnérabilité npm high préexistante au repo, hors scope). **Smoke contrôleur ✅ → R1 → Done.** R2 reste In progress (auth PAT = action utilisateur, T-A2).
