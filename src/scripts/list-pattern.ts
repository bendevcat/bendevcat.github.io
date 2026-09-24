/**
 * Glue DOM du patron « liste filtrable » — LE script des quatre listes
 * (/projets, /blog, /prompts, /skills). Il ne décide de rien : il lit les
 * cartes, appelle computeListState() et applique le résultat. Toute règle
 * métier qu'on serait tenté d'ajouter ici appartient à src/lib/listPattern.ts,
 * où elle sera testée.
 *
 * Remplace facet-filters.ts et project-filters.ts (Plan 7 / I4) : deux scripts
 * de glue, c'était deux comportements qui divergent — le premier thème de
 * douleur de la spec.
 */
import { ALL, type FacetSelection } from '../lib/facetFilters';
import { computeListState, type ListEntry, type ListLabels, type SortOrder } from '../lib/listPattern';

const root = document.querySelector<HTMLElement>('[data-list]');
const toolbar = document.querySelector<HTMLElement>('[data-list-filters]');
const grid = document.querySelector<HTMLElement>('[data-list-grid]');

if (root && toolbar && grid) {
  const featuredBox = document.querySelector<HTMLElement>('[data-list-featured]');
  const metaBox = document.querySelector<HTMLElement>('[data-list-meta]');
  const emptyBox = document.querySelector<HTMLElement>('[data-list-empty]');
  const emptyText = document.querySelector<HTMLElement>('[data-list-empty-text]');
  const resetButton = document.querySelector<HTMLButtonElement>('[data-list-reset]');

  const cards = Array.from(grid.querySelectorAll<HTMLElement>('[data-entry-id]'));
  const buttons = Array.from(toolbar.querySelectorAll<HTMLButtonElement>('button[data-facet-key]'));
  const selects = Array.from(toolbar.querySelectorAll<HTMLSelectElement>('select[data-facet-key]'));
  const sortSelect = toolbar.querySelector<HTMLSelectElement>('select[data-sort]');

  const [singular, plural] = (root.dataset.listNouns ?? 'élément|éléments').split('|');
  const labels: ListLabels = {
    singular,
    plural,
    // L'ordre d'affichage des facettes dans la ligne de méta suit l'ordre des
    // contrôles dans la barre — pilules d'abord, puis dropdowns.
    facets: [...buttons, ...selects]
      .map((el) => ({ key: el.dataset.facetKey ?? '', label: el.dataset.facetLabel ?? '' }))
      .filter((facet, index, all) =>
        facet.key !== '' && all.findIndex((other) => other.key === facet.key) === index,
      ),
  };

  const entries: ListEntry[] = cards.map((card) => {
    let facets: Record<string, string[]> = {};
    try {
      facets = JSON.parse(card.dataset.facet ?? '{}');
    } catch {
      facets = {}; // data-facet malformé : la carte se comporte comme sans facette
    }
    return {
      id: card.dataset.entryId ?? '',
      facets,
      featured: card.dataset.featured !== undefined,
      date: Number(card.dataset.date ?? 0),
      minutes: Number(card.dataset.minutes ?? 0),
    };
  });

  const selected: FacetSelection = {};
  for (const facet of labels.facets) selected[facet.key] = ALL;

  const apply = () => {
    const order = (sortSelect?.value ?? 'none') as SortOrder;
    const state = computeListState(entries, selected, order, labels);

    const position = new Map(state.visibleIds.map((id, index) => [id, index]));
    for (const card of cards) {
      const id = card.dataset.entryId ?? '';
      card.hidden = !position.has(id);
      // Le tri réordonne réellement le DOM : `order` CSS suffirait au visuel
      // mais laisserait l'ordre de tabulation et de lecture d'écran inchangé.
      if (position.has(id)) card.style.order = String(position.get(id));
    }

    if (featuredBox) {
      featuredBox.hidden = state.featuredId === null;
      for (const slot of featuredBox.querySelectorAll<HTMLElement>('[data-entry-id]')) {
        slot.hidden = slot.dataset.entryId !== state.featuredId;
      }
    }

    // Région live (`aria-live="polite"`, plan 11) : ne réécrire le texte que
    // s'il change — au chargement il est déjà celui du serveur, et une
    // réécriture identique peut quand même être annoncée (D57).
    if (metaBox && metaBox.textContent !== state.meta) metaBox.textContent = state.meta;
    if (emptyBox) emptyBox.hidden = state.empty === null;
    if (emptyText && state.empty !== null) emptyText.textContent = state.empty;

    for (const button of buttons) {
      const key = button.dataset.facetKey ?? '';
      button.setAttribute(
        'aria-pressed',
        String((button.dataset.facetValue ?? ALL) === selected[key]),
      );
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

  sortSelect?.addEventListener('change', apply);

  // R6 : le bouton d'état vide ramène la liste complète — toutes les
  // sélections ET tous les contrôles, pas seulement l'état interne.
  resetButton?.addEventListener('click', () => {
    for (const key of Object.keys(selected)) selected[key] = ALL;
    for (const select of selects) select.value = ALL;
    if (sortSelect) sortSelect.value = 'none';
    apply();
    toolbar.scrollIntoView({ block: 'nearest' });
  });

  toolbar.hidden = false;
  apply();
}
