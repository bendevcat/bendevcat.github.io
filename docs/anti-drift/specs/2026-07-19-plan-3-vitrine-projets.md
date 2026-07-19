# Site perso benCat — Plan 3 — Vitrine projets · Design

**Date:** 2026-07-19
**Author:** Benoît Catillon (bendevcat)
**Predecessor:** Plan 2 (`milestone-plan-2`)
**Target:** `v0.3.0` + `milestone-plan-3`
**Methodology:** `docs/anti-drift/specs/2026-07-19-methodology.md`
**Design de référence:** `docs/anti-drift/specs/2026-07-19-site-perso-design.md`

---

## 1. Goal (incl. user story)

À la fin de ce plan, **sans aide** :

1. Un visiteur ouvre `/projets` → une **grille de cartes** (titre, description, statut, stack).
2. Il **filtre** par statut (`actif`/`wip`/`archivé`) et par techno (`stack`).
3. Il ouvre `/projets/<slug>` → **fiche détaillée** : corps, liens repo & démo, techno, articles liés.
4. Depuis un **article lié**, il navigue vers le projet — et réciproquement (relation `blog ↔ projects`).
5. (Build) Benoît **édite les projets via le CMS**.

**Aucune autre fonctionnalité** : prompts/skills (Plan 4), recherche/tags cross-collection (Plan 5).

## 2. Pain themes addressed

1. **Mise en avant du savoir-faire** — les réalisations (extensions, outils, POCs) deviennent visibles et navigables.
2. **Continuité du récit** — relier un projet à l'article qui raconte son histoire.

## 3. Success criteria

| ID | Criterion | Measure (binary) |
|---|---|---|
| R1 | Collection `projects` + schéma Zod (page bundles) | `astro build` valide le schéma **ET** ≥ 2 fiches réelles chargées |
| R2 | `/projets` rend une grille de cartes (titre, desc, statut, stack) | La page rend ≥ 2 cartes affichant ces 4 champs |
| R3 | Filtre par statut et par stack | Choisir un statut → **seules** les fiches de ce statut restent visibles (idem pour une techno) |
| R4 | `/projets/<slug>` rend la fiche (corps + repo + démo) | Ouvrir une fiche → corps rendu **ET** liens `repoUrl`/`demoUrl` présents quand définis |
| R5 | Relation bidirectionnelle `blog ↔ projects` résolue | Un projet avec `relatedPosts` liste ses articles **ET** un article avec `relatedProjects` liste ses projets — liens cliquables, **aucun `undefined`** |
| R6 | Projets éditables via le CMS | Collection ajoutée au `config.yml` → créer un projet via `/admin` produit un fichier conforme au schéma |
| R7 | Cartes/fiches en direction dark editorial-dev, responsive 375px | Visuel cohérent avec le blog **ET** pas de scroll horizontal à 375px |

## 4. Work breakdown (phases & tasks)

### Phase A — Collection & données
`projects` dans `content.config.ts` (page bundles), champ `relatedPosts`/`relatedProjects` (`reference()`), ≥2 fiches réelles. → R1, R5.

### Phase B — Pages
`/projets` (grille + filtre statut/stack, en JS vanilla progressif — pas de framework), `/projets/[slug]` (fiche + repo/démo + articles liés). → R2, R3, R4, R7.

### Phase C — CMS
Ajouter `projects` au `config.yml` Sveltia. → R6.

### Phase Z — Verification
- **T** `/anti-drift-planning:verify 3` — audit canonique. Non contournable. Seul chemin vers ship + tag `milestone-plan-3`.

## 5. Out of scope (deferred to plan 4+)

- **Collections `prompts` / `skills`** → Plan 4.
- **Recherche Pagefind, `/tags` cross-collection, filtres catégorie/tag du blog** → Plan 5.
- Le filtre projets reste **local à `/projets`** (pas d'agrégation multi-collections — c'est le Plan 5).

## 6. Out-of-band considerations

### 6.1 Filtrage sans framework
Le filtre statut/stack = **enhancement JS vanilla** (montrer/masquer), cohérent avec « pas d'îlot React au lancement ».

### 6.2 Réutilisation
Réutiliser le composant carte du blog (variante projet) — pas de nouveau design system.

## 7. Test strategy per phase

| Phase | Test approach |
|---|---|
| A | Build valide le schéma · références résolues |
| B | Grille + filtre (manuel) · fiche rend repo/démo · smoke 375px |
| C | Créer un projet via `/admin` → fichier conforme |
| Z | `/anti-drift-planning:verify 3` + walkthrough humain |

## 8. Plan self-review

1. **Spec coverage** — R1→A · R2→B · R3→B · R4→B · R5→A · R6→C · R7→B. ✅
2. **Internal consistency** — `reference()` blog↔projects aligné sur la spec de design ; widgets CMS ↔ schéma.
3. **Scope check** — une collection + ses pages + CMS ; une session.
4. **Ambiguity check** — « filtre » = local à `/projets`, JS vanilla ; relations bidirectionnelles explicites.

---

**Branch:** `plan-3-vitrine-projets` (off `main` @ `milestone-plan-2`)
**Ledger:** `docs/anti-drift/handoffs/plan-3-ledger.md`
**Deviations:** `docs/anti-drift/handoffs/plan-3-deviations.md`
