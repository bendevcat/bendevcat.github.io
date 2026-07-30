# Plan 2 — Scope Ledger

Last updated: 2026-07-30 22:35
Last updated by: main (contrôleur SDD)

## Requirements (extracted from spec §3 Success criteria)

| ID | Requirement | Status | Notes |
|---|---|---|---|
| R1 | `/admin/` sert Sveltia CMS depuis le CDN (**version épinglée**) — ouvrir `/admin` → l'UI Sveltia se charge, **0 erreur** en console | Done | T-A1 `68ed21a` — **smoke contrôleur ✅** : UI Sveltia rendue (logo + 3 boutons d'auth + « select the root directory of the "bendevcat.github.io" repository »), **0 erreur console**, script servi depuis `unpkg.com/@sveltia/cms@0.175.1` (épinglé). Routage vérifié en production-like (`astro build` + `astro preview`) : `/admin`, `/admin/`, `/admin/index.html`, `/admin/config.yml` = **200**. En `astro dev` seul, `/admin/` = 404 → **déviation D01** (n'affecte pas R1, affecte la doc du workflow local). Reconfirmation sur `bendevcat.github.io` groupée avec R5 (T-C2). |
| R2 | Auth GitHub via PAT « Sign In with Token », sans backend — coller un PAT valide → session authentifiée, le repo `bendevcat.github.io` est listé | In progress | Config backend livrée par T-A1 ; la vérification elle-même est côté utilisateur (un agent ne manipule pas de PAT) → T-A2. |
| R3 | Collection `blog` éditable, champs mappés sur le schéma Zod — créer un article → fichier dans `src/content/blog/<slug>/index.md` avec frontmatter conforme au schéma | In progress | T-B1 (mapping + test) puis T-B2 (création réelle). `relatedProjects` non mappé — omission **approuvée par l'utilisateur** au gate de validation du plan (collection `projects` = Plan 3), donc pas de déviation. |
| R4 | `omit_empty_optional_fields: true` actif — créer un article en laissant `updatedDate` et `cover` vides → le frontmatter **n'a aucune clé vide** **ET** `astro build` passe | In progress | Le défaut Sveltia est `false` → déclaration explicite obligatoire. T-B1 (config) puis T-B2 (preuve). |
| R5 | Un enregistrement CMS commit sur `main` et déclenche le déploiement — sauver dans le CMS → nouveau commit sur `main` **ET** run Actions déclenché | Pending | Vérifiable seulement après merge sur `main` (post-merge, comme R1 au Plan 1). |
| R6 | Upload d'image géré et rendu — uploader une cover via le CMS → fichier écrit dans le dossier média configuré **ET** visible sur l'article publié | In progress | Stratégie médias tranchée (spec §6.3 la laissait ouverte) : *entry-relative* (`media_folder: ''` / `public_folder: ''`) → l'image atterrit dans le dossier de l'article, `image()` d'Astro l'optimise. Vérifié empiriquement en pré-flight : un `cover:` sans préfixe `./` passe `astro build`. T-B1 (config) puis T-B2 (upload réel). |
| R7 | Workflow d'édition locale documenté (Chromium / File System Access API) — suivre le README : `astro dev` → `/admin` → « Work with Local Repository » édite les fichiers locaux **sans** decap-server | In progress | T-C1 rédige le README. La clause « suivre le README » exige que le pas-à-pas soit réellement **exécuté** → dépend de T-B2, bloquée côté utilisateur. URL locale = `/admin/index.html` (déviation D01). |

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
- 2026-07-30 21:25 — T-B1 (mapping du schéma Zod en widgets Sveltia + `output` + médias entry-relative) → **In progress** — R3, R4, R6 In progress.
- 2026-07-30 21:45 — **Déviation D02 loggée** (`a4d8744`, `pending-user`) : T-C1 (README) sera exécutée AVANT T-B2. Motif mesuré : le mode « Work with Local Repository » exige le sélecteur de dossier **natif** ; un navigateur piloté échoue (« A repository root directory could not be selected »). **T-B2 n'est exécutable que par l'utilisateur.**
- 2026-07-30 21:55 — **Déviation D03 loggée** (`93a1fc0`, `pending-user`) : `@types/node` ajouté (non prévu au plan). Motif : `npx astro check` échouait (`ts(2591)` sur `node:fs` dans `src/lib/cms-config.test.ts`) — **régression introduite en T-A1**, invisible pour l'implémenteur et les 2 relecteurs car aucune étape du plan ne lançait `astro check`. Détectée par le contrôleur en repassant la suite complète.
- 2026-07-30 22:00 — **Correctif round 1** → commit `d9e900a`. Vérifié **par le contrôleur** : `astro check` **0 error / 0 warning / 14 hints** (retour à l'état de fin du Plan 1), `vitest` 12/12, `astro build` 8 pages. `tsconfig.json` non modifié, `src/lib/cms-config.test.ts` intact. Re-revue ciblée dispatchée.
- 2026-07-30 22:05 — T-B1 → **Done** — commit `e84d0dd` (+ correctif `d9e900a`). **Revue de tâche : spec ✅ / qualité Approved**, 0 Critical, 0 Important, 3 Minor (Step 5 : collection « Articles » non observable sans authentification — écran d'auth du backend, hors périmètre B1 ; `sortable_fields`/`identifier_field`/`slug`/`description` non couverts par une assertion ; options `aiUsage` comparées à un littéral car `content.config.ts` n'exporte pas cet array). Mapping Zod→Sveltia complet hors `relatedProjects` (omission approuvée). **R3/R4/R6 restent In progress** : la config est livrée et testée, mais leur preuve exige une création d'article réelle via le CMS → T-B2, **bloquée côté utilisateur**.
- 2026-07-30 22:06 — **Vérification T-C2 Step 1 (contrôleur)** : `.github/workflows/deploy.yml` déclenche bien sur `push: { branches: [main] }` et n'a **pas** été modifié par le Plan 2 (`git diff main` vide sur ce fichier). Le mécanisme de R5 est en place ; seule l'observation de bout en bout reste à faire par l'utilisateur.
- 2026-07-30 22:07 — T-C1 (README : workflows d'édition prod + local) → **In progress** — R7 In progress.
- 2026-07-30 22:30 — **Re-revue ciblée du correctif** (`d9e900a`) : **ADDRESSED**. Vérifié indépendamment : `astro check` 0 error, `vitest` 12/12, aucun `@ts-ignore`/`skipLibCheck`/exclusion, `tsconfig.json` et `src/lib/cms-config.test.ts` intacts. Aucune casse introduite. Boucle de correctif close (1 round sur 5).
- 2026-07-30 22:35 — T-C1 → **Done** — commit `f5f2bc8` (README, +51 lignes, aucun autre fichier). **Revue de tâche : spec ✅ / qualité Approved**, 0 Critical, 0 Important. Le relecteur a re-vérifié les faits **contre les sources** et non contre le rapport : `curl /admin/` = 404 vs `/admin/index.html` = 200 ; libellé « Sign In Using Access Token » trouvé littéralement dans le bundle `@sveltia/cms@0.175.1` ; existence du bouton OAuth confirmée dans le même bundle ; dépôt, workflow, chemins d'articles et d'images confrontés à `config.yml` / `content.config.ts` / `deploy.yml`. 2 Minor non bloquants (persistance exacte du jeton en localStorage et redemande du dossier à chaque session : non vérifiables sans exécution réelle). **R7 reste In progress** : le README existe, mais la clause « suivre le README » exige que le pas-à-pas soit réellement exécuté → T-B2, bloquée côté utilisateur.
- 2026-07-30 22:40 — **FIN DE SESSION — état : « prêt à ship, décisions en attente ».** Livré et revu : T-A1, T-B1 (+ correctif), T-C1. **1 critère sur 7 Done (R1)** ; R2/R3/R4/R6/R7 In progress, R5 Pending — tous bloqués sur des gestes que seul l'utilisateur peut poser (jeton PAT, sélecteur de dossier natif, déploiement). **Phase Z NON lancée** : le gate exige 0 `pending-user` (or **D01, D02, D03** sont en attente) **et** la couverture des critères. Handoff écrit : `docs/anti-drift/handoffs/plan-2-handoff.md` (`23daa33`). Reprise : `/anti-drift-planning:resume 2`.
