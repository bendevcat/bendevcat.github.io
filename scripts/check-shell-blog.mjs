#!/usr/bin/env node
/**
 * Contrôle de la coque et de la liste /blog sur la sortie de build (plan 12,
 * critères R2 et R11). À lancer après `npm run build` :
 *
 *   node scripts/check-shell-blog.mjs
 *
 * Imprime sur stdout, dans cet ordre :
 *
 *   shell: <ok>/<n> pages · header, main, footer on max-w-shell   (R2 — T1)
 *   nav: …                                                           (R2 — T2)
 *   active: …                                                        (R2 — T2)
 *   actions: …                                                       (R2 — T2)
 *   footer: <texte gauche> | <texte droit>                           (R2 — T1)
 *   blog header / rail / tags / rows / meta / sort: …               (R11 — T5)
 *
 * Les erreurs sont collectées puis imprimées sur stderr APRÈS toutes les
 * lignes de stdout. Code de sortie 1 s'il y en a au moins une. Une ligne que
 * ce script ne sait pas encore mesurer (tâche du plan pas encore livrée) est
 * signalée comme manquante sur stderr : le code de sortie reste 1 tant que les
 * 11 lignes ne sont pas toutes mesurées.
 *
 * R2 (shell) — sur chaque page HTML de `dist/` hors `/admin/` (l'admin est
 * celui de Sveltia, pas notre coque) : exactement un élément de chaque sorte
 * `data-shell="header"`, `data-shell="main"`, `data-shell="footer"`, chacun
 * portant les classes `mx-auto` et `max-w-shell` (1180 px, `--container-shell`
 * de global.css).
 *
 * R2 (footer) — sur chaque page, le `data-shell="footer"` est un `<footer>`,
 * ses paragraphes donnent le même texte que sur `/` (ligne imprimée : les
 * paragraphes joints par ` | `), et son texte ne contient jamais `prototype`
 * (le texte de démo du prototype, R4).
 *
 * Aucune dépendance : même petit tokeniseur que scripts/check-finition.mjs.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const SHELL_KINDS = ['header', 'main', 'footer'];

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

/** Tous les éléments, dans l'ordre du document, avec enfants directs, parent et texte décodé. */
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

const descendants = (el) => el.children.flatMap((child) => [child, ...descendants(child)]);
const classes = (el) => (el.attrs.class ?? '').split(/\s+/).filter(Boolean);
const squash = (text) => text.replace(/\s+/g, ' ').trim();

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

const lines = [];
const errors = [];

if (!existsSync(DIST)) {
  console.error(`${DIST}/ introuvable — lancer \`npm run build\` d'abord`);
  process.exit(1);
}

const pages = htmlFiles(DIST)
  .map((file) => ({ file, route: route(file) }))
  .filter((page) => !page.route.startsWith('/admin/'));

// — R2 : coque et pied de page, page par page —
let shellOk = 0;
let homeFooter = null;
const footers = new Map(); // route → texte du pied de page

for (const page of pages) {
  const { elements } = collectElements(tokenize(readFileSync(page.file, 'utf8')));
  let ok = true;
  for (const kind of SHELL_KINDS) {
    const boxes = elements.filter((el) => el.attrs['data-shell'] === kind);
    if (boxes.length !== 1) {
      ok = false;
      errors.push(`${page.route} : ${boxes.length} [data-shell="${kind}"] (attendu : 1)`);
      continue;
    }
    const missing = ['mx-auto', 'max-w-shell'].filter((cls) => !classes(boxes[0]).includes(cls));
    if (missing.length > 0) {
      ok = false;
      errors.push(`${page.route} : [data-shell="${kind}"] sans ${missing.join(', ')}`);
    }
    if (kind === 'footer') {
      const footer = boxes[0];
      if (footer.tag !== 'footer') errors.push(`${page.route} : [data-shell="footer"] est un <${footer.tag}> (attendu : <footer>)`);
      if (/prototype/i.test(footer.text)) errors.push(`${page.route} : le pied de page contient « prototype »`);
      const parts = descendants(footer)
        .filter((el) => el.tag === 'p')
        .map((el) => squash(el.text))
        .filter(Boolean);
      footers.set(page.route, parts.join(' | '));
      if (page.route === '/') homeFooter = parts.join(' | ');
    }
  }
  if (ok) shellOk += 1;
}

lines.push(`shell: ${shellOk}/${pages.length} pages · header, main, footer on max-w-shell`);

// — Lignes des tâches suivantes du plan (T2 : en-tête ; T5 : /blog) —
const PENDING = [
  ['nav', 'T2'],
  ['active', 'T2'],
  ['actions', 'T2'],
];
for (const [name, task] of PENDING) errors.push(`${name}: pas encore mesuré (plan 12 ${task})`);

if (homeFooter === null) {
  errors.push('/ : pas de pied de page mesurable');
  lines.push('footer: —');
} else {
  for (const [page, text] of footers) {
    if (text !== homeFooter) errors.push(`${page} : pied de page « ${text} » (attendu : « ${homeFooter} », comme sur /)`);
  }
  lines.push(`footer: ${homeFooter}`);
}

for (const name of ['blog header', 'blog rail', 'blog tags', 'blog rows', 'blog meta', 'blog sort']) {
  errors.push(`${name}: pas encore mesuré (plan 12 T5)`);
}

for (const line of lines) console.log(line);
for (const error of errors) console.error(`  ✗ ${error}`);
process.exit(errors.length > 0 ? 1 : 0);
