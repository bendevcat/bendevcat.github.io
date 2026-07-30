# Plan 3 — Vitrine projets — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [`docs/anti-drift/specs/2026-07-19-plan-3-vitrine-projets.md`](../specs/2026-07-19-plan-3-vitrine-projets.md)
**Ledger:** [`docs/anti-drift/handoffs/plan-3-ledger.md`](../handoffs/plan-3-ledger.md)
**Deviations:** [`docs/anti-drift/handoffs/plan-3-deviations.md`](../handoffs/plan-3-deviations.md)
**Branch:** `plan-3-vitrine-projets` (off `main` @ Plan 2 vérifié, `9793f6b`)
**Date:** 2026-07-31

**Goal:** Rendre les réalisations de Benoît parcourables : une collection `projects`, une grille `/projets` filtrable par statut et par techno sans framework, une fiche `/projets/<slug>` avec corps, liens repo/démo et articles liés, la relation `blog ↔ projects` résolue **dans les deux sens**, et l'édition des projets depuis le CMS.

**Architecture:** La collection `projects` reprend exactement le pattern du Plan 1 pour `blog` — loader `glob('**/index.{md,mdx}')` sur des *page bundles* (`src/content/projects/<slug>/index.md` + images co-localisées), schéma Zod, `reference()` pour les liens typés. Les pages sont statiques ; le filtre est un **enhancement JS vanilla** qui montre/masque des cartes déjà rendues côté serveur (aucun îlot, aucune donnée dupliquée en JSON). Le prédicat de filtrage vit dans un module pur, sans import `astro:content`, partagé entre le script navigateur et les tests unitaires. Le CMS gagne une seconde collection dans le même `config.yml`, avec la même stratégie média *entry-relative* que `blog`.

**Tech Stack:** Astro 7.1.1 (Content Layer, `glob()`, `reference()`, `getEntries()`, `<Image>`) · Tailwind v4 (tokens `--color-*` existants, aucun nouveau token) · TypeScript vanilla pour le filtre (`src/scripts/`) · vitest 4 (fonctions pures + config CMS) · Sveltia CMS `0.175.1` (version épinglée, inchangée).

---

## Global Constraints

Valeurs exactes reprises des specs ; elles s'appliquent implicitement à **toutes** les tâches.

- **Aucun framework, aucun îlot** (spec P3 §6.1, spec de design §2) : le filtre est du JS vanilla progressif. Interdiction d'installer React/Preact/Svelte/Alpine ou toute lib de filtrage.
- **Aucune nouvelle dépendance npm** — ni `dependencies`, ni `devDependencies`. Toute installation est une déviation.
- **Réutiliser le design system existant** (spec P3 §6.2) : tokens `--color-{bg,surface,line,text,muted,acc,acc-dim,…}` de `src/styles/global.css` et les 3 polices `--font-{display,sans,mono}`. **Aucun nouveau token couleur.** La carte projet est une **variante** de `ArticleCard.astro`, pas un nouveau design system.
- **URLs en français** (spec de design §4) : `/projets` et `/projets/<slug>`, alors que le dossier de contenu reste `src/content/projects` et la collection s'appelle `projects`.
- **Schéma `projects` = spec de design §3.2, verbatim** (voir T-A1). Ni champ en plus, ni champ en moins. En particulier : **pas de champ `draft`** pour les projets (la spec n'en prévoit pas — toute fiche est publiée).
- **Le schéma Zod est la source de vérité** ; le CMS s'y conforme (précédent Plan 2). Toute divergence doit faire échouer `src/lib/cms-config.test.ts`.
- **Version CDN Sveltia épinglée** : `https://unpkg.com/@sveltia/cms@0.175.1/dist/sveltia-cms.js`. Ce plan **ne met pas à jour** le CMS.
- **Aucune modification du contenu blog existant**, sauf l'ajout de `relatedProjects` sur les articles concernés (T-A2), qui est explicitement exigé par R5.
- **Responsive 375px** (R7) : aucune tâche livrant du gabarit n'est terminée sans un contrôle de non-débordement horizontal à 375px.
- **`npx astro check` fait partie de la vérification de CHAQUE tâche** (leçon du Plan 2 : une régression de typecheck a traversé un implémenteur et deux relecteurs parce qu'aucune étape ne le lançait).
- **Node ≥ 22.12**, commandes via `npm run …` / `npx astro …`.
- **Hors périmètre, à ne toucher sous aucun prétexte** : `src/pages/index.astro` (la home et ses teasers satellites), `/prompts`, `/skills`, `/tags`, Pagefind, `astro.config.mjs`, `.github/workflows/deploy.yml`, `package.json`.

---

## File Structure

| Fichier | Statut | Responsabilité |
|---|---|---|
| `src/content.config.ts` | **Modifié** (T-A1) | Ajoute la collection `projects` + export `PROJECT_STATUSES`. Source de vérité du schéma. |
| `src/lib/projects.ts` | **Créé** (T-A1) | Accès collection + fonctions **pures** d'ordre et d'agrégation (`sortProjects`, `collectStacks`). Importe `astro:content` → jamais chargé par le navigateur. |
| `src/lib/projects.test.ts` | **Créé** (T-A1) | Tests unitaires des fonctions pures d'ordre/agrégation. |
| `src/lib/projectFilters.ts` | **Créé** (T-B2) | Prédicat de filtrage **pur**, sans aucun import `astro:content` — partagé par le script navigateur et les tests. C'est la raison d'être du fichier séparé. |
| `src/lib/projectFilters.test.ts` | **Créé** (T-B2) | Tests unitaires du prédicat (matrice statut × stack). |
| `src/lib/projectStatus.ts` | **Créé** (T-B1) | Libellé + classes de la puce de statut, source unique partagée carte/fiche (même rôle que `src/lib/aiUsage.ts`). |
| `src/content/projects/<slug>/index.md` | **Créés** (T-A2) | ≥ 2 fiches **réelles** (page bundles). |
| `src/components/ProjectCard.astro` | **Créé** (T-B1) | Carte projet — variante de `ArticleCard.astro`. Porte les `data-*` que le filtre lit. |
| `src/pages/projets/index.astro` | **Créé** (T-B1, complété T-B2) | Grille + barre de filtres + état vide. |
| `src/pages/projets/[...slug].astro` | **Créé** (T-B3) | Fiche projet : corps, repo/démo, stack, articles liés. |
| `src/scripts/project-filters.ts` | **Créé** (T-B2) | Enhancement navigateur : révèle la barre, montre/masque les cartes. |
| `src/styles/global.css` | **Modifié** (T-B2) | Une règle : masquage effectif via `[hidden]` malgré les utilitaires Tailwind. |
| `src/pages/blog/[...slug].astro` | **Modifié** (T-B4) | Sens `article → projets` de R5. |
| `src/components/Header.astro` | **Modifié** (T-B4) | Active le lien de nav « Projets ». **Ajout hors lettre de la spec** — voir §Additions. |
| `public/admin/config.yml` | **Modifié** (T-C1) | Collection `projects` + `relatedProjects` sur `blog`. |
| `src/lib/cms-config.test.ts` | **Modifié** (T-C1) | Étend le garde-fou anti-drift à la 2ᵉ collection. |
| `src/lib/posts.ts` | **Lu, non modifié** | `sortAndFilter` réutilisé pour écarter les articles `draft` des listes de liens. |
| `src/components/ArticleCard.astro` | **Lu, non modifié** | Modèle visuel de la carte projet. |

---

## Requirement → Task map

| R | Critère | Tâche(s) |
|---|---|---|
| R1 | Collection `projects` + schéma Zod (page bundles) | T-A1 (schéma + tests) · T-A2 (≥ 2 fiches réelles) |
| R2 | `/projets` rend une grille de cartes (titre, desc, statut, stack) | T-B1 |
| R3 | Filtre par statut et par stack | T-B2 |
| R4 | `/projets/<slug>` rend la fiche (corps + repo + démo) | T-B3 |
| R5 | Relation bidirectionnelle `blog ↔ projects` résolue | T-A2 (données) · T-B3 (projet → articles) · T-B4 (article → projets) |
| R6 | Projets éditables via le CMS | T-C1 (config + tests) · T-C2 (création réelle — geste utilisateur) |
| R7 | Cartes/fiches dark editorial-dev, responsive 375px | T-B1 · T-B2 · T-B3 (contrôle 375px dans chaque tâche) |

---

## Additions au-delà de la lettre de la spec — à valider au gate de pré-flight

Ces deux points ne sont exigés par **aucun** critère R. Ils sont listés ici pour être **approuvés ou coupés explicitement** par l'utilisateur avant T-A1. S'ils sont coupés, les étapes correspondantes disparaissent du plan et rien d'autre ne bouge.

1. **Activation du lien de nav « Projets »** (T-B4). `src/components/Header.astro:11` rend aujourd'hui « Projets » **non cliquable**, avec le commentaire « les autres piliers arrivent aux Plans 3-4 ». Sans cette activation, `/projets` existe mais n'est atteignable qu'en tapant l'URL.
2. **Mapping de `relatedProjects` dans la collection `blog` du CMS** (T-C1). Le Plan 2 avait **explicitement différé** ce champ (ledger P2, R3 : « `relatedProjects` non mappé — omission approuvée, collection `projects` = Plan 3 »). R6 ne parle que des projets ; sans cet ajout, le sens `article → projets` de R5 resterait éditable uniquement à la main dans le fichier.

---

## Décisions d'implémentation tranchées par ce plan

La spec est muette sur ces points ; le plan les fixe pour qu'ils soient ratifiés au gate plutôt que décidés en silence pendant l'exécution.

- **Ordre de la grille** (T-A1) : `featured` d'abord, puis `startDate` décroissante (fiche sans date en dernier), puis titre A→Z. Déterministe et testé.
- **Forme du filtre** (T-B2) : boutons pour le statut (`Tous` + les 3 valeurs), `<select>` pour la stack (`Toutes les technos` + union triée des valeurs déclarées). Les deux se combinent en **ET**.
- **Progressivité réelle** (T-B2) : la barre de filtres est rendue avec l'attribut `hidden` et n'est révélée que par le script. Sans JS, aucun contrôle mort n'est affiché — toutes les cartes restent visibles.
- **État vide** (T-B2) : si une combinaison ne laisse aucune carte, un message le dit au lieu d'afficher une grille vide.
- **Articles `draft`** (T-B3) : un article lié en `draft: true` n'a pas de route publique (`src/lib/posts.ts`) ; il est **écarté** des listes de liens pour ne pas produire de lien mort.

---

## Phase A — Collection & données (R1, R5)

### Task A1: Collection `projects` — schéma Zod, helpers, tests

**Files:**
- Modify: `src/content.config.ts`
- Create: `src/lib/projects.ts`
- Create: `src/lib/projects.test.ts`

**Interfaces:**
- Consumes: `astro:content` (`defineCollection`, `reference`, `z`), `astro/loaders` (`glob`) — déjà importés dans `src/content.config.ts`.
- Produces:
  - `export const PROJECT_STATUSES = ['actif', 'wip', 'archivé'] as const` (dans `src/content.config.ts`, à côté de `CATEGORIES`)
  - `src/lib/projects.ts` : `type ProjectEntry = CollectionEntry<'projects'>`, `sortProjects(projects: ProjectEntry[]): ProjectEntry[]`, `collectStacks(projects: ProjectEntry[]): string[]`, `getSortedProjects(): Promise<ProjectEntry[]>`.
  - Ces noms sont utilisés tels quels par T-B1, T-B3 et T-B4.

**Contexte pour l'implémenteur :** le schéma ci-dessous est la transcription **verbatim** de la spec de design §3.2 — ne rien ajouter (notamment pas de `draft`), ne rien retirer. `src/content.config.ts:20` déclare déjà `relatedProjects: z.array(reference('projects')).optional()` côté `blog` : cette tâche fait exister la collection cible, ce qui rend la référence résoluble. Une collection vide est valide pour Astro ; le contenu arrive en T-A2.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/lib/projects.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { sortProjects, collectStacks } from './projects';

/** Fabrique un faux minimal — seules les clés lues par les fonctions testées. */
function project(data: Partial<Record<string, any>>) {
  return { data: { featured: false, title: '', stack: [], ...data } } as any;
}

describe('sortProjects', () => {
  it('remonte les projets featured avant les autres', () => {
    const out = sortProjects([
      project({ title: 'B', startDate: new Date('2020-01-01') }),
      project({ title: 'A', featured: true, startDate: new Date('2010-01-01') }),
    ]);
    expect(out.map((p) => p.data.title)).toEqual(['A', 'B']);
  });

  it('trie par startDate décroissante à featured égal', () => {
    const out = sortProjects([
      project({ title: 'vieux', startDate: new Date('2019-01-01') }),
      project({ title: 'récent', startDate: new Date('2026-01-01') }),
    ]);
    expect(out.map((p) => p.data.title)).toEqual(['récent', 'vieux']);
  });

  it('place les projets sans startDate en dernier', () => {
    const out = sortProjects([
      project({ title: 'sans date' }),
      project({ title: 'daté', startDate: new Date('2019-01-01') }),
    ]);
    expect(out.map((p) => p.data.title)).toEqual(['daté', 'sans date']);
  });

  it('départage par titre A→Z quand featured et startDate sont égaux', () => {
    const out = sortProjects([
      project({ title: 'Zebra' }),
      project({ title: 'alpha' }),
    ]);
    expect(out.map((p) => p.data.title)).toEqual(['alpha', 'Zebra']);
  });

  it('ne mute pas le tableau reçu', () => {
    const input = [project({ title: 'B' }), project({ title: 'A' })];
    sortProjects(input);
    expect(input.map((p) => p.data.title)).toEqual(['B', 'A']);
  });
});

describe('collectStacks', () => {
  it('déduplique et trie les technos de tous les projets', () => {
    const out = collectStacks([
      project({ stack: ['Astro', 'TypeScript'] }),
      project({ stack: ['TypeScript', 'Tailwind'] }),
    ]);
    expect(out).toEqual(['Astro', 'Tailwind', 'TypeScript']);
  });

  it('renvoie un tableau vide quand aucun projet ne déclare de stack', () => {
    expect(collectStacks([project({}), project({ stack: [] })])).toEqual([]);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run src/lib/projects.test.ts
```

Attendu : **FAIL** — `Failed to resolve import "./projects"` (le module n'existe pas encore).

- [ ] **Step 3: Ajouter la collection au schéma**

Dans `src/content.config.ts`, ajouter l'export des statuts sous `CATEGORIES` :

```ts
export const PROJECT_STATUSES = ['actif', 'wip', 'archivé'] as const;
```

puis, entre la définition de `blog` et l'export `collections`, ajouter :

```ts
// Schéma repris verbatim de la spec de design §3.2. Page bundles comme `blog` :
// `src/content/projects/<slug>/index.md` + images co-localisées, pour que
// `image()` optimise les couvertures. Pas de champ `draft` : la spec n'en
// prévoit pas pour les projets.
const projects = defineCollection({
  loader: glob({ pattern: '**/index.{md,mdx}', base: './src/content/projects' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    status: z.enum(PROJECT_STATUSES).default('actif'),
    startDate: z.coerce.date().optional(),
    stack: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    cover: image().optional(),
    coverAlt: z.string().optional(),
    repoUrl: z.string().url().optional(),
    demoUrl: z.string().url().optional(),
    featured: z.boolean().default(false),
    relatedPosts: z.array(reference('blog')).optional(),
  }),
});
```

et remplacer la dernière ligne du fichier par :

```ts
export const collections = { blog, projects };
```

- [ ] **Step 4: Écrire les helpers**

Créer `src/lib/projects.ts` :

```ts
import { getCollection, type CollectionEntry } from 'astro:content';

export type ProjectEntry = CollectionEntry<'projects'>;

/**
 * Ordre d'affichage de la grille `/projets` — déterministe (le plan d'impl le
 * fixe, la spec est muette) :
 *   1. `featured` d'abord ;
 *   2. `startDate` décroissante, une fiche sans date passant en dernier ;
 *   3. titre A→Z (`localeCompare` en 'fr' : casse et accents ignorés).
 * Ne mute pas le tableau reçu.
 */
export function sortProjects(projects: ProjectEntry[]): ProjectEntry[] {
  return [...projects].sort((a, b) => {
    const byFeatured = Number(b.data.featured) - Number(a.data.featured);
    if (byFeatured !== 0) return byFeatured;

    const at = a.data.startDate?.getTime() ?? -Infinity;
    const bt = b.data.startDate?.getTime() ?? -Infinity;
    if (at !== bt) return bt - at;

    return a.data.title.localeCompare(b.data.title, 'fr');
  });
}

/** Union triée des technos déclarées — alimente le `<select>` de filtre stack. */
export function collectStacks(projects: ProjectEntry[]): string[] {
  return [...new Set(projects.flatMap((p) => p.data.stack))].sort((a, b) =>
    a.localeCompare(b, 'fr'),
  );
}

export async function getSortedProjects(): Promise<ProjectEntry[]> {
  return sortProjects(await getCollection('projects'));
}
```

- [ ] **Step 5: Créer le dossier de contenu (vide) et vérifier**

```bash
mkdir -p src/content/projects && touch src/content/projects/.gitkeep
npx vitest run
npx astro check
npx astro build
```

Attendu : vitest **tous verts** (les 15 tests existants + les 7 nouveaux) · `astro check` **0 error** · `astro build` **8 pages**, aucun avertissement sur la collection `projects` vide.

- [ ] **Step 6: Commit**

```bash
git add src/content.config.ts src/lib/projects.ts src/lib/projects.test.ts src/content/projects/.gitkeep
git commit -m "feat(p3): add projects collection schema and ordering helpers"
```

---

### Task A2: ≥ 2 fiches projets réelles + relations bidirectionnelles

**Files:**
- Create: `src/content/projects/<slug>/index.md` (≥ 2, slugs et contenus fournis par l'utilisateur)
- Modify: `src/content/blog/<slug>/index.md` (le ou les articles qui reçoivent `relatedProjects`)

**Interfaces:**
- Consumes: le schéma de T-A1 (`src/content.config.ts`).
- Produces: des `id` de projets (= nom du dossier) référencés par les articles, et des `id` d'articles référencés par les projets. T-B1/T-B3/T-B4 rendent ces entrées.

**Contexte pour l'implémenteur :** **cette tâche n'invente aucune donnée.** Les deux fiches ci-dessous ont été choisies par l'utilisateur au gate de pré-flight, et chaque valeur de frontmatter est un **fait vérifié** — dépôt local pour l'une, API GitHub + README du dépôt pour l'autre. Ne change aucune valeur. Un `id` d'entrée = le nom du dossier (le loader `glob` retire `/index`), donc `src/content/projects/site-bencat/index.md` → `site-bencat` → `/projets/site-bencat/`.

R5 exige les **deux sens** : au moins un projet doit porter `relatedPosts`, et au moins un article doit porter `relatedProjects`. Astro valide les `reference()` au build : un id inexistant fait **échouer** `astro build` avec un message explicite — c'est le test de cette tâche.

Règles de rédaction, non négociables :
- **Ne jamais écrire une clé optionnelle vide** (`repoUrl:` sans valeur casse la validation `z.string().url()`). Clé absente = champ absent, c'est le contrat `omit_empty_optional_fields` du Plan 2.
- Pas de couverture : `cover` reste absent (aucune image réelle fournie ; un `cover` pointant vers un fichier manquant casse le build).
- `resumexyz` n'a **pas** de `demoUrl` : `benoitcatillon.xyz` ne résout plus (vérifié — pas de réponse DNS). Ne pas ajouter ce lien mort.

- [ ] **Step 1: Créer la fiche du site — `src/content/projects/site-bencat/index.md`**

```markdown
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
```

- [ ] **Step 2: Créer la 2ᵉ fiche — EN ATTENTE DE L'UTILISATEUR**

Le contenu de cette étape a été **retiré** (déviation **D02**) : l'utilisateur a écarté `resumexyz` et publiera d'autres projets pour servir d'exemples réels. Le plan sera **ré-amendé ici** avec les valeurs exactes (titre, description, statut, stack, dates, URLs, tous vérifiés sur la source) dès que les dépôts seront disponibles, **avant** que cette étape ne soit exécutée.

Tant que cette étape n'est pas faite, **R1 ne peut pas passer `Done`** (« ≥ 2 fiches réelles chargées ») et **T-B1 → T-B4 restent bloquées** : leurs critères se vérifient sur ≥ 2 cartes rendues.

- [ ] **Step 3: Ajouter le sens inverse sur l'article**

Dans `src/content/blog/bienvenue-dans-mon-foutoir/index.md`, ajouter cette clé au frontmatter, **juste après `aiUsage`** — sans toucher à quoi que ce soit d'autre dans le fichier (ni les guillemets des autres valeurs, ni le corps) :

```yaml
relatedProjects: [site-bencat]
```

- [ ] **Step 4: Vérifier que les références résolvent**

```bash
npx astro build
```

Attendu : build **vert**, `10 pages` (8 existantes + 2 fiches projets, `/projets` n'existant pas encore). Un id erroné produirait ici une erreur de validation citant le champ `relatedPosts` ou `relatedProjects` — c'est la preuve que la validation est bien active.

- [ ] **Step 5: Prouver que la référence est réellement résolvable en entrée (pas seulement valide)**

Sonde temporaire — créer `src/pages/_probe-refs.astro` :

```astro
---
import { getEntries } from 'astro:content';
import { getSortedProjects } from '../lib/projects';

const projects = await getSortedProjects();
const lines: string[] = [];
for (const p of projects) {
  const posts = p.data.relatedPosts?.length ? await getEntries(p.data.relatedPosts) : [];
  lines.push(`${p.id} -> [${posts.map((e) => `${e.id}:${e.data.title}`).join(', ')}]`);
}
---
<pre>{lines.join('\n')}</pre>
```

```bash
npx astro build && cat dist/_probe-refs/index.html
```

Attendu : chaque ligne montre l'id **et le titre** de l'article lié. **Aucun `undefined`** dans la sortie (clause explicite de R5). Puis supprimer la sonde :

```bash
rm src/pages/_probe-refs.astro && npx astro build
```

- [ ] **Step 6: Vérifications complètes**

```bash
npx vitest run
npx astro check
npx astro build
git status --short
```

Attendu : tests verts · `astro check` **0 error** · build **10 pages** · `git status` ne montre **aucun** reliquat de sonde.

- [ ] **Step 7: Commit**

```bash
git add src/content/projects src/content/blog
git commit -m "content(p3): add real project pages and blog<->project relations"
```

---

## Phase B — Pages (R2, R3, R4, R5, R7)

### Task B1: Carte projet + grille `/projets`

**Files:**
- Create: `src/lib/projectStatus.ts`
- Create: `src/components/ProjectCard.astro`
- Create: `src/pages/projets/index.astro`

**Interfaces:**
- Consumes: `getSortedProjects()` (T-A1), les fiches de T-A2, `src/components/ArticleCard.astro` **comme modèle visuel uniquement** (aucun import).
- Produces:
  - `src/lib/projectStatus.ts` : `PROJECT_STATUS_META: Record<'actif'|'wip'|'archivé', { label: string; chipClass: string }>` — réutilisé tel quel par T-B3.
  - `ProjectCard.astro` : props `{ project: CollectionEntry<'projects'> }`, rend un `<a data-project-card data-status data-stack>` — **ces trois attributs sont le contrat que T-B2 consomme**.

**Contexte pour l'implémenteur :** la carte est une **variante** de `src/components/ArticleCard.astro` — reprendre ses classes de conteneur telles quelles (`group flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-acc/50`) et la puce mono pour le kicker. Le pattern « métadonnées d'affichage dans un module `src/lib/` partagé » vient de `src/lib/aiUsage.ts` : le suivre plutôt que de disséminer des classes dans deux gabarits. Le `data-stack` est du **JSON** (`JSON.stringify`) : aucun séparateur maison ne peut casser sur une techno contenant une virgule ou un espace.

- [ ] **Step 1: Créer les métadonnées de statut**

Créer `src/lib/projectStatus.ts` :

```ts
/**
 * Source de vérité unique pour l'affichage du statut d'un projet
 * (`status` dans le frontmatter, cf. content.config.ts → PROJECT_STATUSES).
 *
 * Réutilisé par `ProjectCard.astro` (puce sur la carte) et par la fiche
 * `src/pages/projets/[...slug].astro`. Même rôle que `src/lib/aiUsage.ts` :
 * garder les libellés et les couleurs à UN endroit évite que la carte et la
 * fiche divergent.
 *
 * Palette : `actif` réutilise l'accent du site (tokens `--color-acc*`) ;
 * `wip` prend l'ambre par défaut de Tailwind — comme la bannière `partial`
 * de aiUsage.ts — pour ne pas se confondre avec le vert ; `archivé` reste
 * neutre (tokens `--color-line` / `--color-muted`).
 */
export type ProjectStatus = 'actif' | 'wip' | 'archivé';

interface ProjectStatusMeta {
  label: string;
  /** Classes de la puce — bordure + fond + texte. */
  chipClass: string;
}

export const PROJECT_STATUS_META: Record<ProjectStatus, ProjectStatusMeta> = {
  actif: {
    label: 'actif',
    chipClass: 'border-acc/40 bg-acc-dim text-acc',
  },
  wip: {
    label: 'wip',
    chipClass:
      'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
  },
  'archivé': {
    label: 'archivé',
    chipClass: 'border-line bg-surface text-muted',
  },
};
```

- [ ] **Step 2: Créer la carte projet**

Créer `src/components/ProjectCard.astro` :

```astro
---
import { Image } from 'astro:assets';
import type { CollectionEntry } from 'astro:content';
import { PROJECT_STATUS_META } from '../lib/projectStatus';

interface Props {
  project: CollectionEntry<'projects'>;
}

const { project } = Astro.props;
const { title, description, status, stack, cover, coverAlt } = project.data;
const statusMeta = PROJECT_STATUS_META[status];
---

{/*
  `data-status` et `data-stack` sont lus par src/scripts/project-filters.ts
  (T-B2). `data-stack` est du JSON : aucune techno ne peut casser le parsing,
  quel que soit son libellé.
*/}
<a
  href={`/projets/${project.id}/`}
  class="group flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-acc/50"
  data-project-card
  data-status={status}
  data-stack={JSON.stringify(stack)}
>
  {
    cover && (
      <Image
        src={cover}
        alt={coverAlt ?? title}
        class="aspect-video w-full rounded-lg object-cover"
      />
    )
  }

  <span
    class={`w-fit rounded-full border px-2 py-0.5 font-mono text-xs ${statusMeta.chipClass}`}
  >
    {statusMeta.label}
  </span>

  <h3 class="font-display text-lg font-semibold text-text group-hover:text-acc">
    {title}
  </h3>

  <p class="text-sm text-muted">{description}</p>

  {
    stack.length > 0 && (
      <ul class="mt-auto flex flex-wrap gap-2 pt-2" aria-label="Technologies">
        {stack.map((tech) => (
          <li class="rounded border border-line px-2 py-0.5 font-mono text-xs text-muted">
            {tech}
          </li>
        ))}
      </ul>
    )
  }
</a>
```

- [ ] **Step 3: Créer la page `/projets`**

Créer `src/pages/projets/index.astro` — structure calquée sur `src/pages/blog/index.astro` :

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import ProjectCard from '../../components/ProjectCard.astro';
import { getSortedProjects } from '../../lib/projects';

// getSortedProjects() applique déjà l'ordre du plan (featured, startDate desc,
// titre) — cf. src/lib/projects.ts. Pas de re-tri ici.
const projects = await getSortedProjects();
---

<BaseLayout
	title="Projets — bencat_"
	description="Les projets de bencat_ : extensions, outils et POCs."
>
	<main>
		<section class="mx-auto max-w-5xl px-4 py-16 sm:px-6">
			<p class="font-mono text-sm text-acc">~/ projets</p>
			<h1 class="mt-4 font-display text-4xl font-bold text-text sm:text-5xl">Projets</h1>
		</section>

		<section class="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{projects.map((project) => <ProjectCard project={project} />)}
			</div>
		</section>
	</main>
</BaseLayout>
```

- [ ] **Step 4: Vérifier le rendu — les 4 champs de R2 sont bien présents**

```bash
npx astro build
grep -c 'data-project-card' dist/projets/index.html
```

Attendu : le compte est **≥ 2** (R2 exige ≥ 2 cartes). Puis, sur la même sortie, vérifier pour chaque carte la présence des **quatre** champs exigés par R2 — titre, description, statut, stack :

```bash
grep -o 'data-status="[^"]*"' dist/projets/index.html
grep -o 'data-stack="[^"]*"' dist/projets/index.html
```

Attendu : autant de `data-status` et de `data-stack` que de cartes, valeurs non vides. Ouvrir ensuite le HTML pour confirmer de visu que titre, description, puce de statut et liste des technos sont rendus dans chaque carte.

- [ ] **Step 5: Smoke visuel + 375px (R7)**

Servir le build (`npx astro preview`) et vérifier dans le navigateur :
1. `/projets` en thème **dark** puis **light** — cartes cohérentes avec `/blog` (mêmes bordures, mêmes rayons, même typographie).
2. Viewport **375px** : `document.documentElement.scrollWidth <= window.innerWidth` doit être **vrai** (aucun scroll horizontal).
3. Un clic sur une carte mène à `/projets/<slug>/` — **404 attendue à ce stade**, la fiche arrive en T-B3.

- [ ] **Step 6: Vérifications complètes**

```bash
npx vitest run
npx astro check
npx astro build
```

Attendu : tests verts · `astro check` **0 error** · build **11 pages**.

- [ ] **Step 7: Commit**

```bash
git add src/lib/projectStatus.ts src/components/ProjectCard.astro src/pages/projets/index.astro
git commit -m "feat(p3): add project card and /projets grid"
```

---

### Task B2: Filtre statut + stack (JS vanilla progressif)

**Files:**
- Create: `src/lib/projectFilters.ts`
- Create: `src/lib/projectFilters.test.ts`
- Create: `src/scripts/project-filters.ts`
- Modify: `src/pages/projets/index.astro`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: les attributs `data-project-card` / `data-status` / `data-stack` posés par `ProjectCard.astro` (T-B1) ; `collectStacks()` (T-A1) ; `PROJECT_STATUSES` (T-A1).
- Produces: `src/lib/projectFilters.ts` → `export const ALL = '__all__'` et `matchesFilters(entry: { status: string; stack: string[] }, selected: { status: string; stack: string }): boolean`.

**Contexte pour l'implémenteur — deux pièges à connaître avant d'écrire une ligne :**

1. **Pourquoi un module `projectFilters.ts` séparé de `projects.ts` ?** `src/lib/projects.ts` importe `astro:content` ; un script navigateur qui l'importerait entraînerait tout le module virtuel dans le bundle client. Le prédicat pur vit donc dans son propre fichier, sans aucun import — c'est ce qui le rend à la fois embarquable et testable en isolation.
2. **`hidden` seul ne masque rien ici.** Le preflight Tailwind pose `[hidden] { display: none }`, mais la carte porte l'utilitaire `flex` (`display: flex`) : même spécificité, c'est l'ordre de génération qui tranche — on ne peut pas s'y fier. D'où la règle globale explicite du Step 5, dans la même logique que `.copy-btn` du Plan 1 (élément piloté en JS → CSS global assumé).

- [ ] **Step 1: Écrire les tests du prédicat**

Créer `src/lib/projectFilters.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { ALL, matchesFilters } from './projectFilters';

const astroProject = { status: 'actif', stack: ['Astro', 'TypeScript'] };
const archivedPhp = { status: 'archivé', stack: ['PHP'] };

describe('matchesFilters', () => {
  it('laisse tout passer quand aucun filtre n’est sélectionné', () => {
    expect(matchesFilters(astroProject, { status: ALL, stack: ALL })).toBe(true);
    expect(matchesFilters(archivedPhp, { status: ALL, stack: ALL })).toBe(true);
  });

  it('ne garde que les projets du statut choisi', () => {
    const selected = { status: 'actif', stack: ALL };
    expect(matchesFilters(astroProject, selected)).toBe(true);
    expect(matchesFilters(archivedPhp, selected)).toBe(false);
  });

  it('ne garde que les projets déclarant la techno choisie', () => {
    const selected = { status: ALL, stack: 'PHP' };
    expect(matchesFilters(archivedPhp, selected)).toBe(true);
    expect(matchesFilters(astroProject, selected)).toBe(false);
  });

  it('combine statut ET stack', () => {
    expect(matchesFilters(astroProject, { status: 'actif', stack: 'Astro' })).toBe(true);
    expect(matchesFilters(astroProject, { status: 'actif', stack: 'PHP' })).toBe(false);
    expect(matchesFilters(astroProject, { status: 'wip', stack: 'Astro' })).toBe(false);
  });

  it('exclut un projet sans stack dès qu’une techno est demandée', () => {
    expect(matchesFilters({ status: 'wip', stack: [] }, { status: ALL, stack: 'Astro' })).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run src/lib/projectFilters.test.ts
```

Attendu : **FAIL** — `Failed to resolve import "./projectFilters"`.

- [ ] **Step 3: Écrire le prédicat**

Créer `src/lib/projectFilters.ts` :

```ts
/**
 * Prédicat de filtrage de la grille `/projets`.
 *
 * AUCUN import ici — surtout pas `astro:content`. Ce module est chargé par le
 * navigateur (src/scripts/project-filters.ts) ET par les tests unitaires ; le
 * garder sans dépendance est ce qui rend les deux possibles.
 */

/** Valeur sentinelle « aucun filtre » — jamais un statut ni une techno réels. */
export const ALL = '__all__';

export interface ProjectFilterEntry {
  status: string;
  stack: string[];
}

export interface ProjectFilterSelection {
  status: string;
  stack: string;
}

/** Les deux critères se combinent en ET (spec R3). */
export function matchesFilters(
  entry: ProjectFilterEntry,
  selected: ProjectFilterSelection,
): boolean {
  const statusOk = selected.status === ALL || entry.status === selected.status;
  const stackOk = selected.stack === ALL || entry.stack.includes(selected.stack);
  return statusOk && stackOk;
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

```bash
npx vitest run src/lib/projectFilters.test.ts
```

Attendu : **5 tests PASS**.

- [ ] **Step 5: Ajouter la règle de masquage globale**

Dans `src/styles/global.css`, à la suite du bloc `.copy-btn`, ajouter :

```css
/* ==========================================================================
   Filtre /projets — Plan 3 / T-B2
   Le masquage passe par l'attribut `hidden` (piloté par
   src/scripts/project-filters.ts), qui garde la sémantique : un élément
   `hidden` sort de l'arbre d'accessibilité ET de l'ordre de tabulation.
   La règle est explicite parce que le `[hidden] { display: none }` du
   preflight Tailwind a la MÊME spécificité que l'utilitaire `flex` porté par
   la carte : sans `!important`, l'ordre de génération déciderait du résultat.
   La barre de filtres est rendue `hidden` par le serveur et révélée par le
   script : sans JS, aucun contrôle mort n'est affiché (enhancement progressif,
   spec §6.1).
   ========================================================================== */
[data-project-card][hidden],
[data-project-filters][hidden],
[data-projects-empty][hidden] {
  display: none !important;
}
```

- [ ] **Step 6: Écrire le script navigateur**

Créer `src/scripts/project-filters.ts` :

```ts
import { ALL, matchesFilters } from '../lib/projectFilters';

const toolbar = document.querySelector<HTMLElement>('[data-project-filters]');
const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-project-card]'));
const emptyState = document.querySelector<HTMLElement>('[data-projects-empty]');

if (toolbar && cards.length > 0) {
  const statusButtons = Array.from(
    toolbar.querySelectorAll<HTMLButtonElement>('[data-filter-status]'),
  );
  const stackSelect = toolbar.querySelector<HTMLSelectElement>('[data-filter-stack]');

  const selected = { status: ALL, stack: ALL };

  const apply = () => {
    let visible = 0;

    for (const card of cards) {
      let stack: string[] = [];
      try {
        stack = JSON.parse(card.dataset.stack ?? '[]');
      } catch {
        stack = []; // data-stack malformé : la carte se comporte comme sans techno
      }
      const show = matchesFilters({ status: card.dataset.status ?? '', stack }, selected);
      card.hidden = !show;
      if (show) visible += 1;
    }

    if (emptyState) emptyState.hidden = visible > 0;

    for (const button of statusButtons) {
      const isCurrent = (button.dataset.filterStatus ?? ALL) === selected.status;
      button.setAttribute('aria-pressed', String(isCurrent));
    }
  };

  for (const button of statusButtons) {
    button.addEventListener('click', () => {
      selected.status = button.dataset.filterStatus ?? ALL;
      apply();
    });
  }

  stackSelect?.addEventListener('change', () => {
    selected.stack = stackSelect.value || ALL;
    apply();
  });

  // Révélation de la barre : sans JS elle reste `hidden`, donc aucun contrôle
  // inopérant n'est affiché et toutes les cartes restent visibles.
  toolbar.hidden = false;
  apply();
}
```

- [ ] **Step 7: Brancher la barre de filtres dans la page**

Dans `src/pages/projets/index.astro`, remplacer le frontmatter par :

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import ProjectCard from '../../components/ProjectCard.astro';
import { getSortedProjects, collectStacks } from '../../lib/projects';
import { PROJECT_STATUSES } from '../../content.config';
import { ALL } from '../../lib/projectFilters';

// getSortedProjects() applique déjà l'ordre du plan (featured, startDate desc,
// titre) — cf. src/lib/projects.ts. Pas de re-tri ici.
const projects = await getSortedProjects();
const stacks = collectStacks(projects);
---
```

puis insérer la barre **avant** la `<section>` de la grille, et l'état vide **après** la grille, dans la même section :

```astro
		<section class="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
			{/*
				`hidden` côté serveur : révélé par src/scripts/project-filters.ts.
				Sans JS, aucun contrôle mort n'est affiché et toutes les cartes
				restent visibles (enhancement progressif, spec §6.1).
			*/}
			<div
				class="mb-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
				data-project-filters
				hidden
			>
				<div class="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrer par statut">
					<button
						type="button"
						data-filter-status={ALL}
						aria-pressed="true"
						class="rounded-full border border-line px-3 py-1 font-mono text-xs text-muted transition-colors hover:border-acc hover:text-acc aria-pressed:border-acc aria-pressed:text-acc"
					>
						tous
					</button>
					{
						PROJECT_STATUSES.map((status) => (
							<button
								type="button"
								data-filter-status={status}
								aria-pressed="false"
								class="rounded-full border border-line px-3 py-1 font-mono text-xs text-muted transition-colors hover:border-acc hover:text-acc aria-pressed:border-acc aria-pressed:text-acc"
							>
								{status}
							</button>
						))
					}
				</div>

				{
					stacks.length > 0 && (
						<label class="flex items-center gap-2 font-mono text-xs text-muted">
							techno
							<select
								data-filter-stack
								class="rounded-lg border border-line bg-surface px-2 py-1 font-mono text-xs text-text"
							>
								<option value={ALL}>toutes</option>
								{stacks.map((tech) => (
									<option value={tech}>{tech}</option>
								))}
							</select>
						</label>
					)
				}
			</div>

			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{projects.map((project) => <ProjectCard project={project} />)}
			</div>

			<p class="mt-8 font-mono text-sm text-muted" data-projects-empty hidden>
				Aucun projet ne correspond à ce filtre.
			</p>
		</section>
```

et, juste avant `</BaseLayout>`, ajouter le script (même pattern que `src/pages/blog/[...slug].astro:48`) :

```astro
	<script>
		import '../../scripts/project-filters.ts';
	</script>
```

- [ ] **Step 8: Vérifier le comportement réel dans le navigateur (R3)**

`npx astro build && npx astro preview`, puis sur `/projets` :
1. **La barre est visible** (le script l'a révélée) et `tous` est en `aria-pressed="true"`.
2. Cliquer un statut présent dans les fiches → **seules** les cartes de ce statut restent visibles. Vérifier par le compte :
   `document.querySelectorAll('[data-project-card]:not([hidden])').length` doit égaler le nombre de fiches de ce statut, et chacune doit bien porter ce `data-status`.
3. Choisir une techno dans le `<select>` → **seules** les cartes déclarant cette techno restent. Même contrôle.
4. Combiner statut + techno sans résultat → la grille est vide **et** le message « Aucun projet ne correspond à ce filtre. » apparaît.
5. Revenir à `tous` + `toutes` → toutes les cartes reviennent.
6. **Sans JS** (désactiver JavaScript, recharger) : la barre est **absente** et **toutes** les cartes sont visibles.

- [ ] **Step 9: 375px + thèmes (R7)**

À 375px : la barre passe en colonne, aucun débordement horizontal
(`document.documentElement.scrollWidth <= window.innerWidth`). Vérifier en dark **et** en light que les boutons et le `<select>` restent lisibles (contraste du texte sur `--color-surface`).

- [ ] **Step 10: Vérifications complètes**

```bash
npx vitest run
npx astro check
npx astro build
```

Attendu : tests verts (dont les 5 nouveaux) · `astro check` **0 error** · build **11 pages**.

- [ ] **Step 11: Commit**

```bash
git add src/lib/projectFilters.ts src/lib/projectFilters.test.ts src/scripts/project-filters.ts src/pages/projets/index.astro src/styles/global.css
git commit -m "feat(p3): filter /projets by status and stack with vanilla JS"
```

---

### Task B3: Fiche `/projets/<slug>` — corps, repo/démo, articles liés

**Files:**
- Create: `src/pages/projets/[...slug].astro`

**Interfaces:**
- Consumes: `getSortedProjects()` (T-A1), `PROJECT_STATUS_META` (T-B1), `sortAndFilter` de `src/lib/posts.ts` (Plan 1), `getEntries` / `render` de `astro:content`.
- Produces: les routes `/projets/<id>/` — **c'est la cible des `href` de `ProjectCard.astro`** (T-B1) et des liens d'articles de T-B4.

**Contexte pour l'implémenteur :** calquer la structure de `src/pages/blog/[...slug].astro` (même largeur `max-w-3xl`, même classe `.prose` pour le corps, même ordre titre → visuel → contenu). Deux points spécifiques à R5 :
- `getEntries(refs)` résout un tableau de références en **entrées réelles** ; c'est ce qui permet d'afficher un **titre** et non un id. La clause « aucun `undefined` » de R5 se vérifie sur la sortie construite, pas sur l'intention.
- Un article `draft: true` n'a **pas** de route publique (`getStaticPaths` de `blog` filtre via `sortAndFilter`) : le lier produirait un lien mort. On passe donc les entrées résolues dans `sortAndFilter`, qui filtre les drafts **et** trie par date décroissante.

- [ ] **Step 1: Créer la fiche**

Créer `src/pages/projets/[...slug].astro` :

```astro
---
import { Image } from 'astro:assets';
import { getEntries, render } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getSortedProjects } from '../../lib/projects';
import { PROJECT_STATUS_META } from '../../lib/projectStatus';
import { sortAndFilter } from '../../lib/posts';

export async function getStaticPaths() {
  const projects = await getSortedProjects();
  return projects.map((project) => ({ params: { slug: project.id }, props: { project } }));
}

const { project } = Astro.props;
const { Content } = await render(project);
const { title, description, status, startDate, stack, cover, coverAlt, repoUrl, demoUrl } =
  project.data;

const statusMeta = PROJECT_STATUS_META[status];

// R5 : les références sont résolues en entrées réelles — on affiche un titre,
// jamais un id ni `undefined`. sortAndFilter (src/lib/posts.ts) écarte au
// passage les articles `draft: true`, qui n'ont pas de route publique : les
// lier produirait un lien mort.
const relatedPosts = project.data.relatedPosts?.length
  ? sortAndFilter(await getEntries(project.data.relatedPosts))
  : [];

const startDateFr = startDate?.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
---

<BaseLayout title={`${title} — bencat_`} description={description}>
  <article class="mx-auto max-w-3xl px-4 py-10">
    <p class="font-mono text-sm text-acc">~/ projets</p>

    <h1 class="mt-4 font-display text-4xl font-bold text-text">{title}</h1>

    <div class="mt-4 flex flex-wrap items-center gap-3">
      <span class={`rounded-full border px-2 py-0.5 font-mono text-xs ${statusMeta.chipClass}`}>
        {statusMeta.label}
      </span>
      {startDateFr && <span class="font-mono text-xs text-muted">depuis {startDateFr}</span>}
    </div>

    <p class="mt-4 text-muted">{description}</p>

    {
      cover && (
        <Image
          src={cover}
          alt={coverAlt ?? ''}
          class="mt-8 aspect-video w-full rounded-lg object-cover"
        />
      )
    }

    {
      (repoUrl || demoUrl) && (
        <div class="mt-8 flex flex-wrap gap-3">
          {repoUrl && (
            <a
              href={repoUrl}
              rel="noopener noreferrer"
              target="_blank"
              class="rounded-lg border border-line px-3 py-1.5 font-mono text-xs text-text transition-colors hover:border-acc hover:text-acc"
            >
              code source ↗
            </a>
          )}
          {demoUrl && (
            <a
              href={demoUrl}
              rel="noopener noreferrer"
              target="_blank"
              class="rounded-lg border border-line px-3 py-1.5 font-mono text-xs text-text transition-colors hover:border-acc hover:text-acc"
            >
              démo ↗
            </a>
          )}
        </div>
      )
    }

    {
      stack.length > 0 && (
        <ul class="mt-6 flex flex-wrap gap-2" aria-label="Technologies">
          {stack.map((tech) => (
            <li class="rounded border border-line px-2 py-0.5 font-mono text-xs text-muted">
              {tech}
            </li>
          ))}
        </ul>
      )
    }

    <div class="prose mt-10">
      <Content />
    </div>

    {
      relatedPosts.length > 0 && (
        <section class="mt-12 border-t border-line pt-8">
          <h2 class="font-mono text-sm text-muted">// articles liés</h2>
          <ul class="mt-4 flex flex-col gap-2">
            {relatedPosts.map((post) => (
              <li>
                <a
                  href={`/blog/${post.id}/`}
                  class="text-text underline decoration-line underline-offset-4 transition-colors hover:text-acc hover:decoration-acc"
                >
                  {post.data.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )
    }
  </article>

  <script>
    import '../../scripts/copy-code.ts';
  </script>
</BaseLayout>
```

- [ ] **Step 2: Vérifier R4 et R5 sur la sortie construite**

```bash
npx astro build
ls dist/projets
```

Attendu : un dossier par fiche. Puis, pour **chaque** fiche ayant `repoUrl`/`demoUrl` :

```bash
grep -o 'href="https://[^"]*"' dist/projets/<slug>/index.html
```

Attendu : les URLs exactes du frontmatter sont présentes. Et pour la clause « aucun `undefined` » de R5 :

```bash
grep -ri 'undefined' dist/projets/ || echo "aucun undefined — OK"
```

Attendu : **aucune occurrence**. Vérifier enfin que le corps Markdown est bien rendu (présence des `<h2>`/`<p>` du fichier source) et que le titre de chaque article lié apparaît en toutes lettres.

- [ ] **Step 3: Vérifier le cas « sans liens »**

Une fiche sans `repoUrl` ni `demoUrl` ne doit afficher **aucun** bouton vide. Si les deux fiches réelles ont des liens, créer une sonde temporaire `src/content/projects/_probe/index.md` avec le minimum (`title`, `description`), vérifier `dist/projets/_probe/index.html` (pas de bouton, pas de section « articles liés »), puis **supprimer la sonde** et relancer le build.

- [ ] **Step 4: Smoke navigateur + 375px (R7)**

`npx astro preview` :
1. Depuis `/projets`, cliquer une carte → la fiche s'ouvre (plus de 404).
2. Cliquer un article lié → l'article s'ouvre.
3. Les liens repo/démo ouvrent bien les URLs déclarées.
4. Dark **et** light : cohérence avec la page article.
5. **375px** : `document.documentElement.scrollWidth <= window.innerWidth` — y compris avec une longue liste de technos.

- [ ] **Step 5: Vérifications complètes**

```bash
npx vitest run
npx astro check
npx astro build
git status --short
```

Attendu : tests verts · `astro check` **0 error** · build = 11 pages + 1 par fiche · **aucun** reliquat de sonde.

- [ ] **Step 6: Commit**

```bash
git add src/pages/projets/[...slug].astro
git commit -m "feat(p3): add project detail page with repo/demo links and related posts"
```

---

### Task B4: Sens `article → projets` + activation du lien de nav

**Files:**
- Modify: `src/pages/blog/[...slug].astro`
- Modify: `src/components/Header.astro`

**Interfaces:**
- Consumes: `getEntries` (`astro:content`), `sortProjects` (T-A1), les routes `/projets/<id>/` créées par T-B3.
- Produces: rien que d'autres tâches consomment.

**Contexte pour l'implémenteur :** c'est la **seconde moitié de R5** — « un article avec `relatedProjects` liste ses projets ». Le champ existe déjà dans le schéma depuis le Plan 1 (`src/content.config.ts:20`) mais n'a jamais été rendu. La section se place **après** le corps de l'article, en miroir exact de la section « articles liés » de la fiche projet (T-B3) : même bordure, même kicker mono, même style de lien. Les projets n'ont pas de champ `draft` — il n'y a donc rien à filtrer, seulement à ordonner.

L'activation du lien de nav est l'**addition n°1** listée en tête de plan : ne l'exécuter que si elle a été approuvée au gate. Si elle a été coupée, sauter le Step 3 et ne pas toucher à `Header.astro`.

- [ ] **Step 1: Rendre les projets liés sur la page article**

Dans `src/pages/blog/[...slug].astro`, étendre les imports :

```astro
import { getEntries, render } from 'astro:content';
import { sortProjects } from '../../lib/projects';
```

(`render` est déjà importé depuis `astro:content` — ajouter `getEntries` à la même ligne.)

Puis, sous la ligne `const tocHeadings = …`, ajouter :

```astro
// R5, sens article → projets : les références sont résolues en entrées réelles
// pour afficher un titre, jamais un id ni `undefined`. Les projets n'ont pas de
// champ `draft` (spec de design §3.2) : rien à filtrer, seulement à ordonner.
const relatedProjects = post.data.relatedProjects?.length
  ? sortProjects(await getEntries(post.data.relatedProjects))
  : [];
```

Enfin, juste **après** le `<div class="prose">…</div>` et avant `</article>`, ajouter :

```astro
    {
      relatedProjects.length > 0 && (
        <section class="mt-12 border-t border-line pt-8">
          <h2 class="font-mono text-sm text-muted">// projets liés</h2>
          <ul class="mt-4 flex flex-col gap-2">
            {relatedProjects.map((project) => (
              <li>
                <a
                  href={`/projets/${project.id}/`}
                  class="text-text underline decoration-line underline-offset-4 transition-colors hover:text-acc hover:decoration-acc"
                >
                  {project.data.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )
    }
```

- [ ] **Step 2: Vérifier le sens `article → projets` sur la sortie construite**

```bash
npx astro build
grep -o 'href="/projets/[^"]*"' dist/blog/<slug-de-l-article-lié>/index.html
grep -ri 'undefined' dist/blog/ || echo "aucun undefined — OK"
```

Attendu : le lien vers la fiche projet est présent avec le **titre** du projet en texte visible ; aucun `undefined`. Vérifier aussi qu'un article **sans** `relatedProjects` ne rend **aucune** section « projets liés » (choisir un des autres articles).

- [ ] **Step 3: Activer le lien de nav (uniquement si l'addition n°1 a été approuvée)**

Dans `src/components/Header.astro`, remplacer le commentaire et la ligne « Projets » :

```astro
// Nav complète du site (spec design §4). Blog (Plan 1) et Projets (Plan 3)
// ont une page ; les autres piliers arrivent au Plan 4-5 — rendus non
// cliquables pour éviter tout lien mort (cf. spec Plan 1 §5).
const navLinks: NavLink[] = [
  { label: 'Blog', href: '/blog' },
  { label: 'Projets', href: '/projets' },
  { label: 'Prompts' },
  { label: 'Skills' },
  { label: 'À propos' },
];
```

- [ ] **Step 4: Smoke navigateur + 375px**

`npx astro preview` :
1. Un article lié affiche sa section « projets liés » ; le clic mène à la fiche.
2. Depuis la fiche, le clic sur l'article lié revient à l'article — **l'aller-retour de la user story §1.4 est bouclé**.
3. Le lien « Projets » de l'en-tête mène à `/projets` (si Step 3 exécuté).
4. **375px** : en-tête et section « projets liés » sans débordement horizontal.

- [ ] **Step 5: Vérifications complètes**

```bash
npx vitest run
npx astro check
npx astro build
```

Attendu : tests verts · `astro check` **0 error** · build complet sans erreur.

- [ ] **Step 6: Commit**

```bash
git add src/pages/blog/[...slug].astro src/components/Header.astro
git commit -m "feat(p3): render related projects on posts and enable Projets nav link"
```

---

## Phase C — CMS (R6)

### Task C1: Collection `projects` dans Sveltia + garde-fou de test

**Files:**
- Modify: `public/admin/config.yml`
- Modify: `src/lib/cms-config.test.ts`

**Interfaces:**
- Consumes: `PROJECT_STATUSES` (T-A1) — importé par le test, comme `CATEGORIES` l'est déjà.
- Produces: une seconde collection CMS, `projects`, écrivant `src/content/projects/<slug>/index.md`.

**Contexte pour l'implémenteur — trois choses à savoir :**

1. **Ce test va d'abord échouer, et c'est le but.** `src/lib/cms-config.test.ts:28` assert `expect(cfg.collections).toHaveLength(1)`. C'est le garde-fou anti-drift du Plan 2 qui se déclenche : le mettre à jour **explicitement** fait partie de la tâche.
2. **Stratégie média identique à `blog`** : `media_folder: ''` / `public_folder: ''` (entry-relative) + `choose_url: false` sur `cover`. Le Plan 2 a prouvé — sur le bundle épinglé, puis en production — que c'est la seule combinaison où l'image atterrit à côté de l'`index.md` et se fait optimiser par Astro. Le repli média **global** (`src/assets/uploads`) reste inchangé : ne pas y toucher.
3. **Leçon du Plan 2 : établir les faits sur la source qui fait foi.** Le widget `relation` et la valeur écrite par `value_field: '{{slug}}'` doivent être vérifiés dans le **bundle épinglé** (`@sveltia/cms@0.175.1`), pas dans la documentation — trois affirmations de la doc Sveltia se sont révélées fausses au Plan 2. La preuve définitive reste T-C2 (création réelle).

- [ ] **Step 1: Vérifier le widget `relation` sur le bundle épinglé (pas sur la doc)**

```bash
curl -s https://unpkg.com/@sveltia/cms@0.175.1/dist/sveltia-cms.js -o /tmp/sveltia-0.175.1.js
grep -o 'value_field' /tmp/sveltia-0.175.1.js | head
grep -o 'search_fields' /tmp/sveltia-0.175.1.js | head
grep -o 'display_fields' /tmp/sveltia-0.175.1.js | head
```

Attendu : les trois clés existent dans le bundle. Établir en particulier **ce que produit `{{slug}}`** comme valeur écrite (c'est ce qui doit correspondre à l'`id` Astro, soit le nom du dossier). Consigner le constat dans le rapport de tâche : c'est ce qui sera confronté à la réalité en T-C2.

- [ ] **Step 2: Mettre à jour le test (il doit échouer)**

Dans `src/lib/cms-config.test.ts` :

a) étendre l'import :

```ts
import { CATEGORIES, PROJECT_STATUSES } from '../content.config';
```

b) remplacer le test « déclare exactement une collection, nommée blog » par :

```ts
  it('déclare exactement deux collections : blog et projects', () => {
    const cfg = loadCmsConfig();
    expect(cfg.collections).toHaveLength(2);
    expect(cfg.collections.map((c: any) => c.name)).toEqual(['blog', 'projects']);
  });
```

c) remplacer le test « mappe tous les champs du schéma Zod sauf relatedProjects » par (addition n°2 — si elle a été coupée au gate, garder la version existante du test et retirer `relatedProjects` de la liste) :

```ts
  it('mappe tous les champs du schéma Zod', () => {
    expect(fieldNames().sort()).toEqual([
      'aiUsage', 'body', 'category', 'cover', 'coverAlt', 'description',
      'draft', 'featured', 'pubDate', 'relatedProjects', 'tags', 'title', 'updatedDate',
    ]);
  });
```

d) ajouter, à la fin du fichier, le bloc dédié à la nouvelle collection :

```ts
describe('config CMS — collection projects', () => {
  const projects = () => loadCmsConfig().collections[1];
  const fieldNames = () => projects().fields.map((f: any) => f.name);

  it('écrit des bundles src/content/projects/<slug>/index.md', () => {
    expect(projects().name).toBe('projects');
    expect(projects().folder).toBe('src/content/projects');
    expect(projects().path).toBe('{{slug}}/index');
    expect(projects().extension).toBe('md');
    expect(projects().format).toBe('yaml-frontmatter');
    expect(projects().create).toBe(true);
  });

  it('stocke les médias à côté de la fiche (entry-relative)', () => {
    expect(projects().media_folder).toBe('');
    expect(projects().public_folder).toBe('');
  });

  it('interdit la saisie d’une URL distante pour la couverture', () => {
    const cover = projects().fields.find((f: any) => f.name === 'cover');
    expect(cover.choose_url).toBe(false);
  });

  it('mappe tous les champs du schéma Zod', () => {
    expect(fieldNames().sort()).toEqual([
      'body', 'coverAlt', 'cover', 'demoUrl', 'description', 'featured',
      'relatedPosts', 'repoUrl', 'stack', 'startDate', 'status', 'tags', 'title',
    ].sort());
  });

  it('rend obligatoires exactement les champs non-optionnels du Zod', () => {
    const required = projects().fields
      .filter((f: any) => f.required !== false)
      .map((f: any) => f.name)
      .sort();
    expect(required).toEqual(['body', 'description', 'status', 'title']);
  });

  it('propose exactement les 3 statuts du schéma', () => {
    const status = projects().fields.find((f: any) => f.name === 'status');
    expect(status.widget).toBe('select');
    expect(status.options).toEqual([...PROJECT_STATUSES]);
    expect(status.default).toBe('actif');
  });

  it('relie les articles par une relation typée vers la collection blog', () => {
    const rel = projects().fields.find((f: any) => f.name === 'relatedPosts');
    expect(rel.widget).toBe('relation');
    expect(rel.collection).toBe('blog');
    expect(rel.multiple).toBe(true);
    // `reference('blog')` d'Astro stocke l'id d'entrée = le nom du dossier.
    expect(rel.value_field).toBe('{{slug}}');
  });

  it('utilise les widgets attendus pour les champs typés', () => {
    const byName = Object.fromEntries(projects().fields.map((f: any) => [f.name, f]));
    expect(byName.startDate.widget).toBe('datetime');
    expect(byName.stack.widget).toBe('list');
    expect(byName.tags.widget).toBe('list');
    expect(byName.cover.widget).toBe('image');
    expect(byName.featured.widget).toBe('boolean');
    expect(byName.body.widget).toBe('markdown');
  });
});
```

- [ ] **Step 3: Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run src/lib/cms-config.test.ts
```

Attendu : **FAIL** — au minimum `expected length 1 to be 2` et l'absence de `collections[1]`.

- [ ] **Step 4: Ajouter `relatedProjects` à la collection `blog` (addition n°2 — sauter si coupée au gate)**

Dans `public/admin/config.yml`, dans la collection `blog`, **juste après** le champ `featured` et **avant** `body` :

```yaml
      - name: relatedProjects
        label: Projets liés
        widget: relation
        required: false
        multiple: true
        collection: projects
        value_field: '{{slug}}'
        search_fields: [title]
        display_fields: [title]
```

- [ ] **Step 5: Ajouter la collection `projects`**

À la fin de `public/admin/config.yml`, après la collection `blog` :

```yaml
  - name: projects
    label: Projets
    label_singular: Projet
    description: Fiches projets — src/content/projects/{slug}/index.md
    folder: src/content/projects
    path: '{{slug}}/index'
    extension: md
    format: yaml-frontmatter
    create: true
    slug: '{{slug}}'
    identifier_field: title
    sortable_fields: [title, startDate]
    # Médias à côté de la fiche : Astro optimise les images co-localisées
    # (même stratégie que `blog`, prouvée en production au Plan 2).
    media_folder: ''
    public_folder: ''
    fields:
      - { name: title, label: Titre, widget: string }
      - { name: description, label: Description, widget: text, hint: Résumé affiché sur les cartes }
      - name: status
        label: Statut
        widget: select
        default: actif
        options: [actif, wip, archivé]
      - { name: startDate, label: Date de début, widget: datetime, format: 'YYYY-MM-DDTHH:mm:ssZ', required: false }
      - { name: stack, label: Stack technique, widget: list, required: false, default: [], hint: Une techno par entrée — alimente le filtre de /projets }
      - { name: tags, label: Tags, widget: list, required: false, default: [] }
      - { name: cover, label: Image de couverture, widget: image, required: false, choose_url: false }
      - { name: coverAlt, label: Texte alternatif de la couverture, widget: string, required: false }
      - { name: repoUrl, label: URL du dépôt, widget: string, required: false, pattern: ['^https?://', 'Doit être une URL complète commençant par http:// ou https://'] }
      - { name: demoUrl, label: URL de la démo, widget: string, required: false, pattern: ['^https?://', 'Doit être une URL complète commençant par http:// ou https://'] }
      - { name: featured, label: Mis en avant, widget: boolean, required: false, default: false }
      - name: relatedPosts
        label: Articles liés
        widget: relation
        required: false
        multiple: true
        collection: blog
        value_field: '{{slug}}'
        search_fields: [title]
        display_fields: [title]
      - { name: body, label: Contenu, widget: markdown }
```

- [ ] **Step 5bis: Vérifier que le CMS démarre réellement**

Une config invalide fait afficher à Sveltia un écran d'erreur, pas la bibliothèque — le test YAML seul ne le détecterait pas.

```bash
npx astro build && npx astro preview
```

Ouvrir `/admin/index.html` dans un navigateur **Chromium** : l'écran de connexion normal doit s'afficher avec **0 erreur** en console (une erreur de configuration s'afficherait ici). Ne pas s'authentifier — c'est T-C2.

- [ ] **Step 6: Lancer les tests pour vérifier qu'ils passent**

```bash
npx vitest run
npx astro check
npx astro build
```

Attendu : **tous verts** · `astro check` **0 error** · build inchangé (le CMS ne crée aucune page Astro).

- [ ] **Step 7: Commit**

```bash
git add public/admin/config.yml src/lib/cms-config.test.ts
git commit -m "feat(p3): add projects collection to Sveltia CMS config"
```

---

### Task C2: Créer un projet via `/admin` — preuve de R6 (**geste utilisateur**)

**Files:** aucun fichier écrit par l'agent. Le CMS écrit le contenu.

**Interfaces:**
- Consumes: la config de T-C1.
- Produces: la preuve de R6 (fichier conforme au schéma), plus la validation empirique de `value_field: '{{slug}}'`.

**Contexte :** cette tâche **ne peut pas être exécutée par un agent** — le Plan 2 l'a établi : le mode « Work with Local Repository » exige le sélecteur de dossier **natif** du navigateur, qu'un navigateur piloté ne peut pas satisfaire, et le mode production exige le PAT de l'utilisateur. Le rôle de l'agent est de préparer, puis de **vérifier** le fichier produit.

Rappel des pièges documentés au Plan 2 (README §« Images de couverture : deux pièges ») : couvertures de 30–100 Ko maximum ; en cas de sauvegarde échouée, regarder l'onglet Actions avant de réessayer.

- [ ] **Step 1: L'utilisateur crée un projet de test via le CMS**

En local (`npm run dev`, Chromium, `http://localhost:4321/admin/index.html`, « Work with Local Repository ») **ou** en production (`https://bendevcat.github.io/admin/`, « Sign In Using Access Token »).

Remplir : titre, description, statut ≠ `actif` (pour éprouver le `select`), au moins **deux** technos dans `stack`, un `repoUrl`, et **au moins un article** dans « Articles liés ». Laisser `startDate`, `demoUrl`, `cover` et `coverAlt` **vides** — c'est ce qui met `omit_empty_optional_fields` à l'épreuve sur cette collection.

- [ ] **Step 2: Vérifier le fichier produit (agent)**

```bash
git status --short
cat src/content/projects/<slug>/index.md
npx astro build
```

Contrôles, tous binaires :
1. Chemin = `src/content/projects/<slug>/index.md` (structure de page bundle).
2. Les champs laissés vides sont **absents** du frontmatter — pas présents et vides.
3. `status` porte la valeur choisie ; `featured: false` est conservé (`false` ≠ vide).
4. `relatedPosts` contient un **id d'article existant** (nom de dossier sous `src/content/blog/`) — c'est la vérification empirique de `value_field`.
5. `astro build` **passe** : le schéma Zod valide le fichier écrit par le CMS et la référence résout.
6. La fiche apparaît sur `/projets` et sa page `/projets/<slug>/` liste l'article lié.

- [ ] **Step 3: Nettoyer**

Supprimer le projet de test (via le CMS ou `rm -rf`), relancer `npx astro build`, vérifier que l'arbre est propre et que le build repasse.

- [ ] **Step 4: Consigner et committer**

Reporter le résultat dans le ledger (R6 → `Done` avec le SHA ou la preuve), puis commiter ce qui doit l'être.

---

## Phase Z — Verification

### Task Z1: Audit canonique

- [ ] **Step 1: Lancer l'audit**

```
/anti-drift-planning:verify 3
```

Non contournable, non résumable de mémoire. Elle échoue sur toute entrée `pending-user` du log de déviations et exige un statut explicite `Done`/`Deferred`/`Cut` pour chacun des 7 critères.

- [ ] **Step 2: Ship — uniquement sur verdict PASS**

Script de release + tag `milestone-plan-3`. **Jamais** avant un PASS.

---

## Self-Review

**1. Spec coverage** — R1 → T-A1 (schéma) + T-A2 (≥ 2 fiches réelles, la clause « ≥ 2 fiches chargées » du critère) · R2 → T-B1 (Step 4 vérifie explicitement les 4 champs) · R3 → T-B2 (Step 8 vérifie « seules les fiches de ce statut restent visibles » par comptage) · R4 → T-B3 (Step 2 vérifie corps + `repoUrl`/`demoUrl`) · R5 → T-A2 (données des deux côtés) + T-B3 (projet → articles) + T-B4 (article → projets), clause « aucun `undefined` » vérifiée par `grep` sur la sortie construite dans les deux tâches · R6 → T-C1 (config + tests) + T-C2 (création réelle) · R7 → contrôle 375px et dark/light dans T-B1, T-B2, T-B3, T-B4. Phases spec A/B/C/Z toutes couvertes. **Aucun trou.**

**2. Placeholder scan** — un seul emplacement volontairement non résolu : les **valeurs réelles** des fiches de T-A2 (titres, URLs, dates des projets de Benoît), qui ne peuvent pas être inventées. Elles sont recueillies au gate de pré-flight et le plan est **amendé avant exécution** (précédent Plan 2 : la version du CDN Sveltia, amendée au gate, n'a pas été traitée comme une déviation). Aucun « TBD », aucune étape sans code.

**3. Type consistency** — `sortProjects` / `collectStacks` / `getSortedProjects` (T-A1) sont appelés sous ces noms exacts en T-B1, T-B2, T-B3, T-B4 · `PROJECT_STATUS_META` (T-B1) est réutilisé tel quel en T-B3 · `ALL` / `matchesFilters` (T-B2) sont importés par le script et par le test · les attributs `data-project-card` / `data-status` / `data-stack` posés par `ProjectCard.astro` (T-B1) sont ceux que lit `project-filters.ts` (T-B2) · `data-project-filters` / `data-projects-empty` / `data-filter-status` / `data-filter-stack` sont cohérents entre la page (T-B2 Step 7), le script (T-B2 Step 6) et la règle CSS (T-B2 Step 5) · `PROJECT_STATUSES` (T-A1) est consommé par la page (T-B2) et par le test CMS (T-C1) · `sortAndFilter` est importé de `src/lib/posts.ts` avec sa signature existante.

---

**Ordre d'exécution :** T-A1 → T-A2 → T-B1 → T-B2 → T-B3 → T-B4 → T-C1 → T-C2 → Z1.
**Après chaque tâche :** mettre à jour le ledger (statut + SHA) et le committer (`chore(p3): ledger after T<x>`).
