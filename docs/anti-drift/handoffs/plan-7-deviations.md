# Plan 7 — Deviations log

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
  de revue, dire comment il a été reproduit. Leçon du Plan 6, valable ici :
  sur une vague visuelle, cinq défauts sur cinq n'ont été attrapés que par une
  MESURE AU RENDU — pas par un test, pas par une relecture de diff.
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

## D02 — l'accueil change d'apparence, alors que la spec le place hors périmètre

- **Date:** 2026-09-13
- **Task affected:** T-C1 (`src/components/ArticleCard.astro`, répercuté sur `src/pages/index.astro`)
- **Original plan:** la spec §1 est catégorique : « **Aucune autre surface ne change dans ce plan.**
  Les fiches de détail gardent leur structure v1 (→ P8), l'accueil garde la sienne (→ P9). » Et §5
  reporte explicitement l'accueil au Plan 9.
- **Deviation taken:** `ArticleCard.astro` est utilisé par **deux** pages — `/blog` **et l'accueil**
  (`src/pages/index.astro:26`). En lui faisant rendre sa vignette via `<Thumbnail>`, comme le plan
  le prescrit pour R8, on change aussi ce que l'accueil affiche. Mesuré sur le rendu buildé :
  - le **rayon** des 5 vignettes de l'accueil passe de `rounded-inner` (**14 px**) à
    `rounded-thumb` (**10 px**) — c'est le changement visible ;
  - l'accueil émet en plus 5 `data-entry-id`, `data-date`, `data-minutes` **et `data-facet`** (ce
    dernier porte du JSON réel — catégorie et tags). Tous **inertes** : `list-pattern.ts` ne
    s'active que sur un `[data-list]`, et l'accueil n'en a aucun (`grep -c 'data-list'
    dist/index.html` → **0**). Aucun comportement n'est ajouté ;
  - **un changement de comportement latent du composant partagé** : avant, `{cover && <Image/>}` ne
    rendait **rien** quand l'article n'avait pas de couverture ; `<Thumbnail>` rend désormais
    **toujours** quelque chose — le visuel dérivé (bloc `rail`, trame, monogramme). Invisible
    aujourd'hui, les 5 articles publiés ayant tous un `cover`, mais le premier article publié sans
    couverture ferait apparaître un monogramme sur l'accueil, là où la page n'affichait rien.

  **Les deux derniers points ont été ajoutés après coup**, sur constat du relecteur de T-C1 à qui il
  avait été demandé de borner le rayon d'impact plutôt que de le prendre pour acquis : la première
  version de cette entrée ne citait que le rayon et trois attributs. Une décision se prend sur ce
  que l'entrée décrit — une entrée partielle produit une approbation partiellement informée.

  Ce qui, en revanche, **ne change pas** sur l'accueil, vérifié par le relecteur : disposition,
  espacement, comportement de survol, classes de l'`<article>` et de la grille — aucune imbrication
  supplémentaire n'est introduite par `<Thumbnail>`.
- **Reason:** ce n'est **pas une erreur de l'implémenteur** — il a exécuté le plan à la lettre, et il
  a signalé l'effet de bord spontanément dans son rapport. C'est le **plan** qui entre en conflit
  avec la spec : il prescrit de faire passer `ArticleCard` par `<Thumbnail>` sans avoir remarqué que
  ce composant est partagé avec une page que la spec gèle. Le conflit ne pouvait se voir qu'à
  l'exécution, sur le rendu.
- **Argument POUR l'approbation, à peser honnêtement :** 10 px est la valeur que le contrat §3.2
  attribue précisément à « vignette, petite image » ; 14 px y désigne « carte imbriquée, image
  d'en-tête ». Le nouveau rayon est donc **plus conforme au contrat visuel** que l'ancien. Le Plan 9
  devra de toute façon reprendre l'accueil, et il le trouverait alors déjà aligné.
- **Argument CONTRE :** la spec de ce plan dit « aucune autre surface ne change », sans nuance, et
  l'accueil est nommément reporté à P9. Un changement visuel non demandé sur une page hors périmètre
  est exactement ce que cette clause existe pour empêcher — même quand il va dans le bon sens.
- **Reversibility:** `cheap` — une prop de rayon sur `<Thumbnail>`, ou une variante passée par
  l'accueil, et le rendu d'origine revient. Un seul composant, aucune logique. On procède donc
  pendant que la décision est en attente.
- **Caught late:** `no` pour la consignation — l'entrée est écrite avant tout ship et avant que R9
  soit porté `Done`. À dire franchement, en revanche : l'implémenteur a **exécuté** avant que
  l'effet soit consigné, parce que ni lui ni le plan n'avaient anticipé le partage du composant ; il
  l'a relevé de lui-même dans son rapport plutôt que de le laisser passer.
- **Status:** pending-user
- **User decision:** _(vide — seul l'utilisateur écrit `approved` / `rejected`)_
- **Follow-up:** si rejetée, ajouter à `<Thumbnail>` une prop de rayon (défaut `rounded-thumb`) et
  faire passer l'accueil sur `rounded-inner`, de sorte que `/blog` garde le nouveau rendu et que
  l'accueil retrouve exactement le sien. Les attributs `data-*` inertes peuvent rester ou être
  conditionnés à une prop `filterable` déjà existante — le dire dans la décision.

---

## D01 — R2 est mesuré en différentiel (« la Phase A n'ajoute aucune dérive »), pas en absolu

- **Date:** 2026-09-13
- **Task affected:** T-A1 (`src/styles/global.css`) — et, par ricochet, le verdict R2 de la Phase Z.
- **Original plan:** la spec §3 écrit R2 ainsi : « Les pages générées sont **identiques en squelette
  DOM** à `milestone-plan-6` (mêmes balises, même ordre, attributs retirés) ». Le plan d'impl
  T-A1/Step 4 en tire l'attendu : « **aucune ligne `DIFF:`** ni `ABSENT` ».
- **Deviation taken:** R2 est déclaré tenu sur une mesure **différentielle** : la comparaison contre
  `milestone-plan-6` renvoie **4 lignes `DIFF:`** (`blog/index.html`, `index.html`,
  `projets/site-bencat/index.html`, `tags/claude-code/index.html`), et ce qui est vérifié est que
  **la Task A1 n'en ajoute aucune** — contre-épreuve faite en rejouant la même boucle sur le `dist`
  capturé **avant** l'édition de `global.css`, qui renvoie les **mêmes 4 lignes, à l'identique**.
- **Reason:** fait établi sur le rendu buildé, pas sur une doctrine. `milestone-plan-6` construit
  **53** fichiers HTML, la branche courante **52** ; l'unique fichier en moins est
  `blog/bienvenue-dans-mon-foutoir/index.html`, l'article **`draft: true`**. Ce brouillon était
  encore construit au tag et ne l'est plus depuis un commit **postérieur au tag** — la fusion dans
  `main` que le ledger du Plan 6 consigne sous « un commit distant a changé le contenu qui part en
  production ». Les 4 divergences sont la conséquence mécanique de sa disparition (une carte de
  moins dans deux listes, un lien de moins dans deux pages qui le référençaient). **Elles
  préexistent à la première ligne de code du Plan 7** : la référence de R2 a bougé pour une raison
  étrangère à ce plan.
- **Pourquoi c'est consigné ici et pas en défaut de plan.** Le canal est douteux, et le protocole
  tranche le doute dans ce sens. L'argument pour le défaut : R2 s'intitule « le changement de
  cascade ne régresse rien », et la mesure différentielle mesure exactement cette intention. **Mais
  la lettre du critère nomme une comparaison absolue contre une référence précise, et la remplacer
  par une comparaison différentielle est une lecture plus étroite que l'écrit** — ce que le
  protocole classe explicitement comme déviation, pas comme correction de texte.
- **Reversibility:** `cheap` — aucune ligne de produit n'en dépend. Un rejet ne demande pas de
  rework de code : il demande une autre mesure (par exemple rétablir une référence propre en
  re-taguant un point de comparaison qui inclut la correction de contenu, ou acter les 4
  divergences comme delta connu et documenté). On procède donc pendant que la décision est en
  attente.
- **Caught late:** `no` — consigné avant que R2 soit porté `Done` au ledger, et avant toute
  décision de ship.
- **Status:** pending-user
- **User decision:** _(vide — seul l'utilisateur écrit `approved` / `rejected`)_
- **Follow-up:** si rejetée, R2 ne peut pas être tenu tel qu'écrit sans toucher à du contenu hors
  périmètre de ce plan. Deux chemins : (a) reformuler la mesure de R2 dans la spec pour nommer une
  référence qui inclut la correction de contenu postérieure au tag, puis rejouer la comparaison ;
  (b) porter R2 `Deferred` avec cette entrée en référence — ce qui laisse la Phase A sans critère
  de non-régression, et c'est le coût réel de cette option.

---

