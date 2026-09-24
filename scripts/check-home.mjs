#!/usr/bin/env node
/**
 * Contrôle de la page d'accueil sur la sortie de build (Plan 9, critère R2).
 * À lancer après `npm run build` :
 *
 *   node scripts/check-home.mjs
 *
 * Imprime sur stdout, dans l'ordre de la page, une ligne par bloc présent :
 *
 *   featured: <href du titre> · <catégorie> · <emoji label IA>
 *   latest: <href> | <href> | <href>
 *   more: <href de « Plus d'articles → »>
 *   section <Titre> <href du titre>: <href> | <href>
 *   banner: <href>
 *
 * Les erreurs sont collectées puis imprimées sur stderr APRÈS toutes les
 * lignes de stdout (les premières lignes restent donc lisibles même avec
 * `2>&1`). Code de sortie 1 s'il y en a au moins une.
 *
 * Convention de balisage lue ici (à respecter par les composants home/*) :
 * - chaque bloc porte `data-home="<clé>"`, clés dans l'ordre de la page :
 *   featured, latest, projets, prompts, skills, banner ;
 * - à la une : le lien du titre porte `data-home-title`, la catégorie
 *   `data-home-field="category"`, le marqueur IA `data-home-field="ai"`
 *   (absent si l'article n'a pas d'`aiUsage`) ;
 * - derniers articles : chaque entrée porte `data-home-item`, son lien de
 *   titre `data-home-title` ;
 * - section : le lien du titre porte `data-home-title`, chaque entrée est un
 *   élément `.card-inner` (un <a>, ou contenant un <a>) qui vise une fiche de
 *   la section (`/<section>/<id>/`) et porte ses champs
 *   `data-home-field="title"`, `"description"` et `"meta"` non vides (R3) ;
 * - bannière : aucune classe de patron (`card`, `card-inner`, `panel`,
 *   `pill`) sur le bloc ; son texte contient les paires `emoji label` de
 *   AI_USAGE_META dans l'ordre de src/lib/aiUsage.ts (R4 — lues dans le
 *   source, jamais recopiées ici) ;
 * - vignette : un <img>, ou le visuel dérivé de Thumbnail.astro
 *   (`data-thumb-derived`).
 *
 * Aucune dépendance : même petit tokeniseur que scripts/check-detail-tabs.mjs,
 * étendu d'un lien parent → enfants pour interroger un bloc isolément.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const AI_USAGE_SOURCE = join('src', 'lib', 'aiUsage.ts');
const HOME = join(DIST, 'index.html');
const BLOG = join(DIST, 'blog', 'index.html');

const ORDER = ['featured', 'latest', 'projets', 'prompts', 'skills', 'banner'];
const SECTIONS = { projets: '/projets/', prompts: '/prompts/', skills: '/skills/' };

const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'source', 'track', 'wbr',
]);

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
 * retirées) et leurs enfants directs. Un élément ouvert se ferme sur la
 * balise fermante de même nom à sa profondeur.
 */
function collectElements(tokens) {
  const root = { tag: '#root', attrs: {}, text: '', children: [] };
  const elements = [];
  const stack = [root];
  for (const token of tokens) {
    if (token.type === 'text') {
      for (const el of stack) el.text += token.text;
    } else if (token.type === 'open') {
      const el = { tag: token.tag, attrs: token.attrs, text: '', children: [] };
      stack[stack.length - 1].children.push(el);
      elements.push(el);
      if (!VOID.has(token.tag)) stack.push(el);
    } else {
      const at = stack.map((el) => el.tag).lastIndexOf(token.tag);
      if (at > 0) stack.length = at; // referme aussi les éléments laissés ouverts dedans
    }
  }
  for (const el of [root, ...elements]) el.text = decode(el.text).replace(/\s+/g, ' ').trim();
  return { root, elements };
}

/** Descendants d'un élément, dans l'ordre du document. */
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
const hasThumb = (el) =>
  descendants(el).some((d) => d.tag === 'img' || 'data-thumb-derived' in d.attrs);

/** Un href interne (`/…`) résout-il vers un fichier de `dist/` ? */
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

const lines = [];
const errors = [];

if (!existsSync(HOME)) {
  console.error(`${HOME} introuvable — lancer \`npm run build\` d'abord`);
  process.exit(1);
}

const { root, elements } = collectElements(tokenize(readFileSync(HOME, 'utf8')));

// — Blocs et ordre —
const blocks = elements.filter((el) => 'data-home' in el.attrs);
const keys = blocks.map((el) => el.attrs['data-home']);
for (const key of keys) {
  if (!ORDER.includes(key)) errors.push(`bloc data-home="${key}" inconnu`);
}
for (const key of ORDER) {
  const count = keys.filter((k) => k === key).length;
  if (count === 0) errors.push(`bloc data-home="${key}" absent`);
  if (count > 1) errors.push(`bloc data-home="${key}" présent ${count} fois`);
}
const known = keys.filter((key) => ORDER.includes(key));
const expected = ORDER.filter((key) => known.includes(key));
if (known.join(',') !== expected.join(',')) {
  errors.push(`ordre des blocs : ${known.join(', ')} (attendu : ${expected.join(', ')})`);
}
const block = (key) => blocks.find((el) => el.attrs['data-home'] === key);

// — À la une —
const featured = block('featured');
if (featured) {
  const title = find(featured, (el) => el.tag === 'a' && 'data-home-title' in el.attrs);
  const category = find(featured, (el) => el.attrs['data-home-field'] === 'category');
  const ai = find(featured, (el) => el.attrs['data-home-field'] === 'ai');
  const href = title?.attrs.href ?? '';
  lines.push(`featured: ${[href || '(pas de titre)', category?.text ?? '(pas de catégorie)', ai?.text].filter(Boolean).join(' · ')}`);

  if (!title || !href) errors.push('à la une : pas de lien de titre (data-home-title)');
  if (!category?.text) errors.push('à la une : pas de catégorie (data-home-field="category")');
  const read = find(featured, (el) => el.tag === 'a' && el.text === 'Lire →');
  if (!read) errors.push('à la une : pas de lien « Lire → »');
  else if (read.attrs.href !== href) errors.push(`à la une : « Lire → » vise ${read.attrs.href}, le titre ${href}`);
  if (!hasThumb(featured)) errors.push('à la une : ni <img> ni visuel dérivé');

  if (!existsSync(BLOG)) {
    errors.push(`${BLOG} introuvable : impossible de comparer l'entrée à la une`);
  } else {
    const blog = collectElements(tokenize(readFileSync(BLOG, 'utf8'))).elements;
    // L'entrée à la une de l'accueil est celle que /blog marque `data-featured`
    // (avant le plan 12 : la carte à la une et sa copie masquée, une seule
    // entrée — d'où la comparaison par id) ; sans marque (plan 12 : /blog n'a
    // plus de bloc à la une), c'est la première ligne de la liste, dans
    // l'ordre canonique du rendu serveur.
    const ids = [
      ...new Set(blog.filter((el) => 'data-featured' in el.attrs).map((el) => el.attrs['data-entry-id'])),
    ];
    const firstRow = blog.find((el) => 'data-entry-id' in el.attrs)?.attrs['data-entry-id'];
    if (ids.length > 1) errors.push(`/blog : ${ids.length} entrées data-featured distinctes (attendu : 0 ou 1)`);
    else if (ids.length === 0 && !firstRow) errors.push('/blog : ni entrée data-featured ni ligne [data-entry-id]');
    else {
      const [id, source] = ids.length === 1 ? [ids[0], 'entrée data-featured'] : [firstRow, 'première ligne'];
      if (href !== `/blog/${id}/`) errors.push(`à la une : ${href} ≠ ${source} de /blog (${id})`);
    }
  }
}

// — Derniers articles —
const latest = block('latest');
if (latest) {
  const items = findAll(latest, (el) => 'data-home-item' in el.attrs);
  const hrefs = items.map((item, index) => {
    const title = find(item, (el) => el.tag === 'a' && 'data-home-title' in el.attrs);
    if (!title?.attrs.href) errors.push(`derniers articles : entrée ${index + 1} sans lien de titre`);
    if (!hasThumb(item)) errors.push(`derniers articles : entrée ${index + 1} sans <img> ni visuel dérivé`);
    return title?.attrs.href ?? '(pas de titre)';
  });
  lines.push(`latest: ${hrefs.join(' | ')}`);
  if (items.length === 0) errors.push('derniers articles : aucune entrée (data-home-item)');
  const more = find(latest, (el) => el.tag === 'a' && el.text === "Plus d'articles →");
  lines.push(`more: ${more?.attrs.href ?? '(absent)'}`);
  if (!more) errors.push("derniers articles : pas de lien « Plus d'articles → »");
}

// — Sections (T3) —
for (const [key, listHref] of Object.entries(SECTIONS)) {
  const section = block(key);
  if (!section) continue;
  const title = find(section, (el) => el.tag === 'a' && 'data-home-title' in el.attrs);
  const entries = findAll(section, (el) => classes(el).includes('card-inner'));
  const hrefs = entries.map((entry) =>
    entry.tag === 'a' ? entry.attrs.href : find(entry, (el) => el.tag === 'a')?.attrs.href ?? '(pas de lien)',
  );
  lines.push(`section ${title?.text ?? '(pas de titre)'} ${title?.attrs.href ?? '(pas de lien)'}: ${hrefs.join(' | ')}`);
  if (!classes(section).includes('panel')) errors.push(`section ${key} : pas un .panel`);
  if (entries.length === 0) errors.push(`section ${key} : aucune entrée .card-inner`);
  entries.forEach((entry, index) => {
    const href = hrefs[index];
    if (!href.startsWith(listHref) || href === listHref) {
      errors.push(`section ${key} : l'entrée ${index + 1} vise ${href} (attendu une fiche ${listHref}<id>/)`);
    }
    for (const field of ['title', 'description', 'meta']) {
      const el = find(entry, (d) => d.attrs['data-home-field'] === field);
      if (!el?.text) errors.push(`section ${key} : l'entrée ${index + 1} n'a pas de champ ${field} (data-home-field)`);
    }
  });
  if (title?.attrs.href !== listHref) {
    errors.push(`section ${key} : le titre vise ${title?.attrs.href ?? '(rien)'} (attendu ${listHref})`);
  }
}

// — Bannière (T3) —
const banner = block('banner');
if (banner) {
  const links = findAll(banner, (el) => el.tag === 'a');
  lines.push(`banner: ${links.map((el) => el.attrs.href).join(' | ') || '(aucun lien)'}`);
  if (links.length === 0) errors.push('bannière : aucun lien');
  const patterns = classes(banner).filter((c) => ['card', 'card-inner', 'panel', 'pill'].includes(c));
  if (patterns.length > 0) errors.push(`bannière : porte la classe de patron ${patterns.join(', ')}`);

  // R4 : les paires `emoji label` sont lues dans le source de AI_USAGE_META,
  // dans l'ordre de déclaration — ce script ne recopie aucun libellé.
  const source = readFileSync(AI_USAGE_SOURCE, 'utf8');
  const pairs = [...source.matchAll(/emoji:\s*'([^']+)',\s*label:\s*'([^']+)'/g)].map((m) => `${m[1]} ${m[2]}`);
  if (pairs.length === 0) errors.push(`${AI_USAGE_SOURCE} : aucune paire emoji/label trouvée`);
  let from = 0;
  for (const pair of pairs) {
    const at = banner.text.indexOf(pair, from);
    if (at === -1) {
      errors.push(`bannière : « ${pair} » absent ou hors d'ordre`);
      break;
    }
    from = at + pair.length;
  }
}

// — Séparateurs « · » : toujours entourés d'espaces (un saut de ligne dans le
// gabarit Astro peut manger l'espace, « DevOps ·28 octobre » au plan 9 / T4).
for (const block of blocks) {
  const glued = block.text.replace(/\s+/g, ' ').match(/\S·|·\S/);
  if (glued) errors.push(`bloc ${block.attrs['data-home']} : séparateur collé « ${glued[0]} »`);
}

// — Page entière —
const h1 = elements.filter((el) => el.tag === 'h1');
if (h1.length !== 1) errors.push(`${h1.length} <h1> (attendu : 1)`);
if (/whoami/i.test(root.text)) errors.push('la page contient « whoami »');
for (const a of elements.filter((el) => el.tag === 'a')) {
  const href = a.attrs.href ?? '';
  if (href.startsWith('/') && !href.startsWith('//') && !resolves(href)) {
    errors.push(`lien ${href} (« ${a.text} ») ne résout vers aucun fichier de ${DIST}/`);
  }
}

for (const line of lines) console.log(line);
for (const error of errors) console.error(`  ✗ ${error}`);
process.exit(errors.length > 0 ? 1 : 0);
