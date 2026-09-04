/**
 * Prédicat de filtrage de la grille `/projets` (Plan 3).
 *
 * Depuis le Plan 4, ce module est un ADAPTATEUR au-dessus de
 * `facetFilters.ts` : il n'y a plus qu'un seul moteur de filtrage dans le
 * repo. Son API publique est inchangée, et `projectFilters.test.ts` — non
 * modifié — sert de preuve de non-régression.
 *
 * AUCUN import `astro:content` ici : ce module est chargé par le navigateur.
 */
import { ALL, matchesFacets } from './facetFilters';

export { ALL };

export interface ProjectFilterEntry {
  status: string;
  stack: string[];
}

export interface ProjectFilterSelection {
  status: string;
  stack: string;
}

/** Les deux critères se combinent en ET (spec P3 R3). */
export function matchesFilters(
  entry: ProjectFilterEntry,
  selected: ProjectFilterSelection,
): boolean {
  return matchesFacets(
    { status: [entry.status], stack: entry.stack },
    { status: selected.status, stack: selected.stack },
  );
}
