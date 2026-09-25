// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { syntaxTheme } from './src/lib/syntaxTheme.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://bendevcat.github.io',
  vite: {
    plugins: [tailwindcss()],
    // Sveltia n'est importé que par le script de /admin/ : sans cette ligne, Vite
    // (dev) ne le découvre qu'à la première visite, ré-optimise ses dépendances
    // (« optimized dependencies changed. reloading ») et la barre d'outils Astro
    // répond 504 Outdated Optimize Dep jusqu'au redémarrage (plan 19, F1, R7).
    // Le pré-regrouper au démarrage évite ce cycle ; le build n'est pas concerné.
    optimizeDeps: { include: ['@sveltia/cms'] },
  },
  markdown: {
    // Couleurs = tokens du contrat (`var(--color-…)`), un seul thème pour les deux
    // modes : la cascade CSS bascule clair/sombre (plan 11, R5, D52).
    shikiConfig: { theme: syntaxTheme },
    rehypePlugins: ['rehype-slug', ['rehype-autolink-headings', { behavior: 'wrap' }]],
  },
});
