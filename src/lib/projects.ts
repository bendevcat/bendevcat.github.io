import { getCollection, type CollectionEntry } from 'astro:content';

export type ProjectEntry = CollectionEntry<'projects'>;

/**
 * Ordre d'affichage de la grille `/projets` — déterministe (le plan d'impl le
 * fixe, la spec est muette) :
 *   1. `featured` d'abord ;
 *   2. `startDate` décroissante, une fiche sans date passant en dernier ;
 *   3. titre A→Z (`localeCompare` en 'fr' : casse et accents ignorés).
 * Ne mute pas le tableau reçu.
 */
export function sortProjects(projects: ProjectEntry[]): ProjectEntry[] {
  return [...projects].sort((a, b) => {
    const byFeatured = Number(b.data.featured) - Number(a.data.featured);
    if (byFeatured !== 0) return byFeatured;

    const at = a.data.startDate?.getTime() ?? -Infinity;
    const bt = b.data.startDate?.getTime() ?? -Infinity;
    if (at !== bt) return bt - at;

    return a.data.title.localeCompare(b.data.title, 'fr');
  });
}

/** Union triée des technos déclarées — alimente le `<select>` de filtre stack. */
export function collectStacks(projects: ProjectEntry[]): string[] {
  return [...new Set(projects.flatMap((p) => p.data.stack))].sort((a, b) =>
    a.localeCompare(b, 'fr'),
  );
}

export async function getSortedProjects(): Promise<ProjectEntry[]> {
  return sortProjects(await getCollection('projects'));
}
