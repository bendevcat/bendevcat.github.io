/**
 * Module virtuel de src/admin/viteSiteEntries.mjs (plan 23, T4) : l'index des
 * entrées du site, lu sur le disque au build et au démarrage de `astro dev`.
 */
declare module 'virtual:bencat-site-entries' {
  const entries: readonly import('../../lib/blocks/siteEntries.mjs').SiteEntry[];
  export default entries;
}
