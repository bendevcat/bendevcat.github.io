---
title: Démo des blocs de l'éditeur
description: Page de test des quatre blocs de l'éditeur — encadrés, terminal, carte et vidéo — rendus par le pipeline du site.
pubDate: 2026-09-25T10:00:00+02:00
category: Outils
tags:
  - astro
aiUsage: full
draft: false
featured: false
---
Cette page n'existe que dans une construction jetable : elle montre chaque bloc rendu comme sur le site.

:::note

Encadré de note : le mot témoin est **zinnianote**. Un [lien](/blog/) et du `code en ligne`.

:::

:::astuce

Encadré d'astuce, sur deux paragraphes : le mot témoin est zinniaastuce.

- une liste
- à deux puces

:::

:::attention

Encadré d'attention : le mot témoin est zinniaattention.

:::

:::danger

Encadré de danger : le mot témoin est zinniadanger.

:::

:::terminal[deploy.sh]

```bash
npm ci
npm run build
npx pagefind --site dist
```

:::

:::carte{ref="projects/gha-svu"}
:::

:::video[Big Buck Bunny]{youtube="aqz-KE-bpKQ"}
:::

:::video[Une session asciinema]{asciinema="335480"}
:::

Fin de la démo.
