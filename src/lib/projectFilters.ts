/**
 * Prédicat de filtrage de la grille `/projets`.
 *
 * AUCUN import ici — surtout pas `astro:content`. Ce module est chargé par le
 * navigateur (src/scripts/project-filters.ts) ET par les tests unitaires ; le
 * garder sans dépendance est ce qui rend les deux possibles.
 */

/** Valeur sentinelle « aucun filtre » — jamais un statut ni une techno réels. */
export const ALL = '__all__';

export interface ProjectFilterEntry {
  status: string;
  stack: string[];
}

export interface ProjectFilterSelection {
  status: string;
  stack: string;
}

/** Les deux critères se combinent en ET (spec R3). */
export function matchesFilters(
  entry: ProjectFilterEntry,
  selected: ProjectFilterSelection,
): boolean {
  const statusOk = selected.status === ALL || entry.status === selected.status;
  const stackOk = selected.stack === ALL || entry.stack.includes(selected.stack);
  return statusOk && stackOk;
}
