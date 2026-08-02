---
title: "anti-drift-planning"
name: anti-drift-planning
description: "Méthodologie de planification multi-sessions résistante à la dérive : specs binaires, anti-arbitrage silencieux, scope ledger, phase de vérification, lint mécanique."
type: claude-code
version: "0.4.0"
installCmd: "claude plugin marketplace add ~/workspace/anti-drift-planning && claude plugin install anti-drift-planning@anti-drift-marketplace"
tags: [anti-drift, planification, claude-code, méthodologie]
relatedPrompts: [bootstrap-session-anti-drift, decouper-un-projet-en-plans-anti-drift]
---

Un plugin Claude Code — une skill et sept commandes — pour livrer un projet en
plusieurs sessions sans en perdre des morceaux en route. C'est la méthode avec
laquelle ce site est construit, plan par plan.

## Les cinq modes de panne qu'il ferme

1. **Plans trop haut niveau** — l'agent invente les détails manquants et dérive
   de décision en décision.
2. **Coupes de périmètre silencieuses** — l'agent arbitre « pas pertinent » sans
   remonter la décision.
3. **Aucune visibilité en cours de route** — impossible de dire ce qui est fait
   et ce qui a été sauté.
4. **Aucun contrôle final** — du travail incomplet ship sans qu'on le voie.
5. **Des faits comptables laissés à la relecture en prose** — une ligne de ledger
   supprimée, un log manquant, une entrée fantôme passent inaperçus.

À chaque mode de panne, un verrou. Et **chaque verrou a exactement un artefact
canonique** : ses règles détaillées ne sont jamais reformulées ailleurs, parce
qu'une règle reformulée dérive.

## Les cinq verrous

**1 · Specs binaires.** Chaque spec a une table de critères de succès avec une
mesure pass/fail par exigence — une commande, une sortie attendue, une manip de
démo. Verbes vagues interdits (`améliorer`, `supporter`, `gérer`, `peaufiner`,
`optimiser`).

**2 · Anti-arbitrage silencieux.** Toute déviation est loggée **avant** d'être
exécutée, toujours avec le statut `pending-user` — le seul qu'un agent ait le
droit d'écrire. Un défaut dans le texte du plan lui-même n'est *pas* une
déviation : il se corrige sur place et se note au ledger. Au-delà de trois
entrées en attente simultanément, c'est le plan qu'il faut refaire.

**3 · Scope ledger.** Un fichier par plan suit chaque exigence
(`Done` / `In progress` / `Pending` / `Deferred` / `Cut`), mis à jour et committé
après **chaque** tâche.

**4 · Phase de vérification.** La dernière phase de chaque plan est
`/anti-drift-planning:verify <N>`. C'est le seul chemin vers la mise en ligne et
le tag de milestone, et elle échoue sur toute déviation restée `pending-user`.

**5 · Invariants mécaniques.** Ce qui est comptable est compté par du code :
couverture spec↔ledger, vocabulaires de statuts, intégrité des références de
déviations, fichiers requis, placeholders non remplis, SHAs cités. 13 contrôles,
lancés comme première étape de `/verify`. Le code compte, la prose garde le
jugement.

Les verrous se couvrent mutuellement. En pressure test, les agents respectent
« logger avant d'agir » puis inventent des statuts plus doux — « resolved »,
« non-blocking » — pour passer le gate. D'où le verrou 2 qui fige le vocabulaire
et le verrou 4 qui l'audite.

## Le cycle d'une session

- **Phase A — audit et découpage.** Constater l'écart entre ce qui est livré et
  la vision, puis le découper en tranches **verticales** : 3 à 5, chacune livrant
  un résultat observable par l'utilisateur final. Chaque tranche devient un plan.
- **Phase B — écrire les artefacts.** `/anti-drift-planning:init` une fois, puis
  une spec par tranche. Seul le plan d'implémentation du **premier** plan est
  écrit maintenant : écrire les autres d'avance fabrique de la surface
  d'invalidation.
- **Phase C — passer la main.** Une session neuve par plan, démarrée par le
  prompt de bootstrap. C'est ce prompt qui porte le verrou 2. Ensuite la chaîne
  s'auto-propage : chaque `/verify` qui passe émet l'étape suivante.
- **Phase D — récap post-ship.** Compte de tests et statut du lint, comptes finaux
  du ledger, déviations avec leurs résolutions, et les reports éventuels — chacun
  tracé dans la spec du plan suivant, jamais en « todo » vague.

## Les commandes

| Commande | Ce qu'elle fait |
|---|---|
| `/anti-drift-planning:init` | Bootstrappe la méthodologie et l'arborescence dans le projet |
| `/anti-drift-planning:new-plan <N> <topic>` | Écrit une spec de plan depuis le template |
| `/anti-drift-planning:start-session <N>` | Génère le prompt de bootstrap d'une session d'exécution |
| `/anti-drift-planning:verify <N>` | Lance l'audit de vérification ; sur PASS, émet l'étape suivante |
| `/anti-drift-planning:lint [N]` | Vérifie les invariants mécaniques ; sort en code ≠ 0 sur violation |
| `/anti-drift-planning:status` | Tableau de bord inter-plans ; annonce la fin du projet |
| `/anti-drift-planning:resume <N>` | Régénère le prompt de reprise d'un plan interrompu |

## La méthode a un budget

C'est la leçon qui a coûté le plus cher. La vérification doit coûter moins que
la dérive qu'elle évite — en décisions humaines (trois entrées en attente
maximum) comme en code (un contrôle de lint n'existe qu'après un échec
réellement observé). Une itération précédente de ce plugin a ignoré ce budget et
a produit un linter forensique dont son propre auteur a fini par ne plus lire la
file d'approbation. Les tags `archive/v0.4.0-*` la conservent comme
contre-exemple.

## Ce que ça donne en vrai

La méthode a été développée sur un autre projet, puis appliquée à ce site. Sur
ses trois premiers plans : 9, 7 et 7 critères, tous `Done` ; 27 déviations
loggées dont 3 rejetées ; zéro entrée laissée `pending-user` à la sortie.

## Installation

Le dépôt n'est pas accessible publiquement pour l'instant — c'est pourquoi tu ne
trouveras pas de lien vers lui sur cette fiche. Conséquence directe : **la
commande d'installation de cette fiche n'est pas exécutable en l'état**. Il lui
manque l'étape qui la précède, le `git clone` du dépôt vers un chemin local —
et c'est précisément cette étape-là que le 404 rend impossible.

Le reste décrit le fonctionnement réel : le clone fait office de marketplace à
lui tout seul, la commande enregistre cette marketplace puis installe le plugin
depuis elle, et il faut redémarrer Claude Code pour que la skill et les sept
commandes se chargent.
