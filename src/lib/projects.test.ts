import { describe, it, expect } from 'vitest';
import { sortProjects, collectStacks } from './projects';
import { assertEntriesResolved } from './references';

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

describe('assertEntriesResolved', () => {
  it('renvoie les entrées inchangées quand tout est résolu (rien ne change)', () => {
    const refs = [
      { id: 'article-un', collection: 'blog' },
      { id: 'article-deux', collection: 'blog' },
    ];
    const resolved = [
      { id: 'article-un', data: { title: 'Un' } },
      { id: 'article-deux', data: { title: 'Deux' } },
    ];

    expect(assertEntriesResolved('site-bencat', refs, resolved)).toEqual(resolved);
  });

  it('lève une erreur nommant le porteur, la collection et l\'id manquant quand une entrée est undefined', () => {
    const refs = [
      { id: 'article-un', collection: 'blog' },
      { id: 'article-fantome', collection: 'blog' },
    ];
    const resolved = [{ id: 'article-un', data: { title: 'Un' } }, undefined];

    expect(() => assertEntriesResolved('site-bencat', refs, resolved)).toThrow(
      /site-bencat.*blog.*article-fantome/,
    );
  });
});
