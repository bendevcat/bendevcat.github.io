# Site perso benCat — Plan 2 — Édition sans code (Sveltia CMS) · Design

**Date:** 2026-07-19
**Author:** Benoît Catillon (bendevcat)
**Predecessor:** Plan 1 (`milestone-plan-1`)
**Target:** `v0.2.0` + `milestone-plan-2`
**Methodology:** `docs/anti-drift/specs/2026-07-19-methodology.md`
**Design de référence:** `docs/anti-drift/specs/2026-07-19-site-perso-design.md`

---

## 1. Goal (incl. user story)

À la fin de ce plan, **sans toucher au code** :

1. Benoît ouvre `/admin` sur le site déployé, clique **« Sign In with Token »**, colle un **PAT GitHub** → il est authentifié (aucun backend).
2. Il **crée** un article via l'éditeur (titre, date, catégorie, tags, cover, `aiUsage`, corps markdown) → un fichier `.md` conforme est commité sur `main`.
3. Il **édite** un article existant → le changement est commité.
4. Le commit **déclenche le rebuild** (workflow du Plan 1) → l'article est en ligne sans intervention manuelle.
5. En **local**, il édite via « Work with Local Repository » (Chromium) sans serveur proxy.

**Aucune autre fonctionnalité** : les collections projets/prompts/skills dans le CMS arrivent à leurs plans respectifs ; pas d'OAuth multi-éditeurs.

## 2. Pain themes addressed

1. **Prouver le 2ᵉ pari de la stack** — CMS Git-based sur hébergement 100 % statique, **sans backend**, via PAT.
2. **Autonomie éditoriale** — publier/corriger depuis une UI, sans lancer un dev.

## 3. Success criteria

| ID | Criterion | Measure (binary) |
|---|---|---|
| R1 | `/admin/` sert Sveltia CMS depuis le CDN (**version épinglée**) | Ouvrir `/admin` → l'UI Sveltia se charge, **0 erreur** en console |
| R2 | Auth GitHub via PAT « Sign In with Token », sans backend | Coller un PAT valide → session authentifiée, le repo `bendevcat.github.io` est listé |
| R3 | Collection `blog` éditable, champs mappés sur le schéma Zod | Créer un article → fichier dans `src/content/blog/<slug>/index.md` avec frontmatter conforme au schéma |
| R4 | `omit_empty_optional_fields: true` actif | Créer un article en laissant `updatedDate` et `cover` vides → le frontmatter **n'a aucune clé vide** **ET** `astro build` passe |
| R5 | Un enregistrement CMS commit sur `main` et déclenche le déploiement | Sauver dans le CMS → nouveau commit sur `main` **ET** run Actions déclenché |
| R6 | Upload d'image géré et rendu | Uploader une cover via le CMS → fichier écrit dans le dossier média configuré **ET** visible sur l'article publié |
| R7 | Workflow d'édition locale documenté (Chromium / File System Access API) | Suivre le README : `astro dev` → `/admin` → « Work with Local Repository » édite les fichiers locaux **sans** decap-server |

## 4. Work breakdown (phases & tasks)

Détail dans le plan d'implémentation (session d'exécution). Squelette :

### Phase A — Intégration Sveltia
`public/admin/index.html` (script CDN épinglé, `robots noindex`), `public/admin/config.yml` (backend github + `repo` + branch). → R1, R2.

### Phase B — Collection blog dans le CMS
Mapper les champs du schéma Zod `blog` en widgets Sveltia, `output.omit_empty_optional_fields: true`, `media_folder`/`public_folder`. → R3, R4, R6.

### Phase C — Boucle publication & doc
Vérifier commit→déploiement, documenter le workflow local (README). → R5, R7.

### Phase Z — Verification
- **T** `/anti-drift-planning:verify 2` — audit canonique. Non contournable. Seul chemin vers ship + tag `milestone-plan-2`.

## 5. Out of scope (deferred to plan 3+)

- **Collections `projects` / `prompts` / `skills` dans le CMS** → ajoutées à leurs plans (3, 4).
- **OAuth « Login with GitHub » multi-éditeurs** (relay Cloudflare Worker) — inutile en solo ; hors scope.
- **Workflow éditorial par PR / preview de brouillons** — édition directe sur `main` (solo).

## 6. Out-of-band considerations

### 6.1 Sécurité / auth
- PAT à **scope minimal** (`repo` / `contents:write` sur le repo cible), stocké dans le localStorage du navigateur (usage perso assumé).
- `/admin` en `robots: noindex`.

### 6.2 Version pinning
Épingler la version du CDN Sveltia (`@sveltia/cms@<version>`) — pre-1.0, releases fréquentes.

### 6.3 Média
Choix `src/` (optimisation Astro) vs `public/images` (brut) tranché au plan d'implémentation ; le critère R6 reste au niveau résultat (upload + rendu).

## 7. Test strategy per phase

| Phase | Test approach |
|---|---|
| A | `/admin` charge, auth PAT (manuel) |
| B | Créer/éditer un article → frontmatter conforme, pas de clé vide, build OK |
| C | Commit→Actions déclenché · workflow local suivi depuis le README |
| Z | `/anti-drift-planning:verify 2` + walkthrough humain |

## 8. Plan self-review

1. **Spec coverage** — R1→A · R2→A · R3→B · R4→B · R5→C · R6→B · R7→C. ✅
2. **Internal consistency** — widgets CMS ↔ schéma Zod `blog` du Plan 1 ; `repo` = user-site du Plan 1.
3. **Scope check** — CMS pour la seule collection `blog` ; tient en une session.
4. **Ambiguity check** — « sans backend » = PAT (pas d'OAuth relay) ; édition directe sur `main`.

---

**Branch:** `plan-2-cms-sveltia` (off `main` @ `milestone-plan-1`)
**Ledger:** `docs/anti-drift/handoffs/plan-2-ledger.md`
**Deviations:** `docs/anti-drift/handoffs/plan-2-deviations.md`
