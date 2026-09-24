// src/lib/syntaxTheme.test.ts
//
// Plan 11, R5 (D52) : la coloration syntaxique des blocs de code est tirée
// des tokens du contrat. Chaque couleur du thème Shiki est `var(--color-<token>)`
// — aucune valeur en dur — et chaque couleur de texte tient 4.5:1 sur le fond
// `code`, dans les deux thèmes (valeurs lues dans `global.css`, cf. contrast.ts).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AA_NORMAL, readThemeTokens, tokenContrast, type ThemeName } from './contrast';
import { syntaxTheme } from './syntaxTheme.mjs';

const css = readFileSync(resolve(__dirname, '../styles/global.css'), 'utf8');
const themes = readThemeTokens(css);
const THEMES: ThemeName[] = ['light', 'dark'];

const TOKEN_VAR = /^var\(--color-([A-Za-z0-9]+)\)$/;

interface Setting {
  scope?: string | string[];
  settings: { foreground?: string; background?: string; fontStyle?: string };
}

const settings = syntaxTheme.tokenColors as Setting[];

/** Toutes les couleurs du thème, avec leur origine (pour un message d'échec lisible). */
function allColours(): { where: string; value: string }[] {
  const out: { where: string; value: string }[] = [];
  for (const key of ['fg', 'bg'] as const) {
    const value = syntaxTheme[key];
    if (value !== undefined) out.push({ where: key, value });
  }
  for (const [key, value] of Object.entries(syntaxTheme.colors ?? {})) {
    out.push({ where: `colors.${key}`, value: String(value) });
  }
  settings.forEach((setting, index) => {
    const where = `tokenColors[${index}] ${[setting.scope ?? '(global)'].flat().join(', ')}`;
    if (setting.settings.foreground) out.push({ where: `${where} foreground`, value: setting.settings.foreground });
    if (setting.settings.background) out.push({ where: `${where} background`, value: setting.settings.background });
  });
  return out;
}

/** Couleurs de TEXTE : fg, editor.foreground et tous les `foreground` des portées. */
function textTokens(): string[] {
  const names = new Set<string>();
  const add = (value: string | undefined) => {
    const m = value ? TOKEN_VAR.exec(value) : null;
    if (m) names.add(m[1]);
  };
  add(syntaxTheme.fg);
  add(syntaxTheme.colors?.['editor.foreground']);
  for (const setting of settings) add(setting.settings.foreground);
  return [...names];
}

describe('syntaxTheme', () => {
  it('names a contract token for every syntax colour', () => {
    const colours = allColours();
    expect(colours.length).toBeGreaterThan(10);
    const offContract = colours.filter(({ value }) => {
      const m = TOKEN_VAR.exec(value);
      return !m || !(m[1] in themes.light) || !(m[1] in themes.dark);
    });
    expect(offContract).toEqual([]);

    // Rôles fixés par D52 : texte `body`, fond `code`, commentaires `muted`.
    expect(syntaxTheme.fg).toBe('var(--color-body)');
    expect(syntaxTheme.bg).toBe('var(--color-code)');
    const comment = settings.find((s) => [s.scope ?? []].flat().includes('comment'));
    expect(comment?.settings.foreground).toBe('var(--color-muted)');

    // Les autres portées : `accent` et les cinq encres de tons, rien d'autre.
    const allowed = new Set([
      'body', 'muted', 'accent',
      'tagGreenInk', 'tagBlueInk', 'tagVioletInk', 'tagAmberInk', 'tagRoseInk',
    ]);
    expect(textTokens().filter((name) => !allowed.has(name))).toEqual([]);
  });

  it('keeps every syntax colour at 4.5:1 or more on `code` in both themes', () => {
    const tokens = textTokens();
    expect(tokens.length).toBeGreaterThanOrEqual(8);
    const failures: string[] = [];
    for (const theme of THEMES) {
      for (const name of tokens) {
        // `code` est posé sur le fond de page ; empiler `bg` rend le calcul
        // juste même si `code` devenait translucide un jour.
        const ratio = tokenContrast(themes[theme], name, ['bg', 'code']);
        if (ratio < AA_NORMAL) failures.push(`${theme} ${name} ${ratio.toFixed(2)}:1`);
      }
    }
    expect(failures).toEqual([]);
  });
});
