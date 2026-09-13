# Plan 7 — Scope Ledger

Last updated: 2026-09-13 (T-A1 Done, revue de tâche passée — T-B1 démarrée)
Last updated by: main (contrôleur SDD)

## Requirements (extracted from spec §3 Success criteria)

| ID | Requirement | Status | Notes |
|---|---|---|---|
| R1 | Les 4 patrons sont dans `@layer components` et redeviennent surchargeables — mesuré **au rendu** : un élément `class="pill bg-nav"` calcule `--color-nav` et non `--color-accentSoft` | Done | **`53441e6`.** Les 4 patrons sont dans un unique `@layer components` (`global.css:133-164`), aucune déclaration modifiée à l'intérieur des blocs (diff = ré-indentation + 2 accolades). Sonde au rendu mesurée **deux fois indépendamment** — par l'implémenteur puis par le relecteur, qui a posé sa propre sonde : `class="pill bg-nav"` calcule `rgb(255,255,255)` en clair et `rgba(255,255,255,0.05)` en sombre, soit `--color-nav` dans les deux thèmes. Le piège que le Plan 6 avait laissé armé est désarmé. |
| R2 | Le changement de cascade ne régresse rien — squelette DOM identique à `milestone-plan-6` **ET** les 3 paires de contraste du Plan 6 restent ≥ 4.5:1 dans les 2 thèmes | Done | **`53441e6` — volet contraste tenu à la lettre, volet squelette tenu SOUS RÉSERVE DE D01.** Contraste : les 6 ratios (3 paires × 2 thèmes) sont ≥ 4.5 — clair 11.79 / 6.33 / 5.62, sombre 12.75 / 7.34 / 8.25 — recalculés indépendamment par le relecteur (5.61 / 8.25 sur la paire composée, écart d'arrondi). Squelette : la comparaison contre `milestone-plan-6` renvoie **4 divergences sur 52 routes**, qui **préexistent au plan** (l'article `draft` `bienvenue-dans-mon-foutoir` est encore construit au tag, 53 fichiers contre 52). Contre-épreuve sur le `dist` pré-édition : **mêmes 4 lignes à l'identique** — la Phase A n'en ajoute aucune. Le relecteur a validé que la contre-épreuve isole bien la responsabilité de la tâche, **et** qu'elle ne comble pas l'écart entre « cette tâche ne casse rien » et « R2 est tenu à la lettre ». Cet écart est **D01**, `pending-user` : il bloque le ship, pas l'exécution. |
| R3 | `/projets` rend les **6** éléments du patron §5.1, dans l'ordre | Pending | Couvert par T-B3. |
| R4 | La ligne de méta annonce le compte **exact** — par comptage du DOM, sans filtre, avec un filtre, avec deux facettes | Pending | Couvert par T-B1 (logique) et T-B3 (mesure). |
| R5 | L'entrée « à la une » est **conditionnelle** : 1 sans filtre, 0 dès qu'une facette est active | Pending | Couvert par T-B1 et T-B3. Règle de dérivation (spec §6.1) : `featured: true` là où le champ existe, à défaut la première entrée de l'ordre canonique. Mesuré au pré-flight : **aucun** article n'a `featured: true` — c'est donc la dérivation qui s'applique sur `/blog`. |
| R6 | L'état vide est contextualisé et réversible — message nommant les facettes actives **ET** bouton ramenant au total | Pending | Couvert par T-B1 et T-B3. |
| R7 | Le dropdown porte une facette secondaire par famille : statut · tri · format · type | Pending | Couvert par T-B3 (statut), T-C1 (tri), T-C2 (format, type). **Limite mesurée au pré-flight :** sur `/skills`, `type` n'a qu'une valeur dans le contenu (`claude-code` sur les 2 skills) — la sélectionner ne change ni l'ordre ni le sous-ensemble. Arbitrage porté au gate de validation du plan. |
| R8 | Chaque entrée des 4 listes porte une vignette — image du contenu sinon visuel **dérivé**, en CSS/SVG, sans fichier image ni champ de schéma | Pending | Couvert par T-B2 (composant + projets), T-C1 (blog), T-C2 (prompts, skills). |
| R9 | Le patron est répliqué **à l'identique** sur les 4 familles | Pending | Couvert par T-C1 et T-C2. |
| R10 | Le modèle de contenu est **inchangé** — `git diff milestone-plan-6 -- src/content.config.ts` vide | Pending | Vérifié en T-B2 et T-B3, re-vérifié en Phase Z. |
| R11 | La logique nouvelle est testée — fonctions pures dans `src/lib/`, couvertes par vitest ; les 12 suites existantes restent vertes | Pending | Couvert par T-B1 (`src/lib/listPattern.ts` + sa suite, la 13ᵉ). |
| R12 | 375 px et deux thèmes sur les 4 listes, sans contrôle inatteignable | Pending | Couvert par T-D1. |

## Status legend
- **Done** — verified, criteria passed (link to commit SHA)
- **In progress** — actively being worked
- **Pending** — not yet started
- **Deferred** — moved to a later plan (must have an approved deviation)
- **Cut** — removed from scope (must have an approved deviation)

## Task index → requirement(s) covered

| Task | Phase | Covers | Status |
|---|---|---|---|
| A1 | A | R1, R2 — les 4 patrons entrent dans `@layer components` | Done (`53441e6`) — voir D01 |
| B1 | B | R4, R5, R6, R7, R11 — `src/lib/listPattern.ts` : toute la logique du patron, pure et testée | In progress |
| B2 | B | R8, R10 — `Thumbnail.astro` : vignette dérivée, sans fichier ni champ | Pending |
| B3 | B | R3, R4, R5, R6, R7, R10 — `/projets` rend les 6 éléments + le script de glue unique | Pending |
| C1 | C | R9, R7 (tri), R8 — `/blog` | Pending |
| C2 | C | R9, R8 — `/prompts` et `/skills` | Pending |
| D1 | D | R12 (+ V2, V6) — 4 listes × 2 thèmes × 375/768/1180 px | Pending |
| Z1 | Z | Audit `/anti-drift-planning:verify 7` (couverture R1–R12 + V1–V8) | Pending |

## Critères du contrat visuel (V1–V8, §10) — rattachement

La méthodologie §4.2 les rend applicables en Phase Z de chaque plan de la vague 2. Les rattacher ici
évite qu'ils surgissent en Phase Z.

| V | Critère | Tâche | Statut |
|---|---|---|---|
| V1 | Les 23 tokens dans les 2 thèmes | — | Acquis au Plan 6 (`6af9329`) ; aucune tâche de P7 ne touche `@theme`. Re-vérifié en Z1. |
| V2 | Aucun saut de niveau de surface | D1 | Pending — **c'est le plan qui donne enfin du travail à V2** (spec §6.4) : la vignette consomme `rail`, jusqu'ici peint par rien. Audit **en sombre** uniquement. |
| V3 | Grammaire des accents respectée en sombre | D1 | Pending — les contrôles nouveaux (pilules, dropdowns, bouton de reset) ne doivent pas mélanger vert et bleu. |
| V4 | Thème clair sans bleu | — | Acquis au Plan 6. Contrainte globale n°8 du plan d'impl. |
| V5 | Mono réservé à la donnée machine | B3, C1, C2 | Pending — la **ligne de méta** est de la donnée (compteur, mono) ; le **message d'état vide** est de la prose (jamais mono). Contrainte globale n°7. |
| V6 | Rayons ∈ {9, 10, 14, 20, 999}px | D1 | Pending — gate repo-wide en T-D1/Step 4. |
| V7 | Space Grotesk et Inter retirés | — | Acquis au Plan 6 (`30c9ed0`). |
| V8 | Contrastes AA | A1 | **Done (`53441e6`).** 6 ratios sur 6 ≥ 4.5, mesurés deux fois indépendamment. La formule du plan ignorait l'alpha et garantissait 1.0 sur `accent`/`accentSoft` : corrigée (P-06), la mesure passe par un compositing sur le fond opaque réel. |

## Décisions d'implémentation tranchées par le plan (spec muette — ratification au gate)

Reprises du plan d'impl §« Décisions d'implémentation », où chacune porte son argument complet.
Elles ne sont **pas** des déviations : la spec est muette sur chacune. Elles sont soumises au gate de
validation du plan d'impl, avant T-A1.

| # | Décision |
|---|---|
| I1 | Facette primaire (pilules) : `stack` (projets) · `category` (blog) · `tool` (prompts) · `tag` (skills). R7 ne nomme que le dropdown. |
| I2 | Les facettes surnuméraires (`tag` sur blog et prompts) sont **conservées** en dropdown secondaire — les retirer serait une réduction de fonctionnalité livrée. Sur `/blog`, `tag` passe donc de pilules à dropdown. |
| I3 | L'entrée à la une est rendue **deux fois** (bloc « à la une » + grille) et le script n'en montre jamais qu'une — sans quoi filtrer sur sa catégorie l'exclurait du résultat. |
| I4 | **Un seul** script de glue, `src/scripts/list-pattern.ts`, remplace `facet-filters.ts` et `project-filters.ts`. Deux scripts = deux comportements qui divergent. |
| I5 | `src/lib/projectFilters.ts` n'est **pas** supprimé : il gagne `projectFacets()` et garde `matchesFilters` + sa suite, que R11 exige de laisser verte. |
| I6 | Visuel dérivé : bloc `rail`, rayon 10px, trame `hatch` en CSS, monogramme de 2 lettres en mono. Consomme deux tokens que le contrat §6.4 dit n'être peints par rien. |

## Décisions de l'utilisateur au gate de validation du plan (2026-09-13)

Trois questions posées avant T-A1, trois options retenues **verbatim**. Elles ratifient le plan
d'impl et ferment les décisions I1–I6 ci-dessus.

| # | Question | Décision retenue |
|---|---|---|
| G-01 | Valider le plan d'impl, y compris I1–I6 — dont le passage des tags de `/blog` des pilules au dropdown secondaire ? | « **Valider le plan tel quel** ». Les 6 décisions sont ratifiées. Raison portée à l'appui : R3 dit « **une** barre de pilules » ; deux lignes de pilules sur `/blog` et une seule ailleurs feraient diverger cette liste des trois autres, ce que R9 interdit. |
| G-02 | Comment tenir R7 sur `/skills`, dont le `type` n'a qu'une valeur dans le contenu ? | « **Mesurer sur tag, rapporter type tel quel** ». Le dropdown `type` est livré et fonctionnel ; la preuve que le filtrage change le sous-ensemble est faite sur `tag` (`anti-drift` → 1/2). Le comportement de `type` est rapporté honnêtement en Phase Z : **conforme, mais non discriminant faute de contenu varié**. Le contenu n'est pas modifié, aucune déviation n'est ouverte. |
| G-03 | Quelle forme pour le visuel dérivé, les projets/prompts/skills n'ayant aucune image ? | « **Monogramme + trame hachurée** » — bloc en `rail`, trame diagonale en `hatch`, 2 premières lettres de la catégorie/type en mono. C'est la décision I6, confirmée. |

## Défauts de plan corrigés (texte faux sur la réalité — pas des déviations)

| # | Constat | Correction |
|---|---|---|
| P-01 | La spec P7 §6.1 demande de corriger le §8.2 du contrat visuel (« 3 articles sur 6 ont un `cover` ») en Phase A. **Cette correction est déjà appliquée** : le §8.2 porte déjà « Chiffre périmé […] 5 des 5 articles publiés ». | Aucune action produit. Consigné ici au pré-flight ; rien de ce qui ship ne change. |
| P-02 | La section « File Structure » du plan d'impl liste `src/scripts/facet-filters.ts` comme supprimé, mais **aucune tâche ne le supprimait**. Pire : le supprimer en T-B3 aurait cassé le build de `/blog`, `/prompts` et `/skills`, qui l'importent encore à ce stade. | Suppression placée en **T-C2/Step 4**, après la dernière page qui l'importe. `src/lib/facetFilters.ts` reste — c'est le prédicat, et sa suite est l'une des 12 que R11 protège. |
| P-03 | T-A1/Step 4 prescrivait `git stash` + `git checkout milestone-plan-6 -- .` sur le working tree de la branche pour produire le squelette DOM de référence : **destructif**, et un `stash pop` qui échoue laisse la branche dans un état mixte. | Remplacé par un **worktree temporaire** (`git worktree add /tmp/p7-m6 milestone-plan-6`), `node_modules` symlinké, retiré en fin d'étape. Le working tree de la branche n'est jamais touché. |
| P-04 | T-B3 rendait **toutes** les cartes `featured` dans le bloc « à la une », en comptant sur le script pour n'en laisser qu'une. Sans JavaScript, `/projets` aurait donc affiché **2 entrées à la une** et chaque projet **deux fois** — en contradiction avec R5 (« exactement 1 ») et avec la contrainte n°5 du plan (enhancement progressif). | La règle de dérivation est extraite en `pickFeaturedEntry()`, exportée de `listPattern.ts`, **testée**, et appelée **des deux côtés** : par `computeListState` côté client, et par le frontmatter des 4 pages côté serveur. Le bloc « à la une » ne rend qu'**une** carte ; son double dans la grille est rendu `hidden` **par le serveur**. Sans JS : 1 à la une + N-1 en grille = chaque entrée exactement une fois. |
| P-05 | Un commentaire du test de tri de T-B1 annonçait « une facette active » sur une sélection `{ stack: ALL, status: ALL }` — qui n'en a aucune. | Commentaire réécrit pour dire ce que le test vérifie réellement. |
| P-06 | T-A1/Step 5 fournissait une formule de contraste qui **ignore l'alpha** (`slice(0,3)`). Or `accentSoft` est semi-transparent et partage son triplet RVB avec `accent` : appliquée à la lettre, la formule renvoie **1.0** pour cette paire, jamais ≥ 4.5. Relevé par l'implémenteur de T-A1, qui a dû compositer pour mesurer. | Formule remplacée dans le plan par une version avec **compositing alpha** (`over(fg, bg)`), et consigne ajoutée : remonter le DOM jusqu'au premier ancêtre à fond opaque plutôt que de le supposer. |
| P-07 | T-A1/Step 1 parlait des « **14** routes de `milestone-plan-6` ». Mesuré : `milestone-plan-6` construit **53** fichiers HTML et la branche courante **52**. | Chiffres corrigés, et la raison de l'écart (l'article `draft` encore construit au tag) documentée à l'endroit où elle compte, le Step 4. |

## État du contenu mesuré au pré-flight (2026-09-13)

Chiffres sur lesquels les critères se mesureront — les relever ici évite de les redécouvrir en
cours d'exécution, et rend un écart futur visible.

| Collection | Publiées | `featured: true` | `cover` | Facettes |
|---|---|---|---|---|
| `blog` | **5** (1 draft) | **0** | 5/5 | `category` (2 valeurs utilisées), `tag` |
| `projects` | 2 | 1 (`site-bencat`) | **0/2** | `status` (2 utilisées), `stack` (8) |
| `prompts` | 3 | *champ absent* | *champ absent* | `format` (2), `tool` (2), `tag` (4) |
| `skills` | 2 | *champ absent* | *champ absent* | `type` (**1 seule valeur**), `tag` (4) |
