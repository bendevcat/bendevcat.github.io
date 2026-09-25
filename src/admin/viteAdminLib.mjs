// @ts-check
/**
 * Plugin Vite : copie admin de `src/lib` (plan 21, T1, R19 ; décision D138).
 *
 * Importés depuis `src/admin/`, des modules de `src/lib/` également utilisés
 * par les scripts du site faisaient partager des chunks Rollup entre le bundle
 * de `/admin/` et les pages (contrôle `scripts/check-admin.mjs`, isolation
 * 8/52 au lieu de 1/52, et le HTML de 8 pages modifié).
 *
 * Tout import résolu dans `src/lib/` fait depuis `src/admin/**` — ou depuis un
 * module déjà suffixé, pour suivre ses propres imports `src/lib` — est
 * redirigé vers `<fichier>?admin` : un module distinct pour Rollup, donc une
 * copie propre à l'admin. Les imports du site ne passent jamais par ici (le
 * hook rend `null` sans résoudre) : leur graphe est celui d'avant.
 *
 * Build seulement (`apply: 'build'`) : le partage de chunks n'existe qu'au
 * build. En dev, sous Vitest et en SSR Vite (`scripts/check-*.mjs`), un module
 * de `src/lib` reste une seule instance — `astro.config.mjs` et l'aperçu lisent
 * alors le même objet `markdownOptions` (R7).
 */

import { fileURLToPath } from 'node:url';

const SUFFIX = 'admin';

/** @param {string} id */
const split = (id) => {
  const at = id.indexOf('?');
  return at < 0 ? [id, ''] : [id.slice(0, at), id.slice(at + 1)];
};

/** @param {string} query */
const hasSuffix = (query) => query.split('&').includes(SUFFIX);

/** @param {string} path */
const toPosix = (path) => path.replaceAll('\\', '/');

/**
 * @param {{ root?: string }} [options] racine du dépôt (défaut : deux niveaux
 *   au-dessus de ce fichier)
 * @returns {import('vite').Plugin}
 */
export function adminLibCopy({ root = fileURLToPath(new URL('../..', import.meta.url)) } = {}) {
  const base = toPosix(root).replace(/\/?$/, '/');
  const adminDir = `${base}src/admin/`;
  const libDir = `${base}src/lib/`;

  return {
    name: 'admin-lib-copy',
    enforce: 'pre',
    apply: 'build',
    async resolveId(source, importer, options) {
      if (!importer) return null;
      const [importerFile, importerQuery] = split(toPosix(importer));
      const fromAdmin =
        importerFile.startsWith(adminDir) || (importerFile.startsWith(libDir) && hasSuffix(importerQuery));
      if (!fromAdmin) return null;

      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!resolved || resolved.external) return null;
      const [file, query] = split(resolved.id);
      if (!toPosix(file).startsWith(libDir)) return null;
      if (hasSuffix(query)) return resolved;
      return { ...resolved, id: `${file}?${query ? `${query}&` : ''}${SUFFIX}` };
    },
  };
}
