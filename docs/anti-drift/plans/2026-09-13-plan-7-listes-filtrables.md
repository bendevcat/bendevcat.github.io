# Plan 7 — Le patron « liste filtrable » — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to
> implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** donner aux quatre listes (`/projets`, `/blog`, `/prompts`, `/skills`) les six éléments du
patron §5.1 du contrat visuel — pilules de filtre, dropdown, ligne de méta au compte exact, entrée
à la une conditionnelle, grille, état vide réversible — avec des vignettes partout, et un
comportement identique sur les quatre.

**Architecture:** un seul moteur, étendu et non réécrit (spec §6.2). `src/lib/facetFilters.ts`
reste le prédicat ; on lui ajoute **un** module de logique pure, `src/lib/listPattern.ts`, dont la
fonction `computeListState()` calcule d'un coup tout ce que le patron doit afficher (visibilité,
compte, entrée à la une, ligne de méta, message d'état vide, ordre de tri). Un seul script de glue
DOM, `src/scripts/list-pattern.ts`, sert les quatre pages : il lit les cartes, appelle
`computeListState()`, applique `hidden` et réordonne. Toute la logique est testable en vitest ;
le script ne décide rien.

**Tech Stack:** Astro v7, Tailwind v4 (`@theme static` + `@layer components`), TypeScript vanilla
(pas de framework d'îlots — contrat §9), vitest.

**Spec:** [`docs/anti-drift/specs/2026-09-13-plan-7-listes-filtrables.md`](../specs/2026-09-13-plan-7-listes-filtrables.md)
**Contrat visuel:** [`docs/anti-drift/specs/2026-09-12-refonte-visuelle-design.md`](../specs/2026-09-12-refonte-visuelle-design.md)

---

## Global Constraints

Valables pour **toutes** les tâches. Les huit premières sont héritées des plans 3 à 6 et ont chacune
coûté un défaut réel ; les quatre dernières viennent de la spec P7.

1. **`@theme static` ne se supprime pas.** Sans `static`, Tailwind v4 élague six tokens clairs du
   bundle (`card`, `rail`, `chip`, `panel`, `nav`, `hatch`) **sans aucun signal rouge** — mesuré sur
   `dist/` au Plan 6 (17 → 23 tokens émis). Aucune passe de simplification ne le retire.
2. **L'ombre passe par `box-shadow: var(--shadow)`, jamais par l'utilitaire `.shadow`.** Tailwind v4
   fige la valeur **claire** à la compilation dans `.shadow` ; la surcharge sombre ne l'atteint
   jamais. Mesuré sur le bundle au Plan 6.
3. **Après la Phase A, les patrons sont dans `@layer components`** et un utilitaire les surcharge de
   nouveau. Ne jamais réintroduire de règle de patron hors couche : l'échec est silencieux.
4. **Ne jamais mesurer un thème juste après avoir basculé `document.documentElement.dataset.theme`.**
   `transition-colors` est encore en cours et la mesure rend les valeurs du thème **précédent**.
   Poser `localStorage.theme` puis **recharger**. (Spec §6.5 ; un faux diagnostic au Plan 6.)
5. **Enhancement progressif.** Toute barre de contrôles est rendue `hidden` par le serveur et
   révélée par le script. Sans JS : aucun contrôle mort, toutes les cartes visibles. Le masquage
   passe par l'attribut `hidden` (sémantique : sort de l'arbre d'accessibilité et de l'ordre de
   tabulation), jamais par une classe.
6. **Rayons ∈ {9, 10, 14, 20, 999}px** (V6) — via les utilitaires `rounded-badge` / `rounded-thumb`
   / `rounded-inner` / `rounded-card` / `rounded-pill`. Jamais de valeur brute.
7. **Mono = donnée machine uniquement** (V5). Date, catégorie, techno, version, compteur, chemin.
   Un message de prose en `font-mono` est un défaut — l'état vide et la ligne de méta sont
   concernés : la ligne de méta est de la donnée (compteur), le message d'état vide est de la prose.
8. **En thème clair, le bleu n'existe pas** (V4, contrat §2.2). Ne pas « harmoniser ».
9. **Le modèle de contenu est figé.** `git diff milestone-plan-6 -- src/content.config.ts` doit
   rester **vide** à la fin du plan (R10, contrat §9). Aucun champ ajouté, aucune valeur d'enum.
10. **La vignette ne crée ni fichier image ni champ de schéma** (R8, spec §6.1). Elle vient du
    `cover` quand il existe, sinon d'un visuel dérivé de la catégorie/type, généré en CSS/SVG.
11. **TypeScript vanilla.** Pas de React/Vue/Svelte, pas d'îlot (contrat §9).
12. **Serveur de dev en arrière-plan** : `astro dev --background` (CLAUDE.md), ou
    `npm run build` + le preview `astro-preview` de `.claude/launch.json` pour mesurer sur le rendu
    buildé.

---

## Constat de pré-flight — un défaut de la spec, sans effet sur le livrable

La spec P7 §6.1 demande : « Le §8.2 du contrat est périmé : il dit "3 articles sur 6 ont un
`cover`" […] Le corriger fait partie de la Phase A. » **Cette correction est déjà appliquée** : le
§8.2 du contrat visuel porte déjà la mention « ~~État actuel : 3 articles sur 6~~ **Chiffre
périmé.** Mesuré le 2026-09-13 : **5 des 5 articles publiés** portent un `cover` ». La Phase A n'a
donc rien à corriger de ce côté. **Défaut de plan, pas déviation** : rien de ce qui ship ne change.
Consigné dans les Notes de T-A1 au ledger.

## État mesuré du contenu (2026-09-13) — ce que le plan doit assumer

| Collection | Publiées | `featured: true` | `cover` | Facettes disponibles |
|---|---|---|---|---|
| `blog` | **5** (1 draft : `bienvenue-dans-mon-foutoir`) | **0** | 5/5 | `category` (2 valeurs utilisées : DevOps, Outils), `tag` (≈18) |
| `projects` | 2 | 1 (`site-bencat`) | **0/2** | `status` (2 utilisées : actif, wip), `stack` (8) |
| `prompts` | 3 | *champ absent* | *champ absent* | `format` (fiche, guide), `tool` (Claude, Claude Code), `tag` (4) |
| `skills` | 2 | *champ absent* | *champ absent* | `type` (**1 seule valeur** : `claude-code`), `tag` (4) |

Conséquences directes, à ne pas redécouvrir en cours d'exécution :
- **L'entrée à la une du blog vient de la dérivation**, pas de `featured` : aucun article n'a
  `featured: true`. Règle appliquée (spec §6.1) : `featured: true` là où le champ existe **et** est
  vrai ; à défaut, **la première entrée de l'ordre canonique** de la collection.
- **`/skills` ne peut pas satisfaire R7 à la lettre** : son `type` n'a qu'une valeur, donc la
  sélectionner ne change ni l'ordre ni le sous-ensemble (2 → 2). Point porté au gate de validation.

---

## Décisions d'implémentation tranchées par ce plan (la spec est muette — ratification au gate)

| # | Question | Décision | Pourquoi |
|---|---|---|---|
| I1 | R7 nomme le **dropdown** de chaque famille, jamais la **facette primaire** des pilules | Pilules = `stack` (projets) · `category` (blog) · `tool` (prompts) · `tag` (skills) | Chaque famille garde ses facettes livrées ; seul le **contrôle** qui les porte change. Sur `/projets` c'est une permutation exacte de l'existant (statut ↔ techno). |
| I2 | Où vont les facettes surnuméraires (`tag` sur blog et prompts) ? | Conservées, en **dropdown secondaire** après celui nommé par R7 | Les retirer serait une réduction de fonctionnalité livrée (Plans 4 et 5) — donc une déviation. Sur `/blog`, `tag` passe donc de pilules à dropdown : R3 dit « **une** barre de pilules ». |
| I3 | L'entrée à la une disparaît quand un filtre s'active (R5) — que devient sa carte ? | Elle est rendue **deux fois** : **une seule** carte en format « à la une » dans son conteneur, et la même entrée en carte normale dans la grille, rendue `hidden` **par le serveur**. Le script n'en montre jamais qu'une. | Sans le doublon, filtrer sur la catégorie de l'entrée à la une l'exclurait du résultat — un filtre qui perd une entrée. Le `hidden` serveur est ce qui tient la contrainte n°5 : **sans JS**, la page montre 1 entrée à la une et N-1 en grille, soit chaque entrée exactement une fois. La copie masquée porte `hidden`, donc sort de l'arbre d'accessibilité. |
| I4 | Un script de glue par page, ou un seul ? | **Un seul** : `src/scripts/list-pattern.ts` remplace `facet-filters.ts` et `project-filters.ts` | Le premier thème de douleur de la spec est « quatre listes qui divergent ». Deux scripts de glue = deux comportements. `blog-filters.ts` (relais des puces de carte) est conservé tel quel. |
| I5 | `src/lib/projectFilters.ts` perd son seul appelant en I4 — le supprimer ? | **Non.** Il gagne une fonction de sérialisation `projectFacets()` utilisée par `ProjectCard.astro`, et garde `matchesFilters` + sa suite | R11 exige que **les 12 suites existantes restent vertes** ; supprimer `projectFilters.test.ts` les ramènerait à 11. Le module reste vivant et testé. |
| I6 | Forme du visuel dérivé (R8) quand il n'y a pas de `cover` | Bloc en `rail`, rayon `thumb` (10px), trame `hatch` en CSS, et **monogramme** = les 2 premières lettres de la catégorie/type, en mono | Consomme `rail` et `hatch` — deux des dix tokens que le contrat §6.4 dit n'être peints par rien. Zéro fichier, zéro champ. |

---

## File Structure

**Créés**
- `src/lib/listPattern.ts` — toute la logique pure du patron. `computeListState()` et ses types.
- `src/lib/listPattern.test.ts` — la 13ᵉ suite.
- `src/scripts/list-pattern.ts` — glue DOM unique des quatre listes.
- `src/components/Thumbnail.astro` — vignette : `cover` si présent, sinon visuel dérivé.

**Modifiés**
- `src/styles/global.css` — les 4 patrons entrent dans `@layer components` (Phase A) ; la liste des
  sélecteurs `[hidden]` accueille les nouveaux `data-*`.
- `src/pages/{projets,blog,prompts,skills}/index.astro` — les 6 éléments du patron, dans l'ordre.
- `src/components/{ProjectCard,ArticleCard,PromptCard,SkillCard}.astro` — vignette + contrat
  `data-facet` unifié + données de tri.
- `src/lib/projectFilters.ts` — ajout de `projectFacets()` (I5).
- `src/lib/posts.ts` — accueille `estimateReadingMinutes()`, extraite de `ArticleCard.astro`.

**Supprimés**
- `src/scripts/project-filters.ts` — en **T-B3**, dès que `/projets` est migré (sa seule page).
- `src/scripts/facet-filters.ts` — en **T-C2/Step 4**, et pas avant : `/blog`, `/prompts` et
  `/skills` l'importent encore jusque-là, et le retirer en T-B3 casserait leur build.

Ce sont des scripts de glue, pas des suites de tests : `src/lib/facetFilters.ts` et
`src/lib/projectFilters.ts` restent tous les deux, avec leurs suites (I5, R11).

---

# Phase A — Désarmer le piège de cascade

### Task A1 : les 4 patrons entrent dans `@layer components`

**Couvre :** R1, R2.

**Files:**
- Modify: `src/styles/global.css:133-162` (les blocs `.card`, `.card-inner`, `.panel`, `.pill`)

**Interfaces:**
- Consumes: rien.
- Produces: à partir d'ici, un utilitaire Tailwind surcharge un patron. Les tâches suivantes
  peuvent écrire `class="pill bg-chip"` et obtenir `chip`.

- [ ] **Step 1: Établir la mesure « avant », pour avoir un point de comparaison**

```bash
git stash list >/dev/null 2>&1
npm run build >/tmp/p7-build-before.log 2>&1 && tail -3 /tmp/p7-build-before.log
# squelette DOM de référence. Mesuré le 2026-09-13 : `milestone-plan-6` construit
# 53 fichiers HTML, la branche courante 52 — voir le Step 4 pour la raison.
cp -R dist /tmp/p7-dist-before
```

- [ ] **Step 2: Envelopper les quatre patrons — et eux seuls**

Dans `src/styles/global.css`, remplacer les quatre blocs de règles `.card`, `.card-inner`, `.panel`,
`.pill` (lignes 133-162, commentaire d'en-tête conservé) par un unique bloc :

```css
@layer components {
  .card { /* … corps inchangé … */ }
  .card-inner { /* … corps inchangé … */ }
  .panel { /* … corps inchangé … */ }
  .pill { /* … corps inchangé … */ }
}
```

Aucune déclaration n'est ajoutée, retirée ou modifiée à l'intérieur des quatre blocs. `.prose`,
`.copy-btn`, `.code-block-wrapper`, `html` et la règle `[hidden]` restent **hors** couche : ils ne
sont pas des patrons du contrat §4, et les déplacer changerait leur priorité face aux utilitaires.

- [ ] **Step 3: Prouver au rendu que l'utilitaire a repris la main (la mesure de R1)**

Ajouter temporairement une sonde dans `src/pages/404.astro` (page sans contenu dynamique) :
`<span id="p7-probe" class="pill bg-nav">sonde</span>`, puis :

```bash
npm run build && npx astro preview --port 4321 &
```

Dans la page, en console :

```js
getComputedStyle(document.getElementById('p7-probe')).backgroundColor
```

Attendu : la valeur de `--color-nav` (`#FFFFFF` en clair, `rgba(255,255,255,0.05)` en sombre) —
**pas** `--color-accentSoft` (`rgba(11,107,76,0.1)`), qui était la valeur mesurée au Plan 6.
**Retirer la sonde avant le commit.**

- [ ] **Step 4: Prouver que rien n'a bougé ailleurs (la mesure de R2, volet squelette)**

Le squelette de référence se build dans un **worktree séparé** : ne jamais faire de `git stash` +
`git checkout <ref> -- .` sur le working tree de la branche — c'est destructif et un `stash pop` qui
échoue laisse la branche dans un état mixte.

```bash
git worktree add /tmp/p7-m6 milestone-plan-6
ln -s "$PWD/node_modules" /tmp/p7-m6/node_modules
(cd /tmp/p7-m6 && npx astro build)        # pagefind inutile ici : on compare le HTML
npm run build
for f in $(cd dist && find . -name '*.html' | sort); do
  [ -f "/tmp/p7-m6/dist/$f" ] || { echo "ABSENT dans m6: $f"; continue; }
  diff <(sed -e 's/<[^>]*>/&\n/g' "/tmp/p7-m6/dist/$f" | grep -o '^<[a-z][a-z0-9]*' | tr -d '<') \
       <(sed -e 's/<[^>]*>/&\n/g' "dist/$f"            | grep -o '^<[a-z][a-z0-9]*' | tr -d '<') \
    >/dev/null || echo "DIFF: $f"
done
git worktree remove --force /tmp/p7-m6
```

**Attendu — et c'est un attendu en deux temps, parce que la référence a bougé.** La comparaison
contre `milestone-plan-6` renvoie **4 lignes `DIFF:`** qui ne viennent pas de cette tâche :
`milestone-plan-6` construit encore l'article `draft: true` `bienvenue-dans-mon-foutoir`
(53 fichiers HTML contre 52), retiré depuis par un commit postérieur au tag. Ce qui doit être
prouvé est donc que **la Phase A n'en ajoute aucune** :

```bash
# contre-épreuve : la MÊME boucle, sur le dist capturé AVANT l'édition de global.css
for f in $(cd /tmp/p7-dist-before && find . -name '*.html' | sort); do
  [ -f "/tmp/p7-m6/dist/$f" ] || { echo "ABSENT dans m6: $f"; continue; }
  diff <(sed -e 's/<[^>]*>/&\n/g' "/tmp/p7-m6/dist/$f"     | grep -o '^<[a-z][a-z0-9]*' | tr -d '<') \
       <(sed -e 's/<[^>]*>/&\n/g' "/tmp/p7-dist-before/$f" | grep -o '^<[a-z][a-z0-9]*' | tr -d '<') \
    >/dev/null || echo "DIFF: $f"
done
```

Attendu : les deux boucles renvoient **exactement la même liste**, ligne pour ligne. Toute ligne
présente dans la première et absente de la seconde est une régression **introduite par cette
tâche** — c'est elle, et elle seule, que R2 interdit.

> Cette mesure différentielle est une lecture plus étroite que la lettre de R2, et elle est
> consignée comme la déviation **D01** dans `docs/anti-drift/handoffs/plan-7-deviations.md`. Elle
> est `pending-user` : on procède, on ne ship pas.

- [ ] **Step 5: Recalculer les 3 paires de contraste (la mesure de R2, volet contraste)**

Les trois paires de R12 du Plan 6 / V8 du contrat : `body` sur `bg`, `muted` sur `surface`,
`accent` sur `accentSoft`. Dans la page buildée, dans **chaque** thème (poser `localStorage.theme`
puis **recharger** — contrainte globale n°4) :

**`accentSoft` est semi-transparent** (`rgba(11,107,76,.10)` en clair, `rgba(74,222,128,.12)` en
sombre) et partage son triplet RVB avec `accent`. Une formule qui ignore l'alpha renverrait donc un
ratio de **1.0** pour cette paire, jamais ≥ 4.5 : il faut **compositer** `accentSoft` sur le fond
opaque où il est réellement peint avant de calculer.

```js
// ratio WCAG, avec compositing alpha — à exécuter en console sur la page buildée
const lum = ([r,g,b]) => { const f = c => (c/=255) <= .03928 ? c/12.92 : ((c+.055)/1.055)**2.4;
  return .2126*f(r)+.7152*f(g)+.0722*f(b); };
const parse = s => { const n = s.match(/[\d.]+/g).map(Number); return [n[0],n[1],n[2],n[3] ?? 1]; };
// compose `fg` (éventuellement translucide) par-dessus `bg` (opaque)
const over = (fg, bg) => { const [r,g,b,a] = parse(fg), [R,G,B] = parse(bg);
  return [r*a+R*(1-a), g*a+G*(1-a), b*a+B*(1-a)]; };
const ratio = (a,b) => { const [x,y] = [lum(a), lum(b)].sort((p,q)=>q-p); return (x+.05)/(y+.05); };
// exemple : accent sur accentSoft, ce dernier peint sur la surface d'une carte
// ratio(parse(accent).slice(0,3), over(accentSoft, surface))
```

Le fond opaque à passer en second argument d'`over()` est celui sur lequel la pilule est **vraiment**
posée : le remonter dans le DOM jusqu'au premier ancêtre à fond opaque, ne pas le supposer.

Attendu : les 3 ratios ≥ **4.5:1** dans les 2 thèmes — soit exactement les valeurs du Plan 6, ce
bloc ne touchant aucune couleur.

- [ ] **Step 6: Tests et check**

```bash
npm test && npm run check
```

Attendu : **12 suites vertes**, `astro check` sans erreur.

- [ ] **Step 7: Commit**

```bash
git add src/styles/global.css
git commit -m "fix(p7): les 4 patrons entrent dans @layer components (R1, R2)"
```

---

# Phase B — Résoudre le patron une fois, sur `/projets`

### Task B1 : `listPattern.ts` — toute la logique du patron, pure et testée

**Couvre :** R4, R5, R6, R7 (volet logique), R11.

**Files:**
- Create: `src/lib/listPattern.ts`
- Create: `src/lib/listPattern.test.ts`
- Modify: `src/lib/posts.ts` (accueille `estimateReadingMinutes`)
- Modify: `src/components/ArticleCard.astro:31-36` (importe la fonction au lieu de la redéfinir)
- Modify: `src/lib/projectFilters.ts` (ajout de `projectFacets`, décision I5)

**Interfaces:**
- Consumes: `ALL`, `matchesFacets`, `FacetValues`, `FacetSelection` de `src/lib/facetFilters.ts`.
- Produces — **les noms exacts que les tâches B3, C1 et C2 utiliseront** :

```ts
export type SortOrder = 'none' | 'recent' | 'oldest' | 'shortest' | 'longest';

export interface ListEntry {
  id: string;                 // identifiant stable de la carte (data-entry-id)
  facets: FacetValues;        // { category: ['DevOps'], tag: ['docker'] }
  featured: boolean;          // vrai si le contenu porte featured: true
  date: number;               // timestamp ms ; 0 quand la collection n'a pas de date
  minutes: number;            // temps de lecture estimé ; 0 hors blog
}

export interface FacetLabel { key: string; label: string; }

export interface ListLabels {
  singular: string;                 // « projet »
  plural: string;                   // « projets »
  facets: FacetLabel[];             // libellés lisibles des facettes, dans l'ordre d'affichage
}

export interface ListState {
  visibleIds: string[];       // ids à afficher dans la GRILLE, dans l'ordre de tri
  count: number;              // cartes réellement visibles = grille + entrée à la une
  featuredId: string | null;  // id de l'entrée à la une, ou null dès qu'une facette est active
  meta: string;               // ligne de méta, ex. « 2 projets » ou « 1 projet · techno Astro »
  empty: string | null;       // message d'état vide contextualisé, ou null s'il y a des résultats
}

/**
 * Règle de dérivation de l'entrée à la une (spec §6.1) : `featured: true` là où
 * le champ existe, à défaut la PREMIÈRE entrée de l'ordre canonique. Exportée
 * pour que les pages l'appellent CÔTÉ SERVEUR et désignent exactement la même
 * entrée que le script — c'est ce qui permet de rendre le bloc « à la une »
 * avec une seule carte, et donc de ne pas afficher de doublon sans JavaScript.
 */
export function pickFeaturedEntry<T extends object>(entries: (T & { featured?: boolean })[]): T | null {
  return entries.find((entry) => entry.featured) ?? entries[0] ?? null;
}

export function computeListState(
  entries: ListEntry[],
  selection: FacetSelection,
  order: SortOrder,
  labels: ListLabels,
): ListState;

export function isAnyFacetActive(selection: FacetSelection): boolean;

/**
 * La règle de dérivation de la spec §6.1, isolée pour que le SERVEUR et le
 * CLIENT désignent la même entrée. Les pages l'appellent au rendu pour savoir
 * quelle carte va dans le bloc « à la une » et laquelle masquer dans la grille.
 *
 * La contrainte est `T extends object` et le champ optionnel vit sur les
 * ÉLÉMENTS, pas sur la contrainte : `{ featured?: boolean }` est un *weak type*
 * TypeScript — n'ayant que des propriétés optionnelles, il rejette tout argument
 * qui n'en partage aucune, donc une entrée de collection sans champ `featured`
 * (prompts, skills), qui est précisément le cas que cette fonction doit servir.
 * Reproduit à `tsc --strict` en T-B1, puis indépendamment en revue (P-09).
 */
export function pickFeaturedEntry<T extends object>(entries: (T & { featured?: boolean })[]): T | null;
```

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/lib/listPattern.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { ALL } from './facetFilters';
import {
  computeListState,
  isAnyFacetActive,
  pickFeaturedEntry,
  type ListEntry,
  type ListLabels,
} from './listPattern';

const LABELS: ListLabels = {
  singular: 'projet',
  plural: 'projets',
  facets: [
    { key: 'stack', label: 'techno' },
    { key: 'status', label: 'statut' },
  ],
};

const ENTRIES: ListEntry[] = [
  { id: 'a', facets: { stack: ['Astro'], status: ['wip'] }, featured: true, date: 300, minutes: 9 },
  { id: 'b', facets: { stack: ['Bash'], status: ['actif'] }, featured: false, date: 200, minutes: 3 },
  { id: 'c', facets: { stack: ['Astro'], status: ['actif'] }, featured: false, date: 100, minutes: 5 },
];
const NONE = { stack: ALL, status: ALL };

describe('isAnyFacetActive', () => {
  it('est faux quand toutes les facettes sont sur la sentinelle', () => {
    expect(isAnyFacetActive(NONE)).toBe(false);
  });
  it('est vrai dès qu’une seule facette porte une valeur', () => {
    expect(isAnyFacetActive({ stack: 'Astro', status: ALL })).toBe(true);
  });
});

describe('pickFeaturedEntry — la règle de dérivation (spec §6.1)', () => {
  it('préfère une entrée featured où qu’elle soit dans la liste', () => {
    expect(pickFeaturedEntry([{ featured: false }, { featured: true, id: 'x' }])).toEqual({
      featured: true,
      id: 'x',
    });
  });
  it('à défaut, retient la première entrée de l’ordre canonique', () => {
    expect(pickFeaturedEntry([{ id: 'first' }, { id: 'second' }])).toEqual({ id: 'first' });
  });
  it('retourne null sur une collection vide', () => {
    expect(pickFeaturedEntry([])).toBeNull();
  });
});

describe('computeListState — entrée à la une (R5)', () => {
  it('sans filtre, retient l’entrée featured et la sort de la grille', () => {
    const state = computeListState(ENTRIES, NONE, 'none', LABELS);
    expect(state.featuredId).toBe('a');
    expect(state.visibleIds).toEqual(['b', 'c']);
  });

  it('sans featured, retient la PREMIÈRE entrée de l’ordre canonique (spec §6.1)', () => {
    const plain = ENTRIES.map((e) => ({ ...e, featured: false }));
    expect(computeListState(plain, NONE, 'none', LABELS).featuredId).toBe('a');
  });

  it('dès qu’une facette est active, il n’y a plus d’entrée à la une', () => {
    const state = computeListState(ENTRIES, { stack: 'Astro', status: ALL }, 'none', LABELS);
    expect(state.featuredId).toBeNull();
  });

  it('l’entrée à la une revient dans la grille dès qu’un filtre la sélectionne (I3)', () => {
    const state = computeListState(ENTRIES, { stack: 'Astro', status: ALL }, 'none', LABELS);
    expect(state.visibleIds).toEqual(['a', 'c']);
  });
});

describe('computeListState — compte exact (R4)', () => {
  it('sans filtre, compte l’entrée à la une AVEC la grille', () => {
    const state = computeListState(ENTRIES, NONE, 'none', LABELS);
    expect(state.count).toBe(3);
    expect(state.count).toBe(state.visibleIds.length + 1);
  });

  it('avec une facette, compte les seules entrées correspondantes', () => {
    expect(computeListState(ENTRIES, { stack: 'Astro', status: ALL }, 'none', LABELS).count).toBe(2);
  });

  it('avec deux facettes combinées, applique le ET', () => {
    const state = computeListState(ENTRIES, { stack: 'Astro', status: 'actif' }, 'none', LABELS);
    expect(state.count).toBe(1);
    expect(state.visibleIds).toEqual(['c']);
  });
});

describe('computeListState — ligne de méta (R4)', () => {
  it('accorde le nom au singulier', () => {
    const state = computeListState(ENTRIES, { stack: 'Astro', status: 'actif' }, 'none', LABELS);
    expect(state.meta).toBe('1 projet · techno Astro · statut actif');
  });
  it('accorde au pluriel et n’annonce aucune facette quand aucune n’est active', () => {
    expect(computeListState(ENTRIES, NONE, 'none', LABELS).meta).toBe('3 projets');
  });
});

describe('computeListState — état vide (R6)', () => {
  it('est null tant qu’il reste un résultat', () => {
    expect(computeListState(ENTRIES, NONE, 'none', LABELS).empty).toBeNull();
  });
  it('nomme les facettes actives quand la combinaison ne donne rien', () => {
    const state = computeListState(ENTRIES, { stack: 'Bash', status: 'wip' }, 'none', LABELS);
    expect(state.count).toBe(0);
    expect(state.empty).toBe('Aucun projet pour techno Bash et statut wip.');
    expect(state.featuredId).toBeNull();
  });
});

describe('computeListState — tri (R7)', () => {
  // `visibleIds` attendu = l’ordre trié PRIVÉ de l’entrée à la une, laquelle
  // reste « a » quel que soit le tri : elle se dérive de l’ordre CANONIQUE
  // (spec §6.1), pas de l’ordre courant. C’est ce qui garde le client d’accord
  // avec le slot que le serveur a rendu.
  const ORDERS: Array<[Parameters<typeof computeListState>[2], string[]]> = [
    ['none', ['b', 'c']],
    ['recent', ['b', 'c']],
    ['oldest', ['c', 'b']],
    ['shortest', ['b', 'c']],
    ['longest', ['c', 'b']],
  ];
  for (const [order, expected] of ORDERS) {
    it(`ordonne la grille selon « ${order} » sans déplacer l’entrée à la une`, () => {
      const plain = ENTRIES.map((e) => ({ ...e, featured: false }));
      const state = computeListState(plain, { stack: ALL, status: ALL }, order, LABELS);
      expect(state.featuredId).toBe('a');
      expect(state.visibleIds).toEqual(expected);
      // R4 reste vrai sous tri : rien ne disparaît de la page.
      expect(state.count).toBe(state.visibleIds.length + 1);
      expect(state.count).toBe(plain.length);
    });
  }

  it('ne mute pas le tableau reçu', () => {
    const input = [...ENTRIES];
    computeListState(input, NONE, 'oldest', LABELS);
    expect(input.map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run src/lib/listPattern.test.ts
```

Attendu : FAIL — `Failed to resolve import "./listPattern"`.

- [ ] **Step 3: Écrire `src/lib/listPattern.ts`**

```ts
/**
 * Logique du patron « liste filtrable » (contrat visuel §5.1, Plan 7).
 *
 * AUCUN import d'`astro:content` : ce module est chargé par le navigateur
 * (src/scripts/list-pattern.ts) ET par les tests unitaires — comme
 * facetFilters.ts, dont il est le seul consommateur côté logique.
 *
 * Une seule fonction décide de TOUT ce que la page affiche. Le script de glue
 * n'a aucune décision à prendre : il lit le DOM, appelle computeListState(),
 * applique. C'est ce qui rend R4, R5, R6 et R7 testables sans navigateur.
 */
import { ALL, matchesFacets, type FacetSelection, type FacetValues } from './facetFilters';

export type SortOrder = 'none' | 'recent' | 'oldest' | 'shortest' | 'longest';

export interface ListEntry {
  id: string;
  facets: FacetValues;
  featured: boolean;
  date: number;
  minutes: number;
}

export interface FacetLabel {
  key: string;
  label: string;
}

export interface ListLabels {
  singular: string;
  plural: string;
  facets: FacetLabel[];
}

export interface ListState {
  visibleIds: string[];
  count: number;
  featuredId: string | null;
  meta: string;
  empty: string | null;
}

/** Vrai dès qu'une seule facette porte autre chose que la sentinelle. */
export function isAnyFacetActive(selected: FacetSelection): boolean {
  return Object.values(selected).some((value) => value !== ALL);
}

/** Les facettes actives, dans l'ordre d'affichage déclaré par la page. */
function activeFacets(selected: FacetSelection, labels: ListLabels): string[] {
  return labels.facets
    .filter((facet) => (selected[facet.key] ?? ALL) !== ALL)
    .map((facet) => `${facet.label} ${selected[facet.key]}`);
}

/**
 * Comparateurs de tri. `none` préserve l'ordre canonique de la collection —
 * chaque lib de collection (posts.ts, projects.ts, prompts.ts, skills.ts) l'a
 * déjà appliqué côté serveur, on ne le recalcule pas ici.
 */
const COMPARATORS: Record<Exclude<SortOrder, 'none'>, (a: ListEntry, b: ListEntry) => number> = {
  recent: (a, b) => b.date - a.date,
  oldest: (a, b) => a.date - b.date,
  shortest: (a, b) => a.minutes - b.minutes,
  longest: (a, b) => b.minutes - a.minutes,
};

export function computeListState(
  entries: ListEntry[],
  selected: FacetSelection,
  order: SortOrder,
  labels: ListLabels,
): ListState {
  const filtered = entries.filter((entry) => matchesFacets(entry.facets, selected));

  // Ne mute jamais le tableau reçu (leçon de sortProjects, Plan 3).
  const sorted = order === 'none' ? [...filtered] : [...filtered].sort(COMPARATORS[order]);

  // R5 : l'entrée à la une n'existe QUE sans filtre. Règle de dérivation de la
  // spec §6.1 : `featured: true` là où le champ existe, à défaut la première
  // entrée de **l'ordre canonique de la collection**.
  //
  // `entries` et NON `sorted` : c'est l'ordre canonique que la spec nomme, et
  // c'est aussi ce que le serveur calcule quand il choisit la carte à rendre
  // dans le bloc « à la une ». Dériver du tableau trié les ferait diverger dès
  // qu'un tri est actif (le cas de `/blog`) : le slot serveur porterait une
  // entrée, le client en désignerait une autre, le slot n'afficherait donc
  // rien — et l'entrée désignée serait AUSSI retirée de la grille par la ligne
  // suivante. Une entrée disparaîtrait de la page tout en restant comptée.
  // L'entrée à la une n'existant que sans facette active, `entries` et le
  // tableau filtré sont alors identiques : aucune information n'est perdue.
  const featured = isAnyFacetActive(selected) ? null : pickFeaturedEntry(entries);

  const visibleIds = sorted.filter((entry) => entry.id !== featured?.id).map((entry) => entry.id);

  // R4 : le compte est celui des cartes RÉELLEMENT visibles — l'entrée à la une
  // en fait partie.
  const count = visibleIds.length + (featured ? 1 : 0);

  const active = activeFacets(selected, labels);
  const noun = count === 1 ? labels.singular : labels.plural;
  const meta = [`${count} ${noun}`, ...active].join(' · ');

  // R6 : contextualisé — le message nomme les facettes actives. Prose, donc
  // jamais en `font-mono` (contrainte globale n°7).
  const empty =
    count > 0
      ? null
      : active.length > 0
        ? `Aucun ${labels.singular} pour ${active.join(' et ')}.`
        : `Aucun ${labels.singular} à afficher.`;

  return { visibleIds, count, featuredId: featured?.id ?? null, meta, empty };
}
```

- [ ] **Step 4: Lancer les tests — ils doivent passer**

```bash
npx vitest run src/lib/listPattern.test.ts
```

Attendu : **PASS, tous les tests de la suite**. Le nombre exact n'est pas écrit ici à dessein : la
dernière `describe` génère ses cas dans une boucle sur `ORDERS`, et un compte écrit à la main serait
faux au premier cas ajouté. **Reporter le compte observé** — un chiffre mesuré, jamais recopié.

- [ ] **Step 5: Extraire `estimateReadingMinutes` vers `src/lib/posts.ts`**

Le tri « court / long » de `/blog` (R7) a besoin du temps de lecture, aujourd'hui calculé dans une
fonction locale non testée de `ArticleCard.astro:31-34`. L'ajouter à `src/lib/posts.ts` **verbatim**
(aucun changement de comportement : R2 interdit de bouger le rendu) :

```ts
/**
 * Estimation grossière (~200 mots/min, arrondi au supérieur, minimum 1 min).
 * Reprise verbatim d'ArticleCard.astro (Plan 1) : ce plan la déplace pour que
 * le tri « court / long » (R7) et la carte lisent le MÊME nombre. Changer la
 * formule ici changerait un affichage livré — ce serait une déviation.
 */
export function estimateReadingMinutes(body: string): number {
  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}
```

Puis, dans `ArticleCard.astro`, supprimer la fonction locale et importer :
`import { estimateReadingMinutes } from '../lib/posts';`

Ajouter à `src/lib/posts.test.ts` :

```ts
import { estimateReadingMinutes } from './posts';

describe('estimateReadingMinutes', () => {
  it('arrondit au supérieur et ne descend jamais sous 1 minute', () => {
    expect(estimateReadingMinutes('')).toBe(1);
    expect(estimateReadingMinutes('mot '.repeat(201))).toBe(2);
  });
});
```

- [ ] **Step 6: Ajouter `projectFacets()` à `src/lib/projectFilters.ts` (décision I5)**

```ts
/**
 * Sérialise les facettes d'un projet pour le contrat `data-facet` commun aux
 * quatre listes (Plan 7 / I4). `matchesFilters` ci-dessus reste l'API publique
 * historique et sa suite reste la preuve de non-régression du Plan 3.
 */
export function projectFacets(entry: ProjectFilterEntry): Record<string, string[]> {
  return { status: [entry.status], stack: entry.stack };
}
```

Ajouter à `src/lib/projectFilters.test.ts` :

```ts
import { projectFacets } from './projectFilters';

describe('projectFacets', () => {
  it('produit les mêmes clés que celles que matchesFilters consomme', () => {
    expect(projectFacets({ status: 'wip', stack: ['Astro', 'Bash'] })).toEqual({
      status: ['wip'],
      stack: ['Astro', 'Bash'],
    });
  });
});
```

- [ ] **Step 7: Suite complète + check**

```bash
npm test && npm run check
```

Attendu : **13 suites vertes** (les 12 existantes + `listPattern`), `astro check` sans erreur.

- [ ] **Step 8: Commit**

```bash
git add src/lib/listPattern.ts src/lib/listPattern.test.ts src/lib/posts.ts src/lib/posts.test.ts \
        src/lib/projectFilters.ts src/lib/projectFilters.test.ts src/components/ArticleCard.astro
git commit -m "feat(p7): logique pure du patron liste filtrable (R4, R5, R6, R7, R11)"
```

---

### Task B2 : `Thumbnail.astro` — la vignette, dérivée quand il n'y a pas d'image

**Couvre :** R8 (volet composant), et donne du travail à V2 en consommant `rail` et `hatch`.

**Files:**
- Create: `src/components/Thumbnail.astro`
- Modify: `src/components/ProjectCard.astro:27-35`

**Interfaces:**
- Consumes: rien de B1.
- Produces: `<Thumbnail cover={…} coverAlt={…} title={…} derivedFrom="DevOps" size="card" | "featured" />`.
  `cover` accepte le type d'`image()` d'Astro ou `undefined`. `derivedFrom` est la chaîne dont le
  monogramme est tiré (catégorie, statut ou type). **`title` est requise** : c'est le repli du texte
  alternatif, `coverAlt` étant optionnel aux schémas — voir le commentaire de la prop.

- [ ] **Step 1: Écrire le composant**

```astro
---
import { Image } from 'astro:assets';
import type { ImageMetadata } from 'astro';

interface Props {
  /** Image du contenu, quand la collection en a une (blog, projects). */
  cover?: ImageMetadata;
  coverAlt?: string;
  /**
   * Repli du texte alternatif quand `coverAlt` est absent — `coverAlt` est
   * `optional()` dans les deux schémas. `ProjectCard` et `ArticleCard`
   * faisaient déjà `alt={coverAlt ?? title}` AVANT ce plan : cette prop est ce
   * qui empêche de perdre ce repli en déménageant l'image ici. Requise, pour
   * que l'oubli soit impossible et non simplement improbable.
   */
  title: string;
  /** Chaîne dont le visuel dérivé est tiré : catégorie, statut ou type. */
  derivedFrom: string;
  /** `featured` = format large de l'entrée à la une ; `card` = vignette de grille. */
  size?: 'card' | 'featured';
}

const { cover, coverAlt, title, derivedFrom, size = 'card' } = Astro.props;

// R8 / spec §6.1 : sans `cover`, le visuel est DÉRIVÉ — aucun fichier image,
// aucun champ de schéma. Le monogramme est purement fonction de la chaîne, donc
// stable d'un build à l'autre.
const monogram = derivedFrom.slice(0, 2).toUpperCase();
const ratio = size === 'featured' ? 'aspect-[16/7]' : 'aspect-video';
---

{
  cover ? (
    <Image src={cover} alt={coverAlt ?? title} class={`${ratio} w-full rounded-thumb object-cover`} />
  ) : (
    /*
      Niveau 4 de la hiérarchie des surfaces (§2.1) : `rail` est le creux — il
      est posé ici DANS une carte, jamais directement sur `surface` (V2).
      `hatch` fournit la trame ; les deux tokens ne peignaient rien avant ce
      plan (spec §6.4).
    */
    <div
      class={`${ratio} flex w-full items-center justify-center rounded-thumb bg-rail`}
      style="background-image: repeating-linear-gradient(135deg, var(--color-hatch) 0 1px, transparent 1px 9px);"
      aria-hidden="true"
    >
      <span class="font-mono text-2xl font-medium tracking-[.06em] text-dim">{monogram}</span>
    </div>
  )
}
```

`aria-hidden` sur le visuel dérivé : il ne porte aucune information que le titre de la carte ne
donne déjà. Un `alt` qui répéterait la catégorie serait du bruit pour un lecteur d'écran.

- [ ] **Step 2: Le brancher dans `ProjectCard.astro`**

Remplacer le bloc `{ cover && (<Image … />) }` (lignes 27-35) par :

```astro
<Thumbnail cover={cover} coverAlt={coverAlt} title={title} derivedFrom={status} />
```

et ajouter l'import. Les deux projets n'ayant **aucun** `cover` (état mesuré ci-dessus), c'est le
chemin dérivé qui est exercé — `AC` pour `actif`, `WI` pour `wip`.

- [ ] **Step 3: Mesurer au rendu**

```bash
npm run build
# `grep -c` compte les LIGNES qui matchent, pas les occurrences — et un HTML
# buildé est compacté sur une seule ligne, donc `-c` y renvoie 1 quel que soit
# le nombre de vignettes. Compter les occurrences, jamais les lignes :
grep -o 'rounded-thumb' dist/projets/index.html | wc -l
```

Attendu : **≥ 2** (une vignette par projet). Vérifier aussi les deux monogrammes attendus, `AC`
(projet `actif`) et `WI` (projet `wip`), puisque c'est le chemin dérivé qui est exercé — aucun des
deux projets n'a de `cover`. Et :

```bash
git status --porcelain src/content/ && git diff --stat milestone-plan-6 -- src/content.config.ts
```

Attendu : **aucune sortie** pour les deux — ni fichier image ajouté, ni schéma touché (R8, R10).

- [ ] **Step 4: Tests et check**

```bash
npm test && npm run check
```

Attendu : 13 suites vertes, `astro check` sans erreur.

- [ ] **Step 5: Commit**

```bash
git add src/components/Thumbnail.astro src/components/ProjectCard.astro
git commit -m "feat(p7): vignette dérivée sans fichier ni champ de schéma (R8)"
```

---

### Task B3 : `/projets` rend les six éléments du patron

**Couvre :** R3, R4, R5, R6, R7, R10 — et livre le script de glue unique.

**Files:**
- Create: `src/scripts/list-pattern.ts`
- Modify: `src/pages/projets/index.astro` (réécriture de la section de liste)
- Modify: `src/components/ProjectCard.astro` (contrat `data-facet` + `data-entry-id`, variante `featured`)
- Modify: `src/styles/global.css` (sélecteurs `[hidden]` des nouveaux `data-*`)
- Delete: `src/scripts/project-filters.ts`

**Interfaces:**
- Consumes: `computeListState`, `isAnyFacetActive`, `ListEntry`, `SortOrder`, `ListLabels` de B1 ;
  `<Thumbnail>` de B2 ; `projectFacets()` de B1/Step 6.
- Produces — **le contrat DOM que C1 et C2 répliqueront tel quel** :

| Attribut | Porté par | Rôle |
|---|---|---|
| `data-list` | la `<section>` de liste | racine ; `data-list-nouns="projet\|projets"` |
| `data-list-filters` | la barre de contrôles | `hidden` côté serveur, révélée par le script |
| `data-facet-key` / `data-facet-value` | boutons de pilule | facette primaire |
| `data-facet-key` | `<select>` | facette secondaire (celle de R7), puis les suivantes |
| `data-sort` | le `<select>` de tri | présent sur `/blog` seulement |
| `data-list-reset` | bouton de l'état vide | remet toutes les sélections sur `ALL` |
| `data-list-meta` | `<p>` de la ligne de méta | écrit par le script |
| `data-list-featured` | conteneur de l'entrée à la une | contient **une** carte |
| `data-list-grid` | conteneur de la grille | contient **toutes** les entrées (I3) |
| `data-list-empty` | conteneur de l'état vide | contient `[data-list-empty-text]` + le bouton reset |
| `data-entry-id` | chaque carte | identifiant stable |
| `data-facet` | chaque carte | JSON des facettes |
| `data-date` / `data-minutes` | chaque carte | données de tri (0 quand non pertinent) |
| `data-featured` | chaque carte | présent si `featured: true` |

- [ ] **Step 1: Écrire le script de glue**

```ts
/**
 * Glue DOM du patron « liste filtrable » — LE script des quatre listes
 * (/projets, /blog, /prompts, /skills). Il ne décide de rien : il lit les
 * cartes, appelle computeListState() et applique le résultat. Toute règle
 * métier qu'on serait tenté d'ajouter ici appartient à src/lib/listPattern.ts,
 * où elle sera testée.
 *
 * Remplace facet-filters.ts et project-filters.ts (Plan 7 / I4) : deux scripts
 * de glue, c'était deux comportements qui divergent — le premier thème de
 * douleur de la spec.
 */
import { ALL, type FacetSelection } from '../lib/facetFilters';
import { computeListState, type ListEntry, type ListLabels, type SortOrder } from '../lib/listPattern';

const root = document.querySelector<HTMLElement>('[data-list]');
const toolbar = document.querySelector<HTMLElement>('[data-list-filters]');
const grid = document.querySelector<HTMLElement>('[data-list-grid]');

if (root && toolbar && grid) {
  const featuredBox = document.querySelector<HTMLElement>('[data-list-featured]');
  const metaBox = document.querySelector<HTMLElement>('[data-list-meta]');
  const emptyBox = document.querySelector<HTMLElement>('[data-list-empty]');
  const emptyText = document.querySelector<HTMLElement>('[data-list-empty-text]');
  const resetButton = document.querySelector<HTMLButtonElement>('[data-list-reset]');

  const cards = Array.from(grid.querySelectorAll<HTMLElement>('[data-entry-id]'));
  const buttons = Array.from(toolbar.querySelectorAll<HTMLButtonElement>('button[data-facet-key]'));
  const selects = Array.from(toolbar.querySelectorAll<HTMLSelectElement>('select[data-facet-key]'));
  const sortSelect = toolbar.querySelector<HTMLSelectElement>('select[data-sort]');

  const [singular, plural] = (root.dataset.listNouns ?? 'élément|éléments').split('|');
  const labels: ListLabels = {
    singular,
    plural,
    // L'ordre d'affichage des facettes dans la ligne de méta suit l'ordre des
    // contrôles dans la barre — pilules d'abord, puis dropdowns.
    facets: [...buttons, ...selects]
      .map((el) => ({ key: el.dataset.facetKey ?? '', label: el.dataset.facetLabel ?? '' }))
      .filter((facet, index, all) =>
        facet.key !== '' && all.findIndex((other) => other.key === facet.key) === index,
      ),
  };

  const entries: ListEntry[] = cards.map((card) => {
    let facets: Record<string, string[]> = {};
    try {
      facets = JSON.parse(card.dataset.facet ?? '{}');
    } catch {
      facets = {}; // data-facet malformé : la carte se comporte comme sans facette
    }
    return {
      id: card.dataset.entryId ?? '',
      facets,
      featured: card.dataset.featured !== undefined,
      date: Number(card.dataset.date ?? 0),
      minutes: Number(card.dataset.minutes ?? 0),
    };
  });

  const selected: FacetSelection = {};
  for (const facet of labels.facets) selected[facet.key] = ALL;

  const apply = () => {
    const order = (sortSelect?.value ?? 'none') as SortOrder;
    const state = computeListState(entries, selected, order, labels);

    const position = new Map(state.visibleIds.map((id, index) => [id, index]));
    for (const card of cards) {
      const id = card.dataset.entryId ?? '';
      card.hidden = !position.has(id);
      // Le tri réordonne réellement le DOM : `order` CSS suffirait au visuel
      // mais laisserait l'ordre de tabulation et de lecture d'écran inchangé.
      if (position.has(id)) card.style.order = String(position.get(id));
    }

    if (featuredBox) {
      featuredBox.hidden = state.featuredId === null;
      for (const slot of featuredBox.querySelectorAll<HTMLElement>('[data-entry-id]')) {
        slot.hidden = slot.dataset.entryId !== state.featuredId;
      }
    }

    if (metaBox) metaBox.textContent = state.meta;
    if (emptyBox) emptyBox.hidden = state.empty === null;
    if (emptyText && state.empty !== null) emptyText.textContent = state.empty;

    for (const button of buttons) {
      const key = button.dataset.facetKey ?? '';
      button.setAttribute(
        'aria-pressed',
        String((button.dataset.facetValue ?? ALL) === selected[key]),
      );
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

  sortSelect?.addEventListener('change', apply);

  // R6 : le bouton d'état vide ramène la liste complète — toutes les
  // sélections ET tous les contrôles, pas seulement l'état interne.
  resetButton?.addEventListener('click', () => {
    for (const key of Object.keys(selected)) selected[key] = ALL;
    for (const select of selects) select.value = ALL;
    if (sortSelect) sortSelect.value = 'none';
    apply();
    toolbar.scrollIntoView({ block: 'nearest' });
  });

  toolbar.hidden = false;
  apply();
}
```

- [ ] **Step 2: Déclarer les nouveaux `data-*` masquables dans `global.css`**

Ajouter aux sélecteurs de la règle `[hidden] { display: none !important }` existante
(`src/styles/global.css:369-377`) :

```css
[data-list-filters][hidden],
[data-list-featured][hidden],
[data-list-empty][hidden],
[data-entry-id][hidden],
```

La règle et son commentaire expliquent déjà pourquoi le `!important` est nécessaire (même
spécificité que l'utilitaire `flex` du preflight Tailwind) — ne pas le retirer.

- [ ] **Step 3: Donner à `ProjectCard` le contrat de carte**

Sur le `<a>` de `ProjectCard.astro`, remplacer `data-project-card` / `data-status` / `data-stack`
par le contrat commun, et ajouter la variante « à la une » :

```astro
---
import { projectFacets } from '../lib/projectFilters';

interface Props {
  project: CollectionEntry<'projects'>;
  /** Variante « à la une » : carte large, vignette en 16/7. */
  featured?: boolean;
  /** Masquée côté serveur — la même entrée est déjà rendue dans le bloc à la une. */
  hidden?: boolean;
}
const { project, featured = false, hidden = false } = Astro.props;
// …
const facets = JSON.stringify(projectFacets({ status, stack }));
---

<a
  href={`/projets/${project.id}/`}
  class:list={[
    'group flex flex-col gap-3 rounded-card border border-line bg-surface p-4 transition-colors hover:border-accent/50',
    featured && 'sm:col-span-2 lg:col-span-3',
  ]}
  data-entry-id={project.id}
  data-facet={facets}
  data-date={project.data.startDate?.getTime() ?? 0}
  data-minutes={0}
  data-featured={project.data.featured ? '' : undefined}
  hidden={hidden}
>
  <Thumbnail cover={cover} coverAlt={coverAlt} title={title} derivedFrom={status} size={featured ? 'featured' : 'card'} />
  …
```

- [ ] **Step 4: Réécrire la section de liste de `/projets`**

Les **six éléments dans l'ordre exact de R3**. `stack` en pilules, `status` en dropdown (décision
I1 ; c'est la permutation exacte de l'existant) :

```astro
<section class="mx-auto max-w-5xl px-4 pb-20 sm:px-6" data-list data-list-nouns={NOUNS.join('|')}>
  {/* 1 · pilules de filtre + 2 · dropdown — `hidden` côté serveur (contrainte n°5) */}
  <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
       data-list-filters hidden>
    <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrer par techno">
      <button type="button" data-facet-key="stack" data-facet-label="techno" data-facet-value={ALL}
              aria-pressed="true"
              class="rounded-pill border border-line px-3 py-1 font-mono text-xs text-muted transition-colors hover:border-accent hover:text-accent aria-pressed:border-accent aria-pressed:text-accent">
        toutes
      </button>
      {stacks.map((tech) => (
        <button type="button" data-facet-key="stack" data-facet-label="techno" data-facet-value={tech}
                aria-pressed="false"
                class="rounded-pill border border-line px-3 py-1 font-mono text-xs text-muted transition-colors hover:border-accent hover:text-accent aria-pressed:border-accent aria-pressed:text-accent">
          {tech}
        </button>
      ))}
    </div>

    <label class="flex items-center gap-2 font-mono text-xs text-muted">
      statut
      <select data-facet-key="status" data-facet-label="statut"
              class="rounded-pill border border-line bg-surface px-2 py-1 font-mono text-xs text-body">
        <option value={ALL}>tous</option>
        {PROJECT_STATUSES.map((status) => <option value={status}>{status}</option>)}
      </select>
    </label>
  </div>

  {/* 3 · ligne de méta — donnée machine, donc mono (contrainte n°7).
       Le repli rendu par le serveur s'accorde comme la logique l'accorde, et
       tire son vocabulaire de la MÊME constante que `data-list-nouns` : deux
       sources sépareraient un jour « 1 projets » du compte réel. */}
  <p class="mb-6 font-mono text-xs text-dim" data-list-meta>
    {projects.length} {projects.length === 1 ? NOUNS[0] : NOUNS[1]}
  </p>

  {/* 4 · entrée à la une — UNE seule carte, désignée côté serveur (décision I3) */}
  <div class="mb-6" data-list-featured>
    {featured && <ProjectCard project={featured} featured />}
  </div>

  {/* 5 · grille — contient TOUTES les entrées ; celle qui est déjà à la une est
       rendue `hidden` PAR LE SERVEUR, pour que sans JavaScript la page montre
       chaque entrée exactement une fois (contrainte globale n°5). */}
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-list-grid>
    {projects.map((project) => (
      <ProjectCard project={project} hidden={project.id === featured?.id} />
    ))}
  </div>

  {/* 6 · état vide */}
  <div class="mt-8 flex flex-col items-start gap-3" data-list-empty hidden>
    <p class="text-sm text-muted" data-list-empty-text></p>
    <button type="button" data-list-reset
            class="rounded-pill border border-line px-3 py-1 font-mono text-xs text-muted transition-colors hover:border-accent hover:text-accent">
      voir tous les projets
    </button>
  </div>
</section>

<script>
  import '../../scripts/list-pattern.ts';
</script>
```

Le frontmatter de la page appelle la **même** règle de dérivation que le script :

```ts
import { pickFeaturedEntry } from '../../lib/listPattern';

// décision I3 : l'entrée à la une est désignée CÔTÉ SERVEUR, pour que la carte
// « à la une » et sa copie masquée dans la grille pointent exactement vers la
// même entrée que computeListState() désignerait sans filtre.
const featured = pickFeaturedEntry(projects.map((p) => ({ ...p, featured: p.data.featured })));

// Source unique du vocabulaire : sert `data-list-nouns` ET le repli SSR de la
// ligne de méta (accord singulier/pluriel), pour que les deux ne divergent
// jamais.
const NOUNS = ['projet', 'projets'] as const;
```

Chaque page de la Phase C déclare sa propre constante `NOUNS` sur le même modèle
(`['article', 'articles']`, `['prompt', 'prompts']`, `['skill', 'skills']`).

Pourquoi une seule carte et un `hidden` serveur, et pas le rendu de toutes les cartes featured :
l'entrée à la une ne dépend **pas** de la sélection — seulement de « une facette est-elle active ».
Le serveur peut donc la désigner, et c'est la seule forme qui tient la contrainte n°5 : **sans
JavaScript**, la page montre 1 entrée à la une et N-1 en grille, soit chaque entrée exactement une
fois. Rendre toutes les cartes featured aurait affiché `/projets` avec 2 entrées « à la une » et
chaque projet deux fois, en contradiction directe avec R5.

`ProjectCard` reçoit donc aussi une prop `hidden?: boolean`, posée sur son `<a>` — l'attribut
`hidden`, jamais une classe (contrainte n°5).

- [ ] **Step 5: Supprimer le script remplacé**

```bash
git rm src/scripts/project-filters.ts
```

Vérifier qu'il ne reste aucun import : `grep -rn 'project-filters' src/` doit être vide.
`src/lib/projectFilters.ts` **reste** (décision I5).

- [ ] **Step 6: Mesurer R3, R4, R5, R6, R7 dans la page**

```bash
npm run build && npx astro preview --port 4321 &
```

Sur `http://localhost:4321/projets/`, en console — **six mesures binaires** :

```js
// R3 — les 6 éléments, dans l'ordre
const order = ['[data-list-filters]','[data-list-filters] select','[data-list-meta]',
               '[data-list-featured]','[data-list-grid]','[data-list-empty]']
  .map(s => document.querySelector(s));
console.log('R3', order.every(Boolean), order.every((el,i,a) => i===0 ||
  (a[i-1].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) > 0));

// R4 — le compte annoncé égale les cartes réellement visibles
const visible = () => [...document.querySelectorAll('[data-entry-id]')].filter(c => !c.hidden &&
  !c.closest('[data-list-featured]')?.hidden).length;
const announced = () => parseInt(document.querySelector('[data-list-meta]').textContent, 10);
console.log('R4 sans filtre', announced() === visible(), announced(), visible());

// R5 — 1 à la une sans filtre, 0 dès qu'une facette est active
const featuredCount = () => document.querySelector('[data-list-featured]').hidden ? 0 :
  [...document.querySelectorAll('[data-list-featured] [data-entry-id]')].filter(c => !c.hidden).length;
console.log('R5 sans filtre', featuredCount() === 1);
document.querySelector('[data-facet-key="stack"][data-facet-value="Astro"]').click();
console.log('R5 avec filtre', featuredCount() === 0);
console.log('R4 avec filtre', announced() === visible());

// R7 — le dropdown de statut change le sous-ensemble
const sel = document.querySelector('select[data-facet-key="status"]');
sel.value = 'archivé'; sel.dispatchEvent(new Event('change'));
console.log('R7', announced(), visible());

// R6 — état vide contextualisé + bouton qui ramène le total
const empty = document.querySelector('[data-list-empty]');
console.log('R6 message', !empty.hidden,
  document.querySelector('[data-list-empty-text]').textContent);
document.querySelector('[data-list-reset]').click();
console.log('R6 reset', announced() === 2); // total de la collection projects
```

Attendu : `R3 true true` · `R4` vrai dans les trois cas (sans filtre, un filtre, deux facettes) ·
`R5` vrai dans les deux cas · `R6` un message nommant `techno Astro` et `statut archivé`, puis le
compte revenu à **2** · `R7` un sous-ensemble qui change.

- [ ] **Step 7: R10, tests et check**

```bash
git diff milestone-plan-6 -- src/content.config.ts   # doit être VIDE
npm test && npm run check
```

- [ ] **Step 8: Commit**

```bash
git add -A src/scripts src/pages/projets src/components/ProjectCard.astro src/styles/global.css
git commit -m "feat(p7): /projets rend les 6 elements du patron (R3-R7, R10)"
```

---

# Phase C — Répliquer sur blog, prompts, skills

> **Règle de la spec §4, Phase C :** ne pas réinventer. Si la réplication demande de modifier le
> moteur écrit en B, c'est que B n'était pas assez général — **le corriger en B**, pas le contourner
> en C. Une correction apportée à `listPattern.ts` ou à `list-pattern.ts` pendant la Phase C est
> légitime ; une branche `if (page === 'blog')` ne l'est pas.

### Task C1 : `/blog` — le patron, plus le dropdown de tri

**Couvre :** R9 (volet blog), R7 (volet tri).

**Files:**
- Modify: `src/pages/blog/index.astro`
- Modify: `src/components/ArticleCard.astro`

**Interfaces:**
- Consumes: tout le contrat DOM de B3 ; `SortOrder` de B1 ; `<Thumbnail>` de B2.
- Produces: rien de nouveau.

- [ ] **Step 1: Donner à `ArticleCard` le contrat de carte et la vignette**

Remplacer `data-facet-card` par `data-entry-id` / `data-date` / `data-minutes` / `data-featured`,
et le bloc `{cover && <Image …>}` par `<Thumbnail cover={cover} coverAlt={coverAlt} title={title}
derivedFrom={category} size={featured ? 'featured' : 'card'} />`. Ajouter la prop
`featured?: boolean` (même forme qu'en B3). `data-date={pubDate.getTime()}` et
`data-minutes={readingMinutes}` alimentent le tri.

La puce de catégorie garde `data-facet-chip` : `src/scripts/blog-filters.ts` la relaie vers le
bouton de la barre et n'est **pas** modifié (il cible `[data-facet-filters]`) — **le renommer en
`[data-list-filters]` est la seule ligne à changer dans ce fichier**.

- [ ] **Step 2: Réécrire la section de liste de `/blog`**

Six éléments, même ordre, mêmes attributs qu'en B3 — **y compris** :
- `pickFeaturedEntry()` appelée dans le frontmatter, **une seule** carte dans `data-list-featured`,
  et la même entrée rendue `hidden` par le serveur dans la grille (décision I3) ;
- une constante `const NOUNS = ['article', 'articles'] as const;` **source unique** de
  `data-list-nouns` et du repli SSR accordé de la ligne de méta (P-13) — jamais deux littéraux.

Facette primaire : `category` (I1). Dropdowns, dans l'ordre : **tri** (celui de R7), puis `tag`
(conservé, I2).

> **Le compteur par tag se conserve aussi.** `/blog` affichait `{tag.label} <span>{tag.count}</span>`
> sur ses pilules de tag depuis le Plan 5. Un `<option>` n'accepte pas de balisage, mais il accepte
> du texte : écrire `{tag.label} ({tag.count})`. La décision ratifiée au gate était de **conserver**
> la facette `tag` en la déplaçant, pas d'en retirer l'information.

> **`/blog` est la seule page où le tri s'exerce, donc la seule qui teste le correctif P-12.**
> L'entrée à la une doit rester **la même carte** quel que soit l'ordre choisi — elle se dérive de
> l'ordre canonique, pas du tri. Changer de tri réordonne la grille et **rien d'autre**. Mesurer ce
> point explicitement : c'est le scénario qui faisait disparaître un article avant `26757a9`.

```astro
<label class="flex items-center gap-2 font-mono text-xs text-muted">
  tri
  <select data-sort class="rounded-pill border border-line bg-surface px-2 py-1 font-mono text-xs text-body">
    <option value="none">par défaut</option>
    <option value="recent">plus récents</option>
    <option value="oldest">plus anciens</option>
    <option value="shortest">plus courts</option>
    <option value="longest">plus longs</option>
  </select>
</label>
```

`data-list-nouns="article|articles"`. Le lien « tous les tags → » est conservé, sous l'état vide.

- [ ] **Step 3: Mesurer**

Rejouer **les six mesures de B3/Step 6** sur `http://localhost:4321/blog/` (total attendu : **5**
articles publiés), plus la mesure propre au tri :

```js
const first = () => document.querySelector('[data-list-grid] [data-entry-id]:not([hidden])').textContent.trim().slice(0,40);
const sort = document.querySelector('select[data-sort]');
for (const v of ['recent','oldest','shortest','longest']) {
  sort.value = v; sort.dispatchEvent(new Event('change')); console.log(v, first());
}
```

Attendu : **quatre premiers titres**, dont `oldest` est l'inverse de `recent`, et `shortest` /
`longest` diffèrent l'un de l'autre. R5 se mesure ici sur la règle de dérivation : aucun article
n'ayant `featured: true`, l'entrée à la une doit être **le plus récent** (ordre canonique de
`getPublishedPosts()`).

- [ ] **Step 4: Tests, check, commit**

```bash
npm test && npm run check
git add src/pages/blog src/components/ArticleCard.astro src/scripts/blog-filters.ts
git commit -m "feat(p7): /blog rend le patron et son tri (R9, R7)"
```

---

### Task C2 : `/prompts` et `/skills`

**Couvre :** R9 (volet prompts et skills).

**Files:**
- Modify: `src/pages/prompts/index.astro`, `src/pages/skills/index.astro`
- Modify: `src/components/PromptCard.astro`, `src/components/SkillCard.astro`

**Interfaces:**
- Consumes: le contrat DOM de B3 ; `<Thumbnail>` de B2.
- Produces: rien de nouveau.

- [ ] **Step 1: Les deux cartes**

Même transformation qu'en C1 : `data-entry-id`, `data-facet`, `data-date={0}`, `data-minutes={0}`,
prop `featured?: boolean`, et `<Thumbnail derivedFrom={format} title={title} />` (prompts) /
`<Thumbnail derivedFrom={type} title={title} />` (skills) — jamais de `cover` : ces deux collections n'ont pas le
champ, et R10 interdit de l'ajouter.

- [ ] **Step 2: Les deux pages**

Six éléments, même ordre, **y compris** `pickFeaturedEntry()` dans le frontmatter, une seule carte
dans `data-list-featured`, la même entrée `hidden` par le serveur dans la grille (décision I3), et
une constante `NOUNS` par page — `['prompt', 'prompts']` et `['skill', 'skills']` — source unique de
`data-list-nouns` et du repli SSR accordé (P-13). Facettes (I1, I2) :

| Page | Pilules | Dropdown 1 (R7) | Dropdown 2 |
|---|---|---|---|
| `/prompts` | `tool` — libellé « outil » | `format` — libellé « format » | `tag` — libellé « tag » |
| `/skills` | `tag` — libellé « tag » | `type` — libellé « type » | — |

`data-list-nouns="prompt|prompts"` et `data-list-nouns="skill|skills"`. Aucun `data-sort` : le tri
est une facette de `/blog` seulement (R7).

- [ ] **Step 3: Mesurer les six mesures de B3/Step 6 sur les deux pages**

Totaux attendus : **3** prompts, **2** skills. Sur `/prompts`, la combinaison
`outil = Claude` + `format = guide` doit donner **0** et déclencher l'état vide, dont le message
nomme les deux facettes.

**Limite connue et mesurée, à ne pas maquiller :** sur `/skills`, `type` n'a qu'une valeur dans le
contenu (`claude-code` sur les 2 skills), donc la sélectionner laisse 2 → 2. R7 demande que « chaque
valeur sélectionnée change l'ordre ou le sous-ensemble » : la mesure porte ici sur `tag`, où
`anti-drift` donne 1/2, et le comportement de `type` est rapporté tel quel. **Ce point est arbitré
au gate de validation du plan** ; la décision retenue est reportée ici avant l'exécution de C2.

- [ ] **Step 4: Supprimer le dernier script de glue remplacé**

`/prompts` et `/skills` étaient les deux dernières pages à importer
`src/scripts/facet-filters.ts` ; elles importent désormais `list-pattern.ts`. C'est **ici** — et
pas avant — qu'il se supprime : le retirer en T-B3 aurait cassé le build de `/blog`, `/prompts` et
`/skills`, qui l'importaient encore.

```bash
git rm src/scripts/facet-filters.ts
grep -rn 'facet-filters' src/     # doit être VIDE
```

`src/lib/facetFilters.ts` **reste** : c'est le prédicat, consommé par `listPattern.ts`, et sa suite
est l'une des 12 que R11 exige de garder vertes. Seul le script de glue disparaît.

- [ ] **Step 5: Tests, check, commit**

```bash
npm test && npm run check
git add -A src/pages/prompts src/pages/skills src/components/PromptCard.astro src/components/SkillCard.astro src/scripts
git commit -m "feat(p7): /prompts et /skills rendent le patron (R9)"
```

---

# Phase D — 375 px et deux thèmes

### Task D1 : parcours 4 listes × 2 thèmes × 3 largeurs

**Couvre :** R12, plus V2 et V6 du contrat sur les structures nouvelles.

**Files:**
- Modify: les fichiers que les défauts mesurés désignent (aucun a priori).

- [ ] **Step 1: Mesurer `scrollWidth` sur les 4 listes × 2 thèmes × 375 px**

Pour chaque thème : `localStorage.theme = 'dark'` (puis `'light'`), **recharger** — contrainte
globale n°4 — puis sur chacune des 4 listes, à 375 px de large :

```js
console.log(location.pathname, document.documentElement.scrollWidth <= innerWidth,
            document.documentElement.scrollWidth, innerWidth);
```

Attendu : `true` **8 fois sur 8**. Rejouer à 768 et 1180 px (méthodologie §4.2).

- [ ] **Step 2: Vérifier qu'aucun contrôle ne devient inatteignable à 375 px**

Sur chaque liste, à 375 px : chaque pilule, chaque `<select>`, le bouton de reset doivent avoir un
rectangle non nul et être dans le viewport après scroll :

```js
[...document.querySelectorAll('[data-list-filters] button, [data-list-filters] select, [data-list-reset]')]
  .map(el => { const r = el.getBoundingClientRect();
    return [el.textContent.trim().slice(0,14), r.width > 0 && r.height > 0, Math.round(r.width)]; });
```

Attendu : `true` partout, aucune largeur nulle.

- [ ] **Step 3: Audit V2 — hiérarchie des surfaces, EN SOMBRE**

`card` = `surface` = `#FFFFFF` en clair : un saut de niveau y est littéralement invisible
(spec §6.4). En **sombre** uniquement, vérifier qu'aucun `rail` n'est posé sur `surface` sans un
niveau intermédiaire, et qu'aucun `card` n'est posé directement sur `bg`. La vignette dérivée
(`bg-rail`) est posée **dans** une carte `bg-surface` : c'est `surface` → `rail`, **un saut de
niveau** (`card` manque au milieu). Le trancher explicitement : soit la carte de liste passe en
`.card-inner` (niveau `card`), soit la vignette monte en `chip`. **Mesurer avant de choisir** —
et si ce choix change ce que l'utilisateur voit au-delà de ce que la spec prescrit, c'est une
déviation à consigner **avant** de l'exécuter.

- [ ] **Step 4: Gate V6 repo-wide — rayons**

```bash
grep -rnoE 'rounded-\[[^]]+\]|border-radius: *[0-9]+px' src/ | grep -v 'var(--radius'
```

Attendu : **aucune ligne**. Les cinq utilitaires nommés sont les seuls chemins autorisés.

- [ ] **Step 5: Tests, check, commit**

```bash
npm test && npm run check
git commit -am "fix(p7): passe 375px et deux themes sur les 4 listes (R12, V2, V6)"
```

---

# Phase Z — Verification

### Task Z1 : l'audit canonique

- [ ] **Step 1:** `/anti-drift-planning:verify 7`

Non contournable, non résumable de mémoire. C'est le **seul** chemin vers le script de release et le
tag `milestone-plan-7` = `v1.2.0`. Il échoue par construction si une entrée de
`docs/anti-drift/handoffs/plan-7-deviations.md` est encore `pending-user`.

---

## Self-Review de ce plan

**1. Couverture de la spec §3.** R1 → A1 · R2 → A1 · R3 → B3 · R4 → B1, B3 · R5 → B1, B3 ·
R6 → B1, B3 · R7 → B1, B3 (statut), C1 (tri), C2 (format, type) · R8 → B2, C1, C2 ·
R9 → C1, C2 · R10 → B2/Step 3, B3/Step 7 · R11 → B1 · R12 → D1. **Aucun R orphelin.**
Critères du contrat : V2 → D1/Step 3 · V6 → D1/Step 4 · V5 → contrainte globale n°7 ·
V4 → contrainte n°8. V1, V3, V7, V8 sont acquis du Plan 6 et re-vérifiés en Phase Z.

**2. Placeholders.** Chaque étape de code porte le code réel. Aucun « TBD », aucun « similaire à la
tâche N » — le contrat DOM est reproduit en table dans B3 et référencé, pas paraphrasé.

**3. Cohérence des types.** `computeListState` / `isAnyFacetActive` / `pickFeaturedEntry` /
`ListEntry` / `ListLabels` / `ListState` / `SortOrder` sont définis une fois en B1 et utilisés sous
ces noms exacts en B3, C1, C2. `pickFeaturedEntry` est appelée **des deux côtés** — par
`computeListState` côté client, par le frontmatter des 4 pages côté serveur — pour que la même
entrée soit désignée partout. `projectFacets` (B1/Step 6) est consommé par `ProjectCard` (B3/Step 3). `<Thumbnail>` (B2) a la
même signature dans ses quatre appels.

**3bis. Défauts corrigés au scan pré-vol (avant T-A1).** P-02 : aucune tâche ne supprimait
`facet-filters.ts` → suppression placée en C2/Step 4, après la dernière page qui l'importe. P-03 :
A1/Step 4 faisait un `git stash` + `git checkout <ref> -- .` destructif → worktree temporaire.
P-04 : le bloc « à la une » rendait toutes les cartes featured, ce qui affichait sans JavaScript
2 entrées à la une sur `/projets` et chaque entrée deux fois, en contradiction avec R5 et la
contrainte n°5 → `pickFeaturedEntry()` partagée serveur/client, une seule carte, double masqué par
le serveur. P-05 : un commentaire de test décrivait l'inverse de la sélection testée.

**4. Volume.** 8 tâches, 4 phases. Le Plan 6 en a demandé 9 pour un périmètre qui ne changeait
aucune structure ; celui-ci en change quatre mais les résout **une fois** puis les réplique. Le
diff produit (1 lib + 1 suite + 1 script + 1 composant + 4 pages + 4 cartes + 2 blocs CSS) est du
même ordre que le texte de ce plan.

**5. Ce que ce plan ne fait PAS**, et c'est voulu : aucune fiche de détail (→ P8), aucun changement
de l'accueil (→ P9), aucun `/tags`, `/transparence-ia`, `/404` ni écran de recherche (→ P9), aucune
modification du modèle de contenu (R10), aucun `.card-inner` ni `.panel` posé ailleurs que là où le
patron le demande — leur généralisation est le travail de P9 (panneaux de section, §5.3).
