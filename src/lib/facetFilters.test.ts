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
