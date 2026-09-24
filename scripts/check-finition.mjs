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
 *   lists: blog <n> .card · <r> blog rows · <e> .card entries on bg (projets <p> · prompts <q> · skills <s>)   (R7 — T3 ; plans 12, 14)
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
 * R7 (listes) — Plan 12 (/blog, prototype 163–227) : dans le `[data-list]` de
 * /blog, exactement un `.card` (le cadre), qui contient `[data-rail]`,
 * `[data-list-grid]` et `[data-list-empty]`, aucun `[data-list-featured]` ;
 * ses entrées sont des lignes compactes DANS le cadre, jamais des
 * `.card-inner` — comptées à part (`blog rows`).
 * Plan 14 (D92, /projets, /prompts, /skills — listes en grille) : aucun cadre ;
 * `[data-list-grid]` et `[data-list-empty]` existent une fois, et
 * `[data-list-featured]` une fois sur /projets, jamais sur /prompts ni
 * /skills ; chaque entrée (`[data-entry-id]`, copie masquée de la carte à la
 * une comprise) est un `.card` dont le plus proche ancêtre peint est le fond
 * de page `bg`, et tout `.card` du `[data-list]` est une entrée. Seules ces
 * entrées sont comptées (`.card entries on bg`, par liste).
 *
 * R7 (V2, statique) — sur chaque page de `dist/`, pour tout élément de niveau
 * `card` (`.card-inner`, `bg-card`) : son plus proche ancêtre PEINT est de
 * niveau `surface` ou `card` (`.card`, `.panel`, `bg-surface`, `.card-inner`,
 * `bg-card`) — sinon c'est un `card` posé sur `bg` ; pour tout élément de
 * niveau `rail` (`bg-rail`, `[data-thumb-derived]`) : son plus proche ancêtre
 * peint est de niveau `card` (`.card-inner`, `bg-card`) — sauf s'il porte
 * `data-rail` (rail explicite du prototype, D74) : il peut alors reposer sur
 * `surface` (ou `card`), jamais sur `bg` ni `panel`. Plan 13 (D88) : un
 * `.card-inner` peut aussi reposer sur `rail` quand cet hôte peint est, ou se
 * trouve dans, un `[data-rail]` qui n'est pas une vignette dérivée — les
 * cartes « Articles liés » et « Projets liés » des rails de l'article ; un
 * `.card-inner` sur `bg` reste une erreur. Plan 14 (D96) : un élément de
 * niveau `card` peut reposer sur `chip` quand cet hôte peint est, ou se trouve
 * dans, un `[data-segmented]` — les badges de compte du contrôle segmenté ;
 * hors de `[data-segmented]`, `card` sur `chip` reste une erreur. `rail column` compte ces rails
 * explicites hors vignettes dérivées (le rail de /blog, les deux rails de
 * chaque article : 1 + 2 × 5 = 11). « Peint » = une
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
/**
 * D88 : un `.card-inner` dont l'hôte peint est de niveau `rail` et est, ou se
 * trouve dans, un rail explicite `[data-rail]` (hors vignette dérivée).
 */
function cardOnExplicitRail(el, host) {
  if (!classes(el).includes('card-inner') || host.level !== 'rail' || !host.el) return false;
  return [host.el, ...ancestors(host.el)].some((node) => has(node, 'data-rail') && !has(node, 'data-thumb-derived'));
}
/**
 * D96 : un élément de niveau `card` dont l'hôte peint est de niveau `chip` et
 * est, ou se trouve dans, un contrôle segmenté `[data-segmented]` (badge de
 * compte d'un segment inactif).
 */
function cardOnSegmentedChip(host) {
  if (host.level !== 'chip' || !host.el) return false;
  return [host.el, ...ancestors(host.el)].some((node) => has(node, 'data-segmented'));
}
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
      if (!CARD_HOSTS.has(host.level) && !cardOnExplicitRail(el, host) && !cardOnSegmentedChip(host)) {
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

// — Listes : région live (R6), cadre de /blog et grilles sans cadre (R7) —
const live = [];
/** Nombre de `.card` dans le `[data-list]` de /blog (le cadre ; attendu : 1). */
let blogFrames = 0;
/** Entrées `.card` posées sur `bg`, par liste en grille (plan 14). */
const gridEntries = {};
let rows = 0;
/** Listes en lignes compactes (plan 12) : un cadre `.card`, un rail, des lignes sans `.card-inner`. */
const ROW_LISTS = new Set(['blog']);
/** Listes en grille (plan 14, D92) : entrées `.card` sur `bg`, bloc à la une sur /projets seulement. */
const FEATURED_LISTS = new Set(['projets']);

for (const list of LISTS) {
  const rowList = ROW_LISTS.has(list);
  if (!rowList) gridEntries[list] = 0;
  const file = join(DIST, list, 'index.html');
  if (!existsSync(file)) {
    errors.push(`${file} introuvable`);
    continue;
  }
  const { elements } = collectElements(tokenize(readFileSync(file, 'utf8')));
  const roots = elements.filter((el) => has(el, 'data-list'));
  if (roots.length !== 1) {
    errors.push(`/${list}/ : ${roots.length} [data-list] (attendu : 1)`);
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

  const cards = scope.filter((el) => classes(el).includes('card'));
  const entries = scope.filter((el) => has(el, 'data-entry-id'));
  if (entries.length === 0) errors.push(`/${list}/ : aucune entrée [data-entry-id]`);
  const found = (part) =>
    scope.filter((el) => has(el, part) && !(part === 'data-rail' && has(el, 'data-thumb-derived')));

  if (rowList) {
    blogFrames = cards.length;
    if (cards.length !== 1) errors.push(`/${list}/ : ${cards.length} .card dans [data-list] (attendu : 1)`);
    const inFrame = cards[0] ? new Set(descendants(cards[0])) : new Set();
    for (const part of ['data-rail', 'data-list-grid', 'data-list-empty']) {
      const parts = found(part);
      if (parts.length !== 1) errors.push(`/${list}/ : ${parts.length} [${part}] (attendu : 1)`);
      else if (!inFrame.has(parts[0])) errors.push(`/${list}/ : [${part}] hors du .card`);
    }
    const featured = elements.filter((el) => has(el, 'data-list-featured'));
    if (featured.length > 0) errors.push(`/${list}/ : ${featured.length} [data-list-featured] (attendu : 0)`);
    for (const entry of entries) {
      const id = entry.attrs['data-entry-id'];
      rows += 1;
      if (classes(entry).includes('card-inner')) errors.push(`/${list}/ : la ligne ${id} est un .card-inner`);
      if (!inFrame.has(entry)) errors.push(`/${list}/ : la ligne ${id} est hors du .card`);
    }
    continue;
  }

  // Liste en grille (plan 14) : pas de cadre, chaque entrée est un `.card` sur `bg`.
  const featuredExpected = FEATURED_LISTS.has(list) ? 1 : 0;
  for (const [part, expected] of [
    ['data-list-featured', featuredExpected],
    ['data-list-grid', 1],
    ['data-list-empty', 1],
  ]) {
    const parts = found(part);
    if (parts.length !== expected) errors.push(`/${list}/ : ${parts.length} [${part}] (attendu : ${expected})`);
  }
  const entrySet = new Set(entries);
  for (const card of cards) {
    if (!entrySet.has(card)) errors.push(`/${list}/ : ${describe(card)} est un .card sans data-entry-id (cadre ?)`);
  }
  for (const entry of entries) {
    const id = entry.attrs['data-entry-id'];
    const host = paintedParent(entry);
    if (!classes(entry).includes('card')) errors.push(`/${list}/ : l'entrée ${id} n'est pas un .card`);
    else if (host.level !== 'bg') {
      errors.push(`/${list}/ : l'entrée ${id} est posée sur ${host.level} (${describe(host.el)}) (attendu : bg)`);
    } else gridEntries[list] += 1;
  }
}

lines.push(`live: ${live.join(' ') || '(aucune)'}`);
const gridLists = Object.keys(gridEntries);
const onBg = gridLists.reduce((sum, list) => sum + gridEntries[list], 0);
lines.push(
  `lists: blog ${blogFrames} .card · ${rows} blog rows · ${onBg} .card entries on bg (${gridLists
    .map((list) => `${list} ${gridEntries[list]}`)
    .join(' · ')})`,
);
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
