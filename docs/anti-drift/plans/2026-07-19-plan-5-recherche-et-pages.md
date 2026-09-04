# Plan 5 — Recherche & pages transverses — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** livrer le v1 du site — recherche Pagefind ⌘K sur tout le site, tags agrégés cross-collection, filtres catégorie/tag sur `/blog`, et les 3 pages transverses (`/a-propos`, `/transparence-ia`, `/404`).

**Architecture:** aucun framework, aucun runtime serveur. Pagefind indexe le HTML **après** `astro build` (étape ajoutée au script `build`, donc CI incluse) et n'indexe que les pages de détail des 4 collections (`data-pagefind-body`). Le modal ⌘K est du JS vanilla qui charge l'API Pagefind en import dynamique au premier ouverture. Les tags sont agrégés au build par un module pur (`src/lib/tags.ts`) consommé par `/tags` et `/tags/[tag]`. Les filtres `/blog` réutilisent le moteur à facettes existant (`src/lib/facetFilters.ts` + `src/scripts/facet-filters.ts`), sans le modifier.

**Tech Stack:** Astro 7, Tailwind 4, TypeScript, Vitest, Pagefind 1.5.2 (nouvelle devDependency), `<dialog>` natif.

**Spec:** `docs/anti-drift/specs/2026-07-19-plan-5-recherche-et-pages.md`
**Design de référence:** `docs/anti-drift/specs/2026-07-19-site-perso-design.md`

---

## Global Constraints

Valeurs reprises **verbatim** de la spec P5 et de la spec de design. Elles s'appliquent à toutes les tâches.

- **Pas de framework UI.** Modal de recherche et filtres = **JS vanilla** (spec P5 §6.2). Aucun îlot React/Preact (design §7).
- **Ordre de build Pagefind** : Pagefind indexe le HTML **après** `astro build` → l'étape doit vivre dans le script de build / l'étape CI **avant** le déploiement (spec P5 §6.1).
- **`base` reste `/`** et `site` reste `https://bendevcat.github.io` — le domaine custom est **hors périmètre** (spec P5 §5 et §6.3). Ne pas créer `public/CNAME`.
- **URLs en français** (design §4) : `/tags`, `/tags/[tag]`, `/a-propos`, `/transparence-ia`, `/404`.
- **Enhancement progressif** : tout contrôle piloté par JS est rendu `hidden` côté serveur et révélé par son script — sans JS, aucun contrôle mort n'est affiché et tout le contenu reste visible (règle établie aux Plans 3 et 4, `src/styles/global.css:205-226`).
- **Direction visuelle** : tokens `--color-*` existants uniquement (`src/styles/global.css:9-37`), `font-mono` pour tout ce qui est technique (kickers, tags, méta), **dark ET light**, **aucun scroll horizontal à 375px**.
- **Les entrées `draft: true` n'ont pas de route publique** — elles ne doivent apparaître ni dans les tags, ni dans la recherche, ni dans aucune liste (règle des Plans 1/4, `src/lib/posts.ts:5`, `src/lib/prompts.ts:30`, `src/lib/skills.ts:22`).
- **Toute divergence entre un module pur et son usage doit casser un test**, pas une page (règle du Plan 4).

**Base mesurée avant la première tâche** (2026-09-04, commit `b7db9dd`) : `vitest` **93/93 (9 fichiers)** · `astro check` **0 error / 0 warning** · `astro build` **18 pages**. Toute tâche qui fait baisser un de ces trois chiffres sans le dire est en faute.

---

## File Structure

**Créés :**

| Fichier | Responsabilité |
|---|---|
| `src/lib/search.ts` | Pur. Déduit la collection d'une URL de résultat Pagefind, groupe les résultats par collection, porte les libellés. Aucun import. |
| `src/lib/search.test.ts` | Tests unitaires de `search.ts`. |
| `src/lib/tags.ts` | Agrégation des tags des 4 collections : normalisation, comptage, groupement. Pur au cœur (`collectTagIndex`, `groupByCollection`), plus un wrapper `getTagIndex()` qui appelle `getCollection`. |
| `src/lib/tags.test.ts` | Tests unitaires de `tags.ts`. |
| `src/components/SearchDialog.astro` | Le `<dialog>` de recherche (markup seul, zéro logique). |
| `src/scripts/search.ts` | Ouverture ⌘K / clic, chargement paresseux de l'API Pagefind, rendu des résultats. |
| `src/scripts/blog-filters.ts` | Pré-sélection d'une facette `/blog` depuis la puce cliquée (au-dessus du moteur existant, sans le modifier). |
| `src/pages/tags/index.astro` | `/tags` — index de tous les tags avec leur compte. |
| `src/pages/tags/[tag].astro` | `/tags/<tag>` — agrégation cross-collection. |
| `src/pages/a-propos.astro` | `/a-propos` — bio, parcours, le pourquoi. |
| `src/pages/transparence-ia.astro` | `/transparence-ia` — les 3 niveaux et leur signalétique. |
| `src/pages/404.astro` | `/404` custom. |

**Modifiés :**

| Fichier | Modification |
|---|---|
| `package.json` | devDependency `pagefind`, script `build` enchaîné, script `test` inchangé. |
| `src/pages/blog/[...slug].astro` | `data-pagefind-body` sur l'article. |
| `src/pages/projets/[...slug].astro` | `data-pagefind-body`. |
| `src/pages/prompts/[...slug].astro` | `data-pagefind-body`. |
| `src/pages/skills/[...slug].astro` | `data-pagefind-body`. |
| `src/components/Header.astro` | Bouton 🔍 ⌘K ; lien « À propos » activé (T-C2). |
| `src/layouts/BaseLayout.astro` | Monte `SearchDialog` + son script sur toutes les pages. |
| `src/components/ArticleCard.astro` | Puce catégorie rendue cliquable (lien étiré, cf. T-B3). |
| `src/pages/blog/index.astro` | Barre de puces catégorie + tag. |
| `src/components/AiBanner.astro` | Lien « en savoir plus » vers `/transparence-ia`. |
| `src/lib/cms-config.test.ts` | Rien. **Ne pas y toucher** : aucun critère de ce plan ne concerne le CMS. |
| `README.md` | Table des commandes : `npm run build` fait désormais deux choses. |

**Non modifiés, volontairement :** `src/lib/facetFilters.ts`, `src/scripts/facet-filters.ts`, `src/lib/posts.ts`, `src/lib/prompts.ts`, `src/lib/skills.ts`, `src/lib/projects.ts`, `astro.config.mjs`, `.github/workflows/deploy.yml`, `public/admin/config.yml`.

---

## Requirement → Task map

| Critère | Tâche(s) | Ce qui l'établit |
|---|---|---|
| R1 recherche ⌘K sur tout le site | T-A1, **T-A2** | ⌘K ouvre · un terme renvoie des résultats des **4** collections · un clic mène à la bonne page |
| R2 `/tags` liste tous les tags | T-B1 | chaque tag présent dans ≥ 1 collection est listé, avec son compte |
| R3 `/tags/<tag>` agrège cross-collection | T-B2 | un tag partagé liste les entrées **des 4 collections** ensemble |
| R4 filtres catégorie/tag sur `/blog` | T-B3 | cliquer une puce → seuls les articles correspondants restent (vérifié **par comptage**) |
| R5 `/a-propos` rendu | T-C2 | la page affiche la bio réelle fournie par l'utilisateur |
| R6 `/transparence-ia` explique les 3 niveaux | T-C1 | `none` / `partial` / `full` décrits **et** leur signalétique couleur montrée |
| R7 `/404` custom | T-C3 | une URL inexistante rend la 404 stylée, pas celle du serveur |
| R8 index Pagefind au build **et** en prod | **T-A1**, T-D1 | `npm run build` produit `dist/pagefind/` · le site déployé sert l'index |

---

## Additions au-delà de la lettre de la spec — **à ratifier au gate de pré-flight**

Aucune n'est exigée par un critère R. Listées ici pour être approuvées ou coupées **explicitement**, jamais glissées en silence.

1. **Lien de nav « À propos » activé** (T-C2) — `src/components/Header.astro:17` le rend aujourd'hui non cliquable (« Bientôt disponible »). Sans cette activation, `/a-propos` n'est atteignable qu'en tapant l'URL. Même addition, même justification que celles ratifiées aux Plans 3 (« Projets ») et 4 (« Prompts »/« Skills »).
2. **Lien « en savoir plus » depuis `AiBanner` vers `/transparence-ia`** (T-C1) — R6 exige que la page existe et explique ; rien n'exige qu'on y accède depuis un article. Sans ce lien, la page n'est atteignable depuis aucune surface du site (elle n'est pas dans la nav, design §4).
3. **Lien « tous les tags » depuis `/blog` vers `/tags`** (T-B3) — même raison : `/tags` n'est dans aucune nav.
4. **Puce catégorie de `ArticleCard` rendue cliquable** (T-B3) — voir la décision « lecture de R4 » ci-dessous. Techniquement : la carte passe en `<article class="relative">`, le `<a>` devient un **lien étiré** (`after:absolute after:inset-0`) et la puce devient un `<button>` au-dessus. La carte reste cliquable **en entier**, comme aujourd'hui ; ce qui change, c'est qu'un clic **sur la puce** filtre au lieu d'ouvrir l'article.

## Décisions d'implémentation tranchées par ce plan (spec muette — ratification au gate)

- **Lecture de R4.** Le critère s'intitule « Filtres catégorie/tag actifs sur `/blog` » et la user story dit « les puces catégorie et tag **deviennent** cliquables ». Aujourd'hui la seule puce existante est la puce catégorie de la carte ; **aucune puce tag n'est rendue nulle part**. Ce plan satisfait les deux lectures : une **barre de puces** catégorie + tag en tête de `/blog` (toutes cliquables, moteur à facettes existant) **et** la puce catégorie de la carte rendue cliquable (addition n°4). Les tags **ne sont pas** ajoutés aux cartes : cela redessinerait une carte livrée au Plan 1, sans qu'aucun critère ne l'exige.
- **Portée de l'index Pagefind** : seules les **pages de détail des 4 collections** portent `data-pagefind-body`, donc seules elles sont indexées (13 pages sur les 18 buildées). Conséquence assumée : `/a-propos`, `/transparence-ia`, les index et `/tags` **ne remontent pas** dans la recherche. R1 demande que les résultats couvrent les 4 collections, pas que tout le site soit indexé ; indexer les index produirait des doublons sans contenu propre.
- **Collection déduite de l'URL** (`src/lib/search.ts`), pas d'un `data-pagefind-meta` : la règle est alors une fonction pure testable sans build, et rien à maintenir dans 4 gabarits.
- **Normalisation des tags** : la clé d'URL d'un tag est son slug (minuscules, accents retirés, non-alphanumériques → `-`). `Sécurité` et `securite` tombent donc sur la même page. Le **libellé affiché** est la première graphie rencontrée dans l'ordre de parcours (blog → projets → prompts → skills), pas le slug.
- **Ordre des entrées d'un tag** : groupées par collection dans l'ordre `blog, projets, prompts, skills`, et à l'intérieur d'un groupe, l'ordre canonique de la collection (blog : `pubDate` desc ; les trois autres : titre A→Z) — en composant les helpers déjà testés, jamais en re-triant à la main.
- **Ordre de `/tags`** : par compte décroissant, puis libellé A→Z.
- **`/404`** : Astro génère `dist/404.html`, que GitHub Pages sert automatiquement sur toute URL inconnue. Aucune config supplémentaire.
- **Dégradation en dev** : `dist/pagefind/` n'existe pas pendant `astro dev`. Le modal s'ouvre quand même et affiche « index indisponible — lancer `npm run build` », au lieu d'échouer en silence.

---

## Phase A — Recherche (R1, R8)

### Task A1: Pagefind au build — index généré, portée maîtrisée, garde-fou de non-régression

**Files:**
- Modify: `package.json` (bloc `scripts`, bloc `devDependencies`)
- Modify: `src/pages/blog/[...slug].astro:45` (balise `<article>`)
- Modify: `src/pages/projets/[...slug].astro`, `src/pages/prompts/[...slug].astro`, `src/pages/skills/[...slug].astro` (conteneur de contenu principal)
- Modify: `README.md` (table des commandes)
- Create: `src/lib/buildPipeline.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces: `dist/pagefind/pagefind.js` après `npm run build` — consommé par T-A2 en import dynamique.

- [ ] **Step 1: Écrire le test de garde qui échoue**

Ce test est la seule chose qui empêchera quelqu'un de « nettoyer » le script de build et de faire disparaître l'index sans qu'aucune page ne casse. Il lit `package.json` — pas de mock, pas de build.

```ts
// src/lib/buildPipeline.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

describe('pipeline de build (R8)', () => {
  it('enchaîne pagefind APRÈS astro build', () => {
    const build: string = pkg.scripts.build;
    expect(build).toContain('astro build');
    expect(build).toContain('pagefind');
    // L'ordre est le fond du sujet : Pagefind indexe le HTML produit par
    // astro build (spec P5 §6.1). Inversé, il indexerait le dist précédent.
    expect(build.indexOf('astro build')).toBeLessThan(build.indexOf('pagefind'));
  });

  it('indexe le dossier réellement déployé', () => {
    // withastro/action@v3 publie `out-dir` (défaut `dist`) et lance
    // `npm run build` : indexer un autre dossier livrerait un site sans index.
    expect(pkg.scripts.build).toContain('--site dist');
  });

  it('déclare pagefind en dépendance (sinon la CI ne l’a pas)', () => {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(deps.pagefind).toBeDefined();
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

```bash
npx vitest run src/lib/buildPipeline.test.ts
```

Attendu : **3 échecs** (`scripts.build` vaut `astro build`, `pagefind` absent des deps).

- [ ] **Step 3: Installer Pagefind et enchaîner le build**

```bash
npm install --save-dev pagefind@^1.5.2
```

Puis dans `package.json`, remplacer la ligne du script `build` par :

```json
"build": "astro build && pagefind --site dist",
```

Ne toucher à **aucun autre script**. `dev`, `preview`, `test`, `check` restent identiques.

- [ ] **Step 4: Restreindre l'index aux pages de détail des 4 collections**

Ajouter l'attribut `data-pagefind-body` sur le conteneur du contenu principal de chacun des 4 gabarits de détail — et **nulle part ailleurs**.

Règle Pagefind à connaître : dès qu'**au moins une** page du site porte `data-pagefind-body`, **toute page qui ne le porte pas est exclue de l'index**. C'est le mécanisme qui limite l'index aux 13 pages de détail sans avoir à exclure les autres une par une.

- `src/pages/blog/[...slug].astro:45` → `<article class="mx-auto max-w-3xl px-4 py-10" data-pagefind-body>`
- `src/pages/projets/[...slug].astro`, `src/pages/prompts/[...slug].astro`, `src/pages/skills/[...slug].astro` → même attribut sur l'élément qui enveloppe titre + corps de la fiche. Les 4 gabarits partagent en fait la **même** racine `<article class="mx-auto max-w-3xl px-4 py-10">` (vérifié en T-A1).

Ne pas ajouter d'attribut sur le `<Header />` : il est hors de chaque `data-pagefind-body`, donc déjà exclu.

- [ ] **Step 5: Builder et compter ce qui est réellement indexé**

```bash
npm run build
```

Attendu : le build Astro annonce **18 pages**, puis Pagefind affiche une ligne du type `Indexed 13 pages`.

Vérifier les fichiers et le décompte :

```bash
ls dist/pagefind/pagefind.js && grep -c 'data-pagefind-body' -r src/pages
```

Attendu : `dist/pagefind/pagefind.js` existe, et **exactement 4 fichiers** de `src/pages` portent l'attribut. Le nombre de pages indexées est celui qu'annonce Pagefind en fin de build — le relever tel quel. **Si le compte n'est pas 13** (6 blog + 2 projets + 3 prompts + 2 skills), c'est qu'un `data-pagefind-body` manque ou qu'il y en a un de trop — corriger avant de continuer, ne pas « ajuster le chiffre attendu ».

- [ ] **Step 6: Prouver que le garde-fou mord**

```bash
npx vitest run src/lib/buildPipeline.test.ts
```
Attendu : **3 passent**.

Puis, temporairement, remettre `"build": "astro build"` dans `package.json`, relancer le même test : attendu **2 échecs**. Restaurer ensuite le script correct et relancer : **3 passent**. Un test qui ne casse jamais ne protège rien — cette manipulation le prouve.

- [ ] **Step 7: Suite complète + typecheck**

```bash
npx vitest run && npx astro check
```
Attendu : **96/96 (10 fichiers)** · `0 error, 0 warning`.

- [ ] **Step 8: Documenter la commande dans le README**

Dans la table des commandes, la ligne `npm run build` doit dire que la commande **build le site puis génère l'index de recherche Pagefind dans `dist/pagefind/`**. Une personne qui lance `astro build` à la main obtient un site **sans recherche** : le dire noir sur blanc.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json src/lib/buildPipeline.test.ts src/pages README.md
git commit -m "feat(p5): index Pagefind genere au build, limite aux 4 collections"
```

---

### Task A2: Modal de recherche ⌘K

**Files:**
- Create: `src/lib/search.ts`, `src/lib/search.test.ts`
- Create: `src/components/SearchDialog.astro`, `src/scripts/search.ts`
- Modify: `src/components/Header.astro` (bouton 🔍), `src/layouts/BaseLayout.astro` (montage)

**Interfaces:**
- Consumes: `dist/pagefind/pagefind.js` (T-A1).
- Produces: rien pour les tâches suivantes.

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
// src/lib/search.test.ts
import { describe, it, expect } from 'vitest';
import { COLLECTION_LABELS, collectionFromUrl, groupResultsByCollection } from './search';

describe('collectionFromUrl', () => {
  it('reconnaît les 4 collections sur des URLs de détail', () => {
    expect(collectionFromUrl('/blog/mon-article/')).toBe('blog');
    expect(collectionFromUrl('/projets/gha-svu/')).toBe('projects');
    expect(collectionFromUrl('/prompts/macos-clone/')).toBe('prompts');
    expect(collectionFromUrl('/skills/superpowers/')).toBe('skills');
  });

  it('accepte une URL absolue et une URL sans slash final', () => {
    expect(collectionFromUrl('https://bendevcat.github.io/blog/a/')).toBe('blog');
    expect(collectionFromUrl('/skills/a')).toBe('skills');
  });

  it("rend null hors des 4 collections — jamais un groupe inventé", () => {
    expect(collectionFromUrl('/a-propos/')).toBeNull();
    expect(collectionFromUrl('/')).toBeNull();
    // Piège : le préfixe doit être un SEGMENT entier, pas une sous-chaîne.
    expect(collectionFromUrl('/blogueurs/x/')).toBeNull();
  });
});

describe('groupResultsByCollection', () => {
  it('groupe dans l’ordre blog → projets → prompts → skills et ignore le reste', () => {
    const groups = groupResultsByCollection([
      { url: '/skills/a/', title: 'A', excerpt: '' },
      { url: '/blog/b/', title: 'B', excerpt: '' },
      { url: '/a-propos/', title: 'C', excerpt: '' },
      { url: '/blog/d/', title: 'D', excerpt: '' },
    ]);
    expect(groups.map((g) => g.collection)).toEqual(['blog', 'skills']);
    expect(groups[0].results).toHaveLength(2);
    expect(groups[0].results[0].title).toBe('B'); // ordre d’arrivée préservé
  });

  it('ne crée pas de groupe vide', () => {
    expect(groupResultsByCollection([])).toEqual([]);
  });
});

describe('COLLECTION_LABELS', () => {
  it('a un libellé FR pour chacune des 4 collections', () => {
    expect(Object.keys(COLLECTION_LABELS).sort()).toEqual(
      ['blog', 'projects', 'prompts', 'skills'],
    );
    for (const label of Object.values(COLLECTION_LABELS)) expect(label.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run src/lib/search.test.ts
```
Attendu : échec à l'import (`./search` n'existe pas).

- [ ] **Step 3: Écrire `src/lib/search.ts`**

```ts
/**
 * Règles de présentation des résultats Pagefind — module PUR.
 *
 * AUCUN import (surtout pas `astro:content`) : ce module est chargé par le
 * navigateur (src/scripts/search.ts) ET par les tests unitaires.
 *
 * La collection est déduite du PREMIER SEGMENT de l'URL plutôt que d'un
 * `data-pagefind-meta` posé dans 4 gabarits : la règle devient une fonction
 * testable sans build, et il n'y a qu'un seul endroit à corriger si une
 * route change.
 */

export type SearchCollection = 'blog' | 'projects' | 'prompts' | 'skills';

/** Segment d'URL (routes FR, design §4) → clé de collection. */
const SEGMENT_TO_COLLECTION: Record<string, SearchCollection> = {
  blog: 'blog',
  projets: 'projects',
  prompts: 'prompts',
  skills: 'skills',
};

/** Libellé affiché en tête de groupe dans le modal. */
export const COLLECTION_LABELS: Record<SearchCollection, string> = {
  blog: 'Articles',
  projects: 'Projets',
  prompts: 'Prompts',
  skills: 'Skills',
};

/** Ordre d'affichage des groupes — figé, indépendant de l'ordre des résultats. */
export const COLLECTION_ORDER: SearchCollection[] = ['blog', 'projects', 'prompts', 'skills'];

export interface SearchResult {
  url: string;
  title: string;
  excerpt: string;
}

export interface SearchGroup {
  collection: SearchCollection;
  label: string;
  results: SearchResult[];
}

/**
 * Collection d'une URL de résultat, ou `null` hors des 4 collections.
 * Le segment est comparé en ENTIER : `/blogueurs/x/` n'est pas du blog.
 */
export function collectionFromUrl(url: string): SearchCollection | null {
  // Base arbitraire : n'est utilisée que si `url` est relative, et on ne lit
  // que le chemin — jamais l'hôte.
  let pathname: string;
  try {
    pathname = new URL(url, 'https://placeholder.invalid').pathname;
  } catch {
    return null;
  }
  const segment = pathname.split('/').filter(Boolean)[0];
  if (!segment) return null;
  // Une URL d'INDEX (`/blog/`) n'a qu'un segment : ce n'est pas une entrée.
  if (pathname.split('/').filter(Boolean).length < 2) return null;
  return SEGMENT_TO_COLLECTION[segment] ?? null;
}

/**
 * Groupe les résultats par collection, dans `COLLECTION_ORDER`.
 * Les résultats hors des 4 collections sont écartés — jamais regroupés sous
 * un intitulé fourre-tout. Aucun groupe vide n'est produit.
 */
export function groupResultsByCollection(results: SearchResult[]): SearchGroup[] {
  const buckets = new Map<SearchCollection, SearchResult[]>();
  for (const result of results) {
    const collection = collectionFromUrl(result.url);
    if (!collection) continue;
    const bucket = buckets.get(collection);
    if (bucket) bucket.push(result);
    else buckets.set(collection, [result]);
  }
  return COLLECTION_ORDER.filter((c) => buckets.has(c)).map((collection) => ({
    collection,
    label: COLLECTION_LABELS[collection],
    results: buckets.get(collection) as SearchResult[],
  }));
}
```

- [ ] **Step 4: Lancer les tests — ils passent**

```bash
npx vitest run src/lib/search.test.ts
```
Attendu : **6 passent**.

- [ ] **Step 5: Écrire `src/components/SearchDialog.astro`**

Markup seul, aucune logique. Un `<dialog>` natif : il gère l'`Escape`, le focus trap et le fond modal sans une ligne de JS.

```astro
---
// Modal de recherche (spec P5 §6.2 : JS vanilla). Monté par BaseLayout sur
// toutes les pages ; piloté par src/scripts/search.ts.
---

<dialog
  id="search-dialog"
  class="m-auto w-[min(40rem,92vw)] rounded-xl border border-line bg-surface p-0 text-text backdrop:bg-black/60"
  aria-label="Recherche sur le site"
>
  <form method="dialog" class="flex items-center gap-2 border-b border-line px-4 py-3">
    <span class="font-mono text-sm text-acc" aria-hidden="true">/</span>
    <input
      id="search-input"
      type="search"
      autocomplete="off"
      placeholder="Rechercher un article, un projet, un prompt…"
      class="w-full bg-transparent py-1 text-text outline-none placeholder:text-muted"
      aria-controls="search-results"
    />
    <button
      type="submit"
      class="rounded-md border border-line px-2 py-1 font-mono text-xs text-muted transition-colors hover:border-acc hover:text-acc"
      aria-label="Fermer la recherche"
    >esc</button>
  </form>

  <div
    id="search-results"
    class="max-h-[60vh] overflow-y-auto px-4 py-3"
    role="region"
    aria-live="polite"
    aria-label="Résultats de recherche"
  >
    <p class="font-mono text-xs text-muted">Tapez au moins 2 caractères.</p>
  </div>
</dialog>
```

- [ ] **Step 6: Écrire `src/scripts/search.ts`**

Trois pièges à traiter explicitement, tous documentés dans le fichier :

1. **Vite ne doit pas analyser l'import.** `/pagefind/pagefind.js` n'existe pas dans les sources — il est produit **après** le build. **Corrigé en T-A2 après mesure : la parade « variable + `/* @vite-ignore */` » NE MARCHE PAS.** Vite inline `import.meta.env.BASE_URL` à la compilation, le spécificateur redevient une constante, Vite route l'import par son helper `__vitePreload` et laisse le placeholder `__VITE_PRELOAD__` non remplacé ; le référencer lève une `ReferenceError` avalée par le `catch`, et le message de dégradation « dev » s'affiche **en production**. La seule parade mesurée est de sortir l'import du graphe de modules : `const importPagefind = new Function('specifier', 'return import(specifier)')`. Contrôle de non-régression : `grep -c '__VITE_PRELOAD__' dist/index.html` doit renvoyer **0**.
2. **En dev, l'index n'existe pas** → le modal doit le dire, pas échouer en silence.
3. **`excerpt` de Pagefind contient du HTML** (`<mark>`) — il va dans `innerHTML`, jamais le `title` ni l'`url`, qui passent par `textContent` / `setAttribute`.

```ts
import {
  groupResultsByCollection,
  type SearchGroup,
  type SearchResult,
} from '../lib/search';

const dialog = document.querySelector<HTMLDialogElement>('#search-dialog');
const input = document.querySelector<HTMLInputElement>('#search-input');
const output = document.querySelector<HTMLElement>('#search-results');
const triggers = Array.from(document.querySelectorAll<HTMLElement>('[data-search-open]'));

if (dialog && input && output) {
  type PagefindResult = { data: () => Promise<{ url: string; excerpt: string; meta?: { title?: string } }> };
  type PagefindApi = { init: () => void; search: (t: string) => Promise<{ results: PagefindResult[] }> };

  let api: PagefindApi | null = null;
  let loadFailed = false;
  let token = 0; // anti-course : seule la dernière recherche a le droit d'écrire

  const message = (text: string) => {
    output.replaceChildren();
    const p = document.createElement('p');
    p.className = 'font-mono text-xs text-muted';
    p.textContent = text;
    output.append(p);
  };

  const loadApi = async (): Promise<PagefindApi | null> => {
    if (api || loadFailed) return api;
    try {
      // `import.meta.env.BASE_URL` vaut '/' (base du site, spec §6.3).
      // L'import passe par `importPagefind` (cf. piège n°1) : un `import()`
      // écrit littéralement ici serait réécrit par Vite et échouerait.
      const url = `${import.meta.env.BASE_URL}pagefind/pagefind.js`;
      const mod = await importPagefind(url);
      mod.init();
      api = mod;
    } catch {
      loadFailed = true; // en dev (`astro dev`), dist/pagefind/ n'existe pas
    }
    return api;
  };

  const render = (groups: SearchGroup[], term: string) => {
    output.replaceChildren();
    if (groups.length === 0) {
      message(`Aucun résultat pour « ${term} ».`);
      return;
    }
    for (const group of groups) {
      const section = document.createElement('section');
      section.className = 'mb-4';
      const heading = document.createElement('h2');
      heading.className = 'font-mono text-xs uppercase tracking-wide text-acc';
      heading.textContent = `${group.label} (${group.results.length})`;
      const list = document.createElement('ul');
      list.className = 'mt-2 flex flex-col gap-1';
      for (const result of group.results) {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = result.url;
        link.className = 'block rounded-lg px-2 py-2 hover:bg-acc-dim focus-visible:bg-acc-dim';
        const title = document.createElement('span');
        title.className = 'block text-sm text-text';
        title.textContent = result.title; // texte, jamais innerHTML
        const excerpt = document.createElement('span');
        excerpt.className = 'mt-0.5 block font-mono text-xs text-muted';
        excerpt.innerHTML = result.excerpt; // Pagefind y met des <mark>
        link.append(title, excerpt);
        item.append(link);
        list.append(item);
      }
      section.append(heading, list);
      output.append(section);
    }
  };

  const run = async (term: string) => {
    const current = ++token;
    if (term.trim().length < 2) {
      message('Tapez au moins 2 caractères.');
      return;
    }
    const pagefind = await loadApi();
    if (!pagefind) {
      message('Index de recherche indisponible — lancez `npm run build`.');
      return;
    }
    message('Recherche…');
    const raw = await pagefind.search(term);
    const loaded = await Promise.all(raw.results.slice(0, 20).map((r) => r.data()));
    if (current !== token) return; // une frappe plus récente a pris la main
    const results: SearchResult[] = loaded.map((d) => ({
      url: d.url,
      title: d.meta?.title ?? d.url,
      excerpt: d.excerpt,
    }));
    render(groupResultsByCollection(results), term);
  };

  let timer: ReturnType<typeof setTimeout>;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const term = input.value;
    timer = setTimeout(() => void run(term), 150);
  });

  const open = () => {
    if (!dialog.open) dialog.showModal();
    input.focus();
    input.select();
  };

  for (const trigger of triggers) trigger.addEventListener('click', open);

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault(); // ⌘K est pris par la barre d'adresse de certains navigateurs
      open();
    }
  });
}
```

- [ ] **Step 7: Brancher le déclencheur et le montage**

Dans `src/components/Header.astro`, entre `<nav>` et `<ThemeToggle />`, ajouter le bouton — **rendu `hidden` côté serveur** et révélé par le script (règle d'enhancement progressif : sans JS, il n'ouvrirait rien) :

```astro
<button
  type="button"
  data-search-open
  hidden
  class="flex items-center gap-2 rounded-lg border border-line px-2 py-1 font-mono text-xs text-muted transition-colors hover:border-acc hover:text-acc"
  aria-label="Rechercher sur le site"
>
  <span aria-hidden="true">🔍</span>
  <kbd class="hidden sm:inline">⌘K</kbd>
</button>
```

Ajouter la révélation en fin de `src/scripts/search.ts` (dans le `if (dialog && input && output)`) :

```ts
for (const trigger of triggers) trigger.hidden = false;
```

Et la règle de masquage dans `src/styles/global.css`, à côté des sélecteurs `[hidden]` existants (`:219-226`) — même raison qu'au Plan 4 : `[hidden]` du preflight Tailwind a la même spécificité que l'utilitaire `flex` porté par le bouton :

```css
[data-search-open][hidden] { display: none !important; }
```

Dans `src/layouts/BaseLayout.astro`, importer `SearchDialog` et le monter juste avant `</body>`, suivi du script :

```astro
<SearchDialog />
<script>
  import '../scripts/search.ts';
</script>
```

- [ ] **Step 8: Tests, typecheck, build**

```bash
npx vitest run && npx astro check && npm run build
```
Attendu : **102/102 (11 fichiers)** · `0 error, 0 warning` · 18 pages + `Indexed 13 pages`.

- [ ] **Step 9: Smoke navigateur — R1, en production locale**

`astro dev` **ne sert pas** l'index. Servir le build :

```bash
npx astro preview
```

Sur `http://localhost:4321/` :
1. **⌘K** (et `Ctrl+K`) ouvre le modal, le champ a le focus. Cliquer 🔍 l'ouvre aussi. `Escape` le ferme.
2. Taper **`git`** — terme choisi parce qu'il est présent dans **les 4 collections** (mesuré sur les sources : blog 5, projets 2, prompts 2, skills 2). Attendu : **4 groupes** — Articles, Projets, Prompts, Skills.
3. **Cliquer le premier résultat de chaque groupe** : l'URL ouverte est bien celle du titre affiché, et la page répond (pas de 404). Les 4 clics sont à faire, pas un seul.
4. **375px, dark et light** : le modal ne déborde pas, `document.documentElement.scrollWidth === document.documentElement.clientWidth`.

Consigner les comptes obtenus par groupe dans le rapport de tâche. « Ça marche » n'est pas une mesure.

- [ ] **Step 10: Commit**

```bash
git add src/lib/search.ts src/lib/search.test.ts src/components src/scripts/search.ts src/layouts/BaseLayout.astro src/styles/global.css
git commit -m "feat(p5): modal de recherche pagefind ⌘K sur les 4 collections"
```

---

## Phase B — Tags cross-collection (R2, R3, R4)

### Task B1: `src/lib/tags.ts` + page `/tags`

**Files:**
- Create: `src/lib/tags.ts`, `src/lib/tags.test.ts`, `src/pages/tags/index.astro`

**Interfaces:**
- Consumes: `getPublishedPosts` (`src/lib/posts.ts`), `getSortedProjects` (`src/lib/projects.ts`), `getSortedPrompts` (`src/lib/prompts.ts`), `getSortedSkills` (`src/lib/skills.ts`).
- Produces, consommé par T-B2 :
  - `tagSlug(tag: string): string`
  - `collectTagIndex(buckets: TagBuckets): TagSummary[]` où `TagSummary = { slug: string; label: string; count: number }`
  - `entriesWithTag<T extends TagEntryLike>(entries: T[], slug: string): T[]`
  - `getTagBuckets(): Promise<TagBuckets>` où `TagBuckets = { blog; projects; prompts; skills }`
  - `TAG_COLLECTIONS`, `TAG_COLLECTION_LABELS`

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
// src/lib/tags.test.ts
import { describe, it, expect } from 'vitest';
import { collectTagIndex, entriesWithTag, tagSlug, TAG_COLLECTIONS } from './tags';

const entry = (...tags: string[]) => ({ data: { tags } }) as any;

describe('tagSlug', () => {
  it('minuscule, sans accent, séparateurs normalisés', () => {
    expect(tagSlug('Sécurité')).toBe('securite');
    expect(tagSlug('CI/CD')).toBe('ci-cd');
    expect(tagSlug('  anti drift  ')).toBe('anti-drift');
    expect(tagSlug('méthodologie')).toBe('methodologie');
  });

  it('est idempotent (le slug d’un slug est le même slug)', () => {
    expect(tagSlug(tagSlug('CI/CD'))).toBe('ci-cd');
  });

  it('ne rend jamais de tirets en tête ou en queue', () => {
    expect(tagSlug('--k8s--')).toBe('k8s');
  });
});

describe('collectTagIndex', () => {
  const buckets = {
    blog: [entry('DevOps', 'linux'), entry('devops')],
    projects: [entry('DevOps')],
    prompts: [entry('anti-drift')],
    skills: [entry('anti-drift')],
  } as any;

  it('compte les entrées de TOUTES les collections pour un tag', () => {
    const index = collectTagIndex(buckets);
    const devops = index.find((t) => t.slug === 'devops');
    expect(devops?.count).toBe(3); // 2 blog + 1 projet, graphies différentes
  });

  it('garde la PREMIÈRE graphie rencontrée comme libellé', () => {
    const index = collectTagIndex(buckets);
    expect(index.find((t) => t.slug === 'devops')?.label).toBe('DevOps');
  });

  it('trie par compte décroissant puis libellé A→Z', () => {
    const index = collectTagIndex(buckets);
    expect(index.map((t) => t.slug)).toEqual(['devops', 'anti-drift', 'linux']);
  });

  it('rend un index vide sans planter quand aucune entrée n’a de tag', () => {
    expect(collectTagIndex({ blog: [], projects: [], prompts: [], skills: [] } as any)).toEqual([]);
  });

  it('tolère une entrée sans champ tags', () => {
    const withoutTags = { data: {} } as any;
    expect(collectTagIndex({ blog: [withoutTags], projects: [], prompts: [], skills: [] } as any)).toEqual([]);
  });
});

describe('entriesWithTag', () => {
  it('compare sur le SLUG, pas sur la graphie', () => {
    const list = [entry('Sécurité'), entry('securite'), entry('linux')];
    expect(entriesWithTag(list, 'securite')).toHaveLength(2);
  });

  it('préserve l’ordre reçu (les helpers de collection ont déjà trié)', () => {
    const a = entry('x'), b = entry('x');
    expect(entriesWithTag([a, b], 'x')).toEqual([a, b]);
  });
});

describe('TAG_COLLECTIONS', () => {
  it('couvre les 4 collections, dans l’ordre d’affichage', () => {
    expect(TAG_COLLECTIONS).toEqual(['blog', 'projects', 'prompts', 'skills']);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run src/lib/tags.test.ts
```
Attendu : échec à l'import.

- [ ] **Step 3: Écrire `src/lib/tags.ts`**

```ts
import { getPublishedPosts } from './posts';
import { getSortedProjects, type ProjectEntry } from './projects';
import { getSortedPrompts, type PromptEntry } from './prompts';
import { getSortedSkills, type SkillEntry } from './skills';
import type { CollectionEntry } from 'astro:content';

/** Ordre d'affichage des groupes sur `/tags/<tag>` — figé. */
export const TAG_COLLECTIONS = ['blog', 'projects', 'prompts', 'skills'] as const;
export type TagCollection = (typeof TAG_COLLECTIONS)[number];

export const TAG_COLLECTION_LABELS: Record<TagCollection, string> = {
  blog: 'Articles',
  projects: 'Projets',
  prompts: 'Prompts',
  skills: 'Skills',
};

/** Le minimum qu'une entrée doit exposer pour être indexée par tag. */
export interface TagEntryLike {
  data: { tags?: string[] };
}

export interface TagBuckets {
  blog: CollectionEntry<'blog'>[];
  projects: ProjectEntry[];
  prompts: PromptEntry[];
  skills: SkillEntry[];
}

export interface TagSummary {
  slug: string;
  label: string;
  count: number;
}

/**
 * Clé d'URL d'un tag : minuscules, accents retirés, tout le reste réduit à des
 * tirets. `Sécurité` et `securite` tombent donc sur la MÊME page — c'est
 * voulu : les tags sont saisis à la main dans 4 collections et via le CMS,
 * deux graphies du même mot ne doivent pas produire deux pages orphelines.
 */
export function tagSlug(tag: string): string {
  return tag
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // marques diacritiques combinantes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Index de tous les tags des 4 collections.
 * Le libellé retenu est la PREMIÈRE graphie rencontrée dans l'ordre de
 * parcours `TAG_COLLECTIONS` — déterministe, donc le build est reproductible.
 * Tri : compte décroissant, puis libellé A→Z.
 */
export function collectTagIndex(buckets: TagBuckets): TagSummary[] {
  const index = new Map<string, TagSummary>();
  for (const collection of TAG_COLLECTIONS) {
    for (const entry of buckets[collection] as TagEntryLike[]) {
      for (const tag of entry.data.tags ?? []) {
        const slug = tagSlug(tag);
        if (!slug) continue;
        const existing = index.get(slug);
        if (existing) existing.count += 1;
        else index.set(slug, { slug, label: tag, count: 1 });
      }
    }
  }
  return [...index.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr'),
  );
}

/**
 * Entrées portant ce tag, comparé sur le SLUG.
 * L'ordre reçu est préservé : les helpers de collection (`getPublishedPosts`,
 * `getSorted*`) ont déjà appliqué l'ordre canonique — re-trier ici le
 * casserait en silence.
 */
export function entriesWithTag<T extends TagEntryLike>(entries: T[], slug: string): T[] {
  return entries.filter((entry) => (entry.data.tags ?? []).some((t) => tagSlug(t) === slug));
}

/**
 * Les 4 collections publiées, chacune dans son ordre canonique.
 * `draft: true` est déjà écarté par chaque helper : une entrée non publiée
 * n'a pas de route, la lister depuis un tag produirait un lien mort.
 */
export async function getTagBuckets(): Promise<TagBuckets> {
  const [blog, projects, prompts, skills] = await Promise.all([
    getPublishedPosts(),
    getSortedProjects(),
    getSortedPrompts(),
    getSortedSkills(),
  ]);
  return { blog, projects, prompts, skills };
}
```

- [ ] **Step 4: Lancer les tests — ils passent**

```bash
npx vitest run src/lib/tags.test.ts
```
Attendu : **11 passent**.

- [ ] **Step 5: Écrire `src/pages/tags/index.astro`**

Structure calquée sur `src/pages/prompts/index.astro:15-25` (kicker `~/ tags`, `h1`, conteneur `max-w-5xl`). Le corps :

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { collectTagIndex, getTagBuckets } from '../../lib/tags';

const tags = collectTagIndex(await getTagBuckets());
---
```

Rendu : une liste de puces, chacune un `<a href={`/tags/${tag.slug}/`}>` portant le **libellé** et le **compte** :

```astro
<a
  href={`/tags/${tag.slug}/`}
  class="flex items-center gap-2 rounded-full border border-line px-3 py-1 font-mono text-xs text-muted transition-colors hover:border-acc hover:text-acc"
>
  {tag.label}
  <span class="text-acc">{tag.count}</span>
</a>
```

Prévoir l'état vide (`tags.length === 0`) : une phrase, pas une liste vide muette.

- [ ] **Step 6: Build, typecheck, tests**

```bash
npx vitest run && npx astro check && npm run build
```
Attendu : **114/114 (12 fichiers)** · `0 error, 0 warning` · **19 pages** (18 + `/tags`) · `Indexed 13 pages` (inchangé : `/tags` ne porte pas `data-pagefind-body`).

- [ ] **Step 7: Smoke — R2, par comptage**

`npx astro preview`, ouvrir `/tags`. Mesurer, ne pas estimer :

```bash
node -e "
const {execSync}=require('child_process');
const html=require('fs').readFileSync('dist/tags/index.html','utf8');
console.log('liens de tag rendus:', (html.match(/href=\"\/tags\//g)||[]).length);
"
```

Le compte doit égaler le nombre de tags distincts **par slug** dans les 4 collections. Vérifier au moins que `devops`, `anti-drift`, `kubernetes`, `astro` et `claude-code` sont présents, avec le compte attendu. Contrôler aussi **375px, dark et light**.

- [ ] **Step 8: Commit**

```bash
git add src/lib/tags.ts src/lib/tags.test.ts src/pages/tags/index.astro
git commit -m "feat(p5): agregation des tags des 4 collections + page /tags"
```

---

### Task B2: `/tags/<tag>` — agrégation cross-collection

**Files:**
- Create: `src/pages/tags/[tag].astro`

**Interfaces:**
- Consumes: `collectTagIndex`, `entriesWithTag`, `getTagBuckets`, `TAG_COLLECTIONS`, `TAG_COLLECTION_LABELS` (T-B1).
- Produces: rien.

- [ ] **Step 1: Mesurer la couverture réelle AVANT d'écrire la page**

R3 exige qu'un tag partagé fasse apparaître **blog + projets + prompts + skills ensemble**. Établir d'abord si un tel tag existe dans le contenu réel :

```bash
node -e "
const fs=require('fs');
const slug=(t)=>t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+\$/g,'');
const map=new Map();
for (const c of ['blog','projects','prompts','skills']) {
  for (const d of fs.readdirSync('src/content/'+c,{withFileTypes:true}).filter(e=>e.isDirectory())) {
    const p='src/content/'+c+'/'+d.name+'/index.md';
    if(!fs.existsSync(p))continue;
    const fm=fs.readFileSync(p,'utf8').split('---')[1]||'';
    const inline=fm.match(/^tags:\s*\[(.*)\]/m);
    const block=fm.match(/^tags:\s*\n((?:\s*-\s*.+\n)+)/m);
    const tags=inline?inline[1].split(',').map(s=>s.trim()):block?block[1].split('\n').map(s=>s.replace(/^\s*-\s*/,'').trim()).filter(Boolean):[];
    for(const t of tags){const s=slug(t);if(!map.has(s))map.set(s,new Set());map.get(s).add(c);}
  }
}
for(const [s,set] of [...map].sort((a,b)=>b[1].size-a[1].size)) console.log(set.size, s, [...set].join(','));
"
```

**Résultat attendu au 2026-09-04 : aucun tag ne couvre les 4 collections** (`devops` → blog+projets ; `anti-drift`, `claude-code`, `methodologie` → prompts+skills). La page peut donc être correcte sans que R3 soit démontrable sur le contenu réel.

**Ce point est une question posée à l'utilisateur au gate de pré-flight, PAS une décision de l'implémenteur.** Si l'arbitrage n'est pas rendu quand cette tâche démarre : écrire la page, la prouver sur le meilleur cas disponible (2 collections), consigner le compte exact obtenu, et **laisser R3 `In progress` dans le ledger** — ne jamais la passer `Done` sur une lecture affaiblie du critère.

- [ ] **Step 2: Écrire `src/pages/tags/[tag].astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import {
  collectTagIndex,
  entriesWithTag,
  getTagBuckets,
  TAG_COLLECTIONS,
  TAG_COLLECTION_LABELS,
  type TagCollection,
} from '../../lib/tags';

export async function getStaticPaths() {
  const buckets = await getTagBuckets();
  // Une route par tag présent dans >= 1 collection — exactement l'ensemble
  // listé par /tags, donc aucun lien de /tags ne peut tomber en 404.
  return collectTagIndex(buckets).map((tag) => ({
    params: { tag: tag.slug },
    props: { tag, buckets },
  }));
}

const { tag, buckets } = Astro.props;

// Chemin d'une entrée par collection : les routes sont en français (design §4)
// mais les clés de collection sont en anglais — la table évite de recalculer
// ce mapping dans le gabarit.
const HREF_PREFIX: Record<TagCollection, string> = {
  blog: '/blog',
  projects: '/projets',
  prompts: '/prompts',
  skills: '/skills',
};

// Groupes non vides seulement, dans l'ordre TAG_COLLECTIONS. `entriesWithTag`
// préserve l'ordre canonique déjà appliqué par les helpers de collection.
const groups = TAG_COLLECTIONS.map((collection) => ({
  collection,
  label: TAG_COLLECTION_LABELS[collection],
  href: HREF_PREFIX[collection],
  entries: entriesWithTag(buckets[collection], tag.slug),
})).filter((group) => group.entries.length > 0);
---
```

Rendu : kicker `~/ tags / {tag.label}`, `h1` avec le libellé, puis **une `<section>` par groupe** — titre `font-mono text-sm text-acc` reprenant `{group.label} ({group.entries.length})`, et une `<ul>` de liens `{group.href}/{entry.id}/` affichant `entry.data.title` et `entry.data.description`. Un lien de retour vers `/tags`.

- [ ] **Step 3: Build, typecheck, tests**

```bash
npx vitest run && npx astro check && npm run build
```
Attendu : **114/114 (12 fichiers)** · `0 error, 0 warning` · **19 + N pages** (N = nombre de tags distincts, relevé au **Step 1 de cette tâche**).

- [ ] **Step 4: Prouver l'agrégation — R3, par comptage**

```bash
node -e "
const fs=require('fs');
for (const s of ['devops','anti-drift']) {
  const p='dist/tags/'+s+'/index.html';
  if(!fs.existsSync(p)){console.log(s,'MANQUANTE');continue;}
  const h=fs.readFileSync(p,'utf8');
  const g=['/blog/','/projets/','/prompts/','/skills/'].map(pre=>[pre,(h.match(new RegExp('href=\"'+pre,'g'))||[]).length]);
  console.log(s, JSON.stringify(g));
}
"
```

Consigner les comptes obtenus **tels quels** dans le rapport. Vérifier aussi dans le navigateur qu'aucun groupe vide n'est rendu et qu'un clic mène bien à la page (375px, dark et light).

- [ ] **Step 5: Commit**

```bash
git add src/pages/tags/
git commit -m "feat(p5): page /tags/<tag> agregeant les 4 collections"
```

---

### Task B3: Filtres catégorie/tag sur `/blog`

**Files:**
- Modify: `src/pages/blog/index.astro`, `src/components/ArticleCard.astro`
- Create: `src/scripts/blog-filters.ts`
- Modify: `src/styles/global.css` (sélecteurs `[hidden]`)

**Interfaces:**
- Consumes: `ALL`, `matchesFacets` via `src/scripts/facet-filters.ts` (Plan 4, **non modifié**) ; `collectTagIndex` (T-B1) pour la liste des tags du blog.
- Produces: rien.

- [ ] **Step 1: Poser les facettes sur la carte**

Dans `src/components/ArticleCard.astro`, transformer la racine `<a>` (`:31-34`) en `<article>` porteur des facettes, avec un **lien étiré** — c'est ce qui permet d'avoir une puce cliquable sans imbriquer un `<button>` dans un `<a>` (HTML invalide, et piège d'accessibilité) :

```astro
<article
  class="group relative flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-acc/50"
  data-facet-card
  data-facet={JSON.stringify({ category: [category], tag: tags })}
>
```

Ajouter `tags` à la déstructuration de `post.data` (`:11`).

La puce catégorie (`:45-47`) devient un bouton **au-dessus** du lien étiré :

```astro
<button
  type="button"
  data-facet-chip
  data-facet-key="category"
  data-facet-value={category}
  class="relative z-10 w-fit rounded-full bg-acc-dim px-2 py-0.5 font-mono text-xs text-acc transition-colors hover:ring-1 hover:ring-acc"
>
  {category}
</button>
```

Le titre porte le lien étiré :

```astro
<h3 class="font-display text-lg font-semibold text-text group-hover:text-acc">
  <a href={`/blog/${post.id}/`} class="after:absolute after:inset-0">{title}</a>
</h3>
```

L'`<Image>`, la description et le bloc méta restent inchangés à l'intérieur de l'`<article>`.

**Non-régression à vérifier au Step 6 :** `ArticleCard` est aussi utilisée par `src/pages/index.astro`. La carte doit y rester cliquable **en entier** et la puce ne doit rien filtrer (il n'y a pas de barre de facettes sur la home — le script du Plan 4 ne s'active pas sans `[data-facet-filters]`).

- [ ] **Step 2: Ajouter la barre de puces à `/blog`**

Dans `src/pages/blog/index.astro`, entre le `<h1>` et la grille :

```astro
---
import { collectTagIndex } from '../../lib/tags';
import { CATEGORIES } from '../../content.config';
import { ALL } from '../../lib/facetFilters';

const posts = await getPublishedPosts();
// Seuls les tags PRÉSENTS dans les articles publiés : proposer un tag qui ne
// filtre rien donnerait une liste vide sans que l'utilisateur comprenne.
const blogTags = collectTagIndex({ blog: posts, projects: [], prompts: [], skills: [] });
// Idem côté catégories : CATEGORIES en liste 7 valeurs possibles, toutes ne
// sont pas forcément utilisées.
const usedCategories = CATEGORIES.filter((c) => posts.some((p) => p.data.category === c));
---
```

Le markup reprend **exactement** le motif de `src/pages/prompts/index.astro:31-58` : conteneur `data-facet-filters` **`hidden`**, un bouton « toutes » avec `data-facet-value={ALL}` et `aria-pressed="true"`, puis un bouton par valeur. Deux groupes : `data-facet-key="category"` (les catégories utilisées) et `data-facet-key="tag"` (les tags du blog, libellé + compte). Ajouter un état vide `data-facet-empty` **`hidden`** sous la grille (« aucun article ne correspond »), et un lien discret « tous les tags → `/tags` » (addition n°3).

- [ ] **Step 3: Écrire `src/scripts/blog-filters.ts`**

Le moteur du Plan 4 n'écoute que les boutons **de la barre**. Ce script relaie les puces de carte vers la barre, sans toucher au moteur :

```ts
/**
 * Relais des puces de carte vers la barre de facettes (R4).
 *
 * `src/scripts/facet-filters.ts` (Plan 4) n'écoute que les boutons situés DANS
 * `[data-facet-filters]`. Plutôt que d'élargir sa requête — ce qui toucherait
 * /prompts et /skills, livrés et vérifiés —, on redirige le clic d'une puce
 * de carte vers le bouton équivalent de la barre : un seul état, celui du
 * moteur, et zéro duplication de logique de filtrage.
 */
const toolbar = document.querySelector<HTMLElement>('[data-facet-filters]');

if (toolbar) {
  document.addEventListener('click', (event) => {
    const chip = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-facet-chip]');
    if (!chip) return;
    const key = chip.dataset.facetKey;
    const value = chip.dataset.facetValue;
    if (!key || !value) return;
    const target = toolbar.querySelector<HTMLButtonElement>(
      `button[data-facet-key="${CSS.escape(key)}"][data-facet-value="${CSS.escape(value)}"]`,
    );
    if (!target) return; // puce sans équivalent dans la barre : on ne fait rien
    event.preventDefault();
    target.click();
    toolbar.scrollIntoView({ block: 'nearest' });
  });
}
```

Le monter dans `src/pages/blog/index.astro`, **après** le script du moteur :

```astro
<script>
  import '../../scripts/facet-filters.ts';
  import '../../scripts/blog-filters.ts';
</script>
```

- [ ] **Step 4: Étendre la règle de masquage**

Dans `src/styles/global.css`, ajouter `[data-facet-chip]` **n'est pas nécessaire** (la puce n'est jamais masquée), mais vérifier que `[data-facet-card][hidden]`, `[data-facet-filters][hidden]` et `[data-facet-empty][hidden]` (`:222-226`) sont bien déjà présents — ils le sont depuis le Plan 4, la carte blog les réutilise tels quels. **Ne rien ajouter si c'est déjà le cas ; le noter dans le rapport.**

- [ ] **Step 5: Build, typecheck, tests**

```bash
npx vitest run && npx astro check && npm run build
```
Attendu : les 3 chiffres inchangés par rapport à T-B2.

- [ ] **Step 6: Smoke — R4 par COMPTAGE, dans les deux sens**

`npx astro preview`, sur `/blog` (6 articles publiés) :

1. Compter les cartes visibles au départ : **6**.
2. Cliquer la puce catégorie **`DevOps`** de la barre → recompter. Le compte doit égaler le nombre d'articles de cette catégorie, mesuré indépendamment sur les sources. Compter avec :
   `document.querySelectorAll('[data-facet-card]:not([hidden])').length`
3. Cliquer **« toutes »** → retour à **6**. Le sens retour est la moitié du critère.
4. Cliquer une puce **tag** (ex. `kubernetes`) → même contrôle par comptage.
5. Cliquer la **puce catégorie d'une carte** → même filtrage, **et l'article ne s'ouvre pas**.
6. Cliquer **ailleurs sur la carte** (titre, image, description) → l'article **s'ouvre**.
7. Choisir une combinaison catégorie+tag sans intersection → l'état vide s'affiche, la grille est vide.
8. **Non-régression home** : sur `/`, une carte s'ouvre en entier, y compris au clic sur la puce.
9. **375px, dark et light**, `/` et `/blog` : `scrollWidth === clientWidth`.

Consigner **tous les comptes** dans le rapport de tâche.

- [ ] **Step 7: Commit**

```bash
git add src/pages/blog/index.astro src/components/ArticleCard.astro src/scripts/blog-filters.ts src/styles/global.css
git commit -m "feat(p5): filtres categorie/tag cliquables sur /blog"
```

---

## Phase C — Pages éditoriales (R5, R6, R7)

### Task C1: `/transparence-ia` — les 3 niveaux et leur signalétique

**Files:**
- Create: `src/pages/transparence-ia.astro`
- Modify: `src/components/AiBanner.astro` (lien « en savoir plus », addition n°2)

**Interfaces:**
- Consumes: `AI_USAGE_META`, type `AiUsage` (`src/lib/aiUsage.ts:13-52`), composant `AiBanner`.
- Produces: rien.

- [ ] **Step 1: Écrire la page**

R6 exige deux choses : décrire `none` / `partial` / `full`, **et** montrer leur signalétique (couleurs des bannières). La page ne doit donc pas se contenter de texte — elle **rend les 3 bannières réelles**, en réutilisant le composant. Le texte et la couleur viennent de la même source (`AI_USAGE_META`) : une bannière ne peut pas diverger de son explication.

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import AiBanner from '../components/AiBanner.astro';
import { AI_USAGE_META, type AiUsage } from '../lib/aiUsage';

// Ordre du plus humain au plus assisté — c'est l'échelle, pas l'ordre
// alphabétique.
const LEVELS: AiUsage[] = ['none', 'partial', 'full'];
---
```

Structure : kicker `~/ transparence-ia`, `h1` « Transparence IA », un paragraphe d'intro expliquant **pourquoi** cette déclaration existe (la valeur distinctive du site, design §1), puis pour chaque niveau une section contenant :
- le nom technique du niveau en `font-mono` (`none`, `partial`, `full`) — un lecteur doit pouvoir relier la page au frontmatter `aiUsage` ;
- l'emoji et le libellé (`AI_USAGE_META[level].emoji`, `.label`) ;
- la description (`.description`) ;
- **la bannière elle-même**, rendue par `<AiBanner usage={level} />`, qui porte la couleur.

Terminer par une phrase indiquant qu'un article **sans** déclaration n'affiche aucune bannière (le champ est optionnel dans le schéma, `src/content.config.ts:29`).

- [ ] **Step 2: Rendre la page atteignable (addition n°2)**

Dans `src/components/AiBanner.astro`, après le paragraphe de description (`:21`), ajouter :

```astro
<p class="mt-2">
  <a href="/transparence-ia/" class="underline underline-offset-2 hover:no-underline">
    Comment je déclare l'usage de l'IA
  </a>
</p>
```

Le lien hérite de la couleur de la bannière (`meta.bannerClass` porte déjà `text-*`), donc il reste lisible sur les 3 fonds, en dark comme en light. **Le vérifier au Step 4, pas le supposer.**

- [ ] **Step 3: Build, typecheck, tests**

```bash
npx vitest run && npx astro check && npm run build
```
Attendu : **+1 page**, tests et check inchangés.

- [ ] **Step 4: Smoke — R6**

`npx astro preview`, sur `/transparence-ia` :
1. Les **3** niveaux sont présents, chacun avec son nom technique, sa description **et sa bannière colorée** — les 3 fonds sont visuellement distincts (ardoise / ambre / bleu).
2. Contraste du lien ajouté vérifié sur les **3** bannières, en **dark et light**.
3. Depuis un article portant `aiUsage` (ex. n'importe quel article du blog qui en déclare un), le lien de la bannière mène bien à la page.
4. **375px** : pas de scroll horizontal.

- [ ] **Step 5: Commit**

```bash
git add src/pages/transparence-ia.astro src/components/AiBanner.astro
git commit -m "feat(p5): page /transparence-ia + lien depuis la banniere"
```

---

### Task C2: `/a-propos` — bio réelle

**Files:**
- Create: `src/pages/a-propos.astro`
- Modify: `src/components/Header.astro:17` (lien activé, addition n°1)

**Interfaces:** aucune.

> **Dépendance utilisateur.** R5 se mesure sur « la bio (**contenu réel fourni**) ». Le contenu est fourni par l'utilisateur : bio, parcours, le « pourquoi » du site (design §4). **Aucun texte inventé, aucun lorem ipsum, aucune bio plausible rédigée à sa place** — une bio inventée passerait le critère en apparence et publierait des affirmations fausses sur une personne réelle. Si le contenu n'est pas fourni quand la tâche démarre : livrer le Step 2 (nav) et le gabarit, **laisser R5 `In progress`**, et le dire dans le rapport.

- [ ] **Step 1: Écrire la page avec le contenu fourni**

Structure : kicker `~/ a-propos`, `h1`, puis le contenu de l'utilisateur dans un conteneur `.prose` (les styles éditoriaux existent déjà, `src/styles/global.css:48-146`) — pas de nouvelle règle CSS. Largeur `max-w-3xl`, comme la page article (`src/pages/blog/[...slug].astro:45`).

Si l'utilisateur fournit des liens (GitHub, contact), les rendre dans un bloc en fin de page, en `font-mono`.

- [ ] **Step 2: Activer le lien de nav (addition n°1)**

Dans `src/components/Header.astro:17`, remplacer `{ label: 'À propos' },` par `{ label: 'À propos', href: '/a-propos' },` et mettre à jour le commentaire `:9-11` (il annonce encore « arrive au Plan 5 »).

- [ ] **Step 3: Build, typecheck, tests**

```bash
npx vitest run && npx astro check && npm run build
```
Attendu : **+1 page**.

- [ ] **Step 4: Smoke — R5**

`npx astro preview` : le lien « À propos » de la nav est cliquable **sur toutes les pages** et mène à `/a-propos`, la bio réelle s'affiche, **375px dark et light** sans scroll horizontal. Vérifier qu'aucun autre item de nav n'a été cassé au passage (5 items, 5 cibles valides).

- [ ] **Step 5: Commit**

```bash
git add src/pages/a-propos.astro src/components/Header.astro
git commit -m "feat(p5): page /a-propos + lien de nav actif"
```

---

### Task C3: `/404` custom

**Files:**
- Create: `src/pages/404.astro`

**Interfaces:** aucune.

- [ ] **Step 1: Écrire la page**

Astro rend `src/pages/404.astro` en `dist/404.html` ; GitHub Pages le sert automatiquement sur toute URL inconnue, et `astro preview` fait de même — **aucune configuration à ajouter**.

Contenu : kicker `~/ 404`, un `h1` court, une phrase, et des **sorties utiles** — retour à l'accueil, `/blog`, `/tags` — plus une invitation à utiliser la recherche (⌘K fonctionne : `BaseLayout` monte le modal partout). Même largeur et mêmes tokens que les autres pages ; pas de nouvelle règle CSS.

- [ ] **Step 2: Build**

```bash
npm run build && ls -la dist/404.html
```
Attendu : `dist/404.html` existe. **+1 page** au build.

- [ ] **Step 3: Smoke — R7**

`npx astro preview`, puis visiter une URL inexistante, par exemple `/cette-page-nexiste-pas/` :
1. La page **custom** s'affiche (header du site présent, tokens du thème) — **pas** la 404 texte brut du serveur.
2. Les liens de sortie fonctionnent (accueil, `/blog`, `/tags`).
3. **⌘K s'ouvre depuis la 404** — c'est la sortie la plus utile.
4. **375px dark et light**.

Consigner dans le rapport le **code HTTP** observé : `astro preview` doit répondre **404**, pas 200.

- [ ] **Step 4: Commit**

```bash
git add src/pages/404.astro
git commit -m "feat(p5): page 404 custom"
```

---

## Phase D — Déploiement (R8, moitié « servi en prod »)

### Task D1: Vérifier la recherche sur le site déployé — **action utilisateur**

**Files:** aucun.

R8 se mesure en deux temps : `npm run build` produit l'index (**T-A1**, prouvé localement) **et** il est servi en prod (« la recherche fonctionne sur github.io »). La seconde moitié dépend d'un déploiement, que seul un push sur `main` déclenche (`.github/workflows/deploy.yml:3`).

**Fait établi à ne pas contourner :** `origin/main` est resté à la fin du Plan 1. Pousser publierait **les Plans 2, 3, 4 et 5 d'un coup** — le CMS, les projets, les prompts, les skills et la recherche. C'est une décision de publication, pas un corollaire technique, et elle appartient à l'utilisateur (constat déjà posé dans `docs/anti-drift/handoffs/plan-4-handoff.md` §3).

- [ ] **Step 1: Poser la question, ne pas la trancher**

Présenter à l'utilisateur : ce qui serait publié, et le fait que la vérification prod de R8 ne peut avoir lieu qu'après. Ne rien pousser sans un « oui » explicite.

- [ ] **Step 2: Après déploiement — vérifier**

Sur `https://bendevcat.github.io/` :
1. `https://bendevcat.github.io/pagefind/pagefind.js` répond **200**.
2. ⌘K ouvre le modal, `git` renvoie des résultats des **4** collections, un clic mène à la bonne page.

Consigner l'URL testée, le code HTTP et les comptes par groupe.

- [ ] **Step 3: Ledger**

Passer R8 `Done` **uniquement** avec ces deux mesures. Tant qu'elles manquent, R8 reste `In progress` — et la Phase Z le verra.

---

## Phase Z — Verification

### Task Z1: Audit canonique

- [ ] **Step 1: Lancer `/anti-drift-planning:verify 5`**

Non contournable, non résumable de mémoire. C'est le **seul** chemin vers le script de release et le tag `milestone-plan-5` = **`v1.0.0`**.

L'audit échoue si un critère n'est pas `Done`, ou si une seule entrée du journal de déviations est encore `pending-user`.

---

## Self-Review

**1. Spec coverage.** R1 → T-A1 (index) + T-A2 (modal, preuve des 4 groupes). R2 → T-B1. R3 → T-B2 (avec la réserve de données du Step 1, remontée au gate). R4 → T-B3. R5 → T-C2 (bloquée sur un contenu utilisateur, dit explicitement). R6 → T-C1. R7 → T-C3. R8 → T-A1 (build) + T-D1 (prod). Phase Z → T-Z1. **Aucun critère sans tâche.**

**2. Placeholders.** Aucun « TBD », aucun « gérer les cas limites », aucun « similaire à la tâche N » : les motifs de markup répétés (barre de facettes, kicker, carte) sont cités avec leur fichier et leurs lignes de référence, et le code des modules purs est donné en entier. Les deux points non déterminés — le contenu de `/a-propos` et l'arbitrage R3 — ne sont pas des placeholders mais des **dépendances utilisateur nommées**, avec la conduite à tenir si la réponse n'arrive pas.

**3. Cohérence des types.** `SearchCollection` (`'blog' | 'projects' | 'prompts' | 'skills'`) et `TagCollection` (mêmes valeurs) sont deux types distincts et volontairement non partagés : le premier décrit ce que Pagefind renvoie côté navigateur (module sans import), le second ce que `getCollection` renvoie côté build. Les fusionner ferait entrer `astro:content` dans `search.ts`, qui doit rester chargeable par le navigateur. `TagSummary` est produit par `collectTagIndex` (T-B1) et consommé tel quel par `/tags` (T-B1) et `getStaticPaths` (T-B2). `tagSlug` est la seule fonction de normalisation — la commande de mesure du Step 1 de T-B2 en réplique la logique **volontairement**, pour mesurer les données sans dépendre du code qu'elle sert à cadrer.

**4. Lean check.** 9 tâches, ~13 fichiers créés, ~10 modifiés. Le plan détaille en entier les 2 modules purs (testés) et les 2 scripts navigateur (là où sont les pièges), et se contente de pointer les motifs existants pour les gabarits Astro, qui sont répétitifs et déjà établis par les Plans 1, 3 et 4.
