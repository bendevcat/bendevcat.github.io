// src/lib/article.test.ts
//
// Données de la page article (plan 13, T1 — R1, R2, R3) : articles liés,
// précédent / suivant sans bouclage, entrées du Sommaire, lien de catégorie.
import { describe, it, expect } from 'vitest';
import { ALL } from './facetFilters';
import { adjacentPosts, categoryHref, relatedPosts, tocEntries } from './article';

const post = (id: string, category: string, day: number, draft = false) => ({
  id,
  data: { category, pubDate: new Date(Date.UTC(2025, 9, day)), draft },
});

// Ordre canonique (pubDate desc) volontairement NON respecté en entrée pour
// les articles liés : la fonction doit trier elle-même.
const POSTS = [
  post('devops-old', 'DevOps', 1),
  post('outils-a', 'Outils', 20),
  post('devops-new', 'DevOps', 28),
  post('devops-draft', 'DevOps', 30, true),
  post('devops-mid', 'DevOps', 15),
  post('devops-older', 'DevOps', 5),
  post('devops-self', 'DevOps', 26),
  post('ia-alone', 'IA', 10),
];

describe('relatedPosts', () => {
  it('lists up to 3 published posts of the same category, newest first, never the post itself', () => {
    const self = POSTS.find((p) => p.id === 'devops-self')!;
    const related = relatedPosts(self, POSTS);
    expect(related.map((p) => p.id)).toEqual(['devops-new', 'devops-mid', 'devops-older']);
    // Jamais l'article lui-même, jamais un brouillon, jamais une autre catégorie.
    expect(related.some((p) => p.id === 'devops-self' || p.id === 'devops-draft')).toBe(false);
    expect(related.every((p) => p.data.category === 'DevOps')).toBe(true);
    // Moins de 3 candidats : tous, sans remplissage.
    const outils = POSTS.find((p) => p.id === 'outils-a')!;
    const withTwin = [...POSTS, post('outils-b', 'Outils', 2)];
    expect(relatedPosts(outils, withTwin).map((p) => p.id)).toEqual(['outils-b']);
  });

  it('returns no related post when the category has no other published post', () => {
    const alone = POSTS.find((p) => p.id === 'ia-alone')!;
    expect(relatedPosts(alone, POSTS)).toEqual([]);
    // Un brouillon de la même catégorie ne compte pas.
    expect(relatedPosts(alone, [...POSTS, post('ia-draft', 'IA', 12, true)])).toEqual([]);
  });

  it('keeps the canonical order between posts published at the same instant', () => {
    const a = post('same-a', 'Outils', 20);
    const b = post('same-b', 'Outils', 20);
    const self = post('self', 'Outils', 26);
    expect(relatedPosts(self, [self, a, b]).map((p) => p.id)).toEqual(['same-a', 'same-b']);
  });
});

describe('adjacentPosts', () => {
  // Ordre canonique : pubDate desc, collection order pour les égalités.
  const CANON = [
    post('newest', 'DevOps', 28),
    post('second', 'DevOps', 26),
    post('third', 'Outils', 26),
    post('fourth', 'Outils', 20),
    post('oldest', 'Outils', 20),
  ];

  it('returns the next-older post as previous and the next-newer as next', () => {
    const { previous, next } = adjacentPosts(CANON[2], CANON);
    expect(previous?.id).toBe('fourth');
    expect(next?.id).toBe('second');
    // Égalité de date : l'ordre canonique départage.
    expect(adjacentPosts(CANON[3], CANON).previous?.id).toBe('oldest');
    expect(adjacentPosts(CANON[4], CANON).next?.id).toBe('fourth');
    // Un brouillon n'est jamais un voisin.
    const withDraft = [CANON[0], post('draft', 'IA', 27, true), ...CANON.slice(1)];
    expect(adjacentPosts(CANON[1], withDraft).next?.id).toBe('newest');
  });

  it('does not wrap at the newest and the oldest post', () => {
    expect(adjacentPosts(CANON[0], CANON)).toEqual({ previous: CANON[1], next: null });
    expect(adjacentPosts(CANON[4], CANON)).toEqual({ previous: null, next: CANON[3] });
    // Un seul article : ni précédent ni suivant.
    expect(adjacentPosts(CANON[0], [CANON[0]])).toEqual({ previous: null, next: null });
  });
});

describe('tocEntries', () => {
  it('keeps h2 and h3 headings in document order and marks h3 as indented', () => {
    const headings = [
      { depth: 1, slug: 'titre', text: 'Titre' },
      { depth: 2, slug: 'intro', text: 'Intro' },
      { depth: 3, slug: 'detail', text: 'Détail' },
      { depth: 4, slug: 'trop-fin', text: 'Trop fin' },
      { depth: 2, slug: 'suite', text: 'Suite' },
      { depth: 3, slug: 'fin', text: 'Fin' },
    ];
    expect(tocEntries(headings)).toEqual([
      { depth: 2, slug: 'intro', text: 'Intro', indented: false },
      { depth: 3, slug: 'detail', text: 'Détail', indented: true },
      { depth: 2, slug: 'suite', text: 'Suite', indented: false },
      { depth: 3, slug: 'fin', text: 'Fin', indented: true },
    ]);
    expect(tocEntries([])).toEqual([]);
  });
});

describe('categoryHref', () => {
  it('links Tout to /blog/ and a category to its deep link, encoded', () => {
    expect(categoryHref(ALL)).toBe('/blog/');
    expect(categoryHref('DevOps')).toBe('/blog/?categorie=DevOps');
    expect(categoryHref('Sécurité & IA')).toBe('/blog/?categorie=S%C3%A9curit%C3%A9%20%26%20IA');
  });
});
