#!/usr/bin/env node
/**
 * Contrôle de fidélité sur la sortie de build (Plan 18, critère R10). À lancer
 * après `npm run build` :
 *
 *   node scripts/check-fidelity.mjs
 *
 * Imprime sur stdout, dans cet ordre, une ligne par règle du plan 18 :
 *
 *   home: rows and columns <n> px apart · <k>/4 headers title then badge, right-aligned
 *   about: links <texte> | <texte> · Pourquoi ce site left border <w> px <jeton> · <n> row-2 cards · no contact card
 *   lang: <n> English description (<ids>) · <k>/<m> renderings inside lang="en"
 *   no-js: #theme-toggle hidden without data-js · [data-search-open] hidden on <k>/<n> pages · <d> variable defaults as text (<pages>)
 *   prompt tags: <n> chips on <p> pages · all → /tags/<slug>/ and resolve
 *   rail: Catégories label <g> px above its rows on <k>/<n> pages
 *   skill aside: scroll padding bottom ≥ 6 px on <k>/<n>
 *
 * Les erreurs sont collectées puis imprimées sur stderr APRÈS toutes les
 * lignes de stdout. Code de sortie 1 s'il y en a au moins une :
 * - accueil : `<main>` ou l'une des deux grilles dont un `gap` (toutes
 *   variantes, `lg:` comprise) ne vaut pas 16 px ; un en-tête de bloc
 *   (`Derniers articles`, Projets, Prompts, Skills) qui n'est pas « titre
 *   (`flex:1`, `text-align:right`) puis badge `aria-hidden` à 10 px », ou
 *   dont la rangée est inversée ;
 * - à propos : un lien d'identité en plus ou en moins (attendu exactement
 *   `github.com/bendevcat` puis `rss.xml`), un `mailto:` ou `linkedin` dans
 *   la page, une carte `On parle ?` ; `Pourquoi ce site` sans filet gauche
 *   3 px `accent`, ou un autre côté dont la bordure n'est plus celle de
 *   `.card` ; ce filet sur une autre carte ; la rangée 2 sans ses 2 cartes ;
 * - langue : une description anglaise (toute collection, règle `quoteLang`
 *   lue dans src/lib/skillDetail.ts) rendue dans `<body>` sans `lang="en"`
 *   sur son élément ou un ancêtre (le `lang` le plus proche fait foi) ;
 * - sans JS : la feuille sans la règle hors couche
 *   `html:not([data-js]) #theme-toggle{display:none!important}` ; une page
 *   dont une loupe `[data-search-open]` n'est pas rendue `hidden` ; une
 *   variable de prompt à défaut sans sa ligne `data-var-static`
 *   (`défaut : <valeur>`), une ligne sans défaut, un champ non `hidden`, ou la
 *   règle `html[data-js] [data-var-static]` absente ;
 * - tags de prompt : une puce de `[data-prompt-infos]` qui n'est pas un lien
 *   `/tags/<slug>/` résolu vers la page de ce tag (h1 = libellé), posé dans
 *   un `<li>` d'une liste nommée par son `<dt>` ;
 * - rail : le libellé `Catégories` d'un rail de /blog ou d'un article dont
 *   le conteneur n'espace plus sa première rangée de 10 px ;
 * - colonne de fiche skill : `scroll-padding-bottom` absent ou < 6 px.
 *
 * Les valeurs (gaps, bordures, marges de défilement) sont lues dans la
 * feuille construite (`dist/_astro/*.css`) : chaque classe de l'élément est
 * résolue en déclarations, `var(--spacing)` et `rem` compris — pas de
 * recopie de l'échelle Tailwind ici.
 *
 * Aucune dépendance : même petit tokeniseur que scripts/check-home.mjs, avec
 * un lien enfant → parent pour remonter au `lang` le plus proche.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST = 'dist';
const ASTRO = join(DIST, '_astro');
const CONTENT = join('src', 'content');
const SKILL_DETAIL_SOURCE = join('src', 'lib', 'skillDetail.ts');

const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'source', 'track', 'wbr',
]);

// ——— HTML ———

/** Découpe le HTML en jetons `open` / `close` / `text` ; ignore commentaires, doctype, script et style. */
function tokenize(html) {
  const tokens = [];
  const re =
    /<!--[\s\S]*?-->|<!DOCTYPE[^>]*>|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/gi;
  let last = 0;
  for (let m; (m = re.exec(html)); ) {
    if (m.index > last) tokens.push({ type: 'text', text: html.slice(last, m.index) });
    last = re.lastIndex;
    if (m[2]) tokens.push({ type: 'close', tag: m[2].toLowerCase() });
    else if (m[3]) tokens.push({ type: 'open', tag: m[3].toLowerCase(), attrs: parseAttrs(m[4] ?? '') });
  }
  if (last < html.length) tokens.push({ type: 'text', text: html.slice(last) });
  return tokens;
}

function parseAttrs(source) {
  const attrs = {};
  const re = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (let m; (m = re.exec(source)); ) {
    attrs[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return attrs;
}

function decode(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

/**
 * Tous les éléments, dans l'ordre du document, avec leur texte (balises
 * retirées), leurs enfants directs et leur parent.
 */
function collectElements(tokens) {
  const root = { tag: '#root', attrs: {}, text: '', children: [], parent: null };
  const elements = [];
  const stack = [root];
  for (const token of tokens) {
    if (token.type === 'text') {
      for (const el of stack) el.text += token.text;
    } else if (token.type === 'open') {
      const parent = stack[stack.length - 1];
      const el = { tag: token.tag, attrs: token.attrs, text: '', children: [], parent };
      parent.children.push(el);
      elements.push(el);
      if (!VOID.has(token.tag)) stack.push(el);
    } else {
      const at = stack.map((el) => el.tag).lastIndexOf(token.tag);
      if (at > 0) stack.length = at;
    }
  }
  for (const el of [root, ...elements]) el.text = decode(el.text).replace(/\s+/g, ' ').trim();
  return { root, elements };
}

function descendants(el) {
  const out = [];
  const walk = (node) => {
    for (const child of node.children) {
      out.push(child);
      walk(child);
    }
  };
  walk(el);
  return out;
}

const classes = (el) => (el.attrs.class ?? '').split(/\s+/).filter(Boolean);
const find = (el, predicate) => descendants(el).find(predicate);
const findAll = (el, predicate) => descendants(el).filter(predicate);

/** Le `lang` le plus proche (l'élément lui-même ou un ancêtre), '' sans. */
function nearestLang(el) {
  for (let node = el; node; node = node.parent) {
    if ('lang' in node.attrs) return node.attrs.lang.toLowerCase();
  }
  return '';
}

function resolves(href) {
  let path = href.replace(/[?#].*$/, '');
  try {
    path = decodeURIComponent(path);
  } catch {
    return false;
  }
  const target = join(DIST, path);
  if (path.endsWith('/')) return existsSync(join(target, 'index.html'));
  if (existsSync(target) && statSync(target).isFile()) return true;
  return existsSync(join(target, 'index.html'));
}

const pageCache = new Map();
/** Éléments d'une page de `dist/` (chemin relatif à `dist/`), ou null si absente. */
function page(rel) {
  if (!pageCache.has(rel)) {
    const file = join(DIST, rel);
    pageCache.set(rel, existsSync(file) ? collectElements(tokenize(readFileSync(file, 'utf8'))) : null);
  }
  return pageCache.get(rel);
}

/** Les pages du site : tout `dist/**.html` hors `admin/` (Decap) et `pagefind/`. */
function sitePages() {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name);
      const rel = relative(DIST, path).split(sep).join('/');
      if (statSync(path).isDirectory()) {
        if (rel !== 'admin' && rel !== 'pagefind' && rel !== '_astro') walk(path);
      } else if (name.endsWith('.html')) out.push(rel);
    }
  };
  walk(DIST);
  return out;
}

/** Sous-pages `<section>/<id>/index.html` d'une section de `dist/`. */
function entryPages(section) {
  const dir = join(DIST, section);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => existsSync(join(dir, name, 'index.html')))
    .sort()
    .map((name) => `${section}/${name}/index.html`);
}

// ——— CSS ———

/**
 * Règles de la feuille : `{ selectors, declarations, context }`, `context`
 * étant la pile des préludes d'at-rules englobantes (`@layer utilities`,
 * `@media (width>=64rem)`…). Les règles imbriquées sont aplaties.
 */
function parseCss(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  const stack = []; // { prelude, isAt, decls }
  let buffer = '';
  let quote = null;
  for (let i = 0; i < css.length; i += 1) {
    const c = css[i];
    if (quote) {
      buffer += c;
      if (c === '\\') buffer += css[++i] ?? '';
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      buffer += c;
    } else if (c === '{') {
      // Le prélude commence après la dernière déclaration terminée par `;`.
      const cut = buffer.lastIndexOf(';');
      const top = stack[stack.length - 1];
      if (cut !== -1 && top && !top.isAt) top.decls += buffer.slice(0, cut + 1);
      const prelude = buffer.slice(cut + 1).trim();
      stack.push({ prelude, isAt: prelude.startsWith('@'), decls: '' });
      buffer = '';
    } else if (c === '}') {
      const block = stack.pop();
      if (!block) {
        buffer = '';
        continue;
      }
      if (!block.isAt) {
        block.decls += buffer;
        rules.push({
          selectors: splitTopLevel(block.prelude, ','),
          declarations: parseDeclarations(block.decls),
          context: stack.filter((b) => b.isAt).map((b) => b.prelude),
        });
      }
      buffer = '';
    } else {
      buffer += c;
    }
  }
  return rules;
}

function splitTopLevel(text, separator) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const c of text) {
    if (c === '(' || c === '[') depth += 1;
    else if (c === ')' || c === ']') depth -= 1;
    if (c === separator && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else current += c;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseDeclarations(text) {
  const out = [];
  for (const part of splitTopLevel(text, ';')) {
    const at = part.indexOf(':');
    if (at === -1) continue;
    const property = part.slice(0, at).trim().toLowerCase();
    let value = part.slice(at + 1).trim();
    const important = /!important$/i.test(value);
    value = value.replace(/\s*!important$/i, '').trim();
    out.push({ property, value, important });
  }
  return out;
}

/** `.lg\:gap-4` → `lg:gap-4` (échappements CSS simples et hexadécimaux). */
function unescapeIdent(text) {
  return text
    .replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/\\(.)/g, '$1');
}

const cssFiles = existsSync(ASTRO) ? readdirSync(ASTRO).filter((file) => file.endsWith('.css')).sort() : [];
const rules = cssFiles.flatMap((file) => parseCss(readFileSync(join(ASTRO, file), 'utf8')));

/** Déclarations de chaque classe simple (`.x{…}`, où qu'elle soit : couche, média). */
const classRules = new Map();
/** Propriétés personnalisées : première définition rencontrée. */
const customProps = new Map();
for (const rule of rules) {
  for (const selector of rule.selectors) {
    const m = selector.match(/^\.((?:\\.|[^\s.#:[\]>+~,()\\])+)$/);
    if (!m) continue;
    const name = unescapeIdent(m[1]);
    if (!classRules.has(name)) classRules.set(name, []);
    classRules.get(name).push(...rule.declarations);
  }
  for (const { property, value } of rule.declarations) {
    if (property.startsWith('--') && !customProps.has(property)) customProps.set(property, value);
  }
}

/** Toutes les déclarations d'une propriété portées par les classes d'un élément. */
function declared(el, properties) {
  const wanted = new Set(properties);
  const out = [];
  for (const name of classes(el)) {
    for (const decl of classRules.get(name) ?? []) {
      if (wanted.has(decl.property)) out.push({ ...decl, className: name });
    }
  }
  return out;
}

/** Une longueur CSS en px : `10px`, `.25rem`, `calc(var(--spacing) * 4)` ; NaN sinon. */
function px(value, depth = 0) {
  if (depth > 8) return NaN;
  let text = value.trim();
  text = text.replace(/var\((--[\w-]+)(?:\s*,\s*([^()]*))?\)/g, (_, name, fallback) => {
    const resolved = customProps.get(name) ?? fallback;
    return resolved === undefined ? 'NaN' : `(${px(resolved, depth + 1)}px)`;
  });
  text = text.replace(/^calc\((.*)\)$/, '$1');
  const factors = text.split('*').map((part) => part.trim().replace(/^\((.*)\)$/, '$1').trim());
  let result = 1;
  let unit = false;
  for (const factor of factors) {
    const m = factor.match(/^(-?\d*\.?\d+)(px|rem)?$/);
    if (!m) return NaN;
    const number = Number(m[1]);
    if (m[2] === 'rem') {
      result *= number * 16;
      unit = true;
    } else if (m[2] === 'px') {
      result *= number;
      unit = true;
    } else result *= number;
  }
  if (!unit && result !== 0) return NaN;
  return Math.round(result * 1000) / 1000;
}

/** Valeurs en px de toutes les déclarations `gap` / `row-gap` / `column-gap` d'un élément. */
function gaps(el, which = ['gap', 'row-gap', 'column-gap']) {
  return declared(el, which).map((decl) => px(splitTopLevel(decl.value, ' ')[0]));
}

/** Une règle (hors couche si `unlayered`) dont la liste de sélecteurs contient `selector` et qui pose `display:none!important`. */
function hasDisplayNoneRule(selector, { unlayered = false } = {}) {
  const normalize = (s) => s.replace(/\s+/g, ' ').replace(/"/g, '').trim();
  return rules.some(
    (rule) =>
      (!unlayered || !rule.context.some((prelude) => prelude.startsWith('@layer'))) &&
      rule.selectors.some((s) => normalize(s) === normalize(selector)) &&
      rule.declarations.some((d) => d.property === 'display' && d.value === 'none' && d.important),
  );
}

// ——— Exécution ———

const lines = [];
const errors = [];

if (!existsSync(join(DIST, 'index.html'))) {
  console.error(`${join(DIST, 'index.html')} introuvable — lancer \`npm run build\` d'abord`);
  process.exit(1);
}
if (rules.length === 0) errors.push(`aucune règle CSS lue dans ${ASTRO}/*.css`);

// — home —
{
  const home = page('index.html');
  const main = home.elements.find((el) => el.tag === 'main');
  const grids = main ? main.children.filter((el) => classes(el).includes('grid')) : [];
  if (!main) errors.push('home : pas de <main>');
  if (grids.length !== 2) errors.push(`home : ${grids.length} grilles directes dans <main> (attendu : 2)`);
  const spaced = [main, ...grids].filter(Boolean);
  const values = spaced.flatMap((el) => gaps(el));
  spaced.forEach((el, index) => {
    const list = gaps(el);
    const name = index === 0 ? '<main>' : `grille ${index}`;
    if (list.length === 0) errors.push(`home : ${name} sans gap`);
    for (const value of list) if (value !== 16) errors.push(`home : ${name} a un gap de ${value} px (attendu : 16)`);
  });
  const distinct = [...new Set(values)];
  const gapText = distinct.length === 0 ? '(none)' : distinct.join('/');

  const KEYS = ['latest', 'projets', 'prompts', 'skills'];
  let good = 0;
  for (const key of KEYS) {
    const block = home.elements.find((el) => el.attrs['data-home'] === key);
    if (!block) {
      errors.push(`home : bloc data-home="${key}" absent`);
      continue;
    }
    const header = block.children[0];
    const [title, badge, ...rest] = header?.children ?? [];
    const problems = [];
    if (!header || title?.tag !== 'h2') problems.push('le premier enfant de l\'en-tête n\'est pas le titre <h2>');
    if (!badge || badge.tag !== 'span' || badge.attrs['aria-hidden'] !== 'true') problems.push('pas de badge aria-hidden juste après le titre');
    if (rest.length > 0) problems.push(`${rest.length} élément(s) après le badge`);
    if (header) {
      if (!declared(header, ['display']).some((d) => d.value === 'flex')) problems.push('en-tête pas en flex');
      if (declared(header, ['flex-direction']).some((d) => /reverse/.test(d.value))) problems.push('rangée inversée');
      const headerGaps = gaps(header, ['gap', 'column-gap']);
      if (headerGaps.length === 0 || headerGaps.some((v) => v !== 10)) {
        problems.push(`titre et badge à ${headerGaps.join('/') || '?'} px (attendu : 10)`);
      }
    }
    if (title?.tag === 'h2') {
      if (!declared(title, ['text-align']).some((d) => d.value === 'right')) problems.push('titre non aligné à droite');
      const grows = declared(title, ['flex', 'flex-grow']).some((d) => Number(d.value.split(/\s+/)[0]) >= 1);
      if (!grows) problems.push('titre sans flex:1 (le badge ne touche plus le bord droit)');
      if (!title.text) problems.push('titre vide');
      if (key !== 'latest' && !find(title, (el) => el.tag === 'a' && 'data-home-title' in el.attrs)) {
        problems.push('titre sans lien data-home-title');
      }
    }
    if (problems.length === 0) good += 1;
    else errors.push(`home : en-tête ${key} — ${problems.join(' ; ')}`);
  }
  lines.push(`home: rows and columns ${gapText} px apart · ${good}/${KEYS.length} headers title then badge, right-aligned`);
}

// — about —
{
  const about = page('a-propos/index.html');
  if (!about) {
    errors.push('a-propos/index.html introuvable');
    lines.push('about: (missing)');
  } else {
    const { root, elements } = about;
    const identity = elements.find((el) => el.attrs['data-about'] === 'identity');
    const links = identity ? findAll(identity, (el) => el.tag === 'a') : [];
    const EXPECTED = [
      ['github.com/bendevcat', 'https://github.com/bendevcat'],
      ['rss.xml', '/rss.xml'],
    ];
    if (!identity) errors.push('about : pas de bloc data-about="identity"');
    if (
      links.length !== EXPECTED.length ||
      links.some((a, i) => a.text !== EXPECTED[i][0] || a.attrs.href !== EXPECTED[i][1])
    ) {
      errors.push(
        `about : liens d'identité ${links.map((a) => `${a.text} (${a.attrs.href})`).join(', ') || '(aucun)'} — attendu : ${EXPECTED.map(([t, h]) => `${t} (${h})`).join(', ')}`,
      );
    }
    for (const a of links) {
      const href = a.attrs.href ?? '';
      if (href.startsWith('/') && !resolves(href)) errors.push(`about : ${href} ne résout pas`);
    }
    const forbidden = elements.filter((el) => /^mailto:|linkedin/i.test(el.attrs.href ?? ''));
    const linkedinText = /linkedin/i.test(root.text);
    if (forbidden.length > 0) errors.push(`about : lien(s) ${forbidden.map((el) => el.attrs.href).join(', ')}`);
    if (linkedinText) errors.push('about : le texte mentionne LinkedIn');

    const why = elements.find(
      (el) => el.tag === 'section' && el.children.some((c) => c.tag === 'h2' && c.text === 'Pourquoi ce site'),
    );
    let borderText = '(missing)';
    if (!why) errors.push('about : pas de carte « Pourquoi ce site »');
    else {
      const widths = declared(why, ['border-left-width']).map((d) => px(d.value));
      const colors = declared(why, ['border-left-color']).map((d) => d.value);
      const width = widths.at(-1);
      const token = colors.at(-1)?.match(/^var\(--color-([\w-]+)\)$/)?.[1] ?? colors.at(-1);
      borderText = `${width ?? 'no'} px ${token ?? 'no colour'}`;
      if (width !== 3) errors.push(`about : filet gauche de « Pourquoi ce site » à ${width ?? '(aucun)'} px (attendu : 3)`);
      if (token !== 'accent') errors.push(`about : filet gauche de « Pourquoi ce site » en ${token ?? '(aucune couleur)'} (attendu : accent)`);
      if (!classes(why).includes('card')) errors.push('about : « Pourquoi ce site » n\'est plus une .card');
      // Les trois autres côtés restent ceux de `.card` : aucune autre classe
      // ne touche la bordure hors `border-left-*`.
      const others = declared(why, [
        'border', 'border-width', 'border-color', 'border-style', 'border-top', 'border-right', 'border-bottom',
        'border-top-width', 'border-right-width', 'border-bottom-width', 'border-top-color', 'border-right-color',
        'border-bottom-color', 'border-inline', 'border-block', 'border-inline-width', 'border-block-width',
      ]).filter((d) => d.className !== 'card');
      if (others.length > 0) {
        errors.push(`about : « Pourquoi ce site » — autres côtés modifiés par ${[...new Set(others.map((d) => d.className))].join(', ')}`);
      }
    }
    const main = elements.find((el) => el.tag === 'main') ?? root;
    const alsoAccent = findAll(main, (el) => el !== why && declared(el, ['border-left-color']).length > 0);
    if (alsoAccent.length > 0) errors.push(`about : ${alsoAccent.length} autre(s) élément(s) avec un filet gauche coloré`);

    const row2 = elements.find((el) => el.attrs['data-about'] === 'row2');
    const cards = row2 ? row2.children.filter((el) => classes(el).includes('card')) : [];
    if (!row2) errors.push('about : pas de rangée data-about="row2"');
    if (row2 && (cards.length !== 2 || row2.children.length !== 2)) {
      errors.push(`about : rangée 2 à ${row2.children.length} enfant(s), ${cards.length} .card (attendu : 2 .card)`);
    }
    const contact = elements.some((el) => /^h[1-6]$/.test(el.tag) && /on parle/i.test(el.text));
    if (contact) errors.push('about : carte « On parle ? » présente (D42)');
    const noContact = !contact && forbidden.length === 0 && !linkedinText;
    lines.push(
      `about: links ${links.map((a) => a.text).join(' | ') || '(none)'} · Pourquoi ce site left border ${borderText} · ${cards.length} row-2 cards · ${noContact ? 'no contact card' : 'contact card present'}`,
    );
  }
}

// — lang —
{
  // Règle `quoteLang` lue dans le source (les deux expressions régulières),
  // jamais recopiée : une lettre accentuée ou un mot-outil français → fr.
  const source = existsSync(SKILL_DETAIL_SOURCE) ? readFileSync(SKILL_DETAIL_SOURCE, 'utf8') : '';
  const literal = (name) => {
    const m = source.match(new RegExp(`const ${name}\\s*=\\s*\\/((?:\\\\.|[^/\\\\\\n])+)\\/([a-z]*);`));
    return m ? new RegExp(m[1], m[2]) : null;
  };
  const FRENCH_LETTER = literal('FRENCH_LETTER');
  const FRENCH_WORD = literal('FRENCH_WORD');
  if (!FRENCH_LETTER || !FRENCH_WORD) errors.push(`${SKILL_DETAIL_SOURCE} : FRENCH_LETTER / FRENCH_WORD introuvables`);
  const isEnglish = (text) => FRENCH_LETTER && FRENCH_WORD && !FRENCH_LETTER.test(text) && !FRENCH_WORD.test(text);

  // Descriptions de toutes les collections (frontmatter `description:`).
  const descriptions = [];
  for (const collection of existsSync(CONTENT) ? readdirSync(CONTENT).sort() : []) {
    const dir = join(CONTENT, collection);
    if (!statSync(dir).isDirectory()) continue;
    for (const id of readdirSync(dir).sort()) {
      const file = ['index.md', 'index.mdx'].map((name) => join(dir, id, name)).find((f) => existsSync(f));
      if (!file) continue;
      const front = readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
      const raw = front.match(/^description:[ \t]*(.*)$/m)?.[1]?.trim();
      if (raw === undefined) continue;
      let text = raw;
      if (/^["']/.test(raw)) {
        text = raw.startsWith('"') ? JSON.parse(raw) : raw.slice(1, -1).replace(/''/g, "'");
      } else if (/^[>|]/.test(raw)) {
        const block = front.split(/\r?\n/);
        const at = block.findIndex((line) => /^description:/.test(line));
        const body = [];
        for (const line of block.slice(at + 1)) {
          if (!/^\s+\S/.test(line) && line.trim() !== '') break;
          body.push(line.trim());
        }
        text = body.join(' ');
      }
      text = text.replace(/\s+/g, ' ').trim();
      if (text) descriptions.push({ collection, id, text });
    }
  }
  const english = descriptions.filter((d) => isEnglish(d.text));

  let renderings = 0;
  let marked = 0;
  for (const rel of sitePages()) {
    const { elements } = page(rel);
    const body = elements.find((el) => el.tag === 'body');
    if (!body) continue;
    const inBody = descendants(body);
    for (const description of english) {
      // Rendu = l'élément le plus profond dont le texte contient la description.
      const hits = inBody.filter(
        (el) => el.text.includes(description.text) && !el.children.some((c) => c.text.includes(description.text)),
      );
      for (const el of hits) {
        renderings += 1;
        if (nearestLang(el).startsWith('en')) marked += 1;
        else errors.push(`lang : /${rel.replace(/index\.html$/, '')} — description anglaise de ${description.collection}/${description.id} dans <${el.tag}> sans lang="en" (lang le plus proche : ${nearestLang(el) || 'aucun'})`);
      }
    }
  }
  const ids = english.map((d) => d.id).join(', ');
  lines.push(
    `lang: ${english.length} English description${english.length === 1 ? '' : 's'}${ids ? ` (${ids})` : ''} · ${marked}/${renderings} renderings inside lang="en"`,
  );
}

// — no-js —
{
  const toggleRule = hasDisplayNoneRule('html:not([data-js]) #theme-toggle', { unlayered: true });
  if (!toggleRule) errors.push('no-js : pas de règle hors couche html:not([data-js]) #theme-toggle{display:none!important}');
  if (!hasDisplayNoneRule('[data-search-open][hidden]')) errors.push('no-js : pas de règle [data-search-open][hidden]{display:none!important}');
  const staticRule = hasDisplayNoneRule('html[data-js] [data-var-static]');
  if (!staticRule) errors.push('no-js : pas de règle html[data-js] [data-var-static]{display:none!important}');

  const pages = sitePages();
  let searchHidden = 0;
  for (const rel of pages) {
    const triggers = page(rel).elements.filter((el) => 'data-search-open' in el.attrs);
    if (triggers.length > 0 && triggers.every((el) => 'hidden' in el.attrs)) searchHidden += 1;
    else errors.push(`no-js : /${rel} — ${triggers.length === 0 ? 'aucune loupe [data-search-open]' : 'loupe [data-search-open] sans hidden'}`);
  }

  let defaults = 0;
  let shown = 0;
  const withDefaults = [];
  for (const rel of entryPages('prompts')) {
    let onPage = 0;
    for (const field of page(rel).elements.filter((el) => 'data-var-field' in el.attrs)) {
      const name = field.attrs['data-var-field'];
      const input = find(field, (el) => el.tag === 'input' && 'data-var-input' in el.attrs);
      const value = input?.attrs['data-default'] ?? '';
      const statics = findAll(field, (el) => 'data-var-static' in el.attrs);
      if (!input) errors.push(`no-js : ${rel} — variable ${name} sans champ`);
      else if (!('hidden' in input.attrs)) errors.push(`no-js : ${rel} — champ de ${name} non hidden côté serveur`);
      if (value) {
        defaults += 1;
        onPage += 1;
        const line = statics[0];
        const spans = line ? line.children.filter((c) => c.tag === 'span') : [];
        if (statics.length === 1 && line.text === `défaut : ${value}` && spans.at(-1)?.text === value) shown += 1;
        else errors.push(`no-js : ${rel} — variable ${name} (défaut « ${value} ») : ${statics.length} ligne(s) data-var-static${line ? ` « ${line.text} »` : ''}`);
      } else if (statics.length > 0) {
        errors.push(`no-js : ${rel} — variable ${name} sans défaut mais avec une ligne data-var-static`);
      }
    }
    if (onPage > 0) withDefaults.push(rel.split('/')[1]);
  }
  const defaultsText = shown === defaults ? `${defaults}` : `${shown}/${defaults}`;
  lines.push(
    `no-js: #theme-toggle ${toggleRule ? 'hidden' : 'shown'} without data-js · [data-search-open] hidden on ${searchHidden}/${pages.length} pages · ${defaultsText} variable defaults as text${staticRule ? '' : ' (no data-js rule)'} (${withDefaults.join(', ') || 'none'})`,
  );
}

// — prompt tags —
{
  let chips = 0;
  let good = 0;
  let pagesWith = 0;
  for (const rel of entryPages('prompts')) {
    const infos = page(rel).elements.find((el) => 'data-prompt-infos' in el.attrs);
    if (!infos) {
      errors.push(`prompt tags : ${rel} — pas de [data-prompt-infos]`);
      continue;
    }
    const found = findAll(infos, (el) => 'data-tag' in el.attrs);
    if (found.length > 0) pagesWith += 1;
    for (const chip of found) {
      chips += 1;
      const href = chip.attrs.href ?? '';
      const problems = [];
      if (chip.tag !== 'a') problems.push(`<${chip.tag}>, pas un lien`);
      else if (!/^\/tags\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(href)) problems.push(`href ${href || '(vide)'} hors /tags/<slug>/`);
      else if (!resolves(href)) problems.push(`${href} ne résout pas`);
      else {
        const target = page(`${href.slice(1)}index.html`);
        const h1 = target?.elements.find((el) => el.tag === 'h1');
        if (h1?.text !== chip.text) problems.push(`${href} a pour h1 « ${h1?.text ?? ''} », pas « ${chip.text} »`);
      }
      const li = chip.parent;
      const list = li?.parent;
      if (li?.tag !== 'li' || list?.tag !== 'ul') problems.push('pas dans un <li> d\'une <ul>');
      else {
        const label = list.attrs['aria-labelledby'];
        const dt = label && page(rel).elements.find((el) => el.attrs.id === label);
        if (dt?.tag !== 'dt') problems.push('liste non nommée par son <dt> (aria-labelledby)');
      }
      if (problems.length === 0) good += 1;
      else errors.push(`prompt tags : ${rel} — puce « ${chip.text} » : ${problems.join(' ; ')}`);
    }
  }
  if (chips === 0) errors.push('prompt tags : aucune puce dans les [data-prompt-infos]');
  const status = good === chips ? 'all' : `${good}/${chips}`;
  lines.push(`prompt tags: ${chips} chips on ${pagesWith} pages · ${status} → /tags/<slug>/ and resolve`);
}

// — rail —
{
  const pages = ['blog/index.html', ...entryPages('blog')];
  let good = 0;
  const seen = new Set();
  for (const rel of pages) {
    const p = page(rel);
    const label = p?.elements.find((el) => el.attrs.id === 'blog-rail-categories');
    const problems = [];
    if (!label) problems.push('pas de libellé #blog-rail-categories');
    else {
      const box = label.parent;
      const [first, next] = box.children;
      if (label.text !== 'Catégories') problems.push(`libellé « ${label.text} »`);
      if (first !== label || !next) problems.push('le libellé n\'est pas suivi de ses rangées dans son conteneur');
      const values = gaps(box, ['gap', 'row-gap']);
      values.forEach((v) => seen.add(v));
      if (values.length === 0 || values.some((v) => v !== 10)) problems.push(`écart ${values.join('/') || '(aucun)'} px (attendu : 10)`);
      const margins = declared(label, ['margin-bottom', 'margin-block', 'margin']);
      if (margins.length > 0) problems.push(`marge sur le libellé (${margins.map((d) => d.className).join(', ')})`);
    }
    if (problems.length === 0) good += 1;
    else errors.push(`rail : /${rel.replace(/index\.html$/, '')} — ${problems.join(' ; ')}`);
  }
  const gapText = seen.size === 0 ? '?' : [...seen].join('/');
  lines.push(`rail: Catégories label ${gapText} px above its rows on ${good}/${pages.length} pages`);
}

// — skill aside —
{
  const pages = entryPages('skills');
  let good = 0;
  for (const rel of pages) {
    const aside = page(rel).elements.find((el) => 'data-skill-aside' in el.attrs);
    if (!aside) {
      errors.push(`skill aside : ${rel} — pas de [data-skill-aside]`);
      continue;
    }
    const values = declared(aside, ['scroll-padding-bottom', 'scroll-padding-block', 'scroll-padding']).map((d) => {
      const parts = splitTopLevel(d.value, ' ');
      // `scroll-padding` : haut droite bas gauche ; `-block` : début fin.
      if (d.property === 'scroll-padding') return px(parts[parts.length === 1 ? 0 : 2] ?? parts[0]);
      if (d.property === 'scroll-padding-block') return px(parts[1] ?? parts[0]);
      return px(parts[0]);
    });
    const best = values.length > 0 ? Math.max(...values) : NaN;
    if (best >= 6) good += 1;
    else errors.push(`skill aside : ${rel} — scroll-padding-bottom ${values.join('/') || '(aucun)'} px (attendu : ≥ 6)`);
  }
  if (pages.length === 0) errors.push('skill aside : aucune fiche skill');
  lines.push(`skill aside: scroll padding bottom ≥ 6 px on ${good}/${pages.length}`);
}

for (const line of lines) console.log(line);
for (const error of errors) console.error(`  ✗ ${error}`);
process.exit(errors.length > 0 ? 1 : 0);
