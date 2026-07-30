// Bouton « Copier » sur chaque bloc de code de l'article.
//
// IMPORTANT (cf. brief C3 gotcha #1) : le texte à copier est capturé AVANT
// d'ajouter le bouton au DOM. Si on lisait `pre.innerText` après avoir fait
// `pre.appendChild(btn)`, le presse-papier contiendrait aussi le libellé du
// bouton (« Copier » / « Copié ! »), ce qui viole R3 (« le contenu » seul).
document.querySelectorAll<HTMLPreElement>('article pre').forEach((pre) => {
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

  btn.addEventListener('click', async () => {
    await navigator.clipboard.writeText(codeText);
    btn.textContent = 'Copié !';
    setTimeout(() => {
      btn.textContent = 'Copier';
    }, 1500);
  });

  wrapper.appendChild(btn);
});
