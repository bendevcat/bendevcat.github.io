// src/lib/dropdownMarkup.test.ts
//
// Gardes statiques du dessin du menu déroulant (plan 12, F3 / R16) — lues
// dans le source, sans build. Le prototype (`bencat_ Prototype cliquable`,
// popover de tri) dessine chaque option en JetBrains Mono 11 px, précédée
// d'une icône en trait 14×14 propre à l'option, dans un popover de 250 px
// (236 de `min-width` en boîte de contenu + 2 × 6 de padding + 2 × 1 de
// bordure). Le rendu (police calculée, largeur mesurée) reste la preuve de
// la vérification ; ces gardes empêchent le retour silencieux au dessin
// d'avant (sans 13, sans icône, 236 px).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve(__dirname, '..');
const read = (path: string) => readFileSync(resolve(SRC, path), 'utf8');

const dropdown = read('components/Dropdown.astro');
const icon = read('components/Icon.astro');
const blog = read('pages/blog/index.astro');

/** Tracés du prototype (lignes 197–203), recopiés tels quels. */
const PROTOTYPE_GLYPHS: Record<string, string[]> = {
  sort: ['M4 6h13M4 12h9M4 18h5', 'M17 14l3 3 3-3', 'M20 17V9'],
  'sort-recent': ['M12 8v5l3 2'],
  'sort-oldest': ['M3 3v6h6', 'M3.5 9a9 9 0 1 0 3-6.2L3 6', 'M12 8v5l4 2'],
  'sort-shortest': ['M4 7h9M4 12h6M4 17h3', 'M17 8v8', 'M14 13l3 3 3-3'],
  'sort-longest': ['M4 7h3M4 12h6M4 17h9', 'M17 16V8', 'M14 11l3-3 3 3'],
};

/** Classes statiques de la balise `<li role="option" …>` de Dropdown.astro. */
function optionClasses(): string[] {
  const tag = dropdown.match(/<li\b[^>]*role="option"[^>]*>/)?.[0] ?? '';
  return (tag.match(/\bclass="([^"]*)"/)?.[1] ?? '').split(/\s+/).filter(Boolean);
}

describe('Dropdown — options dessinées comme le prototype (plan 12, F3)', () => {
  it('draws every option in JetBrains Mono 11 px', () => {
    const classes = optionClasses();
    expect(classes).toContain('font-mono');
    expect(classes).toContain('text-[11px]');
    expect(classes).not.toContain('text-[13px]');
  });

  it('renders an optional per-option icon', () => {
    expect(dropdown).toMatch(/option\.icon\s*&&[\s\S]*?<Icon\s+name=\{option\.icon\}\s+size=\{14\}/);
  });

  it('keeps the ✓ mark on the selected option', () => {
    expect(dropdown).toContain('data-dropdown-check');
    expect(dropdown).toMatch(/isSelected \? '✓' : ''/);
  });

  it('carries the prototype glyphs in Icon.astro', () => {
    for (const [name, paths] of Object.entries(PROTOTYPE_GLYPHS)) {
      const entry = icon.match(new RegExp(`'?${name}'?: \\{[\\s\\S]*?\\n  \\},`))?.[0] ?? '';
      expect(entry, name).not.toBe('');
      for (const d of paths) expect(entry, `${name} ${d}`).toContain(`d="${d}"`);
    }
  });

  it('gives each /blog sort option its prototype icon and a 250 px popover', () => {
    for (const [value, name] of [
      ['recent', 'sort-recent'],
      ['oldest', 'sort-oldest'],
      ['shortest', 'sort-shortest'],
      ['longest', 'sort-longest'],
    ]) {
      expect(blog, value).toMatch(new RegExp(`value: '${value}',[^}]*icon: '${name}'`));
    }
    expect(blog).toMatch(/<Dropdown label="tri"[^>]*minWidth=\{250\}/);
  });
});
