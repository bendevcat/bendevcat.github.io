import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import Ajv from 'ajv';
import { parse } from 'yaml';
import { parseColor, readThemeTokens } from './contrast';

/**
 * Plan 20 — tableau de bord du CMS (navigation). Ce fichier garde
 * `public/admin/config.yml` contre le schéma JSON LIVRÉ par `@sveltia/cms`
 * (version épinglée dans package.json) : une clé mal orthographiée
 * (`view_filtrs`, `sumary`…) est ignorée en silence ou casse le CMS au
 * chargement, jamais au build — seul ce test la voit avant l'auteur.
 */

/**
 * Config réelle servie à `/admin/`, lue sur disque. Pas d'import de
 * `loadCmsConfig` depuis `cms-config.test.ts` : importer un fichier de test
 * rejouerait toutes ses suites ici.
 */
function loadCmsConfig(): unknown {
  return parse(readFileSync(new URL('../../public/admin/config.yml', import.meta.url), 'utf8'));
}

/**
 * Schéma JSON de la config, lu dans le paquet installé (jamais recopié). Lu
 * par chemin : le champ `exports` du paquet n'expose pas `schema/`.
 */
function loadSveltiaSchema(): object {
  const url = new URL('../../node_modules/@sveltia/cms/schema/sveltia-cms.json', import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8'));
}

/**
 * Valide une config contre le schéma Sveltia. `strict: false` : le schéma
 * livré porte des mots-clés d'annotation (`markdownDescription`…) inconnus
 * d'ajv ; ils n'ont aucun effet sur la validation.
 */
function validateCmsConfig(config: unknown): { valid: boolean; errors: string[] } {
  const ajv = new Ajv({ strict: false, allErrors: true });
  const validate = ajv.compile(loadSveltiaSchema());
  const valid = validate(config) as boolean;
  const errors = (validate.errors ?? []).map(
    (e) => `${e.instancePath || '/'} ${e.message}${e.params ? ' ' + JSON.stringify(e.params) : ''}`,
  );
  return { valid, errors };
}

describe('config du CMS — schéma Sveltia (R1)', () => {
  it('valide config.yml contre le schéma JSON livré par @sveltia/cms', () => {
    const { valid, errors } = validateCmsConfig(loadCmsConfig());
    expect(errors).toEqual([]);
    expect(valid).toBe(true);
  });
});

/** Texte d'un fichier du dépôt, chemin relatif à la racine. */
function readRepoFile(path: string): string {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
}

/** Attributs `nom="valeur"` d'une balise ouvrante. */
function attrs(tag: string): Record<string, string> {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
}

/** Déclarations `fill:` des règles `.tile` et `.bar` d'un bloc CSS. */
function fills(css: string): { tile?: string; bar?: string } {
  const rule = (cls: string) => css.match(new RegExp(`\\.${cls}\\s*\\{[^}]*\\bfill:\\s*([^;}]+)`))?.[1].trim();
  return { tile: rule('tile'), bar: rule('bar') };
}

describe('config du CMS — titre et logo (R2)', () => {
  it('titre benCat · Studio, logo /admin/logo.svg affiché dans l’en-tête', () => {
    const config = loadCmsConfig() as {
      app_title?: string;
      logo?: { src?: string; show_in_header?: boolean };
    };
    expect(config.app_title).toBe('benCat · Studio');
    expect(config.logo).toEqual({ src: '/admin/logo.svg', show_in_header: true });
    // `logo.src` est une URL servie depuis `public/` : le fichier doit y être.
    expect(existsSync(new URL('../../public/admin/logo.svg', import.meta.url))).toBe(true);
    // Onglet du navigateur avant le chargement de Sveltia (page d'entrée).
    const page = readRepoFile('src/pages/admin/index.astro');
    expect(page).toMatch(/<title>benCat · Studio<\/title>/);
  });

  it('le logo reprend la tuile 28×28 de l’en-tête aux couleurs accent/accentSoft des deux thèmes', () => {
    const svg = readRepoFile('public/admin/logo.svg');
    const root = svg.match(/<svg\b[^>]*>/)?.[0] ?? '';
    expect(attrs(root).viewBox).toBe('0 0 28 28');

    // Tuile + 3 barres, rien d'autre (ni texte, ni tracé, ni image).
    const shapes = [...svg.matchAll(/<(rect|path|circle|ellipse|line|polyline|polygon|text|image|use)\b[^>]*>/g)];
    expect(shapes.map((m) => m[1])).toEqual(['rect', 'rect', 'rect', 'rect']);
    const [tile, ...bars] = shapes.map((m) => attrs(m[0]));

    // Tuile de src/components/Header.astro : 28×28, rayon 9 (`--radius-badge`).
    expect(tile).toMatchObject({ class: 'tile', width: '28', height: '28', rx: '9' });
    expect(Number(tile.x ?? 0)).toBe(0);
    expect(Number(tile.y ?? 0)).toBe(0);

    // Barres : hauteur 3, largeur intérieure 14 (padding 7), 100/60/82 %,
    // opacités 1/.7/.45, écart 3, colonne centrée verticalement.
    expect(bars.map((b) => b.class)).toEqual(['bar', 'bar', 'bar']);
    expect(bars.map((b) => Number(b.height))).toEqual([3, 3, 3]);
    expect(bars.map((b) => Number(b.x))).toEqual([7, 7, 7]);
    expect(bars.map((b) => Number(b.width))).toEqual([14, 14 * 0.6, 14 * 0.82].map((w) => Number(w.toFixed(2))));
    expect(bars.map((b) => Number(b.opacity ?? 1))).toEqual([1, 0.7, 0.45]);
    const top = (28 - (3 * 3 + 2 * 3)) / 2;
    expect(bars.map((b) => Number(b.y))).toEqual([top, top + 6, top + 12]);

    // Couleurs : celles de global.css, thème clair par défaut, sombre sous
    // `prefers-color-scheme: dark` (un SVG en <img> ne voit pas data-theme).
    const style = svg.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
    const darkAt = style.search(/@media\s*\(\s*prefers-color-scheme:\s*dark\s*\)/);
    expect(darkAt).toBeGreaterThan(-1);
    const light = fills(style.slice(0, darkAt));
    const dark = fills(style.slice(darkAt));
    const themes = readThemeTokens(readRepoFile('src/styles/global.css'));
    for (const [name, got] of [
      ['light', light],
      ['dark', dark],
    ] as const) {
      expect(got.tile, `${name} .tile fill`).toBeDefined();
      expect(got.bar, `${name} .bar fill`).toBeDefined();
      expect(parseColor(got.tile!), `${name} tile = accentSoft`).toEqual(themes[name].accentSoft);
      expect(parseColor(got.bar!), `${name} bars = accent`).toEqual(themes[name].accent);
    }
  });
});
