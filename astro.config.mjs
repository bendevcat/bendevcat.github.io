// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { syntaxTheme } from './src/lib/syntaxTheme.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://bendevcat.github.io',
  vite: { plugins: [tailwindcss()] },
  markdown: {
    // Couleurs = tokens du contrat (`var(--color-…)`), un seul thème pour les deux
    // modes : la cascade CSS bascule clair/sombre (plan 11, R5, D52).
    shikiConfig: { theme: syntaxTheme },
    rehypePlugins: ['rehype-slug', ['rehype-autolink-headings', { behavior: 'wrap' }]],
  },
});
