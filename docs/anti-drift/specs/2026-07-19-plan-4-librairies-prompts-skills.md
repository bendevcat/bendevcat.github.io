# Site perso benCat — Plan 4 — Librairies prompts & skills · Design

**Date:** 2026-07-19
**Author:** Benoît Catillon (bendevcat)
**Predecessor:** Plan 3 (`milestone-plan-3`)
**Target:** `v0.4.0` + `milestone-plan-4`
**Methodology:** `docs/anti-drift/specs/2026-07-19-methodology.md`
**Design de référence:** `docs/anti-drift/specs/2026-07-19-site-perso-design.md`

---

## 1. Goal (incl. user story)

À la fin de ce plan, **sans aide** :

1. Un visiteur ouvre `/prompts` → liste de cartes (titre, description, `format` fiche/guide, `tool`, tags), **filtrable** par format / outil / tag.
2. Sur une fiche, il **copie le prompt en 1 clic** (feedback visuel).
3. Il ouvre `/prompts/<slug>` : **fiche** (prompt copiable + notes) ou **guide** (write-up long).
4. Il ouvre `/skills` → liste des **skills Claude Code** (titre, description, tags, `type`), filtrable par tag/type.
5. Il ouvre `/skills/<slug>` : instructions, `installCmd` (copiable), lien repo, **prompts liés**.
6. (Build) Benoît **édite prompts & skills via le CMS**.

**Aucune autre fonctionnalité** : recherche / tags cross-collection / `/a-propos` / `/transparence-ia` (Plan 5).

## 2. Pain themes addressed

1. **Partage de la matière IA** — prompts et skills Claude Code deviennent réutilisables par la communauté.
2. **Copier-coller sans friction** — la valeur d'une fiche = récupérer le prompt / la commande d'install en 1 clic.

## 3. Success criteria

| ID | Criterion | Measure (binary) |
|---|---|---|
| R1 | Collections `prompts` + `skills` + schémas Zod (page bundles) | `astro build` valide les 2 schémas **ET** ≥ 2 prompts + ≥ 2 skills réels |
| R2 | `/prompts` grille + filtre format/outil/tag | ≥ 2 cartes **ET** filtrer par `format` → seules les entrées correspondantes restent |
| R3 | Copie 1 clic du prompt sur une fiche | Cliquer « copier » → le contenu du champ `prompt` est au presse-papier **ET** feedback visuel affiché |
| R4 | `/prompts/<slug>` distingue fiche vs guide | `format:fiche` → prompt copiable + notes ; `format:guide` → write-up long rendu |
| R5 | `/skills` grille + filtre tag/type | ≥ 2 cartes **ET** filtrer par tag → sous-ensemble correct |
| R6 | `/skills/<slug>` rend instructions + `installCmd` + repo + prompts liés | Corps rendu **ET** `installCmd` affiché et copiable **ET** `relatedPrompts` résolus (cliquables) |
| R7 | Relation `skills ↔ prompts` résolue | Un skill liste ses prompts liés ; navigation croisée, **aucun `undefined`** |
| R8 | Prompts & skills éditables via le CMS | Les 2 collections ajoutées au `config.yml` → créer via `/admin` produit des fichiers conformes |
| R9 | Direction dark editorial-dev + responsive 375px | Visuel cohérent **ET** pas de scroll horizontal à 375px |

## 4. Work breakdown (phases & tasks)

### Phase A — Collections & données
`prompts` + `skills` dans `content.config.ts` (champ `prompt`, `format`, `tool`, `type`, `installCmd`, `reference()` skills↔prompts), ≥2 entrées chacune. → R1, R7.

### Phase B — Pages prompts
`/prompts` (grille + filtre), `/prompts/[slug]` (fiche vs guide), **bouton copier** (JS vanilla presse-papier). → R2, R3, R4.

### Phase C — Pages skills
`/skills` (grille + filtre), `/skills/[slug]` (instructions + `installCmd` copiable + prompts liés). → R5, R6, R9.

### Phase D — CMS
Ajouter `prompts` + `skills` au `config.yml`. → R8.

### Phase Z — Verification
- **T** `/anti-drift-planning:verify 4` — audit canonique. Non contournable. Seul chemin vers ship + tag `milestone-plan-4`.

## 5. Out of scope (deferred to plan 5)

- **Recherche Pagefind** (elle indexera prompts/skills au Plan 5).
- **`/tags` + `/tags/[tag]` cross-collection**, filtres catégorie/tag du blog, `/a-propos`, `/transparence-ia`, `/404` → Plan 5.
- **Élargissement `skills` hors Claude Code** (le champ `type` est prêt mais reste `claude-code` au v1).

## 6. Out-of-band considerations

### 6.1 Copie presse-papier
`navigator.clipboard.writeText` en JS vanilla (pas de framework) ; fallback + feedback visuel (« Copié ! »).

### 6.2 Rendu du prompt
Le champ `prompt` (fiche) est rendu dans un bloc de code réutilisant le composant code-block du Plan 1.

### 6.3 Filtrage
Même approche JS vanilla que les projets (Plan 3) — composant filtre réutilisé.

## 7. Test strategy per phase

| Phase | Test approach |
|---|---|
| A | Build valide les 2 schémas · références skills↔prompts résolues |
| B | Grille + filtre + **copie** (manuel) · fiche vs guide |
| C | Skill rend install/prompts liés · smoke 375px |
| D | Créer prompt & skill via `/admin` → fichiers conformes |
| Z | `/anti-drift-planning:verify 4` + walkthrough humain |

## 8. Plan self-review

1. **Spec coverage** — R1→A · R2→B · R3→B · R4→B · R5→C · R6→C · R7→A · R8→D · R9→C. ✅
2. **Internal consistency** — champ `prompt`/`format`/`type` alignés sur la spec de design ; composants copier/filtre réutilisés du blog & des projets.
3. **Scope check** — 2 collections jumelles + pages + CMS ; le plus gros plan mais cohérent (choix validé de ne pas scinder).
4. **Ambiguity check** — « copier » = champ `prompt` (fiche) ; fiche vs guide = champ `format` ; filtres locaux (pas cross-collection).

---

**Branch:** `plan-4-librairies-prompts-skills` (off `main` @ `milestone-plan-3`)
**Ledger:** `docs/anti-drift/handoffs/plan-4-ledger.md`
**Deviations:** `docs/anti-drift/handoffs/plan-4-deviations.md`
