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

