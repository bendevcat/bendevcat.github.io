// Fiche skill (plan 17, src/components/skill/InstallWindow.astro et
// FileExplorer.astro).
//
// Le serveur rend `Copier` `hidden` et un seul aperçu de fichier visible (les
// autres `hidden`, le bouton du fichier affiché `aria-pressed="true"`). Sans
// JS, `Copier` reste caché, l'arbre aussi, et chaque aperçu s'affiche (règles
// `html:not([data-js])` de global.css). Ce script :
// - révèle `Copier` et le câble : `copyText` (src/lib/clipboard.ts) de
//   `data-install-cmd` — `installCmd` telle qu'écrite, jamais les étapes —,
//   `Copié` 1,4 s ou `Échec — copie manuelle` ; `aria-live="polite"` est posé
//   par le serveur ;
// - explorateur : un clic (ou Entrée / Espace, boutons natifs) sur un fichier
//   montre son aperçu, cache les autres et déplace `aria-pressed`.
// src/scripts/copy-code.ts ignore `[data-skill-explorer] pre` : pas de bouton
// ajouté dans l'aperçu.
import { copyText } from '../lib/clipboard';

const LABEL = 'Copier';
const DONE = 'Copié';
const FAILED = 'Échec — copie manuelle';
const RESET_MS = 1400;

// Copier.
const copy = document.querySelector<HTMLButtonElement>('[data-install-window] [data-install-copy]');
if (copy) {
  let timer: number | undefined;
  copy.addEventListener('click', async () => {
    const ok = await copyText(copy.dataset.installCmd ?? '');
    copy.textContent = ok ? DONE : FAILED;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      copy.textContent = LABEL;
    }, RESET_MS);
  });
  copy.hidden = false;
}

// Explorateur.
document.querySelectorAll<HTMLElement>('[data-skill-explorer]').forEach((explorer) => {
  const buttons = Array.from(explorer.querySelectorAll<HTMLButtonElement>('button[data-explorer-file]'));
  const previews = buttons.map((button) => document.getElementById(button.getAttribute('aria-controls') ?? ''));

  const select = (index: number) => {
    buttons.forEach((button, i) => {
      button.setAttribute('aria-pressed', String(i === index));
      const preview = previews[i];
      if (preview) preview.hidden = i !== index;
    });
  };

  buttons.forEach((button, index) => {
    button.addEventListener('click', () => select(index));
  });
});
