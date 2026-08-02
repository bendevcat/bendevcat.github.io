---
title: "Découper un projet multi-sessions en plans anti-drift"
description: "Comment passer d'une vision trop grosse pour une session à N plans verticaux qui livrent chacun un résultat observable — et pourquoi c'est ça qui empêche le périmètre de fondre."
format: guide
tool: Claude Code
tags: [anti-drift, méthodologie, claude-code]
relatedSkills: [anti-drift-planning]
---

Une vision de projet tient rarement dans une session. Et quand elle déborde, ce
qui se passe ensuite est toujours le même : une page à moitié faite, une
collection oubliée, un critère validé « à peu près ». Personne n'a rien coupé
volontairement — le périmètre a juste fondu, un arbitrage silencieux à la fois.

Ce site est construit comme ça, en cinq plans. Voilà comment se fait le
découpage, et surtout ce qui l'empêche de se déliter en route.

## Découper vertical, jamais en couches

La règle tient en une phrase : **chaque tranche livre un résultat observable par
l'utilisateur final**, de bout en bout. Pas « le back », puis « le front ». Pas
« les schémas », puis « les pages ».

La raison est mécanique. Si une tranche verticale est ratée, la fonctionnalité
ne marche visiblement pas — la dérive est immédiatement observable. Avec un
découpage en couches, elle s'accumule en silence entre les couches, et tu ne la
vois qu'à la fin, quand il est cher de la corriger.

Vise **3 à 5 tranches**. Chacune devient un plan.

### Le découpage réel de ce site

| Plan | Objectif utilisateur (binaire) |
|---|---|
| P1 · socle-blog-deploye | « Le blog est en ligne (github.io) et lisible, en thème dark editorial-dev » |
| P2 · cms-sveltia | « Je publie/édite les articles sans toucher au code (Sveltia CMS) » |
| P3 · vitrine-projets | « On peut parcourir mes fiches projets » |
| P4 · librairies-prompts-skills | « Mes prompts et mes skills sont parcourables et copiables » |
| P5 · recherche-et-pages | « On cherche et on découvre (recherche, tags, à-propos, transparence-IA) » |

Regarde la forme des objectifs : ce sont des phrases que je pourrais dire à
voix haute. C'est un test en soi. Si tu n'arrives pas à écrire l'objectif d'un
plan sans parler de fichiers ou de composants, ta tranche est horizontale et il
faut la redécouper.

L'ordre est strictement séquentiel — chaque plan s'appuie sur le précédent — et
chaque plan s'exécute dans **une session Claude Code neuve**. Le contexte vierge
est délibéré : il empêche d'hériter des approximations de la session d'avant.

## Des critères binaires, pas des intentions

Une spec par plan, et dans chaque spec des critères qui se mesurent : une
commande de vérification, une sortie attendue, ou une manip de démo. Les verbes
vagues sont bannis — `améliorer`, `supporter`, `gérer`, `peaufiner`,
`optimiser`. Ils sont exactement l'espace dans lequel un agent invente les
détails manquants.

Un critère réel du Plan 1 — l'exigence à gauche, sa mesure à droite :

> **R1** — Un push sur `main` déclenche le workflow GitHub Actions
> (`withastro/action`) qui build et déploie le site.
>
> **Mesure** — Le run Actions finit au vert **ET** `curl -sI https://bendevcat.github.io`
> renvoie `200` avec du HTML.

Il n'y a rien à interpréter. Soit le `curl` renvoie 200, soit la ligne reste
`Pending`.

En pratique ça donne des specs courtes : 9 critères pour le Plan 1, 7 pour le
Plan 2, 7 pour le Plan 3. Tous `Done` à la sortie — parce qu'un critère binaire
ne peut pas être « presque ».

## N'écrire qu'un seul plan d'implémentation à l'avance

Les specs des cinq plans sont écrites en amont, avant la première session
d'exécution. Les **plans d'implémentation**, non : seul celui du premier plan
est écrit à ce moment-là. Les suivants s'écrivent au début de leur propre
session, depuis la spec **et l'état réel du dépôt** après le plan précédent.

Écrire les cinq d'un coup revient à fabriquer de la surface d'invalidation :
chaque plan qui ship périme une partie de ce qui a été planifié pour les
suivants. Et un plan périmé qu'on suit quand même, c'est de la dérive avec de
la paperasse.

## Ce qui tient le découpage en place

Le découpage tout seul ne suffit pas. Trois artefacts le tiennent.

### Le ledger de périmètre

Un fichier par plan qui liste chaque exigence avec son état :
`Done` / `In progress` / `Pending` / `Deferred` / `Cut`. Mis à jour **et
committé après chaque tâche**, pas en fin de session — une mise à jour de fin de
session est une reconstruction de mémoire, pas un enregistrement.

Son intérêt réel : tu lis l'avancement sans fouiller le `git log`, et surtout tu
vois ce qui est *encore* `Pending` pendant qu'il est encore temps.

### Le log des déviations

Toute déviation par rapport à la spec ou au plan est loggée **avant** d'être
exécutée, avec un seul statut autorisé côté agent : `pending-user`. `approved` et
`rejected` sont les mots de l'utilisateur, personne d'autre ne les écrit.

Chaque entrée classe aussi sa réversibilité : `cheap` (au plus une tâche de
rework) → l'agent peut continuer pendant que la décision attend ; `expensive`
(plusieurs tâches, des données, ou quoi que ce soit de déjà publié) → il
s'arrête.

### La phase de vérification

Dernière phase de chaque plan, non contournable. C'est le seul chemin vers la
mise en ligne et le tag de milestone, et elle échoue sur **toute** entrée
laissée `pending-user`. Pas de « on ratifiera plus tard » : ratifier plus tard,
c'est précisément `pending-user`.

## Ce que ça coûte, honnêtement

Sur les trois premiers plans de ce site : **27 déviations loggées**, dont
**3 rejetées**. Ces trois-là sont le retour sur investissement du dispositif —
sans le log, elles seraient parties en prod sans discussion. Les 24 autres ont
coûté une lecture et un « ok ».

La méthode surveille aussi son propre surcoût : au-delà de trois décisions en
attente simultanément, c'est le plan qu'il faut refaire, pas plus d'approbations
à empiler.

Et le dispositif doit accepter de sortir des résultats moches. Sur le Plan 4 de
ce site, un seul skill publiable m'appartenant a été identifié, alors que la
spec en demandait deux. La réduction est loggée avant d'être exécutée, et les
deux critères concernés ne seront pas maquillés en `Done` : ils restent en
l'état, avec l'entrée qui dit pourquoi. C'est laid dans le tableau, et c'est
exactement à ça que sert le tableau.

## Quand ne pas s'en servir

Pour un correctif isolé, une question ponctuelle, ou un projet qui tient dans
une seule session concentrée : le surcoût dépasse le bénéfice. Le dispositif
est fait pour le cas où tu vas enchaîner plusieurs sessions et où chacune doit
savoir ce que les précédentes ont réellement livré — pas ce qu'elles avaient
prévu de livrer.
