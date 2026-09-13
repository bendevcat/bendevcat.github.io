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

## D04 — le saut de niveau de surface n'est pas résolu : V2 échoue à la lettre

- **Date:** 2026-09-13
- **Task affected:** T-D1 (`src/components/Thumbnail.astro` et les 4 composants de carte) — et le
  verdict **V2** en Phase Z.
- **Original plan:** T-D1/Step 3 prescrit de **trancher** : « soit la carte de liste passe en
  `.card-inner` (niveau `card`), soit la vignette monte en `chip`. Mesurer avant de choisir. »
- **Deviation taken:** **ni l'une ni l'autre.** Le saut est mesuré, confirmé, documenté — et laissé
  en place. Aucun code n'a changé en T-D1 (zéro commit).
- **Reason:** les deux réparations prescrites ont été évaluées au rendu, en thème sombre, et chacune
  coûte plus que le défaut qu'elle répare :
  - **`.card-inner`** — pour que les 4 listes restent identiques (R9), il faudrait toucher les 4
    composants de carte, ce qui imbrique visuellement une carte dans une carte sur une grille
    compacte, empile trois rayons (20/14/10) qui n'ont jamais coexisté à cette échelle, et ajoute
    l'ombre que `.card-inner` porte. Rayon d'impact large, sur les 4 familles, en dernière tâche ;
  - **`chip`** — un seul fichier, mais cela rouvre la décision **I6** que l'utilisateur a ratifiée
    au gate (« bloc `rail` »), troque le creux voulu contre un aplat neutre, et surtout : `chip`
    **n'appartient pas** à la chaîne ordonnée à quatre niveaux. Ce choix ferait donc *sortir* la
    vignette du périmètre de l'audit V2 au lieu de résoudre la question qu'il pose. Passer un audit
    en quittant son champ d'application n'est pas le passer.
- **Fait mesuré, sans échappatoire :** V2 se lit « Aucune occurrence de `card` sur `bg` ni de `rail`
  sur `surface` ». Les 4 cartes sont `bg-surface`, la vignette est `bg-rail`. **V2 échoue à la
  lettre**, et la méthodologie §4.2 le rend applicable en Phase Z de ce plan.
- **Ce qu'il faut dire honnêtement sur l'origine de cette entrée :** le contrôleur a **lui-même
  autorisé** cette troisième voie dans le dispatch de T-D1 (« mesurer, conclure que le défaut est
  réel, et ne rien changer est un résultat défendable »). L'implémenteur s'est arrêté avant
  d'exécuter, comme le protocole l'exige quand le budget de déviations est plein — c'est le
  comportement attendu. La déviation est donc **autant celle du contrôleur que la sienne** : une
  autorisation ne fait pas disparaître un écart, elle le rend seulement conscient.
- **Ce que ce défaut révèle, et qui vaut au-delà de ce plan :** V2 n'avait jamais rien eu à mesurer.
  Avant le Plan 7, aucune surface de niveau 3 ou 4 n'existait sur le site — le ledger du Plan 6 le
  dit lui-même : « V2 passe, mais c'est P7 qui lui donnera de quoi échouer ». C'est fait. **Le
  premier vrai cas de test du critère le fait échouer**, ce qui est une information sur le contrat
  autant que sur ce plan : la règle des quatre niveaux n'a jamais été éprouvée sur une carte de
  grille compacte, où le niveau intermédiaire n'a pas de place évidente.
- **Reversibility:** `cheap` pour l'option `chip` (un fichier) ; **`expensive`** pour `.card-inner`
  (4 composants, 4 pages, rendu à re-mesurer partout). C'est précisément pourquoi rien n'a été
  exécuté : le protocole interdit de procéder sur une déviation `expensive` dont la décision est en
  attente.
- **Caught late:** `no` — consignée avant toute Phase Z et avant tout ship. Rien n'a été exécuté.
- **Status:** approved
- **User decision:** **Approuvée — option 1 (report).** « **D01 D02 D03 approuvées, D04 option 1** » — décision de l'utilisateur du 2026-09-13, transcrite verbatim. L'option retenue est la première des trois proposées : **le saut de niveau est consigné en échec sur ce plan, et la hiérarchie des surfaces est reprise par le plan qui la possède**. Ni `.card-inner` ni `chip` n'est exécuté. **V2 est donc porté `Deferred` au ledger de ce plan, en référence à cette entrée approuvée**, et l'obligation est inscrite dans la méthodologie §4.2 pour que la spec de P9 la porte comme **item nommé** — pas comme un sous-entendu. C'est la forme qu'avait prise l'obligation héritée du Plan 6, et elle a tenu.
- **Follow-up:** trois issues, à trancher par l'utilisateur :
  1. **Approuver le report** — V2 est consigné en échec sur ce plan et la hiérarchie des surfaces
     est reprise par le plan qui la possède (P9, qui porte déjà la finition et les contrastes). Coût :
     le site ship avec un saut de niveau documenté ;
  2. **`.card-inner`** — réparer vraiment, en acceptant de toucher les 4 cartes et de re-mesurer les
     4 listes. Coût : une tâche supplémentaire, en fin de plan ;
  3. **`chip`** — réparer à moindre coût, en acceptant que la vignette quitte la chaîne des quatre
     niveaux et que la décision I6 soit rouverte.

---

## D03 — sur `/skills`, R6 n'est pas déclenchable avec le contenu réel

- **Date:** 2026-09-13
- **Task affected:** T-C2 (`src/pages/skills/index.astro`) — et le verdict R9 en Phase Z.
- **Original plan:** R9 exige que le patron soit répliqué à l'identique sur les 4 familles et que
  « **R4, R5, R6, R7 s'y vérifient un par un** ». R6 exige qu'« une combinaison sans résultat
  affiche un message nommant les facettes actives **ET** un bouton qui […] ramène le compte au total
  de la collection ».
- **Deviation taken:** sur `/skills`, R6 est tenu **par construction et non par mesure au rendu**.
  Ce qui est vérifié : le conteneur d'état vide est rendu, le même script et la même fonction pure
  le pilotent que sur les trois autres familles, et son déclenchement est mesuré au rendu sur
  `/projets`, `/blog` et `/prompts`. Ce qui **n'est pas** vérifié : le message affiché sur `/skills`
  même, faute de pouvoir y produire un résultat vide.
- **Reason:** fait de **contenu**, pas de code, mesuré sur les fichiers réels. `/skills` publie
  2 entrées, `superpowers` (`tags: [claude-code]`) et `anti-drift-planning`
  (`tags: [anti-drift, planification, claude-code, méthodologie]`), toutes deux en
  `type: claude-code`. Les options de facette ne listent que les valeurs **présentes** — c'est le
  comportement établi au Plan 5, pour ne jamais proposer un filtre qui ne filtre rien. Il n'existe
  donc **aucune combinaison atteignable** qui vide la liste : `type` ne retire jamais rien, et tout
  `tag` proposé garde au moins une entrée. Le meilleur cas mesuré est `tag = anti-drift` → 1 sur 2.
- **Précédent, mais pas identique :** l'utilisateur a déjà arbitré au gate (**G-02**) le cas jumeau
  de **R7** sur cette même page — « mesurer sur `tag`, rapporter `type` tel quel ». R6 est le même
  genre d'impasse, sur un critère que ce gate n'a pas nommé. Étendre G-02 à R6 de ma propre autorité
  serait précisément l'arbitrage silencieux que ce journal existe pour empêcher : c'est à
  l'utilisateur de dire si sa décision couvrait aussi ce cas.
- **Reversibility:** `cheap` — aucun code n'en dépend. Un rejet demande soit de publier un skill
  d'un `type` différent (ce qui rouvre aussi R7), soit d'ajouter une facette qui puisse vider la
  liste, soit d'acter la mesure par construction en le disant dans la spec.
- **Caught late:** `no` — consignée avant que R9 soit porté au ledger et avant tout ship.
- **Status:** approved
- **User decision:** **Approuvée.** « **D01 D02 D03 approuvées, D04 option 1** » — décision de l'utilisateur du 2026-09-13, transcrite verbatim. R6 est donc tenu sur `/skills` **par construction** : même script, même fonction pure testée, déclenchement mesuré au rendu sur les trois autres familles. Le contenu ne permet pas de l'y produire, et cela est consigné plutôt que maquillé. Aucune action de suivi ; si un skill d'un `type` distinct est publié un jour, R6 **et** R7 y redeviendront mesurables d'un coup.
- **Follow-up:** si rejetée, la voie la plus économique est de publier une entrée `skills` portant un
  `type` distinct : elle rend **R6 et R7** mesurables d'un coup sur `/skills`, sans toucher au
  schéma (R10 reste tenu, `type` est déjà une chaîne libre). Cela ajoute en revanche du contenu que
  ce plan n'avait pas prévu de produire.

---

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
- **Caught late:** `yes`. Il faut le dire franchement et sans l'adoucir. L'implémenteur a relevé
  l'effet de bord de lui-même — ce qui l'a rendu visible — mais son rapport concluait « pas traité
  comme déviation bloquante » : il avait **tranché le canal lui-même**, ce que le protocole réserve
  au contrôleur, et le statut « non bloquant » n'existe pas. Le contrôleur a requalifié en déviation
  au moment d'instruire le rapport, avant toute revue et avant tout ship. L'implémenteur l'a reconnu
  spontanément au round suivant, en consignant « Caught late : oui » dans son propre rapport : il
  avait le droit de rapporter les faits, pas celui de décider que ce n'en était pas une.
  **C'est exactement le scénario que ce protocole existe pour attraper** : non pas un agent qui
  dissimule, mais un agent consciencieux qui rapporte *et* s'auto-absout dans la même phrase.
- **Status:** approved
- **User decision:** **Approuvée.** « **D01 D02 D03 approuvées, D04 option 1** » — décision de l'utilisateur du 2026-09-13, transcrite verbatim. L'accueil garde donc le nouveau rendu : vignettes au rayon de 10 px — la valeur que le contrat §3.2 attribue précisément à « vignette, petite image » — et les 4 attributs `data-*` inertes. **Conséquence à porter au Plan 9** : il trouvera l'accueil déjà aligné sur ce point, et le changement de comportement du composant partagé (une vignette dérivée s'affiche désormais là où rien ne s'affichait sans couverture) fait partie de ce qu'il hérite. Aucune action de suivi sur cette branche.
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
- **Status:** approved
- **User decision:** **Approuvée.** « **D01 D02 D03 approuvées, D04 option 1** » — décision de l'utilisateur du 2026-09-13, transcrite verbatim. R2 est donc tenu sur la mesure différentielle : ce que la Phase A devait garantir — ne rien régresser — est prouvé, et les 4 divergences résiduelles contre `milestone-plan-6` restent imputées au contenu, pas à la cascade. Aucune action de suivi : la branche est déjà dans cet état.
- **Follow-up:** si rejetée, R2 ne peut pas être tenu tel qu'écrit sans toucher à du contenu hors
  périmètre de ce plan. Deux chemins : (a) reformuler la mesure de R2 dans la spec pour nommer une
  référence qui inclut la correction de contenu postérieure au tag, puis rejouer la comparaison ;
  (b) porter R2 `Deferred` avec cette entrée en référence — ce qui laisse la Phase A sans critère
  de non-régression, et c'est le coût réel de cette option.

---

