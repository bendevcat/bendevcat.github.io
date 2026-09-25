import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { AA_NORMAL, readThemeTokens, tokenContrast } from '../contrast';

/**
 * Style des blocs `:::` (plan 23, T1, R14 ; décision D152) : tokens seulement,
 * contraste AA dans les deux thèmes. Les couleurs sont lues dans
 * src/styles/global.css (`readThemeTokens`), jamais recopiées ici.
 */
const SOURCE = readFileSync(new URL('./remarkBlocks.mjs', import.meta.url), 'utf8');
const CSS = readFileSync(new URL('../../styles/global.css', import.meta.url), 'utf8');
const THEMES = readThemeTokens(CSS);

/** Suffixes d'utilitaires `bg-` / `text-` / `border-` / `outline-` qui ne sont pas des couleurs. */
const NOT_A_COLOR = new Set([
  't', 'r', 'b', 'l', 'x', 'y', // côtés de bordure
  'left', 'right', 'center', 'balance', 'pretty', // text-*
  'offset', 'none', 'transparent', 'current', 'inherit', // outline-offset, *-transparent…
]);

/** Utilitaires de couleur des chaînes de classes du module : `[préfixe, token]`. */
function colorUtilities(source: string): [string, string][] {
  const out: [string, string][] = [];
  const pattern =
    /(?:^|[\s'"`])(?:[\w-]+:|\[[^\]\s]+\]:)*-?(bg|text|border(?:-[trblxy])?|outline|fill|stroke|decoration|ring|divide|shadow|accent|caret|placeholder)-([A-Za-z][A-Za-z0-9]*)!?(?=[\s'"`])/g;
  for (const [, prefix, name] of source.matchAll(pattern)) {
    if (!NOT_A_COLOR.has(name)) out.push([prefix, name]);
  }
  return out;
}

describe('blocs : tokens de couleur', () => {
  it('aucune couleur littérale', () => {
    // Ni hexadécimal, ni fonction de couleur, ni palette Tailwind par défaut.
    expect(SOURCE).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(SOURCE).not.toMatch(/\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color-mix)\(/);
    expect(SOURCE).not.toMatch(
      /-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/,
    );
    expect(SOURCE).not.toMatch(/-(?:white|black)\b/);
    expect(SOURCE).not.toMatch(/\bstyle\s*:/);

    const used = colorUtilities(SOURCE);
    expect(used.length).toBeGreaterThan(20);
    for (const [prefix, name] of used) {
      expect(THEMES.light, `${prefix}-${name} : token --color-${name} absent de global.css`).toHaveProperty(name);
      expect(THEMES.dark, `${prefix}-${name} (sombre)`).toHaveProperty(name);
    }
  });

  /**
   * Paires texte / pile de fonds (du fond de page à la surface du bloc).
   * L'article est posé sur `.card` (`surface`) ; la prose d'un encadré garde
   * ses couleurs (`body`, `ink`, liens `accent`, citations `muted`), le code
   * en ligne passe sur `card`.
   */
  const PAIRS: { what: string; text: string; stack: string[] }[] = [];
  for (const tone of ['Blue', 'Green', 'Amber', 'Rose']) {
    const box = ['bg', 'surface', `tag${tone}Bg`];
    PAIRS.push(
      { what: `encadré ${tone} : libellé`, text: `tag${tone}Ink`, stack: box },
      { what: `encadré ${tone} : texte`, text: 'body', stack: box },
      { what: `encadré ${tone} : gras`, text: 'ink', stack: box },
      { what: `encadré ${tone} : lien`, text: 'accent', stack: box },
      { what: `encadré ${tone} : citation`, text: 'muted', stack: box },
      { what: `encadré ${tone} : code en ligne`, text: 'accent', stack: [...box, 'card'] },
    );
  }
  PAIRS.push(
    { what: 'terminal : code', text: 'windowInk', stack: ['windowBg'] },
    { what: 'terminal : gouttière', text: 'windowDim', stack: ['windowBg'] },
    { what: 'terminal : clé YAML', text: 'windowKey', stack: ['windowBg'] },
    { what: 'terminal : valeur YAML', text: 'windowValue', stack: ['windowBg'] },
    { what: 'terminal : puce de titre', text: 'windowDim', stack: ['windowHead', 'windowLine'] },
    { what: 'terminal : Copier', text: 'windowDim', stack: ['windowHead'] },
    { what: 'terminal : Copier (survol)', text: 'windowInk', stack: ['windowHead'] },
    { what: 'carte : genre, description', text: 'muted', stack: ['bg', 'surface', 'card'] },
    { what: 'carte : titre', text: 'ink', stack: ['bg', 'surface', 'card'] },
    { what: 'carte survolée : genre, description', text: 'muted', stack: ['bg', 'surface', 'card', 'cardHover'] },
    { what: 'carte survolée : titre', text: 'ink', stack: ['bg', 'surface', 'card', 'cardHover'] },
    { what: 'carte d’erreur (aperçu)', text: 'tagRoseInk', stack: ['bg', 'surface', 'tagRoseBg'] },
    { what: 'bloc incomplet (aperçu)', text: 'muted', stack: ['bg', 'surface', 'card'] },
    { what: 'vidéo : titre', text: 'windowInk', stack: ['windowBg'] },
    { what: 'vidéo : « Lecture sur … au clic »', text: 'windowDim', stack: ['windowBg'] },
    { what: 'vidéo : glyphe lecture', text: 'windowInk', stack: ['windowBg', 'windowHead'] },
  );

  it('paires texte/fond des blocs ≥ 4.5:1 dans les deux thèmes (global.css)', () => {
    for (const theme of ['light', 'dark'] as const) {
      for (const { what, text, stack } of PAIRS) {
        const ratio = tokenContrast(THEMES[theme], text, stack);
        expect(ratio, `${theme} · ${what} : ${text} sur ${stack.join(' › ')} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(
          AA_NORMAL,
        );
      }
    }
    // Toute couleur de texte du module est mesurée par au moins une paire.
    const measured = new Set(PAIRS.map((pair) => pair.text));
    for (const [prefix, name] of colorUtilities(SOURCE)) {
      if (prefix === 'text') expect(measured, `text-${name} sans paire mesurée`).toContain(name);
    }
  });
});
