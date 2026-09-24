// Fenêtre du prompt de la fiche prompt (plan 16,
// src/components/prompt/PromptWindow.astro et PromptVariables.astro).
//
// Le serveur rend `.md`, `Copier`, `réinitialiser` et les champs de variable
// `hidden`, et la fenêtre avec les variables à leur défaut : sans JS, le texte
// est complet et aucun contrôle inerte n'est montré (R14). Ce script les
// révèle et les câble :
// - saisie dans un champ `[data-var-input="<nom>"]` → chaque segment
//   `[data-var="<nom>"]` de la fenêtre affiche `varDisplay(nom, valeur)`
//   (la valeur, ou `{nom}` quand elle est vide) ; rien d'autre du texte ne
//   bouge, les comptes restent ceux du texte par défaut (D111) ;
// - `réinitialiser` remet chaque champ à son `data-default` ;
// - `Copier` → `copyText` (src/lib/clipboard.ts) du texte du `<code>` lu AU
//   CLIC (donc avec les valeurs saisies), `Copié` 1,4 s ou
//   `Échec — copie manuelle` ; `aria-live="polite"` est posé par le serveur ;
// - `.md` → téléchargement du texte courant en `<id>.md`
//   (`text/markdown;charset=utf-8`).
// src/scripts/copy-code.ts ignore `[data-prompt-window] pre` : pas de second
// bouton.
import { copyText } from '../lib/clipboard';
import { varDisplay } from '../lib/promptWindow';

const LABEL = 'Copier';
const DONE = 'Copié';
const FAILED = 'Échec — copie manuelle';
const RESET_MS = 1400;

const win = document.querySelector<HTMLElement>('[data-prompt-window]');
const code = win?.querySelector<HTMLElement>('pre code') ?? null;

if (win && code) {
  const file = win.dataset.promptFile || 'prompt.md';
  const currentText = () => code.textContent ?? '';

  // Variables.
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('[data-var-input]'));
  const segments = new Map<string, HTMLElement[]>();
  for (const segment of win.querySelectorAll<HTMLElement>('[data-var]')) {
    const name = segment.dataset.var ?? '';
    segments.set(name, [...(segments.get(name) ?? []), segment]);
  }
  const apply = (input: HTMLInputElement) => {
    const name = input.dataset.varInput ?? '';
    const text = varDisplay(name, input.value);
    for (const segment of segments.get(name) ?? []) {
      if (segment.textContent !== text) segment.textContent = text;
    }
  };
  const applyAll = () => inputs.forEach(apply);

  for (const input of inputs) {
    input.addEventListener('input', () => apply(input));
    input.hidden = false;
  }
  // Un retour arrière (bfcache) peut restaurer des valeurs saisies : la
  // fenêtre les suit.
  applyAll();
  window.addEventListener('pageshow', applyAll);

  const reset = document.querySelector<HTMLButtonElement>('[data-var-reset]');
  if (reset && inputs.length > 0) {
    reset.addEventListener('click', () => {
      for (const input of inputs) input.value = input.dataset.default ?? '';
      applyAll();
    });
    reset.hidden = false;
  }

  // Copier.
  const copy = win.querySelector<HTMLButtonElement>('[data-prompt-copy]');
  if (copy) {
    let timer: number | undefined;
    copy.addEventListener('click', async () => {
      const ok = await copyText(currentText());
      copy.textContent = ok ? DONE : FAILED;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        copy.textContent = LABEL;
      }, RESET_MS);
    });
    copy.hidden = false;
  }

  // .md
  const download = win.querySelector<HTMLButtonElement>('[data-prompt-download]');
  if (download) {
    download.addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([currentText()], { type: 'text/markdown;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = file;
      link.hidden = true;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    });
    download.hidden = false;
  }
}
