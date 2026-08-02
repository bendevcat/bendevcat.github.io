# Plan 4 — Librairies prompts & skills — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [`docs/anti-drift/specs/2026-07-19-plan-4-librairies-prompts-skills.md`](../specs/2026-07-19-plan-4-librairies-prompts-skills.md)
**Ledger:** [`docs/anti-drift/handoffs/plan-4-ledger.md`](../handoffs/plan-4-ledger.md)
**Deviations:** [`docs/anti-drift/handoffs/plan-4-deviations.md`](../handoffs/plan-4-deviations.md)
**Branch:** `plan-4-librairies-prompts-skills` (off `main` @ Plan 3 vérifié PASS, `eb9deee`, tag `milestone-plan-3`)
**Date:** 2026-08-02

**Goal:** Rendre les prompts et les skills Claude Code de Benoît **parcourables et copiables** : deux collections jumelles (`prompts`, `skills`), une grille `/prompts` filtrable par format / outil / tag, une fiche `/prompts/<slug>` qui distingue *fiche* (prompt copiable en 1 clic) de *guide* (write-up), une grille `/skills` filtrable par tag / type, une page `/skills/<slug>` avec instructions, `installCmd` copiable, lien repo et **prompts liés résolus**, et l'édition des deux collections depuis le CMS.

**Architecture:** Les deux collections reprennent exactement le pattern éprouvé aux Plans 1 et 3 — loader `glob('**/index.{md,mdx}')` sur des *page bundles*, schéma Zod **verbatim de la spec de design** §3.3/§3.4, `reference()` pour la relation `skills ↔ prompts`. Les pages sont statiques ; le filtrage est un **enhancement JS vanilla** qui montre/masque des cartes déjà rendues côté serveur. Le prédicat de filtrage du Plan 3 est **généralisé** en un moteur à facettes (`src/lib/facetFilters.ts`) que `/prompts` (3 facettes) et `/skills` (2 facettes) consomment, `projectFilters.ts` devenant un adaptateur au-dessus — ses tests existants, inchangés, servent de preuve de non-régression. La copie 1 clic **réutilise le bouton de code-block du Plan 1** (`src/scripts/copy-code.ts`), auquel ce plan ajoute le **fallback exigé par la spec §6.1** (aujourd'hui absent). Le CMS gagne deux collections dans le même `config.yml`, avec le garde-fou de test qui fait échouer toute divergence CMS↔Zod.

**Tech Stack:** Astro 7.1.1 (Content Layer, `glob()`, `reference()`, `getEntries()`) · Tailwind v4 (tokens `--color-*` existants, **aucun nouveau token**) · TypeScript vanilla pour filtres et presse-papier (`src/scripts/`, `src/lib/`) · vitest 4 (fonctions pures + config CMS) · Sveltia CMS `0.175.1` (version épinglée, **inchangée**).

---

## Global Constraints

Valeurs exactes reprises des specs ; elles s'appliquent implicitement à **toutes** les tâches.

- **Aucun framework, aucun îlot** (spec P4 §6.1 et §6.3, spec de design §2 « îlots NON installés ») : filtres et copie sont du JS vanilla progressif. Interdiction d'installer React/Preact/Svelte/Alpine ou toute lib de filtrage/presse-papier.
- **Aucune nouvelle dépendance npm** — ni `dependencies`, ni `devDependencies`. Toute installation est une déviation. (Conséquence directe : **pas de jsdom**, donc rien qui dépende d'un DOM simulé n'est testable unitairement — voir la stratégie d'injection en T-B3.)
- **Schémas `prompts` et `skills` = spec de design §3.3 et §3.4, verbatim.** Ni champ en plus, ni champ en moins, mêmes noms, mêmes défauts, mêmes optionnalités. En particulier : `draft` **existe** pour ces deux collections (contrairement à `projects`), et `type` reste une `z.string()` libre avec défaut `'claude-code'` (spec P4 §5 : élargissement hors Claude Code = hors périmètre, mais le champ est prêt).
- **Le schéma Zod est la source de vérité** ; le CMS s'y conforme (précédent Plans 2 et 3). Toute divergence CMS↔Zod doit faire échouer `src/lib/cms-config.test.ts`.
- **Réutiliser le design system existant** : tokens `--color-{bg,surface,line,text,muted,acc,acc-dim,…}` de `src/styles/global.css` et les 3 polices `--font-{display,sans,mono}`. **Aucun nouveau token couleur.** Les cartes prompt et skill sont des **variantes** d'`ArticleCard.astro`/`ProjectCard.astro`, pas un nouveau design system.
- **URLs** : `/prompts`, `/prompts/<slug>`, `/skills`, `/skills/<slug>` (spec de design §4 — ces deux-là sont déjà en anglais dans la spec de routing, contrairement à `/projets`). Dossiers de contenu `src/content/prompts` et `src/content/skills`.
- **Version CDN Sveltia épinglée** : `https://unpkg.com/@sveltia/cms@0.175.1/dist/sveltia-cms.js`. Ce plan **ne met pas à jour** le CMS.
- **Aucun contenu existant modifié** (`src/content/blog/**`, `src/content/projects/**`) — aucun critère R4 de ce plan ne l'exige.
- **Responsive 375px** (R9) : aucune tâche livrant du gabarit n'est terminée sans un contrôle de non-débordement horizontal à 375px (`document.documentElement.scrollWidth === window.innerWidth`), en **dark et en light**.
- **`npx astro check` fait partie de la vérification de CHAQUE tâche** (leçon du Plan 2 : une régression de typecheck a traversé un implémenteur et deux relecteurs parce qu'aucune étape ne le lançait). Attendu : **0 error, 0 warning**. Les *hints* ne bloquent pas mais leur nombre est reporté.
- **Baseline à ne pas régresser**, mesurée sur la branche au moment d'écrire ce plan : `npm test` → **42 tests / 4 fichiers**, `npx astro check` → **0 error / 0 warning / 33 hints**, `npx astro build` → **9 pages**.
- **Node ≥ 22.12**, commandes via `npm run …` / `npx astro …`. Dev server : `astro dev --background` (CLAUDE.md).
- **Hors périmètre, à ne toucher sous aucun prétexte** : `src/pages/index.astro` (home et teasers satellites), `/tags`, Pagefind/recherche, `/a-propos`, `/transparence-ia`, `/404`, `astro.config.mjs`, `.github/workflows/deploy.yml`, `package.json`, `src/pages/rss.xml.js`.

---

## File Structure

| Fichier | Statut | Responsabilité |
|---|---|---|
| `src/content.config.ts` | **Modifié** (T-A1) | Collections `prompts` + `skills`, export `PROMPT_FORMATS`. Source de vérité des schémas. |
| `src/lib/references.ts` | **Créé** (T-A1) | Nouveau domicile de `assertEntriesResolved` (déplacé depuis `projects.ts`), garde-fou de résolution des `reference()`. Une seule responsabilité, partagée par 4 pages. |
| `src/lib/projects.ts` | **Modifié** (T-A1) | Perd `assertEntriesResolved` (déplacée), garde `sortProjects`/`collectStacks`/`getSortedProjects`. |
| `src/pages/projets/[...slug].astro` | **Modifié** (T-A1) | Import de `assertEntriesResolved` redirigé vers `references.ts`. Aucun autre changement. |
| `src/pages/blog/[...slug].astro` | **Modifié** (T-A1) | Idem — import redirigé uniquement. |
| `src/lib/prompts.ts` | **Créé** (T-A1) | Accès collection `prompts` + fonctions **pures** d'ordre et d'agrégation. Importe `astro:content` → jamais chargé par le navigateur. |
| `src/lib/prompts.test.ts` | **Créé** (T-A1) | Tests unitaires de l'ordre, du filtrage `draft` et des agrégations. |
| `src/lib/skills.ts` | **Créé** (T-A1) | Idem pour `skills`. |
| `src/lib/skills.test.ts` | **Créé** (T-A1) | Idem. |
| `src/content/prompts/<slug>/index.md` | **Créés** (T-A2) | ≥ 2 prompts **réels** (page bundles), dont ≥ 1 `fiche` et ≥ 1 `guide`. |
| `src/content/skills/<slug>/index.md` | **Créés** (T-A2) | ≥ 2 skills **réels** (page bundles). |
| `src/lib/facetFilters.ts` | **Créé** (T-B2) | Moteur de filtrage **pur** à N facettes, **sans aucun import** — partagé par le script navigateur et les tests. C'est la raison d'être du fichier séparé. |
| `src/lib/facetFilters.test.ts` | **Créé** (T-B2) | Matrice de tests du prédicat (facette absente, valeur sentinelle, combinaison ET, facette multi-valeurs). |
| `src/lib/projectFilters.ts` | **Modifié** (T-B2) | Devient un **adaptateur** au-dessus de `facetFilters.ts`. Signature publique inchangée. |
| `src/lib/projectFilters.test.ts` | **Lu, NON modifié** (T-B2) | Preuve de non-régression : il doit rester vert **sans une seule ligne changée**. |
| `src/scripts/facet-filters.ts` | **Créé** (T-B2) | Enhancement navigateur générique : révèle la barre, montre/masque les cartes, gère l'état vide. Servira `/prompts` **et** `/skills`. |
| `src/components/PromptCard.astro` | **Créé** (T-B1) | Carte prompt — variante de `ProjectCard.astro`. Porte le contrat `data-facet` que T-B2 consomme. |
| `src/pages/prompts/index.astro` | **Créé** (T-B1, complété T-B2) | Grille + barre de filtres + état vide. |
| `src/lib/promptView.ts` | **Créé** (T-B3) | Règle **pure** fiche vs guide (`shouldRenderPromptBlock`) — testable sans DOM. |
| `src/lib/promptView.test.ts` | **Créé** (T-B3) | Tests de la règle fiche/guide, y compris le cas « fiche sans `prompt` ». |
| `src/lib/clipboard.ts` | **Créé** (T-B3) | `copyText()` : API moderne + **fallback** (spec §6.1), avec injection de dépendances pour être testable **sans jsdom**. |
| `src/lib/clipboard.test.ts` | **Créé** (T-B3) | 4 cas : succès moderne, échec moderne → fallback OK, les deux échouent, absence totale d'API. |
| `src/scripts/copy-code.ts` | **Modifié** (T-B3) | Passe par `copyText()` et affiche un feedback d'échec. Comportement du succès **inchangé** (blog et projets en dépendent). |
| `src/pages/prompts/[...slug].astro` | **Créé** (T-B3) | Fiche vs guide, bloc `prompt` copiable, métadonnées, skills liés (**addition n°2**, voir §Additions). |
| `src/components/SkillCard.astro` | **Créé** (T-C1) | Carte skill — variante de `PromptCard.astro`. |
| `src/pages/skills/index.astro` | **Créé** (T-C1) | Grille + filtres tag/type + état vide. |
| `src/pages/skills/[...slug].astro` | **Créé** (T-C2) | Instructions, `installCmd` copiable, lien repo, **prompts liés résolus**. |
| `src/components/Header.astro` | **Modifié** (T-C2) | Active les liens de nav « Prompts » et « Skills ». **Addition n°1**, voir §Additions. |
| `src/styles/global.css` | **Modifié** (T-B2 si nécessaire) | Règle de masquage `[hidden]` déjà présente depuis le Plan 3 — à **vérifier**, pas à dupliquer. |
| `public/admin/config.yml` | **Modifié** (T-D1) | Collections `prompts` + `skills`. |
| `src/lib/cms-config.test.ts` | **Modifié** (T-D1) | Étend le garde-fou anti-drift aux 2 nouvelles collections. |
| `README.md` | **Modifié** (T-D1) | La section « suppression propre » du Plan 3 mentionne 2 collections ; elle en couvrira 4. |
| `src/components/ArticleCard.astro`, `src/components/ProjectCard.astro` | **Lus, non modifiés** | Modèles visuels des nouvelles cartes. |
| `src/lib/posts.ts` | **Lu, non modifié** | Modèle du filtrage `draft`. |

---

## Requirement → Task map

| R | Critère (spec §3) | Tâche(s) |
|---|---|---|
| R1 | Collections `prompts` + `skills` + schémas Zod (page bundles) — build valide **ET** ≥ 2 prompts + ≥ 2 skills réels | T-A1 (schémas + helpers + tests) · T-A2 (contenu réel) |
| R2 | `/prompts` grille + filtre format/outil/tag | T-B1 (grille) · T-B2 (filtre) |
| R3 | Copie 1 clic du prompt + feedback visuel | T-B3 |
| R4 | `/prompts/<slug>` distingue fiche vs guide | T-B3 |
| R5 | `/skills` grille + filtre tag/type | T-C1 |
| R6 | `/skills/<slug>` : instructions + `installCmd` copiable + repo + prompts liés | T-C2 |
| R7 | Relation `skills ↔ prompts` résolue, aucun `undefined` | T-A1 (schéma + garde-fou) · T-A2 (données) · T-C2 (rendu) |
| R8 | Prompts & skills éditables via le CMS | T-D1 (config + garde-fou de test) · T-D2 (création réelle — **geste utilisateur**) |
| R9 | Dark editorial-dev + responsive 375px | T-B1 · T-B2 · T-B3 · T-C1 · T-C2 (contrôle dans chaque tâche livrant du gabarit) |

---

## Additions au-delà de la lettre de la spec — à valider au gate de pré-flight

Ces trois points ne sont exigés par **aucun** critère R. Ils sont listés ici pour être **approuvés ou coupés explicitement** avant T-A1. S'ils sont coupés, les étapes correspondantes disparaissent du plan et rien d'autre ne bouge.

1. **Activation des liens de nav « Prompts » et « Skills »** (T-C2). `src/components/Header.astro:12-18` les rend aujourd'hui **non cliquables** (`<span aria-disabled="true" title="Bientôt disponible">`), avec le commentaire « les autres piliers arrivent au Plan 4-5 ». Sans cette activation, `/prompts` et `/skills` existent mais ne sont atteignables qu'en tapant l'URL. Même addition, même justification, que l'addition n°1 ratifiée au Plan 3 pour « Projets ».
2. **Sens `prompt → skills liés`** (T-B3). R6 et R7 n'exigent que le sens **skill → prompts** (« Un skill liste ses prompts liés »). Le champ `relatedSkills` existe pourtant côté `prompts` dans la spec de design §3.3, et le titre du critère R7 écrit `skills ↔ prompts` avec une **double flèche**. Rendre le sens retour coûte ~10 lignes et rend la « navigation croisée » réellement croisée. **Sans cette addition, `relatedSkills` reste un champ de données jamais affiché.**
3. **`delete: false` sur les 2 nouvelles collections CMS** (T-D1). Le Plan 3 a établi (déviation **D08, approuvée**) que le CMS ne nettoie **jamais** les rétro-références et qu'une suppression depuis `/admin` casse `astro build` en produisant **0 page**. Le risque est **identique** ici : la relation `skills ↔ prompts` est symétrique. Poser la même clé est cohérent, mais c'est un choix **observable par l'utilisateur** (le bouton « Supprimer » disparaît) que la spec du Plan 4 ne mentionne pas → il est ratifié ici, avant exécution, plutôt que glissé en silence.

---

## Décisions d'implémentation tranchées par ce plan

La spec est muette sur ces points ; le plan les fixe pour qu'ils soient ratifiés au gate plutôt que décidés en silence pendant l'exécution.

- **Réutilisation du filtre — périmètre exact** (T-B2). La spec §6.3 dit « composant filtre réutilisé ». Ce plan réutilise le **prédicat** en le généralisant (`facetFilters.ts`), et `projectFilters.ts` devient un adaptateur — donc **un seul moteur de filtrage** dans le repo. En revanche le **script DOM** du Plan 3 (`src/scripts/project-filters.ts`) n'est **pas** migré : sa réécriture toucherait une page livrée et vérifiée sans qu'aucun critère du Plan 4 ne l'exige. `/prompts` et `/skills` partagent un nouveau script générique (`src/scripts/facet-filters.ts`). Résiduel assumé : deux scripts DOM coexistent, au-dessus d'un moteur unique.
- **Réutilisation du bouton copier** (T-B3, spec §6.2). Le champ `prompt` et l'`installCmd` sont rendus dans un `<pre><code>` **à l'intérieur d'un `<article>`** ; `src/scripts/copy-code.ts` (Plan 1) leur accroche alors automatiquement son bouton « Copier » / « Copié ! ». Aucun second mécanisme de copie n'est écrit. **Corollaire non négociable** : les pages `/prompts/<slug>` et `/skills/<slug>` doivent avoir `<article>` pour racine et importer `copy-code.ts`, sinon R3 et R6 tombent.
- **Fallback presse-papier** (T-B3). La spec §6.1 exige « fallback + feedback visuel ». `copy-code.ts` du Plan 1 n'a **ni l'un ni l'autre en cas d'échec** : `await navigator.clipboard.writeText(...)` non gardé — en contexte non sécurisé ou permission refusée, la promesse rejette et le libellé ne change **jamais**, sans que l'utilisateur sache pourquoi. Ce plan comble le manque : `copyText()` tente l'API moderne, retombe sur `document.execCommand('copy')` via un `<textarea>` hors écran, et le bouton affiche « Échec — copie manuelle » si les deux échouent. **Le chemin nominal reste identique** au Plan 1 (blog et projets en dépendent).
- **Ordre des grilles** (T-A1) : `/prompts` et `/skills` trient par **titre A→Z** (`localeCompare('fr')`). Ni `pubDate` ni `startDate` n'existent dans ces schémas, et `featured` non plus — il n'y a donc pas d'ordre chronologique possible. Déterministe et testé.
- **Entrées `draft`** (T-A1) : `getSortedPrompts()` / `getSortedSkills()` écartent `draft: true`, comme `sortAndFilter` le fait pour le blog (`src/lib/posts.ts:5`). Conséquence : une entrée `draft` n'a **pas de route publique** et ne doit pas être liée depuis une autre — voir le garde-fou de T-C2.
- **Forme des filtres** (T-B2, T-C1) : boutons pour les facettes à cardinalité fermée ou faible (`format` sur `/prompts`, `type` sur `/skills`), `<select>` pour les facettes à cardinalité ouverte (`tool`, `tag`). Toutes les facettes se combinent en **ET**. La barre est rendue avec `hidden` et n'est révélée que par le script : **sans JS, aucun contrôle mort n'est affiché et toutes les cartes restent visibles** (enhancement progressif, comme au Plan 3).
- **État vide** (T-B2, T-C1) : si une combinaison ne laisse aucune carte, un message le dit au lieu d'afficher une grille vide.
- **Fiche sans `prompt`** (T-B3) : le schéma de la spec de design déclare `prompt` **optionnel** même pour une fiche. Le plan **ne durcit pas le schéma** (précédent Plan 3 : schéma verbatim). Au rendu, une fiche sans `prompt` affiche son corps **sans bloc de code vide** — la règle vit dans `shouldRenderPromptBlock()`, testée.
- **Pas de TOC sur les guides** : `TableOfContents.astro` existe (Plan 1, blog) mais aucun critère R4 ne le demande. Non branché. À rouvrir au Plan 5 si le besoin apparaît.
- **Pas d'image de couverture** : les schémas §3.3/§3.4 n'ont **ni `cover` ni `coverAlt`** — les cartes prompt/skill sont donc purement typographiques, et les schémas n'ont pas besoin de la forme `schema: ({ image }) => …`.

---

## Phase A — Collections & données (R1, R7)

### Task A1: Collections `prompts` + `skills` — schémas Zod, helpers, garde-fou de références

**Files:**
- Modify: `src/content.config.ts`
- Create: `src/lib/references.ts`
- Modify: `src/lib/projects.ts` (retire `assertEntriesResolved`, déplacée)
- Modify: `src/pages/projets/[...slug].astro:5` (import redirigé)
- Modify: `src/pages/blog/[...slug].astro` (import redirigé — repérer la ligne exacte)
- Create: `src/lib/prompts.ts`
- Create: `src/lib/prompts.test.ts`
- Create: `src/lib/skills.ts`
- Create: `src/lib/skills.test.ts`

**Interfaces:**
- Consumes: `astro:content` (`defineCollection`, `reference`, `z`, `getCollection`, `CollectionEntry`), `astro/loaders` (`glob`) — déjà importés dans `src/content.config.ts`.
- Produces (noms utilisés **tels quels** par T-A2, T-B1, T-B2, T-B3, T-C1, T-C2, T-D1) :
  - `src/content.config.ts` : `export const PROMPT_FORMATS = ['fiche', 'guide'] as const`
  - `src/lib/references.ts` : `assertEntriesResolved<T extends { id: string }>(ownerId: string, refs: { id: string; collection: string }[], resolved: (T | undefined)[]): T[]`
  - `src/lib/prompts.ts` : `type PromptEntry = CollectionEntry<'prompts'>`, `sortPrompts(p: PromptEntry[]): PromptEntry[]`, `collectTools(p: PromptEntry[]): string[]`, `collectPromptTags(p: PromptEntry[]): string[]`, `getSortedPrompts(): Promise<PromptEntry[]>`
  - `src/lib/skills.ts` : `type SkillEntry = CollectionEntry<'skills'>`, `sortSkills(s: SkillEntry[]): SkillEntry[]`, `collectTypes(s: SkillEntry[]): string[]`, `collectSkillTags(s: SkillEntry[]): string[]`, `getSortedSkills(): Promise<SkillEntry[]>`

**Contexte pour l'implémenteur :** les schémas ci-dessous sont la transcription **verbatim** de la spec de design §3.3 et §3.4 — ne rien ajouter, ne rien retirer, ne pas « améliorer » (pas de `superRefine` liant `format` et `prompt`, pas de `z.enum` sur `type`). Une collection vide est valide pour Astro ; le contenu arrive en T-A2, et le build émettra d'ici là un `[WARN] [glob-loader] No files found matching …` — attendu, il disparaît en T-A2. Le déplacement de `assertEntriesResolved` est un pur déplacement : **pas une ligne de son corps ne change**, seul son domicile change, parce que 4 pages (2 existantes + 2 de ce plan) vont en dépendre et qu'elle n'a rien à voir avec les projets.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/lib/prompts.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { sortPrompts, collectTools, collectPromptTags, type PromptEntry } from './prompts';

/** Fabrique d'entrées minimales — seuls les champs lus par les fonctions testées. */
function prompt(id: string, data: Partial<PromptEntry['data']> = {}): PromptEntry {
  return {
    id,
    collection: 'prompts',
    data: {
      title: id,
      description: '',
      format: 'fiche',
      tool: 'Claude',
      tags: [],
      draft: false,
      ...data,
    },
  } as unknown as PromptEntry;
}

describe('sortPrompts', () => {
  it('trie par titre A→Z en français', () => {
    const sorted = sortPrompts([
      prompt('c', { title: 'Zèbre' }),
      prompt('a', { title: 'Amorçage' }),
      prompt('b', { title: 'Écriture' }),
    ]);
    expect(sorted.map((p) => p.data.title)).toEqual(['Amorçage', 'Écriture', 'Zèbre']);
  });

  it('ne mute pas le tableau reçu', () => {
    const input = [prompt('b', { title: 'B' }), prompt('a', { title: 'A' })];
    sortPrompts(input);
    expect(input.map((p) => p.data.title)).toEqual(['B', 'A']);
  });
});

describe('collectTools', () => {
  it('renvoie l’union triée et dédoublonnée des outils', () => {
    const tools = collectTools([
      prompt('a', { tool: 'Claude' }),
      prompt('b', { tool: 'ChatGPT' }),
      prompt('c', { tool: 'Claude' }),
    ]);
    expect(tools).toEqual(['ChatGPT', 'Claude']);
  });

  it('renvoie un tableau vide quand il n’y a aucune entrée', () => {
    expect(collectTools([])).toEqual([]);
  });
});

describe('collectPromptTags', () => {
  it('aplatit, dédoublonne et trie les tags', () => {
    const tags = collectPromptTags([
      prompt('a', { tags: ['ia', 'claude-code'] }),
      prompt('b', { tags: ['claude-code', 'anti-drift'] }),
    ]);
    expect(tags).toEqual(['anti-drift', 'claude-code', 'ia']);
  });

  it('ignore les entrées sans tag', () => {
    expect(collectPromptTags([prompt('a'), prompt('b', { tags: ['x'] })])).toEqual(['x']);
  });
});
```

Créer `src/lib/skills.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { sortSkills, collectTypes, collectSkillTags, type SkillEntry } from './skills';

function skill(id: string, data: Partial<SkillEntry['data']> = {}): SkillEntry {
  return {
    id,
    collection: 'skills',
    data: {
      title: id,
      description: '',
      type: 'claude-code',
      tags: [],
      draft: false,
      ...data,
    },
  } as unknown as SkillEntry;
}

describe('sortSkills', () => {
  it('trie par titre A→Z en français', () => {
    const sorted = sortSkills([
      skill('b', { title: 'Vérification' }),
      skill('a', { title: 'Anti-drift' }),
    ]);
    expect(sorted.map((s) => s.data.title)).toEqual(['Anti-drift', 'Vérification']);
  });

  it('ne mute pas le tableau reçu', () => {
    const input = [skill('b', { title: 'B' }), skill('a', { title: 'A' })];
    sortSkills(input);
    expect(input.map((s) => s.data.title)).toEqual(['B', 'A']);
  });
});

describe('collectTypes', () => {
  it('renvoie l’union triée et dédoublonnée des types', () => {
    expect(
      collectTypes([
        skill('a', { type: 'claude-code' }),
        skill('b', { type: 'competence' }),
        skill('c', { type: 'claude-code' }),
      ]),
    ).toEqual(['claude-code', 'competence']);
  });
});

describe('collectSkillTags', () => {
  it('aplatit, dédoublonne et trie les tags', () => {
    expect(
      collectSkillTags([skill('a', { tags: ['b', 'a'] }), skill('b', { tags: ['a', 'c'] })]),
    ).toEqual(['a', 'b', 'c']);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npm test`
Expected: **FAIL** — `Failed to resolve import "./prompts"` et `"./skills"` (les modules n'existent pas encore). Les 42 tests préexistants restent verts.

- [ ] **Step 3: Ajouter les deux collections au `content.config.ts`**

Dans `src/content.config.ts`, ajouter la constante à côté des existantes (après la ligne `export const PROJECT_STATUSES = …`) :

```ts
export const PROMPT_FORMATS = ['fiche', 'guide'] as const;
```

Puis, **après** la définition de `projects` et **avant** l'export `collections`, ajouter :

```ts
// Schémas repris verbatim de la spec de design §3.3 et §3.4. Page bundles comme
// `blog` et `projects` : `src/content/<coll>/<slug>/index.md`. Pas de champ
// `cover` dans ces deux schémas — d'où la forme `schema: z.object(...)` et non
// `schema: ({ image }) => ...` : le helper `image()` n'a rien à optimiser ici.
const prompts = defineCollection({
  loader: glob({ pattern: '**/index.{md,mdx}', base: './src/content/prompts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    format: z.enum(PROMPT_FORMATS).default('fiche'),
    prompt: z.string().optional(),
    tool: z.string().default('Claude'),
    model: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    relatedSkills: z.array(reference('skills')).optional(),
  }),
});

// `type` reste une chaîne libre avec défaut 'claude-code' : la spec de design
// §3.4 le prévoit extensible (competence, howto…), et la spec P4 §5 garde
// l'élargissement hors périmètre du v1 — le champ est prêt, pas la donnée.
const skills = defineCollection({
  loader: glob({ pattern: '**/index.{md,mdx}', base: './src/content/skills' }),
  schema: z.object({
    title: z.string(),
    name: z.string().optional(),
    description: z.string(),
    type: z.string().default('claude-code'),
    tags: z.array(z.string()).default([]),
    version: z.string().optional(),
    repoUrl: z.string().url().optional(),
    installCmd: z.string().optional(),
    draft: z.boolean().default(false),
    relatedPrompts: z.array(reference('prompts')).optional(),
  }),
});
```

Et remplacer la dernière ligne :

```ts
export const collections = { blog, projects, prompts, skills };
```

- [ ] **Step 4: Déplacer `assertEntriesResolved` dans `src/lib/references.ts`**

Créer `src/lib/references.ts` avec le **corps exact** actuellement dans `src/lib/projects.ts:39-85` (JSDoc compris), en adaptant seulement la dernière phrase du JSDoc qui parle de T-B3/T-B4 :

```ts
/**
 * Garde-fou sur la résolution de références `reference()` (D06, Plan 3).
 *
 * `getEntries()` d'Astro ne lève PAS quand une référence est introuvable :
 * `createGetEntry` (astro/dist/content/runtime.js) fait
 * `console.warn(...); return;` — un `undefined` entre donc silencieusement
 * dans le tableau résolu, traverse le premier accès à `.data` et lève un
 * `TypeError` anonyme qui interrompt tout le build sans nommer la fiche
 * porteuse, la collection visée, ni l'id manquant.
 *
 * Ce garde-fou échoue au même endroit, avec un message diagnosticable. Il ne
 * filtre JAMAIS silencieusement une entrée manquante : une référence cassée
 * doit casser le build, pas disparaître discrètement de la page.
 *
 * Utilisé dans les quatre sens de relation du site : projet → articles,
 * article → projets (Plan 3), skill → prompts, prompt → skills (Plan 4).
 *
 * @param ownerId  id de l'entrée qui porte la référence (ex. `skill.id`).
 * @param refs     le tableau de références brut *avant* résolution — chaque
 *                 `reference()` se résout en `{ id, collection }` au
 *                 chargement du contenu, ce qui permet de nommer la cible
 *                 même quand `getEntries` a renvoyé `undefined`.
 * @param resolved le résultat brut de `getEntries(refs)`.
 */
export function assertEntriesResolved<T extends { id: string }>(
  ownerId: string,
  refs: { id: string; collection: string }[],
  resolved: (T | undefined)[],
): T[] {
  return resolved.map((entry, i) => {
    if (entry === undefined) {
      const ref = refs[i];
      throw new Error(
        `${ownerId} référence ${ref.collection} → "${ref.id}", introuvable. ` +
          `Vérifie que l'entrée existe encore et que l'id est correctement orthographié.`,
      );
    }
    return entry;
  });
}
```

Puis :
1. **Supprimer** la fonction et son JSDoc de `src/lib/projects.ts` (le fichier ne garde que `sortProjects`, `collectStacks`, `getSortedProjects`).
2. Dans `src/pages/projets/[...slug].astro`, séparer l'import : `import { getSortedProjects } from '../../lib/projects';` **+** `import { assertEntriesResolved } from '../../lib/references';`
3. Faire la même redirection dans `src/pages/blog/[...slug].astro` (repérer l'import existant avec `grep -n "assertEntriesResolved" src/pages/blog/\[...slug\].astro`).

- [ ] **Step 5: Écrire `src/lib/prompts.ts` et `src/lib/skills.ts`**

`src/lib/prompts.ts` :

```ts
import { getCollection, type CollectionEntry } from 'astro:content';

export type PromptEntry = CollectionEntry<'prompts'>;

/**
 * Ordre de la grille `/prompts` — titre A→Z (`localeCompare` en 'fr').
 * Le schéma §3.3 n'a ni date ni `featured` : il n'existe pas d'ordre
 * chronologique possible. Ne mute pas le tableau reçu.
 */
export function sortPrompts(prompts: PromptEntry[]): PromptEntry[] {
  return [...prompts].sort((a, b) => a.data.title.localeCompare(b.data.title, 'fr'));
}

/** Union triée des outils déclarés — alimente le `<select>` de filtre outil. */
export function collectTools(prompts: PromptEntry[]): string[] {
  return [...new Set(prompts.map((p) => p.data.tool))].sort((a, b) => a.localeCompare(b, 'fr'));
}

/** Union triée des tags déclarés — alimente le `<select>` de filtre tag. */
export function collectPromptTags(prompts: PromptEntry[]): string[] {
  return [...new Set(prompts.flatMap((p) => p.data.tags))].sort((a, b) => a.localeCompare(b, 'fr'));
}

/**
 * Prompts publiés, triés. Les `draft: true` sont écartés — même règle que le
 * blog (`sortAndFilter`, src/lib/posts.ts) : pas de route publique, donc les
 * lier depuis un skill produirait un lien mort.
 */
export async function getSortedPrompts(): Promise<PromptEntry[]> {
  return sortPrompts((await getCollection('prompts')).filter((p) => !p.data.draft));
}
```

`src/lib/skills.ts` :

```ts
import { getCollection, type CollectionEntry } from 'astro:content';

export type SkillEntry = CollectionEntry<'skills'>;

/** Ordre de la grille `/skills` — titre A→Z. Ne mute pas le tableau reçu. */
export function sortSkills(skills: SkillEntry[]): SkillEntry[] {
  return [...skills].sort((a, b) => a.data.title.localeCompare(b.data.title, 'fr'));
}

/** Union triée des types déclarés — alimente le filtre type. */
export function collectTypes(skills: SkillEntry[]): string[] {
  return [...new Set(skills.map((s) => s.data.type))].sort((a, b) => a.localeCompare(b, 'fr'));
}

/** Union triée des tags déclarés — alimente le `<select>` de filtre tag. */
export function collectSkillTags(skills: SkillEntry[]): string[] {
  return [...new Set(skills.flatMap((s) => s.data.tags))].sort((a, b) => a.localeCompare(b, 'fr'));
}

/** Skills publiés, triés — `draft: true` écartés (cf. `getSortedPrompts`). */
export async function getSortedSkills(): Promise<SkillEntry[]> {
  return sortSkills((await getCollection('skills')).filter((s) => !s.data.draft));
}
```

- [ ] **Step 6: Lancer les tests pour vérifier qu'ils passent**

Run: `npm test`
Expected: **PASS**, **52 tests / 6 fichiers** (42 baseline + 6 prompts + 4 skills). Aucun test préexistant modifié.

- [ ] **Step 7: Typecheck et build**

Run: `npx astro check`
Expected: **0 error, 0 warning** (reporter le nombre de hints).

Run: `npx astro build`
Expected: **9 pages** (aucune route nouvelle avant T-B1) + deux `[WARN] [glob-loader] No files found matching '**/index.{md,mdx}' in …/src/content/prompts` (et `skills`) — **attendus**, les collections sont vides jusqu'à T-A2.

- [ ] **Step 8: Prouver que le déplacement n'a rien cassé**

Le garde-fou déplacé protège deux pages livrées au Plan 3. Le prouver plutôt que le supposer :

```bash
grep -rn "assertEntriesResolved" src/
```
Expected: **3 occurrences** — la définition dans `src/lib/references.ts` et **exactement** deux imports (`src/pages/projets/[...slug].astro`, `src/pages/blog/[...slug].astro`). **Zéro** occurrence restante dans `src/lib/projects.ts`.

- [ ] **Step 9: Commit**

```bash
git add src/content.config.ts src/lib/references.ts src/lib/projects.ts src/lib/prompts.ts src/lib/prompts.test.ts src/lib/skills.ts src/lib/skills.test.ts "src/pages/projets/[...slug].astro" "src/pages/blog/[...slug].astro"
git commit -m "feat(p4): collections prompts + skills, helpers et garde-fou de références"
```

---

### Task A2: ≥ 2 prompts et ≥ 2 skills réels + relation `skills ↔ prompts`

**Files:**
- Create: `src/content/prompts/<slug>/index.md` (≥ 2, dont ≥ 1 `format: fiche` **et** ≥ 1 `format: guide`)
- Create: `src/content/skills/<slug>/index.md` (≥ 2)

**Interfaces:**
- Consumes: les schémas de T-A1. Aucun code.
- Produces: les **ids** (= noms de dossiers) que T-B1/T-C1/T-C2 afficheront et que T-D2 verra dans le CMS.

**⚠️ Cette tâche est la seule du plan qui ne peut pas être écrite sans l'utilisateur.** Un agent ne peut pas inventer les prompts et les skills de Benoît : ce sont des artefacts publics signés de son nom. Précédent direct : au Plan 3, T-A2 a dû être **amendée deux fois** parce que le plan avait présumé du contenu (`resumexyz`, puis `awesome-french-tech-rss-feeds` dont le dépôt s'est révélé vide). Le contenu ci-dessous est donc une **proposition à confirmer ou remplacer au gate de pré-flight** ; s'il change, le plan est **amendé avant** que T-A2 s'exécute (donc pas une déviation), comme au Plan 3.

**Matière réelle identifiée dans l'environnement de Benoît :**
- Le plugin **`anti-drift-planning`** (`/Users/bencat/workspace/claudeworkspaces/anti-drift-planning`) — **écrit par lui** : `plugin.json` porte `author.name: bendevcat`, `version: 0.4.0`, `license: MIT`, `homepage: https://github.com/bendevcat/anti-drift-planning`. Il contient une skill (`skills/anti-drift-planning/`) et 7 commandes.
- Le **prompt de bootstrap de session anti-drift** — réellement utilisé, y compris pour lancer cette session ; sa forme canonique est produite par `/anti-drift-planning:start-session N` et une instance vit dans `docs/anti-drift/handoffs/_next-session-prompt.md` **de ce dépôt**.
- La **méthodologie anti-drift elle-même** (`docs/anti-drift/specs/2026-07-19-methodology.md`) — matière d'un `format: guide`.

**Contraintes de véracité, non négociables (précédent Plan 3, revue T-A2) :** chaque valeur de frontmatter est un **fait vérifié sur la source**, jamais une supposition. En particulier `repoUrl` : le dépôt distant doit répondre **200** avant d'être écrit. Le `git remote -v` local du plugin `anti-drift-planning` est **vide** — l'existence de `https://github.com/bendevcat/anti-drift-planning` **n'est pas établie** et doit être vérifiée (Step 1). Un lien mort sur une vitrine publique est pire qu'un champ absent.

- [ ] **Step 1: Établir les faits sur la source avant d'écrire quoi que ce soit**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://github.com/bendevcat/anti-drift-planning
cat /Users/bencat/workspace/claudeworkspaces/anti-drift-planning/.claude-plugin/plugin.json
sed -n '1,40p' /Users/bencat/workspace/claudeworkspaces/anti-drift-planning/skills/anti-drift-planning/SKILL.md
ls /Users/bencat/workspace/claudeworkspaces/anti-drift-planning/commands/
```
Noter le code HTTP. **Si ≠ 200 : `repoUrl` est OMIS** (pas inventé), et le fait est reporté dans le rapport de tâche.

Faire le même contrôle pour tout `repoUrl` du second skill retenu au gate.

- [ ] **Step 2: Écrire le prompt `fiche`**

Créer `src/content/prompts/bootstrap-session-anti-drift/index.md`. Le champ `prompt` contient le **texte réellement collé** en début de session d'exécution — le récupérer depuis `docs/anti-drift/handoffs/_next-session-prompt.md` de ce dépôt et le transcrire **sans le reformuler**. Bloc scalaire YAML `|` pour préserver les sauts de ligne :

```markdown
---
title: "Prompt de bootstrap d'une session d'exécution anti-drift"
description: "Le prompt collé en tête de chaque session d'exécution d'un plan : il porte les verrous anti-dérive (test de déviation, statuts, protocole de réversibilité) et interdit à l'agent de trancher en silence."
format: fiche
tool: Claude Code
model: claude-opus-5
tags: [anti-drift, claude-code, méthodologie, prompt-engineering]
prompt: |
  <texte intégral du prompt de bootstrap, transcrit verbatim depuis
  docs/anti-drift/handoffs/_next-session-prompt.md — ne rien reformuler,
  ne rien abréger>
relatedSkills: [anti-drift-planning]
---

<corps = notes d'usage : quand le coller, ce qu'il produit, ce qu'il empêche.
Écrit au « tu », en français, ton du blog. 200-400 mots. Chaque affirmation
doit être vraie de l'usage réel qui en a été fait sur les Plans 1 à 3.>
```

**Points de vigilance YAML :** le contenu du bloc `|` est indenté de 2 espaces ; toute ligne moins indentée termine le bloc. Si le prompt contient des lignes vides, elles sont conservées telles quelles. Vérifier après écriture que `astro build` charge l'entrée (Step 5).

- [ ] **Step 3: Écrire le prompt `guide`**

Créer `src/content/prompts/decouper-un-projet-en-plans-anti-drift/index.md` — un write-up, **sans champ `prompt`** :

```markdown
---
title: "Découper un projet multi-sessions en plans anti-drift"
description: "Comment passer d'une vision trop grosse pour une session à N plans verticaux qui livrent chacun un résultat observable — et pourquoi c'est ça qui empêche le périmètre de fondre."
format: guide
tool: Claude Code
tags: [anti-drift, méthodologie, claude-code]
relatedSkills: [anti-drift-planning]
---

<corps = le write-up long. Source de vérité : la méthodologie réelle
(docs/anti-drift/specs/2026-07-19-methodology.md) et l'expérience des
Plans 1 à 3 de ce site. Structuré en H2/H3. Aucune affirmation inventée :
les exemples chiffrés viennent des ledgers existants.>
```

- [ ] **Step 4: Écrire les 2 skills et poser la relation dans les deux sens**

Créer `src/content/skills/anti-drift-planning/index.md` :

```markdown
---
title: "anti-drift-planning"
name: anti-drift-planning
description: "Méthodologie de planification multi-sessions résistante à la dérive : specs binaires, anti-arbitrage silencieux, scope ledger, phase de vérification, lint mécanique."
type: claude-code
version: "0.4.0"
repoUrl: <UNIQUEMENT si le Step 1 a renvoyé 200 — sinon champ absent>
installCmd: <la commande d'installation RÉELLE, relevée dans le README du plugin — sinon champ absent>
tags: [anti-drift, planification, claude-code, méthodologie]
relatedPrompts: [bootstrap-session-anti-drift, decouper-un-projet-en-plans-anti-drift]
---

<corps = à quoi sert la skill, quand elle se déclenche, les 5 verrous, le
cycle d'une session. Faits repris du SKILL.md et du plugin.json réels.>
```

Créer le **second skill** retenu au gate, avec la même exigence de véracité, et `relatedPrompts` renseigné s'il y a lieu.

Chaque `relatedSkills` / `relatedPrompts` doit pointer un **id existant** (= nom de dossier).

- [ ] **Step 5: Vérifier que le build charge les 4 entrées**

Run: `npx astro build`
Expected: **9 pages** (aucune route prompt/skill avant T-B1), et **plus aucun** `[WARN] [glob-loader] No files found matching` pour `prompts` ni `skills`.

Un échec de schéma est bruyant (`ZodError` nommant le fichier et le champ) — c'est le contrôle du critère R1 « `astro build` valide les 2 schémas ».

- [ ] **Step 6: Prouver que les références sont résolues — et qu'une référence cassée casse**

**Fait établi au Plan 3, à ne pas re-supposer :** `reference()` ne valide que la **forme** ; l'existence n'est contrôlée qu'à la **résolution**, donc un id cassé laisse le build **vert** tant qu'aucune page ne résout la référence. Avant T-C2, la seule façon de le prouver est une **sonde temporaire**.

Créer `src/pages/probe-refs.astro` (**sans underscore initial** : Astro exclut du routage les fichiers préfixés par `_`, une sonde `_probe-refs.astro` ne produirait jamais de page — erreur factuelle du plan 3, déviation D04) :

```astro
---
import { getEntries } from 'astro:content';
import { getSortedPrompts } from '../lib/prompts';
import { getSortedSkills } from '../lib/skills';
import { assertEntriesResolved } from '../lib/references';

const lines: string[] = [];

for (const skill of await getSortedSkills()) {
  const refs = skill.data.relatedPrompts ?? [];
  if (!refs.length) continue;
  for (const p of assertEntriesResolved(skill.id, refs, await getEntries(refs))) {
    lines.push(`skill ${skill.id} -> prompt ${p.id} : ${p.data.title}`);
  }
}

for (const prompt of await getSortedPrompts()) {
  const refs = prompt.data.relatedSkills ?? [];
  if (!refs.length) continue;
  for (const s of assertEntriesResolved(prompt.id, refs, await getEntries(refs))) {
    lines.push(`prompt ${prompt.id} -> skill ${s.id} : ${s.data.title}`);
  }
}
---
<pre>{lines.join('\n')}</pre>
```

```bash
npx astro build && cat dist/probe-refs/index.html
```
Expected: une ligne par référence, **chacune avec l'id ET le titre de la cible**, **aucun `undefined`**, dans les **deux sens**.

Puis **prouver l'échec** : casser volontairement un id de `relatedPrompts` en `nexiste-pas`, relancer `npx astro build`, et exiger un échec en **sortie ≠ 0** portant le message du garde-fou (`… référence prompts → "nexiste-pas", introuvable.`). Restaurer l'id, relancer le build, puis **supprimer la sonde** :

```bash
rm src/pages/probe-refs.astro
npx astro build   # 9 pages, arbre propre
git status --porcelain   # aucun reliquat de sonde
```

- [ ] **Step 7: Typecheck**

Run: `npx astro check`
Expected: **0 error, 0 warning**.

Run: `npm test`
Expected: **52 tests**, inchangés.

- [ ] **Step 8: Commit**

```bash
git add src/content/prompts src/content/skills
git commit -m "feat(p4): 2 prompts et 2 skills reels + relation skills<->prompts"
```

---

## Phase B — Pages prompts (R2, R3, R4, R9)

### Task B1: Carte prompt + grille `/prompts`

**Files:**
- Create: `src/components/PromptCard.astro`
- Create: `src/pages/prompts/index.astro`

**Interfaces:**
- Consumes: `getSortedPrompts` (T-A1), `PromptEntry` (T-A1).
- Produces: le **contrat DOM** que T-B2 consomme, et que T-C1 réplique :
  - chaque carte porte `data-facet-card` et `data-facet='{"format":[…],"tool":[…],"tag":[…]}'` (JSON, valeurs **toujours** en tableau)
  - la grille est suivie d'un `<p data-facet-empty hidden>`

**Contexte pour l'implémenteur :** `src/components/ProjectCard.astro` est le modèle visuel — le lire d'abord. Différence structurelle : les schémas prompts/skills **n'ont pas de `cover`**, donc pas de `<Image>` ; la carte est purement typographique. Le contrat `data-facet` est du **JSON sérialisé par Astro** : une valeur hostile (apostrophes, `<script>`, `&`) est échappée correctement et se `JSON.parse` sans erreur côté navigateur — vérifié au Plan 3 sur `data-stack`, même mécanisme.

- [ ] **Step 1: Écrire `src/components/PromptCard.astro`**

```astro
---
import type { CollectionEntry } from 'astro:content';

interface Props {
  prompt: CollectionEntry<'prompts'>;
}

const { prompt } = Astro.props;
const { title, description, format, tool, tags } = prompt.data;

// Contrat lu par src/scripts/facet-filters.ts (T-B2). Toutes les valeurs sont
// des tableaux, même les facettes mono-valeur : le prédicat n'a alors qu'un
// seul cas à traiter (`includes`). JSON.stringify garantit qu'aucun libellé,
// si hostile soit-il, ne casse le parsing côté navigateur.
const facets = JSON.stringify({ format: [format], tool: [tool], tag: tags });
---

<a
  href={`/prompts/${prompt.id}/`}
  class="group flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-acc/50"
  data-facet-card
  data-facet={facets}
>
  <div class="flex flex-wrap items-center gap-2">
    <span class="w-fit rounded-full border border-line px-2 py-0.5 font-mono text-xs text-muted">
      {format}
    </span>
    <span class="w-fit rounded-full border border-line px-2 py-0.5 font-mono text-xs text-muted">
      {tool}
    </span>
  </div>

  <h3 class="font-display text-lg font-semibold text-text group-hover:text-acc">
    {title}
  </h3>

  <p class="text-sm text-muted">{description}</p>

  {
    tags.length > 0 && (
      <ul class="mt-auto flex flex-wrap gap-2 pt-2" aria-label="Tags">
        {tags.map((tag) => (
          <li class="rounded border border-line px-2 py-0.5 font-mono text-xs text-muted">
            {tag}
          </li>
        ))}
      </ul>
    )
  }
</a>
```

- [ ] **Step 2: Écrire `src/pages/prompts/index.astro` (grille seule, filtres en T-B2)**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import PromptCard from '../../components/PromptCard.astro';
import { getSortedPrompts } from '../../lib/prompts';

// getSortedPrompts() applique déjà l'ordre du plan (titre A→Z) et écarte les
// `draft` — cf. src/lib/prompts.ts. Pas de re-tri ici.
const prompts = await getSortedPrompts();
---

<BaseLayout
  title="Prompts — bencat_"
  description="La bibliothèque de prompts de bencat_ : fiches copiables et guides."
>
  <main>
    <section class="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <p class="font-mono text-sm text-acc">~/ prompts</p>
      <h1 class="mt-4 font-display text-4xl font-bold text-text sm:text-5xl">Prompts</h1>
    </section>

    <section class="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {prompts.map((prompt) => <PromptCard prompt={prompt} />)}
      </div>

      <p class="mt-8 font-mono text-sm text-muted" data-facet-empty hidden>
        Aucun prompt ne correspond à ce filtre.
      </p>
    </section>
  </main>
</BaseLayout>
```

- [ ] **Step 3: Build et typecheck**

Run: `npx astro build`
Expected: **10 pages** (9 + `/prompts`).

Run: `npx astro check`
Expected: **0 error, 0 warning**.

Run: `npm test`
Expected: **52 tests**, inchangés.

- [ ] **Step 4: Smoke navigateur — R2 (grille) et R9**

Démarrer le serveur (`astro dev --background`), ouvrir `/prompts` et **relever des mesures, pas des impressions** :

1. Nombre de cartes rendues : `document.querySelectorAll('[data-facet-card]').length` → **≥ 2**.
2. Chaque carte affiche titre, description, `format` et `tool`.
3. Les `href` pointent vers `/prompts/<id>/` — ils sont **404 jusqu'à T-B3**, c'est attendu et à reporter.
4. `data-facet` de chaque carte se `JSON.parse` sans erreur et contient les 3 clés `format`, `tool`, `tag`.
5. **375px, dark ET light** : `document.documentElement.scrollWidth === window.innerWidth` (attendu `375 === 375`) et la liste des éléments plus larges que le viewport est **vide** :
```js
[...document.querySelectorAll('*')].filter(e => e.getBoundingClientRect().width > window.innerWidth).map(e => e.tagName + '.' + e.className)
```

- [ ] **Step 5: Commit**

```bash
git add src/components/PromptCard.astro src/pages/prompts/index.astro
git commit -m "feat(p4): carte prompt et grille /prompts"
```

---

### Task B2: Moteur de filtrage à facettes + filtres de `/prompts`

**Files:**
- Create: `src/lib/facetFilters.ts`
- Create: `src/lib/facetFilters.test.ts`
- Modify: `src/lib/projectFilters.ts` (devient un adaptateur)
- Create: `src/scripts/facet-filters.ts`
- Modify: `src/pages/prompts/index.astro` (barre de filtres + import du script)
- Read-only: `src/lib/projectFilters.test.ts` — **interdit de le modifier** (c'est la preuve de non-régression)
- Read-only: `src/styles/global.css` — vérifier que la règle `[hidden]` du Plan 3 existe déjà

**Interfaces:**
- Consumes: le contrat DOM de T-B1 (`data-facet-card`, `data-facet`, `data-facet-empty`).
- Produces (utilisés tels quels par T-C1) :
  - `src/lib/facetFilters.ts` : `export const ALL = '__all__'`, `type FacetValues = Record<string, string[]>`, `type FacetSelection = Record<string, string>`, `matchesFacets(entry: FacetValues, selected: FacetSelection): boolean`
  - contrat des contrôles : `<button data-facet-key="<clé>" data-facet-value="<valeur|__all__>" aria-pressed>` et `<select data-facet-key="<clé>">`, tous dans un conteneur `[data-facet-filters]` rendu `hidden`.

**Contexte pour l'implémenteur :** `src/lib/projectFilters.ts` (Plan 3) est l'ancêtre direct de ce module — le lire. Sa contrainte fondatrice est reprise telle quelle : **aucun import**, parce que le fichier est chargé à la fois par le navigateur et par vitest. `src/scripts/project-filters.ts` est le modèle du script DOM ; il **n'est pas** migré (décision ratifiée au gate) — le nouveau script est générique et sert `/prompts` puis `/skills`.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/lib/facetFilters.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { ALL, matchesFacets } from './facetFilters';

const entry = { format: ['fiche'], tool: ['Claude'], tag: ['ia', 'anti-drift'] };

describe('matchesFacets', () => {
  it('accepte tout quand chaque facette vaut la sentinelle', () => {
    expect(matchesFacets(entry, { format: ALL, tool: ALL, tag: ALL })).toBe(true);
  });

  it('accepte quand une facette mono-valeur correspond', () => {
    expect(matchesFacets(entry, { format: 'fiche' })).toBe(true);
  });

  it('refuse quand une facette mono-valeur ne correspond pas', () => {
    expect(matchesFacets(entry, { format: 'guide' })).toBe(false);
  });

  it('accepte quand la valeur est PARMI celles d’une facette multi-valeurs', () => {
    expect(matchesFacets(entry, { tag: 'anti-drift' })).toBe(true);
  });

  it('combine les facettes en ET', () => {
    expect(matchesFacets(entry, { format: 'fiche', tag: 'ia' })).toBe(true);
    expect(matchesFacets(entry, { format: 'fiche', tag: 'inconnu' })).toBe(false);
  });

  it('refuse quand la facette sélectionnée est absente de l’entrée', () => {
    expect(matchesFacets(entry, { inexistante: 'x' })).toBe(false);
  });

  it('accepte quand la facette absente de l’entrée vaut la sentinelle', () => {
    expect(matchesFacets(entry, { inexistante: ALL })).toBe(true);
  });

  it('refuse une entrée dont la facette est un tableau vide', () => {
    expect(matchesFacets({ tag: [] }, { tag: 'ia' })).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npm test`
Expected: **FAIL** — `Failed to resolve import "./facetFilters"`.

- [ ] **Step 3: Écrire `src/lib/facetFilters.ts`**

```ts
/**
 * Moteur de filtrage à facettes, partagé par /prompts et /skills — et, via
 * l'adaptateur `projectFilters.ts`, par /projets.
 *
 * AUCUN import ici — surtout pas `astro:content`. Ce module est chargé par le
 * navigateur (src/scripts/facet-filters.ts) ET par les tests unitaires ; le
 * garder sans dépendance est ce qui rend les deux possibles.
 *
 * Toutes les valeurs d'entrée sont des tableaux, même les facettes
 * mono-valeur (`format: ['fiche']`) : le prédicat n'a alors qu'un seul cas à
 * traiter, et une facette mono-valeur peut devenir multi sans rien changer
 * ici.
 */

/** Valeur sentinelle « aucun filtre » — jamais une valeur de facette réelle. */
export const ALL = '__all__';

/** Facettes d'une entrée : clé → valeurs portées par cette entrée. */
export type FacetValues = Record<string, string[]>;

/** Sélection courante : clé → valeur choisie, ou `ALL`. */
export type FacetSelection = Record<string, string>;

/**
 * Vrai si l'entrée satisfait TOUTES les facettes sélectionnées (ET).
 * Une facette sélectionnée mais absente de l'entrée exclut l'entrée — c'est
 * volontaire : filtrer sur `tag: 'ia'` ne doit pas laisser passer une entrée
 * sans tag.
 */
export function matchesFacets(entry: FacetValues, selected: FacetSelection): boolean {
  return Object.entries(selected).every(
    ([key, value]) => value === ALL || (entry[key] ?? []).includes(value),
  );
}
```

- [ ] **Step 4: Transformer `projectFilters.ts` en adaptateur**

Remplacer **le corps** de `src/lib/projectFilters.ts` par (l'API publique — `ALL`, `ProjectFilterEntry`, `ProjectFilterSelection`, `matchesFilters` — ne change **pas**) :

```ts
/**
 * Prédicat de filtrage de la grille `/projets` (Plan 3).
 *
 * Depuis le Plan 4, ce module est un ADAPTATEUR au-dessus de
 * `facetFilters.ts` : il n'y a plus qu'un seul moteur de filtrage dans le
 * repo. Son API publique est inchangée, et `projectFilters.test.ts` — non
 * modifié — sert de preuve de non-régression.
 *
 * AUCUN import `astro:content` ici : ce module est chargé par le navigateur.
 */
import { ALL, matchesFacets } from './facetFilters';

export { ALL };

export interface ProjectFilterEntry {
  status: string;
  stack: string[];
}

export interface ProjectFilterSelection {
  status: string;
  stack: string;
}

/** Les deux critères se combinent en ET (spec P3 R3). */
export function matchesFilters(
  entry: ProjectFilterEntry,
  selected: ProjectFilterSelection,
): boolean {
  return matchesFacets(
    { status: [entry.status], stack: entry.stack },
    { status: selected.status, stack: selected.stack },
  );
}
```

- [ ] **Step 5: Lancer les tests — le moteur passe ET l'ancien contrat tient**

Run: `npm test`
Expected: **PASS**, **60 tests** (52 + 8 nouveaux). `src/lib/projectFilters.test.ts` passe **sans avoir été touché** — c'est la preuve que l'adaptateur est fidèle.

```bash
git diff --stat src/lib/projectFilters.test.ts
```
Expected: **sortie vide**.

- [ ] **Step 6: Écrire `src/scripts/facet-filters.ts`**

```ts
import { ALL, matchesFacets, type FacetSelection } from '../lib/facetFilters';

const toolbar = document.querySelector<HTMLElement>('[data-facet-filters]');
const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-facet-card]'));
const emptyState = document.querySelector<HTMLElement>('[data-facet-empty]');

if (toolbar && cards.length > 0) {
  const buttons = Array.from(toolbar.querySelectorAll<HTMLButtonElement>('button[data-facet-key]'));
  const selects = Array.from(toolbar.querySelectorAll<HTMLSelectElement>('select[data-facet-key]'));

  // Une clé par contrôle présent dans la barre ; tout démarre sur la sentinelle.
  const selected: FacetSelection = {};
  for (const key of [...buttons, ...selects].map((el) => el.dataset.facetKey ?? '')) {
    if (key) selected[key] = ALL;
  }

  const apply = () => {
    let visible = 0;

    for (const card of cards) {
      let facets: Record<string, string[]> = {};
      try {
        facets = JSON.parse(card.dataset.facet ?? '{}');
      } catch {
        facets = {}; // data-facet malformé : la carte se comporte comme sans facette
      }
      const show = matchesFacets(facets, selected);
      card.hidden = !show;
      if (show) visible += 1;
    }

    if (emptyState) emptyState.hidden = visible > 0;

    for (const button of buttons) {
      const key = button.dataset.facetKey ?? '';
      const isCurrent = (button.dataset.facetValue ?? ALL) === selected[key];
      button.setAttribute('aria-pressed', String(isCurrent));
    }
  };

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const key = button.dataset.facetKey ?? '';
      if (key) selected[key] = button.dataset.facetValue ?? ALL;
      apply();
    });
  }

  for (const select of selects) {
    select.addEventListener('change', () => {
      const key = select.dataset.facetKey ?? '';
      if (key) selected[key] = select.value || ALL;
      apply();
    });
  }

  // Révélation de la barre : sans JS elle reste `hidden`, donc aucun contrôle
  // inopérant n'est affiché et toutes les cartes restent visibles.
  toolbar.hidden = false;
  apply();
}
```

- [ ] **Step 7: Brancher la barre de filtres sur `/prompts`**

Dans `src/pages/prompts/index.astro`, compléter le frontmatter :

```ts
import { getSortedPrompts, collectTools, collectPromptTags } from '../../lib/prompts';
import { PROMPT_FORMATS } from '../../content.config';
import { ALL } from '../../lib/facetFilters';

const prompts = await getSortedPrompts();
const tools = collectTools(prompts);
const tags = collectPromptTags(prompts);
```

Puis insérer la barre **avant** la grille, à l'intérieur de la `<section>` :

```astro
{/*
  `hidden` côté serveur : révélé par src/scripts/facet-filters.ts.
  Sans JS, aucun contrôle mort n'est affiché et toutes les cartes restent
  visibles (enhancement progressif, spec §6.3).
*/}
<div
  class="mb-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
  data-facet-filters
  hidden
>
  <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrer par format">
    <button
      type="button"
      data-facet-key="format"
      data-facet-value={ALL}
      aria-pressed="true"
      class="rounded-full border border-line px-3 py-1 font-mono text-xs text-muted transition-colors hover:border-acc hover:text-acc aria-pressed:border-acc aria-pressed:text-acc"
    >
      tous
    </button>
    {
      PROMPT_FORMATS.map((format) => (
        <button
          type="button"
          data-facet-key="format"
          data-facet-value={format}
          aria-pressed="false"
          class="rounded-full border border-line px-3 py-1 font-mono text-xs text-muted transition-colors hover:border-acc hover:text-acc aria-pressed:border-acc aria-pressed:text-acc"
        >
          {format}
        </button>
      ))
    }
  </div>

  <div class="flex flex-wrap items-center gap-3">
    {
      tools.length > 0 && (
        <label class="flex items-center gap-2 font-mono text-xs text-muted">
          outil
          <select
            data-facet-key="tool"
            class="rounded-lg border border-line bg-surface px-2 py-1 font-mono text-xs text-text"
          >
            <option value={ALL}>tous</option>
            {tools.map((tool) => (
              <option value={tool}>{tool}</option>
            ))}
          </select>
        </label>
      )
    }
    {
      tags.length > 0 && (
        <label class="flex items-center gap-2 font-mono text-xs text-muted">
          tag
          <select
            data-facet-key="tag"
            class="rounded-lg border border-line bg-surface px-2 py-1 font-mono text-xs text-text"
          >
            <option value={ALL}>tous</option>
            {tags.map((tag) => (
              <option value={tag}>{tag}</option>
            ))}
          </select>
        </label>
      )
    }
  </div>
</div>
```

Et, juste avant `</BaseLayout>` :

```astro
<script>
  import '../../scripts/facet-filters.ts';
</script>
```

- [ ] **Step 8: Vérifier que la règle CSS `[hidden]` existe déjà**

```bash
grep -n "hidden" src/styles/global.css
```
Le Plan 3 a ajouté une règle rendant `[hidden]` effectif malgré les utilitaires Tailwind. **Si elle existe et n'est pas restreinte à `/projets` par un sélecteur, ne rien ajouter.** Si elle est restreinte, l'élargir — et le dire dans le rapport de tâche.

- [ ] **Step 9: Build, typecheck, tests**

Run: `npx astro build` → **10 pages**.
Run: `npx astro check` → **0 error, 0 warning**.
Run: `npm test` → **60 tests**.

- [ ] **Step 10: Smoke navigateur — R2 (filtre) par COMPTAGE, pas à l'œil**

Sur `/prompts` :

```js
const visible = () => [...document.querySelectorAll('[data-facet-card]')].filter(c => !c.hidden).length;
```
1. Barre **visible** avec JS ; état initial = toutes les cartes visibles.
2. Cliquer `format = fiche` → `visible()` égale le nombre réel de fiches, et **aucune** carte visible ne porte `"format":["guide"]` dans son `data-facet`. **C'est la clause binaire de R2** (« filtrer par `format` → seules les entrées correspondantes restent »).
3. Cliquer `format = guide` → symétrique.
4. Choisir un `tool`, puis un `tag` → la combinaison est un **ET** (comptage cohérent).
5. Combinaison sans résultat → `[data-facet-empty]` **visible**, grille vide.
6. Revenir sur `tous` partout → toutes les cartes reviennent.
7. **Sans JS** (désactiver JavaScript, recharger) : la barre reste **invisible** et **toutes** les cartes sont affichées.
8. **375px, dark ET light** : contrôle de non-débordement (même mesure qu'en T-B1), barre de filtres comprise.

- [ ] **Step 11: Commit**

```bash
git add src/lib/facetFilters.ts src/lib/facetFilters.test.ts src/lib/projectFilters.ts src/scripts/facet-filters.ts src/pages/prompts/index.astro
git commit -m "feat(p4): moteur de filtrage a facettes + filtres format/outil/tag sur /prompts"
```

---

### Task B3: `/prompts/<slug>` — fiche vs guide, copie 1 clic, fallback presse-papier

**Files:**
- Create: `src/lib/promptView.ts`
- Create: `src/lib/promptView.test.ts`
- Create: `src/lib/clipboard.ts`
- Create: `src/lib/clipboard.test.ts`
- Modify: `src/scripts/copy-code.ts`
- Create: `src/pages/prompts/[...slug].astro`

**Interfaces:**
- Consumes: `getSortedPrompts` (T-A1), `assertEntriesResolved` (T-A1), `getSortedSkills` (T-A1 — pour l'addition n°2).
- Produces (utilisés tels quels par T-C2) :
  - `src/lib/clipboard.ts` : `interface ClipboardDeps { writeText?: (t: string) => Promise<void>; legacyCopy?: (t: string) => boolean }`, `copyText(text: string, deps?: ClipboardDeps): Promise<boolean>`
  - `src/lib/promptView.ts` : `shouldRenderPromptBlock(format: 'fiche' | 'guide', prompt?: string): boolean`
  - le **pattern de bloc copiable** : un `<pre><code>` **à l'intérieur du `<article>`**, avec `src/scripts/copy-code.ts` importé par la page.

**Contexte pour l'implémenteur — trois faits établis, à ne pas re-supposer :**
1. `src/scripts/copy-code.ts` (Plan 1) accroche un bouton « Copier » à **tout `article pre`**. Rendre le champ `prompt` dans un `<pre><code>` sous un `<article>` suffit donc à satisfaire R3 — **aucun second mécanisme de copie ne doit être écrit** (spec §6.2 : « réutilisant le composant code-block du Plan 1 »).
2. Le texte copié est capturé **avant** l'ajout du bouton au DOM (`copy-code.ts:8`) : sinon le libellé du bouton finirait au presse-papier. Ne pas casser cet ordre.
3. **Il n'y a pas de jsdom dans ce repo** et en ajouter un est interdit. `copyText()` est donc conçue avec **injection de dépendances** : elle est testable en environnement Node avec de faux `writeText`/`legacyCopy`, sans aucun DOM.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/lib/clipboard.test.ts` :

```ts
import { describe, it, expect, vi } from 'vitest';
import { copyText } from './clipboard';

describe('copyText', () => {
  it('utilise l’API moderne quand elle réussit, sans toucher au fallback', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const legacyCopy = vi.fn().mockReturnValue(true);
    expect(await copyText('salut', { writeText, legacyCopy })).toBe(true);
    expect(writeText).toHaveBeenCalledWith('salut');
    expect(legacyCopy).not.toHaveBeenCalled();
  });

  it('retombe sur le fallback quand l’API moderne rejette', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
    const legacyCopy = vi.fn().mockReturnValue(true);
    expect(await copyText('salut', { writeText, legacyCopy })).toBe(true);
    expect(legacyCopy).toHaveBeenCalledWith('salut');
  });

  it('retombe sur le fallback quand l’API moderne est absente', async () => {
    const legacyCopy = vi.fn().mockReturnValue(true);
    expect(await copyText('salut', { legacyCopy })).toBe(true);
    expect(legacyCopy).toHaveBeenCalledWith('salut');
  });

  it('renvoie false quand les deux chemins échouent', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('nope'));
    const legacyCopy = vi.fn().mockReturnValue(false);
    expect(await copyText('salut', { writeText, legacyCopy })).toBe(false);
  });

  it('renvoie false quand le fallback lève', async () => {
    const legacyCopy = vi.fn().mockImplementation(() => {
      throw new Error('execCommand indisponible');
    });
    expect(await copyText('salut', { legacyCopy })).toBe(false);
  });
});
```

Créer `src/lib/promptView.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { shouldRenderPromptBlock } from './promptView';

describe('shouldRenderPromptBlock', () => {
  it('rend le bloc pour une fiche qui a un prompt', () => {
    expect(shouldRenderPromptBlock('fiche', 'Tu es un assistant.')).toBe(true);
  });

  it('ne rend pas de bloc vide pour une fiche sans prompt', () => {
    expect(shouldRenderPromptBlock('fiche', undefined)).toBe(false);
    expect(shouldRenderPromptBlock('fiche', '   ')).toBe(false);
  });

  it('ne rend pas de bloc pour un guide, même s’il porte un prompt', () => {
    expect(shouldRenderPromptBlock('guide', 'Tu es un assistant.')).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npm test`
Expected: **FAIL** — modules `./clipboard` et `./promptView` introuvables.

- [ ] **Step 3: Écrire `src/lib/clipboard.ts`**

```ts
/**
 * Copie presse-papier avec fallback — spec P4 §6.1 (« fallback + feedback
 * visuel »). Le bouton du Plan 1 appelait `navigator.clipboard.writeText`
 * sans garde : en contexte non sécurisé ou permission refusée, la promesse
 * rejetait et le libellé du bouton ne changeait JAMAIS — l'utilisateur ne
 * savait pas que la copie avait échoué.
 *
 * Les dépendances sont injectables pour être testables sans DOM : ce repo
 * n'a pas jsdom et n'a pas le droit d'en ajouter (contrainte globale).
 * `defaultDeps()` lit `navigator`/`document` À L'APPEL, jamais à l'import,
 * pour que le module reste importable en environnement Node.
 */

export interface ClipboardDeps {
  writeText?: (text: string) => Promise<void>;
  legacyCopy?: (text: string) => boolean;
}

/** Fallback historique : `<textarea>` hors écran + `document.execCommand('copy')`. */
function legacyCopyViaTextarea(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-1000px';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand('copy');
  } finally {
    textarea.remove();
  }
}

function defaultDeps(): ClipboardDeps {
  return {
    writeText: navigator?.clipboard?.writeText
      ? (text) => navigator.clipboard.writeText(text)
      : undefined,
    legacyCopy: legacyCopyViaTextarea,
  };
}

/**
 * Tente l'API moderne, puis le fallback. Renvoie `true` seulement si le texte
 * est effectivement au presse-papier — l'appelant s'en sert pour choisir le
 * feedback visuel.
 */
export async function copyText(text: string, deps: ClipboardDeps = defaultDeps()): Promise<boolean> {
  if (deps.writeText) {
    try {
      await deps.writeText(text);
      return true;
    } catch {
      // Contexte non sécurisé, permission refusée, document non focalisé…
      // On ne renonce pas : le fallback ci-dessous a de bonnes chances.
    }
  }

  try {
    return deps.legacyCopy?.(text) ?? false;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Écrire `src/lib/promptView.ts`**

```ts
import type { PROMPT_FORMATS } from '../content.config';

export type PromptFormat = (typeof PROMPT_FORMATS)[number];

/**
 * Règle fiche vs guide (spec R4).
 *
 * - `fiche` : le champ `prompt` EST la valeur de la page → bloc copiable, le
 *   corps servant de notes d'usage.
 * - `guide` : le corps EST la valeur → pas de bloc, même si l'entrée porte un
 *   `prompt` (le schéma §3.3 le laisse optionnel sur les deux formats).
 *
 * Une fiche sans `prompt` (ou avec un prompt vide) ne rend PAS un bloc de
 * code vide : le schéma de la spec de design n'impose pas le champ, le rendu
 * doit donc rester correct sans lui.
 */
export function shouldRenderPromptBlock(format: PromptFormat, prompt?: string): boolean {
  return format === 'fiche' && (prompt ?? '').trim().length > 0;
}
```

- [ ] **Step 5: Brancher le fallback dans `src/scripts/copy-code.ts`**

Remplacer **uniquement** le gestionnaire de clic (le reste du fichier, commentaires compris, ne bouge pas) :

```ts
  btn.addEventListener('click', async () => {
    // Plan 4 : la copie peut échouer (contexte non sécurisé, permission
    // refusée). Avant, l'échec était SILENCIEUX — la promesse rejetait et le
    // libellé ne changeait jamais. Le chemin nominal est inchangé.
    const ok = await copyText(codeText);
    btn.textContent = ok ? 'Copié !' : 'Échec — copie manuelle';
    setTimeout(() => {
      btn.textContent = 'Copier';
    }, 1500);
  });
```

et ajouter en tête du fichier :

```ts
import { copyText } from '../lib/clipboard';
```

- [ ] **Step 6: Écrire `src/pages/prompts/[...slug].astro`**

```astro
---
import { getEntries, render } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getSortedPrompts } from '../../lib/prompts';
import { assertEntriesResolved } from '../../lib/references';
import { shouldRenderPromptBlock } from '../../lib/promptView';

export async function getStaticPaths() {
  const prompts = await getSortedPrompts();
  return prompts.map((prompt) => ({ params: { slug: prompt.id }, props: { prompt } }));
}

const { prompt } = Astro.props;
const { Content } = await render(prompt);
const { title, description, format, tool, model, tags } = prompt.data;

const showPromptBlock = shouldRenderPromptBlock(format, prompt.data.prompt);

// ADDITION n°2 (ratifiée au gate) : sens prompt → skills. R6/R7 n'exigent que
// le sens skill → prompts ; sans ceci, `relatedSkills` serait un champ de
// données jamais affiché. `assertEntriesResolved` fait échouer le build avec
// un message nommant l'entrée et l'id manquant plutôt que de laisser passer
// un `undefined` (D06, Plan 3).
const relatedSkills = prompt.data.relatedSkills?.length
  ? assertEntriesResolved(
      prompt.id,
      prompt.data.relatedSkills,
      await getEntries(prompt.data.relatedSkills),
    ).filter((skill) => !skill.data.draft)
  : [];
---

<BaseLayout title={`${title} — bencat_`} description={description}>
  <article class="mx-auto max-w-3xl px-4 py-10">
    <p class="font-mono text-sm text-acc">~/ prompts</p>

    <h1 class="mt-4 font-display text-4xl font-bold text-text">{title}</h1>

    <div class="mt-4 flex flex-wrap items-center gap-3 font-mono text-xs text-muted">
      <span class="rounded-full border border-line px-2 py-0.5">{format}</span>
      <span class="rounded-full border border-line px-2 py-0.5">{tool}</span>
      {model && <span class="rounded-full border border-line px-2 py-0.5">{model}</span>}
    </div>

    <p class="mt-4 text-muted">{description}</p>

    {
      tags.length > 0 && (
        <ul class="mt-6 flex flex-wrap gap-2" aria-label="Tags">
          {tags.map((tag) => (
            <li class="rounded border border-line px-2 py-0.5 font-mono text-xs text-muted">
              {tag}
            </li>
          ))}
        </ul>
      )
    }

    {
      showPromptBlock && (
        <section class="mt-10">
          <h2 class="font-mono text-sm text-muted">// le prompt</h2>
          {/*
            R3 : ce <pre> est DANS <article>, donc src/scripts/copy-code.ts
            (importé plus bas) lui accroche son bouton « Copier »/« Copié ! ».
            Aucun second mécanisme de copie — spec §6.2.
          */}
          <pre class="mt-4"><code>{prompt.data.prompt}</code></pre>
        </section>
      )
    }

    <div class="prose mt-10">
      <Content />
    </div>

    {
      relatedSkills.length > 0 && (
        <section class="mt-12 border-t border-line pt-8">
          <h2 class="font-mono text-sm text-muted">// skills liés</h2>
          <ul class="mt-4 flex flex-col gap-2">
            {relatedSkills.map((skill) => (
              <li>
                <a
                  href={`/skills/${skill.id}/`}
                  class="text-text underline decoration-line underline-offset-4 transition-colors hover:text-acc hover:decoration-acc"
                >
                  {skill.data.title}
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

- [ ] **Step 7: Tests, build, typecheck**

Run: `npm test`
Expected: **PASS**, **68 tests** (60 + 5 clipboard + 3 promptView).

Run: `npx astro build`
Expected: **10 + N pages** (N = nombre de prompts publiés, ≥ 2). Reporter le chiffre exact.

Run: `npx astro check`
Expected: **0 error, 0 warning**.

- [ ] **Step 8: Smoke navigateur — R3, R4, R9, et non-régression du blog**

Sur une **fiche** (`format: fiche`) :
1. Le bloc `<pre>` du prompt est rendu et porte un bouton « Copier ».
2. Cliquer → le libellé passe à « Copié ! » (**feedback visuel de R3**), puis revient à « Copier ».
3. **Vérifier le contenu du presse-papier**, pas seulement le libellé :
```js
await navigator.clipboard.readText()
```
Il doit être **égal au champ `prompt`** de l'entrée — et **ne pas contenir** le mot « Copier ». (Le navigateur peut demander la permission de lecture ; si elle est refusée, coller dans un `<textarea>` de la page et comparer.)
4. Les notes d'usage (corps) sont rendues **sous** le bloc.

Sur un **guide** (`format: guide`) :
5. **Aucun** bloc de prompt n'est rendu ; le write-up est rendu en entier, titres compris. **C'est la clause binaire de R4.**

Non-régression Plan 1 :
6. Ouvrir un article de blog contenant un bloc de code → le bouton « Copier » fonctionne **exactement comme avant** (le chemin nominal n'a pas changé).

R9 :
7. **375px, dark ET light** : non-débordement. **Attention au bloc de prompt** — c'est le contenu le plus large de la page ; il doit défiler **à l'intérieur** de son `<pre>` (`overflow-x: auto`, déjà en place au Plan 1) sans élargir la page. Vérifier aussi que le bouton reste cliquable après un scroll horizontal complet du bloc (gotcha `.code-block-wrapper`, Plan 1).

- [ ] **Step 9: Commit**

```bash
git add src/lib/clipboard.ts src/lib/clipboard.test.ts src/lib/promptView.ts src/lib/promptView.test.ts src/scripts/copy-code.ts "src/pages/prompts/[...slug].astro"
git commit -m "feat(p4): page prompt fiche/guide, copie 1 clic avec fallback"
```

---

## Phase C — Pages skills (R5, R6, R7, R9)

### Task C1: Carte skill + grille `/skills` filtrable

**Files:**
- Create: `src/components/SkillCard.astro`
- Create: `src/pages/skills/index.astro`

**Interfaces:**
- Consumes: `getSortedSkills`, `collectTypes`, `collectSkillTags` (T-A1) ; `ALL` et le script `facet-filters.ts` (T-B2) ; le contrat DOM de T-B1.
- Produces: la route `/skills`, cible des liens `relatedPrompts` rendus en T-B3.

**Contexte pour l'implémenteur :** cette tâche est le **jumeau** de T-B1 + T-B2 côté skills, avec deux facettes au lieu de trois (`type`, `tag`). Tout le moteur existe déjà : **aucun nouveau JS, aucun nouveau module de filtrage**. Si vous vous surprenez à écrire un second script de filtre, c'est une déviation — arrêtez et loggez. Différence avec `/prompts` : `type` a une cardinalité ouverte (`z.string()` libre) mais reste `claude-code` au v1 ; il est donc rendu **en boutons** à partir des valeurs réellement présentes (`collectTypes`), pas d'une constante.

- [ ] **Step 1: Écrire `src/components/SkillCard.astro`**

```astro
---
import type { CollectionEntry } from 'astro:content';

interface Props {
  skill: CollectionEntry<'skills'>;
}

const { skill } = Astro.props;
const { title, description, type, version, tags } = skill.data;

// Même contrat que PromptCard (T-B1), lu par src/scripts/facet-filters.ts.
const facets = JSON.stringify({ type: [type], tag: tags });
---

<a
  href={`/skills/${skill.id}/`}
  class="group flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-acc/50"
  data-facet-card
  data-facet={facets}
>
  <div class="flex flex-wrap items-center gap-2">
    <span class="w-fit rounded-full border border-line px-2 py-0.5 font-mono text-xs text-muted">
      {type}
    </span>
    {version && <span class="font-mono text-xs text-muted">v{version}</span>}
  </div>

  <h3 class="font-display text-lg font-semibold text-text group-hover:text-acc">
    {title}
  </h3>

  <p class="text-sm text-muted">{description}</p>

  {
    tags.length > 0 && (
      <ul class="mt-auto flex flex-wrap gap-2 pt-2" aria-label="Tags">
        {tags.map((tag) => (
          <li class="rounded border border-line px-2 py-0.5 font-mono text-xs text-muted">
            {tag}
          </li>
        ))}
      </ul>
    )
  }
</a>
```

- [ ] **Step 2: Écrire `src/pages/skills/index.astro`**

Reprendre **exactement** la structure de `src/pages/prompts/index.astro` (T-B2 Step 7), avec :
- `import { getSortedSkills, collectTypes, collectSkillTags } from '../../lib/skills';`
- `const skills = await getSortedSkills(); const types = collectTypes(skills); const tags = collectSkillTags(skills);`
- kicker `~/ skills`, titre `Skills`, `title="Skills — bencat_"`, `description="Les skills Claude Code de bencat_ : instructions, installation et prompts liés."`
- boutons de facette `type` : un bouton `tous` (`data-facet-key="type" data-facet-value={ALL}`) puis un bouton par valeur de `types` (`data-facet-key="type" data-facet-value={type}`), mêmes classes qu'en T-B2
- un seul `<select data-facet-key="tag">` (libellé `tag`), rendu si `tags.length > 0`
- état vide : `<p ... data-facet-empty hidden>Aucun skill ne correspond à ce filtre.</p>`
- `<script>import '../../scripts/facet-filters.ts';</script>`

- [ ] **Step 3: Build, typecheck, tests**

Run: `npx astro build` → **+1 page** (`/skills`). Reporter le total.
Run: `npx astro check` → **0 error, 0 warning**.
Run: `npm test` → **68 tests**, inchangés (aucun module logique nouveau).

- [ ] **Step 4: Smoke navigateur — R5 par COMPTAGE, et R9**

Sur `/skills` :
1. `document.querySelectorAll('[data-facet-card]').length` → **≥ 2**.
2. Choisir un **tag** → `visible()` égale le nombre réel de skills portant ce tag, et **chaque** carte encore visible contient ce tag dans son `data-facet`. **C'est la clause binaire de R5** (« filtrer par tag → sous-ensemble correct »).
3. Filtrer par `type` → idem.
4. Combinaison sans résultat → `[data-facet-empty]` visible.
5. **Sans JS** : barre invisible, toutes les cartes visibles.
6. **375px, dark ET light** : non-débordement.
7. Vérifier que `/prompts` **fonctionne toujours** (le script est partagé — une régression y serait invisible depuis `/skills`).

- [ ] **Step 5: Commit**

```bash
git add src/components/SkillCard.astro src/pages/skills/index.astro
git commit -m "feat(p4): carte skill et grille /skills filtrable"
```

---

### Task C2: `/skills/<slug>` — instructions, `installCmd` copiable, repo, prompts liés + nav

**Files:**
- Create: `src/pages/skills/[...slug].astro`
- Modify: `src/components/Header.astro` (**addition n°1**, ratifiée au gate)

**Interfaces:**
- Consumes: `getSortedSkills` (T-A1), `assertEntriesResolved` (T-A1), le pattern de bloc copiable de T-B3.
- Produces: la route `/skills/<slug>`, cible des liens `relatedSkills` rendus en T-B3 — **c'est cette tâche qui referme la navigation croisée de R7**.

**Contexte pour l'implémenteur :** `src/pages/projets/[...slug].astro` est le modèle direct (corps + liens externes + entrées liées résolues) — le lire. L'`installCmd` est rendu dans un `<pre><code>` **sous `<article>`**, donc `copy-code.ts` lui accroche son bouton : **c'est ainsi que « `installCmd` affiché et copiable » de R6 est satisfait**, sans second mécanisme. Le filtrage des `draft` sur les prompts liés n'est pas cosmétique : un prompt `draft` n'a **pas de route publique** (`getSortedPrompts` l'écarte), le lier produirait un **404**.

- [ ] **Step 1: Écrire `src/pages/skills/[...slug].astro`**

```astro
---
import { getEntries, render } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getSortedSkills } from '../../lib/skills';
import { assertEntriesResolved } from '../../lib/references';

export async function getStaticPaths() {
  const skills = await getSortedSkills();
  return skills.map((skill) => ({ params: { slug: skill.id }, props: { skill } }));
}

const { skill } = Astro.props;
const { Content } = await render(skill);
const { title, name, description, type, version, repoUrl, installCmd, tags } = skill.data;

// R7 : les références sont résolues en entrées réelles — on affiche un titre,
// jamais un id ni `undefined`. `assertEntriesResolved` (D06, Plan 3) fait
// échouer le build avec un message nommant le skill, la collection visée et
// l'id manquant, au lieu d'un TypeError anonyme.
// Les prompts `draft` sont écartés APRÈS résolution : ils existent bien (la
// référence n'est pas cassée) mais n'ont pas de route publique — les lier
// produirait un 404.
const relatedPrompts = skill.data.relatedPrompts?.length
  ? assertEntriesResolved(
      skill.id,
      skill.data.relatedPrompts,
      await getEntries(skill.data.relatedPrompts),
    ).filter((prompt) => !prompt.data.draft)
  : [];
---

<BaseLayout title={`${title} — bencat_`} description={description}>
  <article class="mx-auto max-w-3xl px-4 py-10">
    <p class="font-mono text-sm text-acc">~/ skills</p>

    <h1 class="mt-4 font-display text-4xl font-bold text-text">{title}</h1>

    <div class="mt-4 flex flex-wrap items-center gap-3 font-mono text-xs text-muted">
      <span class="rounded-full border border-line px-2 py-0.5">{type}</span>
      {version && <span class="rounded-full border border-line px-2 py-0.5">v{version}</span>}
      {name && <span>{name}</span>}
    </div>

    <p class="mt-4 text-muted">{description}</p>

    {
      repoUrl && (
        <div class="mt-8 flex flex-wrap gap-3">
          <a
            href={repoUrl}
            rel="noopener noreferrer"
            target="_blank"
            class="rounded-lg border border-line px-3 py-1.5 font-mono text-xs text-text transition-colors hover:border-acc hover:text-acc"
          >
            code source ↗
          </a>
        </div>
      )
    }

    {
      tags.length > 0 && (
        <ul class="mt-6 flex flex-wrap gap-2" aria-label="Tags">
          {tags.map((tag) => (
            <li class="rounded border border-line px-2 py-0.5 font-mono text-xs text-muted">
              {tag}
            </li>
          ))}
        </ul>
      )
    }

    {
      installCmd && (
        <section class="mt-10">
          <h2 class="font-mono text-sm text-muted">// installation</h2>
          {/*
            R6 : ce <pre> est DANS <article>, donc src/scripts/copy-code.ts
            (importé plus bas) lui accroche son bouton « Copier »/« Copié ! ».
          */}
          <pre class="mt-4"><code>{installCmd}</code></pre>
        </section>
      )
    }

    <div class="prose mt-10">
      <Content />
    </div>

    {
      relatedPrompts.length > 0 && (
        <section class="mt-12 border-t border-line pt-8">
          <h2 class="font-mono text-sm text-muted">// prompts liés</h2>
          <ul class="mt-4 flex flex-col gap-2">
            {relatedPrompts.map((prompt) => (
              <li>
                <a
                  href={`/prompts/${prompt.id}/`}
                  class="text-text underline decoration-line underline-offset-4 transition-colors hover:text-acc hover:decoration-acc"
                >
                  {prompt.data.title}
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

- [ ] **Step 2: Activer les liens de nav (addition n°1)**

Dans `src/components/Header.astro`, remplacer les deux entrées sans `href` et **mettre le commentaire à jour** (un commentaire faux est un piège — leçon D07) :

```ts
// Nav complète du site (spec design §4). Blog (Plan 1), Projets (Plan 3),
// Prompts et Skills (Plan 4) ont une page ; « À propos » arrive au Plan 5 —
// rendu non cliquable pour éviter tout lien mort (cf. spec Plan 1 §5).
const navLinks: NavLink[] = [
  { label: 'Blog', href: '/blog' },
  { label: 'Projets', href: '/projets' },
  { label: 'Prompts', href: '/prompts' },
  { label: 'Skills', href: '/skills' },
  { label: 'À propos' },
];
```

- [ ] **Step 3: Build, typecheck, tests**

Run: `npx astro build` → **+M pages** (M = nombre de skills publiés, ≥ 2). Reporter le total.
Run: `npx astro check` → **0 error, 0 warning**.
Run: `npm test` → **68 tests**.

- [ ] **Step 4: Prouver R7 — dans les deux sens, et prouver l'échec**

Maintenant que les deux routes existent, la sonde de T-A2 n'est plus nécessaire : **les pages elles-mêmes résolvent les références**.

1. Sur `/skills/<slug>` : la section « prompts liés » affiche les **titres** des prompts, **aucun `undefined`**. Cliquer chaque lien → la page prompt **répond** (pas de 404).
2. Sur `/prompts/<slug>` : la section « skills liés » affiche les **titres** des skills. Cliquer → la page skill répond. **La navigation croisée est bouclée.**
3. **Prouver l'échec** : casser volontairement un id de `relatedPrompts` en `nexiste-pas`, lancer `npx astro build`.
   Expected: **sortie ≠ 0**, message du garde-fou nommant le skill, la collection `prompts` et l'id manquant. Restaurer, rebuilder, vérifier `git status --porcelain` **vide**.
   *(Fait établi au Plan 3 : sans page qui résout la référence, le build reste VERT. C'est cette tâche qui rend la protection réelle.)*

- [ ] **Step 5: Smoke navigateur — R6, R9, nav**

1. Le corps du skill (instructions) est rendu.
2. L'`installCmd` est affiché dans un bloc, avec bouton « Copier » → cliquer, vérifier `await navigator.clipboard.readText()` **égal à `installCmd`** et sans le mot « Copier ». **Clause binaire de R6.**
3. Le lien « code source » ouvre `repoUrl` (s'il existe) — vérifier qu'il **répond 200**, pas seulement qu'il est présent.
4. Nav : « Prompts » et « Skills » sont cliquables et mènent aux bonnes pages ; « À propos » reste grisé. Contrôler sur **desktop et à 375px** (le Header passe en 2 lignes sous ~480px — vérifier que 4 liens actifs ne débordent pas).
5. **375px, dark ET light** : non-débordement sur `/skills/<slug>`, bloc `installCmd` compris.

- [ ] **Step 6: Commit**

```bash
git add "src/pages/skills/[...slug].astro" src/components/Header.astro
git commit -m "feat(p4): page skill avec installCmd copiable et prompts lies, nav activee"
```

---

## Phase D — CMS (R8)

### Task D1: Collections `prompts` + `skills` dans le `config.yml` Sveltia + garde-fou de test

**Files:**
- Modify: `public/admin/config.yml`
- Modify: `src/lib/cms-config.test.ts`
- Modify: `README.md` (section « suppression propre » : 2 collections → 4)

**Interfaces:**
- Consumes: les schémas de T-A1 (source de vérité), les ids créés en T-A2.
- Produces: la config que T-D2 utilisera **réellement** dans `/admin`.

**Contexte pour l'implémenteur — trois faits établis au Plan 2/3, à ne pas re-supposer :**
1. `output.omit_empty_optional_fields: true` est **déjà** posé globalement — ne pas le redéclarer.
2. Le validateur de `pattern` de Sveltia 0.175.1 utilise `RegExp.test`, **non ancré à droite** : `'^https?://'` laisse passer `https://` et `http://exa mple.com`, que `z.string().url()` rejette → le CMS commite, puis `astro build` casse **après coup** (déviation D03). Le motif à utiliser pour `repoUrl` est **exactement** celui déjà en place sur `projects` : `^https?://[^\s/]+(/[^\s]*)?$`.
3. `delete: false` (addition n°3, ratifiée au gate) : le CMS ne nettoie **jamais** les rétro-références ; supprimer une entrée depuis `/admin` laisse une référence morte, le commit déclenche le déploiement et `astro build` produit **0 page** (déviation D08).

- [ ] **Step 1: Ajouter les deux collections à `public/admin/config.yml`**

À la suite de la collection `projects` :

```yaml
  - name: prompts
    label: Prompts
    label_singular: Prompt
    description: Bibliothèque de prompts — src/content/prompts/{slug}/index.md
    folder: src/content/prompts
    path: '{{slug}}/index'
    extension: md
    format: yaml-frontmatter
    create: true
    # Voir D08 (Plan 3) : le CMS ne nettoie pas les rétro-références. Supprimer
    # un prompt laisserait un `relatedPrompts` mort sur un skill ; le commit
    # suivant casse `assertEntriesResolved` et le build ne produit plus aucune
    # page. Suppression propre : voir la section dédiée du README.
    delete: false
    slug: '{{slug}}'
    identifier_field: title
    sortable_fields: [title]
    media_folder: ''
    public_folder: ''
    fields:
      - { name: title, label: Titre, widget: string }
      - { name: description, label: Description, widget: text, hint: Résumé affiché sur les cartes }
      - name: format
        label: Format
        widget: select
        default: fiche
        options:
          - { label: 'Fiche — prompt copiable + notes', value: fiche }
          - { label: 'Guide — write-up long', value: guide }
      - { name: prompt, label: Texte du prompt, widget: text, required: false, hint: 'Le texte copiable en 1 clic. Requis en pratique pour une fiche ; inutile pour un guide.' }
      - { name: tool, label: Outil, widget: string, default: Claude }
      - { name: model, label: Modèle, widget: string, required: false }
      - { name: tags, label: Tags, widget: list, required: false, default: [] }
      - { name: draft, label: Brouillon, widget: boolean, required: false, default: false }
      - name: relatedSkills
        label: Skills liés
        widget: relation
        required: false
        multiple: true
        collection: skills
        value_field: '{{slug}}'
        search_fields: [title]
        display_fields: [title]
      - { name: body, label: Contenu, widget: markdown }

  - name: skills
    label: Skills
    label_singular: Skill
    description: Bibliothèque de skills Claude Code — src/content/skills/{slug}/index.md
    folder: src/content/skills
    path: '{{slug}}/index'
    extension: md
    format: yaml-frontmatter
    create: true
    # Voir D08 (Plan 3) — même raison que pour `prompts`, la relation est
    # symétrique.
    delete: false
    slug: '{{slug}}'
    identifier_field: title
    sortable_fields: [title]
    media_folder: ''
    public_folder: ''
    fields:
      - { name: title, label: Titre, widget: string }
      - { name: name, label: Nom technique, widget: string, required: false, hint: 'Slug type SKILL.md (ex. anti-drift-planning)' }
      - { name: description, label: Description, widget: text, hint: 'Le « when to use » — affiché sur les cartes' }
      - { name: type, label: Type, widget: string, default: claude-code }
      - { name: version, label: Version, widget: string, required: false }
      # Motif ancré des deux côtés (D03, Plan 3) : `^https?://` seul n'est pas
      # ancré à droite dans le validateur Sveltia 0.175.1.
      - { name: repoUrl, label: URL du dépôt, widget: string, required: false, pattern: ['^https?://[^\s/]+(/[^\s]*)?$', 'Doit être une URL complète et valide, commençant par http:// ou https:// (ex. https://github.com/mon-skill)'] }
      - { name: installCmd, label: Commande d’installation, widget: string, required: false, hint: 'Affichée dans un bloc copiable sur la page du skill' }
      - { name: tags, label: Tags, widget: list, required: false, default: [] }
      - { name: draft, label: Brouillon, widget: boolean, required: false, default: false }
      - name: relatedPrompts
        label: Prompts liés
        widget: relation
        required: false
        multiple: true
        collection: prompts
        value_field: '{{slug}}'
        search_fields: [title]
        display_fields: [title]
      - { name: body, label: Contenu, widget: markdown }
```

- [ ] **Step 2: Étendre le garde-fou `src/lib/cms-config.test.ts`**

Le test existant affirme « exactement deux collections » — **il va échouer**, c'est voulu : c'est le garde-fou anti-drift qui fait son travail. Le mettre à jour et ajouter les assertions des nouvelles collections :

```ts
// Remplacer l'assertion existante :
it('déclare exactement quatre collections : blog, projects, prompts, skills', () => {
  const cfg = loadCmsConfig();
  expect(cfg.collections).toHaveLength(4);
  expect(cfg.collections.map((c: any) => c.name)).toEqual(['blog', 'projects', 'prompts', 'skills']);
});
```

Puis ajouter :

```ts
/** Petit helper local : retrouve un champ par son nom dans une collection. */
function field(cfg: any, collection: string, name: string): any {
  const coll = cfg.collections.find((c: any) => c.name === collection);
  return coll.fields.find((f: any) => f.name === name);
}

describe('config CMS — collection prompts', () => {
  it('pointe le bon dossier, en page bundle, sans suppression', () => {
    const cfg = loadCmsConfig();
    const coll = cfg.collections.find((c: any) => c.name === 'prompts');
    expect(coll.folder).toBe('src/content/prompts');
    expect(coll.path).toBe('{{slug}}/index');
    expect(coll.extension).toBe('md');
    expect(coll.format).toBe('yaml-frontmatter');
    expect(coll.delete).toBe(false);
    expect(coll.media_folder).toBe('');
    expect(coll.public_folder).toBe('');
  });

  it('mappe TOUS les champs du schéma Zod, et rien de plus', () => {
    const cfg = loadCmsConfig();
    const coll = cfg.collections.find((c: any) => c.name === 'prompts');
    expect(coll.fields.map((f: any) => f.name)).toEqual([
      'title',
      'description',
      'format',
      'prompt',
      'tool',
      'model',
      'tags',
      'draft',
      'relatedSkills',
      'body',
    ]);
  });

  it('offre exactement les formats de PROMPT_FORMATS, avec le même défaut que Zod', () => {
    const cfg = loadCmsConfig();
    const f = field(cfg, 'prompts', 'format');
    expect(f.options.map((o: any) => o.value)).toEqual([...PROMPT_FORMATS]);
    expect(f.default).toBe('fiche');
  });

  it('garde le défaut `Claude` sur `tool`, comme le schéma Zod', () => {
    expect(field(loadCmsConfig(), 'prompts', 'tool').default).toBe('Claude');
  });

  it('lie relatedSkills à la collection skills par slug', () => {
    const f = field(loadCmsConfig(), 'prompts', 'relatedSkills');
    expect(f.widget).toBe('relation');
    expect(f.collection).toBe('skills');
    expect(f.multiple).toBe(true);
    expect(f.value_field).toBe('{{slug}}');
  });
});

describe('config CMS — collection skills', () => {
  it('pointe le bon dossier, en page bundle, sans suppression', () => {
    const cfg = loadCmsConfig();
    const coll = cfg.collections.find((c: any) => c.name === 'skills');
    expect(coll.folder).toBe('src/content/skills');
    expect(coll.path).toBe('{{slug}}/index');
    expect(coll.delete).toBe(false);
  });

  it('mappe TOUS les champs du schéma Zod, et rien de plus', () => {
    const cfg = loadCmsConfig();
    const coll = cfg.collections.find((c: any) => c.name === 'skills');
    expect(coll.fields.map((f: any) => f.name)).toEqual([
      'title',
      'name',
      'description',
      'type',
      'version',
      'repoUrl',
      'installCmd',
      'tags',
      'draft',
      'relatedPrompts',
      'body',
    ]);
  });

  it('garde le défaut `claude-code` sur `type`, comme le schéma Zod', () => {
    expect(field(loadCmsConfig(), 'skills', 'type').default).toBe('claude-code');
  });

  it('lie relatedPrompts à la collection prompts par slug', () => {
    const f = field(loadCmsConfig(), 'skills', 'relatedPrompts');
    expect(f.widget).toBe('relation');
    expect(f.collection).toBe('prompts');
    expect(f.multiple).toBe(true);
    expect(f.value_field).toBe('{{slug}}');
  });
});

describe('config CMS — motif repoUrl du skill vs Zod (D03)', () => {
  const pattern = new RegExp(field(loadCmsConfig(), 'skills', 'repoUrl').pattern[0]);
  const zodUrl = z.string().url();

  // Le motif est lu DEPUIS le YAML et confronté au vrai validateur Zod, au
  // lieu d'être comparé à des exemples choisis (méthode établie en D03).
  const cases = [
    'https://github.com/bendevcat/anti-drift-planning',
    'http://exemple.fr',
    'https://exemple.fr/a/b?c=d',
    'https://',
    'http://',
    'https:///',
    'http://exa mple.com',
    'pas-une-url',
    'javascript:alert(1)',
    'ftp://exemple.fr',
  ];

  it('n’est JAMAIS plus laxiste que Zod (une URL acceptée par le CMS ne casse pas le build)', () => {
    for (const value of cases) {
      if (pattern.test(value)) {
        expect(zodUrl.safeParse(value).success, `${value} passe le CMS mais pas Zod`).toBe(true);
      }
    }
  });

  it('est délibérément plus strict que Zod sur le schéma d’URL (ftp:// refusé)', () => {
    expect(pattern.test('ftp://exemple.fr')).toBe(false);
    expect(zodUrl.safeParse('ftp://exemple.fr').success).toBe(true);
  });
});
```

Ajouter `PROMPT_FORMATS` à l'import existant depuis `../content.config`.

- [ ] **Step 3: Mettre le README à jour**

Ouvrir la section « suppression propre » ajoutée au Plan 3 (D08) : elle décrit la procédure pour `blog` et `projects`. L'étendre aux 4 collections en nommant les **rétro-références réelles** à nettoyer : `relatedProjects` (blog), `relatedPosts` (projects), `relatedSkills` (prompts), `relatedPrompts` (skills).

- [ ] **Step 4: Tests, typecheck, build**

Run: `npm test`
Expected: **PASS**. Reporter le total exact (68 + les nouveaux tests CMS).

Run: `npx astro check` → **0 error, 0 warning**.
Run: `npx astro build` → total inchangé par rapport à T-C2 (la config CMS ne produit pas de page).

- [ ] **Step 5: Prouver que le garde-fou mord**

Un test qui ne peut pas échouer ne protège de rien. Le vérifier **par mutation, en mémoire** :

```bash
# 1. Renommer un champ dans le YAML (ex. `installCmd` -> `installCommand`)
# 2. npm test  -> DOIT échouer sur l'assertion « mappe TOUS les champs »
# 3. Restaurer, npm test -> vert
```
Faire la même chose sur `value_field: '{{slug}}'` → `'{{title}}'` (scénario D07 : le CMS écrirait alors un titre là où Astro attend un id, et le build casserait **après** le commit).

- [ ] **Step 6: Smoke `/admin` dans un navigateur Chromium**

Une config invalide affiche un **écran d'erreur** à la place de l'écran de connexion — c'est le contrôle.

```bash
astro dev --background
```
Ouvrir `http://localhost:4321/admin/index.html` et relever :
1. L'écran de **connexion normal** s'affiche (pas d'écran d'erreur).
2. **0 erreur console.** (Attendu au Plan 3 : 2 `info` de schéma JSON + 2 `warn` « version 0.176.0 disponible » — l'épinglage à 0.175.1 est délibéré.)

- [ ] **Step 7: Commit**

```bash
git add public/admin/config.yml src/lib/cms-config.test.ts README.md
git commit -m "feat(p4): collections prompts et skills dans le CMS + garde-fou de test"
```

---

### Task D2: Création réelle d'un prompt et d'un skill via `/admin` — **geste utilisateur**

**Files:** aucun fichier écrit par un agent. Les fichiers produits le sont **par le CMS**, via GitHub.

**Interfaces:**
- Consumes: la config de T-D1, déployée sur `main`.
- Produces: la preuve exigée par la seconde moitié de R8 (« créer via `/admin` produit des fichiers conformes »).

**Pourquoi c'est un geste utilisateur, et pas un manque de zèle :** établi au Plan 2, reconfirmé au Plan 3 (T-C2). Un agent ne peut **ni** fournir le PAT GitHub (secret personnel — hors de question de le lui transmettre), **ni** actionner le sélecteur de dossier natif de la File System Access API. La création réelle passe donc par Benoît. Cette tâche est **listée, pas contournée** : R8 reste `In progress` tant qu'elle n'est pas faite.

- [ ] **Step 1: Préparer les instructions exactes pour l'utilisateur**

L'agent rédige la marche à suivre (URL, collection, champs à remplir, ce qu'il faut observer) et la remet à l'utilisateur — il n'invente aucun résultat.

- [ ] **Step 2 (utilisateur): créer un prompt et un skill depuis `/admin`**

Pour chacun : remplir les champs, dont **un `relatedSkills` / `relatedPrompts`** (c'est le widget `relation` qu'on veut voir écrire un **id**, pas un titre — scénario D07), puis publier.

- [ ] **Step 3: Vérifier les fichiers produits, sur le dépôt**

```bash
git fetch origin && git log origin/main --oneline -3
git show origin/main --stat
```
Contrôles :
1. Le chemin est bien `src/content/<coll>/<slug>/index.md`.
2. Le frontmatter **valide le schéma Zod** : `npx astro build` sur le contenu récupéré.
3. Le champ de relation contient un **id de dossier**, pas un titre.
4. Les champs optionnels laissés vides sont **absents** du frontmatter (effet de `omit_empty_optional_fields`), pas présents à vide.

- [ ] **Step 4: Ledger**

R8 → `Done` seulement après les contrôles ci-dessus. Si l'utilisateur est indisponible, R8 reste `In progress` et la Phase Z le constatera — **on ne marque pas Done ce qu'on n'a pas vu**.

---

## Phase Z — Verification

### Task Z1: `/anti-drift-planning:verify 4`

**Non contournable. Seul chemin vers le script de release et le tag `milestone-plan-4`.**

- [ ] **Step 1: État de la branche AVANT toute demande de push**

```bash
git status -sb   # lire ahead/behind — leçon Plan 2 : un fetch seul ne met pas la branche à jour
git log --oneline main..HEAD
```

- [ ] **Step 2: Lancer l'audit**

Run: `/anti-drift-planning:verify 4`

Il enchaîne : lint mécanique, relecture de la spec, statut Done/Deferred/Cut par critère, **zéro `pending-user` dans le log de déviations**, suite de tests, walkthrough utilisateur.

- [ ] **Step 3: Sur PASS uniquement**

Script de release + tag `milestone-plan-4` + `v0.4.0`. La commande émet ensuite l'étape suivante (bootstrap du Plan 5, `/anti-drift-planning:new-plan 5`, ou l'audit de fin de projet).

- [ ] **Step 4: Sur FAIL ou toute entrée `pending-user`**

Ne **rien** taguer. Committer, écrire le handoff, lister les décisions attendues, rappeler que `/anti-drift-planning:resume 4` régénère le prompt de reprise. « Prêt à ship, une décision en attente » **est** un état de succès.

---

## Plan self-review

**1. Spec coverage** — chaque critère de la spec §3 est couvert :
R1 → T-A1 (schémas, build valide) + T-A2 (≥ 2 + ≥ 2 réels) · R2 → T-B1 (grille) + T-B2 (filtre format/outil/tag) · R3 → T-B3 (copie + feedback, vérifiée par lecture du presse-papier) · R4 → T-B3 (`shouldRenderPromptBlock`, testée + smoke fiche/guide) · R5 → T-C1 (grille + filtre tag/type) · R6 → T-C2 (instructions + `installCmd` copiable + repo + prompts liés) · R7 → T-A1 (garde-fou) + T-A2 (données + preuve d'échec) + T-C2 (rendu, deux sens, preuve d'échec) · R8 → T-D1 (config + garde-fou) + T-D2 (création réelle) · R9 → contrôle 375px dark+light dans T-B1, T-B2, T-B3, T-C1, T-C2.
Les phases de la spec §4 sont couvertes : A → T-A1/T-A2 · B → T-B1/T-B2/T-B3 · C → T-C1/T-C2 · D → T-D1/T-D2 · Z → T-Z1.
Spec §6 : §6.1 copie + fallback → T-B3 · §6.2 bloc de code réutilisé → T-B3 et T-C2 · §6.3 filtre réutilisé → T-B2 (moteur unique, périmètre exact ratifié au gate).

**2. Placeholder scan** — un seul emplacement du plan n'est pas entièrement écrit : le **contenu réel** de T-A2 (prompts et skills de Benoît). C'est délibéré et signalé comme tel : un agent ne peut pas inventer des artefacts publics signés de son nom, et le Plan 3 a payé deux amendements pour l'avoir tenté. Le plan fournit la matière réelle identifiée, les contraintes de véracité et l'ordre exact des vérifications ; les valeurs se figent au gate, **avant** exécution.

**3. Type consistency** — vérifié : `PROMPT_FORMATS` (défini T-A1, consommé T-B2 et T-D1) · `getSortedPrompts`/`getSortedSkills` (T-A1 → T-B1, T-B3, T-C1, T-C2) · `collectTools`/`collectPromptTags`/`collectTypes`/`collectSkillTags` (T-A1 → T-B2, T-C1) · `assertEntriesResolved` (déplacée en T-A1, consommée T-A2, T-B3, T-C2) · `ALL`/`matchesFacets`/`FacetSelection` (T-B2 → script + `projectFilters`) · `copyText`/`ClipboardDeps` (T-B3 → `copy-code.ts`) · `shouldRenderPromptBlock` (T-B3). Le contrat DOM `data-facet-card` / `data-facet` / `data-facet-empty` / `data-facet-key` / `data-facet-value` est **le même** en T-B1, T-B2 et T-C1.

**4. Ambiguity check** — trois points tranchés explicitement plutôt que devinés : (a) « composant filtre réutilisé » = un moteur unique, script DOM du Plan 3 non migré ; (b) `skills ↔ prompts` = sens skill→prompts exigé, sens retour proposé comme addition n°2 ; (c) « copiable » = bouton du code-block du Plan 1, pas un second mécanisme.
