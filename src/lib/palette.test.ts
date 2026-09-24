// src/lib/palette.test.ts
//
// Garde statique du contrat visuel §2 (23 tokens) + §2.3 (5 tons de tags) :
// aucune couleur hors contrat dans le code source (reliquat P6 D02, plan 11 R2).
// Lit les fichiers de `src/` (hors `src/content` et hors tests) :
// - `.astro`/`.ts`/`.mjs`/`.js` : aucun utilitaire Tailwind nommant une couleur
//   de la palette par défaut (`amber-300`), `black` ou `white`, aucune couleur
//   arbitraire (`bg-[#…]`, `-[rgb…]`, `-[hsl…]`, `-[oklch…]`), aucun littéral
//   de couleur dans un attribut `style` ;
// - `global.css` : aucun littéral de couleur hors des deux blocs de tokens
//   (`@theme static` et `:root[data-theme="dark"]`), commentaires exclus.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const SRC = resolve(__dirname, '..');
const ROOT = resolve(SRC, '..');
const SOURCE_EXT = /\.(astro|ts|mjs|js)$/;

/** Palettes de couleurs par défaut de Tailwind v4 (y compris celles ajoutées en 4.2). */
const PALETTES = [
  'slate', 'gray', 'zinc', 'neutral', 'stone', 'mauve', 'olive', 'mist', 'taupe',
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan',
  'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
];

const PALETTE_UTILITY = new RegExp(`-(?:${PALETTES.join('|')})-(?:50|[1-9]00|950)(?![\\w-])`, 'g');
const BLACK_WHITE_UTILITY = /-(?:black|white)(?![\w-])/g;
const ARBITRARY_COLOUR = /-\[(?:#|rgba?\(|hsla?\(|oklch\(|oklab\()/g;

/** Littéral de couleur CSS : hex, fonction de couleur, ou nom de couleur courant. */
const COLOUR_LITERAL =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(|\b(?:black|white|red|green|blue|yellow|orange|purple|pink|gray|grey|silver|maroon|navy|teal|olive|lime|aqua|fuchsia)\b/;

/** Contenu des attributs `style="…"`, `style='…'` et `style={…}` (une ligne). */
const STYLE_ATTRIBUTE = /\bstyle=(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})/g;

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split('\n').length;
}

/** Couleurs hors contrat dans un fichier source, sous la forme `ligne: extrait`. */
function offContractInSource(text: string): string[] {
  const hits: Array<[number, string]> = [];
  for (const re of [PALETTE_UTILITY, BLACK_WHITE_UTILITY, ARBITRARY_COLOUR]) {
    for (const m of text.matchAll(re)) hits.push([m.index ?? 0, m[0]]);
  }
  for (const m of text.matchAll(STYLE_ATTRIBUTE)) {
    const value = m[1] ?? m[2] ?? m[3] ?? '';
    const literal = COLOUR_LITERAL.exec(value);
    if (literal) hits.push([m.index ?? 0, `style: ${literal[0]}`]);
  }
  return hits.sort((a, b) => a[0] - b[0]).map(([i, s]) => `${lineOf(text, i)}: ${s}`);
}

/** Littéraux de couleur de `global.css` hors des deux blocs de tokens, commentaires exclus. */
function offContractInGlobalCss(css: string): string[] {
  // Les commentaires sont remplacés par des blancs de même longueur : les numéros de ligne restent justes.
  let text = css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
  for (const opener of ['@theme static', ':root[data-theme="dark"]']) {
    const start = text.indexOf(opener);
    if (start === -1) throw new Error(`bloc de tokens introuvable : ${opener}`);
    const close = text.indexOf('}', text.indexOf('{', start));
    text = text.slice(0, start) + text.slice(start, close + 1).replace(/[^\n]/g, ' ') + text.slice(close + 1);
  }
  const hits: string[] = [];
  const global = new RegExp(COLOUR_LITERAL.source, 'g');
  for (const m of text.matchAll(global)) hits.push(`${lineOf(text, m.index ?? 0)}: ${m[0]}`);
  return hits;
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (path === join(SRC, 'content')) continue;
      out.push(...sourceFiles(path));
    } else if (SOURCE_EXT.test(name) && !/\.test\.ts$/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

describe('palette', () => {
  it('flags off-contract colours in known samples', () => {
    expect(offContractInSource('class="border-amber-300 dark:bg-amber-900/30"')).toEqual([
      '1: -amber-300',
      '1: -amber-900',
    ]);
    expect(offContractInSource('class="backdrop:bg-black/60 text-white"')).toEqual(['1: -black', '1: -white']);
    expect(offContractInSource('class="bg-[#fff] text-[rgb(0,0,0)]"')).toEqual(['1: -[#', '1: -[rgb(']);
    expect(offContractInSource('<p style="color: #333">')).toEqual(['1: style: #333']);
    expect(offContractInSource('<p style={`border-color: rgba(0,0,0,.1)`}>')).toEqual(['1: style: rgba(']);
    const css = [
      '@theme static { --color-bg: #fff; }',
      ':root[data-theme="dark"] { --color-bg: #000; }',
      '/* commentaire : #123456 */',
      '.x { color: #000; background: rgba(0,0,0,.5); }',
    ].join('\n');
    expect(offContractInGlobalCss(css)).toEqual(['4: #000', '4: rgba(']);
  });

  it('accepts contract tokens, tones and non-colour words', () => {
    const ok = [
      'class="bg-bg/80 text-accent border-accent/40 bg-accentSoft whitespace-nowrap"',
      'class="bg-tagAmberBg text-tagAmberInk border-tagAmberLine"',
      '<div style="background-image: repeating-linear-gradient(135deg, var(--color-hatch) 0 1px, transparent 1px 9px);">',
      'const tone = "green"; // un nom de ton, pas un utilitaire',
    ];
    for (const line of ok) expect(offContractInSource(line), line).toEqual([]);
  });

  it('finds no colour outside the contract tokens and tones in src', () => {
    const findings: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const rel = relative(ROOT, file);
      for (const hit of offContractInSource(readFileSync(file, 'utf8'))) findings.push(`${rel}:${hit}`);
    }
    const cssPath = join(SRC, 'styles', 'global.css');
    for (const hit of offContractInGlobalCss(readFileSync(cssPath, 'utf8'))) {
      findings.push(`${relative(ROOT, cssPath)}:${hit}`);
    }
    expect(findings).toEqual([]);
  });
});
