// src/lib/listPages.test.ts
//
// Gardes statiques des quatre listes filtrables (plan 11, T3) — lues dans le
// source des pages et des cartes, sans build :
// - R6 : la ligne de méta (`data-list-meta`, le nœud dont
//   src/scripts/list-pattern.ts réécrit le texte) est une région live polie et
//   atomique — un lecteur d'écran annonce le nombre de résultats à chaque filtre ;
// - R7 : entrée à la une, grille et état vide dans UN `.card` ; chaque carte
//   d'entrée est un `.card-inner` (V2 — pas de niveau `card` posé sur `bg`) ;
// - R8 : ni la ligne de méta ni le monogramme dérivé ne sont en `dim`
//   (4,19:1 sur `bg` en clair, mesuré à la base) — ils passent en `muted`.
// La mesure rendue (contraste, V2 au calcul) reste celle de T6.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve(__dirname, '..');
const LISTS = ['blog', 'projets', 'prompts', 'skills'] as const;
// /blog n'a plus d'entrée à la une ni de cartes (plan 12, T5 : rail + lignes
// compactes) — ses gardes sont dans le bloc « blog list (plan 12, T5) ».
const FEATURED_LISTS = ['projets', 'prompts', 'skills'] as const;
const CARDS = ['ProjectCard', 'PromptCard', 'SkillCard'] as const;

const read = (path: string) => readFileSync(resolve(SRC, path), 'utf8');
const listPage = (list: string) => read(`pages/${list}/index.astro`);

/** Balises ouvrantes (attributs compris) portant l'attribut `attr`. */
function openingTags(source: string, attr: string): string[] {
  const re = new RegExp(`<[a-zA-Z][\\w-]*\\b[^>]*\\s${attr}(?=[\\s=>/])[^>]*>`, 'g');
  return source.match(re) ?? [];
}

/** Classes statiques d'une balise (`class="…"` ou chaînes de `class:list`). */
function classesOf(tag: string): string[] {
  const plain = tag.match(/\bclass="([^"]*)"/)?.[1] ?? '';
  const list = [...(tag.match(/class:list=\{\[([\s\S]*?)\]\}/)?.[1] ?? '').matchAll(/'([^']*)'/g)]
    .map((m) => m[1])
    .join(' ');
  return `${plain} ${list}`.split(/\s+/).filter(Boolean);
}

/** Position de la balise ouvrante portant `attr` (ou -1). */
const indexOfAttr = (source: string, attr: string) =>
  source.search(new RegExp(`\\s${attr}(?=[\\s=>/])`));

describe('list pages (plan 11, T3)', () => {
  it('marks the meta line of each filterable list as a polite, atomic live region', () => {
    for (const list of LISTS) {
      const metas = openingTags(listPage(list), 'data-list-meta');
      expect(metas, `${list}: une seule ligne de méta`).toHaveLength(1);
      expect(metas[0], `${list}: aria-live`).toMatch(/\saria-live="polite"/);
      expect(metas[0], `${list}: aria-atomic`).toMatch(/\saria-atomic="true"/);
    }
  });

  it('draws the meta line in muted, never dim', () => {
    for (const list of LISTS) {
      const [meta] = openingTags(listPage(list), 'data-list-meta');
      const classes = classesOf(meta);
      expect(classes, list).toContain('text-muted');
      expect(classes, list).not.toContain('text-dim');
    }
  });

  it('frames featured, grid and empty state in one .card on each list', () => {
    for (const list of FEATURED_LISTS) {
      const source = listPage(list);
      const frames = openingTags(source, 'data-list-frame');
      expect(frames, `${list}: un seul cadre`).toHaveLength(1);
      expect(classesOf(frames[0]), list).toContain('card');

      // Le cadre s'ouvre avant les trois blocs et se ferme après l'état vide :
      // on vérifie l'ordre dans le source, puis que la balise fermante du
      // cadre suit bien l'état vide (le cadre est le seul `.card` de la page).
      const frameAt = indexOfAttr(source, 'data-list-frame');
      const featuredAt = indexOfAttr(source, 'data-list-featured');
      const gridAt = indexOfAttr(source, 'data-list-grid');
      const emptyAt = indexOfAttr(source, 'data-list-empty');
      expect(frameAt, list).toBeGreaterThan(-1);
      expect(featuredAt, list).toBeGreaterThan(frameAt);
      expect(gridAt, list).toBeGreaterThan(featuredAt);
      expect(emptyAt, list).toBeGreaterThan(gridAt);
      const cards = openingTags(source, 'class').filter((tag) => classesOf(tag).includes('card'));
      expect(cards, `${list}: un seul .card`).toHaveLength(1);
    }
  });

  // F2 (vérification 1) : une grille vide reste un élément flex du cadre et
  // prend une place de `gap-6` — l'état vide n'est alors plus centré dans le
  // cadre. Le script masque la grille quand aucune entrée n'y est visible ; le
  // serveur ne la masque jamais (sans JS, rendu inchangé).
  it('hides an empty grid from the frame, only from the script', () => {
    const script = read('scripts/list-pattern.ts');
    expect(script).toMatch(/\bgrid\.hidden\s*=\s*state\.visibleIds\.length\s*===\s*0\b/);

    const css = read('styles/global.css');
    expect(css).toMatch(/\[data-list-grid\]\[hidden\]\s*[,{]/);

    for (const list of LISTS) {
      const [grid] = openingTags(listPage(list), 'data-list-grid');
      expect(grid, `${list}: grille`).toBeTruthy();
      expect(grid, `${list}: grille jamais masquée par le serveur`).not.toMatch(/\shidden(?=[\s=>/])/);
    }
  });

  it('draws every list entry card as a .card-inner, not on surface', () => {
    for (const card of CARDS) {
      const [root] = openingTags(read(`components/${card}.astro`), 'data-entry-id');
      expect(root, `${card}: racine data-entry-id`).toBeTruthy();
      const classes = classesOf(root);
      expect(classes, card).toContain('card-inner');
      for (const gone of ['bg-surface', 'rounded-card', 'border-line']) {
        expect(classes, card).not.toContain(gone);
      }
    }
  });

  it('draws the derived thumbnail monogram in muted, never dim', () => {
    const source = read('components/Thumbnail.astro');
    const derived = source.slice(indexOfAttr(source, 'data-thumb-derived'));
    const monogram = derived.match(/<span class=\{`([^`]*)`\}>\{monogram\}<\/span>/);
    expect(monogram, 'span du monogramme').toBeTruthy();
    expect(monogram![1].split(/\s+/)).toContain('text-muted');
    expect(monogram![1]).not.toMatch(/\btext-dim\b/);
  });
});

// Plan 12, T5 (R11, D73–D75) : /blog = un seul `.card` qui contient le rail
// (`BlogRail`, marqué `data-rail`) puis la colonne principale — barre d'outils,
// lignes, état vide. Pas de bloc à la une ; les lignes ne sont pas des
// `.card-inner` et ne peignent aucun fond (elles reposent sur `surface`).
describe('blog list (plan 12, T5)', () => {
  const page = () => listPage('blog');

  it('frames the rail, the rows and the empty state in one .card, without featured block', () => {
    const source = page();
    const frames = openingTags(source, 'data-list-frame');
    expect(frames).toHaveLength(1);
    expect(classesOf(frames[0])).toContain('card');
    const cards = openingTags(source, 'class').filter((tag) => classesOf(tag).includes('card'));
    expect(cards, 'un seul .card').toHaveLength(1);

    const frameAt = indexOfAttr(source, 'data-list-frame');
    const railAt = source.search(/<BlogRail\b/);
    const gridAt = indexOfAttr(source, 'data-list-grid');
    const emptyAt = indexOfAttr(source, 'data-list-empty');
    expect(railAt).toBeGreaterThan(frameAt);
    expect(gridAt).toBeGreaterThan(railAt);
    expect(emptyAt).toBeGreaterThan(gridAt);

    expect(indexOfAttr(source, 'data-list-featured'), 'aucun bloc à la une').toBe(-1);
    expect(source, 'plus de sélecteur de tag').not.toMatch(/<select\b/);
    expect(source, 'plus de relais de puces').not.toMatch(/blog-filters/);
    expect(source).toMatch(/<ArticleRow\b/);
  });

  it('marks the rail with data-rail and hides its category group server-side', () => {
    const rail = read('components/blog/BlogRail.astro');
    const [root] = openingTags(rail, 'data-rail');
    expect(root, 'racine data-rail').toBeTruthy();
    expect(classesOf(root)).toContain('bg-rail');
    const [group] = openingTags(rail, 'data-list-filters');
    expect(group, 'groupe de catégories').toBeTruthy();
    expect(group).toMatch(/\shidden(?=[\s=>/])/);
    expect(rail).toMatch(/data-facet-all-label=/);
  });

  it('draws blog rows as plain rows, never .card-inner nor a background', () => {
    const [root] = openingTags(read('components/blog/ArticleRow.astro'), 'data-entry-id');
    expect(root, 'racine data-entry-id').toBeTruthy();
    const classes = classesOf(root);
    expect(classes).not.toContain('card-inner');
    expect(classes.filter((cls) => /^(hover:)?bg-/.test(cls)), 'aucun fond').toEqual([]);
    expect(classes).toContain('border-line2');
  });
});
