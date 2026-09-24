// src/lib/blogList.test.ts
//
// Données du rail de /blog (plan 12, T5 — R8) : lignes « Catégories » avec
// leurs comptes, nuage de tags compté sur les articles publiés.
import { describe, it, expect } from 'vitest';
import { CATEGORIES } from '../content.config';
import { ALL } from './facetFilters';
import { blogCategoryRows, blogTagCloud, ALL_CATEGORIES_LABEL } from './blogList';

const post = (category: string, tags: string[] = [], draft = false) => ({
  data: { category, tags, draft },
});

describe('blogCategoryRows', () => {
  it('counts every published post under Tout, then each used category in CATEGORIES order', () => {
    // Ordre d'entrée volontairement différent de CATEGORIES (Outils avant
    // DevOps, IA en tête) : l'ordre de sortie doit être celui de CATEGORIES.
    const posts = [post('IA'), post('Outils'), post('DevOps'), post('Outils'), post('DevOps'), post('Outils')];
    expect(blogCategoryRows(posts, CATEGORIES)).toEqual([
      { value: ALL, label: ALL_CATEGORIES_LABEL, count: 6 },
      { value: 'DevOps', label: 'DevOps', count: 2 },
      { value: 'Outils', label: 'Outils', count: 3 },
      { value: 'IA', label: 'IA', count: 1 },
    ]);
    expect(ALL_CATEGORIES_LABEL).toBe('Tout');
  });

  it('omits a category without published post', () => {
    // Un brouillon ne rend pas sa catégorie « utilisée » et n'entre pas dans Tout.
    const posts = [post('DevOps'), post('Sécurité', [], true)];
    const rows = blogCategoryRows(posts, CATEGORIES);
    expect(rows.map((row) => row.label)).toEqual(['Tout', 'DevOps']);
    expect(rows[0].count).toBe(1);
    // Aucune ligne à compte nul.
    expect(rows.every((row) => row.count > 0)).toBe(true);
  });
});

describe('blogTagCloud', () => {
  it('counts blog tags over published posts only, one per post', () => {
    const posts = [
      // Deux graphies du même tag dans UN article : compté une fois.
      post('DevOps', ['devops', 'DevOps', 'linux']),
      post('Outils', ['devops', 'kubernetes']),
      post('Outils', ['kubernetes', 'terminal']),
      // Brouillon : ses tags ne comptent pas, `brouillon` n'apparaît pas.
      post('Outils', ['devops', 'brouillon'], true),
    ];
    expect(blogTagCloud(posts)).toEqual([
      { slug: 'devops', label: 'devops', count: 2 },
      { slug: 'kubernetes', label: 'kubernetes', count: 2 },
      { slug: 'linux', label: 'linux', count: 1 },
      { slug: 'terminal', label: 'terminal', count: 1 },
    ]);
  });
});
