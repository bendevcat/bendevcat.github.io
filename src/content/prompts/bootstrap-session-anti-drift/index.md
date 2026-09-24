---
title: "Prompt de bootstrap d'une session d'exécution anti-drift"
description: "Le prompt collé en tête de chaque session d'exécution d'un plan : il porte les verrous anti-dérive (test de déviation, statuts, protocole de réversibilité) et interdit à l'agent de trancher en silence."
format: fiche
tool: Claude Code
model: claude-opus-5
tags: [anti-drift, claude-code, méthodologie, prompt-engineering]
prompt: |
  <!-- Transient / regenerable. Regénérer avec /anti-drift-planning:start-session 4 (émetteur canonique).
       Émis par la Phase Z du Plan 3 (verify 3 → PASS). -->

  > **Plan 3 shipped.** Before pasting this, confirm plan 4's spec still holds given what shipped — if plan 3 changed assumptions, edit the spec first.
  > **Points de re-validation concrets (le Plan 3 a livré ceci) :**
  > 1. Le CMS expose désormais **deux** collections (`blog`, `projects`), toutes deux avec **`delete: false`** (déviation D08) : le CMS ne nettoie pas les rétro-références, une suppression laisserait une référence morte qui casse **tout** le build. Une nouvelle collection doit trancher ce point explicitement, pas l'hériter par défaut.
  > 2. `src/lib/cms-config.test.ts` verrouille la config CMS contre le schéma Zod pour les deux collections (42 tests). Une nouvelle collection doit y ajouter ses assertions — et **les deux côtés** de toute relation `reference()` : au Plan 3, seul un côté était vérifié, et c'est la revue finale de branche qui l'a vu.
  > 3. **`getEntries` d'Astro ne lève pas** sur une référence introuvable : il renvoie `undefined`, qui produit plus loin un `TypeError` anonyme interrompant le build entier. Le helper **`assertEntriesResolved`** (`src/lib/projects.ts`) échoue en nommant l'entrée porteuse, la collection et l'id manquant. Toute nouvelle page résolvant une `reference()` doit l'utiliser — `skills ↔ prompts` est exactement ce cas.
  > 4. Le **patron de filtre** de `/projets` est le précédent à reprendre pour `/prompts` et `/skills` : prédicat **pur** dans son propre module sans import (`src/lib/projectFilters.ts`, testé unitairement), script vanilla dans `src/scripts/`, et une **règle CSS globale explicite** — masquer par le seul attribut `hidden` ne suffit pas, `[hidden]` et l'utilitaire Tailwind `flex` ont la même spécificité.
  > 5. La nav (`src/components/Header.astro`) a **Projets** actif ; **Prompts** et **Skills** sont encore des `<span>` non cliquables. Le Plan 4 doit les activer — et cette activation n'est exigée par aucun critère, donc à ratifier explicitement au gate.
  > 6. `ProjectCard.astro` + `src/lib/projectStatus.ts` sont le précédent pour toute nouvelle variante de carte : métadonnées d'affichage dans un module partagé de `src/lib/`, jamais dupliquées dans deux gabarits.
  > 7. Les champs URL du CMS utilisent un `pattern` **ancré des deux côtés** (déviation D03) : le validateur de Sveltia fait un `RegExp.test` non ancré, donc `^https?://` seul laisse passer `https://`, que Zod rejette. Réutiliser le motif éprouvé pour tout `repoUrl` de la collection `skills`.
  > 8. **`tags` est déclaré aux schémas et rendu nulle part** (blog et projects). Les pages de tags sont le **Plan 5** — ne pas les faire au Plan 4.
  > 9. **Le tag `milestone-plan-2` n'a jamais été posé** : la série de milestones a un trou. À corriger avant ou avec le tag du Plan 3.

  ---

  Vous démarrez l'exécution du Plan {N} — {topic}.

  FICHIERS DE CONTEXTE (à lire AVANT toute autre action) :
  - docs/anti-drift/specs/2026-07-19-methodology.md — les 4 verrous anti-drift
  - docs/anti-drift/specs/2026-07-19-plan-{N}-{topic}.md — la spec de ce plan
  - docs/anti-drift/plans/2026-07-19-plan-{N}-{topic}.md — plan d'implémentation (le générer s'il manque)
  - docs/anti-drift/handoffs/plan-{N}-ledger.md — scope ledger (le créer s'il manque)
  - docs/anti-drift/handoffs/plan-{N}-deviations.md — log des déviations (le créer s'il manque)
  - CLAUDE.md — conventions du repo

  PRÉ-FLIGHT (dans cet ordre, avant tout le reste) :
  1. Créer la branche `plan-{N}-{topic}` depuis `{BASE_REF}`.
  2. Si le plan d'implémentation manque, l'écrire depuis la spec — via superpowers:writing-plans
     si installé ; sinon l'écrire soi-même : chaque exigence de la spec couverte par au
     moins une tâche, chaque tâche listant les fichiers qu'elle touche et un critère
     d'acceptation binaire.
  3. Si le ledger manque, le créer depuis la spec §3 (chaque ligne `Pending`).
  4. Si le log des déviations manque, le créer (en-tête + template d'entrée uniquement).
  5. Committer : `chore(p{N}): seed plan + scope ledger + deviations log`.
  6. Demander à l'utilisateur de valider le plan d'implémentation avant de démarrer T1.

  CE QUI COMPTE COMME UNE DÉVIATION — appliquer ce test avant chaque choix non trivial.
  C'EST une déviation si l'UNE de ces conditions est vraie :
  - ça change quelque chose que l'utilisateur peut observer (comportement, UI, sortie,
    messages d'erreur, performance promise par la spec) ;
  - ça contredit ou invalide une ligne de la spec ou du plan d'impl (approche ou lib
    différente, tâche sautée, tâche ajoutée, exigence réinterprétée plus étroitement
    qu'écrite) ;
  - ça diffère, coupe ou réduit une exigence ou une tâche.
  Ce N'EST PAS une déviation quand la spec ET le plan sont muets ET que rien
  d'observable par l'utilisateur ne change (noms internes, helpers privés, wording de
  commentaire, agencement du code dans les limites d'une tâche).
  Dans le doute, c'est une déviation. Logger coûte 30 secondes ; le drift silencieux
  coûte une release.

  PROTOCOLE DE DÉVIATION (non négociable) :
  1. STOP avant d'exécuter la déviation. Écrire l'entrée de log D'ABORD.
     Si vous vous surprenez à avoir déjà dévié sans logger : stop, logger immédiatement,
     mettre `Caught late: yes` dans l'entrée.
  2. Le statut de chaque entrée que vous écrivez est `pending-user`. C'est le SEUL statut
     que vous êtes autorisé à écrire. `approved` / `rejected` sont les mots de
     L'UTILISATEUR — vous ne les transcrivez qu'après une décision explicite de sa part.
     Il n'y a pas de troisième statut : ni « resolved », ni « ratified-later », ni
     « non-blocking », ni « info-only ». Inventer un statut plus doux pour passer le gate
     de ship EST l'arbitrage silencieux que ce protocole existe pour empêcher.
     Un statut assorti d'un commentaire (« approved, mais… ») N'EST PAS un statut valide :
     la Phase Z le ré-audite comme `pending-user`.
  3. Classifier la réversibilité dans l'entrée :
     - `cheap` (au plus une tâche de rework si l'utilisateur rejette) → vous pouvez
       procéder avec le choix loggé pendant que la décision est en attente.
     - `expensive` (rework sur plusieurs tâches, des données, ou quoi que ce soit de déjà
       publié) → NE PAS procéder. Basculer sur une tâche indépendante ; s'il n'y en a
       pas, écrire le handoff et finir le tour.
  4. Procéder ≠ shipper. Le script de release et le tag de milestone ne tournent JAMAIS
     tant qu'une entrée est `pending-user` — `/anti-drift-planning:verify {N}` l'impose.
     Si l'utilisateur est indisponible, finir la session « prêt à ship, une décision en
     attente » EST l'état de succès. Un tag posé sur une déviation non approuvée ne l'est
     pas.
  5. Chaque subagent que vous dispatchez reçoit ce PROTOCOLE DE DÉVIATION collé dans son
     prompt, et son rapport doit contenir la section « Ce que je n'ai PAS fait, et
     pourquoi ».

  RATIONALISATIONS QUI NE PASSENT PAS (chacune observée en pressure test réel) :
  | Vous pensez | Réalité |
  |---|---|
  | « C'est réglé — l'utilisateur ratifiera plus tard » | Ratifier-plus-tard EST pending-user. Seul l'utilisateur clôt une entrée. |
  | « Rien n'a été coupé, donc ça ne bloque pas le ship » | Est-ce que ça bloque, c'est l'appel du gate, pas le vôtre. |
  | « L'utilisateur me fait confiance et veut que ce soit shippé demain matin » | « Prêt à ship, une décision en attente » honore cette confiance. Un tag sur une déviation non approuvée la trahit. |
  | « En relisant la spec, ce n'était en fait jamais dans le scope » | Une lecture plus étroite de la spec est elle-même une déviation. Loggez-la. |
  | « Lib différente, même sortie — pas vraiment un changement » | Le plan nomme la lib. Le plan est maintenant faux. Loggez. |
  | « Je loggerai une fois la tâche finie » | Logger rétroactivement, c'est de l'arbitrage silencieux avec de la paperasse. |
  | « Je batcherai les updates du ledger à la fin » | Les updates de fin de session sont des reconstructions. Update après CHAQUE tâche. |

  RÈGLES D'EXÉCUTION :
  1. Avant chaque tâche : vérifier le ledger, marquer la tâche `In progress`.
  2. Après chaque tâche : mettre à jour le ledger (les lignes Done lient le SHA du commit)
     et le committer : `chore(p{N}): ledger after T<x>`.
  3. Dispatcher un subagent par tâche — via superpowers:subagent-driven-development si
     installé — avec l'instruction explicite « report comprehensively, don't paraphrase ».
  4. La dernière phase est la Phase Z : lancer `/anti-drift-planning:verify {N}`. C'est le
     SEUL chemin vers le script de release et le tag `milestone-plan-3`. Elle ne peut pas
     être résumée de mémoire ; un contexte qui se remplit est une raison d'écrire un
     handoff, pas de compresser la Phase Z.

  LEÇONS DES PLANS 2 ET 3 — à appliquer dès le plan d'implémentation :
  1. **Faire figurer `npx astro check` dans les étapes de vérification de chaque tâche.**
     Au Plan 2, aucune étape ne le lançait : une régression de typecheck a traversé un
     implémenteur et deux relecteurs sans être vue.
  2. **Ne jamais empiler de commits sur une branche locale sans l'avoir intégrée**, et
     lire `git status -sb` (ahead/behind) AVANT de demander un push à l'utilisateur. Un
     `fetch` seul ne met pas la branche à jour — au Plan 2 cela a écrasé deux commits.
  3. **Établir les faits sur la source qui fait foi**, pas sur la documentation : au
     Plan 2, trois affirmations de la doc Sveltia se sont révélées fausses ou incomplètes,
     et seule la lecture du bundle épinglé a tranché.

  RED FLAGS — si l'une de ces pensées vous traverse, STOP et relire le PROTOCOLE DE
  DÉVIATION :
  - « Je vais le marquer resolved / non-blocking / to-ratify »
  - « Rien n'a été coupé, donc la Phase Z peut passer »
  - « L'utilisateur le verra dans le récap demain »
  - « Shipper ce soir est ce que l'utilisateur veut vraiment »
  - « Les tests étaient verts il y a vingt minutes, pas besoin de relancer »
  - « Je suis à court de contexte, je ferai une Phase Z légère »

  OBJECTIF DE SESSION : exécuter le Plan {N} jusqu'à la Phase Z incluse ; shipper (script de
  release) et taguer `milestone-plan-3` UNIQUEMENT si la Phase Z passe. Sur PASS,
  `/anti-drift-planning:verify {N}` vous remet automatiquement l'étape suivante (le bootstrap
  du plan suivant, ou `/new-plan`, ou — pour le dernier plan — l'audit de fin de projet
  `/anti-drift-planning:status`). Sinon : committer tout, écrire le handoff, lister les
  décisions précises que vous attendez, et noter que `/anti-drift-planning:resume {N}`
  régénère le prompt de reprise.
  Écrire les réponses destinées à l'utilisateur en {LANGUAGE}.
variables:
  - name: N
    hint: plan number
    default: "4"
  - name: topic
    hint: topic extracted from the spec filename
    default: librairies-prompts-skills
  - name: BASE_REF
    hint: the ref the execution session must branch off
    default: main
  - name: LANGUAGE
    hint: the language the user is currently conversing in
    default: français
relatedSkills: [anti-drift-planning]
---

Ce prompt-là, tu ne l'écris pas à la main : il est généré par
`/anti-drift-planning:start-session <N>`, et tu le colles en **premier message**
d'une session neuve — une session par plan. Le contexte vierge est voulu : c'est
ce qui empêche une session d'hériter des approximations de la précédente.

Le bloc de prompt de cette fiche est une instance réelle et non retouchée :
celle du Plan 4 de ce site, émise automatiquement par la phase de vérification
du Plan 3.

Qui dit instance réelle dit vraie coquille. Le texte demande de taguer
`milestone-plan-3` alors qu'il pilote le Plan 4 — et ce tag-là est déjà posé
depuis la fin du Plan 3. La spec du Plan 4, elle, vise `milestone-plan-4`. Je ne
l'ai pas corrigée dans le bloc : la contradiction a été relevée au gate de
pré-flight et tranchée là, `milestone-plan-4`, sans déplacer celui du Plan 3.
C'est le trajet qu'on attend d'une contradiction entre une spec et un prompt —
remonter au gate, plutôt que filer en silence jusqu'au tag.

## Ce qu'il porte

Trois blocs font le travail. Le **test de déviation** est binaire : trois
conditions, et si l'une est vraie, c'est une déviation. Pas de « ça dépend ».
Le **protocole** impose de logger *avant* d'exécuter, avec un seul statut
autorisé côté agent — `pending-user` — et une classification de réversibilité
qui décide si l'agent continue ou s'arrête. Et la **table des
rationalisations**, la partie la plus utile : sept phrases que les agents se
disent réellement pour contourner le protocole, chacune avec sa réfutation en
face.

Le reste est de la plomberie de session : les fichiers de contexte à lire avant
d'agir, les règles de mise à jour du ledger, et les leçons des plans précédents
qu'on ne veut pas repayer.

## Quand le coller

Au démarrage de chaque plan, et seulement là. Après le premier plan tu ne
lances plus la commande à la main : quand la phase de vérification passe, elle
émet elle-même le prompt du plan suivant. Une session interrompue en cours de
route se reprend avec `/anti-drift-planning:resume <N>`.

## Ce qu'il empêche

Sur les trois premiers plans de ce site, il a produit **27 entrées de log** : 6
au Plan 1, 12 au Plan 2, 9 au Plan 3. **Trois ont été rejetées** — trois choix
qui, sans ce prompt, seraient partis en prod sans que personne ne les voie
passer. Les trois plans se sont terminés avec **zéro entrée laissée
`pending-user`**.

Ce n'est pas de la magie de formulation. C'est juste qu'un agent à qui on
demande d'écrire une ligne de log avant de trancher trouve beaucoup moins
naturel de trancher tout seul.
