// @ts-check
/**
 * Plugin Vite : index des entrées du site pour `/admin/` (plan 23, T4, R6 ;
 * décision D152).
 *
 * Module virtuel `virtual:bencat-site-entries` : `export default [...]`, les
 * entrées `{ collection, id, title, description, draft }` lues sur le disque
 * (`src/lib/blocks/readSiteEntries.mjs`, chaque `src/content/*\/*\/index.md`)
 * au moment où Vite charge le module — au build (donc à chaque déploiement)
 * et au démarrage de `astro dev` (relu au redémarrage : pas de surveillance
 * des fichiers, une page `/admin/` ouverte n'est pas rechargée par une
 * modification du contenu sur le disque).
 *
 * Lu par `src/admin/cms.ts` : options du sélecteur du bloc Carte et
 * fournisseur d'entrées de l'aperçu (mode `preview`). Graphe admin seulement :
 * un import venu d'ailleurs que `src/admin/` est une erreur (le module ne
 * doit jamais entrer dans un chunk d'une page du site — contrôle
 * `scripts/check-admin.mjs`, ligne « isolation »). Le module ne porte aucun
 * chemin de fichier (ligne « dev-only » : aucune chaîne `/src/content/`).
 */
import { fileURLToPath } from 'node:url';
import { readSiteEntries } from '../lib/blocks/readSiteEntries.mjs';

/** Nom du module virtuel, tel qu'importé. */
export const SITE_ENTRIES_ID = 'virtual:bencat-site-entries';

/** Id résolu (préfixe `\0` : aucun autre plugin ne le traite). */
const RESOLVED_ID = `\0${SITE_ENTRIES_ID}`;

/** @param {string} path */
const toPosix = (path) => path.replaceAll('\\', '/');

/**
 * Source du module virtuel pour `entries`.
 * @param {readonly import('../lib/blocks/siteEntries.mjs').SiteEntry[]} entries
 */
export function siteEntriesModuleSource(entries) {
  const plain = entries.map(({ collection, id, title, description, draft }) => ({
    collection,
    id,
    title,
    description,
    draft,
  }));
  return `export default Object.freeze(${JSON.stringify(plain)}.map(Object.freeze));\n`;
}

/**
 * @param {{ root?: string, read?: () => import('../lib/blocks/siteEntries.mjs').SiteEntry[] }} [options]
 *   racine du dépôt (défaut : deux niveaux au-dessus de ce fichier) ; lecteur
 *   d'entrées (défaut : le disque)
 * @returns {import('vite').Plugin}
 */
export function siteEntriesModule({
  root = fileURLToPath(new URL('../..', import.meta.url)),
  read = () => readSiteEntries(),
} = {}) {
  const adminDir = `${toPosix(root).replace(/\/?$/, '/')}src/admin/`;

  return {
    name: 'bencat-site-entries',
    resolveId(source, importer) {
      if (source !== SITE_ENTRIES_ID) return null;
      const from = importer ? toPosix(importer).split('?')[0] : undefined;
      // Un importeur fichier (chemin absolu) hors de src/admin/ ; les ids
      // virtuels ou relatifs (analyse des dépendances) ne sont pas jugés.
      if (from && /^(?:[A-Za-z]:)?\//.test(from) && !from.startsWith(adminDir)) {
        this.error(`${SITE_ENTRIES_ID} est réservé à src/admin/ (importé par ${from})`);
      }
      return RESOLVED_ID;
    },
    load(id) {
      if (id !== RESOLVED_ID) return null;
      return siteEntriesModuleSource(read());
    },
  };
}
