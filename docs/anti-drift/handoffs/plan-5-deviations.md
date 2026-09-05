# Plan 5 — Deviations log

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

## D01 — R3 n'est plus démontrable sur les 4 collections : l'unique article porteur est passé en `draft`

- **Date:** 2026-09-05
- **Task affected:** T-B2 (`/tags/[tag].astro`, `src/content/blog/bienvenue-dans-mon-foutoir/index.md`) — constat survenu **après** la tâche, à la fusion de `origin/main`.
- **Original plan:** la spec §3 mesure R3 ainsi : « Ouvrir un tag partagé → entrées **blog + projets + prompts + skills** listées ensemble ». Au gate du 2026-09-04, l'utilisateur a choisi « J'ajoute `claude-code` où c'est vrai » précisément pour rendre ce critère démontrable, et le retag de T-B2 l'avait établi : `/tags/claude-code/` rendait **4 groupes** — Articles 1, Projets 1, Prompts 2, Skills 2.
- **Deviation taken:** R3 n'est plus prouvé que sur **3 collections sur 4** (projets, prompts, skills). Mesuré sur le build après fusion : `/tags/claude-code/` rend `blog: 0, projets: 1, prompts: 2, skills: 2`. Le code d'agrégation est inchangé et correct ; c'est la donnée qui ne permet plus la démonstration.
- **Reason:** fait établi **sur le dépôt, pas sur une doctrine** : le commit `d2f4ab2` (« Update Article “bienvenue-dans-mon-foutoir” », auteur benCat, 2026-08-02, fait depuis le CMS `/admin`) existait sur `origin/main` sans avoir jamais été récupéré localement. Il met `draft: true` sur cet article. Or c'est le **seul** article du blog portant `claude-code`, et aucun autre article ne parle de Claude Code — la 4ᵉ patte ne peut donc pas être remplacée sans poser une étiquette fausse, ce que l'arbitrage du gate interdit explicitement. Impact mesuré par build comparatif : 52 → **51 pages**, 13 → **12 pages indexées**, `/blog` 6 → **5** cartes.
- **Ce qui N'EST PAS affecté, vérifié après fusion :** R1 (⌘K → toujours **4 groupes / 9 résultats** pour « git ») · R2 (**30** liens de tag rendus) · R4 (filtrage revérifié par comptage sur la nouvelle donnée : DevOps **2**, Outils **3**, retour **5** ; kubernetes **2**, devops **3**, retour **5** — tous conformes aux sources recalculées, et la catégorie « Actus » a correctement disparu de la barre) · R5, R6, R7 · la moitié « build » de R8.
- **Reversibility:** `cheap` — un seul champ de frontmatter. Repasser l'article en `draft: false` restaure la 4ᵉ patte immédiatement, sans toucher à une ligne de code.
- **Caught late:** no — loggé avant toute publication, et **avant** que la Phase Z soit lancée.
- **Status:** pending-user
- **User decision:** _(en attente — l'utilisateur a explicitement choisi, le 2026-09-05, de laisser l'article hors ligne ET de trancher cette entrée séparément plutôt que de l'approuver dans la foulée)_
- **Follow-up:** si rejeté, repasser `draft: false` sur `src/content/blog/bienvenue-dans-mon-foutoir/index.md` et rebuilder : R3 revient à 4 collections, `/blog` à 6 cartes, l'index à 13 pages. Si approuvé, R3 est acté `Deferred` ou `Cut` selon le mot de l'utilisateur, et la spec du prochain cycle devra dire comment la 4ᵉ collection sera couverte.

---

