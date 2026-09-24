import { describe, expect, it } from 'vitest';
import { CLOSED, dropdownKey, dropdownToggle, indexOfValue, type DropdownState } from './dropdown';

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
