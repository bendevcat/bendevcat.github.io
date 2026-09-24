/**
 * Glue DOM du patron « détail à onglets » (Plan 8) — LE script des trois pages
 * de détail. Il ne décide de rien : il lit les onglets, appelle
 * computeTabState() / nextTabIndex() et applique le résultat. Toute règle
 * qu'on serait tenté d'ajouter ici appartient à src/lib/detailTabs.ts, où
 * elle sera testée.
 *
 * Le serveur a déjà rendu l'état initial (premier onglet sélectionné, autres
 * panneaux `hidden`) : ce script ne touche au DOM qu'en réponse à un clic ou
 * à une touche.
 */
import { computeTabState, nextTabIndex } from '../lib/detailTabs';

document.querySelectorAll<HTMLElement>('[data-detail-tabs]').forEach((root) => {
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  if (tabs.length === 0) return; // moins de deux onglets : pas de rangée (D13)

  const panels = tabs.map((tab) =>
    document.getElementById(tab.getAttribute('aria-controls') ?? ''),
  );

  const select = (index: number, moveFocus: boolean) => {
    computeTabState(tabs.length, index).forEach((state, i) => {
      tabs[i].setAttribute('aria-selected', String(state.selected));
      tabs[i].tabIndex = state.tabIndex;
      const panel = panels[i];
      if (panel) panel.hidden = state.panelHidden;
    });
    if (moveFocus) tabs[index]?.focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(index, false));
    // Activation automatique (D10) : la flèche déplace le focus ET la
    // sélection. `null` = touche non gérée → le navigateur garde la main
    // (Tab sort de la rangée vers le panneau visible).
    tab.addEventListener('keydown', (event) => {
      const next = nextTabIndex(index, event.key, tabs.length);
      if (next === null) return;
      event.preventDefault();
      select(next, true);
    });
  });
});
