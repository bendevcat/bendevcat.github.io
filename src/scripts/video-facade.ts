// Façade des blocs `:::video` (plan 23, T2 ; D153). Chargé par
// src/pages/blog/[...slug].astro seulement quand le corps de l'article porte
// une vidéo (`remarkPluginFrontmatter.blocks.video`).
//
// Rien n'est demandé au fournisseur avant le clic. Clic principal sans
// modificateur, ou Entrée sur le lien : l'iframe remplace le lien et reçoit le
// focus (src/lib/videoEmbed.ts). Ctrl/⌘-clic, clic du milieu : le navigateur
// ouvre la page du fournisseur, comme sans JS.
import { activateVideoFacade, isPlainActivation } from '../lib/videoEmbed';

document.querySelectorAll<HTMLElement>('figure[data-video]').forEach((figure) => {
  const link = figure.querySelector<HTMLAnchorElement>('a[data-video-link]');
  if (!link) return;
  link.addEventListener('click', (event) => {
    if (!isPlainActivation(event)) return;
    if (activateVideoFacade(figure)) event.preventDefault();
  });
});
