# Site perso benCat — Plan 6 — Socle du design system v2 · Design

**Date:** 2026-09-12
**Author:** Benoît Catillon (bendevcat)
**Predecessor:** Plan 5 (`v1.0.0` / `milestone-plan-5`)
**Target:** `v1.1.0` + `milestone-plan-6`
**Methodology:** `docs/anti-drift/specs/2026-07-19-methodology.md` (§4bis — vague 2)
**Design de référence:** `docs/anti-drift/specs/2026-09-12-refonte-visuelle-design.md`

---

## 1. Goal (incl. user story)

À la fin de ce plan, **sans aide** :

1. Le visiteur ouvre n'importe quelle page du site : elle est rendue avec la **nouvelle palette**
   (23 tokens) et la **nouvelle typographie** — plus aucune trace de Space Grotesk ni d'Inter.
2. Il voit le **nouveau header** : logo en pilule avec son glyphe, navigation en pilules à icônes
   avec l'item actif mis en valeur, et barre d'actions ronde (recherche, GitHub, bascule de thème).
3. Il bascule clair ↔ sombre : les **deux thèmes sont complets et cohérents**, chacun avec sa
   grammaire propre (bleu de méta en sombre, gris neutres en clair).
4. Il lit un article : le corps `.prose` est accordé aux nouveaux tokens — titres, liens, code
   inline, blocs de code, citations, tableaux.
5. Il navigue en 375 px : rien ne déborde horizontalement, le header reste utilisable.

**Aucune page ne change de structure.** Le header est la seule exception, et elle est explicite :
c'est un composant partagé, il porte le nouveau design dès ce plan. Les structures de page
(accueil, listes, fiches) restent celles de la v1 et sont reprises en P7, puis en P8.

## 2. Pain themes addressed

1. **Fuite du design system** — implémenter une structure de page avant que les tokens existent
   produit des valeurs codées en dur, qu'il faut ensuite déterrer une par une. P6 ferme cette porte
   avant que P7 l'ouvre.
2. **Diagnostic d'une régression** — changer la peau et la structure dans la même passe rend toute
   régression ambiguë. En séparant, chaque défaut de P7 et P8 n'a qu'une origine possible.
3. **Thème clair de seconde zone** — la v1 a un thème clair dérivé. Le prototype en fait un thème à
   part entière avec sa propre grammaire ; ce plan l'établit une fois pour toutes.

## 3. Success criteria

| ID | Criterion | Measure (binary) |
|---|---|---|
| R1 | Les 23 tokens existent dans les deux thèmes | `global.css` définit les 23 noms de `§2` de la spec de design sous `@theme` **ET** les 23 sous `:root[data-theme="dark"]`, aux valeurs exactes du tableau |
| R2 | Nebula Sans (ou sa substitution actée) est servie | Le texte courant de `/` est rendu dans la police retenue **ET** la décision `§8.1` est tranchée et consignée dans la spec de design |
| R3 | Space Grotesk et Inter sont retirés | `grep -ri "space-grotesk\|inter" src/ package.json` ne renvoie **aucune** occurrence **ET** `npm run build` passe |
| R4 | Les 4 classes de patrons existent | `global.css` définit `.card`, `.card-inner`, `.panel`, `.pill` **ET** aucune ne contient `display`, `gap`, `grid` ou `flex` |
| R5 | Header : logo en pilule | Le logo `bencat_` est rendu dans une pilule à bordure avec son glyphe à 3 barres, et mène à `/` |
| R6 | Header : nav en pilules à icônes | Les 5 items portent chacun leur icône **ET** l'item correspondant à la route courante est visuellement distinct (fond + graisse), y compris sur une route fille (`/blog/<slug>` met « Blog » en actif) |
| R7 | Header : barre d'actions ronde | Trois boutons ronds — recherche, GitHub, thème — dans un conteneur en pilule ; la recherche ouvre le `SearchDialog` existant, le thème bascule |
| R8 | Thème clair complet et sans bleu | Basculer en clair applique les 23 valeurs claires **ET** `grep` ne trouve aucun `#7DD3FC` (ni `rgba(125,211,252` ) appliqué sous `[data-theme="light"]` |
| R9 | `.prose` accordé | Un article rend titres, liens, code inline, blocs, citations, listes et tableaux avec les nouveaux tokens, dans les **deux** thèmes, sans débordement horizontal |
| R10 | Aucune page n'a changé de structure | Comparer chaque route au rendu v1.0.0 : mêmes blocs, dans le même ordre, aux mêmes emplacements. Seule la peau diffère. **Header exclu de cette comparaison.** |
| R11 | 375 px sans débordement | Sur les 10 routes, `document.documentElement.scrollWidth <= innerWidth` à 375 px |
| R12 | Contrastes AA | `body` sur `bg`, `muted` sur `surface`, `accent` sur `accentSoft` ≥ 4.5:1 dans les deux thèmes |

## 4. Work breakdown (phases & tasks)

4 phases. Le détail des tâches est écrit à l'ouverture de la session d'exécution, depuis cette spec
et l'état réel du repo.

### Phase A — Tokens & typographie
Trancher `§8.1` (Nebula Sans). Réécrire le `@theme` et le bloc `[data-theme="dark"]` de
`src/styles/global.css` aux 23 tokens. Installer/retirer les dépendances de polices.
→ R1, R2, R3, R8, R12.

### Phase B — Patrons de composants
Ajouter `.card`, `.card-inner`, `.panel`, `.pill` dans `global.css`. Accorder `.prose`.
→ R4, R9.

### Phase C — Header
Reconstruire `src/components/Header.astro` : logo en pilule, nav en pilules à icônes avec état
actif dérivé de `Astro.url.pathname`, barre d'actions ronde intégrant `ThemeToggle` et le
déclencheur de `SearchDialog`. Responsive 375 px.
→ R5, R6, R7, R11.

### Phase D — Passe de non-régression visuelle
Parcourir les 10 routes dans les deux thèmes et sur 375/768/1180. Corriger les composants existants
(`ArticleCard`, `ProjectCard`, `PromptCard`, `SkillCard`, `AiBanner`, `TableOfContents`,
`SearchDialog`) pour qu'ils consomment les nouveaux tokens **sans changer de structure**.
→ R10, R11, R12.

### Phase Z — Verification
- **T** `/anti-drift-planning:verify 6` — audit canonique. Non contournable. Seul chemin vers ship +
  tag `milestone-plan-6` = `v1.1.0`.

## 5. Out of scope (reporté aux plans 7 et 8)

- **Toute restructuration de page** — accueil, listes, fiches gardent leur structure v1. → P7, puis P8.
- **Les écarts fonctionnels E3 à E9** de la spec de design §6 — « à la une », panneaux de section,
  tri, filtres, onglets, arbre de fichiers, variables de prompt. → P7. **E10 et E11** (tons de tags,
  bloc identité de `/a-propos`) → P8.
- **Vignettes d'articles** (`§8.2`) — travail de contenu, tranché à l'ouverture de P7.
- **Tons de tags** (`§8.3`) — les 5 teintes sont dans le contrat visuel mais ne sont consommées
  qu'en P8 avec `/tags`.
- **Domaine custom** — différé depuis le Plan 1, orthogonal à cette vague.

## 6. Out-of-band considerations

### 6.1 Le blocage Nebula Sans
R2 dépend d'une décision de licence (`§8.1` de la spec de design) qui n'est pas technique. Elle doit
être tranchée **avant la première tâche de la Phase A** : elle conditionne la valeur de
`--font-sans`, donc tout le reste. Si elle ne peut pas l'être, la substitution est choisie et
consignée — elle ne reste pas en suspens.

### 6.2 Bascule de thème inchangée
Le script inline de `BaseLayout.astro` (lecture `localStorage` + `matchMedia` avant peinture) est
correct et anti-FOUC. Il n'est **pas** réécrit : seules les valeurs qu'il révèle changent.

### 6.3 Le prototype n'est pas du code source
L'artboard est du JS de maquette avec styles en ligne et données fictives. Rien n'en est copié :
c'est une **référence visuelle**, pas une base de code. Ses `POSTS`/`PROJECTS`/`PROMPTS`/`SKILLS` en
dur sont des fixtures.

### 6.4 Ordre de la passe D
La Phase D vient après C pour une raison : le header change les gabarits de largeur et de rythme
vertical de toutes les pages. Corriger les cartes avant lui obligerait à repasser dessus.

## 7. Test strategy per phase

| Phase | Test approach |
|---|---|
| A | `npm run build` vert ; `grep` pour R3 et R8 ; calcul de contraste sur les 3 paires de R12 |
| B | Rendu d'un article dans les 2 thèmes ; inspection des 4 classes pour R4 |
| C | Parcours des 10 routes : l'item de nav actif correspond, sur route mère **et** fille ; 375 px |
| D | Diff visuel route par route contre `v1.0.0` ; `scrollWidth` à 375 px |
| Z | `/anti-drift-planning:verify 6` + parcours humain |

**Pas de nouveau test unitaire dans ce plan** : il n'introduit aucune logique. Les 12 suites vitest
existantes (118 tests) doivent rester vertes — c'est le filet de non-régression de R10.

## 8. Plan self-review

1. **Spec coverage** — R1–R3, R8, R12 → Phase A ; R4, R9 → B ; R5–R7, R11 → C ; R10–R12 → D. Aucun
   R orphelin.
2. **Internal consistency** — les noms de tokens, les 4 classes et les 5 rayons viennent tous du
   même tableau de la spec de design ; aucune valeur n'est redite ici, seulement référencée.
3. **Scope check** — un plan, 4 phases, aucune logique nouvelle. Tient en une session.
4. **Ambiguity check** — R10 est le seul critère potentiellement interprétable ; il est borné par
   « header exclu » et par la comparaison à un tag précis (`v1.0.0`).

---

**Branch:** `plan-6-socle-design-system`, off the ref that carries this spec.
**Ledger:** `docs/anti-drift/handoffs/plan-6-ledger.md`
**Deviations:** `docs/anti-drift/handoffs/plan-6-deviations.md`
