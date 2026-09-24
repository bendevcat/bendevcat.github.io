// Bouton « Copier » sur chaque bloc de code de l'article.
//
// IMPORTANT (cf. brief C3 gotcha #1) : le texte à copier est capturé AVANT
// d'ajouter le bouton au DOM. Si on lisait `pre.innerText` après avoir fait
// `pre.appendChild(btn)`, le presse-papier contiendrait aussi le libellé du
// bouton (« Copier » / « Copié ! »), ce qui viole R3 (« le contenu » seul).
import { copyText } from '../lib/clipboard';

document.querySelectorAll<HTMLPreElement>('article pre').forEach((pre) => {
  // Plan 15 : la fenêtre de code de la fiche projet (`[data-code-window]`,
  // CodeWindow.astro) a son propre « Copier » dans sa barre de titre, câblé
  // par src/scripts/code-window.ts — pas de second bouton ni d'enveloppe ici.
  if (pre.closest('[data-code-window]')) return;
  // Plan 16 : idem pour la fenêtre du prompt (`[data-prompt-window]`,
  // PromptWindow.astro), câblée par src/scripts/prompt-window.ts.
  if (pre.closest('[data-prompt-window]')) return;

  const codeText = pre.querySelector('code')?.innerText ?? pre.innerText;

  // Fix review C3 (Important #1) : <pre> porte lui-même l'overflow-x:auto
  // (R9, blocs de code larges). Si le bouton était un enfant direct de
  // <pre>, un position:absolute ancré sur <pre> défile HORS ÉCRAN avec le
  // code dès qu'on scrolle horizontalement, et devient alors incliquable.
  // On insère donc un wrapper non scrollable (position:relative) autour de
  // <pre>, et le bouton devient un enfant du wrapper — jamais de <pre> — de
  // sorte qu'il reste épinglé au coin visible quel que soit le scroll
  // interne de <pre>.
  const wrapper = document.createElement('div');
  wrapper.className = 'code-block-wrapper';
  pre.replaceWith(wrapper);
  wrapper.appendChild(pre);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Copier';
  btn.className = 'copy-btn';
  btn.setAttribute('aria-label', 'Copier le code');
  // D08 (fix round 1) : l'état d'échec ("Échec — copie manuelle") introduit
  // par le Plan 4 n'était porté que par le textContent — invisible pour un
  // lecteur d'écran, dont l'aria-label restait figé sur « Copier le code ».
  // aria-live sur le bouton lui-même (pas de région ajoutée au DOM, pas de
  // refonte : juste un attribut sur l'élément déjà là) fait annoncer son
  // texte à chaque mutation, succès comme échec. Rendu visuel et chemin
  // nominal inchangés.
  btn.setAttribute('aria-live', 'polite');

  btn.addEventListener('click', async () => {
    // Plan 4 : la copie peut échouer (contexte non sécurisé, permission
    // refusée). Avant, l'échec était SILENCIEUX — la promesse rejetait et le
    // libellé ne changeait jamais. Le chemin nominal est inchangé.
    const ok = await copyText(codeText);
    btn.textContent = ok ? 'Copié !' : 'Échec — copie manuelle';
    setTimeout(() => {
      btn.textContent = 'Copier';
    }, 1500);
  });

  wrapper.appendChild(btn);
});
