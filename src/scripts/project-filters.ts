import { ALL, matchesFilters } from '../lib/projectFilters';

const toolbar = document.querySelector<HTMLElement>('[data-project-filters]');
const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-project-card]'));
const emptyState = document.querySelector<HTMLElement>('[data-projects-empty]');

if (toolbar && cards.length > 0) {
  const statusButtons = Array.from(
    toolbar.querySelectorAll<HTMLButtonElement>('[data-filter-status]'),
  );
  const stackSelect = toolbar.querySelector<HTMLSelectElement>('[data-filter-stack]');

  const selected = { status: ALL, stack: ALL };

  const apply = () => {
    let visible = 0;

    for (const card of cards) {
      let stack: string[] = [];
      try {
        stack = JSON.parse(card.dataset.stack ?? '[]');
      } catch {
        stack = []; // data-stack malformé : la carte se comporte comme sans techno
      }
      const show = matchesFilters({ status: card.dataset.status ?? '', stack }, selected);
      card.hidden = !show;
      if (show) visible += 1;
    }

    if (emptyState) emptyState.hidden = visible > 0;

    for (const button of statusButtons) {
      const isCurrent = (button.dataset.filterStatus ?? ALL) === selected.status;
      button.setAttribute('aria-pressed', String(isCurrent));
    }
  };

  for (const button of statusButtons) {
    button.addEventListener('click', () => {
      selected.status = button.dataset.filterStatus ?? ALL;
      apply();
    });
  }

  stackSelect?.addEventListener('change', () => {
    selected.stack = stackSelect.value || ALL;
    apply();
  });

  // Révélation de la barre : sans JS elle reste `hidden`, donc aucun contrôle
  // inopérant n'est affiché et toutes les cartes restent visibles.
  toolbar.hidden = false;
  apply();
}
