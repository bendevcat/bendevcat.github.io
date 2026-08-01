---
title: "bencat_ — ce site"
description: "Le site que tu es en train de lire : blog, projets, prompts et skills, en Astro, éditable depuis un CMS git sans backend."
status: wip
startDate: 2026-07-30
stack: [Astro, Tailwind CSS, TypeScript, Sveltia CMS, GitHub Pages]
tags: [astro, tailwind, cms]
repoUrl: https://github.com/bendevcat/bendevcat.github.io
demoUrl: https://bendevcat.github.io/
featured: true
relatedPosts: [bienvenue-dans-mon-foutoir]
---

Ce site remplace mon ancien blog Hugo. Même contenu, autre socle : **Astro** en
statique, **Tailwind v4** pour le thème, et **Sveltia CMS** pour écrire sans
toucher au code.

## Ce qu'il y a sous le capot

Le contenu vit en *page bundles* — un dossier par article, avec ses images à
côté — validés par des schémas Zod. Le CMS est une page statique servie sur
`/admin` : le navigateur parle directement à l'API GitHub avec un jeton
personnel, donc **aucun backend à héberger**. Chaque enregistrement produit un
commit, et le commit déclenche le déploiement sur GitHub Pages.

## Où j'en suis

Le blog et le CMS sont en ligne. La vitrine projets — celle que tu lis — est en
cours. Restent une bibliothèque de prompts, une de skills, et la recherche.

Le site est construit plan par plan, avec une méthode anti-dérive : une spec à
critères binaires par plan, un journal de périmètre tenu à jour à chaque tâche,
et un audit de vérification obligatoire avant toute mise en ligne.
