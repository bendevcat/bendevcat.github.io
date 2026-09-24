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
// Plan 14 (D92) : /projets quitte le cadre du plan 11 — ses gardes sont dans
// le bloc « grid lists (plan 14) » ; /prompts et /skills l'y rejoignent en T5.
const FEATURED_LISTS = ['prompts', 'skills'] as const;
const CARDS = ['PromptCard', 'SkillCard'] as const;
/** Listes en grille de `.card` posées sur le fond de page (plan 14, D92). */
const GRID_LISTS = ['projets'] as const;
/** Carte d'entrée de chaque liste en grille. */
const GRID_CARDS: Record<(typeof GRID_LISTS)[number], string> = { projets: 'ProjectCard' };

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

// Plan 14 (D92, D93 ; inventaire §0, §3) : /projets — puis /prompts et
// /skills en T5 — quitte le cadre du plan 11. Chaque entrée est un `.card`
// posé sur le fond de page ; au-dessus, une barre de filtres `hidden` côté
// serveur (contrôle segmenté à gauche, menu de facette à droite) ; l'état
// vide est le composant partagé `ListEmpty`. Plus aucun `<select>`.
describe('grid lists (plan 14)', () => {
  it('drops the outer frame and the <select>, and uses the list header', () => {
    for (const list of GRID_LISTS) {
      const source = listPage(list);
      expect(openingTags(source, 'data-list-frame'), `${list}: plus de cadre`).toEqual([]);
      const cards = openingTags(source, 'class').filter((tag) => classesOf(tag).includes('card'));
      expect(cards, `${list}: aucun .card dans la page elle-même`).toEqual([]);
      expect(source, `${list}: plus de <select>`).not.toMatch(/<select\b/);
      expect(source, `${list}: en-tête de liste`).toMatch(/<ListHeader\b/);
    }
  });

  it('renders the filter bar hidden, with a segmented control and a facet dropdown', () => {
    for (const list of GRID_LISTS) {
      const source = listPage(list);
      const bars = openingTags(source, 'data-list-filters');
      expect(bars, `${list}: une barre de filtres`).toHaveLength(1);
      expect(bars[0], `${list}: barre hidden`).toMatch(/\shidden(?=[\s=>/])/);
      expect(source, `${list}: contrôle segmenté`).toMatch(/<SegmentedControl\b/);
      const dropdown = source.match(/<Dropdown\b[\s\S]*?\/>/)?.[0] ?? '';
      expect(dropdown, `${list}: menu de facette`).toMatch(/\sdata-facet-key=/);
      expect(dropdown, `${list}: libellé de facette`).toMatch(/\sdata-facet-label=/);
      expect(dropdown, `${list}: icône filtre`).toMatch(/\sicon="filter"/);
      expect(dropdown, `${list}: largeur mini 230 (D84)`).toMatch(/\sminWidth=\{230\}/);
      expect(source, `${list}: état vide partagé`).toMatch(/<ListEmpty\b/);
    }
  });

  it('keeps the meta line as a visually hidden live region', () => {
    for (const list of GRID_LISTS) {
      const [meta] = openingTags(listPage(list), 'data-list-meta');
      expect(classesOf(meta), list).toContain('sr-only');
    }
  });

  it('draws every entry card as an <article class="card">, never .card-inner', () => {
    for (const list of GRID_LISTS) {
      const card = GRID_CARDS[list];
      const [root] = openingTags(read(`components/${card}.astro`), 'data-entry-id');
      expect(root, `${card}: racine data-entry-id`).toBeTruthy();
      expect(root, `${card}: <article>`).toMatch(/^<article\b/);
      const classes = classesOf(root);
      expect(classes, card).toContain('card');
      expect(classes, card).not.toContain('card-inner');
    }
  });

  it('builds the segmented control as a group of pressed buttons with count badges', () => {
    const source = read('components/SegmentedControl.astro');
    const [track] = openingTags(source, 'data-segmented');
    expect(track, 'piste data-segmented').toBeTruthy();
    expect(track).toMatch(/\srole="group"/);
    // Rayon 999 dès 640 px ; dessous, la piste passe à la ligne en rayon 20 (D93).
    expect(classesOf(track)).toEqual(
      expect.arrayContaining(['bg-chip', 'border', 'border-line', 'rounded-card', 'sm:rounded-pill', 'sm:flex-nowrap']),
    );
    const [button] = openingTags(source, 'data-facet-value');
    expect(button, 'segment').toMatch(/^<button\b/);
    expect(button).toMatch(/\saria-pressed=/);
    expect(button).toMatch(/\sdata-facet-key=/);
    expect(button).toMatch(/\sdata-facet-label=/);
    const [badge] = openingTags(source, 'data-segment-count');
    expect(badge, 'badge de compte').toBeTruthy();
    expect(classesOf(badge)).toEqual(expect.arrayContaining(['font-mono', 'text-muted', 'rounded-pill']));
  });

  it('renders the empty state hidden, with its text node and a reset button', () => {
    const source = read('components/ListEmpty.astro');
    const [box] = openingTags(source, 'data-list-empty');
    expect(box, 'état vide').toMatch(/\shidden(?=[\s=>/])/);
    expect(classesOf(box)).toEqual(expect.arrayContaining(['border-dashed', 'border-line', 'rounded-card']));
    expect(openingTags(source, 'data-list-empty-text')).toHaveLength(1);
    const [reset] = openingTags(source, 'data-list-reset');
    expect(reset, 'bouton de remise à zéro').toMatch(/^<button\b/);
  });

  it('declares the /projets empty-sentence template and its slot prefixes', () => {
    const source = listPage('projets');
    expect(source).toMatch(/const EMPTY_TEMPLATE = "Aucun projet\{status\}\{stack\} pour l'instant\.";/);
    const [root] = openingTags(source, 'data-list');
    expect(root, 'gabarit posé sur [data-list]').toMatch(/\sdata-list-empty-template=\{EMPTY_TEMPLATE\}/);
    expect(source).toMatch(/emptyPrefix=" "/);
    expect(source).toMatch(/data-facet-empty-prefix=" en "/);
  });

  it('opens the hero buttons in a new tab, without opener', () => {
    const source = read('components/FeaturedProject.astro');
    const links = openingTags(source, 'data-hero-link');
    expect(links, 'démo + code source').toHaveLength(2);
    for (const link of links) {
      expect(link).toMatch(/\starget="_blank"/);
      expect(link).toMatch(/\srel="noopener noreferrer"/);
    }
    const [root] = openingTags(source, 'data-entry-id');
    expect(classesOf(root)).toEqual(expect.arrayContaining(['card', 'rounded-feature', 'overflow-hidden']));
  });
});
