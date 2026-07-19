# Plan 1 — Socle blog déployé (walking skeleton) — Implementation Plan

> **Exécution (anti-drift) :** ce plan s'exécute dans une **session fraîche** lancée avec le bootstrap prompt du Plan 1 (`/anti-drift-planning:start-session 1`). Chaque tâche met à jour `docs/anti-drift/handoffs/plan-1-ledger.md`. Toute déviation → `plan-1-deviations.md` (statut `pending-user`). La dernière phase est `/anti-drift-planning:verify 1` (non contournable). Les cases `- [ ]` suivent la progression ; l'exécuteur peut s'appuyer sur `superpowers:executing-plans`.
>
> **Spec :** `docs/anti-drift/specs/2026-07-19-plan-1-socle-blog-deploye.md` · **Design :** `docs/anti-drift/specs/2026-07-19-site-perso-design.md`

**Goal :** Un blog Astro déployé sur `bendevcat.github.io`, thème dark editorial-dev clair/sombre, articles migrés lisibles (TOC, code copiable, bannière IA), RSS, redéploiement automatique sur push.

**Architecture :** Astro v5 statique. Contenu en *page bundles* (`src/content/blog/<slug>/index.md` + images). Tailwind v4 via `@tailwindcss/vite`, design tokens en `@theme` + variables sémantiques qui basculent via `[data-theme]`. Zéro framework UI (JS vanilla pour le toggle et la copie). Déploiement GitHub Actions `withastro/action`.

**Tech Stack :** Astro 5, Tailwind CSS 4 (`@tailwindcss/vite`), `@astrojs/rss`, Fontsource (Space Grotesk / Inter / JetBrains Mono, auto-hébergées), `rehype-autolink-headings` + `rehype-slug`, Vitest (helpers), `astro check`.

## Global Constraints

- **Astro v5+**, sortie **statique** (`output: 'static'`, défaut). Aucun `output: 'server'`.
- **Tailwind v4** via **`@tailwindcss/vite`** — JAMAIS `@astrojs/tailwind` (déprécié).
- **Aucun framework UI** (React/Preact) dans ce plan. Interactivité = JS vanilla.
- **Repo = user-site** `bendevcat.github.io` → `base: '/'` (pas de préfixe).
- **Domaine custom hors scope** (pas de `public/CNAME` ici).
- Contenu **français**. Polices **auto-hébergées** (pas de CDN externe).
- Champs frontmatter alignés sur la spec de design : `pubDate`, `category` (enum), `aiUsage` (`none|partial|full`), `draft`, `cover`, `coverAlt`, `tags`.
- Catégories : `Actus · DevOps · Outils · Sécurité · Geekerie · Tutos · IA`.
- Tokens couleur (source de vérité, cf. design §5) :
  - **dark** `--bg #0B0E14 · --surface #141B24 · --line rgba(255,255,255,.09) · --text #E8EDF3 · --muted #8B97A6 · --acc #4ADE80 · --acc-contrast #06281A`
  - **light** `--bg #FCFCFD · --surface #FFFFFF · --line rgba(15,23,42,.10) · --text #14181F · --muted #5A6572 · --acc #047857 · --acc-solid #34D399 · --acc-dim #ECFDF5`

---

## Phase A — Scaffold & design system

### Task A1 : Initialiser le projet Astro

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `src/pages/index.astro` (temporaire)
- Note: le repo git existe déjà (bootstrap anti-drift). Ne PAS ré-init.

- [ ] **Step 1 — Scaffold minimal dans le dossier courant**

Run (dans un dossier temporaire puis recopier, car le dossier n'est pas vide) :
```bash
npm create astro@latest -- --template minimal --no-install --no-git --typescript strict ./_astro_tmp
rsync -a --exclude .git _astro_tmp/ . && rm -rf _astro_tmp
npm install
```
Expected: `package.json`, `astro.config.mjs`, `src/pages/index.astro` présents ; `node_modules/` installé (déjà gitignoré).

- [ ] **Step 2 — Vérifier le build**

Run: `npx astro build`
Expected: build **PASS**, `dist/index.html` généré.

- [ ] **Step 3 — Commit**
```bash
git add -A && git commit -m "chore(plan-1): scaffold Astro minimal"
```

### Task A2 : Tailwind v4 + tokens de thème

**Files:**
- Modify: `astro.config.mjs` (plugin Vite)
- Create: `src/styles/global.css`

**Interfaces:**
- Produces: variables CSS `--color-bg|surface|line|text|muted|acc|acc-*` (utilitaires `bg-bg`, `text-text`, etc.), polices `--font-display|sans|mono`.

- [ ] **Step 1 — Installer**
```bash
npm install tailwindcss @tailwindcss/vite
npm install @fontsource-variable/space-grotesk @fontsource-variable/inter @fontsource-variable/jetbrains-mono
```

- [ ] **Step 2 — Config Vite** (`astro.config.mjs`)
```js
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://bendevcat.github.io',
  vite: { plugins: [tailwindcss()] },
});
```

- [ ] **Step 3 — `src/styles/global.css`** (source de vérité du design system)
```css
@import "tailwindcss";
@import "@fontsource-variable/space-grotesk";
@import "@fontsource-variable/inter";
@import "@fontsource-variable/jetbrains-mono";

/* bascule de thème pilotée par [data-theme] sur <html> */
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

@theme {
  --font-display: "Space Grotesk Variable", ui-sans-serif, system-ui, sans-serif;
  --font-sans:    "Inter Variable", ui-sans-serif, system-ui, sans-serif;
  --font-mono:    "JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, monospace;

  /* palette LIGHT (défaut) — surchargée en dark ci-dessous */
  --color-bg: #FCFCFD;
  --color-surface: #FFFFFF;
  --color-line: rgb(15 23 42 / 0.10);
  --color-text: #14181F;
  --color-muted: #5A6572;
  --color-acc: #047857;          /* vert texte AA sur clair */
  --color-acc-solid: #34D399;    /* aplats/bouton */
  --color-acc-contrast: #04231A;
}

/* DARK : surcharge des mêmes custom properties */
:root[data-theme="dark"] {
  --color-bg: #0B0E14;
  --color-surface: #141B24;
  --color-line: rgb(255 255 255 / 0.09);
  --color-text: #E8EDF3;
  --color-muted: #8B97A6;
  --color-acc: #4ADE80;
  --color-acc-solid: #4ADE80;
  --color-acc-contrast: #06281A;
}

html { font-family: var(--font-sans); background: var(--color-bg); color: var(--color-text); }
```

- [ ] **Step 4 — Vérifier** : dans `src/pages/index.astro`, mettre `<main class="bg-bg text-text font-display p-8">Test tokens</main>`, importer `../styles/global.css`.
Run: `npx astro build && npx astro dev` → la page utilise le fond/texte des tokens et Space Grotesk.

- [ ] **Step 5 — Commit**
```bash
git add -A && git commit -m "feat(plan-1): tailwind v4 + design tokens + fonts"
```

### Task A3 : BaseLayout + toggle de thème sans flash (R5, R8)

**Files:**
- Create: `src/layouts/BaseLayout.astro`, `src/components/Header.astro`, `src/components/ThemeToggle.astro`
- Create: `src/scripts/theme.ts` (logique de bascule)

**Interfaces:**
- Produces: `BaseLayout` (props `title`, `description`), header avec nav (Blog/Projets/Prompts/Skills/À propos — liens non actifs OK au Plan 1) + toggle.

- [ ] **Step 1 — Script anti-flash inline** (dans `BaseLayout.astro`, en tout premier dans `<head>`, avant le CSS) :
```html
<script is:inline>
  (() => {
    const stored = localStorage.getItem('theme');
    const theme = stored ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
  })();
</script>
```

- [ ] **Step 2 — `ThemeToggle.astro`** (bouton + JS vanilla) :
```astro
<button id="theme-toggle" class="grid size-9 place-items-center rounded-lg border border-line text-muted"
        aria-label="Basculer le thème">◐</button>
<script>
  const btn = document.getElementById('theme-toggle');
  btn?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
  });
</script>
```

- [ ] **Step 3 — `BaseLayout.astro`** : `<html lang="fr">`, `<head>` (script inline + `import '../styles/global.css'` + `<title>`/meta), `<body>` avec `<Header/>` + `<slot/>`. `Header.astro` : logo `bencat_` (mono, `_` en `text-acc`), nav, `<ThemeToggle/>`.

- [ ] **Step 4 — Vérifier** (manuel) : `astro dev` → cliquer le toggle bascule le thème ; **reload conserve** ; en navigation privée sans `localStorage`, le thème suit `prefers-color-scheme` **sans flash** au chargement.

- [ ] **Step 5 — Commit**
```bash
git add -A && git commit -m "feat(plan-1): base layout + theme toggle (no-flash)"
```

---

## Phase B — Collection blog & migration (R6)

### Task B1 : Schéma de la collection `blog`

**Files:**
- Create: `src/content.config.ts`
- Create: `src/lib/posts.ts` (+ `src/lib/posts.test.ts`)

**Interfaces:**
- Produces: collection `blog` ; `getPublishedPosts()` → `CollectionEntry<'blog'>[]` triés `pubDate` desc, `draft:false`.

- [ ] **Step 1 — `src/content.config.ts`**
```ts
import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

export const CATEGORIES = ['Actus','DevOps','Outils','Sécurité','Geekerie','Tutos','IA'] as const;

const blog = defineCollection({
  loader: glob({ pattern: '**/index.{md,mdx}', base: './src/content/blog' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    draft: z.boolean().default(false),
    category: z.enum(CATEGORIES),
    tags: z.array(z.string()).default([]),
    cover: image().optional(),
    coverAlt: z.string().optional(),
    aiUsage: z.enum(['none','partial','full']).optional(),
    featured: z.boolean().default(false),
    relatedProjects: z.array(reference('projects')).optional(), // collection projects arrive au Plan 3
  }),
});

export const collections = { blog };
```
> Note : `relatedProjects` référence `projects` (pas encore définie). Si `astro check` échoue sur la référence manquante, **retirer temporairement `relatedProjects`** et le noter comme déviation `pending-user` (réintroduit au Plan 3). Vérifier au Step 3.

- [ ] **Step 2 — Écrire le test** (`src/lib/posts.test.ts`)
```ts
import { describe, it, expect } from 'vitest';
import { sortAndFilter } from './posts';

describe('sortAndFilter', () => {
  it('exclut les drafts et trie par pubDate desc', () => {
    const input = [
      { data: { draft: false, pubDate: new Date('2024-01-01') } },
      { data: { draft: true,  pubDate: new Date('2025-01-01') } },
      { data: { draft: false, pubDate: new Date('2026-01-01') } },
    ] as any[];
    const out = sortAndFilter(input);
    expect(out).toHaveLength(2);
    expect(out[0].data.pubDate.getFullYear()).toBe(2026);
  });
});
```
Run: `npm install -D vitest` puis `npx vitest run` → **FAIL** (`sortAndFilter` absent).

- [ ] **Step 3 — `src/lib/posts.ts`**
```ts
import { getCollection, type CollectionEntry } from 'astro:content';

export function sortAndFilter(posts: CollectionEntry<'blog'>[]) {
  return posts
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}
export async function getPublishedPosts() {
  return sortAndFilter(await getCollection('blog'));
}
```
Run: `npx vitest run` → **PASS**. Puis `npx astro check` → schéma valide (voir note Step 1).

- [ ] **Step 4 — Commit**
```bash
git add -A && git commit -m "feat(plan-1): blog collection schema + posts helper (tested)"
```

### Task B2 : Migrer les articles publiés

**Files:**
- Create: `src/content/blog/<slug>/index.md` (× N articles publiés) + images co-localisées
- Source: `../bencat-website/content/posts/*.md` (exclure `content/trash/` et `draft:true`)

- [ ] **Step 1 — Inventaire** : lister les articles publiés de `../bencat-website/content/posts/`. Pour chacun, créer `src/content/blog/<slug-conservé>/index.md`.

- [ ] **Step 2 — Mapping frontmatter** (par article) :
  - `date` → `pubDate` · `categories[0]` → `category` (mapper vers l'enum ; ex. `Securite`→`Sécurité`) · `image` → `cover` (co-localiser le fichier image dans le dossier de l'article, chemin relatif `./cover.png`) · `ai_usage` → `aiUsage` · `tags` → `tags` · `draft` → `draft`.
  - Nettoyer : frontmatter TOML `+++` → YAML `---` ; retirer `<!--more-->` ; retirer `author` (implicite).
  - Exemple de cible :
    ```md
    ---
    title: "Docker: Gestion du PID 1 avec Tini"
    description: "Ou comment remettre de l'ordre dans ton conteneur !"
    pubDate: 2022-03-31
    category: "DevOps"
    tags: ["docker"]
    cover: "./cover.png"
    coverAlt: "Illustration Docker"
    aiUsage: "none"
    ---
    # ... corps ...
    ```

- [ ] **Step 3 — Vérifier** :
Run: `npx astro build`
Expected: **PASS** sans erreur de schéma ; toutes les images résolues.
Run (contrôle du compte) : comparer `getCollection('blog')` (publiés) au nombre de fichiers sources publiés → **égalité** (R6).

- [ ] **Step 4 — Commit**
```bash
git add -A && git commit -m "content(plan-1): migrate published posts from Hugo site"
```

---

## Phase C — Pages & rendu

### Task C1 : Carte d'article + Home (R2)

**Files:**
- Create: `src/components/ArticleCard.astro`, `src/components/Hero.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `getPublishedPosts()`. Produces: `ArticleCard` (prop `post: CollectionEntry<'blog'>`).

- [ ] **Step 1 — `ArticleCard.astro`** : `<a href={`/blog/${post.id}`}>` ; carte `bg-surface border border-line rounded-xl p-4` ; tag catégorie en `font-mono text-xs text-acc bg-acc-dim` ; titre `font-display` ; méta `font-mono text-xs text-muted` (date FR + temps de lecture) ; `<Image>` (`astro:assets`) si `cover`. Puce `aiUsage` non bloquante.

- [ ] **Step 2 — `index.astro`** : `BaseLayout` → `<Hero/>` (kicker mono `~/ whoami`, titre `font-display`, sous-titre, 2 CTA) + section « derniers articles » (`font-mono` label `// derniers articles`) rendant une grille (`grid gap-4 sm:grid-cols-2 lg:grid-cols-3`) des `getPublishedPosts()` (featured d'abord si présent).

- [ ] **Step 3 — Vérifier** : `astro dev` → home rend le hero + ≥3 cartes réelles.

- [ ] **Step 4 — Commit**
```bash
git add -A && git commit -m "feat(plan-1): home (hero + recent posts grid)"
```

### Task C2 : Index /blog (R4)

**Files:** Create `src/pages/blog/index.astro`

- [ ] **Step 1** : page listant **tous** `getPublishedPosts()` en grille d'`ArticleCard`, tri déjà géré par le helper. Titre de page `font-display`.
- [ ] **Step 2 — Vérifier** : `/blog` affiche autant de cartes que d'articles publiés ; aucun draft (créer un `draft:true` de test → absent → le supprimer).
- [ ] **Step 3 — Commit** : `git commit -am "feat(plan-1): /blog index"`

### Task C3 : Page article — TOC + code copiable + bannière IA (R3)

**Files:**
- Create: `src/pages/blog/[...slug].astro`, `src/components/TableOfContents.astro`, `src/components/AiBanner.astro`
- Create: `src/scripts/copy-code.ts`
- Modify: `astro.config.mjs` (rehype slug + autolink), `src/styles/global.css` (styles `.prose`, code)

**Interfaces:**
- Consumes: `render(entry)` → `{ Content, headings }`.

- [ ] **Step 1 — rehype** :
```bash
npm install rehype-slug rehype-autolink-headings
```
```js
// astro.config.mjs → dans defineConfig
markdown: {
  shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } },
  rehypePlugins: [ 'rehype-slug', ['rehype-autolink-headings', { behavior: 'wrap' }] ],
},
```

- [ ] **Step 2 — `[...slug].astro`** :
```astro
---
import { getCollection, render } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import TableOfContents from '../../components/TableOfContents.astro';
import AiBanner from '../../components/AiBanner.astro';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}
const { post } = Astro.props;
const { Content, headings } = await render(post);
---
<BaseLayout title={post.data.title} description={post.data.description}>
  <article class="mx-auto max-w-3xl px-4 py-10">
    <h1 class="font-display text-4xl">{post.data.title}</h1>
    {post.data.aiUsage && <AiBanner usage={post.data.aiUsage} />}
    <TableOfContents headings={headings.filter(h => h.depth === 2 || h.depth === 3)} />
    <div class="prose"><Content /></div>
  </article>
</BaseLayout>
```

- [ ] **Step 3 — `AiBanner.astro`** : mappe `usage` → `{none:{label:'✍️ 100% humain',cls:'...ardoise'}, partial:{label:'🤝 co-créé avec IA',cls:'...ambre'}, full:{label:'🤖 IA relue',cls:'...bleu'}}`. Rendu = encart coloré (échelle couleur design §6, ardoise/ambre/bleu).

- [ ] **Step 4 — `copy-code.ts`** (bouton copier sur chaque `<pre>`) :
```ts
document.querySelectorAll('article pre').forEach((pre) => {
  const btn = document.createElement('button');
  btn.textContent = 'Copier'; btn.className = 'copy-btn';
  btn.addEventListener('click', async () => {
    await navigator.clipboard.writeText(pre.innerText);
    btn.textContent = 'Copié !'; setTimeout(() => (btn.textContent = 'Copier'), 1500);
  });
  pre.appendChild(btn);
});
```
Importer ce script dans `[...slug].astro` (`<script>`), styler `.copy-btn` (position absolute, `font-mono`).

- [ ] **Step 5 — Vérifier** (manuel) : ouvrir un article migré → TOC liste les H2/H3 ; « Copier » met le code au presse-papier + feedback ; bannière visible si `aiUsage` défini, absente sinon.

- [ ] **Step 6 — Commit** : `git commit -am "feat(plan-1): article page (TOC + copy + AI banner)"`

### Task C4 : Flux RSS (R7)

**Files:** Create `src/pages/rss.xml.js`

- [ ] **Step 1** :
```bash
npm install @astrojs/rss
```
```js
import rss from '@astrojs/rss';
import { getPublishedPosts } from '../lib/posts';

export async function GET(context) {
  const posts = await getPublishedPosts();
  return rss({
    title: 'benCat — blog',
    description: 'DevOps, IA & geekeries',
    site: context.site,
    items: posts.map((p) => ({
      title: p.data.title, description: p.data.description,
      pubDate: p.data.pubDate, link: `/blog/${p.id}/`,
    })),
  });
}
```
- [ ] **Step 2 — Vérifier** : `astro build` → `dist/rss.xml` présent avec 1 `<item>` par article publié.
- [ ] **Step 3 — Commit** : `git commit -am "feat(plan-1): RSS feed"`

### Task C5 : Passe responsive 375px (R9)

- [ ] **Step 1** : vérifier home + article à 375px (DevTools) → **aucun** scroll horizontal, grille en 1 colonne, nav utilisable (menu compact si besoin, sans framework). Corriger les débordements (`max-w-full` sur images/pre, `overflow-x-auto` sur les blocs larges).
- [ ] **Step 2 — Commit** : `git commit -am "fix(plan-1): responsive 375px"`

---

## Phase D — Déploiement (R1)

### Task D1 : GitHub Actions + Pages

**Files:** Create `.github/workflows/deploy.yml`

- [ ] **Step 1 — Workflow** :
```yaml
name: Deploy to GitHub Pages
on:
  push: { branches: [main] }
  workflow_dispatch:
permissions: { contents: read, pages: write, id-token: write }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: withastro/action@v3
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: '${{ steps.deployment.outputs.page_url }}' }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```
> `site: 'https://bendevcat.github.io'` déjà dans `astro.config.mjs` ; pas de `base` (user-site).

- [ ] **Step 2 — Créer le repo GitHub `bendevcat.github.io`** (user-site, compte bendevcat), `git remote add origin`, push `main`. Dans **Settings → Pages → Source = GitHub Actions**.
> Actions manuelles côté GitHub (création repo, réglage Pages) : à faire par Benoît — les noter dans le ledger.

- [ ] **Step 3 — Vérifier (R1)** : le run Actions finit **vert** ; `curl -sI https://bendevcat.github.io` → `200` ; `curl -s https://bendevcat.github.io/rss.xml` → RSS.

- [ ] **Step 4 — Commit** : `git commit -am "ci(plan-1): github pages deploy workflow"`

---

## Phase Z — Verification

### Task Z1 : Audit anti-drift

- [ ] **Step 1** : Lancer `/anti-drift-planning:verify 1` — audit canonique (couverture des 9 critères R1–R9, walkthrough user-story, `vitest run` + `astro build` + `astro check`, smoke visuel, revue des déviations `pending-user`). **Non contournable.**
- [ ] **Step 2** : Sur PASS → tag `milestone-plan-1` (= `v0.1.0`) ; le verify émet automatiquement l'étape suivante (bootstrap du Plan 2).

---

## Self-Review (writing-plans)

**1. Spec coverage :** R1→D1 · R2→C1 · R3→C3 · R4→C2 · R5→A3 · R6→B1/B2 · R7→C4 · R8→A2/A3 · R9→C5. ✅ Tous les critères ont ≥1 tâche.

**2. Placeholder scan :** aucun « TBD/TODO/handle edge cases ». Le code porteur (config, tokens, schéma, toggle, article, RSS, workflow) est fourni ; les composants visuels ont structure + tokens (affinage visuel = exécution, cf. design « figé vs ouvert »).

**3. Type consistency :** `getPublishedPosts()`/`sortAndFilter()` (B1) réutilisés en C1/C2/C4 ; `post.id` cohérent (routes + RSS + cartes) ; `aiUsage` enum identique schéma↔AiBanner ; tokens `--color-*` identiques global.css↔utilitaires.

**Risque connu tracé :** `relatedProjects` référence la collection `projects` (Plan 3). Si `astro check` bloque, le retirer temporairement et logguer une déviation `pending-user` (réintroduit au Plan 3). Noté en B1.
