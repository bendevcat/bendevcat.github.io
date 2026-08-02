/**
 * Garde-fou sur la résolution de références `reference()` (D06, Plan 3).
 *
 * `getEntries()` d'Astro ne lève PAS quand une référence est introuvable :
 * `createGetEntry` (astro/dist/content/runtime.js) fait
 * `console.warn(...); return;` — un `undefined` entre donc silencieusement
 * dans le tableau résolu, traverse le premier accès à `.data` et lève un
 * `TypeError` anonyme qui interrompt tout le build sans nommer la fiche
 * porteuse, la collection visée, ni l'id manquant.
 *
 * Ce garde-fou échoue au même endroit, avec un message diagnosticable. Il ne
 * filtre JAMAIS silencieusement une entrée manquante : une référence cassée
 * doit casser le build, pas disparaître discrètement de la page.
 *
 * Utilisé dans les quatre sens de relation du site : projet → articles,
 * article → projets (Plan 3), skill → prompts, prompt → skills (Plan 4).
 *
 * @param ownerId  id de l'entrée qui porte la référence (ex. `skill.id`).
 * @param refs     le tableau de références brut *avant* résolution — chaque
 *                 `reference()` se résout en `{ id, collection }` au
 *                 chargement du contenu, ce qui permet de nommer la cible
 *                 même quand `getEntries` a renvoyé `undefined`.
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
