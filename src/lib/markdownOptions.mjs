// @ts-check
/**
 * Options markdown du site — un seul objet, lu par `astro.config.mjs`
 * (`markdown:`) ET par l'aperçu de `/admin/` (`createMarkdownProcessor` de
 * `@astrojs/markdown-remark` dans le navigateur) : le corps prévisualisé passe
 * par le même pipeline que la page (plan 21, R7, décision D138).
 *
 * - `shikiConfig.theme` : couleurs = tokens du contrat (`var(--color-…)`), un
 *   seul thème pour les deux modes : la cascade CSS bascule clair/sombre
 *   (plan 11, R5, D52).
 * - `rehype-slug` + `rehype-autolink-headings` (`wrap`) : ancres des titres,
 *   reprises par les onglets de détail (DetailTabs.astro).
 * - `remarkBlocks` : blocs `:::` de l'éditeur (plan 23, T1, D152) — encadrés,
 *   terminal, carte, vidéo. Les cartes lisent l'index d'entrées que fournit
 *   l'appelant (`src/lib/blocks/siteEntries.mjs`) : le lecteur disque pour le
 *   site (`astro.config.mjs`), un module virtuel pour l'aperçu.
 *
 * Plugins importés (fonctions), non nommés par chaîne : l'aperçu tourne dans
 * le navigateur, où Astro ne peut pas les charger par leur nom.
 */
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import { remarkBlocks } from './blocks/remarkBlocks.mjs';
import { syntaxTheme } from './syntaxTheme.mjs';

/** @type {NonNullable<import('astro').AstroUserConfig['markdown']>} */
export const markdownOptions = {
  shikiConfig: { theme: syntaxTheme },
  remarkPlugins: [remarkBlocks],
  rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, { behavior: 'wrap' }]],
};
