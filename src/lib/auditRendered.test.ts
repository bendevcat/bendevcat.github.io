// src/lib/auditRendered.test.ts
//
// Tests des helpers purs de `scripts/audit-rendered.js` (plan 11, T5).
// Le script est un script navigateur CLASSIQUE (ni module, ni dépendance) :
// on l'évalue ici avec un faux `window` minimal — sans jsdom — et on teste ce
// qu'il expose sur `window.__auditLib`. L'audit lui-même (`window.__audit`)
// a besoin d'un vrai moteur de rendu : il est validé dans le navigateur.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { contrastRatio as refRatio, flatten as refFlatten, readThemeTokens, type Rgba } from './contrast';

interface Color { r: number; g: number; b: number; a: number }
interface FakeRule { selectorText?: string; style?: { length: number; [i: number]: string }; cssRules?: FakeRule[] }
interface FakeEl { localName: string; tagName: string; id: string; className: string; parentElement: FakeEl | null; children: FakeEl[] }
interface AuditLib {
  CONTRACT_COLOR_NAMES: string[];
  parseColor(v: string): Color | null;
  oklabToSrgb(L: number, a: number, b: number, alpha?: number): Color;
  srgbToOklab(r: number, g: number, b: number): { L: number; a: number; b: number };
  composite(top: Color, bottom: Color): Color;
  flatten(layers: Color[]): Color;
  contrastRatio(text: Color, bg: Color): number;
  isLargeText(px: number, weight: number): boolean;
  requiredRatio(px: number, weight: number): number;
  isEmojiOnly(text: string): boolean;
  toHex(c: Color): string;
  matchToken(c: Color, tokens: Record<string, Color>): string | null;
  equalsToken(c: Color, t: Color): boolean;
  tokenVerdict(value: string, tokens: Record<string, Color>): string | null;
  enumerateTokenNames(sheets: unknown[]): string[];
  shortPath(el: FakeEl): string;
  v2Jump(level: 'card' | 'rail', explicitRail: boolean, onRail?: boolean): string | null;
  isExplicitRail(el: unknown): boolean;
  onExplicitRail(el: unknown): boolean;
  cardOnRail(under: { el: unknown; color: Color } | null, railToken: Color | null | undefined): boolean;
}

const SCRIPT = resolve(__dirname, '../../scripts/audit-rendered.js');
const source = readFileSync(SCRIPT, 'utf8');
const fakeWindow: { __auditLib?: AuditLib; __audit?: unknown } = {};
new Function('window', source)(fakeWindow);
const lib = fakeWindow.__auditLib as AuditLib;

const themes = readThemeTokens(readFileSync(resolve(__dirname, '../styles/global.css'), 'utf8'));

const rgb = (c: Color | null) => (c ? [c.r, c.g, c.b].map(Math.round) : null);

/** Chaîne `oklab(L a b / alpha)` telle que Chrome la calcule pour un `color-mix(in oklab, …)`. */
const oklabString = (c: Rgba, alpha = c.a) => {
  const o = lib.srgbToOklab(c.r, c.g, c.b);
  return `oklab(${o.L.toFixed(5)} ${o.a.toFixed(5)} ${o.b.toFixed(5)} / ${alpha})`;
};

describe('audit-rendered.js', () => {
  it('is a classic script that defines window.__audit and window.__auditLib at load', () => {
    expect(source).not.toMatch(/^\s*(import|export)\s/m);
    expect(typeof fakeWindow.__audit).toBe('function');
    expect(typeof lib.parseColor).toBe('function');
  });

  it('falls back on the 51 contract colour names of global.css', () => {
    expect(lib.CONTRACT_COLOR_NAMES).toHaveLength(51);
    expect([...lib.CONTRACT_COLOR_NAMES].sort()).toEqual(Object.keys(themes.light).sort());
    expect([...lib.CONTRACT_COLOR_NAMES].sort()).toEqual(Object.keys(themes.dark).sort());
  });

  it('parses the computed colour syntaxes a browser returns', () => {
    expect(lib.parseColor('rgb(16, 23, 32)')).toEqual({ r: 16, g: 23, b: 32, a: 1 });
    expect(lib.parseColor('rgba(0, 0, 0, 0)')).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(lib.parseColor('rgba(11, 107, 76, 0.1)')).toEqual({ r: 11, g: 107, b: 76, a: 0.1 });
    expect(lib.parseColor('rgb(11 107 76 / 10%)')).toEqual({ r: 11, g: 107, b: 76, a: 0.1 });
    expect(lib.parseColor('transparent')?.a).toBe(0);
    expect(lib.parseColor('#F1F4F7d9')).toEqual({ r: 241, g: 244, b: 247, a: 217 / 255 });
    expect(rgb(lib.parseColor('color(srgb 1 0.5 0 / 0.85)'))).toEqual([255, 128, 0]);
    expect(lib.parseColor('color(srgb 1 0.5 0 / 0.85)')?.a).toBeCloseTo(0.85, 5);
    // sans `/ alpha` : le 4e mot est un canal, pas l'alpha
    expect(lib.parseColor('color(srgb 0 0 1)')).toMatchObject({ b: 255, a: 1 });
    expect(rgb(lib.parseColor('color(srgb-linear 0.215861 0.215861 0.215861)'))).toEqual([128, 128, 128]);
    expect(rgb(lib.parseColor('hsl(0, 100%, 50%)'))).toEqual([255, 0, 0]);
    expect(lib.parseColor('var(--color-bg)')).toBeNull();
    expect(lib.parseColor('url("#grad") none')).toBeNull();
    expect(lib.parseColor('')).toBeNull();
  });

  it('converts oklab and oklch to sRGB', () => {
    expect(rgb(lib.oklabToSrgb(1, 0, 0))).toEqual([255, 255, 255]);
    expect(rgb(lib.oklabToSrgb(0, 0, 0))).toEqual([0, 0, 0]);
    const red = lib.parseColor('oklab(0.627955 0.224863 0.125846)');
    expect(rgb(red)).toEqual([255, 0, 0]);
    const redLch = lib.parseColor('oklch(0.627955 0.257683 29.2339deg / 0.5)');
    expect(rgb(redLch)).toEqual([255, 0, 0]);
    expect(redLch?.a).toBe(0.5);
    expect(rgb(lib.parseColor('oklab(62.7955% 56.2158% 31.4615%)'))).toEqual([255, 0, 0]);
  });

  it('recognises every contract colour, in both themes, through oklab at any alpha (Tailwind /NN)', () => {
    for (const theme of ['light', 'dark'] as const) {
      const tokens = themes[theme];
      for (const [name, value] of Object.entries(tokens)) {
        const back = lib.parseColor(oklabString(value, 0.37));
        expect(back, `${theme} ${name}`).not.toBeNull();
        const found = lib.matchToken(back as Color, tokens);
        expect(found, `${theme} ${name}`).not.toBeNull();
        // within ±2 per channel — possibly a sibling token of the same RGB (`code` = `bg` in dark)
        // or a neighbour (`chip` #E6EBF1 and `rail` #E8EDF2 in light)
        const hit = tokens[found as string];
        for (const k of ['r', 'g', 'b'] as const) expect(Math.abs(hit[k] - value[k])).toBeLessThanOrEqual(2);
      }
    }
  });

  it('judges token colour: transparent passes, a palette colour does not', () => {
    const light = themes.light;
    const dark = themes.dark;
    expect(lib.tokenVerdict('rgba(0, 0, 0, 0)', light)).toBe('transparent');
    expect(lib.tokenVerdict('rgb(84, 97, 111)', light)).toBe('muted');
    expect(lib.tokenVerdict('rgb(86, 99, 109)', light)).toBe('muted'); // ±2
    expect(lib.tokenVerdict('rgb(87, 97, 111)', light)).toBeNull(); // 3 off
    // base defect: the search backdrop was `bg-black/…`
    expect(lib.tokenVerdict('rgba(0, 0, 0, 0.5)', light)).toBeNull();
    expect(lib.tokenVerdict('rgba(0, 0, 0, 0.5)', dark)).toBeNull();
    // after T1: `backdrop:bg-bg/85` → color-mix(in oklab, var(--color-bg) 85%, transparent)
    expect(lib.tokenVerdict(oklabString(light.bg, 0.85), light)).not.toBeNull();
    expect(lib.tokenVerdict(oklabString(dark.bg, 0.85), dark)).not.toBeNull();
    // amber-300 of Tailwind's palette, a status colour at base
    expect(lib.tokenVerdict('oklch(87.9% 0.169 91.605)', light)).toBeNull();
    expect(lib.tokenVerdict('url("#g") none', light)).toBeNull();
  });

  it('computes WCAG ratios like src/lib/contrast.ts, and the base meta-line defect', () => {
    const { light, dark } = themes;
    expect(lib.contrastRatio({ r: 118, g: 118, b: 118, a: 1 }, { r: 255, g: 255, b: 255, a: 1 })).toBeCloseTo(4.54, 2);
    const pairs: Array<[Record<string, Rgba>, string, string[]]> = [
      [light, 'body', ['bg']],
      [light, 'muted', ['surface']],
      [light, 'accent', ['bg', 'accentSoft']],
      [dark, 'body', ['bg']],
      [dark, 'accent', ['surface', 'accentSoft']],
      [dark, 'muted', ['surface', 'tagAmberBg']],
    ];
    for (const [t, text, stack] of pairs) {
      const layers = stack.map((n) => t[n]);
      expect(lib.contrastRatio(t[text], lib.flatten(layers))).toBeCloseTo(refRatio(t[text], refFlatten(layers)), 10);
    }
    // plan 11, T5 acceptance: light `/skills/` meta line (`text-dim` on `bg`) at 4.19:1
    expect(Math.round(lib.contrastRatio(light.dim, light.bg) * 100) / 100).toBe(4.19);
    // translucent text is composited on its background first
    const half = lib.contrastRatio({ r: 0, g: 0, b: 0, a: 0.5 }, { r: 255, g: 255, b: 255, a: 1 });
    expect(half).toBeCloseTo(refRatio({ r: 0, g: 0, b: 0, a: 0.5 }, { r: 255, g: 255, b: 255, a: 1 }), 10);
  });

  it('composites translucent layers bottom-up', () => {
    const white = { r: 255, g: 255, b: 255, a: 1 };
    const half = lib.composite({ r: 0, g: 0, b: 0, a: 0.5 }, white);
    expect(half.a).toBe(1);
    expect(half.r).toBeCloseTo(127.5, 5);
    const stack = lib.flatten([white, { r: 0, g: 0, b: 0, a: 0.5 }, { r: 0, g: 0, b: 0, a: 0.5 }]);
    expect(stack.r).toBeCloseTo(63.75, 5);
    expect(lib.toHex({ r: 63.75, g: 0, b: 255, a: 1 })).toBe('#4000ff');
    expect(lib.toHex({ r: 0, g: 0, b: 0, a: 0.5 })).toBe('#00000080');
  });

  it('uses the WCAG large-text thresholds', () => {
    expect(lib.isLargeText(24, 400)).toBe(true);
    expect(lib.isLargeText(23.9, 400)).toBe(false);
    expect(lib.isLargeText(18.66, 700)).toBe(true);
    expect(lib.isLargeText(18.66, 600)).toBe(false);
    expect(lib.isLargeText(18, 700)).toBe(false);
    expect(lib.requiredRatio(14, 400)).toBe(4.5);
    expect(lib.requiredRatio(30, 300)).toBe(3);
  });

  it('treats emoji-only text as out of the contrast rule, mixed text in', () => {
    for (const t of ['🤖', ' ✨ ', '👨‍💻', '🇫🇷', '1️⃣', '👍🏽', '❤️']) expect(lib.isEmojiOnly(t), t).toBe(true);
    for (const t of ['🤖 IA', 'devops', '', '   ', '© 2026', '/']) expect(lib.isEmojiOnly(t), t).toBe(false);
  });

  it('compares surface levels by exact token (V2)', () => {
    const { dark } = themes;
    expect(lib.equalsToken(lib.parseColor('rgb(24, 29, 36)') as Color, dark.card)).toBe(true);
    expect(lib.equalsToken(lib.parseColor('rgb(18, 22, 27)') as Color, dark.card)).toBe(false);
    expect(lib.equalsToken(lib.parseColor('rgba(24, 29, 36, 0.5)') as Color, dark.card)).toBe(false);
  });

  it('forbids card on bg and rail on surface, except for an explicit [data-rail] (V2, D74)', () => {
    expect(lib.v2Jump('card', false)).toBe('bg');
    expect(lib.v2Jump('rail', false)).toBe('surface');
    // plan 12 : le rail de /blog (et une vignette dérivée de ligne) peint `rail` sur `surface`
    expect(lib.v2Jump('rail', true)).toBeNull();
    // l'exemption ne vaut que pour le niveau rail
    expect(lib.v2Jump('card', true)).toBe('bg');
    const el = (attrs: string[]) => ({ hasAttribute: (name: string) => attrs.includes(name) });
    expect(lib.isExplicitRail(el(['data-rail']))).toBe(true);
    expect(lib.isExplicitRail(el(['data-thumb-derived']))).toBe(false);
    expect(lib.isExplicitRail(null)).toBe(false);
    expect(source).toMatch(/v2Jump\(level, isExplicitRail\(el\)/);
  });

  it('lets a card sit on an explicit [data-rail] rail, never on bg (V2, D88)', () => {
    // plan 13 : cartes « Articles liés » / « Projets liés » posées sur les rails de l'article
    expect(lib.v2Jump('card', false, true)).toBeNull();
    // sans rail explicite sous elle, une carte reste interdite sur bg
    expect(lib.v2Jump('card', false, false)).toBe('bg');
    expect(lib.v2Jump('card', false)).toBe('bg');
    // l'exemption ne touche pas la règle du niveau rail
    expect(lib.v2Jump('rail', false, true)).toBe('surface');
    // l'hôte peint est jugé : le rail explicite lui-même, ou un ancêtre [data-rail]
    const node = (attrs: string[], parentElement: unknown = null) => ({
      hasAttribute: (name: string) => attrs.includes(name),
      parentElement,
    });
    const rail = node(['data-rail']);
    expect(lib.onExplicitRail(rail)).toBe(true);
    expect(lib.onExplicitRail(node([], rail))).toBe(true);
    expect(lib.onExplicitRail(node([], node([])))).toBe(false);
    expect(lib.onExplicitRail(node(['data-thumb-derived']))).toBe(false);
    expect(lib.onExplicitRail(null)).toBe(false);
    expect(source).toMatch(/v2Jump\(level, isExplicitRail\(el\), cardOnRail\(under, tokens\.rail\)\)/);
  });

  it('exempts a card only when its painted parent paints the rail colour inside a [data-rail] (V2, F1)', () => {
    const { dark } = themes;
    const node = (attrs: string[], parentElement: unknown = null) => ({
      hasAttribute: (name: string) => attrs.includes(name),
      parentElement,
    });
    const rail = node(['data-rail']);
    // hôte peint = le rail lui-même, couleur `rail` → exempté
    expect(lib.cardOnRail({ el: rail, color: dark.rail }, dark.rail)).toBe(true);
    // hôte peint dans un [data-rail], couleur `rail` → exempté
    expect(lib.cardOnRail({ el: node([], rail), color: dark.rail }, dark.rail)).toBe(true);
    // hôte peint dans un [data-rail] mais peignant `bg` → PAS exempté : la carte reste signalée
    const bgHost = { el: node([], rail), color: dark.bg };
    expect(lib.cardOnRail(bgHost, dark.rail)).toBe(false);
    expect(lib.v2Jump('card', false, lib.cardOnRail(bgHost, dark.rail))).toBe('bg');
    expect(lib.equalsToken(bgHost.color, dark.bg)).toBe(true);
    // idem pour un [data-rail] qui peindrait lui-même `bg`
    expect(lib.cardOnRail({ el: rail, color: dark.bg }, dark.rail)).toBe(false);
    // couleur `rail` hors de tout [data-rail], ou dans une vignette dérivée → PAS exempté
    expect(lib.cardOnRail({ el: node([], node([])), color: dark.rail }, dark.rail)).toBe(false);
    expect(lib.cardOnRail({ el: node(['data-rail', 'data-thumb-derived']), color: dark.rail }, dark.rail)).toBe(false);
    // pas d'hôte peint, ou jeton rail introuvable → PAS exempté
    expect(lib.cardOnRail(null, dark.rail)).toBe(false);
    expect(lib.cardOnRail({ el: rail, color: dark.rail }, null)).toBe(false);
  });

  it('enumerates contract names from the theme-override rule, not from Tailwind\'s palette', () => {
    const style = (...props: string[]) => Object.assign({ length: props.length }, props);
    const layered: FakeRule = {
      cssRules: [
        { selectorText: ':root, :host', style: style('--font-sans', '--color-black', '--color-amber-300', '--color-bg') },
      ],
    };
    const sheets = [
      { cssRules: [layered, { selectorText: ':root[data-theme="dark"]', style: style('--color-bg', '--color-card', '--shadow') }] },
      { get cssRules(): never { throw new Error('SecurityError: cross-origin'); } },
      { cssRules: [{ cssRules: [{ selectorText: ':root[data-theme=dark]', style: style('--color-card', '--color-tagRoseLine') }] }] },
    ];
    expect(lib.enumerateTokenNames(sheets)).toEqual(['bg', 'card', 'tagRoseLine']);
    expect(lib.enumerateTokenNames([])).toEqual([]);
  });

  it('names an element by a short CSS path', () => {
    const make = (localName: string, id = '', className = '', parent: FakeEl | null = null): FakeEl => {
      const el: FakeEl = { localName, tagName: localName.toUpperCase(), id, className, parentElement: parent, children: [] };
      if (parent) parent.children.push(el);
      return el;
    };
    const body = make('body');
    const main = make('main', '', 'mx-auto max-w-5xl', body);
    const section = make('section', '', 'card p-6 md:p-8', main);
    make('p', '', 'text-xs', section);
    const p = make('p', '', 'font-mono text-xs text-dim sm:text-sm', section);
    expect(lib.shortPath(p)).toBe('main.mx-auto.max-w-5xl > section.card.p-6 > p.font-mono.text-xs:nth-of-type(2)');
    const dialog = make('dialog', 'search-dialog', 'card', body);
    const input = make('input', 'search-input', 'w-full', make('div', '', 'flex', dialog));
    expect(lib.shortPath(input)).toBe('input#search-input');
    const span = make('span', '', 'text-accent', dialog.children[0]);
    expect(lib.shortPath(span)).toBe('dialog#search-dialog > div.flex > span.text-accent');
  });
});
