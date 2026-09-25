// « Copier » des blocs `:::terminal` d'un article (plan 23, T2). Chargé par
// src/pages/blog/[...slug].astro seulement quand le corps porte un terminal
// (`remarkPluginFrontmatter.blocks.terminal`).
//
// Même comportement que src/scripts/code-window.ts (fiche projet), dont le
// bloc reprend le balisage : bouton rendu `hidden`, révélé ici, texte du seul
// `<code>` lu avant tout changement de libellé. Script distinct et non import
// de code-window.ts : un module partagé par deux points d'entrée deviendrait
// un chunk commun, et le script de CodeWindow.astro — donc chaque fiche
// projet — changerait (R17 : pages existantes identiques). Le seul module
// commun est src/lib/clipboard.ts, déjà un chunk partagé.
import { copyText } from '../lib/clipboard';

const LABEL = 'Copier';
const DONE = 'Copié !';
const FAILED = 'Échec — copie manuelle';
const RESET_MS = 1500;

document.querySelectorAll<HTMLElement>('[data-code-window][data-terminal]').forEach((win) => {
  const button = win.querySelector<HTMLButtonElement>('[data-code-copy]');
  const code = win.querySelector<HTMLElement>('pre code');
  if (!button || !code) return;

  const text = code.textContent ?? '';
  let timer: number | undefined;

  button.addEventListener('click', async () => {
    const ok = await copyText(text);
    button.textContent = ok ? DONE : FAILED;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      button.textContent = LABEL;
    }, RESET_MS);
  });

  button.hidden = false;
});
