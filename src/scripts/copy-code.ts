// Bouton « Copier » sur chaque bloc de code de l'article.
//
// IMPORTANT (cf. brief C3 gotcha #1) : le texte à copier est capturé AVANT
// d'ajouter le bouton au DOM. Si on lisait `pre.innerText` après avoir fait
// `pre.appendChild(btn)`, le presse-papier contiendrait aussi le libellé du
// bouton (« Copier » / « Copié ! »), ce qui viole R3 (« le contenu » seul).
document.querySelectorAll<HTMLPreElement>('article pre').forEach((pre) => {
  const codeText = pre.querySelector('code')?.innerText ?? pre.innerText;

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

  pre.appendChild(btn);
});
