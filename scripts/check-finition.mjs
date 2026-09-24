#!/usr/bin/env node
/**
 * Contrôle de la finition sur la sortie de build (Plan 11, critères R6, R7,
 * R11, R12, R13, R15). À lancer après `npm run build` :
 *
 *   node scripts/check-finition.mjs
 *
 * Imprime sur stdout, dans cet ordre :
 *
 *   live: <listes>                  (R6 — T3)
 *   lists: <n> × 1 .card · <e> .card-inner entries · <r> blog rows   (R7 — T3 ; plan 12)
 *   v2: <a> card-level on bg · <b> rail off card level · <c> rail column · <d> derived thumbnails   (R7 — T3 ; plan 12)
 *   fallback: <n>/<total> data-pagefind-ignore   (R11 — T4)
 *   eager: / · /blog/                               (R12 — T4)
 *   tags: <n>/<total> named "<label> <count>"       (R15 — T4)
 *   ai-markers: <n> on /                            (R13 — T4)
 *
 * Les erreurs sont collectées puis imprimées sur stderr APRÈS toutes les
 * lignes de stdout. Code de sortie 1 s'il y en a au moins une.
 *
 * R6 — sur chacune des quatre listes (`dist/{blog,projets,prompts,skills}/`) :
 * exactement un `[data-list-meta]` — le nœud dont src/scripts/list-pattern.ts
 * réécrit le texte —, qui porte `aria-live="polite"` et `aria-atomic="true"`.
 *
 * R7 (listes) — dans le `[data-list]` de chaque liste : exactement un `.card`
 * (le cadre), qui contient `[data-list-featured]`, `[data-list-grid]` et
 * `[data-list-empty]` ; chaque entrée (`[data-entry-id]`, copie masquée de la
 * carte à la une comprise) est un `.card-inner` DANS ce cadre.
 * Plan 12 (/blog, prototype 163–227) : le cadre de /blog contient à la place
 * `[data-rail]`, `[data-list-grid]` et `[data-list-empty]`, aucun
 * `[data-list-featured]` ; ses entrées sont des lignes compactes DANS le cadre,
 * jamais des `.card-inner` — comptées à part (`blog rows`).
 *
 * R7 (V2, statique) — sur chaque page de `dist/`, pour tout élément de niveau
 * `card` (`.card-inner`, `bg-card`) : son plus proche ancêtre PEINT est de
 * niveau `surface` ou `card` (`.card`, `.panel`, `bg-surface`, `.card-inner`,
 * `bg-card`) — sinon c'est un `card` posé sur `bg` ; pour tout élément de
 * niveau `rail` (`bg-rail`, `[data-thumb-derived]`) : son plus proche ancêtre
 * peint est de niveau `card` (`.card-inner`, `bg-card`) — sauf s'il porte
 * `data-rail` (rail explicite du prototype, D74) : il peut alors reposer sur
 * `surface` (ou `card`), jamais sur `bg` ni `panel`. `rail column` compte ces
 * rails explicites hors vignettes dérivées (le rail de /blog). « Peint » = une
 * classe de patron qui pose un fond (`card`, `card-inner`, `panel`, `pill`)
 * ou un utilitaire `bg-<token>` (avec ou sans `/NN`) nommant un token
 * `--color-*` de global.css ; les variantes (`hover:`, `dark:`, `backdrop:`…)
 * ne peignent pas au repos et sont ignorées. Même DOM dans les deux thèmes :
 * le rendu sombre (où les quatre niveaux diffèrent) est mesuré par T6.
 *
 * R11 — sur chaque page de `dist/`, chaque titre de repli d'onglets
 * (`[data-tab-fallback-heading]`, DetailTabs.astro) porte
 * `data-pagefind-ignore` ; au moins un titre de repli existe.
 *
 * R12 — le ou les `<img>` de `[data-home="featured"]` (`dist/index.html`) et
 * de la première ligne de `[data-list-grid]` (`dist/blog/index.html`, plan 12 :
 * plus de bloc à la une) portent `loading="eager"` (au moins un par page) ;
 * tout autre `<img>` de ces deux pages porte `loading="lazy"`.
 *
 * R15 — sur `dist/tags/index.html`, chaque lien `/tags/<slug>/` porte
 * `aria-label` = son libellé, une espace, son compte — le texte du lien est
 * libellé et compte collés (« claude-code5 »), le compte étant le texte de
 * son `<span>`. Autant de liens que de pages `dist/tags/<slug>/`.
 *
 * R13 (statique) — sur `dist/index.html`, au moins 4 `[data-ai-marker]` ;
 * chacun porte `whitespace-nowrap` et son texte est exactement une paire
 * `emoji label` de AI_USAGE_META (lue dans src/lib/aiUsage.ts) ; le marqueur
 * de la carte à la une (`data-home-field="ai"`, s'il existe) en est un ; la
 * bannière (`[data-home="banner"]`) contient une marque par paire, dans
 * l'ordre de la source. Le rendu à 375 px (une seule boîte par marqueur) est
 * mesuré par T6.
 *
 * Aucune dépendance : même petit tokeniseur que scripts/check-home.mjs, avec
 * un lien enfant → parent (comme scripts/check-secondary.mjs).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const GLOBAL_CSS = join('src', 'styles', 'global.css');
const LISTS = ['blog', 'projets', 'prompts', 'skills'];
const AI_USAGE_SOURCE = join('src', 'lib', 'aiUsage.ts');

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
 * Tous les éléments, dans l'ordre du document, avec leurs enfants directs,
 * leur parent et leur texte (`text` : texte décodé de tous les descendants,
 * non normalisé).
 */
function collectElements(tokens) {
  const root = { tag: '#root', attrs: {}, children: [], parent: null, text: '' };
  const elements = [];
  const stack = [root];
  for (const token of tokens) {
    if (token.type === 'text') {
      const text = decode(token.text);
      for (const el of stack) el.text += text;
    } else if (token.type === 'open') {
      const parent = stack[stack.length - 1];
      const el = { tag: token.tag, attrs: token.attrs, children: [], parent, text: '' };
      parent.children.push(el);
      elements.push(el);
      if (!VOID.has(token.tag)) stack.push(el);
    } else if (token.type === 'close') {
      const at = stack.map((el) => el.tag).lastIndexOf(token.tag);
      if (at > 0) stack.length = at; // referme aussi les éléments laissés ouverts dedans
    }
  }
  return { root, elements };
}

function ancestors(el) {
  const out = [];
  for (let node = el.parent; node && node.tag !== '#root'; node = node.parent) out.push(node);
  return out;
}

const descendants = (el) => el.children.flatMap((child) => [child, ...descendants(child)]);
const classes = (el) => (el.attrs.class ?? '').split(/\s+/).filter(Boolean);
const has = (el, attr) => attr in el.attrs;

function htmlFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...htmlFiles(path));
    else if (name.endsWith('.html')) out.push(path);
  }
  return out;
}

/** `dist/tags/devops/index.html` → `/tags/devops/`. */
const route = (file) =>
  '/' + file.slice(DIST.length + 1).split(/[\\/]/).join('/').replace(/index\.html$/, '').replace(/\.html$/, '');

/** Court libellé d'un élément pour les messages d'erreur. */
const describe = (el) =>
  `<${el.tag}${el.attrs.class ? ` class="${el.attrs.class.slice(0, 60)}"` : ''}>`;

const lines = [];
const errors = [];

if (!existsSync(DIST)) {
  console.error(`${DIST}/ introuvable — lancer \`npm run build\` d'abord`);
  process.exit(1);
}

// — Niveaux de surface (§2.1) —
// Tokens de couleur lus dans global.css : un utilitaire `bg-<token>` n'est
// reconnu comme peint que s'il nomme un vrai token (palette.test.ts garantit
// qu'aucune autre couleur n'est écrite dans src/).
const TOKENS = new Set(
  [...readFileSync(GLOBAL_CSS, 'utf8').matchAll(/--color-([A-Za-z0-9]+)\s*:/g)].map((m) => m[1]),
);
const PATTERN_LEVEL = { card: 'surface', panel: 'panel', 'card-inner': 'card', pill: 'accentSoft' };

/** Niveau peint par un élément (nom de token), ou null s'il ne peint pas de fond au repos. */
function paints(el) {
  let level = null;
  for (const cls of classes(el)) {
    if (cls in PATTERN_LEVEL) level = PATTERN_LEVEL[cls];
    const m = cls.match(/^bg-([A-Za-z0-9]+)(?:\/\d+)?$/);
    if (m && TOKENS.has(m[1])) level = m[1]; // un utilitaire l'emporte sur le patron (couche utilities)
  }
  return level;
}

/** Plus proche ancêtre peint : `{ el, level }`, ou `{ el: null, level: 'bg' }` (le fond de page). */
function paintedParent(el) {
  for (const node of ancestors(el)) {
    const level = paints(node);
    if (level) return { el: node, level };
  }
  return { el: null, level: 'bg' };
}

const CARD_HOSTS = new Set(['surface', 'panel', 'card']);
/** Hôtes admis pour un rail explicite `[data-rail]` (D74) : `surface`, ou `card` comme tout rail. */
const EXPLICIT_RAIL_HOSTS = new Set(['surface', 'card']);
let cardOnBg = 0;
let railOffCard = 0;
let railColumns = 0;
let derived = 0;

for (const file of htmlFiles(DIST)) {
  const page = route(file);
  const { elements } = collectElements(tokenize(readFileSync(file, 'utf8')));
  for (const el of elements) {
    const own = paints(el);
    const rail = own === 'rail' || has(el, 'data-thumb-derived');
    if (has(el, 'data-thumb-derived')) derived += 1;
    if (has(el, 'data-rail') && !has(el, 'data-thumb-derived')) railColumns += 1;
    if (own === 'card') {
      const host = paintedParent(el);
      if (!CARD_HOSTS.has(host.level)) {
        cardOnBg += 1;
        errors.push(`${page} ${describe(el)} : niveau card posé sur ${host.level}${host.el ? ` (${describe(host.el)})` : ''}`);
      }
    }
    if (rail) {
      const host = paintedParent(el);
      const explicit = has(el, 'data-rail');
      const allowed = explicit ? EXPLICIT_RAIL_HOSTS.has(host.level) : host.level === 'card';
      if (!allowed) {
        railOffCard += 1;
        errors.push(
          `${page} ${describe(el)} : niveau rail posé sur ${host.level}${host.el ? ` (${describe(host.el)})` : ''} (attendu : ${explicit ? 'surface ou card, [data-rail]' : 'card'})`,
        );
      }
    }
  }
}

// — Listes : région live (R6) et cadre unique (R7) —
const live = [];
const frameCounts = [];
let entries = 0;
let rows = 0;
/** Listes en lignes compactes (plan 12) : rail au lieu du bloc à la une, entrées sans `.card-inner`. */
const ROW_LISTS = new Set(['blog']);

for (const list of LISTS) {
  const file = join(DIST, list, 'index.html');
  if (!existsSync(file)) {
    errors.push(`${file} introuvable`);
    frameCounts.push(0);
    continue;
  }
  const { elements } = collectElements(tokenize(readFileSync(file, 'utf8')));
  const roots = elements.filter((el) => has(el, 'data-list'));
  if (roots.length !== 1) {
    errors.push(`/${list}/ : ${roots.length} [data-list] (attendu : 1)`);
    frameCounts.push(0);
    continue;
  }
  const scope = descendants(roots[0]);

  const metas = elements.filter((el) => has(el, 'data-list-meta'));
  if (metas.length !== 1) errors.push(`/${list}/ : ${metas.length} [data-list-meta] (attendu : 1)`);
  else if (metas[0].attrs['aria-live'] !== 'polite' || metas[0].attrs['aria-atomic'] !== 'true') {
    errors.push(
      `/${list}/ : [data-list-meta] aria-live="${metas[0].attrs['aria-live'] ?? ''}" aria-atomic="${metas[0].attrs['aria-atomic'] ?? ''}" (attendu : polite, true)`,
    );
  } else live.push(list);

  const frames = scope.filter((el) => classes(el).includes('card'));
  frameCounts.push(frames.length);
  if (frames.length !== 1) {
    errors.push(`/${list}/ : ${frames.length} .card dans [data-list] (attendu : 1)`);
  }
  const frame = frames[0];
  const inFrame = frame ? new Set(descendants(frame)) : new Set();
  const rowList = ROW_LISTS.has(list);
  const parts = rowList
    ? ['data-rail', 'data-list-grid', 'data-list-empty']
    : ['data-list-featured', 'data-list-grid', 'data-list-empty'];
  for (const part of parts) {
    const found = scope.filter((el) => has(el, part) && !(part === 'data-rail' && has(el, 'data-thumb-derived')));
    if (found.length !== 1) errors.push(`/${list}/ : ${found.length} [${part}] (attendu : 1)`);
    else if (!inFrame.has(found[0])) errors.push(`/${list}/ : [${part}] hors du .card`);
  }
  if (rowList) {
    const featured = elements.filter((el) => has(el, 'data-list-featured'));
    if (featured.length > 0) errors.push(`/${list}/ : ${featured.length} [data-list-featured] (attendu : 0)`);
  }
  for (const entry of scope.filter((el) => has(el, 'data-entry-id'))) {
    const id = entry.attrs['data-entry-id'];
    if (rowList) {
      rows += 1;
      if (classes(entry).includes('card-inner')) errors.push(`/${list}/ : la ligne ${id} est un .card-inner`);
    } else {
      entries += 1;
      if (!classes(entry).includes('card-inner')) errors.push(`/${list}/ : l'entrée ${id} n'est pas un .card-inner`);
    }
    if (!inFrame.has(entry)) errors.push(`/${list}/ : l'entrée ${id} est hors du .card`);
  }
  if (!scope.some((el) => has(el, 'data-entry-id'))) errors.push(`/${list}/ : aucune entrée [data-entry-id]`);
}

lines.push(`live: ${live.join(' ') || '(aucune)'}`);
const frames = frameCounts.every((n) => n === 1)
  ? `${LISTS.length} × 1 .card`
  : LISTS.map((list, i) => `${list} ${frameCounts[i]} .card`).join(', ');
lines.push(`lists: ${frames} · ${entries} .card-inner entries · ${rows} blog rows`);
lines.push(
  `v2: ${cardOnBg} card-level on bg · ${railOffCard} rail off card level · ${railColumns} rail column · ${derived} derived thumbnails`,
);

/** Éléments d'une page de `dist/` (tableau vide et erreur si elle manque). */
function pageElements(file) {
  if (!existsSync(file)) {
    errors.push(`${file} introuvable`);
    return [];
  }
  return collectElements(tokenize(readFileSync(file, 'utf8'))).elements;
}

const squash = (text) => text.replace(/\s+/g, ' ').trim();

// — R11 : titres de repli hors de l'index Pagefind —
let fallbacks = 0;
let ignored = 0;
for (const file of htmlFiles(DIST)) {
  const page = route(file);
  const { elements } = collectElements(tokenize(readFileSync(file, 'utf8')));
  for (const el of elements.filter((e) => has(e, 'data-tab-fallback-heading'))) {
    fallbacks += 1;
    if (has(el, 'data-pagefind-ignore')) ignored += 1;
    else errors.push(`${page} : titre de repli « ${squash(el.text)} » sans data-pagefind-ignore`);
  }
}
if (fallbacks === 0) errors.push('aucun [data-tab-fallback-heading] dans dist/');
lines.push(`fallback: ${ignored}/${fallbacks} data-pagefind-ignore`);

// — R12 : couvertures à la une en eager, toutes les autres en lazy —
const eagerPages = [];
/** Accueil : le bloc à la une. */
const homeFeatured = (elements) => elements.filter((el) => el.attrs['data-home'] === 'featured');
/** /blog (plan 12) : la première ligne de la liste, dans l'ordre du rendu serveur. */
const blogFirstRow = (elements) => {
  const grid = elements.find((el) => has(el, 'data-list-grid'));
  const first = grid ? descendants(grid).find((el) => has(el, 'data-entry-id')) : undefined;
  return first ? [first] : [];
};
for (const [page, file, pick, label] of [
  ['/', join(DIST, 'index.html'), homeFeatured, '[data-home="featured"]'],
  ['/blog/', join(DIST, 'blog', 'index.html'), blogFirstRow, 'première ligne de [data-list-grid]'],
]) {
  const elements = pageElements(file);
  if (elements.length === 0) continue;
  const boxes = pick(elements);
  if (boxes.length !== 1) {
    errors.push(`${page} : ${boxes.length} ${label} (attendu : 1)`);
    continue;
  }
  const inBox = new Set(descendants(boxes[0]));
  const images = elements.filter((el) => el.tag === 'img');
  const featuredImages = images.filter((img) => inBox.has(img));
  let ok = featuredImages.length > 0;
  if (featuredImages.length === 0) errors.push(`${page} : aucun <img> dans ${label}`);
  for (const img of images) {
    const expected = inBox.has(img) ? 'eager' : 'lazy';
    if (img.attrs.loading !== expected) {
      ok = false;
      errors.push(`${page} : <img src="${(img.attrs.src ?? '').slice(0, 60)}"> loading="${img.attrs.loading ?? ''}" (attendu : ${expected})`);
    }
  }
  if (ok) eagerPages.push(page);
}
lines.push(`eager: ${eagerPages.join(' · ') || '(aucune)'}`);

// — R15 : nom accessible des liens de /tags —
{
  const elements = pageElements(join(DIST, 'tags', 'index.html'));
  const links = elements.filter((el) => el.tag === 'a' && /^\/tags\/[^/]+\/$/.test(el.attrs.href ?? ''));
  const tagDir = join(DIST, 'tags');
  const tagPages = existsSync(tagDir)
    ? readdirSync(tagDir).filter((name) => existsSync(join(tagDir, name, 'index.html'))).length
    : 0;
  let named = 0;
  for (const link of links) {
    const count = link.children.find((child) => child.tag === 'span');
    const countText = count ? squash(count.text) : '';
    const text = squash(link.text);
    const labelText = countText && text.endsWith(countText) ? text.slice(0, -countText.length).trim() : '';
    const expected = `${labelText} ${countText}`;
    if (!/^\d+$/.test(countText) || !labelText) {
      errors.push(`/tags/ : lien ${link.attrs.href} sans libellé ni compte lisibles (« ${text} »)`);
    } else if (link.attrs['aria-label'] !== expected) {
      errors.push(`/tags/ : lien ${link.attrs.href} aria-label="${link.attrs['aria-label'] ?? ''}" (attendu : « ${expected} »)`);
    } else named += 1;
  }
  if (links.length === 0) errors.push('/tags/ : aucun lien /tags/<slug>/');
  if (links.length !== tagPages) errors.push(`/tags/ : ${links.length} liens pour ${tagPages} pages dist/tags/<slug>/`);
  lines.push(`tags: ${named}/${links.length} named "<label> <count>"`);
}

// — R13 : marqueurs IA insécables sur l'accueil —
{
  const elements = pageElements(join(DIST, 'index.html'));
  const pairs = [...readFileSync(AI_USAGE_SOURCE, 'utf8').matchAll(/emoji:\s*'([^']+)',\s*label:\s*'([^']+)'/g)].map(
    (m) => `${m[1]} ${m[2]}`,
  );
  if (pairs.length === 0) errors.push(`${AI_USAGE_SOURCE} : aucune paire emoji/label trouvée`);
  const markers = elements.filter((el) => has(el, 'data-ai-marker'));
  for (const marker of markers) {
    const text = squash(marker.text);
    if (!classes(marker).includes('whitespace-nowrap')) errors.push(`/ : marqueur IA « ${text} » sans whitespace-nowrap`);
    if (!pairs.includes(text)) errors.push(`/ : marqueur IA « ${text} » n'est pas une paire emoji/label de AI_USAGE_META`);
  }
  if (markers.length < 4) errors.push(`/ : ${markers.length} [data-ai-marker] (attendu : 4 ou plus)`);
  for (const field of elements.filter((el) => el.attrs['data-home-field'] === 'ai')) {
    if (!has(field, 'data-ai-marker')) errors.push(`/ : marqueur IA « ${squash(field.text)} » (data-home-field="ai") sans data-ai-marker`);
  }
  const banner = elements.find((el) => el.attrs['data-home'] === 'banner');
  if (!banner) errors.push('/ : pas de [data-home="banner"]');
  else {
    const inBanner = descendants(banner).filter((el) => has(el, 'data-ai-marker')).map((el) => squash(el.text));
    if (inBanner.join(' | ') !== pairs.join(' | ')) {
      errors.push(`/ : bannière, marqueurs « ${inBanner.join(' | ')} » (attendu : « ${pairs.join(' | ')} »)`);
    }
  }
  lines.push(`ai-markers: ${markers.length} on /`);
}

for (const line of lines) console.log(line);
for (const error of errors) console.error(`  ✗ ${error}`);
process.exit(errors.length > 0 ? 1 : 0);
