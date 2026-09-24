/**
 * Logique du menu déroulant réutilisable (plan 12, T3 ; inventaire §0
 * « Dropdown » ; D75) — tri de /blog aujourd'hui, facettes techno / outil /
 * tag au plan 14.
 *
 * AUCUN accès au DOM : ce module est chargé par le navigateur
 * (src/scripts/dropdown.ts) ET par les tests unitaires — comme detailTabs.ts
 * pour les onglets. La glue lit le DOM, appelle `dropdownKey` /
 * `dropdownToggle` et applique le pas renvoyé ; elle n'a aucune règle à elle.
 *
 * Modèle (D75) : un bouton + une listbox, le focus se pose SUR les options
 * (pas d'`aria-activedescendant`).
 * - Fermé : Enter, Espace, ↓ et ↑ ouvrent, l'option sélectionnée active.
 * - Ouvert : ↓ / ↑ se déplacent et s'arrêtent aux bouts (pas de bouclage) ;
 *   Home / End sautent aux extrémités ; Enter / Espace choisissent l'option
 *   active, ferment et rendent le focus au déclencheur ; Échap ferme et rend
 *   le focus ; Tab ferme et laisse le navigateur déplacer le focus.
 * Toute autre touche n'est pas gérée (`handled: false`) : la glue ne fait
 * alors pas de `preventDefault`.
 */

/**
 * Une option telle que la reçoit `Dropdown.astro` : compte facultatif, aligné
 * à droite ; icône facultative en tête d'option (plan 12, F3 — les options de
 * tri du prototype en portent une chacune). Le type du nom d'icône est un
 * paramètre : ce module reste sans dépendance vers les composants ;
 * `Dropdown.astro` le fixe au jeu d'`Icon.astro`.
 */
export interface DropdownOption<IconName extends string = string> {
  value: string;
  label: string;
  count?: number;
  icon?: IconName;
}

export interface DropdownState {
  open: boolean;
  /** Index de l'option active (focalisée) ; -1 quand le menu est fermé. */
  active: number;
}

/** Où la glue doit poser le focus après le pas : option active, déclencheur, ou nulle part. */
export type DropdownFocus = 'option' | 'trigger' | null;

export interface DropdownStep {
  state: DropdownState;
  /** Index de l'option choisie par ce pas, sinon `null`. */
  select: number | null;
  focus: DropdownFocus;
  /** La touche est consommée par le menu : la glue appelle `preventDefault`. */
  handled: boolean;
}

export const CLOSED: DropdownState = Object.freeze({ open: false, active: -1 });

const SPACE = ' ';
const OPENING_KEYS = new Set(['Enter', SPACE, 'ArrowDown', 'ArrowUp']);

/** Index d'une valeur parmi les options ; valeur inconnue → première option, liste vide → -1. */
export function indexOfValue(values: readonly string[], value: string | undefined): number {
  if (values.length === 0) return -1;
  const index = value === undefined ? -1 : values.indexOf(value);
  return index === -1 ? 0 : index;
}

/** Index sélectionné ramené dans les bornes (hors bornes → première option). */
function clampSelected(selected: number, count: number): number {
  return Number.isInteger(selected) && selected >= 0 && selected < count ? selected : 0;
}

const unchanged = (state: DropdownState): DropdownStep => ({
  state,
  select: null,
  focus: null,
  handled: false,
});

function openOn(selected: number, count: number): DropdownStep {
  if (count <= 0) return unchanged(CLOSED);
  return {
    state: { open: true, active: clampSelected(selected, count) },
    select: null,
    focus: 'option',
    handled: true,
  };
}

const moveTo = (active: number): DropdownStep => ({
  state: { open: true, active },
  select: null,
  focus: 'option',
  handled: true,
});

/**
 * Un pas clavier. `count` = nombre d'options, `selected` = index de la valeur
 * courante (celui que l'ouverture rend actif).
 */
export function dropdownKey(
  state: DropdownState,
  key: string,
  count: number,
  selected: number,
): DropdownStep {
  if (!state.open) {
    return OPENING_KEYS.has(key) ? openOn(selected, count) : unchanged(state);
  }

  const active = clampSelected(state.active, count);
  switch (key) {
    case 'ArrowDown':
      return moveTo(Math.min(active + 1, count - 1));
    case 'ArrowUp':
      return moveTo(Math.max(active - 1, 0));
    case 'Home':
      return moveTo(0);
    case 'End':
      return moveTo(count - 1);
    case 'Enter':
    case SPACE:
      return { state: CLOSED, select: active, focus: 'trigger', handled: true };
    case 'Escape':
      return { state: CLOSED, select: null, focus: 'trigger', handled: true };
    case 'Tab':
      return { state: CLOSED, select: null, focus: null, handled: false };
    default:
      return unchanged(state);
  }
}

/** Clic (ou activation d'aide technique) sur le déclencheur : ouvre, ou referme. */
export function dropdownToggle(state: DropdownState, count: number, selected: number): DropdownStep {
  if (state.open) return { state: CLOSED, select: null, focus: 'trigger', handled: true };
  return openOn(selected, count);
}

/**
 * Marge gardée entre le popover et chaque bord de la fenêtre (px) : à 375 le
 * popover tient dans 375 − 2 × 8 = 359 px.
 */
export const POPOVER_MARGIN = 8;

export interface PopoverPlacementInput {
  /** Bord droit de la racine = du déclencheur, en px depuis le bord gauche de la fenêtre. */
  anchorRight: number;
  /** Largeur naturelle du popover (min-width compris), mesurée aligné à droite. */
  width: number;
  /** Largeur utile de la fenêtre (`documentElement.clientWidth`). */
  viewportWidth: number;
  margin?: number;
}

export interface PopoverPlacement {
  /**
   * Valeur CSS `right` (px) du popover, relative au bord droit de la racine :
   * 0 = aligné à droite sur le déclencheur (le cas de R14 à 1280) ; positif =
   * décalé vers la gauche ; négatif = déborde à droite du déclencheur.
   */
  offsetRight: number;
  /** Largeur retenue : la largeur naturelle, plafonnée à la fenêtre moins deux marges. */
  width: number;
}

/**
 * Placement horizontal du popover (plan 12, F2) : aligné à droite sur son
 * déclencheur tant qu'il tient ; sinon glissé juste assez pour rester à
 * `margin` px des bords de la fenêtre ; largeur plafonnée à la fenêtre moins
 * deux marges.
 */
export function placePopover({
  anchorRight,
  width,
  viewportWidth,
  margin = POPOVER_MARGIN,
}: PopoverPlacementInput): PopoverPlacement {
  const available = Math.max(0, viewportWidth - 2 * margin);
  const placedWidth = Math.min(width, available);
  const minLeft = margin;
  const maxLeft = viewportWidth - margin - placedWidth;
  const left = Math.min(Math.max(anchorRight - placedWidth, minLeft), maxLeft);
  const offsetRight = anchorRight - (left + placedWidth);
  // `-0` → 0 : toEqual et le style CSS n'en ont que faire, mais restons nets.
  return { offsetRight: offsetRight === 0 ? 0 : offsetRight, width: placedWidth };
}
