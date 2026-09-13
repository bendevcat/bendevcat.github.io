import { describe, it, expect } from 'vitest';
import { ALL, matchesFilters, projectFacets } from './projectFilters';

const astroProject = { status: 'actif', stack: ['Astro', 'TypeScript'] };
const archivedPhp = { status: 'archivé', stack: ['PHP'] };

describe('matchesFilters', () => {
  it('laisse tout passer quand aucun filtre n’est sélectionné', () => {
    expect(matchesFilters(astroProject, { status: ALL, stack: ALL })).toBe(true);
    expect(matchesFilters(archivedPhp, { status: ALL, stack: ALL })).toBe(true);
  });

  it('ne garde que les projets du statut choisi', () => {
    const selected = { status: 'actif', stack: ALL };
    expect(matchesFilters(astroProject, selected)).toBe(true);
    expect(matchesFilters(archivedPhp, selected)).toBe(false);
  });

  it('ne garde que les projets déclarant la techno choisie', () => {
    const selected = { status: ALL, stack: 'PHP' };
    expect(matchesFilters(archivedPhp, selected)).toBe(true);
    expect(matchesFilters(astroProject, selected)).toBe(false);
  });

  it('combine statut ET stack', () => {
    expect(matchesFilters(astroProject, { status: 'actif', stack: 'Astro' })).toBe(true);
    expect(matchesFilters(astroProject, { status: 'actif', stack: 'PHP' })).toBe(false);
    expect(matchesFilters(astroProject, { status: 'wip', stack: 'Astro' })).toBe(false);
  });

  it('exclut un projet sans stack dès qu’une techno est demandée', () => {
    expect(matchesFilters({ status: 'wip', stack: [] }, { status: ALL, stack: 'Astro' })).toBe(false);
  });
});

describe('projectFacets', () => {
  it('produit les mêmes clés que celles que matchesFilters consomme', () => {
    expect(projectFacets({ status: 'wip', stack: ['Astro', 'Bash'] })).toEqual({
      status: ['wip'],
      stack: ['Astro', 'Bash'],
    });
  });
});
