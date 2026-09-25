// src/components/blog/BlogRail.test.ts
//
// Rail du blog, rendu par l'API Container d'Astro (plan 13, T3 ; R10, R17) :
// - variante `filter` (défaut, /blog) : groupe de boutons `[data-list-filters]`
//   rendu `hidden`, révélé par list-pattern.ts — inchangée depuis le plan 12 ;
// - variante `links` (article) : lignes « Catégories » en `<a>` visibles sans
//   JavaScript (`Tout` → `/blog/`, une catégorie → `/blog/?categorie=<valeur>`),
//   `muted`, sans état actif ; même nuage de tags ; le slot par défaut se pose
//   après les Tags ; le rail entier est ignoré par Pagefind.
import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import BlogRail from './BlogRail.astro';
import { ALL } from '../../lib/facetFilters';

const categories = [
  { value: ALL, label: 'Tout', count: 5 },
  { value: 'DevOps', label: 'DevOps', count: 2 },
  { value: 'Outils & co', label: 'Outils & co', count: 3 },
];
const tags = [
  { label: 'devops', slug: 'devops', count: 3 },
  { label: 'terminal', slug: 'terminal', count: 1 },
];

async function render(props: Record<string, unknown>, slot?: string) {
  const container = await AstroContainer.create();
  return container.renderToString(BlogRail, {
    props: { categories, tags, selected: ALL, ...props },
    slots: slot ? { default: slot } : undefined,
  });
}

/** Balise ouvrante de la racine `<aside … data-rail …>`. */
const railRoot = (html: string) => html.match(/<aside\b[^>]*>/)?.[0] ?? '';
const classesOf = (tag: string) => (tag.match(/\bclass="([^"]*)"/)?.[1] ?? '').split(/\s+/).filter(Boolean);

describe('BlogRail, filter variant (plan 12, unchanged)', () => {
  it('renders the category rows as buttons in a hidden filter group, no links', async () => {
    const html = await render({});
    expect(html).toMatch(/<div[^>]*\sdata-list-filters[^>]*\shidden/);
    expect(html.match(/<button\b/g)).toHaveLength(3);
    expect(html).not.toMatch(/href="\/blog\//);
    expect(railRoot(html)).not.toMatch(/data-pagefind-ignore/);
  });
});

// Plan 13, F2 (prototype 174, 184–185, 244, 254–255) : les libellés
// « Catégories » et « Tags » portent `padding:0 8px` (x = 24 dans le rail) et
// le nuage `padding:0 6px` (puces à x = 22) ; les lignes de catégorie gardent
// leur boîte (x = 16, padding 8/10).
describe.each(['filter', 'links'] as const)('BlogRail, %s variant — insets (plan 13, F2)', (variant) => {
  it('insets the Catégories and Tags labels by 8 px and the tag cloud by 6 px', async () => {
    const html = await render({ variant });
    for (const id of ['blog-rail-categories', 'blog-rail-tags']) {
      const label = html.match(new RegExp(`<p\\b[^>]*\\sid="${id}"[^>]*>`))?.[0] ?? '';
      expect(label, id).toBeTruthy();
      expect(classesOf(label), id).toContain('px-2');
    }
    const cloud = html.match(/<ul\b[^>]*\saria-labelledby="blog-rail-tags"[^>]*>/)?.[0] ?? '';
    expect(cloud, 'nuage de tags').toBeTruthy();
    expect(classesOf(cloud)).toContain('px-1.5');
    const rows = html.match(variant === 'links' ? /<a\b[^>]*\shref="\/blog\/[^"]*"[^>]*>/g : /<button\b[^>]*>/g) ?? [];
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      const classes = classesOf(row);
      expect(classes).toEqual(expect.arrayContaining(['px-2.5', 'py-2']));
      expect(classes.filter((cls) => /^(m[xl]?|-m[xl]?)-/.test(cls)), 'boîte de ligne inchangée').toEqual([]);
    }
  });
});

describe('BlogRail, links variant (plan 13, T3)', () => {
  it('links each category row to /blog/ or /blog/?categorie=<value>, visible without JavaScript', async () => {
    const html = await render({ variant: 'links' });
    expect(html).not.toMatch(/data-list-filters|data-facet-|aria-pressed|<button\b/);
    const rows = [...html.matchAll(/<a\b[^>]*\shref="(\/blog\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/g)];
    expect(rows.map((row) => row[1])).toEqual([
      '/blog/',
      '/blog/?categorie=DevOps',
      '/blog/?categorie=Outils%20%26%20co',
    ]);
    const text = rows.map((row) => row[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
    expect(text).toEqual(['Tout 5', 'DevOps 2', 'Outils &amp; co 3']);
    // Aucune partie du groupe n'est rendue `hidden`.
    expect(html).not.toMatch(/\shidden(?=[\s=>/])/);
  });

  it('draws rows muted, hover chip / ink, without active state', async () => {
    const html = await render({ variant: 'links' });
    const anchors = html.match(/<a\b[^>]*\shref="\/blog\/[^"]*"[^>]*>/g) ?? [];
    expect(anchors).toHaveLength(3);
    for (const anchor of anchors) {
      const classes = classesOf(anchor);
      expect(classes).toEqual(
        expect.arrayContaining(['rounded-thumb', 'px-2.5', 'py-2', 'text-sm', 'text-muted', 'hover:bg-chip', 'hover:text-ink']),
      );
      expect(classes.filter((cls) => /accent/.test(cls)), 'aucun état actif').toEqual([]);
      expect(anchor).not.toMatch(/aria-current/);
    }
  });

  it('keeps the tag cloud, then the default slot after the Tags', async () => {
    const html = await render({ variant: 'links' }, '<p data-slot-probe>liés</p>');
    expect(html.match(/href="\/tags\/[^"]+\/"/g)).toHaveLength(2);
    const tagsAt = html.indexOf('href="/tags/terminal/"');
    const slotAt = html.indexOf('data-slot-probe');
    expect(tagsAt).toBeGreaterThan(-1);
    expect(slotAt).toBeGreaterThan(tagsAt);
  });

  it('marks the rail data-rail and data-pagefind-ignore, border right from 1024 px, top below', async () => {
    const root = railRoot(await render({ variant: 'links' }));
    expect(root).toMatch(/\sdata-rail(?=[\s=>/])/);
    expect(root).toMatch(/\sdata-pagefind-ignore(?=[\s=>/])/);
    const classes = classesOf(root);
    expect(classes).toEqual(
      expect.arrayContaining(['bg-rail', 'px-4', 'py-[22px]', 'gap-[22px]', 'border-t', 'border-line2', 'lg:border-t-0', 'lg:border-r']),
    );
    expect(classes.filter((cls) => /^md:border/.test(cls)), 'pas de bordure /blog').toEqual([]);
  });
});

// Plan 18, T5 (R8 ; prototype 174 `margin:0 0 10px` ; D121) : le libellé
// « Catégories » se pose 10 px au-dessus de sa première ligne, dans les deux
// variantes. L'écart est celui du conteneur flex (`gap-2.5`) ; ni le libellé
// ni la liste de lignes n'y ajoutent de marge ou de retrait vertical.
describe('BlogRail, Catégories label gap (plan 18, T5)', () => {
  it('puts 10 px between the Catégories label and its first row, in both variants', async () => {
    for (const variant of ['filter', 'links'] as const) {
      const html = await render({ variant });
      const labelAt = html.search(/<p\b[^>]*\sid="blog-rail-categories"/);
      expect(labelAt, variant).toBeGreaterThan(-1);
      // Conteneur : la dernière balise ouvrante `<nav>` / `<div>` avant le libellé.
      const before = html.slice(0, labelAt);
      const groupAt = Math.max(before.lastIndexOf('<nav'), before.lastIndexOf('<div'));
      const group = html.slice(groupAt, html.indexOf('>', groupAt) + 1);
      expect(group, variant).toMatch(/aria-labelledby="blog-rail-categories"/);
      const groupClasses = classesOf(group);
      expect(groupClasses, variant).toEqual(expect.arrayContaining(['flex', 'flex-col']));
      expect(groupClasses.filter((cls) => /^gap(?:-[xy])?-/.test(cls)), variant).toEqual(['gap-2.5']);

      const label = html.slice(labelAt, html.indexOf('>', labelAt) + 1);
      expect(classesOf(label).filter((cls) => /^-?(?:m[by]?|p[by])-/.test(cls)), `${variant} libellé`).toEqual([]);

      // Liste des lignes : la balise ouvrante qui suit la fermeture du libellé.
      const afterLabel = html.indexOf('</p>', labelAt) + '</p>'.length;
      const rowsAt = html.indexOf('<', afterLabel);
      const rows = html.slice(rowsAt, html.indexOf('>', rowsAt) + 1);
      expect(rows, variant).toMatch(/^<(ul|div)\b/);
      expect(classesOf(rows).filter((cls) => /^-?(?:m[ty]?|p[ty])-/.test(cls)), `${variant} lignes`).toEqual([]);
    }
  });
});
