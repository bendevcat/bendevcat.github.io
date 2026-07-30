# Plan 2 — Scope Ledger

Last updated: 2026-07-30 20:35
Last updated by: main (contrôleur SDD)

## Requirements (extracted from spec §3 Success criteria)

| ID | Requirement | Status | Notes |
|---|---|---|---|
| R1 | `/admin/` sert Sveltia CMS depuis le CDN (**version épinglée**) — ouvrir `/admin` → l'UI Sveltia se charge, **0 erreur** en console | Pending | |
| R2 | Auth GitHub via PAT « Sign In with Token », sans backend — coller un PAT valide → session authentifiée, le repo `bendevcat.github.io` est listé | Pending | Vérification côté utilisateur (un agent ne manipule pas de PAT). |
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

- 2026-07-30 20:35 — Ledger seeded (pré-flight) — 7 lignes `Pending`. Branche `plan-2-cms-sveltia` créée depuis `main` (`4fabccf`). Plan d'implémentation écrit (`docs/anti-drift/plans/2026-07-19-plan-2-cms-sveltia.md`), en attente de validation utilisateur avant T-A1.
