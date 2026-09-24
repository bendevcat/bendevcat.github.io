import { describe, expect, it } from 'vitest';
import {
  CLOSED,
  POPOVER_MARGIN,
  dropdownKey,
  dropdownToggle,
  indexOfValue,
  placePopover,
  type DropdownState,
} from './dropdown';

// Les noms des cinq tests de R10 (plan 12) sont repris MOT POUR MOT : le
// critère se mesure par nom de test.

const open = (active: number): DropdownState => ({ open: true, active });

describe('dropdownKey — clavier du menu déroulant (plan 12, R10)', () => {
  it('opens on Enter, Space, ArrowDown and ArrowUp with the selected option active', () => {
    for (const key of ['Enter', ' ', 'ArrowDown', 'ArrowUp']) {
      const step = dropdownKey(CLOSED, key, 4, 2);
      expect(step.state, key).toEqual({ open: true, active: 2 });
      expect(step.focus, key).toBe('option');
      expect(step.select, key).toBeNull();
      expect(step.handled, key).toBe(true);
    }
  });

  it('moves with ArrowDown and ArrowUp and stops at the ends', () => {
    expect(dropdownKey(open(1), 'ArrowDown', 4, 0).state).toEqual(open(2));
    expect(dropdownKey(open(2), 'ArrowUp', 4, 0).state).toEqual(open(1));
    // Aux bouts, pas de bouclage : la flèche reste sur place.
    const last = dropdownKey(open(3), 'ArrowDown', 4, 0);
    expect(last.state).toEqual(open(3));
    expect(last.handled).toBe(true);
    const first = dropdownKey(open(0), 'ArrowUp', 4, 0);
    expect(first.state).toEqual(open(0));
    expect(first.handled).toBe(true);
    // Déplacer n'est pas choisir : aucune sélection, le focus suit l'option active.
    expect(dropdownKey(open(1), 'ArrowDown', 4, 0).select).toBeNull();
    expect(dropdownKey(open(1), 'ArrowDown', 4, 0).focus).toBe('option');
  });

  it('jumps to the first and last option with Home and End', () => {
    expect(dropdownKey(open(2), 'Home', 4, 2).state).toEqual(open(0));
    expect(dropdownKey(open(1), 'End', 4, 2).state).toEqual(open(3));
    expect(dropdownKey(open(1), 'End', 4, 2).focus).toBe('option');
    expect(dropdownKey(open(1), 'Home', 4, 2).handled).toBe(true);
    // Fermé, Home et End appartiennent à la page, pas au menu.
    expect(dropdownKey(CLOSED, 'Home', 4, 2).handled).toBe(false);
    expect(dropdownKey(CLOSED, 'End', 4, 2).state).toEqual(CLOSED);
  });

  it('selects the active option on Enter and Space and closes', () => {
    for (const key of ['Enter', ' ']) {
      const step = dropdownKey(open(3), key, 4, 0);
      expect(step.select, key).toBe(3);
      expect(step.state.open, key).toBe(false);
      expect(step.focus, key).toBe('trigger');
      expect(step.handled, key).toBe(true);
    }
  });

  it('closes without selecting on Escape and Tab', () => {
    const escape = dropdownKey(open(3), 'Escape', 4, 0);
    expect(escape.state.open).toBe(false);
    expect(escape.select).toBeNull();
    expect(escape.focus).toBe('trigger');
    expect(escape.handled).toBe(true);
    // Tab ferme mais laisse le navigateur déplacer le focus : pas de
    // preventDefault, pas de retour forcé sur le déclencheur.
    const tab = dropdownKey(open(3), 'Tab', 4, 0);
    expect(tab.state.open).toBe(false);
    expect(tab.select).toBeNull();
    expect(tab.focus).toBeNull();
    expect(tab.handled).toBe(false);
  });

  it('ignores Escape, Tab and other keys while closed', () => {
    for (const key of ['Escape', 'Tab', 'a', 'PageDown']) {
      const step = dropdownKey(CLOSED, key, 4, 1);
      expect(step.state, key).toEqual(CLOSED);
      expect(step.handled, key).toBe(false);
      expect(step.focus, key).toBeNull();
    }
  });

  it('leaves other keys to the browser while open', () => {
    const step = dropdownKey(open(1), 'a', 4, 0);
    expect(step.state).toEqual(open(1));
    expect(step.handled).toBe(false);
    expect(step.select).toBeNull();
  });

  it('never opens an empty dropdown', () => {
    expect(dropdownKey(CLOSED, 'ArrowDown', 0, 0).state).toEqual(CLOSED);
    expect(dropdownToggle(CLOSED, 0, 0).state).toEqual(CLOSED);
  });

  it('falls back to the first option when the selected index is out of range', () => {
    expect(dropdownKey(CLOSED, 'Enter', 4, -1).state).toEqual(open(0));
    expect(dropdownKey(CLOSED, 'Enter', 4, 9).state).toEqual(open(0));
  });
});

describe('dropdownToggle — clic sur le déclencheur', () => {
  it('opens on the selected option, then closes on the trigger', () => {
    const opened = dropdownToggle(CLOSED, 4, 1);
    expect(opened.state).toEqual(open(1));
    expect(opened.focus).toBe('option');
    const closed = dropdownToggle(opened.state, 4, 1);
    expect(closed.state).toEqual(CLOSED);
    expect(closed.focus).toBe('trigger');
    expect(closed.select).toBeNull();
  });
});

describe('indexOfValue', () => {
  it('finds the position of a value and falls back to the first option', () => {
    const values = ['recent', 'oldest', 'shortest', 'longest'];
    expect(indexOfValue(values, 'shortest')).toBe(2);
    expect(indexOfValue(values, 'nope')).toBe(0);
    expect(indexOfValue(values, undefined)).toBe(0);
    expect(indexOfValue([], 'recent')).toBe(-1);
  });
});

describe('placePopover — le popover reste dans la fenêtre (plan 12, F2 / R14)', () => {
  // Rect du popover qu'on obtient en posant `right: offsetRight px` sur la
  // racine (dont le bord droit est celui du déclencheur).
  const rectOf = (anchorRight: number, placement: { offsetRight: number; width: number }) => {
    const right = anchorRight - placement.offsetRight;
    return { left: right - placement.width, right };
  };

  it('keeps the popover right-aligned to its trigger when it fits (1280)', () => {
    const placement = placePopover({ anchorRight: 1230, width: 236, viewportWidth: 1280 });
    expect(placement).toEqual({ offsetRight: 0, width: 236 });
  });

  it('shifts right when right alignment would cross the left edge (375, verifier case)', () => {
    // Mesure du vérificateur : déclencheur x 37–200, popover 236 → x −36 → 200.
    const placement = placePopover({ anchorRight: 200, width: 236, viewportWidth: 375 });
    const rect = rectOf(200, placement);
    expect(rect.left).toBe(POPOVER_MARGIN);
    expect(rect.right).toBeLessThanOrEqual(375 - POPOVER_MARGIN);
    expect(placement.width).toBe(236);
  });

  it('shifts left when the trigger sits past the right margin', () => {
    const placement = placePopover({ anchorRight: 372, width: 236, viewportWidth: 375 });
    const rect = rectOf(372, placement);
    expect(rect.right).toBe(375 - POPOVER_MARGIN);
    expect(rect.left).toBeGreaterThanOrEqual(POPOVER_MARGIN);
  });

  it('caps the width to the viewport minus both margins', () => {
    const placement = placePopover({ anchorRight: 100, width: 500, viewportWidth: 320 });
    expect(placement.width).toBe(320 - 2 * POPOVER_MARGIN);
    const rect = rectOf(100, placement);
    expect(rect.left).toBe(POPOVER_MARGIN);
    expect(rect.right).toBe(320 - POPOVER_MARGIN);
  });

  it('stays within the viewport for any trigger position at 375', () => {
    for (let anchorRight = 40; anchorRight <= 375; anchorRight += 7) {
      for (const width of [216, 236, 250, 400]) {
        const placement = placePopover({ anchorRight, width, viewportWidth: 375 });
        const rect = rectOf(anchorRight, placement);
        expect(rect.left, `${anchorRight}/${width}`).toBeGreaterThanOrEqual(0);
        expect(rect.right, `${anchorRight}/${width}`).toBeLessThanOrEqual(375);
      }
    }
  });
});
