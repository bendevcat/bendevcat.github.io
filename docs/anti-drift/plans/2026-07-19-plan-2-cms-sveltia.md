# Plan 2 — Édition sans code (Sveltia CMS) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [`docs/anti-drift/specs/2026-07-19-plan-2-cms-sveltia.md`](../specs/2026-07-19-plan-2-cms-sveltia.md)
**Ledger:** [`docs/anti-drift/handoffs/plan-2-ledger.md`](../handoffs/plan-2-ledger.md)
**Deviations:** [`docs/anti-drift/handoffs/plan-2-deviations.md`](../handoffs/plan-2-deviations.md)
**Branch:** `plan-2-cms-sveltia` (off `main` @ Plan 1 vérifié, `4fabccf`)
**Date:** 2026-07-30

**Goal:** Permettre à Benoît de créer et d'éditer les articles du blog depuis une UI web (`/admin`) authentifiée par PAT GitHub, sans backend et sans toucher au code, chaque enregistrement produisant un commit sur `main` qui redéclenche le déploiement.

**Architecture:** Sveltia CMS est une SPA chargée depuis un CDN dans une page statique `public/admin/index.html` ; toute sa configuration tient dans `public/admin/config.yml` (copié verbatim par Astro dans `dist/`). Le backend `github` parle directement à l'API GitHub depuis le navigateur avec un PAT stocké en `localStorage` — aucun serveur, aucun OAuth relay. La collection `blog` est déclarée en *folder collection* avec `path: '{{slug}}/index'` et médias *entry-relative*, ce qui reproduit exactement la structure de bundles `src/content/blog/<slug>/index.md` + images co-localisées du Plan 1, sans modifier le schéma Zod.

**Tech Stack:** Sveltia CMS `0.176.0` (CDN unpkg, version épinglée) · Astro 7.1.1 · vitest 4 (test de non-régression sur la config CMS) · `yaml` (parse du config.yml dans le test) · GitHub Actions (workflow `deploy.yml` du Plan 1, inchangé).

## Global Constraints

Valeurs exactes, reprises de la spec ; elles s'appliquent implicitement à **toutes** les tâches.

- **Version CDN épinglée** (spec §6.2) : `https://unpkg.com/@sveltia/cms@0.176.0/dist/sveltia-cms.js`. Jamais de tag flottant (`@latest`, ni URL sans version).
- **Aucun backend** (spec §1, §5) : auth par PAT « Sign In with Token » uniquement. Pas d'OAuth, pas de Cloudflare Worker, pas de `decap-server` / `netlify-cms-proxy-server`.
- **`/admin` en `robots: noindex`** (spec §6.1) : `<meta name="robots" content="noindex" />` dans `public/admin/index.html`.
- **`output.omit_empty_optional_fields: true`** (spec R4) — le défaut Sveltia est `false`, la déclaration est donc obligatoire.
- **Repo cible** : `bendevcat/bendevcat.github.io`, branche `main` (user-site du Plan 1, édition directe sur `main` — spec §5).
- **Une seule collection CMS : `blog`** (spec §5). `projects` / `prompts` / `skills` sont hors scope (Plans 3 et 4).
- **Le schéma Zod du Plan 1 (`src/content.config.ts`) est la source de vérité** : le CMS s'y conforme. Toute modification du schéma serait une déviation (elle toucherait le contenu déjà migré).
- **Aucune modification du contenu existant** : les 6 articles migrés au Plan 1 ne sont ni réécrits ni reformatés par ce plan.
- **Astro 7 / Node ≥ 22.12** : ne pas rétrograder ; commandes via `npx astro …` ou `npm run …`.

## File Structure

| Fichier | Statut | Responsabilité |
|---|---|---|
| `public/admin/index.html` | **Créé** (T-A1) | Page hôte de la SPA CMS : `noindex`, script CDN épinglé. Rien d'autre. |
| `public/admin/config.yml` | **Créé** (T-A1), **complété** (T-B1) | Unique source de configuration du CMS : backend, médias, options de sortie, collection `blog` et mapping des champs. |
| `src/lib/cms-config.test.ts` | **Créé** (T-A1), **étendu** (T-B1) | Test de non-régression : parse le YAML réel et vérifie qu'il reste aligné sur le schéma Zod (`CATEGORIES`, noms de champs, chemins). C'est le garde-fou anti-drift entre le CMS et le contenu. |
| `package.json` | **Modifié** (T-A1) | Ajout de `yaml` en `devDependencies` (le test ne doit pas dépendre d'une résolution transitive d'Astro). |
| `README.md` | **Modifié** (T-C1) | Section « Édition du contenu » : workflow prod (PAT) et workflow local (Chromium, sans proxy). Couvre R7. |
| `src/content.config.ts` | **Lu, non modifié** | Source de vérité du schéma. |
| `.github/workflows/deploy.yml` | **Lu, non modifié** | Déjà déclenché par `push: branches: [main]` → couvre R5 sans changement. |

## Requirement → Task map

| R | Tâche(s) |
|---|---|
| R1 `/admin/` sert Sveltia (version épinglée), 0 erreur console | T-A1 |
| R2 Auth PAT sans backend, repo listé | T-A1 (config) + T-A2 (vérif humaine) |
| R3 Collection `blog` éditable, champs mappés sur le Zod | T-B1 (config + test) + T-B2 (création réelle) |
| R4 `omit_empty_optional_fields: true` actif | T-B1 (config + test) + T-B2 (article sans `updatedDate`/`cover` → build OK) |
| R5 Enregistrement CMS → commit `main` → déploiement | T-C2 (vérif humaine) |
| R6 Upload d'image géré et rendu | T-B1 (médias entry-relative) + T-B2 (upload réel + build) |
| R7 Workflow d'édition locale documenté | T-C1 (README) + T-B2 (le workflow local est *suivi* pour tester) |

---

## Phase A — Intégration Sveltia (R1, R2)

### Task A1: Page `/admin` + config CMS minimale valide

**Files:**
- Create: `public/admin/index.html`
- Create: `public/admin/config.yml`
- Create: `src/lib/cms-config.test.ts`
- Modify: `package.json` (devDependencies : `yaml`)

**Interfaces:**
- Consumes: `src/content.config.ts` → export `CATEGORIES` (7 valeurs) et le schéma `blog` (lecture seule).
- Produces: `public/admin/config.yml` avec la clé `collections[0]` nommée `blog` — T-B1 la complète en place ; `src/lib/cms-config.test.ts` exporte le helper `loadCmsConfig()` (signature ci-dessous) que T-B1 réutilise.

**Contexte pour l'implémenteur :** Sveltia CMS refuse de démarrer si `config.yml` est absent ou invalide (écran d'erreur + erreurs console) — R1 exige donc une config **déjà valide** dès cette tâche, même si le mapping fin des champs arrive en T-B1. Astro copie `public/` verbatim dans `dist/` : aucun import, aucun traitement.

- [ ] **Step 1: Installer le parseur YAML utilisé par le test**

```bash
npm install --save-dev yaml
```

Attendu : `package.json` liste `yaml` en `devDependencies` (la version présente aujourd'hui en transitif est `2.9.0` ; toute `^2` convient).

- [ ] **Step 2: Écrire le test qui échoue**

Créer `src/lib/cms-config.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

/**
 * Charge la config réelle du CMS (public/admin/config.yml) telle qu'elle sera
 * servie. Le test lit le fichier sur disque — pas une copie — pour que toute
 * dérive entre le CMS et le schéma Zod casse le build de tests.
 */
export function loadCmsConfig(): any {
  return parse(readFileSync(new URL('../../public/admin/config.yml', import.meta.url), 'utf8'));
}

describe('config CMS — backend', () => {
  it('cible le repo GitHub du site, branche main, sans backend serveur', () => {
    const cfg = loadCmsConfig();
    expect(cfg.backend.name).toBe('github');
    expect(cfg.backend.repo).toBe('bendevcat/bendevcat.github.io');
    expect(cfg.backend.branch).toBe('main');
    // Aucun relais OAuth : ces clés doivent rester absentes (spec §5).
    expect(cfg.backend.base_url).toBeUndefined();
    expect(cfg.backend.auth_endpoint).toBeUndefined();
  });

  it('déclare exactement une collection, nommée blog', () => {
    const cfg = loadCmsConfig();
    expect(cfg.collections).toHaveLength(1);
    expect(cfg.collections[0].name).toBe('blog');
  });
});

describe('page /admin', () => {
  it('épingle la version du CDN Sveltia et interdit l’indexation', () => {
    const html = readFileSync(new URL('../../public/admin/index.html', import.meta.url), 'utf8');
    expect(html).toContain('https://unpkg.com/@sveltia/cms@0.176.0/dist/sveltia-cms.js');
    expect(html).toMatch(/<meta\s+name="robots"\s+content="noindex"\s*\/?>/);
    // Un tag flottant ferait sauter l’épinglage (spec §6.2).
    expect(html).not.toContain('@sveltia/cms/dist');
    expect(html).not.toContain('@latest');
  });
});
```

- [ ] **Step 3: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run src/lib/cms-config.test.ts`
Expected: FAIL — `ENOENT: no such file or directory … public/admin/config.yml`

- [ ] **Step 4: Créer la page hôte**

Créer `public/admin/index.html` :

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>Admin — benCat</title>
  </head>
  <body>
    <!-- Version épinglée : Sveltia est pre-1.0, les releases sont fréquentes (spec §6.2). -->
    <script src="https://unpkg.com/@sveltia/cms@0.176.0/dist/sveltia-cms.js"></script>
  </body>
</html>
```

- [ ] **Step 5: Créer la config minimale valide**

Créer `public/admin/config.yml`. La collection `blog` est volontairement réduite ici (titre + corps) : T-B1 la complète.

```yaml
# Configuration Sveltia CMS — Plan 2.
# Source de vérité du schéma : src/content.config.ts (collection `blog`).
backend:
  name: github
  repo: bendevcat/bendevcat.github.io
  branch: main

# Repli global (non utilisé par la collection blog, qui stocke ses médias
# à côté de l'article — cf. T-B1).
media_folder: public/images/uploads
public_folder: /images/uploads

collections:
  - name: blog
    label: Articles
    label_singular: Article
    folder: src/content/blog
    path: '{{slug}}/index'
    extension: md
    format: yaml-frontmatter
    create: true
    fields:
      - { name: title, label: Titre, widget: string }
      - { name: body, label: Contenu, widget: markdown }
```

- [ ] **Step 6: Lancer le test, vérifier qu'il passe**

Run: `npx vitest run src/lib/cms-config.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 7: Vérifier que le build publie bien `/admin`**

```bash
npx astro build && ls -l dist/admin/
```
Expected: `dist/admin/index.html` **et** `dist/admin/config.yml` présents ; build sans erreur.

- [ ] **Step 8: Vérifier `/admin` dans un navigateur (preuve de R1)**

```bash
npx astro dev --background
```
Puis ouvrir `http://localhost:4321/admin/` (outil de preview du harness) et **relever** :
1. l'UI Sveltia s'affiche (écran de connexion, pas un écran d'erreur de config) ;
2. le bouton **« Sign In with Token »** est présent (preuve que l'auth PAT est disponible) ;
3. la console : **0 erreur** (les avertissements ne comptent pas ; les copier tels quels dans le rapport).

Si une erreur console apparaît et vient de la version `0.176.0` elle-même (publiée le 2026-07-30), **ne pas** bidouiller : logger une déviation avant de changer de version épinglée.

- [ ] **Step 9: Commit**

```bash
git add public/admin/index.html public/admin/config.yml src/lib/cms-config.test.ts package.json package-lock.json
git commit -m "feat(p2): serve Sveltia CMS at /admin (pinned 0.176.0) + config regression test"
```

---

### Task A2: Vérification humaine de l'auth PAT (R2)

**Files:** aucun (tâche de vérification — produit un constat, pas du code).

**Interfaces:**
- Consumes: `/admin` livré par T-A1.
- Produces: le constat R2 (Done / bloqué) pour le ledger.

**Contexte :** l'authentification exige un **PAT GitHub personnel**. Un agent ne doit **jamais** saisir ni manipuler un token : cette étape est exécutée **par l'utilisateur**, l'agent fournit les instructions et enregistre le résultat. Elle est indépendante de la Phase B — si l'utilisateur n'est pas disponible, continuer sur B et laisser R2 `In progress`.

- [ ] **Step 1: Fournir les instructions à l'utilisateur**

À transmettre tel quel :
1. Ouvrir `http://localhost:4321/admin/` (dev) ou `https://bendevcat.github.io/admin/` (prod, après déploiement).
2. Cliquer **« Sign In with Token »**.
3. Suivre le lien affiché (les scopes requis y sont pré-sélectionnés) et créer le PAT sur GitHub — **scope minimal** : accès `repo` / `contents: write` **sur le seul repo `bendevcat/bendevcat.github.io`** (spec §6.1). Un PAT *fine-grained* limité à ce repo est préférable à un PAT classique.
4. Coller le token dans le champ.
5. **Constat attendu (binaire)** : la bibliothèque de contenu s'ouvre et la collection **Articles** liste les 6 articles existants.

- [ ] **Step 2: Enregistrer le résultat**

Reporter le constat (succès / message d'erreur exact) dans le ledger. Le token n'est jamais copié dans le repo, les logs ou un rapport.

---

## Phase B — Collection blog dans le CMS (R3, R4, R6)

### Task B1: Mapper le schéma Zod en champs Sveltia + options de sortie + médias

**Files:**
- Modify: `public/admin/config.yml` (remplace le bloc `collections` et ajoute `output`)
- Modify: `src/lib/cms-config.test.ts` (ajoute les assertions de mapping)

**Interfaces:**
- Consumes: `loadCmsConfig()` de T-A1 ; `CATEGORIES` exporté par `src/content.config.ts` (`['Actus','DevOps','Outils','Sécurité','Geekerie','Tutos','IA']`).
- Produces: la config finale de la collection `blog` — T-B2 la consomme sans la modifier.

**Le schéma à mapper** (`src/content.config.ts`, ne pas modifier) :

```ts
title: z.string()                        description: z.string()
pubDate: z.coerce.date()                 updatedDate: z.coerce.date().optional()
draft: z.boolean().default(false)        category: z.enum(CATEGORIES)
tags: z.array(z.string()).default([])    cover: image().optional()
coverAlt: z.string().optional()          aiUsage: z.enum(['none','partial','full']).optional()
featured: z.boolean().default(false)     relatedProjects: z.array(reference('projects')).optional()
```

**Décision de mapping — `relatedProjects` est volontairement absent du CMS.** La collection `projects` qu'il référence n'existe qu'au Plan 3 (spec §5 : collections projets hors scope) ; un widget `relation` pointant vers une collection inexistante ferait planter le CMS. Le champ reste optionnel dans le Zod, donc aucun contenu n'est invalidé. **Cette omission a été soumise à l'utilisateur à la validation du plan** — si elle n'a pas été explicitement approuvée, l'implémenteur logge une déviation avant d'exécuter cette tâche.

**Décision de mapping — médias *entry-relative*.** `media_folder: ''` + `public_folder: ''` au niveau de la collection : l'image uploadée est écrite **dans le dossier de l'article** (`src/content/blog/<slug>/`) et le frontmatter reçoit le nom de fichier nu. Vérifié empiriquement le 2026-07-30 : `cover: "k9s-header.png"` (sans `./`) passe `astro build` et produit bien `/_astro/k9s-header.*.webp` — `image()` résout relativement au fichier d'entrée. C'est l'arbitrage laissé ouvert par la spec §6.3, tranché en faveur de `src/` (optimisation Astro conservée, cohérent avec la co-localisation du Plan 1).

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à `src/lib/cms-config.test.ts` (garder l'existant, ajouter en dessous ; l'import de `CATEGORIES` va en haut du fichier) :

```ts
import { CATEGORIES } from '../content.config';

describe('config CMS — sortie', () => {
  it('omet les champs optionnels vides (le défaut Sveltia est false)', () => {
    expect(loadCmsConfig().output.omit_empty_optional_fields).toBe(true);
  });
});

describe('config CMS — collection blog', () => {
  const blog = () => loadCmsConfig().collections[0];
  const fieldNames = () => blog().fields.map((f: any) => f.name);

  it('écrit des bundles src/content/blog/<slug>/index.md', () => {
    expect(blog().folder).toBe('src/content/blog');
    expect(blog().path).toBe('{{slug}}/index');
    expect(blog().extension).toBe('md');
    expect(blog().format).toBe('yaml-frontmatter');
  });

  it('stocke les médias à côté de l’article (entry-relative)', () => {
    expect(blog().media_folder).toBe('');
    expect(blog().public_folder).toBe('');
  });

  it('mappe tous les champs du schéma Zod sauf relatedProjects', () => {
    expect(fieldNames().sort()).toEqual([
      'aiUsage', 'body', 'category', 'cover', 'coverAlt', 'description',
      'draft', 'featured', 'pubDate', 'tags', 'title', 'updatedDate',
    ]);
  });

  it('rend obligatoires exactement les champs non-optionnels du Zod', () => {
    const required = blog().fields
      .filter((f: any) => f.required !== false)
      .map((f: any) => f.name)
      .sort();
    expect(required).toEqual(['body', 'category', 'description', 'pubDate', 'title']);
  });

  it('propose exactement les 7 catégories du schéma', () => {
    const category = blog().fields.find((f: any) => f.name === 'category');
    expect(category.widget).toBe('select');
    expect(category.options).toEqual([...CATEGORIES]);
  });

  it('propose exactement les 3 niveaux aiUsage du schéma', () => {
    const ai = blog().fields.find((f: any) => f.name === 'aiUsage');
    expect(ai.widget).toBe('select');
    expect(ai.options.map((o: any) => o.value ?? o)).toEqual(['none', 'partial', 'full']);
  });

  it('utilise les widgets attendus pour les champs typés', () => {
    const byName = Object.fromEntries(blog().fields.map((f: any) => [f.name, f]));
    expect(byName.pubDate.widget).toBe('datetime');
    expect(byName.updatedDate.widget).toBe('datetime');
    expect(byName.draft.widget).toBe('boolean');
    expect(byName.featured.widget).toBe('boolean');
    expect(byName.tags.widget).toBe('list');
    expect(byName.cover.widget).toBe('image');
    expect(byName.body.widget).toBe('markdown');
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run src/lib/cms-config.test.ts`
Expected: FAIL — `output` est `undefined`, la liste des champs vaut `['body','title']`.

- [ ] **Step 3: Écrire la config finale**

Remplacer dans `public/admin/config.yml` tout ce qui suit le bloc `public_folder` global :

```yaml
output:
  # Défaut Sveltia = false : sans ça, un champ optionnel laissé vide sort en
  # chaîne vide / null et casse la validation Zod côté Astro (spec R4).
  omit_empty_optional_fields: true

collections:
  - name: blog
    label: Articles
    label_singular: Article
    description: Articles du blog — src/content/blog/<slug>/index.md
    folder: src/content/blog
    path: '{{slug}}/index'
    extension: md
    format: yaml-frontmatter
    create: true
    slug: '{{slug}}'
    identifier_field: title
    sortable_fields: [pubDate, title]
    # Médias à côté de l'article : Astro optimise les images co-localisées.
    media_folder: ''
    public_folder: ''
    fields:
      - { name: title, label: Titre, widget: string }
      - { name: description, label: Description, widget: text, hint: Résumé affiché sur les cartes et dans le flux RSS }
      - { name: pubDate, label: Date de publication, widget: datetime, format: 'YYYY-MM-DDTHH:mm:ssZ' }
      - { name: updatedDate, label: Date de mise à jour, widget: datetime, format: 'YYYY-MM-DDTHH:mm:ssZ', required: false }
      - { name: category, label: Catégorie, widget: select, options: [Actus, DevOps, Outils, Sécurité, Geekerie, Tutos, IA] }
      - { name: tags, label: Tags, widget: list, required: false, default: [] }
      - { name: cover, label: Image de couverture, widget: image, required: false }
      - { name: coverAlt, label: Texte alternatif de la couverture, widget: string, required: false }
      - name: aiUsage
        label: Transparence IA
        widget: select
        required: false
        options:
          - { label: '✍️ 100% humain', value: none }
          - { label: '🤝 Co-créé avec IA', value: partial }
          - { label: '🤖 Généré par IA', value: full }
      - { name: draft, label: Brouillon, widget: boolean, required: false, default: false }
      - { name: featured, label: Mis en avant, widget: boolean, required: false, default: false }
      - { name: body, label: Contenu, widget: markdown }
```

- [ ] **Step 4: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run`
Expected: PASS — l'ancien test `sortAndFilter` **et** les tests de config CMS.

- [ ] **Step 5: Vérifier que le CMS charge toujours la config enrichie**

`npx astro dev --background`, ouvrir `/admin/`, constater : 0 erreur console, la collection **Articles** apparaît dans la barre latérale. (Sans authentification, la liste d'entrées reste vide — c'est normal et ce n'est pas une erreur.)

- [ ] **Step 6: Commit**

```bash
git add public/admin/config.yml src/lib/cms-config.test.ts
git commit -m "feat(p2): map blog Zod schema to Sveltia fields, entry-relative media, omit empty optionals"
```

---

### Task B2: Créer et éditer un article via le CMS en mode local (R3, R4, R6)

**Files:**
- Créé puis supprimé : `src/content/blog/<slug-de-test>/` (article jetable — **ne doit pas être committé**)
- Aucun fichier de production modifié.

**Interfaces:**
- Consumes: la config de T-B1, telle quelle.
- Produces: la preuve empirique de R3/R4/R6, et le constat que le workflow local documenté en T-C1 fonctionne réellement.

**Contexte :** c'est le test d'intégration réel. Le mode « Work with Local Repository » écrit dans les fichiers du dépôt local sans authentification GitHub et **sans proxy** (Sveltia refuse explicitement `decap-server`) ; il exige un navigateur **Chromium** (File System Access API). L'article de test valide simultanément la structure de fichier (R3), l'omission des clés vides (R4) et l'upload d'image (R6).

- [ ] **Step 1: Ouvrir le CMS en mode local**

```bash
npx astro dev --background
```
Ouvrir `http://localhost:4321/admin/` dans un navigateur Chromium → **« Work with Local Repository »** → sélectionner le dossier racine du projet (`astro-bencatdev`) et accorder l'accès en écriture.

- [ ] **Step 2: Créer un article de test — champs optionnels laissés vides (cas R4)**

Nouvel article avec **uniquement** : Titre `Test CMS plan 2`, Description `Article jetable de vérification.`, Date de publication (valeur par défaut), Catégorie `Outils`, Contenu `## Titre H2` + un paragraphe.
Laisser **vides** : `updatedDate`, `cover`, `coverAlt`, `aiUsage`, `tags`. Enregistrer.

- [ ] **Step 3: Vérifier le fichier produit (R3 + R4)**

```bash
cat src/content/blog/test-cms-plan-2/index.md
```
Attendu, **binaire** :
- le chemin est bien `src/content/blog/<slug>/index.md` (R3) ;
- le frontmatter contient `title`, `description`, `pubDate`, `category` (+ `draft: false` / `featured: false`, qui ont une valeur, pas vide) ;
- **aucune** clé `updatedDate`, `cover`, `coverAlt`, `aiUsage` (R4) ;
- **aucune** valeur vide (`''`, `null`, `[]`) dans le frontmatter.

- [ ] **Step 4: Vérifier que le build accepte l'article (R4, clause « ET `astro build` passe »)**

Run: `npx astro build`
Expected: build OK, 0 erreur de validation de schéma, l'article de test apparaît dans les pages générées.

- [ ] **Step 5: Éditer l'article et uploader une couverture (R6)**

Rouvrir l'article dans le CMS, uploader une image dans **Image de couverture** (n'importe quel PNG/JPG local), renseigner le texte alternatif, enregistrer. Puis :

```bash
ls src/content/blog/test-cms-plan-2/
grep -E '^(cover|coverAlt):' src/content/blog/test-cms-plan-2/index.md
npx astro build
```
Attendu : le fichier image est **dans le dossier de l'article** ; `cover:` référence ce fichier ; le build passe et émet une image optimisée `/_astro/*.webp` correspondante.

- [ ] **Step 6: Vérifier le rendu de la couverture (clause « visible sur l'article publié » de R6)**

Ouvrir `http://localhost:4321/blog/test-cms-plan-2/` et `http://localhost:4321/blog` : la couverture s'affiche sur la page article et sur la carte. Faire une capture d'écran comme preuve.

- [ ] **Step 7: Supprimer l'article de test et vérifier que l'arbre est propre**

```bash
rm -rf src/content/blog/test-cms-plan-2
npx astro build && git status --short
```
Expected: build OK ; `git status` ne montre **aucun** résidu de l'article de test.

**Si un critère échoue à cette tâche** (chemin, clé vide, image non résolue), c'est un défaut de configuration : corriger `config.yml` et **reprendre au Step 2** — sauf si la correction contredit le plan (autre stratégie de médias, modification du schéma Zod), auquel cas **logger une déviation d'abord**.

- [ ] **Step 8: Commit (seulement s'il y a eu un correctif de config)**

```bash
git add public/admin/config.yml src/lib/cms-config.test.ts
git commit -m "fix(p2): <ce qui a été corrigé après le test d'édition réel>"
```
S'il n'y a rien à corriger, ne pas créer de commit vide — le constat vit dans le ledger.

---

## Phase C — Boucle publication & documentation (R5, R7)

### Task C1: Documenter les deux workflows d'édition (R7)

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: les constats de T-B2 (le mode local a réellement fonctionné).
- Produces: la section README que T-C2 et la Phase Z utilisent comme référence de vérification.

**Contexte :** le `README.md` est encore le template Astro d'origine. Cette tâche **ajoute** une section « Édition du contenu » ; réécrire tout le README serait hors scope. R7 est validé en *suivant* la doc, pas en la relisant — la doit donc être exécutable telle quelle.

- [ ] **Step 1: Ajouter la section au README**

Insérer après la section « 🧞 Commands » de `README.md` :

```markdown
## ✍️ Édition du contenu (Sveltia CMS)

Le blog s'édite depuis une interface web, sans toucher au code. Le CMS est servi
en statique sur `/admin/` — il n'y a **aucun backend** : le navigateur parle
directement à l'API GitHub.

### En production (publier / corriger un article)

1. Ouvrir <https://bendevcat.github.io/admin/>.
2. Cliquer **« Sign In with Token »**.
3. Suivre le lien proposé pour créer un *personal access token* GitHub — de
   préférence un token **fine-grained** limité au seul dépôt
   `bendevcat/bendevcat.github.io`, avec la permission **Contents: Read and write**.
4. Coller le token. Il est conservé dans le `localStorage` du navigateur : à
   refaire une seule fois par navigateur.
5. Éditer, puis **Save** : Sveltia commite directement sur `main`. Le workflow
   GitHub Actions `Deploy to GitHub Pages` se déclenche et le site est à jour en
   quelques minutes.

### En local (éditer sans publier)

Sveltia utilise la *File System Access API* : **aucun serveur proxy** n'est
nécessaire (ni `decap-server`, ni `netlify-cms-proxy-server`), mais un navigateur
**Chromium** est requis (Chrome, Edge, Brave — pas Firefox ni Safari).

1. `npm run dev`
2. Ouvrir <http://localhost:4321/admin/> dans un navigateur Chromium.
3. Cliquer **« Work with Local Repository »** et sélectionner le dossier racine
   du projet quand le navigateur le demande.
4. Éditer : les fichiers locaux sont modifiés directement.
5. Le CMS ne fait **aucune** opération Git en local — relire le diff, puis
   commiter et pousser à la main.

### Où atterrissent les fichiers

| Élément | Emplacement |
|---|---|
| Article | `src/content/blog/<slug>/index.md` |
| Images d'un article | dans le dossier de l'article, à côté de `index.md` |
| Schéma de référence | `src/content.config.ts` (collection `blog`) |
| Configuration du CMS | `public/admin/config.yml` |

Les champs du CMS sont alignés sur le schéma Zod ; `src/lib/cms-config.test.ts`
échoue si les deux divergent.
```

- [ ] **Step 2: Vérifier les liens et le rendu**

```bash
npx astro build
```
Expected: build OK (le README ne participe pas au build, mais on ne casse rien). Relire la section : chaque étape est exécutable sans connaissance préalable.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs(p2): document CMS editing workflows (prod PAT + local Chromium)"
```

---

### Task C2: Vérifier la boucle commit → déploiement (R5)

**Files:** aucun (vérification ; dépend d'actions GitHub de l'utilisateur).

**Interfaces:**
- Consumes: `/admin` déployé (donc la branche `plan-2-cms-sveltia` mergée sur `main` et poussée) + un PAT valide (T-A2).
- Produces: le constat R5 pour le ledger.

**Contexte :** R5 ne peut pas être vérifié depuis la branche de travail — il exige que `/admin` soit **en ligne**, donc que le travail soit déjà sur `main`. C'est une vérification post-merge, exactement comme R1 au Plan 1. Le workflow `deploy.yml` n'est **pas** modifié : il se déclenche déjà sur `push: branches: [main]`.

- [ ] **Step 1: Confirmer que le déclencheur est en place (vérifiable tout de suite)**

```bash
grep -A2 '^on:' .github/workflows/deploy.yml
```
Expected: `push: { branches: [main] }` — aucune modification nécessaire.

- [ ] **Step 2: Instructions de vérification pour l'utilisateur (après merge sur `main`)**

1. Ouvrir `https://bendevcat.github.io/admin/`, se connecter au token.
2. Modifier un article (par ex. corriger un mot de la description), **Save**.
3. Constat binaire attendu :
   - `git log origin/main --oneline -1` (ou l'onglet Commits de GitHub) montre un **nouveau commit** créé par le CMS ;
   - l'onglet **Actions** montre un run `Deploy to GitHub Pages` **déclenché par ce commit** ;
   - une fois le run vert, la modification est visible sur le site.

- [ ] **Step 3: Enregistrer le constat dans le ledger**

Si l'utilisateur n'est pas disponible : R5 reste `In progress` (bloqué côté utilisateur), et la Phase Z ne peut pas conclure — écrire le handoff plutôt que de supposer.

---

## Phase Z — Verification

### Task Z1: Audit canonique

- [ ] **Step 1: Lancer `/anti-drift-planning:verify 2`**

Non contournable, non résumable de mémoire. C'est le **seul** chemin vers le script de release et le tag `milestone-plan-2`. Le gate échoue si une entrée du log de déviations est encore `pending-user`.

---

## Self-Review

**1. Spec coverage** — R1 → T-A1 (steps 7-8) · R2 → T-A1 (config) + T-A2 (auth réelle) · R3 → T-B1 (mapping + tests) + T-B2 (fichier réel) · R4 → T-B1 (`output`) + T-B2 (steps 3-4) · R5 → T-C2 · R6 → T-B1 (médias entry-relative) + T-B2 (steps 5-6) · R7 → T-C1 (README) + T-B2 (workflow local réellement suivi). Les 7 critères sont couverts. Les phases A/B/C de la spec §4 correspondent aux phases A/B/C du plan.

**2. Placeholder scan** — aucun « TBD » : chaque étape porte son fichier, sa commande et son résultat attendu. Le seul texte à composer au moment venu est le message de commit de T-B2 step 8, conditionnel à un correctif réel.

**3. Type consistency** — `loadCmsConfig()` est défini en T-A1 et réutilisé en T-B1 sous la même signature. Les noms de champs du YAML (T-B1 step 3) sont exactement ceux assertés au step 1 et ceux du Zod (`src/content.config.ts`), `relatedProjects` excepté — omission explicitement motivée et soumise à l'utilisateur.

**4. Risques identifiés** (à traiter par le protocole de déviation, pas en silence) :
- Sveltia `0.176.0` est sortie le jour même du plan ; si elle est cassée, changer de version épinglée **après** avoir loggé une déviation.
- R2 et R5 dépendent d'un PAT et d'un merge sur `main` : ce sont des vérifications côté utilisateur, elles peuvent laisser le plan en « prêt à ship, en attente ».
