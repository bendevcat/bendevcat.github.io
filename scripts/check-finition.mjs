#!/usr/bin/env node
/**
 * Contrôle de la finition sur la sortie de build (Plan 11, critères R6, R7
 * — et, à partir de T4, R11, R12, R13, R15). À lancer après `npm run build` :
 *
 *   node scripts/check-finition.mjs
 *
 * Imprime sur stdout, dans cet ordre :
 *
 *   live: <listes>                  (R6 — T3)
 *   lists: <n> × 1 .card · <e> .card-inner entries   (R7 — T3)
 *   v2: <a> card-level on bg · <b> rail off card level · <d> derived thumbnails   (R7 — T3)
 *   fallback: …   eager: …   tags: …   ai-markers: …   (T4 — pas encore
 *   contrôlées : signalées manquantes sur stderr, sans changer le code de sortie)
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
 *
 * R7 (V2, statique) — sur chaque page de `dist/`, pour tout élément de niveau
 * `card` (`.card-inner`, `bg-card`) : son plus proche ancêtre PEINT est de
 * niveau `surface` ou `card` (`.card`, `.panel`, `bg-surface`, `.card-inner`,
 * `bg-card`) — sinon c'est un `card` posé sur `bg` ; pour tout élément de
 * niveau `rail` (`bg-rail`, `[data-thumb-derived]`) : son plus proche ancêtre
 * peint est de niveau `card` (`.card-inner`, `bg-card`). « Peint » = une
 * classe de patron qui pose un fond (`card`, `card-inner`, `panel`, `pill`)
 * ou un utilitaire `bg-<token>` (avec ou sans `/NN`) nommant un token
 * `--color-*` de global.css ; les variantes (`hover:`, `dark:`, `backdrop:`…)
 * ne peignent pas au repos et sont ignorées. Même DOM dans les deux thèmes :
 * le rendu sombre (où les quatre niveaux diffèrent) est mesuré par T6.
 *
 * Aucune dépendance : même petit tokeniseur que scripts/check-home.mjs, avec
 * un lien enfant → parent (comme scripts/check-secondary.mjs).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const GLOBAL_CSS = join('src', 'styles', 'global.css');
const LISTS = ['blog', 'projets', 'prompts', 'skills'];
/** Lignes de T4 : signalées manquantes tant que T4 ne les a pas ajoutées. */
const PENDING = ['fallback', 'eager', 'tags', 'ai-markers'];

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

/** Tous les éléments, dans l'ordre du document, avec leurs enfants directs et leur parent. */
function collectElements(tokens) {
  const root = { tag: '#root', attrs: {}, children: [], parent: null };
  const elements = [];
  const stack = [root];
  for (const token of tokens) {
    if (token.type === 'open') {
      const parent = stack[stack.length - 1];
      const el = { tag: token.tag, attrs: token.attrs, children: [], parent };
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
let cardOnBg = 0;
let railOffCard = 0;
let derived = 0;

for (const file of htmlFiles(DIST)) {
  const page = route(file);
  const { elements } = collectElements(tokenize(readFileSync(file, 'utf8')));
  for (const el of elements) {
    const own = paints(el);
    const rail = own === 'rail' || has(el, 'data-thumb-derived');
    if (has(el, 'data-thumb-derived')) derived += 1;
    if (own === 'card') {
      const host = paintedParent(el);
      if (!CARD_HOSTS.has(host.level)) {
        cardOnBg += 1;
        errors.push(`${page} ${describe(el)} : niveau card posé sur ${host.level}${host.el ? ` (${describe(host.el)})` : ''}`);
      }
    }
    if (rail) {
      const host = paintedParent(el);
      if (host.level !== 'card') {
        railOffCard += 1;
        errors.push(`${page} ${describe(el)} : niveau rail posé sur ${host.level}${host.el ? ` (${describe(host.el)})` : ''} (attendu : card)`);
      }
    }
  }
}

// — Listes : région live (R6) et cadre unique (R7) —
const live = [];
const frameCounts = [];
let entries = 0;

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
  for (const part of ['data-list-featured', 'data-list-grid', 'data-list-empty']) {
    const found = scope.filter((el) => has(el, part));
    if (found.length !== 1) errors.push(`/${list}/ : ${found.length} [${part}] (attendu : 1)`);
    else if (!inFrame.has(found[0])) errors.push(`/${list}/ : [${part}] hors du .card`);
  }
  for (const entry of scope.filter((el) => has(el, 'data-entry-id'))) {
    entries += 1;
    const id = entry.attrs['data-entry-id'];
    if (!classes(entry).includes('card-inner')) errors.push(`/${list}/ : l'entrée ${id} n'est pas un .card-inner`);
    if (!inFrame.has(entry)) errors.push(`/${list}/ : l'entrée ${id} est hors du .card`);
  }
  if (!scope.some((el) => has(el, 'data-entry-id'))) errors.push(`/${list}/ : aucune entrée [data-entry-id]`);
}

lines.push(`live: ${live.join(' ') || '(aucune)'}`);
const frames = frameCounts.every((n) => n === 1)
  ? `${LISTS.length} × 1 .card`
  : LISTS.map((list, i) => `${list} ${frameCounts[i]} .card`).join(', ');
lines.push(`lists: ${frames} · ${entries} .card-inner entries`);
lines.push(`v2: ${cardOnBg} card-level on bg · ${railOffCard} rail off card level · ${derived} derived thumbnails`);

for (const line of lines) console.log(line);
for (const error of errors) console.error(`  ✗ ${error}`);
for (const key of PENDING) console.error(`  … ${key}: pas encore contrôlé (T4)`);
process.exit(errors.length > 0 ? 1 : 0);
