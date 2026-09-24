// src/lib/contrast.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  AA_NORMAL,
  composite,
  contrastRatio,
  flatten,
  parseColor,
  readThemeTokens,
  tokenContrast,
  type ThemeName,
} from './contrast';

const css = readFileSync(resolve(__dirname, '../styles/global.css'), 'utf8');
const themes = readThemeTokens(css);
const THEMES: ThemeName[] = ['light', 'dark'];

describe('contrast', () => {
  it('parses hex and rgba colours', () => {
    expect(parseColor('#0B6B4C')).toEqual({ r: 11, g: 107, b: 76, a: 1 });
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor('rgba(74,222,128,.12)')).toEqual({ r: 74, g: 222, b: 128, a: 0.12 });
    expect(() => parseColor('var(--color-bg)')).toThrow();
  });

  it('computes the WCAG ratio of known pairs', () => {
    const black = parseColor('#000');
    const white = parseColor('#fff');
    expect(contrastRatio(black, white)).toBeCloseTo(21, 5);
    expect(contrastRatio(white, white)).toBeCloseTo(1, 5);
    // #767676 sur blanc : 4.54:1, la valeur de référence du gris AA.
    expect(contrastRatio(parseColor('#767676'), white)).toBeCloseTo(4.54, 2);
  });

  it('composites a translucent colour over an opaque one', () => {
    const half = composite(parseColor('rgba(0,0,0,.5)'), parseColor('#fff'));
    expect(half.a).toBe(1);
    expect(half.r).toBeCloseTo(127.5, 5);
    expect(flatten([parseColor('#fff'), parseColor('rgba(0,0,0,0)')])).toEqual(parseColor('#fff'));
    expect(() => contrastRatio(parseColor('#000'), parseColor('rgba(0,0,0,.5)'))).toThrow();
  });

  it('reads the 51 colour tokens of both themes from global.css', () => {
    // 22 tokens couleur du contrat §2 (le 23e, `shadow`, n'est pas une couleur)
    // + 15 tokens de tons §2.3 + 10 tokens de fenêtre toujours sombre (plan 15, D105)
    // + 4 tokens de fenêtre de prompt (plan 16, D111).
    for (const theme of THEMES) {
      expect(Object.keys(themes[theme])).toHaveLength(51);
    }
    // Contrat §2, verbatim.
    expect(themes.light.bg).toEqual(parseColor('#F1F4F7'));
    expect(themes.dark.bg).toEqual(parseColor('#0A0C0F'));
    expect(themes.light.accentSoft).toEqual(parseColor('rgba(11,107,76,.10)'));
    expect(themes.dark.accentSoft).toEqual(parseColor('rgba(74,222,128,.12)'));
    expect(themes.dark.tagAmberInk).toEqual(parseColor('#FDBA74'));
  });

  it('measures the V8 contract pairs at 4.5:1 or more in both themes', () => {
    for (const theme of THEMES) {
      const t = themes[theme];
      const pairs: Array<[string, string, string[]]> = [
        ['body on bg', 'body', ['bg']],
        ['muted on surface', 'muted', ['surface']],
        ['accent on accentSoft over bg', 'accent', ['bg', 'accentSoft']],
        ['accent on accentSoft over surface', 'accent', ['bg', 'surface', 'accentSoft']],
      ];
      for (const [label, text, stack] of pairs) {
        const ratio = tokenContrast(t, text, stack);
        expect(ratio, `${theme} · ${label} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_NORMAL);
      }
    }
  });

  it('keeps the search highlight (accent on accentSoft) at 4.5:1 inside a result card', () => {
    // Un résultat est un `.card-inner` (fond `card`) dans le modal `.card` (`surface`).
    for (const theme of THEMES) {
      const ratio = tokenContrast(themes[theme], 'accent', ['bg', 'surface', 'card', 'accentSoft']);
      expect(ratio, `${theme} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_NORMAL);
    }
  });

  it('gives the window tokens the same value in both themes and keeps windowInk, windowDim, windowKey and windowValue at 4.5:1 on windowBg and windowHead', () => {
    // Fenêtre toujours sombre (inventaire §9, D105, D111) : les 14 tokens sont
    // déclarés dans LES DEUX blocs, avec la même valeur. `readThemeTokens`
    // fait hériter le sombre du clair : on relit donc le bloc sombre brut pour
    // exiger une redéclaration explicite (l'audit énumère ses noms là).
    const WINDOW = [
      'windowBg', 'windowHead', 'windowLine', 'windowInk', 'windowDim',
      'windowKey', 'windowValue', 'windowDotRed', 'windowDotAmber', 'windowDotGreen',
      'windowAccent', 'windowAccentInk', 'windowVar', 'windowVarBg',
    ];
    const uncommented = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const block = (opener: string) => {
      const open = uncommented.indexOf('{', uncommented.indexOf(opener));
      return uncommented.slice(open + 1, uncommented.indexOf('}', open));
    };
    const declared = (body: string) =>
      Object.fromEntries([...body.matchAll(/--color-(window\w*)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
    const light = declared(block('@theme static'));
    const dark = declared(block(':root[data-theme="dark"]'));
    expect(Object.keys(light).sort()).toEqual([...WINDOW].sort());
    expect(dark).toEqual(light);
    for (const name of WINDOW) expect(themes.dark[name], name).toEqual(themes.light[name]);

    const t = themes.light;
    for (const text of ['windowInk', 'windowDim', 'windowKey', 'windowValue']) {
      for (const stack of [['windowBg'], ['windowHead'], ['windowHead', 'windowLine']]) {
        const ratio = tokenContrast(t, text, stack);
        expect(ratio, `${text} on ${stack.join(' + ')} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_NORMAL);
      }
    }
    // Fenêtre de prompt (plan 16, D111) : variable surlignée sur le corps,
    // bouton « Copier » (texte windowAccent sur fond windowAccentInk).
    const prompt: Array<[string, string[]]> = [
      ['windowVar', ['windowBg', 'windowVarBg']],
      ['windowAccent', ['windowAccentInk']],
    ];
    for (const [text, stack] of prompt) {
      const ratio = tokenContrast(t, text, stack);
      expect(ratio, `${text} on ${stack.join(' + ')} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_NORMAL);
    }
  });
});
