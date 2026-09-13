# Plan 7 — Scope Ledger

Last updated: 2026-09-13 (**Phase Z — VERDICT PASS**)
Last updated by: main (contrôleur SDD)

## Requirements (extracted from spec §3 Success criteria)

| ID | Requirement | Status | Notes |
|---|---|---|---|
| R1 | Les 4 patrons sont dans `@layer components` et redeviennent surchargeables — mesuré **au rendu** : un élément `class="pill bg-nav"` calcule `--color-nav` et non `--color-accentSoft` | Done | **`53441e6`.** Les 4 patrons sont dans un unique `@layer components` (`global.css:133-164`), aucune déclaration modifiée à l'intérieur des blocs (diff = ré-indentation + 2 accolades). Sonde au rendu mesurée **deux fois indépendamment** — par l'implémenteur puis par le relecteur, qui a posé sa propre sonde : `class="pill bg-nav"` calcule `rgb(255,255,255)` en clair et `rgba(255,255,255,0.05)` en sombre, soit `--color-nav` dans les deux thèmes. Le piège que le Plan 6 avait laissé armé est désarmé. |
| R2 | Le changement de cascade ne régresse rien — squelette DOM identique à `milestone-plan-6` **ET** les 3 paires de contraste du Plan 6 restent ≥ 4.5:1 dans les 2 thèmes | Done | **`53441e6` — volet contraste tenu à la lettre, volet squelette tenu SOUS RÉSERVE DE D01.** Contraste : les 6 ratios (3 paires × 2 thèmes) sont ≥ 4.5 — clair 11.79 / 6.33 / 5.62, sombre 12.75 / 7.34 / 8.25 — recalculés indépendamment par le relecteur (5.61 / 8.25 sur la paire composée, écart d'arrondi). Squelette : la comparaison contre `milestone-plan-6` renvoie **4 divergences sur 52 routes**, qui **préexistent au plan** (l'article `draft` `bienvenue-dans-mon-foutoir` est encore construit au tag, 53 fichiers contre 52). Contre-épreuve sur le `dist` pré-édition : **mêmes 4 lignes à l'identique** — la Phase A n'en ajoute aucune. Le relecteur a validé que la contre-épreuve isole bien la responsabilité de la tâche, **et** qu'elle ne comble pas l'écart entre « cette tâche ne casse rien » et « R2 est tenu à la lettre ». Cet écart est **D01**, `pending-user` : il bloque le ship, pas l'exécution. |
| R3 | `/projets` rend les **6** éléments du patron §5.1, dans l'ordre | Done | **`5622987`.** `/projets` rend les 6 éléments du patron §5.1 dans l'ordre exigé — vérifié deux fois : sur le HTML buildé (positions croissantes des 6 marqueurs) **et** en navigateur par `compareDocumentPosition`, par l'implémenteur puis par le relecteur. |
| R4 | La ligne de méta annonce le compte **exact** — par comptage du DOM, sans filtre, avec un filtre, avec deux facettes | Done | **`5622987`, durci en `26757a9`.** Compte annoncé = compte réellement visible, **remesuré par le relecteur** : sans filtre 2/2 · un filtre 1/1 · deux facettes combinées 0/0 · dropdown seul « 2 projets → 1 projet » (accord singulier correct). Le repli rendu par le serveur s'accorde désormais lui aussi (P-13). R4 se re-vérifie sur les 3 autres familles au titre de R9. |
| R5 | L'entrée « à la une » est **conditionnelle** : 1 sans filtre, 0 dès qu'une facette est active | Done | **`5622987`, corrigé en `26757a9`.** 1 entrée à la une sans filtre, 0 dès qu'une facette est active, réversible dans les deux sens (bouton de réinitialisation **et** pilule « toutes »). **Le correctif `26757a9` est ce qui rend R5 vrai sous tri** : l'entrée à la une se dérive de l'ordre canonique, comme la spec §6.1 l'exige et comme le serveur la calcule — voir P-12, le défaut le plus grave du plan. |
| R6 | L'état vide est contextualisé et réversible — message nommant les facettes actives **ET** bouton ramenant au total | Done | **`5622987`.** Message mesuré au rendu : « Aucun projet pour techno Astro et statut archivé. » — il nomme bien les deux facettes actives. Rendu en `text-sm text-muted`, **jamais en mono** : c'est de la prose (contrainte n°7). Le bouton ramène le compte à « 2 projets », total de la collection. Chemin d'accès : le statut `archivé`, que le contenu ne porte sur aucun projet. |
| R7 | Le dropdown porte une facette secondaire par famille : statut · tri · format · type | Done | **`5622987` · `f33b4e0` · `6a53050`.** Les 4 dropdowns livrés et mesurés au rendu : `/projets` statut (2→1) · `/blog` tri, les 5 ordres réordonnant réellement la grille (1ᵉʳ titre Linux→Docker→k9s) · `/prompts` format (3→1) · `/skills` type. **Réserve nommée, et elle ne se cache pas :** sur `/skills`, `type` n'a **qu'une valeur** dans le contenu publié, donc la sélectionner donne **2 → 2** — le câblage est correct (la méta l'affiche, le moteur applique), mais rien ne prouve qu'il *discrimine*. Preuve reportée sur la facette `tag` (2→1 sur `anti-drift`), conformément à la décision **G-02** de l'utilisateur au gate. Distinction vérifiée indépendamment par le relecteur : limite de contenu, pas défaut de filtrage. |
| R8 | Chaque entrée des 4 listes porte une vignette — image du contenu sinon visuel **dérivé**, en CSS/SVG, sans fichier image ni champ de schéma | Done | **`6479e94` · `35164e8` · `f33b4e0` · `6a53050`.** Les 4 familles portent une vignette. `/blog` exerce la branche image (**5/5** articles ont un `cover`, `<img>` webp réel) ; `/projets`, `/prompts` et `/skills` exercent la branche **dérivée** — monogrammes mesurés au rendu : `AC`/`WI`, `GU`/`FI`, `CL`. **Zéro fichier image, zéro champ de schéma** (R10 tenu). Les tokens `rail` et `hatch`, que le contrat disait ne rien peindre, sont désormais consommés — c'est ce qui donne enfin du travail à V2. |
| R9 | Le patron est répliqué **à l'identique** sur les 4 familles | Done | **`f33b4e0` · `6a53050`.** Les 4 listes rendent les **mêmes 6 éléments dans le même ordre**, et le relecteur a **parcouru les quatre pages dans le même ordre en faisant les mêmes gestes**, plutôt que de comparer du code : attributs de conteneurs strictement identiques sur les 4, même geste → même résultat (méta recalculée et accordée, bloc à la une masqué, grille filtrée, `aria-pressed` synchronisé). **Aucune divergence non décidée.** Les 4 différences relevées sont toutes justifiées : le 2ᵉ `<select>` de `/blog` (tri, décision I1/I2) · sa carte en `<article>` plutôt qu'en `<a>` (nécessité du relais de puce, antérieure à ce plan) · son lien « tous les tags → » (antérieur, hors des 6 éléments) · `data-featured` absent des cartes prompt et skill (ces schémas n'ont pas le champ — R10 —, sans effet observable, le repli sur l'ordre canonique étant identique des deux côtés). **Deux réserves nommées sur `/skills`** : R7/`type` (décision **G-02**) et R6, non déclenchable faute de combinaison vidant la liste (**D03**, `pending-user`). |
| R10 | Le modèle de contenu est **inchangé** — `git diff milestone-plan-6 -- src/content.config.ts` vide | Done | `git diff milestone-plan-6 -- src/content.config.ts` **vide**, vérifié en T-B2 et en T-B3 par l'implémenteur **puis indépendamment par les deux relecteurs**. Aucune tâche restante ne touche le schéma ; re-vérifié en Phase Z. |
| R11 | La logique nouvelle est testée — fonctions pures dans `src/lib/`, couvertes par vitest ; les 12 suites existantes restent vertes | Done | **`e0348e7`.** `src/lib/listPattern.ts` : `computeListState`, `isAnyFacetActive`, `pickFeaturedEntry`, toutes pures (`filter`/`map`/`sort` sur copies — la non-mutation est elle-même testée). **22 tests** dans la 13ᵉ suite ; **13 suites / 142 tests** verts ; `astro check` 0 erreur. Le module n'importe que `./facetFilters`, lequel n'a aucun import : **zéro `astro:content`**, direct ou transitif — vérifié par le contrôleur puis par le relecteur sur le graphe d'imports, pas sur le rapport. Les 2 suites préexistantes modifiées (`posts.test.ts`, `projectFilters.test.ts`) le sont **par ajout seul** : aucune assertion existante affaiblie, renommée ou supprimée. Le relecteur a **recalculé à la main** les valeurs attendues de chaque `describe` — les 5 ordres de tri, l'arithmétique du compte, la chaîne de méta caractère par caractère, le message d'état vide : toutes découlent de l'implémentation, aucune n'a été ajustée après coup, et aucun test tautologique. À re-vérifier en Phase Z. |
| R12 | 375 px et deux thèmes sur les 4 listes, sans contrôle inatteignable | Done | **Aucun commit — rien n'était à corriger.** 4 listes × 2 thèmes × 375/768/1180 px = **24 mesures sur 24** conformes, `scrollWidth === innerWidth` partout : aucun débordement, et aucun coussin non plus. Contrôles à 375 px tous atteignables dans les 2 thèmes, rect non nul (le plus petit mesuré : 40×26 px) ; le bouton de réinitialisation est à 0×0 tant que son conteneur est `hidden`, et devient atteignable (184×26) dès qu'un état vide est réellement produit — comportement voulu, pas défaut. Mesures prises en posant `localStorage.theme` puis en **rechargeant**, jamais après une bascule à chaud (contrainte n°4). |

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
| B3 | B | R3, R4, R5, R6, R7, R10 — `/projets` rend les 6 éléments + le script de glue unique | Done (`5622987`, correctif `26757a9`) |
| C1 | C | R9, R7 (tri), R8 — `/blog` | Done (`f33b4e0`, correctif `fe56fe5`) — voir D02 |
| C2 | C | R9, R8 — `/prompts` et `/skills` | Done (`6a53050`) — voir D03 |
| D1 | D | R12 (+ V2, V6) — 4 listes × 2 thèmes × 375/768/1180 px | Done (aucun commit) — **V2 en échec, voir D04** |
| Z1 | Z | Audit `/anti-drift-planning:verify 7` (couverture R1–R12 + V1–V8) | Done — **verdict PASS** |

## Critères du contrat visuel (V1–V8, §10) — rattachement

La méthodologie §4.2 les rend applicables en Phase Z de chaque plan de la vague 2. Les rattacher ici
évite qu'ils surgissent en Phase Z.

| V | Critère | Tâche | Statut |
|---|---|---|---|
| V1 | Les 23 tokens dans les 2 thèmes | — | Acquis au Plan 6 (`6af9329`) ; aucune tâche de P7 ne touche `@theme`. Re-vérifié en Z1. |
| V2 | Aucun saut de niveau de surface | D1 | **Deferred — déviation D04 approuvée (option 1 : report).** Le critère se lit « aucune occurrence de `rail` sur `surface` » : les 4 cartes sont `bg-surface`, la vignette est `bg-rail`. Le saut est réel, mesuré en sombre, et **rien n'a été exécuté** — les deux réparations prescrites coûtent chacune plus que le défaut (voir D04). **C'est le premier vrai cas de test de V2 depuis que le contrat existe** : le ledger du Plan 6 annonçait que « P7 lui donnera de quoi échouer », et c'est fait. Le premier cas réel le fait échouer. **Décision de l'utilisateur du 2026-09-13 : report.** Ni `.card-inner` ni `chip` n'est exécuté ; la hiérarchie des surfaces est reprise par le plan qui la possède, et l'obligation est inscrite dans la méthodologie §4.2 pour que la spec de P9 la porte comme **item nommé**. |
| V3 | Grammaire des accents respectée en sombre | D1 | **Done.** Les contrôles nouveaux (pilules de filtre, dropdowns, bouton de réinitialisation, ligne de méta) prennent `line`/`muted`/`dim`/`accent` — aucun ne porte de bleu, donc aucun ne porte les deux accents. Vérifié au rendu en sombre sur les 4 listes. |
| V4 | Thème clair sans bleu | — | Acquis au Plan 6. Contrainte globale n°8 du plan d'impl. |
| V5 | Mono réservé à la donnée machine | B3, C1, C2 | **Done.** La ligne de méta est un compteur — donnée machine, `font-mono` justifié. Le message d'état vide est de la prose et rendu en `text-sm text-muted`, **jamais en mono** : vérifié au rendu sur les 4 listes par les relecteurs de T-B3, T-C1 et T-C2. |
| V6 | Rayons ∈ {9, 10, 14, 20, 999}px | D1 | **Done.** Gate repo-wide : **sortie vide**. Les cinq utilitaires nommés restent le seul chemin ; aucune valeur brute n'a été introduite par ce plan. |
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

## Décisions de l'utilisateur sur les déviations (2026-09-13)

Quatre entrées présentées **groupées**, au point d'arrêt imposé par le budget de décisions — jamais
en interruptions successives. Réponse de l'utilisateur, transcrite verbatim :
**« D01 D02 D03 approuvées, D04 option 1 »**.

| # | Objet | Décision | Conséquence |
|---|---|---|---|
| D01 | R2 mesuré en différentiel, la référence ayant bougé pour une raison étrangère au plan | **approved** | R2 reste `Done` ; aucune action |
| D02 | L'accueil change d'apparence (vignettes 14 → 10 px), page gelée pour P9 | **approved** | Le nouveau rendu reste ; P9 hérite de l'accueil déjà aligné et du changement de comportement du composant partagé |
| D03 | Sur `/skills`, R6 n'est pas déclenchable faute de combinaison vidant la liste | **approved** | R9 reste `Done` avec la réserve consignée |
| D04 | Le saut de niveau de surface n'est pas résolu → V2 échoue | **approved, option 1 (report)** | **V2 → `Deferred`** en référence à D04 ; obligation portée à la méthodologie §4.2 pour la spec de P9 |

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
| P-16 | T-C2/Step 4 exigeait que `grep -rn 'facet-filters' src/` soit **vide** après suppression du script. Le grep porte sur le **nom**, pas sur les imports : il attrape 5 lignes de **commentaires de prose** dans 3 fichiers, dont une mention historique parfaitement légitime (`list-pattern.ts` : « remplace facet-filters.ts »). L'attendu était donc inatteignable sans mutiler des commentaires corrects. Relevé par l'implémenteur, qui a rapporté le grep non vide plutôt que de le déclarer conforme. | Grep resserré sur les **imports** (`from '…facet-filters'`). Consigne ajoutée : mettre à jour les commentaires qui décrivent le fichier **comme s'il existait encore** (`blog-filters.ts`, `facetFilters.ts`), garder la mention historique de `list-pattern.ts`. **⚠️ CORRECTION DE CE REGISTRE, apportée par la revue finale de branche.** Cette cellule présentait la consigne comme traitée. **Elle ne l'était pas.** P-16 a été consigné dans `acf2e2d`, qui vient **après** `6a53050` — la tâche T-C2, seule à pouvoir l'exécuter, était déjà close. Aucune tâche ne l'a donc lue, et les 4 commentaires décrivaient toujours le fichier au présent à HEAD. **C'est le même mode de défaillance que P-14** — corriger le plan là où le défaut est trouvé plutôt que là où il sera lu — poussé à son terme : ici, il n'existait plus aucune tâche pour le lire. Exécuté dans la vague de correction finale. |
| P-15 | En déplaçant la facette `tag` de `/blog` des pilules vers un dropdown (décision I2, ratifiée au gate), **le compteur par tag a disparu**. Les pilules affichaient `{tag.label} <span>{tag.count}</span>` depuis le Plan 5 ; les `<option>` ne portent plus que le libellé. Un `<option>` n'accepte pas de balisage — mais il accepte du texte. Relevé par l'implémenteur de T-C1, qui l'a signalé comme point mineur plutôt que de le taire. | **Ruling : défaut de plan, pas déviation** — la décision ratifiée était de **conserver** la facette en la déplaçant, jamais d'en retirer l'information ; restaurer le compteur remet le comportement livré au Plan 5. Le plan porte désormais la consigne explicite : `{tag.label} ({tag.count})`. Vérifié que `/prompts` et `/skills` ne sont pas concernés — leurs dropdowns `tag` n'ont jamais eu de compteur, donc T-C2 ne perd rien. |
| P-14 | Les corrections P-12 et P-13 avaient été écrites dans la section T-B3 du plan, mais les sections T-C1 et T-C2 — qui répliquent ce même bloc — n'en portaient aucune trace. Or chaque tâche est briefée depuis **sa seule section** : les implémenteurs de C1 et C2 n'auraient jamais lu la consigne `NOUNS`, et auraient recopié le pluriel en dur. Relevé par le contrôleur au moment de générer le brief C1. | Consigne `NOUNS` écrite explicitement dans C1 et C2, avec la valeur propre à chaque page. C1 gagne en outre un encadré : `/blog` est **la seule page où le tri s'exerce**, donc la seule qui éprouve réellement le correctif P-12 — l'entrée à la une doit rester la même carte quel que soit l'ordre, et ce point doit être mesuré explicitement. |
| P-12 | **Le plus grave des douze.** T-B1 prescrivait `pickFeaturedEntry(sorted)` — l'entrée à la une dérivée de l'ordre **trié**. La spec §6.1 dit « à défaut, la première entrée de **l'ordre canonique de la collection** » : le plan contredisait donc la spec, et son propre commentaire affirmait à tort que « l'ordre canonique […] est la première du tableau ». Conséquence, **reproduite par exécution réelle en revue** (test vitest jetable) : dès qu'un tri est actif sans facette — le cas de `/blog` en T-C1 — le client désigne une autre entrée que celle rendue par le serveur dans le slot « à la une ». Le slot n'affiche alors rien, **et** l'entrée désignée est simultanément retirée de la grille : elle **disparaît de la page tout en restant comptée** (3 annoncées, 2 visibles → **R4 violé**). Le comportement fautif était en outre **encodé comme voulu** dans `listPattern.test.ts`. | **Ruling : défaut de plan** — le plan contredisait la spec, corriger le met en conformité, rien de convenu ne change. `pickFeaturedEntry(entries)` : l'ordre canonique, qui est exactement ce que le serveur calcule, donc cohérence garantie par construction. Le test de tri est réécrit pour encoder le bon comportement et ajoute deux assertions que l'ancien n'avait pas : `count === visibleIds.length + 1` et `count === total` sous **chacun** des 5 ordres. **Correction d'une affirmation inexacte du contrôleur, apportée par la re-revue :** cette entrée disait d'abord que ces deux assertions « rendent R4 vérifié sous tri ». C'est faux, et il faut le dire franchement — `count` est une **identité arithmétique du code** (`visibleIds.length + (featured ? 1 : 0)`), donc vraie même sous le bug : avec l'ancien code et le tri `oldest`, `count` valait bien 3 = total. **Seule l'assertion `featuredId === 'a'` prouve le correctif.** Les deux assertions de comptage couvrent une classe de régression *différente* — un doublon ou une perte dans `visibleIds`, par exemple si l'exclusion de l'entrée à la une était oubliée — que `featuredId` seul ne verrait pas. Complémentaires, donc utiles, mais elles ne sont pas la preuve du fix.

**Faiblesse du jeu de test, à garder au dossier :** sur les 5 ordres, seuls **2** exposaient le bug (`oldest` → `'c'`, `shortest` → `'b'`). Sous `none`, `recent` et `longest`, l'entrée `'a'` trie en tête **par coïncidence du fixture**, donc ces 3 cas passaient même sur le code fautif. Vérifié indépendamment par la re-revue. Le garde-fou reste suffisant — remettre `sorted` ferait échouer 2 cas sur 5 — mais la marge est plus mince que le nombre de cas ne le suggère. Corrigé dans le plan **avant** T-C1, conformément à la consigne de la spec Phase C : « si la réplication demande de modifier le moteur écrit en B, le corriger en B, pas le contourner en C ». |
| P-13 | La ligne de méta rendue par le serveur codait le pluriel en dur (`{projects.length} projets`) alors que la logique accorde le nom au compte. Sans JavaScript et avec exactement 1 entrée, la page aurait lu « **1 projets** ». Aucune liste n'a une entrée aujourd'hui — mais le bloc est copié sur 3 pages de plus en Phase C. | Une constante `NOUNS` unique en tête de frontmatter alimente **à la fois** `data-list-nouns` et le repli SSR, pour que les deux ne puissent plus diverger. Modèle explicité dans le plan pour les 3 pages de la Phase C. |
| P-11 | T-B2 prescrivait `alt={coverAlt ?? ''}` dans `Thumbnail.astro`. **Or `ProjectCard` et `ArticleCard` faisaient déjà `alt={coverAlt ?? title}` AVANT ce plan**, et `coverAlt` est `optional()` dans les deux schémas : en déménageant l'image vers le composant partagé, le plan supprimait silencieusement ce repli. Sans effet aujourd'hui (tous les articles pourvus d'un `cover` ont un `coverAlt`, vérifié fichier par fichier), mais `Thumbnail` est destiné aux 4 cartes : le premier contenu publié sans `coverAlt` aurait perdu son texte alternatif. **Relevé par le relecteur, manqué par l'auto-revue de l'implémenteur.** | **Ruling du contrôleur : défaut de plan, pas déviation** — corriger *restaure* le comportement déjà livré, il ne change pas ce qui était convenu. `Thumbnail` reçoit une prop **`title` requise** et fait `alt={coverAlt ?? title}`. Requise et non optionnelle, pour que l'oubli soit **impossible** et non seulement improbable. Corrigé aux 5 emplacements du plan (interface, B2, B3, C1, C2) ; fix round 1 dispatché sur T-B2. |
| P-10 | T-B2/Step 3 mesurait les vignettes par `grep -c 'rounded-thumb' dist/projets/index.html`, attendu « ≥ 2 ». **`grep -c` compte les lignes qui matchent, pas les occurrences** — et un HTML buildé est compacté sur une seule ligne : la commande renvoie `1` quel que soit le nombre réel de vignettes, donc elle ne peut **jamais** prouver l'attendu. Relevé par l'implémenteur, qui a mesuré autrement plutôt que de conclure à l'échec. | Commande remplacée par `grep -o … | wc -l`, avec la raison écrite à côté pour qu'elle ne soit pas « simplifiée » plus tard. Contrôle des deux monogrammes attendus (`AC`, `WI`) ajouté : c'est le chemin dérivé qui est exercé, aucun projet n'ayant de `cover`. |
| P-09 | T-B1 promettait la signature `pickFeaturedEntry<T extends { featured?: boolean }>(entries: T[])` — **qui ne compile pas contre le test que le même plan spécifie**. `{ featured?: boolean }` est un *weak type* TypeScript : n'ayant que des propriétés optionnelles, il rejette tout argument qui n'en partage aucune, donc `pickFeaturedEntry([{ id: 'first' }])` — exactement le cas des prompts et des skills, qui n'ont pas le champ. Relevé par l'implémenteur, reproduit à `tsc --strict`, puis **reproduit indépendamment en revue**. | Contrainte déplacée : `<T extends object>(entries: (T & { featured?: boolean })[])`. Nom, arité, type de retour et comportement à l'exécution **identiques** ; le test n'a pas été touché. Corrigée aux 2 emplacements du plan, avec la raison, pour qu'aucun implémenteur ultérieur ne la relise fausse. Le relecteur a établi en plus que le **vrai** appel de T-B3 type-check sous les deux signatures : le défaut n'atteignait que le test littéral. Consigné en défaut de plan et non en déviation — verdict rendu par le relecteur avec son propre raisonnement, après qu'il lui a été demandé de ne pas se contenter d'acquiescer. |

## Phase Z — audit de vérification du 2026-09-13 · **VERDICT : PASS**

| Étape | Résultat |
|---|---|
| **2 · Artefacts requis** | spec, ledger et journal de déviations présents |
| **3 · Lint mécanique (lock 5)** | **13 checks, 0 violation**, 0 note |
| **4 · Couverture spec §3** | **12 / 12** `R` en `Done`, audités **depuis la spec** et non depuis le ledger. Aucun `Pending`, aucun `In progress`, aucune ligne manquante |
| **5 · Revue des déviations** | **4 approved, 0 rejected, 0 pending-user.** Garde anti-blanchiment appliquée : aucun statut inventé à ré-auditer |
| **6 · Suite de tests, à neuf** | vitest **13 suites / 144 tests** verts · `astro check` **0 erreur, 0 warning** · build **52 pages** · R10 : `git diff milestone-plan-6 -- src/content.config.ts` **vide** · V6 : gate repo-wide **sortie vide** |
| **7 · Parcours de la user story** | **5 / 5 validées par l'utilisateur**, sur valeurs mesurées au rendu : « 2 projets » → « 1 projet · techno Astro » → « 0 projet · techno Astro · statut archivé » → « Aucun projet pour techno Astro et statut archivé. » → reset → « 2 projets » |
| **8 · Smoke visuel** | **Conforme, validé par l'utilisateur** — `/projets` sombre, état vide, `/blog` 375 px clair, `/skills` sombre |

**Critères du contrat visuel :** V3, V5, V6, V8 `Done` sur ce plan · V1, V4, V7 acquis au Plan 6 ·
**V2 `Deferred`** en référence à **D04 approuvée** (option 1 — report), obligation inscrite à la
méthodologie §4.2 pour la spec de P9.

### Ce que cette exécution a réellement coûté, pour la mémoire du projet

**16 défauts de plan** (P-01 à P-16), **4 déviations** toutes approuvées, **3 rondes de correction**
sur 5 tâches revues, **1 vague de correction finale** de 6 items, et **1 arrêt réglementaire** au
budget de décisions.

Trois faits méritent d'être retenus, parce qu'ils se reproduiront :

1. **Un test peut verrouiller un bug.** Le défaut P-12 — une entrée qui disparaissait de la page
   tout en restant comptée — était **encodé comme voulu** dans la suite de T-B1. Sa revue avait
   recalculé les attentes contre l'implémentation, et elles concordaient : les deux étaient fausses
   *ensemble*. Seule une exécution dans un contexte que le test n'anticipait pas l'a révélé.
2. **Corriger le plan là où le défaut est trouvé ne suffit pas.** P-14 puis P-16 sont le même mode
   de défaillance : une correction écrite dans une section que plus aucune tâche ne lira. La
   seconde fois, le ledger la présentait même comme faite — un registre qui surestime ses
   garanties éteint la vigilance exactement là où elle servirait.
3. **La mesure au rendu a tout attrapé.** Sur les 4 déviations, **3 sont nées d'une mesure dans la
   page** et la 4ᵉ d'une comparaison de deux builds. Aucune n'aurait fait échouer un test, aucune
   n'était visible dans un diff. C'est la confirmation de ce que la spec §7 annonçait en citant le
   Plan 6.

## Revue finale de branche (2026-09-13) — ce que les revues par tâche ne pouvaient pas voir

Lancée sur les **28 commits d'un coup**, après l'approbation des 4 déviations. Verdict initial :
`changes requested`, **6 correctifs**, tous petits, appliqués en **une seule vague** (`875932d`) puis
re-revus (tous `ADDRESSED`, aucune casse, **prêt à merger**).

Trois constats n'étaient visibles qu'à l'échelle de la branche :

| # | Constat | Traitement |
|---|---|---|
| B1 | **L'accord de zéro vivait à 5 endroits**, pas un : le moteur **et** les 4 replis SSR. Le contrôleur n'en avait vu qu'un. Corriger l'un sans les autres rouvrait exactement la divergence que la constante `NOUNS` existe pour rendre impossible. Aucun test ne couvrait `count === 0`. | Corrigé aux 5 sites + test sur la chaîne complète, avec preuve RED |
| B2 | **Une correction décidée puis jamais exécutée, et présentée comme faite par ce registre** — voir la cellule P-16, corrigée | Exécuté dans la vague |
| B3 | **La cohérence serveur/client de l'entrée à la une reposait sur l'ordre du DOM**, pas sur un attribut : les deux côtés retombaient sur « le premier » et ne s'accordaient que parce que la grille se trouvait rendue dans l'ordre canonique. **C'est l'invariant dont la rupture a produit P-12**, et rien ne le gardait — ni test, ni commentaire, ni attribut | `data-featured` est désormais émis par le **serveur** sur l'entrée qu'il a choisie ; le relecteur a vérifié que le client la trouve par `.find()` et **n'emprunte plus le repli `?? entries[0]`**. Aucun slot n'a bougé, sur les 4 pages et sous les 5 tris |

**Triage des 5 mineurs différés**, chacun argumenté plutôt que tranché en bloc :

| Mineur | Verdict | Raison |
|---|---|---|
| Accord de zéro | **corrigé** | Même classe que P-13, visible sur les 4 listes, 5 sites |
| Commentaires périmés | **corrigé** | Pas un mineur : une consigne du plan non exécutée (B2) |
| JSDoc de `pickFeaturedEntry` | livré tel quel | Le « pourquoi » de la contrainte n'est pas devinable et a déjà coûté une ronde (P-09) ; l'amputer rendrait la signature inexplicable |
| `derivedFrom.slice(0, 2)` | livré tel quel | Toutes les valeurs sont des identifiants ASCII issus du schéma, que R10 gèle |
| Faiblesse du fixture de tri | **renforcé quand même** | Verdict « livrable tel quel » (c'est de la robustesse, pas une correction), mais le correctif n°1 rouvrait le même fichier : **4 tris sur 5** exercent désormais le garde-fou, contre 2 |

**Constats livrés tels quels, à emporter par les plans suivants** (aucun n'est une déviation : la
spec est muette sur chacun, et aucun ne réduit un requirement) :

- **Pas d'`aria-live` sur la ligne de méta ni sur l'état vide** des 4 listes. Un clic de pilule
  n'annonce rien à un lecteur d'écran. Surface **neuve** de ce plan, donc pas une régression — mais
  le repo pose déjà un `aria-live` dans `SearchDialog.astro:27`. **Pour P9**, qui porte la finition
  et les contrastes AA, donc l'accessibilité.
- **Sous tri, la carte du haut de `/blog` ne bouge jamais** : l'entrée à la une se dérive de l'ordre
  canonique (c'est R5 et le correctif P-12), donc le 1ᵉʳ titre de la *page* est invariant, même si
  le 1ᵉʳ titre de la *grille* change. R7 est tenu. Conséquence croisée de I3 et de P-12 que personne
  n'avait arbitrée — à connaître avant de toucher au tri.
- **« par défaut » et « plus récents » donnent le même ordre** sur `/blog` : l'ordre canonique **est**
  `pubDate desc`. R7 ne nomme que 4 valeurs et les 4 fonctionnent ; la 5ᵉ est un supplément du plan
  d'impl, inoffensif mais redondant.
- **`/blog` nomme ses facettes par leur *slug***, les 3 autres par leur libellé. Invisible : aucun
  tag publié n'a un slug différent de son libellé.
- **`matchesFilters` de `src/lib/projectFilters.ts` n'a plus d'appelant de production** depuis la
  suppression de `project-filters.ts` ; seule `projectFacets()` l'est. C'est le choix explicite
  **I5** — le module et sa suite sont conservés parce que R11 exige que les 12 suites restent
  vertes — mais il fallait le **nommer** plutôt que le laisser implicite.

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
