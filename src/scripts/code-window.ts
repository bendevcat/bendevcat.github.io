// Bouton « Copier » de la fenêtre de code de la fiche projet (plan 15,
// src/components/project/CodeWindow.astro).
//
// Le serveur rend le bouton `hidden` : sans JS, aucun contrôle mort n'est
// affiché (R14). Ce script le révèle et le câble sur `copyText`
// (src/lib/clipboard.ts, repli + retour visuel), comme src/scripts/copy-code.ts
// pour les blocs de code des articles — qui, lui, ignore `[data-code-window]`.
//
// Le texte copié est celui du `<code>` seul, lu AVANT tout changement de
// libellé : la gouttière des numéros de ligne est hors du `<code>` (et
// `aria-hidden`), elle n'entre jamais dans le presse-papier.
import { copyText } from '../lib/clipboard';

const LABEL = 'Copier';
const DONE = 'Copié !';
const FAILED = 'Échec — copie manuelle';
const RESET_MS = 1500;

document.querySelectorAll<HTMLElement>('[data-code-window]').forEach((win) => {
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
