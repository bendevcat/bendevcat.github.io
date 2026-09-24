/**
 * Glue DOM du menu déroulant réutilisable (plan 12, T3) — rendu par
 * src/components/Dropdown.astro. Il ne décide de rien : il lit le DOM, appelle
 * dropdownKey() / dropdownToggle() (src/lib/dropdown.ts, testées) et applique
 * le pas renvoyé. Une règle qu'on serait tenté d'ajouter ici appartient à la
 * lib.
 *
 * Contrat pour les consommateurs (moteur de liste, plan 14) :
 * - la racine `[data-dropdown]` porte la valeur courante dans `data-value` ;
 * - un choix qui CHANGE la valeur émet sur la racine un `dropdown-change`
 *   qui remonte (`bubbles`), `detail.value` = nouvelle valeur ;
 * - `setDropdownValue(root, value)` pose une valeur sans émettre d'événement
 *   (remises à zéro : l'appelant recalcule lui-même).
 *
 * Enhancement progressif : le serveur rend la racine `hidden` ; ce script la
 * révèle. Sans JS, aucun contrôle mort n'est affiché.
 *
 * Plusieurs imports de ce module (le composant, list-pattern.ts…) ne font
 * qu'une exécution — module ES — et chaque racine n'est câblée qu'une fois
 * (`data-dropdown-ready`).
 */
import { CLOSED, dropdownKey, dropdownToggle, indexOfValue, type DropdownState, type DropdownStep } from '../lib/dropdown';

export const DROPDOWN_CHANGE = 'dropdown-change';

export interface DropdownChangeDetail {
  value: string;
}

interface Parts {
  trigger: HTMLButtonElement;
  listbox: HTMLElement;
  options: HTMLElement[];
  valueText: HTMLElement | null;
}

function partsOf(root: HTMLElement): Parts | null {
  const trigger = root.querySelector<HTMLButtonElement>('[data-dropdown-trigger]');
  const listbox = root.querySelector<HTMLElement>('[data-dropdown-listbox]');
  if (!trigger || !listbox) return null;
  return {
    trigger,
    listbox,
    options: Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]')),
    valueText: root.querySelector<HTMLElement>('[data-dropdown-value]'),
  };
}

const valuesOf = (options: HTMLElement[]) => options.map((option) => option.dataset.value ?? '');

/** Peint la sélection : `aria-selected`, coche ✓, valeur affichée sur le déclencheur. */
function paintSelection(root: HTMLElement, parts: Parts, value: string): void {
  root.dataset.value = value;
  for (const option of parts.options) {
    const selected = option.dataset.value === value;
    option.setAttribute('aria-selected', String(selected));
    const check = option.querySelector<HTMLElement>('[data-dropdown-check]');
    if (check) check.textContent = selected ? '✓' : '';
    if (selected && parts.valueText) {
      parts.valueText.textContent = option.dataset.label ?? option.dataset.value ?? '';
    }
  }
}

/**
 * Pose la valeur d'un menu sans émettre `dropdown-change`. Renvoie `false`
 * (et ne touche à rien) si aucune option ne porte cette valeur.
 */
export function setDropdownValue(root: HTMLElement, value: string): boolean {
  const parts = partsOf(root);
  if (!parts || !parts.options.some((option) => option.dataset.value === value)) return false;
  paintSelection(root, parts, value);
  return true;
}

function enhance(root: HTMLElement): void {
  if (root.dataset.dropdownReady !== undefined) return;
  const parts = partsOf(root);
  if (!parts || parts.options.length === 0) return;
  root.dataset.dropdownReady = '';

  const { trigger, listbox, options } = parts;
  let state: DropdownState = CLOSED;

  const selectedIndex = () => indexOfValue(valuesOf(options), root.dataset.value);

  const apply = (step: DropdownStep) => {
    state = step.state;
    listbox.hidden = !state.open;
    trigger.setAttribute('aria-expanded', String(state.open));

    if (step.select !== null) {
      const value = options[step.select]?.dataset.value;
      if (value !== undefined && value !== root.dataset.value) {
        paintSelection(root, parts, value);
        root.dispatchEvent(
          new CustomEvent<DropdownChangeDetail>(DROPDOWN_CHANGE, { bubbles: true, detail: { value } }),
        );
      }
    }

    if (step.focus === 'option') options[state.active]?.focus();
    else if (step.focus === 'trigger') trigger.focus();
  };

  // Clic souris ET activation par une aide technique (qui n'émet pas de
  // keydown). Enter / Espace au clavier passent par le keydown ci-dessous,
  // dont le `preventDefault` empêche le clic synthétique d'Enter ; celui
  // d'Espace ne part pas non plus : le focus a déjà quitté le bouton.
  trigger.addEventListener('click', () => apply(dropdownToggle(state, options.length, selectedIndex())));

  trigger.addEventListener('keydown', (event) => {
    const step = dropdownKey(state, event.key, options.length, selectedIndex());
    if (!step.handled) return;
    event.preventDefault();
    apply(step);
  });

  options.forEach((option, index) => {
    option.addEventListener('click', () =>
      apply({ state: CLOSED, select: index, focus: 'trigger', handled: true }),
    );
  });

  listbox.addEventListener('keydown', (event) => {
    const step = dropdownKey(state, event.key, options.length, selectedIndex());
    if (step.handled) event.preventDefault();
    // Tab : le menu se ferme, le navigateur déplace le focus.
    if (step.handled || step.state.open !== state.open) apply(step);
  });

  // Clic hors du menu : il se ferme, sans voler le focus.
  document.addEventListener('pointerdown', (event) => {
    if (state.open && !root.contains(event.target as Node)) {
      apply({ state: CLOSED, select: null, focus: null, handled: false });
    }
  });

  // Filet de sécurité : le focus quitte le menu autrement que par Tab
  // (clic ailleurs dans la page, raccourci du navigateur…).
  root.addEventListener('focusout', (event) => {
    const next = event.relatedTarget as Node | null;
    if (state.open && next !== null && !root.contains(next)) {
      apply({ state: CLOSED, select: null, focus: null, handled: false });
    }
  });

  root.hidden = false;
}

document.querySelectorAll<HTMLElement>('[data-dropdown]').forEach(enhance);
