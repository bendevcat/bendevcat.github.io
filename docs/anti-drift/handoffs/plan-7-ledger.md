# Plan 7 — Scope Ledger

Last updated: 2026-09-13 (T-B2 Done après 1 ronde de correction — T-B3 démarrée)
Last updated by: main (contrôleur SDD)

## Requirements (extracted from spec §3 Success criteria)

| ID | Requirement | Status | Notes |
|---|---|---|---|
| R1 | Les 4 patrons sont dans `@layer components` et redeviennent surchargeables — mesuré **au rendu** : un élément `class="pill bg-nav"` calcule `--color-nav` et non `--color-accentSoft` | Done | **`53441e6`.** Les 4 patrons sont dans un unique `@layer components` (`global.css:133-164`), aucune déclaration modifiée à l'intérieur des blocs (diff = ré-indentation + 2 accolades). Sonde au rendu mesurée **deux fois indépendamment** — par l'implémenteur puis par le relecteur, qui a posé sa propre sonde : `class="pill bg-nav"` calcule `rgb(255,255,255)` en clair et `rgba(255,255,255,0.05)` en sombre, soit `--color-nav` dans les deux thèmes. Le piège que le Plan 6 avait laissé armé est désarmé. |
| R2 | Le changement de cascade ne régresse rien — squelette DOM identique à `milestone-plan-6` **ET** les 3 paires de contraste du Plan 6 restent ≥ 4.5:1 dans les 2 thèmes | Done | **`53441e6` — volet contraste tenu à la lettre, volet squelette tenu SOUS RÉSERVE DE D01.** Contraste : les 6 ratios (3 paires × 2 thèmes) sont ≥ 4.5 — clair 11.79 / 6.33 / 5.62, sombre 12.75 / 7.34 / 8.25 — recalculés indépendamment par le relecteur (5.61 / 8.25 sur la paire composée, écart d'arrondi). Squelette : la comparaison contre `milestone-plan-6` renvoie **4 divergences sur 52 routes**, qui **préexistent au plan** (l'article `draft` `bienvenue-dans-mon-foutoir` est encore construit au tag, 53 fichiers contre 52). Contre-épreuve sur le `dist` pré-édition : **mêmes 4 lignes à l'identique** — la Phase A n'en ajoute aucune. Le relecteur a validé que la contre-épreuve isole bien la responsabilité de la tâche, **et** qu'elle ne comble pas l'écart entre « cette tâche ne casse rien » et « R2 est tenu à la lettre ». Cet écart est **D01**, `pending-user` : il bloque le ship, pas l'exécution. |
| R3 | `/projets` rend les **6** éléments du patron §5.1, dans l'ordre | Pending | Couvert par T-B3. |
| R4 | La ligne de méta annonce le compte **exact** — par comptage du DOM, sans filtre, avec un filtre, avec deux facettes | In progress | Logique **`e0348e7`** : `count = visibleIds.length + (featured ? 1 : 0)` — l'entrée à la une est comptée. Les 3 cas (sans filtre, une facette, deux facettes) recalculés à la main en revue. **Mesure au rendu (comptage du DOM) encore à faire en T-B3.** |
| R5 | L'entrée « à la une » est **conditionnelle** : 1 sans filtre, 0 dès qu'une facette est active | In progress | Logique **`e0348e7`** : l'entrée à la une n'existe que si `!isAnyFacetActive`, dérivée par `pickFeaturedEntry` (`featured: true`, à défaut la première de l'ordre canonique). **Mesure au rendu encore à faire en T-B3.** Mesuré au pré-flight : aucun article n'a `featured: true` — c'est donc la dérivation qui s'applique sur `/blog`. |
| R6 | L'état vide est contextualisé et réversible — message nommant les facettes actives **ET** bouton ramenant au total | In progress | Logique **`e0348e7`** : message `Aucun <nom> pour <facettes jointes par « et »>.`, recalculé caractère par caractère en revue ; redevient `null` dès qu'un résultat existe. **Mesure au rendu du bouton de réinitialisation encore à faire en T-B3.** |
| R7 | Le dropdown porte une facette secondaire par famille : statut · tri · format · type | In progress | Couvert par T-B3 (statut), T-C1 (tri), T-C2 (format, type). **Limite mesurée au pré-flight :** sur `/skills`, `type` n'a qu'une valeur dans le contenu (`claude-code` sur les 2 skills) — la sélectionner ne change ni l'ordre ni le sous-ensemble. Arbitrage porté au gate de validation du plan. |
| R8 | Chaque entrée des 4 listes porte une vignette — image du contenu sinon visuel **dérivé**, en CSS/SVG, sans fichier image ni champ de schéma | In progress | **Composant livré : `6479e94`, corrigé en `35164e8`.** `src/components/Thumbnail.astro` — image du contenu quand elle existe, sinon bloc `bg-rail` au rayon 10 px, trame `hatch` en CSS et monogramme de 2 lettres en mono (forme choisie par l\'utilisateur au gate, G-03). **Zéro fichier image, zéro champ de schéma** : les deux guards (`git status --porcelain src/content/` et `git diff --stat milestone-plan-6 -- src/content.config.ts`) sont vides, vérifiés par l\'implémenteur **puis indépendamment par le relecteur**. Câblé sur `ProjectCard` ; les 3 autres cartes suivent en T-C1 et T-C2. Mesuré au rendu : les 2 projets, qui n\'ont aucun `cover`, affichent bien le visuel dérivé — `AC` et `WI`. |
| R9 | Le patron est répliqué **à l'identique** sur les 4 familles | Pending | Couvert par T-C1 et T-C2. |
| R10 | Le modèle de contenu est **inchangé** — `git diff milestone-plan-6 -- src/content.config.ts` vide | Pending | Vérifié en T-B2 et T-B3, re-vérifié en Phase Z. |
| R11 | La logique nouvelle est testée — fonctions pures dans `src/lib/`, couvertes par vitest ; les 12 suites existantes restent vertes | Done | **`e0348e7`.** `src/lib/listPattern.ts` : `computeListState`, `isAnyFacetActive`, `pickFeaturedEntry`, toutes pures (`filter`/`map`/`sort` sur copies — la non-mutation est elle-même testée). **22 tests** dans la 13ᵉ suite ; **13 suites / 142 tests** verts ; `astro check` 0 erreur. Le module n'importe que `./facetFilters`, lequel n'a aucun import : **zéro `astro:content`**, direct ou transitif — vérifié par le contrôleur puis par le relecteur sur le graphe d'imports, pas sur le rapport. Les 2 suites préexistantes modifiées (`posts.test.ts`, `projectFilters.test.ts`) le sont **par ajout seul** : aucune assertion existante affaiblie, renommée ou supprimée. Le relecteur a **recalculé à la main** les valeurs attendues de chaque `describe` — les 5 ordres de tri, l'arithmétique du compte, la chaîne de méta caractère par caractère, le message d'état vide : toutes découlent de l'implémentation, aucune n'a été ajustée après coup, et aucun test tautologique. À re-vérifier en Phase Z. |
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
| B1 | B | R4, R5, R6, R7, R11 — `src/lib/listPattern.ts` : toute la logique du patron, pure et testée | Done (`e0348e7`) |
| B2 | B | R8, R10 — `Thumbnail.astro` : vignette dérivée, sans fichier ni champ | Done (`6479e94`, correctif `35164e8`) |
| B3 | B | R3, R4, R5, R6, R7, R10 — `/projets` rend les 6 éléments + le script de glue unique | In progress |
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
| P-08 | T-B1/Step 4 annonçait « PASS, 18 tests » — un chiffre écrit à la main et jamais mesuré. Le fichier de tests en définit davantage, et sa dernière `describe` en **génère** dans une boucle sur `ORDERS` : tout compte en dur y est faux au premier cas ajouté. | L'attendu devient « tous les tests passent », avec consigne explicite de **reporter le compte observé**. Relevé avant le dispatch de T-B1, donc aucun implémenteur n'a été induit en erreur. |
| P-11 | T-B2 prescrivait `alt={coverAlt ?? ''}` dans `Thumbnail.astro`. **Or `ProjectCard` et `ArticleCard` faisaient déjà `alt={coverAlt ?? title}` AVANT ce plan**, et `coverAlt` est `optional()` dans les deux schémas : en déménageant l'image vers le composant partagé, le plan supprimait silencieusement ce repli. Sans effet aujourd'hui (tous les articles pourvus d'un `cover` ont un `coverAlt`, vérifié fichier par fichier), mais `Thumbnail` est destiné aux 4 cartes : le premier contenu publié sans `coverAlt` aurait perdu son texte alternatif. **Relevé par le relecteur, manqué par l'auto-revue de l'implémenteur.** | **Ruling du contrôleur : défaut de plan, pas déviation** — corriger *restaure* le comportement déjà livré, il ne change pas ce qui était convenu. `Thumbnail` reçoit une prop **`title` requise** et fait `alt={coverAlt ?? title}`. Requise et non optionnelle, pour que l'oubli soit **impossible** et non seulement improbable. Corrigé aux 5 emplacements du plan (interface, B2, B3, C1, C2) ; fix round 1 dispatché sur T-B2. |
| P-10 | T-B2/Step 3 mesurait les vignettes par `grep -c 'rounded-thumb' dist/projets/index.html`, attendu « ≥ 2 ». **`grep -c` compte les lignes qui matchent, pas les occurrences** — et un HTML buildé est compacté sur une seule ligne : la commande renvoie `1` quel que soit le nombre réel de vignettes, donc elle ne peut **jamais** prouver l'attendu. Relevé par l'implémenteur, qui a mesuré autrement plutôt que de conclure à l'échec. | Commande remplacée par `grep -o … | wc -l`, avec la raison écrite à côté pour qu'elle ne soit pas « simplifiée » plus tard. Contrôle des deux monogrammes attendus (`AC`, `WI`) ajouté : c'est le chemin dérivé qui est exercé, aucun projet n'ayant de `cover`. |
| P-09 | T-B1 promettait la signature `pickFeaturedEntry<T extends { featured?: boolean }>(entries: T[])` — **qui ne compile pas contre le test que le même plan spécifie**. `{ featured?: boolean }` est un *weak type* TypeScript : n'ayant que des propriétés optionnelles, il rejette tout argument qui n'en partage aucune, donc `pickFeaturedEntry([{ id: 'first' }])` — exactement le cas des prompts et des skills, qui n'ont pas le champ. Relevé par l'implémenteur, reproduit à `tsc --strict`, puis **reproduit indépendamment en revue**. | Contrainte déplacée : `<T extends object>(entries: (T & { featured?: boolean })[])`. Nom, arité, type de retour et comportement à l'exécution **identiques** ; le test n'a pas été touché. Corrigée aux 2 emplacements du plan, avec la raison, pour qu'aucun implémenteur ultérieur ne la relise fausse. Le relecteur a établi en plus que le **vrai** appel de T-B3 type-check sous les deux signatures : le défaut n'atteignait que le test littéral. Consigné en défaut de plan et non en déviation — verdict rendu par le relecteur avec son propre raisonnement, après qu'il lui a été demandé de ne pas se contenter d'acquiescer. |

## Constats reportés à une tâche ultérieure

Relevés en passant, hors du périmètre de la tâche qui les a trouvés. Aucun n'est une déviation :
aucun n'exige un arbitrage, chacun a une tâche d'accueil déjà prévue au plan.

- **Pour T-D1 — le saut de niveau de surface de la vignette.** Le contrat §2.1 ordonne quatre
  niveaux (`bg → surface → card → rail`) et qualifie un saut de « défaut, pas un choix ». La carte
  de liste est en `bg-surface` (niveau 2) et la vignette dérivée en `bg-rail` (niveau 4) : le niveau
  3 (`card`) manque au milieu. **Implémenté tel quel à dessein**, sur consigne explicite du
  contrôleur : le plan prévoit de trancher en T-D1, *avec une mesure derrière*, et corriger à la
  volée en T-B2 aurait décidé à l'aveugle sur le critère même que ce plan doit rendre auditable.
  Deux résolutions à peser en D1 : promouvoir la carte de liste en `.card-inner` (niveau 3), ou
  rabaisser la vignette en `chip`. C'est **le premier vrai cas de test de V2** depuis que le contrat
  existe — jusqu'ici il n'y avait aucune surface de niveau 3 ou 4 vers laquelle sauter.

- **Pour T-D1 — le contraste du monogramme, mesuré et conforme, mais à l'étroit en clair.**
  `dim` sur `rail` vaut **3.93:1 en clair** et **5.14:1 en sombre** — chiffres de l'implémenteur,
  **recalculés indépendamment par le contrôleur, identiques au centième**. Conforme pour deux
  raisons cumulatives, et non pas une : le monogramme vit dans un conteneur `aria-hidden="true"`,
  donc décoratif au sens de WCAG 1.4.3 ; **et** même traité comme du texte réel, il est rendu à
  `text-2xl` = `1.5rem` = **24 px**, soit du « large scale text » (≥ 18 pt) dont le seuil AA est
  **3:1**, pas 4.5:1 — vérifié sur `--text-2xl` dans le bundle buildé, non supposé. Aucun critère
  n'est donc en défaut, et V8 ne nomme pas cette paire. **Reporté quand même à D1** : si l'audit
  visuel juge le monogramme trop pâle en clair, `text-muted` donnerait 5.38 / 7.60 — un changement
  qui serait alors une **déviation** (le plan prescrit `text-dim`) et devrait être consigné comme
  telle, avec la mesure à l'appui.
  **Nuance mesurée par le relecteur, à emporter en D1 :** la trame `hatch` n'est pas un voile
  uniforme mais un motif diagonal fin (période 9 px, ~11 % de couverture). Sur les liserés
  eux-mêmes, le contraste **clair** tombe à ≈ **2.95:1** (fond composé `rgb(188,211,209)`), soit
  juste sous le seuil de 3:1 ; en sombre la trame éclaircit le fond et le pire cas local reste à
  ≈ 3.74:1. Cela ne renverse pas le verdict — le bloc est `aria-hidden`, et 11 % de liserés de 1 px
  n'emportent pas la lisibilité du glyphe — mais **la valeur plate de `rail` sous-estime le pire cas
  local en clair**. À reprendre si `--color-hatch` clair est un jour relevé.

## État du contenu mesuré au pré-flight (2026-09-13)

Chiffres sur lesquels les critères se mesureront — les relever ici évite de les redécouvrir en
cours d'exécution, et rend un écart futur visible.

| Collection | Publiées | `featured: true` | `cover` | Facettes |
|---|---|---|---|---|
| `blog` | **5** (1 draft) | **0** | 5/5 | `category` (2 valeurs utilisées), `tag` |
| `projects` | 2 | 1 (`site-bencat`) | **0/2** | `status` (2 utilisées), `stack` (8) |
| `prompts` | 3 | *champ absent* | *champ absent* | `format` (2), `tool` (2), `tag` (4) |
| `skills` | 2 | *champ absent* | *champ absent* | `type` (**1 seule valeur**), `tag` (4) |
