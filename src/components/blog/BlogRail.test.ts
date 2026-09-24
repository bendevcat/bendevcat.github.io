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
