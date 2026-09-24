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
 * R2 (nav) — sur chaque page, les items du `<nav aria-label="Navigation
 * principale">` de l'en-tête, dans l'ordre du document, donnent le même texte
 * que sur `/` (ligne imprimée) : Blog Projets Skills Prompts À propos.
 *
 * R2 (active) — sur chaque page, les items `aria-current="page"` sont
 * exactement celui de la famille de route (`/blog/**` → Blog, `/projets/**` →
 * Projets, `/skills/**` → Skills, `/prompts/**` → Prompts, `/a-propos/**` →
 * À propos ; aucun ailleurs : `/`, `/tags/**`, `/transparence-ia/`, `/404`),
 * et l'item actif porte `text-accent bg-accentSoft font-semibold` (accent sur
 * accentSoft, 600) ; un item inactif ne porte ni `text-accent` ni
 * `bg-accentSoft`. Le `<header>` ne porte aucune classe `border-b*`.
 *
 * R2 (actions) — sur chaque page, le groupe `[data-header-actions]` contient
 * exactement 3 contrôles (`button` / `a`), chacun `rounded-pill` + `bg-chip`,
 * et l'en-tête ne contient aucun `<kbd>` (le rappel ⌘K est retiré, D72 ; le
 * raccourci reste). Le bouton de thème `#theme-toggle` et le déclencheur
 * `[data-search-open]` en font partie.
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

// Famille de route → libellé de l'item de nav actif (R2 active).
const NAV_FAMILY = {
  blog: 'Blog',
  projets: 'Projets',
  skills: 'Skills',
  prompts: 'Prompts',
  'a-propos': 'À propos',
};
const ACTIVE_CLASSES = ['text-accent', 'bg-accentSoft', 'font-semibold'];

const pages = htmlFiles(DIST)
  .map((file) => ({ file, route: route(file) }))
  .filter((page) => !page.route.startsWith('/admin/'));

// — R2 : coque et pied de page, page par page —
let shellOk = 0;
let homeFooter = null;
const footers = new Map(); // route → texte du pied de page
let homeNav = null;
const navs = new Map(); // route → libellés de la nav
let activeOk = 0;
let actionsOk = 0;

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

  // — R2 : en-tête (nav, item actif, actions) —
  const headers = elements.filter((el) => el.tag === 'header');
  if (headers.length !== 1) {
    errors.push(`${page.route} : ${headers.length} <header> (attendu : 1)`);
    continue;
  }
  const header = headers[0];
  const borderB = classes(header).filter((cls) => /^border-b/.test(cls));
  if (borderB.length > 0) errors.push(`${page.route} : <header> porte ${borderB.join(', ')}`);

  const inHeader = descendants(header);
  const nav = inHeader.find((el) => el.tag === 'nav' && el.attrs['aria-label'] === 'Navigation principale');
  if (!nav) {
    errors.push(`${page.route} : pas de <nav aria-label="Navigation principale"> dans l'en-tête`);
  } else {
    const items = descendants(nav).filter((el) => el.tag === 'a' || el.tag === 'span' && el.attrs['aria-disabled']);
    const labels = items.map((el) => squash(el.text));
    navs.set(page.route, labels.join(' '));
    if (page.route === '/') homeNav = labels.join(' ');

    const expected = NAV_FAMILY[page.route.split('/')[1]] ?? null;
    const current = items.filter((el) => el.attrs['aria-current'] === 'page');
    let activeGood = true;
    const currentLabels = current.map((el) => squash(el.text));
    if (expected === null ? current.length !== 0 : currentLabels.join('|') !== expected) {
      activeGood = false;
      errors.push(
        `${page.route} : item(s) actif(s) « ${currentLabels.join(', ') || '—'} » (attendu : « ${expected ?? '—'} »)`,
      );
    }
    for (const el of items) {
      const cls = classes(el);
      const label = squash(el.text);
      if (el.attrs['aria-current'] === 'page') {
        const missing = ACTIVE_CLASSES.filter((c) => !cls.includes(c));
        if (missing.length > 0) {
          activeGood = false;
          errors.push(`${page.route} : item actif « ${label} » sans ${missing.join(', ')}`);
        }
      } else if (cls.includes('text-accent') || cls.includes('bg-accentSoft')) {
        activeGood = false;
        errors.push(`${page.route} : item inactif « ${label} » peint en accent`);
      }
    }
    if (activeGood) activeOk += 1;
  }

  const actions = inHeader.filter((el) => 'data-header-actions' in el.attrs);
  let actionsGood = true;
  if (actions.length !== 1) {
    actionsGood = false;
    errors.push(`${page.route} : ${actions.length} [data-header-actions] (attendu : 1)`);
  } else {
    const controls = descendants(actions[0]).filter((el) => el.tag === 'button' || el.tag === 'a');
    const round = controls.filter((el) => classes(el).includes('bg-chip') && classes(el).includes('rounded-pill'));
    if (controls.length !== 3 || round.length !== 3) {
      actionsGood = false;
      errors.push(`${page.route} : ${controls.length} contrôles d'actions dont ${round.length} ronds sur chip (attendu : 3 / 3)`);
    }
    if (!controls.some((el) => el.attrs.id === 'theme-toggle')) {
      actionsGood = false;
      errors.push(`${page.route} : pas de #theme-toggle dans les actions`);
    }
    if (!controls.some((el) => 'data-search-open' in el.attrs)) {
      actionsGood = false;
      errors.push(`${page.route} : pas de [data-search-open] dans les actions`);
    }
  }
  if (inHeader.some((el) => el.tag === 'kbd')) {
    actionsGood = false;
    errors.push(`${page.route} : <kbd> dans l'en-tête`);
  }
  if (actionsGood) actionsOk += 1;
}

lines.push(`shell: ${shellOk}/${pages.length} pages · header, main, footer on max-w-shell`);

// — R2 : en-tête —
if (homeNav === null) {
  errors.push('/ : pas de nav mesurable');
  lines.push('nav: —');
} else {
  for (const [page, text] of navs) {
    if (text !== homeNav) errors.push(`${page} : nav « ${text} » (attendu : « ${homeNav} », comme sur /)`);
  }
  lines.push(`nav: ${homeNav}`);
}
lines.push(`active: ${activeOk}/${pages.length} pages`);
lines.push(
  actionsOk === pages.length
    ? 'actions: 3 round buttons on chip · no kbd'
    : `actions: ${actionsOk}/${pages.length} pages with 3 round buttons on chip · no kbd`,
);

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
