/**
 * Lien ✏️ Éditer des pages de détail (plan 22, T5 ; décision D150).
 *
 * Partagé par le site (`src/components/EditLink.astro`, `src/scripts/edit-link.ts`)
 * et l'admin (`src/admin/cms.ts`, qui en reçoit sa copie `?admin`, D138 : aucun
 * chunk partagé entre /admin/ et les pages).
 *
 * - `/admin/` pose `localStorage['bencat:author'] = '1'` à chaque chargement
 *   (`markAuthor`) ; une page de détail ne montre son lien que si ce marqueur
 *   est là (`revealEditLinks`). C'est une COMMODITÉ, jamais un contrôle
 *   d'accès : le lien est dans le HTML public, et l'édition reste protégée par
 *   la connexion GitHub de Sveltia. Pour l'effacer :
 *   `localStorage.removeItem('bencat:author')`.
 * - Tout accès au stockage est sous `try/catch` : navigation privée, stockage
 *   bloqué ou `localStorage` absent → pas de marqueur posé, lien laissé caché.
 * - `editHref` : la route d'entrée de Sveltia 0.221,
 *   `#/collections/<name>/entries/<subPath>` (`contents/navigation.js`), où
 *   `subPath` est capturé par le `fullPathRegEx` du `path` de la collection
 *   (`contents/file/config.js`) — `path: '{{slug}}/index'` dans
 *   `public/admin/config.yml`, donc `<id>/index`, le lien même qu'ouvre la
 *   liste d'entrées (`entry-list-item.svelte`). Sveltia relit le chemin par
 *   `decodeURIComponent` (`parseLocation`), d'où l'`encodeURIComponent` de l'id
 *   (sans effet sur nos slugs `[a-z0-9-]`). Gardé par `editLink.test.ts`.
 */

/** Clé du marqueur auteur dans `localStorage`. */
export const AUTHOR_KEY = 'bencat:author';
/** Seule valeur qui révèle le lien. */
export const AUTHOR_VALUE = '1';

/** Collections du CMS (= collections Astro) qui ont une page de détail. */
export const EDIT_COLLECTIONS = ['blog', 'projects', 'prompts', 'skills'] as const;
export type EditCollection = (typeof EDIT_COLLECTIONS)[number];

/** Accès paresseux au stockage : le simple getter `window.localStorage` peut lever. */
type StorageAccess<K extends keyof Storage> = () => Pick<Storage, K>;

/** `/admin/#/collections/<collection>/entries/<id>/index`. */
export function editHref(collection: EditCollection, id: string): string {
  return `/admin/#/collections/${collection}/entries/${encodeURIComponent(id)}/index`;
}

/** Pose le marqueur ; toute erreur de stockage est avalée. */
export function markAuthor(storage: StorageAccess<'setItem'>): void {
  try {
    storage().setItem(AUTHOR_KEY, AUTHOR_VALUE);
  } catch {
    // Stockage indisponible : le lien restera simplement caché.
  }
}

/** Vrai si le marqueur vaut exactement `'1'` ; faux sur toute erreur. */
export function isAuthor(storage: StorageAccess<'getItem'>): boolean {
  try {
    return storage().getItem(AUTHOR_KEY) === AUTHOR_VALUE;
  } catch {
    return false;
  }
}

/**
 * Retire `hidden` de chaque `a[data-edit-link]` de `root` si le marqueur est
 * posé. Rend le nombre de liens révélés.
 */
export function revealEditLinks(
  root: { querySelectorAll(selector: string): ArrayLike<{ hidden: boolean }> },
  storage: StorageAccess<'getItem'>,
): number {
  if (!isAuthor(storage)) return 0;
  const links = Array.from(root.querySelectorAll('a[data-edit-link]'));
  for (const link of links) link.hidden = false;
  return links.length;
}
