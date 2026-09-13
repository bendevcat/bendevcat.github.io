# Site perso benCat — Plan 7 — Le patron « liste filtrable » · Design

**Date:** 2026-09-13
**Author:** Benoît Catillon (bendevcat)
**Predecessor:** Plan 6 (`v1.1.0` / `milestone-plan-6`)
**Target:** `v1.2.0` + `milestone-plan-7`
**Methodology:** `docs/anti-drift/specs/2026-07-19-methodology.md` (§4.2 — vague 2)
**Design de référence:** `docs/anti-drift/specs/2026-09-12-refonte-visuelle-design.md` (§5.1 fait foi ici)

> **Pourquoi ce plan ne s'appelle pas `structures-v2`.** La vague 2 a été redécoupée le 2026-09-13,
> avant toute exécution : P7 ne porte plus que le patron « liste filtrable », P8 prend le patron
> « détail à onglets », P9 prend l'accueil et la finition. `structures-v2` aurait décrit les trois
> indifféremment. Décision de l'utilisateur au gate d'écriture de cette spec.

---

## 1. Goal (incl. user story)

À la fin de ce plan, **sans aide** :

1. Le visiteur ouvre `/projets` : il voit une **ligne de pilules de filtre**, un **dropdown** de
   facette secondaire, une **ligne de méta** qui annonce le compte exact, une **entrée « à la une »**,
   une **grille** des entrées restantes, et chaque entrée porte une **vignette**.
2. Il clique une pilule de filtre : la ligne de méta se met à jour, l'entrée « à la une »
   **disparaît**, et seules les entrées correspondantes restent.
3. Il combine deux facettes jusqu'à ne rien avoir : un **état vide** lui dit ce qu'il cherchait et
   lui offre un bouton qui **remet la liste complète**.
4. Il refait exactement le même parcours sur `/blog`, `/prompts` et `/skills` : **les quatre listes
   se comportent à l'identique**, seules les facettes changent de nom.
5. Il navigue en 375 px et en thème clair comme sombre : rien ne déborde, rien ne disparaît.

**Aucune autre surface ne change dans ce plan.** Les fiches de détail gardent leur structure v1
(→ P8), l'accueil garde la sienne (→ P9).

## 2. Pain themes addressed

1. **Quatre listes qui divergent.** Résoudre le patron quatre fois en parallèle produit quatre
   comportements légèrement différents, et la différence ne se voit qu'à l'usage. Le contrat §7
   impose de le résoudre **une fois sur `/projets`** puis de le répliquer.
2. **Le piège de cascade laissé armé par P6.** Les quatre classes de patrons sont hors layer CSS et
   battent tout utilitaire **en silence**. P6 a contourné faute de pouvoir ajouter une tâche à son
   plan ; P7 construit massivement avec ces patrons et doit désarmer le piège avant, pas après.
3. **Des tokens jamais éprouvés.** Dix des 23 tokens ne peignent rien sur le site livré, et
   `.card-inner` comme `.panel` ne sont portés par aucun élément. Le critère V2 du contrat passe
   donc aujourd'hui sur un jeu de test presque vide. Ce plan lui donne de quoi échouer.

## 3. Success criteria

| ID | Criterion | Measure (binary) |
|---|---|---|
| R1 | Les 4 patrons sont dans `@layer components` et redeviennent surchargeables | `global.css` définit `.card`, `.card-inner`, `.panel`, `.pill` **à l'intérieur** d'un bloc `@layer components` **ET**, mesuré **au rendu**, un élément `class="pill bg-nav"` calcule `--color-nav` et non `--color-accentSoft` |
| R2 | Le changement de cascade ne régresse rien | Les pages générées sont **identiques en squelette DOM** à `milestone-plan-6` (mêmes balises, même ordre, attributs retirés) **ET** les 3 paires de contraste de R12 du Plan 6 restent ≥ 4.5:1 dans les 2 thèmes |
| R3 | `/projets` rend les **6** éléments du patron §5.1 | Dans cet ordre : barre de pilules de filtre · dropdown de facette secondaire · ligne de méta · entrée « à la une » · grille des entrées restantes · conteneur d'état vide |
| R4 | La ligne de méta annonce le compte **exact** | Le nombre affiché égale le nombre de cartes réellement visibles, vérifié **par comptage du DOM** — sans filtre, avec un filtre, et avec deux facettes combinées |
| R5 | L'entrée « à la une » est **conditionnelle** | Aucun filtre actif → **exactement 1** entrée à la une ; **dès qu'une** facette est active → **0** |
| R6 | L'état vide est contextualisé et réversible | Une combinaison sans résultat affiche un message **nommant les facettes actives** **ET** un bouton qui, cliqué, ramène le compte au total de la collection |
| R7 | Le dropdown porte une facette secondaire par famille | `/projets` → statut · `/blog` → tri (récent, ancien, court, long) · `/prompts` → format · `/skills` → type. Chaque valeur sélectionnée change l'ordre ou le sous-ensemble, vérifié par comptage ou par lecture du 1ᵉʳ titre |
| R8 | Chaque entrée des 4 listes porte une vignette | Toute carte rend une vignette : l'image du contenu quand elle existe, sinon un visuel **dérivé** de la catégorie ou du type — généré en CSS/SVG, **sans fichier image et sans champ de schéma** |
| R9 | Le patron est répliqué **à l'identique** sur les 4 familles | `/blog`, `/prompts` et `/skills` rendent les **mêmes 6 éléments dans le même ordre** que `/projets`, et R4, R5, R6, R7 s'y vérifient un par un |
| R10 | Le modèle de contenu est **inchangé** | `git diff milestone-plan-6 -- src/content.config.ts` est **vide** |
| R11 | La logique nouvelle est testée | Tri, comptage, sélection de l'entrée à la une et calcul de l'état vide sont des **fonctions pures** dans `src/lib/`, couvertes par vitest. Les 12 suites existantes restent vertes |
| R12 | 375 px et deux thèmes | Sur les 4 listes, `document.documentElement.scrollWidth <= innerWidth` à 375 px, dans les deux thèmes, sans qu'aucun contrôle ne devienne inatteignable |

## 4. Work breakdown (phases & tasks)

Le détail des tâches est écrit à l'ouverture de la session d'exécution, depuis cette spec et l'état
réel du repo. Quatre phases.

### Phase A — Désarmer le piège de cascade
Envelopper les 4 patrons dans `@layer components`, puis prouver au rendu qu'un utilitaire les
surcharge de nouveau et que rien n'a bougé ailleurs. → R1, R2.

### Phase B — Résoudre le patron **une fois**, sur `/projets`
Les 6 éléments du §5.1, la logique en fonctions pures testées, la vignette dérivée. → R3–R8, R10, R11.

### Phase C — Répliquer sur blog, prompts, skills
Même patron, facettes renommées. Ne pas réinventer : si la réplication demande de modifier le moteur
écrit en B, c'est que B n'était pas assez général — le corriger en B, pas le contourner en C. → R9.

### Phase D — Passe 375 px et deux thèmes
→ R12, plus les critères V2 et V6 du contrat sur les structures nouvelles.

### Phase Z — Verification
- **T** `/anti-drift-planning:verify 7` — audit canonique. Non contournable. Seul chemin vers ship +
  tag `milestone-plan-7` = `v1.2.0`.

## 5. Out of scope (reporté à P8 et P9)

- **Le patron « détail à onglets »** (§5.2) et les écarts **E7, E8, E9** — onglets de fiche projet,
  variables interactives de prompt, arbre de fichiers de skill. → **P8**.
- **L'accueil** et l'écart **E3** — carte « à la une », liste compacte, panneaux de section, bandeau
  de transparence IA. → **P9**.
- **Les écarts E10 et E11** (tons de tags de `/tags`, bloc identité de `/a-propos`) → **P9**.
- **`/transparence-ia`, `/tags`, `/404` et l'écran de recherche** → **P9**.
- **Toute modification du modèle de contenu** — c'est R10, et c'est un non-goal du contrat §9.
- **Domaine custom** — différé depuis le Plan 1, orthogonal à cette vague.

## 6. Out-of-band considerations

### 6.1 Deux champs manquent à prompts et skills — et on ne les ajoute pas
`cover` et `featured` existent sur `blog` et `projects` ; ils n'existent **ni** sur `prompts` **ni**
sur `skills`. Les deux écarts qui en dépendent sont donc résolus **par dérivation**, pas par un
changement de schéma que le contrat §9 interdit :

- **Vignette** (R8) — image du contenu si elle existe, sinon visuel dérivé de la catégorie/type.
  Décision prise au gate d'écriture de cette spec, sur mesure : blog **5/5** pourvus, projets **0/2**,
  prompts et skills **sans champ**.
- **Entrée « à la une »** (R5) — `featured: true` là où le champ existe ; **à défaut, la première
  entrée de l'ordre canonique de la collection**. Même principe, même raison. La règle exacte est à
  confirmer au pré-flight de P7, mais elle ne peut pas passer par le schéma.

> **Le §8.2 du contrat est périmé** : il dit « 3 articles sur 6 ont un `cover` ». Mesuré le
> 2026-09-13 : **5 sur 5** des articles publiés en ont un. Le corriger fait partie de la Phase A.

### 6.2 Le moteur de filtrage existe déjà — il est étendu, pas réécrit
`src/lib/facetFilters.ts`, `src/lib/projectFilters.ts` et leurs trois scripts (`facet-filters.ts`,
`project-filters.ts`, `blog-filters.ts`) sont livrés, testés et vérifiés aux Plans 3, 4 et 5.
`/projets` porte déjà des filtres tech + statut et un état vide. Ce plan **ajoute** le dropdown, la
ligne de méta, l'entrée à la une et la vignette ; il ne repart pas de zéro. Réécrire un moteur testé
serait une déviation.

### 6.3 Enhancement progressif, comme aux plans précédents
Les barres de filtres sont rendues `hidden` par le serveur et révélées par le script : sans JS,
aucun contrôle mort n'est affiché. C'est le comportement établi au Plan 3 et repris au Plan 4 ; le
dropdown et le bouton de réinitialisation le suivent.

### 6.4 Ce plan donne enfin du travail à V2
Dix tokens sur 23 ne peignent rien aujourd'hui, et `.card-inner` comme `.panel` ne sont portés par
aucun élément. La vignette consomme `rail`, le survol de carte consomme `cardHover`, les séparateurs
internes consomment `line2`. La hiérarchie des surfaces devient donc réellement testable — **et
l'audit V2 se fait en thème sombre**, seul thème où un saut de niveau est visible (`card` et
`surface` valent tous deux `#FFFFFF` en clair).

### 6.5 Piège de mesure hérité du Plan 6
Ne jamais mesurer un thème juste après avoir basculé `document.documentElement.dataset.theme` :
`transition-colors` est encore en cours et la mesure rend les valeurs du thème **précédent**. Poser
`localStorage.theme` puis **recharger**.

## 7. Test strategy per phase

| Phase | Test approach |
|---|---|
| A | Sonde au rendu (`class="pill bg-nav"`) ; diff de squelette DOM contre `milestone-plan-6` ; recalcul des 3 paires de contraste |
| B | Vitest sur les fonctions pures (tri, comptage, à-la-une, état vide) ; comptage du DOM au rendu pour R4, R5, R6, R7 |
| C | Les mêmes mesures que B, rejouées sur les 3 autres familles |
| D | `scrollWidth` sur 375 px × 2 thèmes × 4 listes ; audit V2 **en sombre** ; gate V6 repo-wide |
| Z | `/anti-drift-planning:verify 7` + parcours humain |

**Leçon du Plan 6, appliquée ici :** sur une vague visuelle, cinq défauts sur cinq n'ont été
attrapés que par une **mesure au rendu** — aucun n'aurait fait échouer un test ni sauté aux yeux
dans un diff. Les critères ci-dessus sont écrits pour être mesurés dans la page, pas relus.

## 8. Plan self-review

1. **Spec coverage** — R1, R2 → Phase A ; R3–R8, R10, R11 → B ; R9 → C ; R12 → D. Aucun R orphelin.
2. **Internal consistency** — les 6 éléments du patron sont nommés une seule fois (R3) et référencés
   ensuite ; les noms de facettes ne sont donnés qu'en R7 ; aucune valeur du contrat n'est redite.
3. **Scope check** — un patron, résolu une fois puis répliqué trois fois. Le redécoupage du
   2026-09-13 a précisément retiré de ce plan les deux tiers qui le rendaient insoutenable.
4. **Ambiguity check** — R8 et R5 sont les deux seuls critères qui dépendaient d'un champ absent ;
   §6.1 les borne par une règle de dérivation explicite. R9 est borné par « mêmes éléments, même
   ordre », pas par « même apparence ».

---

**Branch:** `plan-7-listes-filtrables`, off the ref that carries this spec.
**Ledger:** `docs/anti-drift/handoffs/plan-7-ledger.md`
**Deviations:** `docs/anti-drift/handoffs/plan-7-deviations.md`
