import { ALL, matchesFacets, type FacetSelection } from '../lib/facetFilters';

const toolbar = document.querySelector<HTMLElement>('[data-facet-filters]');
const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-facet-card]'));
const emptyState = document.querySelector<HTMLElement>('[data-facet-empty]');

if (toolbar && cards.length > 0) {
  const buttons = Array.from(toolbar.querySelectorAll<HTMLButtonElement>('button[data-facet-key]'));
  const selects = Array.from(toolbar.querySelectorAll<HTMLSelectElement>('select[data-facet-key]'));

  // Une clé par contrôle présent dans la barre ; tout démarre sur la sentinelle.
  const selected: FacetSelection = {};
  for (const key of [...buttons, ...selects].map((el) => el.dataset.facetKey ?? '')) {
    if (key) selected[key] = ALL;
  }

  const apply = () => {
    let visible = 0;

    for (const card of cards) {
      let facets: Record<string, string[]> = {};
      try {
        facets = JSON.parse(card.dataset.facet ?? '{}');
      } catch {
        facets = {}; // data-facet malformé : la carte se comporte comme sans facette
      }
      const show = matchesFacets(facets, selected);
      card.hidden = !show;
      if (show) visible += 1;
    }

    if (emptyState) emptyState.hidden = visible > 0;

    for (const button of buttons) {
      const key = button.dataset.facetKey ?? '';
      const isCurrent = (button.dataset.facetValue ?? ALL) === selected[key];
      button.setAttribute('aria-pressed', String(isCurrent));
    }
  };

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const key = button.dataset.facetKey ?? '';
      if (key) selected[key] = button.dataset.facetValue ?? ALL;
      apply();
    });
  }

  for (const select of selects) {
    select.addEventListener('change', () => {
      const key = select.dataset.facetKey ?? '';
      if (key) selected[key] = select.value || ALL;
      apply();
    });
  }

  // Révélation de la barre : sans JS elle reste `hidden`, donc aucun contrôle
  // inopérant n'est affiché et toutes les cartes restent visibles.
  toolbar.hidden = false;
  apply();
}
