# Plan 6 — Deviations log

_Append entries here whenever a task cuts scope, changes approach, or hits a blocker — BEFORE executing anything else (methodology §2.2)._

_Le seul statut qu'un agent écrit est `pending-user` ; seul l'utilisateur passe une entrée en `approved` / `rejected`. Il n'existe pas de troisième statut. Un statut assorti d'un commentaire (« approved, mais… ») n'est pas un statut valide : la Phase Z le ré-audite comme `pending-user`._

_Les entrées les plus récentes sont ajoutées **en haut**, juste sous ce bloc._

---

<!--
TEMPLATE D'ENTRÉE — copier ce bloc, le remplir, le placer en haut de la liste.
Numérotation continue : D01, D02, … (jamais réutilisée, même après un rejet).

## D0N — <titre court : ce qui change, en une ligne>

- **Date:** YYYY-MM-DD
- **Task affected:** T-<x> (+ les fichiers ou artefacts touchés)
- **Original plan:** ce que la spec ou le plan d'impl prescrit, cité précisément
  (numéro de ligne, nom de champ, valeur exacte).
- **Deviation taken:** ce qui est fait à la place, aussi précisément.
- **Reason:** le fait établi qui l'impose — sur la SOURCE, pas sur la doc
  (leçon du Plan 2 : trois affirmations de la doc Sveltia se sont révélées
  fausses ; seule la lecture du bundle épinglé a tranché). Si c'est un constat
  de revue, dire comment il a été reproduit.
- **Reversibility:** `cheap` (au plus une tâche de rework si l'utilisateur
  rejette → on peut procéder pendant que la décision est en attente) ou
  `expensive` (rework multi-tâches, données, ou quoi que ce soit de publié →
  NE PAS procéder ; basculer sur une tâche indépendante, ou écrire le handoff).
- **Caught late:** `no` si loggé avant exécution ; `yes` si on s'est surpris à
  avoir déjà dévié — dans ce cas le dire franchement, ne pas maquiller.
- **Status:** pending-user
- **User decision:** _(vide jusqu'à une décision explicite de l'utilisateur —
  seul lui écrit `approved` / `rejected`, et la phrase qui l'a établie est
  transcrite ici)_
- **Follow-up:** ce qu'il faut faire si l'entrée est rejetée (le chemin de
  retour, concrètement).
-->

## D01 — le raccourci `⌘K` sort du bouton rond et se pose à côté, dans la même pilule

- **Date:** 2026-09-13
- **Task affected:** T-C2 (`src/components/Header.astro`)
- **Original plan:** le plan d'impl, T-C2 Step 1, prescrit « Recherche : `<button data-search-open
  hidden>` — **garder l'attribut et le `hidden`** […] Icône loupe ; `⌘K` reste affiché ≥ `sm` ». Le
  critère R7 de la spec exige « Trois boutons **ronds** — recherche, GitHub, thème — dans un
  conteneur en pilule ». Le header v1 rendait le `<kbd>⌘K</kbd>` **à l'intérieur** du bouton de
  recherche (`src/components/Header.astro:64` en `v1.0.0`).
- **Deviation taken:** les trois boutons restent strictement ronds (32 px) et le `<kbd>⌘K</kbd>` est
  rendu **à côté** du bouton de recherche, dans le même conteneur en pilule. Il porte lui aussi
  `data-search-open`, donc `src/scripts/search.ts` — déjà écrit pour plusieurs déclencheurs — le
  révèle et le rend cliquable sans une ligne de logique nouvelle, et il reste masqué sans JS.
- **Reason:** fait établi **sur le rendu, pas sur une doctrine** : `⌘K` ne tient pas dans un bouton
  rond de 32 px. Les deux clauses sont en tension mécanique — « boutons ronds » (R7) et « `⌘K`
  affiché ≥ `sm` » (plan T-C2) ne peuvent pas être vraies ensemble si le `kbd` est dans le bouton :
  soit le bouton cesse d'être rond et devient une pilule d'environ 64 px, soit le `kbd` sort. Le
  sous-agent a choisi de préserver R7, qui est un critère de la spec, contre une formulation du plan
  d'impl qui ne dit pas *où* le `⌘K` s'affiche.
- **Reversibility:** `cheap` — un seul composant, aucune logique à écrire, le script de recherche
  gère déjà les deux formes. Revenir à la lecture v1 (kbd dans le bouton, qui devient alors une
  pilule d'environ 64 px dès `sm`) est un déplacement de balise.
- **Caught late:** `yes` — exécutée avant ratification. À dire franchement : le sous-agent l'a
  **signalée spontanément dans son rapport** au lieu de la passer sous silence, et ne l'a pas
  maquillée en choix d'implémentation. Elle n'a pas été découverte en revue.
- **Status:** pending-user
- **User decision:** _(vide jusqu'à une décision explicite de l'utilisateur)_
- **Follow-up:** si rejetée, remettre le `<kbd>` à l'intérieur du bouton de recherche et accepter que
  ce bouton-là ne soit plus rond mais une pilule dès `sm` — ce qui rend R7 (« trois boutons ronds »)
  faux à la lettre et demandera soit un arbitrage sur R7, soit de masquer `⌘K` entièrement.

## D02 — deux palettes hors des 23 tokens restent en place, rattachement reporté à P8

- **Date:** 2026-09-13
- **Task affected:** T-D1 — **non exécutée**, signalée avant toute modification.
  Fichiers concernés : `src/lib/aiUsage.ts` (signalétique de transparence IA : slate / ambre / bleu,
  consommée par `AiBanner`) et `src/lib/projectStatus.ts` (statut `wip` en ambre).
- **Original plan:** la contrainte globale n°1 du plan d'impl dit « Aucune valeur de couleur […]
  écrite en dur dans un template. Toute valeur vient d'un token défini dans `@theme` ». Le contrat
  visuel §2 fixe **23 tokens**, et la Phase D a pour mandat de faire consommer les nouveaux tokens
  aux composants existants.
- **Deviation taken:** les deux palettes sont **laissées en l'état**. Elles utilisent des couleurs
  Tailwind par défaut (`amber`, `blue`, `slate`) qui ne sont ni parmi les 23 tokens, ni des valeurs
  codées en dur au sens littéral.
- **Reason:** fait établi **sur les critères, pas sur une impression** : aucun critère mesurable
  n'est violé — V3 passe (l'ambre n'est ni le vert ni le bleu d'accent), V4 passe (le bleu Tailwind
  n'est pas `#7DD3FC`). Et surtout : neutraliser tout de suite ces palettes sur `chip`/`ink`/`dim`
  **ferait perdre son code couleur à la signalétique de transparence IA** — les trois niveaux
  `none`/`partial`/`full` ne se distingueraient plus, alors que c'est le dispositif distinctif du
  site et l'objet entier de `/transparence-ia`. Le foyer naturel de ces teintes est le système des
  **5 tons de tags du contrat §2.3**, que la spec §5 place explicitement en **P8** (« les 5 teintes
  sont dans le contrat visuel mais ne sont consommées qu'en P8 avec `/tags` »).
- **AMENDEMENT du 2026-09-13, après la revue finale de branche — l'argument central de cette
  entrée est partiellement faux, et cela change ce qui est décidé.** La raison ci-dessus dit que
  neutraliser ces palettes « ferait perdre son code couleur à la signalétique de transparence IA ».
  **Or un des trois niveaux l'a déjà perdu, en thème clair, à cause de ce plan.** Mesuré sur le site
  buildé : `bg-slate-100` du niveau `none` vaut `rgb(241,245,249)` et le nouveau `--color-bg` clair
  vaut `rgb(241,244,247)` — une distance de **2.24**, soit un contraste d'environ **1.02:1** entre
  le bandeau et la page. Le bandeau « 100 % humain » n'a donc **aucun aplat visible** en clair ; il
  ne se lit plus que par sa bordure. Pour comparaison, `partial` est à 50.71 de distance et `full` à
  25.16 — eux restent parfaitement lisibles. Avant ce plan, le `bg` clair valait `#FCFCFD`, à ~13.9
  de `slate-100` : la teinte était faible mais visible. C'est donc **une régression causée par le
  changement de token**, pas une dette cosmétique préexistante. Le thème sombre n'est pas affecté.
- **TROISIÈME OPTION, ouverte par cet amendement :** remplacer **le seul `slate`** par le token de
  contrat `--color-chip` (`#E6EBF1` en clair, à ~10 de distance du `bg`), et laisser l'ambre et le
  bleu tels quels. Cela rend son aplat au niveau `none` **tout de suite**, avec un token du contrat,
  **sans** avancer les 5 tons de tags du §2.3 que la spec §5 place explicitement en P8.
- **RATTACHEMENT de `backdrop:bg-black/60`** (`src/components/SearchDialog.astro:8`) **à cette
  entrée**, sur remarque de la revue finale : c'est le même problème — une couleur hors des 23
  tokens, dans un fichier que ce plan a édité, reportée à P8. Elle était classée « constat » pendant
  que les deux palettes étaient classées « déviation ». Les deux appartiennent au même panier,
  sinon l'utilisateur ne tranche que la moitié du sujet. Nuance à connaître pour décider : ici,
  **aucun token ne convient** — le contrat §2 n'a pas de rôle de voile, et les deux candidats les
  plus proches (`bg`, `code`) sont **plus clairs que la page elle-même** en thème clair, ce qui
  supprimerait la seule fonction du voile.
- **Reversibility:** `cheap` — deux fichiers de `src/lib/`, aucune structure touchée, aucune donnée.
  Le rattachement aux tons de §2.3 est un remplacement de chaînes de classes.
- **Caught late:** `no` — signalée **avant** exécution, et rien n'a été modifié dans ces deux
  fichiers. C'est le cas nominal du protocole.
- **Status:** pending-user
- **User decision:** _(vide jusqu'à une décision explicite de l'utilisateur)_
- **Follow-up:** si rejetée, rattacher dès ce plan les deux palettes aux 5 tons du contrat §2.3 —
  ce qui oblige à faire entrer ces 5 triplets dans `global.css` maintenant au lieu de P8, et donc à
  livrer en P6 une partie de ce que la spec §5 a explicitement reporté. Si approuvée, la spec de P8
  doit porter la reprise des deux palettes comme un item nommé, pas comme un sous-entendu.

## D03 — la puce de liste de `.prose` passe de `dim` à `muted` : `dim` tombe sous AA en thème clair

- **Date:** 2026-09-13
- **Task affected:** T-B2 (`src/styles/global.css`, règle `.prose :where(li)::marker`) — constat
  survenu à la **revue finale de branche**, après la clôture de la tâche.
- **Original plan:** le plan d'impl, T-B2 Step 1, prescrit explicitement « puces de liste :
  `--color-dim` ».
- **Deviation taken:** la règle consomme `var(--color-muted)` au lieu de `var(--color-dim)`.
  **Aucune valeur de token n'est modifiée** — seul change le token que cette règle consomme.
- **Reason:** fait **mesuré au rendu**, pas déduit. En clair, `dim` (`#6A7684`) sur `bg`
  (`#F1F4F7`) donne **4.19:1**, sous le plancher AA de 4.5. Les puces d'une liste **ordonnée** sont
  des chiffres, donc du texte au sens de WCAG 1.4.3, et c'est du contenu publié. `muted` donne
  **5.74:1** en clair et **7.91:1** en sombre. Le sombre n'était pas en cause (`dim` y vaut 5.35:1).
  **La faute est au plan, pas à l'implémenteur** : le plan a prescrit un token sans connaître son
  contraste sur le fond de page, alors que sa propre §7 s'engage sur des contrôles de contraste.
  R12 et V8 étant des listes **fermées** de trois paires nommées, aucun critère ne pouvait l'attraper.
- **Reversibility:** `cheap` — un nom de token dans une règle CSS.
- **Caught late:** `yes` — trouvé à la revue finale, après la clôture de T-B2. Personne ne l'avait
  mesuré : c'est précisément l'angle mort d'un critère écrit comme une liste fermée.
- **Status:** pending-user
- **User decision:** _(vide jusqu'à une décision explicite de l'utilisateur)_
- **Follow-up:** si rejetée, remettre `--color-dim` et consigner en clair que le site publie des
  puces de liste ordonnée à 4.19:1 en thème clair — ce qui devra alors figurer dans la spec de P8,
  qui porte déjà « contrastes AA ».

---

## Rappel du discriminant déviation / défaut de plan

Deux journaux distincts, deux régimes distincts — les confondre est la faille que ce plan surveille.

- **Déviation** (ici, `pending-user`, décision de l'utilisateur) : ce qui change ce que
  l'utilisateur observe, contredit une ligne de la spec ou du plan, ou diffère / réduit / supprime
  une exigence.
- **Défaut de plan** (ledger §« Défauts de plan corrigés », pas de décision, pas d'effet sur le ship
  gate) : le texte du plan ou de la spec est faux sur la réalité — chemin inexistant, compte
  périmé, étape qui en contredit une autre. La correction se borne à aligner le texte sur ce qui
  était déjà acté.

**Le test, c'est le diff de la correction.** S'il ne fait qu'aligner un texte sur une réalité déjà
convenue → défaut. S'il change ce qui ship, ce qui est observable, ou s'il réduit / diffère une
exigence → déviation, quelle que soit la justification.
