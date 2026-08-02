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
 * Utilisé dans les quatre sens de relation du site : projet → articles,
 * article → projets (Plan 3), skill → prompts, prompt → skills (Plan 4).
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
