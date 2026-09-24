/**
 * Contrastes WCAG calculés sur les VALEURS des tokens du contrat visuel
 * (docs/anti-drift/specs/2026-09-12-refonte-visuelle-design.md §2, §10 V8).
 *
 * Module pur : il ne lit aucun fichier. L'appelant passe le texte de
 * `src/styles/global.css` à `readThemeTokens`, qui en extrait les couleurs
 * des deux thèmes — le clair dans `@theme static { … }`, le sombre dans
 * `:root[data-theme="dark"] { … }`. Les valeurs restent donc écrites à UN
 * endroit (global.css) et le calcul suit toute retouche de ce fichier.
 *
 * Un token translucide (`accentSoft`, `line`, `chip`…) n'a pas de contraste
 * propre : `composite` le pose d'abord sur un fond opaque (règle de mélange
 * « source over » de CSS), comme le navigateur le peint.
 */

/** Couleur sRGB, canaux 0–255, alpha 0–1. */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type ThemeName = 'light' | 'dark';

/** Couleurs d'un thème, indexées par nom de token sans `--color-` (`bg`, `accentSoft`…). */
export type ThemeColors = Record<string, Rgba>;

/** Seuils WCAG 2.x (critère 1.4.3) : texte courant et grand texte. */
export const AA_NORMAL = 4.5;
export const AA_LARGE = 3;

/** Lit `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb(…)` ou `rgba(…)` (virgules ou espaces). */
export function parseColor(value: string): Rgba {
  const v = value.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(v);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = [...h].map((c) => c + c).join('');
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  const fn = /^rgba?\(\s*([^)]*)\)$/i.exec(v);
  if (fn) {
    const parts = fn[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length === 3 || parts.length === 4) {
      const [r, g, b] = parts.slice(0, 3).map(Number);
      const rawA = parts[3];
      const a = rawA === undefined ? 1 : rawA.endsWith('%') ? parseFloat(rawA) / 100 : Number(rawA);
      if ([r, g, b, a].every((x) => Number.isFinite(x))) return { r, g, b, a };
    }
  }
  throw new Error(`couleur illisible : ${value}`);
}

/** Retire les commentaires CSS `/* … *\/`. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Corps du bloc `{ … }` ouvert juste après `opener` (le bloc ne contient pas d'accolade imbriquée). */
function blockBody(css: string, opener: string): string {
  const start = css.indexOf(opener);
  if (start === -1) throw new Error(`bloc introuvable dans global.css : ${opener}`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return css.slice(open + 1, close);
}

/** Déclarations `--color-<nom>: <valeur>;` d'un bloc, lues en couleurs. */
function colorTokens(block: string): ThemeColors {
  const out: ThemeColors = {};
  for (const m of block.matchAll(/--color-([\w-]+)\s*:\s*([^;]+);/g)) {
    out[m[1]] = parseColor(m[2]);
  }
  return out;
}

/**
 * Couleurs des deux thèmes, lues dans le texte de `global.css`. Le sombre ne
 * surcharge que ce qu'il redéclare : il part donc des valeurs claires (le
 * navigateur fait de même — `:root[data-theme="dark"]` hérite de `@theme`).
 */
export function readThemeTokens(cssText: string): Record<ThemeName, ThemeColors> {
  const css = stripComments(cssText);
  const light = colorTokens(blockBody(css, '@theme static'));
  const dark = { ...light, ...colorTokens(blockBody(css, ':root[data-theme="dark"]')) };
  return { light, dark };
}

/** Pose `top` (éventuellement translucide) sur `bottom` (« source over »). */
export function composite(top: Rgba, bottom: Rgba): Rgba {
  const a = top.a + bottom.a * (1 - top.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const mix = (t: number, b: number) => (t * top.a + b * bottom.a * (1 - top.a)) / a;
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a };
}

/**
 * Pose une pile de couches, de la plus basse (le fond de page, opaque) à la
 * plus haute : `flatten([bg, surface, accentSoft])`.
 */
export function flatten(layers: Rgba[]): Rgba {
  if (layers.length === 0) throw new Error('pile de couleurs vide');
  return layers.slice(1).reduce((below, layer) => composite(layer, below), layers[0]);
}

/** Luminance relative WCAG d'une couleur opaque. */
export function relativeLuminance(c: Rgba): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

/**
 * Ratio de contraste WCAG entre un texte et son fond. Le fond doit être
 * opaque (passer par `flatten`) ; un texte translucide est d'abord posé sur
 * ce fond.
 */
export function contrastRatio(text: Rgba, background: Rgba): number {
  if (background.a < 1) throw new Error('fond translucide : aplatir la pile avant de mesurer');
  const fg = text.a < 1 ? composite(text, background) : text;
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(background);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Raccourci par noms de tokens : `tokenContrast(colors, 'accent', ['bg', 'accentSoft'])`
 * mesure `accent` sur `accentSoft` posé sur `bg`.
 */
export function tokenContrast(colors: ThemeColors, text: string, stack: string[]): number {
  const pick = (name: string) => {
    const c = colors[name];
    if (!c) throw new Error(`token inconnu : ${name}`);
    return c;
  };
  return contrastRatio(pick(text), flatten(stack.map(pick)));
}
