import { describe, expect, it } from 'vitest';
import {
  computeTabState,
  hasTabRow,
  nextTabIndex,
  projectTabs,
  promptTabs,
  skillTabs,
  type Tab,
} from './detailTabs';

// Les noms de tests cités par R1, R3 et R7 sont repris MOT POUR MOT (D16) :
// les critères du plan 8 se mesurent par nom de test.

const labels = (tabs: Tab[]) => tabs.map((tab) => tab.label);

const FULL_PROJECT = { body: 'Du texte.', hasCover: true, stackCount: 3, relatedCount: 2 };

describe('projectTabs', () => {
  it('lists Aperçu, Stack and Articles liés in that order when everything is fed', () => {
    expect(labels(projectTabs(FULL_PROJECT))).toEqual(['Aperçu', 'Stack', 'Articles liés']);
  });

  it('omits Stack when the stack is empty', () => {
    expect(labels(projectTabs({ ...FULL_PROJECT, stackCount: 0 }))).toEqual([
      'Aperçu',
      'Articles liés',
    ]);
  });

  it('omits Articles liés when no published related post remains', () => {
    expect(labels(projectTabs({ ...FULL_PROJECT, relatedCount: 0 }))).toEqual(['Aperçu', 'Stack']);
  });

  it('omits Aperçu when the body is blank and there is no cover', () => {
    expect(labels(projectTabs({ ...FULL_PROJECT, body: '  \n\t ', hasCover: false }))).toEqual([
      'Stack',
      'Articles liés',
    ]);
    expect(labels(projectTabs({ ...FULL_PROJECT, body: undefined, hasCover: false }))).toEqual([
      'Stack',
      'Articles liés',
    ]);
  });

  it('keeps Aperçu when the body is blank but a cover is set', () => {
    expect(labels(projectTabs({ ...FULL_PROJECT, body: '', hasCover: true }))).toContain('Aperçu');
  });

  it('keeps Aperçu when there is a body but no cover', () => {
    expect(labels(projectTabs({ ...FULL_PROJECT, hasCover: false }))).toContain('Aperçu');
  });

  it('gives every tab a distinct id', () => {
    const ids = projectTabs(FULL_PROJECT).map((tab) => tab.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('promptTabs', () => {
  it('lists Pourquoi then Infos when the body is not blank', () => {
    expect(labels(promptTabs({ body: 'Pourquoi ce prompt.' }))).toEqual(['Pourquoi', 'Infos']);
  });

  it('omits Pourquoi when the body is blank', () => {
    expect(labels(promptTabs({ body: '   ' }))).toEqual(['Infos']);
    expect(labels(promptTabs({ body: undefined }))).toEqual(['Infos']);
  });

  it('always lists Infos', () => {
    expect(labels(promptTabs({ body: 'x' }))).toContain('Infos');
    expect(labels(promptTabs({ body: '' }))).toContain('Infos');
  });

  it('counts the literal "No content" body as content (D4)', () => {
    expect(labels(promptTabs({ body: 'No content\n' }))).toEqual(['Pourquoi', 'Infos']);
  });
});

describe('skillTabs', () => {
  it('lists Aperçu then Infos when the body is not blank', () => {
    expect(labels(skillTabs({ body: 'Ce que fait la skill.' }))).toEqual(['Aperçu', 'Infos']);
  });

  it('omits Aperçu when the body is blank', () => {
    expect(labels(skillTabs({ body: '\n\n' }))).toEqual(['Infos']);
    expect(labels(skillTabs({ body: undefined }))).toEqual(['Infos']);
  });

  it('always lists Infos', () => {
    expect(labels(skillTabs({ body: 'x' }))).toContain('Infos');
    expect(labels(skillTabs({ body: '' }))).toContain('Infos');
  });
});

describe('hasTabRow', () => {
  it('is false below two tabs', () => {
    expect(hasTabRow([])).toBe(false);
    expect(hasTabRow([{ id: 'infos', label: 'Infos' }])).toBe(false);
  });

  it('is true from two tabs', () => {
    expect(hasTabRow(promptTabs({ body: 'x' }))).toBe(true);
  });
});

describe('computeTabState', () => {
  it('selects exactly one tab and shows only its panel', () => {
    for (let count = 1; count <= 4; count++) {
      for (let k = 0; k < count; k++) {
        const state = computeTabState(count, k);
        expect(state).toHaveLength(count);
        state.forEach((tab, i) => {
          expect(tab).toEqual(
            i === k
              ? { selected: true, tabIndex: 0, panelHidden: false }
              : { selected: false, tabIndex: -1, panelHidden: true },
          );
        });
        expect(state.filter((tab) => tab.selected)).toHaveLength(1);
        expect(state.filter((tab) => !tab.panelHidden)).toHaveLength(1);
        expect(state.filter((tab) => tab.tabIndex === 0)).toHaveLength(1);
      }
    }
  });

  it('falls back to the first tab when the index is out of range', () => {
    expect(computeTabState(3, 7).map((tab) => tab.selected)).toEqual([true, false, false]);
    expect(computeTabState(3, -1).map((tab) => tab.selected)).toEqual([true, false, false]);
  });

  it('returns an empty state for zero tabs', () => {
    expect(computeTabState(0, 0)).toEqual([]);
  });
});

describe('nextTabIndex', () => {
  it('moves one step with ArrowRight and ArrowLeft', () => {
    expect(nextTabIndex(0, 'ArrowRight', 3)).toBe(1);
    expect(nextTabIndex(2, 'ArrowLeft', 3)).toBe(1);
  });

  it('wraps ArrowRight from last to first and ArrowLeft from first to last', () => {
    expect(nextTabIndex(2, 'ArrowRight', 3)).toBe(0);
    expect(nextTabIndex(0, 'ArrowLeft', 3)).toBe(2);
  });

  it('maps Home and End to first and last', () => {
    expect(nextTabIndex(1, 'Home', 3)).toBe(0);
    expect(nextTabIndex(1, 'End', 3)).toBe(2);
  });

  it('returns null for other keys', () => {
    for (const key of ['Enter', ' ', 'Tab', 'ArrowUp', 'ArrowDown', 'a']) {
      expect(nextTabIndex(1, key, 3)).toBeNull();
    }
  });

  it('returns null when there is no tab', () => {
    expect(nextTabIndex(0, 'ArrowRight', 0)).toBeNull();
  });
});
