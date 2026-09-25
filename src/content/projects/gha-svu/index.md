---
title: gha-svu — le versionnage sémantique dans GitHub Actions
description: Une action composite qui calcule la prochaine version sémantique avec SVU v3, et pose le tag si tu lui demandes.
status: actif
startDate: 2025-05-05
stack:
  - GitHub Actions
  - Bash
  - Go
  - SVU
stackRoles:
  - name: GitHub Actions
    role: action composite
  - name: SVU
    role: prochain numéro de version
tags:
  - github-actions
  - devops
  - versioning
repoUrl: https://github.com/bencatlab/gha-svu
snippetFile: .github/workflows/check-pr.yml
snippet: |-
  name: Check PR
  on:
    pull_request:
      types: [opened, synchronize, reopened]
      branches:
        - main

  jobs:
    check-pr:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
          with:
            fetch-depth: 0

        - name: Bump version
          id: semver
          uses: ./
          with:
            always: true
            push-tag: false
            verbose: true

        - name: Outputs
          run: |
            echo "changed: ${{ steps.semver.outputs.changed }}"
            echo "current: ${{ steps.semver.outputs.current }}"
            echo "next: ${{ steps.semver.outputs.next }}"
            release=$(echo "${{ steps.semver.outputs.next }}" | cut -d. -f1)
            echo "release: $release"
featured: false
relatedPosts:
  - comment-jutilise-github-actions-au-quotidien
---

Décider du prochain numéro de version à la main, c'est le genre de tâche qu'on
finit toujours par bâcler. [SVU](https://github.com/caarlos0/svu) le fait très
bien à partir des commits — encore faut-il l'installer et lui passer les bons
arguments dans chaque workflow. `gha-svu` emballe tout ça dans une
**action composite** : une étape, et tu as ta version.

## Ce qu'elle fait

Elle installe SVU (v3 minimum), calcule la version, et expose trois sorties :
`current`, `next`, et `changed` — un booléen qui te dit si les commits ont
effectivement provoqué un incrément. Les six sous-commandes de SVU sont
disponibles : `current`, `next`, `major`, `minor`, `patch` et `prerelease`.

Douze entrées couvrent le reste : identifiant de préversion, métadonnées de
build, préfixe et motif de tag, mode de tag (`all`, `light`, `heavy`),
restriction aux commits touchant certains dossiers, incrément forcé du patch
même sans commit qualifiant, et épinglage d'une version précise de SVU plutôt
que la dernière.

## Deux détails qui évitent des surprises

Elle **refuse de démarrer** si tu lui demandes une version de SVU antérieure à
v3, avec un message d'erreur explicite plutôt qu'un comportement inattendu plus
loin dans le workflow.

Et elle ne passe `--always` et `--v0` qu'à la sous-commande `next` : les autres
les rejettent comme des drapeaux inconnus. C'est le genre de détail qu'on
découvre en production, une fois.

## Où elle en est

Trois versions publiées (`v0.0.1` à `v0.0.3`), deux workflows d'intégration —
un sur les pull requests, un pour la publication. Pas encore sur la Marketplace
GitHub : elle s'utilise en référençant directement le dépôt.
