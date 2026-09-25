// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { adminLibCopy } from './src/admin/viteAdminLib.mjs';
import { markdownOptions } from './src/lib/markdownOptions.mjs';
import { provideSiteEntries } from './src/lib/blocks/siteEntries.mjs';
import { readSiteEntries } from './src/lib/blocks/readSiteEntries.mjs';
import { blocksBuildCheck } from './src/lib/blocks/buildCheck.mjs';

// Blocs `:::carte` (plan 23, T1, D152) : au rendu du site, l'index des entrées
// est relu sur le disque (`src/content/*/*/index.md`) à chaque corps qui porte
// une carte ; une ref inconnue, ou un brouillon cité par une entrée publiée,
// fait échouer le build en nommant le fichier et la ref (`blocksBuildCheck` :
// le chargeur de contenu d'Astro journalise une erreur de rendu sans échouer).
provideSiteEntries({ mode: 'site', entries: () => readSiteEntries() });

// https://astro.build/config
export default defineConfig({
  site: 'https://bendevcat.github.io',
  integrations: [blocksBuildCheck(markdownOptions)],
  vite: {
    // `adminLibCopy` : `src/admin/` importe sa propre copie `?admin` de
    // `src/lib/` — aucun chunk partagé entre /admin/ et les pages du site
    // (plan 21, T1, D138 ; contrôle `scripts/check-admin.mjs`, isolation).
    plugins: [tailwindcss(), adminLibCopy()],
    // Sveltia n'est importé que par le script de /admin/ : sans cette ligne, Vite
    // (dev) ne le découvre qu'à la première visite, ré-optimise ses dépendances
    // (« optimized dependencies changed. reloading ») et la barre d'outils Astro
    // répond 504 Outdated Optimize Dep jusqu'au redémarrage (plan 19, F1, R7).
    // Le pré-regrouper au démarrage évite ce cycle ; le build n'est pas concerné.
    // Même raison pour le pipeline markdown de l'aperçu, chargé par /admin/
    // seulement (plan 21, T1).
    optimizeDeps: {
      include: ['@sveltia/cms', '@astrojs/markdown-remark', 'rehype-slug', 'rehype-autolink-headings'],
    },
  },
  // Un seul objet d'options, partagé avec l'aperçu de /admin/ (plan 21, R7, D138).
  markdown: markdownOptions,
});
