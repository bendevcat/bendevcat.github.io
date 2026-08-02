# Plan 4 — Scope Ledger

Last updated: 2026-08-02 (pré-flight)
Last updated by: main (contrôleur SDD)

## Requirements (extracted from spec §3 Success criteria)

| ID | Requirement | Status | Notes |
|---|---|---|---|
| R1 | Collections `prompts` + `skills` + schémas Zod (page bundles) — `astro build` valide les 2 schémas **ET** ≥ 2 prompts + ≥ 2 skills réels | In progress | T-A1 (schémas + helpers + tests) puis T-A2 (contenu réel). Schémas repris **verbatim** de la spec de design §3.3 et §3.4 — ni champ en plus, ni champ en moins. `draft` **existe** ici, contrairement à `projects`. |
| R2 | `/prompts` grille + filtre format/outil/tag — ≥ 2 cartes **ET** filtrer par `format` → seules les entrées correspondantes restent | Pending | T-B1 (carte + grille) puis T-B2 (filtre). Carte = **variante** de `ProjectCard.astro`. Vérification du filtre par **comptage**, pas à l'œil. |
| R3 | Copie 1 clic du prompt sur une fiche — contenu du champ `prompt` au presse-papier **ET** feedback visuel | Pending | T-B3. **Réutilise** le bouton de code-block du Plan 1 (spec §6.2) ; ce plan lui ajoute le **fallback** exigé par la spec §6.1, aujourd'hui absent. Vérifié en lisant le presse-papier, pas seulement le libellé du bouton. |
| R4 | `/prompts/<slug>` distingue fiche vs guide | Pending | T-B3. Règle pure `shouldRenderPromptBlock`, testée unitairement, y compris le cas « fiche sans `prompt` » (le schéma laisse le champ optionnel sur les deux formats). |
| R5 | `/skills` grille + filtre tag/type — ≥ 2 cartes **ET** filtrer par tag → sous-ensemble correct | Pending | T-C1. Aucun nouveau moteur de filtrage : réutilise celui de T-B2. |
| R6 | `/skills/<slug>` rend instructions + `installCmd` copiable + repo + prompts liés | Pending | T-C2. `installCmd` rendu dans un `<pre><code>` sous `<article>` → bouton du Plan 1. |
| R7 | Relation `skills ↔ prompts` résolue, aucun `undefined` | In progress | T-A1 (garde-fou `assertEntriesResolved`, déplacé dans `src/lib/references.ts`), T-A2 (données + preuve d'échec par sonde), T-C2 (rendu + preuve d'échec réelle). **Fait établi au Plan 3 : une référence cassée laisse le build VERT tant qu'aucune page ne la résout.** |
| R8 | Prompts & skills éditables via le CMS | Pending | T-D1 (config + garde-fou de test) puis **T-D2, geste utilisateur** : un agent ne peut ni fournir le PAT ni actionner le sélecteur de dossier natif (établi au Plan 2, reconfirmé au Plan 3). |
| R9 | Direction dark editorial-dev + responsive 375px — pas de scroll horizontal à 375px | Pending | Contrôle 375px **dark et light** dans T-B1, T-B2, T-B3, T-C1 et T-C2 (pas de tâche dédiée : chaque tâche livrant du gabarit le vérifie). |

## Status legend
- **Done** — verified, criteria passed (link to commit SHA)
- **In progress** — actively being worked
- **Pending** — not yet started
- **Deferred** — moved to a later plan (must have an approved deviation)
- **Cut** — removed from scope (must have an approved deviation)

## Task index → requirement(s) covered

| Task | Phase | Covers |
|---|---|---|
| A1 | A | R1 (collections, schémas Zod, helpers + tests), R7 (garde-fou de résolution) |
| A2 | A | R1 (≥ 2 prompts + ≥ 2 skills réels), R7 (données des deux sens) |
| B1 | B | R2 (carte + grille `/prompts`), R9 |
| B2 | B | R2 (filtre format/outil/tag — moteur à facettes), R9 |
| B3 | B | R3 (copie + fallback), R4 (fiche vs guide), R9 · **+ addition n°2** (sens prompt → skills) |
| C1 | C | R5 (grille `/skills` + filtre tag/type), R9 |
| C2 | C | R6 (instructions + `installCmd` + repo + prompts liés), R7 (rendu), R9 · **+ addition n°1** (nav « Prompts »/« Skills ») |
| D1 | D | R8 (collections CMS + garde-fou de test) · **+ addition n°3** (`delete: false`) |
| D2 | D | R8 (création réelle via `/admin` — **action utilisateur**) |
| Z1 | Z | Audit `/anti-drift-planning:verify 4` (couverture R1–R9) |

## Additions au-delà de la lettre de la spec (à ratifier au gate de pré-flight)

Aucune n'est exigée par un critère R. Elles sont listées ici pour être approuvées ou coupées **explicitement**, jamais glissées en silence.

1. **Liens de nav « Prompts » et « Skills » activés** (T-C2) — `src/components/Header.astro:12-18` les rend aujourd'hui non cliquables (« Bientôt disponible »). Sans cette activation, `/prompts` et `/skills` ne sont atteignables qu'en tapant l'URL. Même addition, même justification que l'addition n°1 ratifiée au Plan 3 pour « Projets ».
2. **Sens `prompt → skills liés`** (T-B3) — R6 et R7 n'exigent que le sens **skill → prompts**. Le champ `relatedSkills` existe pourtant côté `prompts` (spec de design §3.3) et R7 s'intitule `skills ↔ prompts` avec une double flèche. Sans cette addition, `relatedSkills` reste un champ de données jamais affiché.
3. **`delete: false` sur les 2 nouvelles collections CMS** (T-D1) — le Plan 3 a établi (déviation **D08, approuvée**) que le CMS ne nettoie jamais les rétro-références et qu'une suppression depuis `/admin` casse `astro build` en produisant **0 page**. Le risque est identique ici (relation symétrique), mais c'est un choix **observable** que la spec du Plan 4 ne mentionne pas.

## Décisions d'implémentation tranchées par le plan (spec muette — ratification au gate)

- **Périmètre exact de la réutilisation du filtre** (spec §6.3) : le **prédicat** est généralisé en un moteur unique (`src/lib/facetFilters.ts`) dont `projectFilters.ts` devient un adaptateur ; le **script DOM** du Plan 3 n'est **pas** migré (aucun critère du Plan 4 ne l'exige, et le réécrire toucherait une page livrée et vérifiée). Résiduel assumé : deux scripts DOM au-dessus d'un moteur unique.
- **Fallback presse-papier** : `copy-code.ts` du Plan 1 n'a ni fallback ni feedback d'échec ; la spec §6.1 exige les deux. Ajoutés en T-B3, chemin nominal inchangé.
- **Ordre des grilles** : titre A→Z (ni date ni `featured` dans ces schémas).
- **Entrées `draft`** : écartées des listes et des liens (pas de route publique — les lier produirait un 404).
- **Fiche sans `prompt`** : le schéma n'est **pas** durci ; le rendu n'affiche simplement pas de bloc vide.
- **Pas de TOC sur les guides**, **pas de couverture d'image** (absente des schémas §3.3/§3.4).

## Updates log

(Append a one-liner each time the ledger is updated, with the new status and the commit SHA.)

- 2026-08-02 — **Ledger seeded (pré-flight)** — 9 lignes `Pending`. Branche `plan-4-librairies-prompts-skills` créée depuis `main` (`eb9deee`, tag `milestone-plan-3`, Plan 3 vérifié PASS). Plan d'implémentation écrit (`docs/anti-drift/plans/2026-07-19-plan-4-librairies-prompts-skills.md`), log de déviations créé. Baseline mesurée sur la branche : `npm test` **42 tests / 4 fichiers**, `npx astro check` **0 error / 0 warning / 33 hints**, `npx astro build` **9 pages**. **En attente de validation utilisateur avant T-A1**, avec trois questions ouvertes : le contenu réel de T-A2 (2 prompts + 2 skills, qu'un agent ne peut pas inventer), les trois additions ci-dessus, et une **contradiction relevée entre le prompt de bootstrap et la spec** — le prompt demande de taguer `milestone-plan-3` (déjà posé, Plan 3), alors que la spec §4 Phase Z et l'en-tête (`Target: v0.4.0 + milestone-plan-4`) désignent `milestone-plan-4`.
- 2026-08-02 — **GATE DE PRÉ-FLIGHT — plan validé par l'utilisateur.** Réponses explicites transcrites : (1) « **Validé, démarre T-A1** » ; (2) **les trois additions sont approuvées** — n°1 nav « Prompts »/« Skills » activée en T-C2, n°2 sens `prompt → skills liés` rendu en T-B3, n°3 `delete: false` sur les 2 nouvelles collections CMS en T-D1 ; (3) **matière de T-A2 = anti-drift** — 1 fiche (le prompt de bootstrap réellement utilisé), 1 guide (découper un projet en plans anti-drift), 1 skill (le plugin `anti-drift-planning` de l'utilisateur, v0.4.0, MIT) ; (4) **tag et version : `milestone-plan-4` + `v0.4.0`**, conformément à la spec §4 et à son en-tête — le prompt de session demandait `milestone-plan-3`, tag déjà posé sur `eb9deee` au Plan 3, et ne sera **pas** déplacé. Les trois additions étant ratifiées **avant** exécution, ce ne sont pas des déviations. **Point resté ouvert, à trancher avant T-A2 : le 2ᵉ skill réel exigé par R1 n'est pas encore nommé.** Il ne bloque pas T-A1 (schémas, helpers, tests — aucun contenu).
- 2026-08-02 — T-A1 (collections `prompts` + `skills`, schémas Zod, helpers, garde-fou de références) → **In progress** — R1 et R7 In progress.
- 2026-08-02 — **T-A1 → Done** — commits `b316b45` (implémentation) et `f0d9b17` (fix round 1). `src/content.config.ts` gagne `PROMPT_FORMATS` et les collections `prompts` + `skills` (schémas **verbatim** de la spec de design §3.3/§3.4) ; `src/lib/references.ts` accueille `assertEntriesResolved` (déplacée depuis `projects.ts`) ; `src/lib/prompts.ts` et `src/lib/skills.ts` (tri, agrégations, `sortAndFilterPrompts`/`sortAndFilterSkills` pures sur le modèle de `sortAndFilter`) ; 14 tests ajoutés. **Vérifié indépendamment par le contrôleur** : `vitest` **56/56** (42 baseline + 14), `astro check` **0 error / 0 warning** (57 hints, contre 33 avant — hints uniquement, aucun bloquant), `astro build` **11 pages**, et `diff` du corps d'`assertEntriesResolved` avant/après **vide** (le déplacement est bien pur).
  - **Revue de tâche : spec ❌ / qualité Changes requested** → 0 Critical, **2 Important**, 5 Minor. Le relecteur a confronté les deux schémas Zod à la **spec de design elle-même**, pas au brief : **9/9 champs `prompts` et 10/10 `skills` conformes**, aucun champ en trop, mêmes types, défauts et optionnalités. **I1** : le filtrage `draft` était exigé par le plan, utilisé par T-C2, et couvert par **aucun** test — inliné dans la fonction `async`, donc hors de portée d'un test unitaire. **I2** : le JSDoc d'`assertEntriesResolved` avait été **réécrit** au lieu d'être déplacé, perdant la citation du code d'Astro (`createGetEntry` fait `console.warn(…); return;`) et le locus `posts.ts:5` — les deux faits qui rendent le garde-fou justifiable et son échec diagnosticable. **Déviations D03 et D04 loggées avant le correctif.**
  - **Fix round 1/5 → tous les constats ADDRESSED**, 0 régression introduite. Re-revue ciblée : `diff` ligne à ligne entre `git show a4eb77d:src/lib/projects.ts` et `src/lib/references.ts` — **seule différence, les 2 lignes de la dernière phrase**, exactement ce qui était demandé.
  - **5 Minor déférés** à la revue finale de branche, enregistrés dans le ledger SDD : libellé de test imprécis (`prompts.test.ts:41`), couverture asymétrique de `skills.test.ts`, 4 fonctions dupliquées entre les deux jumeaux, commentaire au présent sur 2 usages pas encore écrits, et garde-fou CMS↔Zod aveugle aux 2 nouvelles collections jusqu'à T-D1 (dette de fenêtre assignée par le plan).
  - **R1 et R7 restent In progress** : R1 exige « ≥ 2 prompts + ≥ 2 skills réels » (T-A2) et R7 exige des données et un rendu (T-A2, T-C2). **T-A2 est bloquée côté utilisateur** : le 2ᵉ skill réel n'est pas encore désigné.
