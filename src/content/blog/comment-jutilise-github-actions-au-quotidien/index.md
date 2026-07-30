---
title: Comment j'utilise GitHub Actions au quotidien
description: Mes astuces du quotidien pour rendre tes workflows GitHub Actions plus DRY et sécurisés, à partir d'un vrai flow de déploiement staging/prod.
pubDate: 2025-10-28T23:59:00.000+01:00
category: DevOps
cover: ./gha-chatgpt.png
coverAlt: Logo GitHub Actions sur fond de schéma de workflow
aiUsage: none
draft: false
---

Cet article n'a pas pour objectif de vous faire découvrir GitHub Actions.\
Je vais simplement vous partager des "trucs et astuces" que j'utilise au quotidien pour rendre mes workflows variables, DRY, sécurisés...

Il s'adresse donc à ceux qui ont déjà les bases, et pour ceux qui ne connaisse pas encore et que vous avez des besoin d'automatisation, je ne peux que vous recommander de jeter un oeil à la doc, c'est simple à prendre en main et ça permet pas mal de choses !

## Quoi pour quoi ?

Dans la plupart des projets de la boite dans laquelle je bosse, j'ai 2 fichiers de workflow: `check-pr.yaml` et `build-and-deploy.yaml`

Le besoin est simple: un repo (ou mono repo), souvent du code NodeJS, qu'il faut vérifier lorsqu'une PR est ouverte, et déployer lorsque la PR est merge.\
Les équipes utilisent un flow git simple: feature-branch -> develop -> master

La branch 'develop' contient la version beta qui est déployée sur un environnement 'staging', sur lequel les devs vont pouvoir tester leur code.\
 La branch 'master' contient la release qui est déployée sur un environnement à destination des équipes de QA et qui finira en production si elle passe toutes les étapes de validations.

On va donc prendre cet exemple, relativement simple en apparence, pour définir nos workflows, pas à pas.
