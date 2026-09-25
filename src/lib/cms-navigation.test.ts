import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import Ajv from 'ajv';
import { parse } from 'yaml';
import { z } from 'astro:content';
import { PROJECT_STATUSES, PROMPT_FORMATS, collections } from '../content.config';
import { parseColor, readThemeTokens } from './contrast';
import { PROJECT_STATUS_META } from './projectStatus';

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

/* ------------------------------------------------------------------------- */
/* Listes des collections (plan 20, T3) : icônes, résumés, vignettes, tris,    */
/* filtres et groupes. Chaque règle lit ce qu'elle compare dans le schéma Zod  */
/* (`src/content.config.ts`) ou dans le contenu sur disque — jamais une liste  */
/* recopiée ici.                                                               */
/* ------------------------------------------------------------------------- */

type CollectionName = keyof typeof collections;
const COLLECTION_NAMES = ['blog', 'projects', 'prompts', 'skills'] as const satisfies readonly CollectionName[];

interface CmsField {
  name: string;
  widget: string;
  options?: Array<string | { label: string; value: string }>;
}
interface ViewOption {
  name?: string;
  label: string;
  field: string;
  pattern?: string;
  eq?: unknown;
  ne?: unknown;
  empty?: boolean;
  [operator: string]: unknown;
}
interface CmsCollection {
  name: string;
  icon?: string;
  summary?: string;
  thumbnail?: string | boolean | string[];
  sortable_fields?: { fields: string[]; default?: { field: string; direction?: string } } | string[];
  view_filters?: ViewOption[];
  view_groups?: ViewOption[];
  fields: CmsField[];
}

function cmsCollection(name: CollectionName): CmsCollection {
  const config = loadCmsConfig() as { collections: CmsCollection[] };
  const found = config.collections.find((c) => c.name === name);
  if (!found) throw new Error(`collection ${name} absente de config.yml`);
  return found;
}

/** Objet Zod d'une collection (`image()` factice : seules les clés et les enums comptent ici). */
function zodShape(name: CollectionName): Record<string, unknown> {
  const raw: any = collections[name].schema;
  const schema = typeof raw === 'function' ? raw({ image: () => z.string() }) : raw;
  return schema.shape;
}

/** Clés Zod + `body`, comme `schemaFieldNames` de cms-config.test.ts. */
function zodKeys(name: CollectionName): string[] {
  return [...Object.keys(zodShape(name)), 'body'];
}

/** Champs de la collection qui existent À LA FOIS dans le CMS et dans le schéma Zod. */
function sharedFields(name: CollectionName): Map<string, CmsField> {
  const keys = new Set(zodKeys(name));
  return new Map(cmsCollection(name).fields.filter((f) => keys.has(f.name)).map((f) => [f.name, f]));
}

/** Valeurs d'un enum Zod, `optional()` / `default()` déballés. */
function zodEnumValues(name: CollectionName, key: string): string[] {
  let t: any = zodShape(name)[key];
  while (t && !Array.isArray(t.options)) t = t._def?.innerType ?? t._def?.schema;
  if (!t) throw new Error(`${name}.${key} n'est pas un enum Zod`);
  return [...t.options];
}

/** Valeurs stockées d'un champ select du CMS. */
function optionValues(field: CmsField): string[] {
  return (field.options ?? []).map((o) => (typeof o === 'string' ? o : o.value));
}

/**
 * Étiquettes `{{…}}` d'un résumé, découpées comme Sveltia 0.221
 * (`services/common/transformations.js` : séparateur `\s*\|\s*`).
 */
function summaryTags(summary: string): Array<{ key: string; transformations: string[] }> {
  return [...summary.matchAll(/{{(.+?)}}/g)].map(([, tag]) => {
    const [key, ...transformations] = tag.trim().split(/\s*\|\s*/);
    return { key, transformations };
  });
}

/** Opérateurs de comparaison d'un filtre/groupe Sveltia (`services/common/view.js`). */
const COMPARISON_OPERATORS = ['eq', 'ne', 'lt', 'lte', 'gt', 'gte', 'in', 'not_in', 'empty'];

/** Conditions d'une option de vue, sans `name` ni `label` (comme `getViewConditions`). */
function conditions(option: ViewOption): Record<string, unknown> {
  return Object.fromEntries(Object.entries(option).filter(([k]) => k !== 'name' && k !== 'label'));
}

/** Frontmatter YAML des entrées d'une collection, lu sur disque (même lib `yaml` que Sveltia). */
function contentFrontmatter(folder: string): Array<{ slug: string; data: Record<string, unknown> }> {
  const base = new URL(`../../src/content/${folder}/`, import.meta.url);
  return readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(new URL(`${d.name}/index.md`, base)))
    .map((d) => {
      const text = readFileSync(new URL(`${d.name}/index.md`, base), 'utf8');
      const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
      return { slug: d.name, data: parse(fm) ?? {} };
    });
}

describe('config du CMS — icônes (R4)', () => {
  it('une icône Material Symbols par collection : article, rocket_launch, terminal, extension', () => {
    expect(Object.fromEntries(COLLECTION_NAMES.map((n) => [n, cmsCollection(n).icon]))).toEqual({
      blog: 'article',
      projects: 'rocket_launch',
      prompts: 'terminal',
      skills: 'extension',
    });
  });
});

describe('config du CMS — résumés des lignes (R6)', () => {
  it('chaque résumé ne cite que des champs de sa collection, présents dans le schéma Zod', () => {
    for (const name of COLLECTION_NAMES) {
      const summary = cmsCollection(name).summary;
      expect(summary, `${name}.summary`).toBeTypeOf('string');
      const fields = sharedFields(name);
      const tags = summaryTags(summary!);
      expect(tags.length, `${name} : au moins une étiquette`).toBeGreaterThan(0);
      for (const { key, transformations } of tags) {
        // Un champ du CMS ET du Zod : sinon Sveltia l'affiche vide sans rien dire.
        expect(fields.has(key), `${name}.summary cite « ${key} », absent du CMS ou du Zod`).toBe(true);
        for (const tf of transformations) {
          const method = tf.match(/^(\w+)\(/)?.[1];
          expect(['date', 'ternary'], `${name}.summary : transformation « ${tf} »`).toContain(method);
          if (method === 'date') {
            expect(fields.get(key)!.widget, `${name}.summary : date() sur ${key}`).toBe('datetime');
          }
          // ⭐ et 📝 réservés à featured et draft (et réciproquement).
          if (tf.includes('⭐')) expect(key, `${name} : ⭐ hors featured`).toBe('featured');
          if (tf.includes('📝')) expect(key, `${name} : 📝 hors draft`).toBe('draft');
          if (key === 'featured' || key === 'draft') {
            expect(tf).toBe(key === 'featured' ? "ternary(' ⭐','')" : "ternary(' 📝','')");
          }
        }
      }
      // Toute collection qui a le champ le montre : 📝 si `draft`, ⭐ si `featured`.
      const keys = tags.map((t) => t.key);
      expect(keys.includes('draft'), `${name} : 📝 ⇔ champ draft`).toBe(fields.has('draft'));
      expect(keys.includes('featured'), `${name} : ⭐ ⇔ champ featured`).toBe(fields.has('featured'));
      // Le résumé commence par le titre, comme la ligne par défaut.
      expect(keys[0], `${name} : commence par le titre`).toBe('title');
    }
  });

  it('écrit les quatre résumés du tableau du plan', () => {
    expect(Object.fromEntries(COLLECTION_NAMES.map((n) => [n, cmsCollection(n).summary]))).toEqual({
      blog: "{{title}} · {{pubDate | date('YYYY-MM-DD')}} · {{category}}{{draft | ternary(' 📝','')}}{{featured | ternary(' ⭐','')}}",
      projects: "{{title}} · {{status}}{{featured | ternary(' ⭐','')}}",
      prompts: "{{title}} · {{format}} · {{tool}}{{version | ternary(' v','')}}{{version}}{{draft | ternary(' 📝','')}}",
      skills: "{{title}}{{version | ternary(' · v','')}}{{version}}{{license | ternary(' · ','')}}{{license}}{{draft | ternary(' 📝','')}}",
    });
  });
});

describe('config du CMS — vignettes (R8)', () => {
  it('vignettes : cover pour articles et projets, aucune pour prompts et skills', () => {
    for (const name of ['blog', 'projects'] as const) {
      expect(cmsCollection(name).thumbnail, `${name}.thumbnail`).toBe('cover');
      expect(sharedFields(name).get('cover')?.widget, `${name}.cover est un champ image`).toBe('image');
    }
    for (const name of ['prompts', 'skills'] as const) {
      expect(cmsCollection(name).thumbnail, `${name}.thumbnail`).toBe(false);
    }
  });
});

describe('config du CMS — tri par défaut (R10)', () => {
  it('tri par défaut : pubDate ↓, startDate ↓, updated ↓, title ↑', () => {
    const sorts = Object.fromEntries(COLLECTION_NAMES.map((n) => [n, cmsCollection(n).sortable_fields]));
    expect(sorts).toEqual({
      blog: { fields: ['pubDate', 'updatedDate', 'title'], default: { field: 'pubDate', direction: 'descending' } },
      projects: { fields: ['startDate', 'title'], default: { field: 'startDate', direction: 'descending' } },
      prompts: { fields: ['updated', 'title'], default: { field: 'updated', direction: 'descending' } },
      skills: { fields: ['title'], default: { field: 'title', direction: 'ascending' } },
    });
    for (const name of COLLECTION_NAMES) {
      const sort = cmsCollection(name).sortable_fields as { fields: string[]; default: { field: string } };
      const fields = sharedFields(name);
      for (const key of sort.fields) {
        expect(fields.has(key), `${name}.sortable_fields : « ${key} » absent du CMS ou du Zod`).toBe(true);
      }
      // Sveltia 0.221 (`getSortConfig`) retombe sur la 1re clé si le défaut n'est pas listé.
      expect(sort.fields, `${name} : le tri par défaut est un champ triable`).toContain(sort.default.field);
    }
  });
});

describe('config du CMS — filtres prédéfinis (R12)', () => {
  const filters = (name: CollectionName): ViewOption[] => cmsCollection(name).view_filters ?? [];
  const byLabel = (name: CollectionName, label: string) => filters(name).find((f) => f.label === label);

  it('filtres Brouillons / Publiés sur chaque collection qui a un champ draft', () => {
    for (const name of COLLECTION_NAMES) {
      const onDraft = filters(name).filter((f) => f.field === 'draft');
      if (zodKeys(name).includes('draft')) {
        // `ne: true` garde aussi une entrée SANS clé `draft` (publiée par défaut côté Zod).
        expect(onDraft.map(conditions), name).toEqual([
          { field: 'draft', eq: true },
          { field: 'draft', ne: true },
        ]);
        expect(onDraft.map((f) => f.label), name).toEqual(['Brouillons', 'Publiés']);
      } else {
        // Projets : pas de `draft` au schéma ; Sveltia refuserait un filtre sur un champ non déclaré.
        expect(onDraft, `${name} n'a pas de champ draft`).toEqual([]);
      }
    }
  });

  it('un filtre par statut de PROJECT_STATUSES', () => {
    const onStatus = filters('projects').filter((f) => f.field === 'status');
    expect(onStatus.map(conditions)).toEqual(PROJECT_STATUSES.map((s) => ({ field: 'status', eq: s })));
    // Libellés = ceux des puces de statut du site.
    expect(onStatus.map((f) => f.label)).toEqual(PROJECT_STATUSES.map((s) => PROJECT_STATUS_META[s].label));
  });

  it('Fiches et Guides couvrent PROMPT_FORMATS', () => {
    const onFormat = filters('prompts').filter((f) => f.field === 'format');
    expect(onFormat.map(conditions)).toEqual(PROMPT_FORMATS.map((v) => ({ field: 'format', eq: v })));
    const labels: Record<(typeof PROMPT_FORMATS)[number], string> = { fiche: 'Fiches', guide: 'Guides' };
    expect(onFormat.map((f) => f.label)).toEqual(PROMPT_FORMATS.map((v) => labels[v]));
  });

  it('filtres IA partielle / IA totale pris dans l’enum aiUsage du schéma', () => {
    const levels = zodEnumValues('blog', 'aiUsage');
    const partial = byLabel('blog', 'IA partielle');
    const full = byLabel('blog', 'IA totale');
    expect(partial && conditions(partial)).toEqual({ field: 'aiUsage', eq: 'partial' });
    expect(full && conditions(full)).toEqual({ field: 'aiUsage', eq: 'full' });
    expect(levels).toContain(partial!.eq);
    expect(levels).toContain(full!.eq);
  });

  it('Mis en avant et Sans couverture visent featured et cover', () => {
    const featured = byLabel('blog', 'Mis en avant');
    const noCover = byLabel('blog', 'Sans couverture');
    expect(featured && conditions(featured)).toEqual({ field: 'featured', eq: true });
    // `empty: true` : clé absente, null, '' ou [] (Sveltia `isValueEmpty`).
    expect(noCover && conditions(noCover)).toEqual({ field: 'cover', empty: true });
    expect(filters('blog').map((f) => f.label)).toEqual([
      'Brouillons',
      'Publiés',
      'Mis en avant',
      'Sans couverture',
      'IA partielle',
      'IA totale',
    ]);
    expect(filters('skills').map((f) => f.label)).toEqual(['Brouillons', 'Publiés']);
  });

  it('chaque filtre et chaque groupe désigne un champ de sa collection', () => {
    for (const name of COLLECTION_NAMES) {
      const fields = sharedFields(name);
      const coll = cmsCollection(name);
      for (const [kind, options] of [
        ['filtre', coll.view_filters ?? []],
        ['groupe', coll.view_groups ?? []],
      ] as const) {
        // Forme tableau, `name` unique et valide (Sveltia `checkName` : /^[^\s.*:<>]+$/).
        expect(Array.isArray(options), `${name} : ${kind}s en tableau`).toBe(true);
        const names = options.map((o) => o.name);
        expect(names.every((n) => typeof n === 'string' && /^[^\s.*:<>]+$/.test(n)), `${name} : noms`).toBe(true);
        expect(new Set(names).size, `${name} : noms uniques`).toBe(names.length);
        for (const option of options) {
          const where = `${name} ${kind} « ${option.label} »`;
          const field = fields.get(option.field);
          expect(field, `${where} : « ${option.field} » absent du CMS ou du Zod`).toBeDefined();
          const operators = COMPARISON_OPERATORS.filter((op) => option[op] !== undefined);
          // Un filtre sans condition est une erreur de config Sveltia.
          if (kind === 'filtre') expect(operators.length + (option.pattern ? 1 : 0), where).toBeGreaterThan(0);
          for (const op of ['eq', 'ne'] as const) {
            if (option[op] === undefined) continue;
            if (field!.widget === 'select') {
              // Valeur mal orthographiée (`archive`) = filtre toujours vide.
              expect(optionValues(field!), `${where} : ${op}`).toContain(option[op]);
            }
            if (field!.widget === 'boolean') expect(option[op], `${where} : ${op} booléen`).toBeTypeOf('boolean');
          }
        }
      }
    }
  });
});

describe('config du CMS — groupes (R14)', () => {
  it('groupes : articles par année et par catégorie, projets par statut, prompts par outil', () => {
    expect(Object.fromEntries(COLLECTION_NAMES.map((n) => [n, cmsCollection(n).view_groups]))).toEqual({
      blog: [
        { name: 'year', label: 'Année', field: 'pubDate', pattern: '^\\d{4}' },
        { name: 'category', label: 'Catégorie', field: 'category' },
      ],
      projects: [{ name: 'status', label: 'Statut', field: 'status' }],
      prompts: [{ name: 'tool', label: 'Outil', field: 'tool' }],
      skills: undefined,
    });
  });

  it('le motif Année extrait l’année de chaque pubDate du contenu', () => {
    const year = cmsCollection('blog').view_groups!.find((g) => g.label === 'Année')!;
    // Sveltia groupe par le PREMIER match du motif sur la valeur brute (`buildGroupMap`).
    const regex = new RegExp(year.pattern!);
    const posts = contentFrontmatter('blog');
    expect(posts.length).toBeGreaterThan(0);
    for (const { slug, data } of posts) {
      const raw = String(data.pubDate);
      const isoYear = raw.match(/^(\d{4})-\d{2}-\d{2}/)?.[1];
      expect(isoYear, `${slug} : pubDate ISO`).toBeDefined();
      expect(raw.match(regex)?.[0], `${slug} : année de ${raw}`).toBe(isoYear);
    }
  });
});
