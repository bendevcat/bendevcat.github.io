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

/**
 * D06 — garde-fou sur la résolution de références `reference()`.
 *
 * `getEntries()` d'Astro ne lève PAS quand une référence est introuvable :
 * `createGetEntry` (astro/dist/content/runtime.js) fait
 * `console.warn(\`Entry ${'${collection}'} → ${'${lookupId}'} was not found.\`); return;`
 * — un `undefined` entre donc silencieusement dans le tableau résolu. Sans ce
 * garde-fou, ce `undefined` traverse le premier accès à `.data` (typiquement
 * dans `sortAndFilter`, `src/lib/posts.ts:5`, via `p.data.draft`) et lève un
 * `TypeError: Cannot read properties of undefined (reading 'data')` : un échec
 * bruyant, mais anonyme — il ne nomme ni la fiche porteuse de la référence, ni
 * la collection visée, ni l'id manquant — et qui interrompt tout le build
 * (aucune page produite, pas seulement celle concernée).
 *
 * Ce garde-fou échoue au même endroit, avec un message diagnosticable à la
 * place. Il ne filtre JAMAIS silencieusement une entrée manquante : une
 * référence cassée doit casser le build, pas disparaître discrètement de la
 * page — ce serait la même perte silencieuse que ce plan cherche à empêcher
 * ailleurs (cf. R5).
 *
 * Réutilisable dans les deux sens : T-B3 s'en sert pour `relatedPosts` sur la
 * fiche projet, T-B4 pour `relatedProjects` sur l'article de blog.
 *
 * @param ownerId  id de l'entrée qui porte la référence (ex. `project.id`).
 * @param refs     le tableau de références brut *avant* résolution — chaque
 *                 `reference()` se résout en `{ id, collection }` au
 *                 chargement du contenu, ce qui permet de savoir quelle
 *                 collection et quel id étaient visés même quand
 *                 `getEntries` a renvoyé `undefined` à cette position.
 * @param resolved le résultat brut de `getEntries(refs)`.
 */
export function assertEntriesResolved<T extends { id: string }>(
  ownerId: string,
  refs: { id: string; collection: string }[],
  resolved: (T | undefined)[],
): T[] {
  return resolved.map((entry, i) => {
    if (entry === undefined) {
      const ref = refs[i];
      throw new Error(
        `${ownerId} référence ${ref.collection} → "${ref.id}", introuvable. ` +
          `Vérifie que l'entrée existe encore et que l'id est correctement orthographié.`,
      );
    }
    return entry;
  });
}
