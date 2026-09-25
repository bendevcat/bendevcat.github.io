/**
 * Outils d'arbre des aperçus `/admin/` (plan 21, T3 ; R2, R3, R8).
 *
 * Les gabarits sont des fonctions pures `(data, h) => arbre` : dans l'aperçu,
 * `h` est le `React.createElement` que pose Sveltia (`window.h`) ; hors
 * navigateur (tests, scripts/check-previews.mjs), c'est `treeH` ci-dessous,
 * qui construit un arbre d'objets simples — les enfants passés en tableau
 * (listes `.map`) y restent des tableaux, pour que les tests vérifient les
 * `key` comme React le ferait.
 *
 * - `renderToHtml` sérialise cet arbre comme React DOM le ferait des mêmes
 *   props (`className` → `class`, `htmlFor` → `for`, style objet → CSS,
 *   `dangerouslySetInnerHTML`, `data-*`/`aria-*` en chaîne, booléens).
 * - `parseHtml` lit du HTML bien formé (le HTML du build du site, celui que
 *   produit `renderToHtml`) en nœuds simples ; `findAll`/`hasAttr` y
 *   sélectionnent les régions (crochets `data-*` des pages).
 * - `textContent` : texte brut, comme `Node.textContent`.
 * - `regionText` : le texte d'une région selon la règle de R8 — nœuds texte
 *   hors `button`, `[hidden]`, `input`, `svg`, `script` ; NBSP → espace ;
 *   blancs réduits. Les nœuds texte sont joints par une espace : le blanc
 *   entre deux balises (présent au build d'Astro, absent de React) ne change
 *   ainsi pas le texte comparé.
 *
 * Aucune dépendance, aucun accès à `window`/`document` : chargeable dans
 * Node comme dans le navigateur.
 */

/** Signature de `h` attendue par les gabarits (celle de `React.createElement`). */
export type H<N = unknown> = (type: string, props: Record<string, unknown> | null, ...children: unknown[]) => N;

/** Élément de l'arbre construit par `treeH`. */
export interface TreeElement {
  type: string;
  /** `key` React, retirée des props comme le fait React. */
  key: string | null;
  props: Record<string, unknown>;
  /** Enfants tels que passés à `h` (un tableau reste un tableau). */
  children: unknown[];
}

/** `h` hors navigateur : un arbre d'objets simples, sans React. */
export const treeH: H<TreeElement> = (type, props, ...children) => {
  const { key, ...rest } = props ?? {};
  return { type, key: key === undefined || key === null ? null : String(key), props: rest, children };
};

export function isTreeElement(value: unknown): value is TreeElement {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as TreeElement).type === 'string' &&
    Array.isArray((value as TreeElement).children)
  );
}

const VOID = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/** Contenu brut : pas de balise reconnue avant la fermeture. */
const RAW_TEXT = new Set(['script', 'style', 'textarea', 'title']);

const PROP_NAMES: Record<string, string> = { className: 'class', htmlFor: 'for' };

export function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** `boxShadow` → `box-shadow` ; une propriété `--x` reste telle quelle. */
const cssName = (name: string) => (name.startsWith('--') ? name : name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`));

function styleText(style: Record<string, unknown>): string {
  return Object.entries(style)
    .filter(([, value]) => value !== null && value !== undefined && value !== false && value !== '')
    .map(([name, value]) => `${cssName(name)}:${String(value)}`)
    .join(';');
}

function attrText(name: string, value: unknown): string {
  if (value === null || value === undefined) return '';
  if (name === 'style') {
    const css = typeof value === 'object' ? styleText(value as Record<string, unknown>) : String(value);
    return css ? ` style="${escapeAttr(css)}"` : '';
  }
  const attr = PROP_NAMES[name] ?? name;
  // React : `data-*` et `aria-*` reçoivent la chaîne de la valeur, booléens compris.
  if (attr.startsWith('data-') || attr.startsWith('aria-')) return ` ${attr}="${escapeAttr(String(value))}"`;
  if (value === false || typeof value === 'function') return '';
  if (value === true) return ` ${attr}=""`;
  return ` ${attr}="${escapeAttr(String(value))}"`;
}

function childrenHtml(children: readonly unknown[]): string {
  return children.map((child) => renderToHtml(child)).join('');
}

/** HTML d'un arbre de `treeH` (texte échappé ; `dangerouslySetInnerHTML` recopié). */
export function renderToHtml(node: unknown): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string') return escapeText(node);
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return childrenHtml(node);
  if (!isTreeElement(node)) throw new Error(`renderToHtml : nœud inattendu ${JSON.stringify(node)}`);
  const { type, props, children } = node;
  const attrs = Object.entries(props)
    .filter(([name]) => name !== 'children' && name !== 'dangerouslySetInnerHTML')
    .map(([name, value]) => attrText(name, value))
    .join('');
  if (VOID.has(type)) return `<${type}${attrs}>`;
  const inner = props.dangerouslySetInnerHTML as { __html?: unknown } | undefined;
  const content =
    inner && typeof inner.__html === 'string'
      ? inner.__html
      : childrenHtml(children.length > 0 ? children : props.children === undefined ? [] : [props.children]);
  return `<${type}${attrs}>${content}</${type}>`;
}

/* ------------------------------------------------------------------------ */
/* Lecture du HTML                                                           */
/* ------------------------------------------------------------------------ */

export interface HtmlElement {
  tag: string;
  /** Attributs décodés ; `''` pour un attribut sans valeur. */
  attrs: Record<string, string>;
  children: HtmlNode[];
}

/** Texte (décodé) ou élément. */
export type HtmlNode = string | HtmlElement;

const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  copy: '©',
  rarr: '→',
  larr: '←',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  laquo: '«',
  raquo: '»',
};

export function decodeEntities(text: string): string {
  return text.replace(/&(?:#x([0-9a-f]+)|#([0-9]+)|([a-z]+));/gi, (all, hex, dec, name) => {
    if (hex) return String.fromCodePoint(Number.parseInt(hex, 16));
    if (dec) return String.fromCodePoint(Number.parseInt(dec, 10));
    return NAMED[name] ?? all;
  });
}

/** Balise ouvrante (valeurs entre guillemets : un `>` y est permis). */
const START_TAG = /^<([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/;
const END_TAG = /^<\/([a-zA-Z][\w:-]*)\s*>/;
const ATTR = /([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function parseAttrs(text: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const [, name, dq, sq, bare] of text.matchAll(ATTR)) {
    const key = name.toLowerCase();
    if (!Object.hasOwn(attrs, key)) attrs[key] = decodeEntities(dq ?? sq ?? bare ?? '');
  }
  return attrs;
}

/**
 * Nœuds d'un HTML bien formé (pas de balise fermante omise). Commentaires et
 * doctype ignorés ; une fermeture sans ouvrante ignorée ; `/>` ferme
 * l'élément (SVG).
 */
export function parseHtml(html: string): HtmlNode[] {
  const root: HtmlElement = { tag: '#root', attrs: {}, children: [] };
  const stack: HtmlElement[] = [root];
  const top = () => stack[stack.length - 1];
  const pushText = (text: string) => {
    if (text === '') return;
    const children = top().children;
    const last = children[children.length - 1];
    if (typeof last === 'string') children[children.length - 1] = last + decodeEntities(text);
    else children.push(decodeEntities(text));
  };

  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) {
      pushText(html.slice(i));
      break;
    }
    pushText(html.slice(i, lt));
    const rest = html.slice(lt);
    if (rest.startsWith('<!--')) {
      const end = html.indexOf('-->', lt + 4);
      i = end === -1 ? html.length : end + 3;
      continue;
    }
    if (rest.startsWith('<!') || rest.startsWith('<?')) {
      const end = html.indexOf('>', lt);
      i = end === -1 ? html.length : end + 1;
      continue;
    }
    const close = END_TAG.exec(rest);
    if (close) {
      const tag = close[1].toLowerCase();
      const at = stack.map((el) => el.tag).lastIndexOf(tag);
      if (at > 0) stack.length = at;
      i = lt + close[0].length;
      continue;
    }
    const open = START_TAG.exec(rest);
    if (!open) {
      pushText('<');
      i = lt + 1;
      continue;
    }
    const tag = open[1].toLowerCase();
    const selfClosing = /\/\s*$/.test(open[2]);
    const element: HtmlElement = { tag, attrs: parseAttrs(open[2].replace(/\/\s*$/, '')), children: [] };
    top().children.push(element);
    i = lt + open[0].length;
    if (VOID.has(tag) || selfClosing) continue;
    if (RAW_TEXT.has(tag)) {
      const end = html.toLowerCase().indexOf(`</${tag}`, i);
      const stop = end === -1 ? html.length : end;
      if (stop > i) element.children.push(tag === 'script' || tag === 'style' ? html.slice(i, stop) : decodeEntities(html.slice(i, stop)));
      const gt = end === -1 ? -1 : html.indexOf('>', end);
      i = gt === -1 ? html.length : gt + 1;
      continue;
    }
    stack.push(element);
  }
  return root.children;
}

/** Éléments (en profondeur, ordre du document) qui vérifient `test`. */
export function findAll(nodes: readonly HtmlNode[], test: (el: HtmlElement) => boolean): HtmlElement[] {
  const found: HtmlElement[] = [];
  const walk = (list: readonly HtmlNode[]) => {
    for (const node of list) {
      if (typeof node === 'string') continue;
      if (test(node)) found.push(node);
      walk(node.children);
    }
  };
  walk(nodes);
  return found;
}

/** Prédicat : l'élément porte l'attribut `name` (de valeur `value` si donnée). */
export const hasAttr =
  (name: string, value?: string) =>
  (el: HtmlElement): boolean =>
    Object.hasOwn(el.attrs, name) && (value === undefined || el.attrs[name] === value);

/** Texte brut d'un nœud ou d'une liste de nœuds (comme `textContent`). */
export function textContent(node: HtmlNode | readonly HtmlNode[]): string {
  if (typeof node === 'string') return node;
  const list = Array.isArray(node) ? (node as readonly HtmlNode[]) : (node as HtmlElement).children;
  return list.map((child) => textContent(child)).join('');
}

/** Sous-arbres dont le texte n'est pas compté (R8). */
const SKIPPED = new Set(['button', 'input', 'svg', 'script']);

function isSkipped(el: HtmlElement): boolean {
  return SKIPPED.has(el.tag) || Object.hasOwn(el.attrs, 'hidden');
}

/**
 * Texte d'une région selon R8 : nœuds texte hors `button`, `[hidden]`,
 * `input`, `svg`, `script` (l'élément de départ compris), joints par une
 * espace ; NBSP → espace ; blancs réduits à une espace, bords rognés.
 */
export function regionText(node: HtmlNode | readonly HtmlNode[]): string {
  const texts: string[] = [];
  const walk = (current: HtmlNode | readonly HtmlNode[]) => {
    if (typeof current === 'string') {
      texts.push(current);
      return;
    }
    if (Array.isArray(current)) {
      for (const child of current as readonly HtmlNode[]) walk(child);
      return;
    }
    const el = current as HtmlElement;
    if (isSkipped(el)) return;
    walk(el.children);
  };
  walk(node);
  return texts.join(' ').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

/** Nœuds HTML d'un arbre de gabarit (via `renderToHtml`). */
export function treeNodes(tree: unknown): HtmlNode[] {
  return parseHtml(renderToHtml(tree));
}
