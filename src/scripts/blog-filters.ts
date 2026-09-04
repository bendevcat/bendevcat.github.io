/**
 * Relais des puces de carte vers la barre de facettes (R4).
 *
 * `src/scripts/facet-filters.ts` (Plan 4) n'écoute que les boutons situés DANS
 * `[data-facet-filters]`. Plutôt que d'élargir sa requête — ce qui toucherait
 * /prompts et /skills, livrés et vérifiés —, on redirige le clic d'une puce
 * de carte vers le bouton équivalent de la barre : un seul état, celui du
 * moteur, et zéro duplication de logique de filtrage.
 */
// Nommé `facetToolbar` (et non `toolbar`) : ce fichier n'a aucun import et
// reste donc un script global pour TypeScript — `toolbar` collisionnerait
// avec `Window.toolbar` (`BarProp`) du lib DOM et ferait échouer `astro check`
// (`Cannot redeclare block-scoped variable 'toolbar'`).
const facetToolbar = document.querySelector<HTMLElement>('[data-facet-filters]');

if (facetToolbar) {
  // La puce est rendue `pointer-events-none` côté serveur (cf.
  // ArticleCard.astro) : sans JS ou sans barre de facettes, le clic traverse
  // jusqu'au lien étiré et la carte s'ouvre. On ne la rend cliquable qu'ici,
  // c'est-à-dire uniquement sur une page qui porte une barre.
  for (const chip of document.querySelectorAll<HTMLElement>('[data-facet-chip]')) {
    chip.classList.remove('pointer-events-none');
  }

  document.addEventListener('click', (event) => {
    const chip = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-facet-chip]');
    if (!chip) return;
    const key = chip.dataset.facetKey;
    const value = chip.dataset.facetValue;
    if (!key || !value) return;
    const target = facetToolbar.querySelector<HTMLButtonElement>(
      `button[data-facet-key="${CSS.escape(key)}"][data-facet-value="${CSS.escape(value)}"]`,
    );
    if (!target) return; // puce sans équivalent dans la barre : on ne fait rien
    event.preventDefault();
    target.click();
    facetToolbar.scrollIntoView({ block: 'nearest' });
  });
}
