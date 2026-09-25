// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { diskEntries, type DiskEntry } from './diskEntries';
import { isTreeElement, treeH, type H, type TreeElement } from './html';
import { articlePreview } from './article';
import { projectPreview } from './project';
import { promptPreview } from './prompt';
import { skillPreview } from './skill';

/**
 * Gabarits d'aperçu `/admin/` (plan 21, R2) : fonctions pures `(data, h)`
 * qui produisent des props React valides. Chaque gabarit est appelé sur
 * chaque entrée réelle de sa collection, lue sur le disque (D131). Un
 * gabarit par collection de contenu dans `TEMPLATES`.
 */
type Template = (data: never, h: H<TreeElement>) => TreeElement;

const TEMPLATES: Record<string, Template> = {
  blog: articlePreview as Template,
  projects: projectPreview as Template,
  prompts: promptPreview as Template,
  skills: skillPreview as Template,
};

const entries = (await diskEntries()).filter((entry) => Object.hasOwn(TEMPLATES, entry.collection));

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

/** Appelle `run` avec `window` et `document` piégés : tout accès est relevé. */
function withoutBrowser<T>(run: () => T): { result: T; touched: string[] } {
  const touched: string[] = [];
  const scope = globalThis as Record<string, unknown>;
  for (const name of ['window', 'document']) {
    expect(Object.hasOwn(scope, name), `${name} existe déjà : environnement node attendu`).toBe(false);
    Object.defineProperty(scope, name, {
      configurable: true,
      get() {
        touched.push(name);
        return undefined;
      },
    });
  }
  try {
    return { result: run(), touched };
  } finally {
    delete scope.window;
    delete scope.document;
  }
}

/** Noms d'attributs HTML que React veut sous un autre nom (sinon avertissement). */
const HTML_NAMES = new Set([
  'class',
  'for',
  'tabindex',
  'readonly',
  'maxlength',
  'minlength',
  'autocomplete',
  'autofocus',
  'spellcheck',
  'srcset',
  'crossorigin',
  'colspan',
  'rowspan',
  'contenteditable',
  'datetime',
  'enterkeyhint',
  'inputmode',
  'novalidate',
  'referrerpolicy',
  'viewbox',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'fill-rule',
  'clip-rule',
]);

/** Écarts aux conventions de props React dans un arbre de `treeH`. */
function reactPropProblems(tree: unknown, path = 'racine'): string[] {
  if (Array.isArray(tree)) return tree.flatMap((child, i) => reactPropProblems(child, `${path}[${i}]`));
  if (!isTreeElement(tree)) return [];
  const problems: string[] = [];
  const here = `${path} <${tree.type}>`;
  for (const [name, value] of Object.entries(tree.props)) {
    if (HTML_NAMES.has(name)) problems.push(`${here} : prop « ${name} » (nom React attendu)`);
    if (name === 'style' && (typeof value !== 'object' || value === null || Array.isArray(value))) {
      problems.push(`${here} : style doit être un objet`);
    }
    if (/^on[a-z]/.test(name)) problems.push(`${here} : gestionnaire « ${name} » en minuscules`);
  }
  if (tree.props.dangerouslySetInnerHTML !== undefined && tree.children.length > 0) {
    problems.push(`${here} : dangerouslySetInnerHTML et des enfants`);
  }
  tree.children.forEach((child, i) => {
    if (Array.isArray(child)) {
      // Enfants passés en tableau (liste) : chaque élément a une `key` unique.
      const keys = new Set<string>();
      child.forEach((item, j) => {
        if (!isTreeElement(item)) return;
        if (item.key === null) problems.push(`${here}[${i}][${j}] <${item.type}> : key manquante dans une liste`);
        else if (keys.has(item.key)) problems.push(`${here}[${i}][${j}] <${item.type}> : key « ${item.key} » en double`);
        else keys.add(item.key);
      });
    }
    problems.push(...reactPropProblems(child, `${here}[${i}]`));
  });
  return problems;
}

describe('gabarits d’aperçu : fonctions pures aux props React', () => {
  it('couvre des entrées réelles de chaque collection gabaritée', () => {
    for (const collection of Object.keys(TEMPLATES)) {
      expect(
        entries.filter((entry: DiskEntry) => entry.collection === collection).length,
        collection,
      ).toBeGreaterThan(0);
    }
  });

  it('chaque gabarit est une fonction pure (data, h) : même entrée, même arbre, sans window ni document', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
    for (const entry of entries) {
      const template = TEMPLATES[entry.collection];
      const snapshot = structuredClone(entry.data);
      // Données gelées : toute écriture du gabarit lève (modules ESM : mode strict).
      const data = deepFreeze(structuredClone(entry.data));
      const { result: first, touched } = withoutBrowser(() => [template(data as never, treeH), template(data as never, treeH)]);
      expect(touched, entry.name).toEqual([]);
      expect(first[1], entry.name).toEqual(first[0]);
      expect(first[1], entry.name).not.toBe(first[0]);
      expect(data, entry.name).toEqual(snapshot);
      // Un nouvel objet de mêmes valeurs donne le même arbre.
      expect(template(structuredClone(entry.data) as never, treeH), entry.name).toEqual(first[0]);
    }
  });

  it('produit des props React : className, htmlFor, style objet, key unique dans chaque liste', () => {
    for (const entry of entries) {
      const tree = TEMPLATES[entry.collection](entry.data as never, treeH);
      expect(reactPropProblems(tree), entry.name).toEqual([]);
      // Racine unique, marquée du nom de la collection (R9).
      expect(tree.props['data-preview'], entry.name).toBe(entry.collection);
    }
  });

  it('le contrôle des props relève class, for, style texte et key manquante ou en double', () => {
    const item = (key?: string) => treeH('li', key === undefined ? null : { key }, 'x');
    expect(reactPropProblems(treeH('div', { className: 'a', htmlFor: 'b', style: { color: 'red' } }))).toEqual([]);
    expect(reactPropProblems(treeH('div', { class: 'a' }))).toHaveLength(1);
    expect(reactPropProblems(treeH('label', { for: 'b' }))).toHaveLength(1);
    expect(reactPropProblems(treeH('div', { style: 'color: red' }))).toHaveLength(1);
    expect(reactPropProblems(treeH('ul', null, [item('a'), item('b')]))).toEqual([]);
    expect(reactPropProblems(treeH('ul', null, [item('a'), item()]))).toHaveLength(1);
    expect(reactPropProblems(treeH('ul', null, [item('a'), item('a')]))).toHaveLength(1);
    // Enfants passés un par un (pas une liste) : pas de key requise, comme React.
    expect(reactPropProblems(treeH('ul', null, item(), item()))).toEqual([]);
    // En profondeur aussi.
    expect(reactPropProblems(treeH('div', null, treeH('p', null, [item()])))).toHaveLength(1);
  });
});
