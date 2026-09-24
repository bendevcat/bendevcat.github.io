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
 *
 * Plan 12, T4 (D75) — trois extensions, sans rien changer pour /projets,
 * /prompts et /skills :
 * - plusieurs groupes `[data-list-filters]` (le rail et la barre de /blog),
 *   chacun `hidden` côté serveur et révélé ici ; leurs contrôles forment UN
 *   seul jeu de facettes ;
 * - le tri `[data-sort]` est un `<select>` OU un menu `Dropdown.astro`
 *   (`data-value`, événement `dropdown-change`) ;
 * - sans `[data-list-featured]` sur la page, aucune entrée à la une : toutes
 *   restent dans la liste (`{ featured: false }`).
 * `data-facet-all-label` sur un contrôle de facette donne son libellé de repos
 * (`catégorie : Tout` dans la méta, voir listPattern.ts).
 */
import { ALL, type FacetSelection } from '../lib/facetFilters';
import {
  computeListState,
  domOrder,
  type FacetLabel,
  type ListEntry,
  type ListLabels,
  type SortOrder,
} from '../lib/listPattern';
import { DROPDOWN_CHANGE, setDropdownValue } from './dropdown';

const root = document.querySelector<HTMLElement>('[data-list]');
const groups = Array.from(document.querySelectorAll<HTMLElement>('[data-list-filters]'));
const grid = document.querySelector<HTMLElement>('[data-list-grid]');

if (root && groups.length > 0 && grid) {
  const featuredBox = document.querySelector<HTMLElement>('[data-list-featured]');
  const metaBox = document.querySelector<HTMLElement>('[data-list-meta]');
  const emptyBox = document.querySelector<HTMLElement>('[data-list-empty]');
  const emptyText = document.querySelector<HTMLElement>('[data-list-empty-text]');
  const resetButton = document.querySelector<HTMLButtonElement>('[data-list-reset]');

  // Les entrées sont les enfants directs de la grille (racines des composants
  // *Card / ArticleRow) : c'est ce qui permet de les déplacer (F4).
  const cards = Array.from(grid.children).filter(
    (el): el is HTMLElement => el instanceof HTMLElement && el.dataset.entryId !== undefined,
  );
  const canonicalIds = cards.map((card) => card.dataset.entryId ?? '');
  const cardById = new Map(cards.map((card) => [card.dataset.entryId ?? '', card]));
  const buttons = groups.flatMap((group) =>
    Array.from(group.querySelectorAll<HTMLButtonElement>('button[data-facet-key]')),
  );
  const selects = groups.flatMap((group) =>
    Array.from(group.querySelectorAll<HTMLSelectElement>('select[data-facet-key]')),
  );
  const controls = [...buttons, ...selects];

  // Tri : `<select data-sort>` (base) ou racine de menu `[data-dropdown][data-sort]`
  // (plan 12). Cherché dans toute la page : la liste y est unique, et le menu
  // de /blog vit dans la barre d'outils, pas forcément dans un groupe.
  const sortControl = document.querySelector<HTMLElement>('[data-sort]');
  const sortSelect = sortControl instanceof HTMLSelectElement ? sortControl : null;
  const sortDropdown = sortControl?.hasAttribute('data-dropdown') ? sortControl : null;
  // Valeur de remise à zéro du menu : celle rendue par le serveur (`recent` sur
  // /blog — le menu n'a pas d'option `none`).
  const initialSort = sortDropdown?.dataset.value ?? 'none';
  const readSort = (): SortOrder =>
    (sortSelect?.value ?? sortDropdown?.dataset.value ?? 'none') as SortOrder;

  const [singular, plural] = (root.dataset.listNouns ?? 'élément|éléments').split('|');
  const labels: ListLabels = {
    singular,
    plural,
    // L'ordre d'affichage des facettes dans la ligne de méta suit l'ordre des
    // contrôles dans la barre — pilules d'abord, puis dropdowns.
    // Libellé de repos (plan 12, D75) : le premier `data-facet-all-label` non
    // vide porté par un contrôle de la facette.
    facets: controls
      .map((el) => ({ key: el.dataset.facetKey ?? '', label: el.dataset.facetLabel ?? '' }))
      .filter((facet, index, all) =>
        facet.key !== '' && all.findIndex((other) => other.key === facet.key) === index,
      )
      .map((facet): FacetLabel => {
        const allLabel = controls.find(
          (el) => el.dataset.facetKey === facet.key && el.dataset.facetAllLabel,
        )?.dataset.facetAllLabel;
        return allLabel ? { ...facet, allLabel } : facet;
      }),
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
    const state = computeListState(entries, selected, readSort(), labels, {
      featured: featuredBox !== null,
    });

    const visible = new Set(state.visibleIds);
    for (const card of cards) card.hidden = !visible.has(card.dataset.entryId ?? '');
    // Le tri réordonne réellement le DOM (plan 12, F4) : les nœuds sont
    // déplacés dans l'ordre de domOrder() — un `order` CSS suffirait au visuel
    // mais laisserait l'ordre de tabulation et de lecture d'écran à l'ordre
    // serveur. Rien n'est déplacé quand l'ordre est déjà le bon (/blog au
    // chargement) ; sur /projets, /prompts et /skills, la copie masquée de
    // l'entrée à la une part en queue de grille, sans effet visible.
    const wanted = domOrder(canonicalIds, state.visibleIds).flatMap((id) => cardById.get(id) ?? []);
    const current = Array.from(grid.children);
    if (wanted.some((card, index) => current[index] !== card)) grid.append(...wanted);
    // Une grille sans carte visible reste un élément flex du cadre
    // (`flex flex-col gap-6`) et y prend une place de `gap` : l'état vide ne
    // serait plus centré (F2, plan 11). On la masque tant qu'elle est vide.
    grid.hidden = state.visibleIds.length === 0;

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
  // `dropdown-change` n'est émis que sur un vrai changement ; `data-value` est
  // déjà à jour quand il arrive (src/scripts/dropdown.ts).
  sortDropdown?.addEventListener(DROPDOWN_CHANGE, apply);

  // R6 : le bouton d'état vide ramène la liste complète — toutes les
  // sélections ET tous les contrôles, pas seulement l'état interne.
  resetButton?.addEventListener('click', () => {
    for (const key of Object.keys(selected)) selected[key] = ALL;
    for (const select of selects) select.value = ALL;
    if (sortSelect) sortSelect.value = 'none';
    if (sortDropdown) setDropdownValue(sortDropdown, initialSort);
    apply();
    groups[0].scrollIntoView({ block: 'nearest' });
  });

  for (const group of groups) group.hidden = false;
  apply();
}
