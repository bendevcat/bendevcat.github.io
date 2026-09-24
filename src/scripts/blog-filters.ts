/**
 * Relais des puces de carte vers la barre de facettes (R4).
 *
 * `src/scripts/list-pattern.ts` (Plan 7) n'écoute que les boutons situés DANS
 * `[data-list-filters]` — c'est LE script de glue des quatre listes. Plutôt
 * que d'élargir sa requête aux puces de carte — ce qui le changerait aussi
 * pour /projets, /prompts et /skills, qui n'en ont pas —, on redirige le clic
 * d'une puce de carte vers le bouton équivalent de la barre : un seul état,
 * celui du moteur, et zéro duplication de logique de filtrage.
 */
// Nommé `facetToolbar` (et non `toolbar`) : ce fichier n'a aucun import et
// reste donc un script global pour TypeScript — `toolbar` collisionnerait
// avec `Window.toolbar` (`BarProp`) du lib DOM et ferait échouer `astro check`
// (`Cannot redeclare block-scoped variable 'toolbar'`).
const facetToolbar = document.querySelector<HTMLElement>('[data-list-filters]');

if (facetToolbar) {
  // La puce est rendue inerte côté serveur (cf. ArticleCard.astro) : sans JS,
  // ou sur une page sans barre de facettes, elle ne capte ni le pointeur ni le
  // clavier et le clic atteint le lien étiré de la carte. On ne la rend
  // filtrante qu'ici — et c'est aussi ici, et seulement ici, qu'on lui donne
  // un nom accessible annonçant ce qu'elle fait vraiment.
  for (const chip of document.querySelectorAll<HTMLElement>('[data-facet-chip]')) {
    chip.classList.remove('pointer-events-none');
    chip.removeAttribute('tabindex');
    const value = chip.dataset.facetValue;
    if (value) chip.setAttribute('aria-label', `Filtrer par catégorie ${value}`);
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
