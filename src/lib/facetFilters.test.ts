import { describe, it, expect } from 'vitest';
import { ALL, matchesFacets, type FacetValues } from './facetFilters';

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

  it('refuse une entrée dont la valeur de facette n’est pas un tableau (JSON malformé)', () => {
    // `entry` vient d'un `JSON.parse` non garanti côté navigateur (data-facet
    // malformé) : `{ format: 'fiche' }` au lieu de `{ format: ['fiche'] }`.
    // Sans garde de type, `.includes` sur une chaîne ferait du matching de
    // sous-chaîne (`'fiche'.includes('fic')` → true) — ce n'est pas la
    // sémantique du moteur, qui ne doit matcher que sur le domaine typé.
    const malformed = { format: 'fiche' } as unknown as FacetValues;
    expect(matchesFacets(malformed, { format: 'fic' })).toBe(false);
  });
});
