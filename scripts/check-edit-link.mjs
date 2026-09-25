#!/usr/bin/env node
/**
 * Contrôle du lien ✏️ Éditer des pages de détail sur la sortie de build
 * (plan 22, T5, critère R15 ; décision D150). À lancer après `npm run build` :
 *
 *   node scripts/check-edit-link.mjs --base <dist de base> [--dist <dist>]
 *
 * `--base` : le `dist/` d'un build de référence sans le lien (plan 22 : le
 * build de `74bc756` dans un worktree jetable). `--dist` : la sortie contrôlée
 * (défaut `dist/` du dépôt ; sert aux défauts plantés sur une copie).
 *
 * Imprime sur stdout, dans cet ordre, les lignes attendues (EXPECTED) :
 *
 *   edit link: … — pages de détail attendues LUES SUR DISQUE, comme
 *     `check-admin.mjs` (« view on site ») : pour chaque collection de
 *     `public/admin/config.yml`, chaque entrée `<folder>/<id>/index.md` non
 *     brouillon, page `dist/<preview_path>/index.html`. Une page compte si
 *     elle porte EXACTEMENT un `<a data-edit-link>`, et que ce lien :
 *     - a l'attribut `hidden` (caché sans JS et sans marqueur) et
 *       `data-pagefind-ignore` ;
 *     - a `href="/admin/#/collections/<name>/entries/<id>/index"` — la route
 *       d'entrée de Sveltia 0.221 pour `path: '{{slug}}/index'`
 *       (`src/lib/editLink.test.ts` la dérive des sources de Sveltia) ;
 *     - a `aria-label="Éditer dans le CMS"` ;
 *     - est dans `<main>` et HORS de l'élément `data-pagefind-body` ;
 *     et si la page charge le script qui le révèle (un `<script>` inline, ou
 *     un fichier de `dist/_astro/`, contenant la clé `bencat:author`).
 *     « elsewhere » compte les `data-edit-link` de toutes les autres pages
 *     (listes `/blog`, `/projets`…, accueil, admin…) : attendu 0.
 *   site pages: … — chaque page HTML de la base hors `admin/` existe dans la
 *     sortie et lui est identique octet pour octet une fois retirés, côté
 *     sortie, le `<a data-edit-link>…</a>` et le `<script>` inline qui porte
 *     `bencat:author` (ou la balise `<script src>` de son fichier). Seule
 *     normalisation des deux côtés : le hachage du nom de la feuille de style
 *     (`/_astro/<nom>.<hachage>.css` → `/_astro/<nom>.css`) — les utilitaires
 *     du lien (`bottom-4`, `z-30`…) changent la feuille, donc son nom sur
 *     toutes les pages. Le CONTENU de la feuille n'est pas comparé ici (règles
 *     de base toutes présentes : critère R24, contrôle séparé). Pages
 *     identiques attendues : toutes celles de la base hors `admin/`.
 *   pagefind: … — `dist/pagefind/index/` et `dist/pagefind/fragment/` ont
 *     les mêmes fichiers (noms = hachages de contenu, octets comparés) que la
 *     base, et aucun fragment décompressé ne contient `Éditer dans le CMS`
 *     ni `✏️` : le lien n'entre pas dans l'index de recherche.
 *
 * Toute ligne différente de l'attendu est signalée sur stderr APRÈS stdout ;
 * code de sortie 1 s'il y en a au moins une (ou si `--base` manque).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { parse as parseYaml } from 'yaml';

const ROOT = new URL('..', import.meta.url).pathname;

function option(name) {
  const at = process.argv.indexOf(name);
  return at > 0 ? process.argv[at + 1] : undefined;
}

const DIST = resolve(option('--dist') ?? join(ROOT, 'dist'));
const BASE = option('--base') && resolve(option('--base'));
if (!BASE) {
  console.error('check-edit-link: --base <dist de base> requis (build de référence sans le lien).');
  process.exit(1);
}
for (const [label, dir] of [
  ['dist', DIST],
  ['base', BASE],
]) {
  if (!existsSync(dir)) {
    console.error(`check-edit-link: ${label} absent (${dir}) — lancer \`npm run build\` d’abord.`);
    process.exit(1);
  }
}
const ASTRO = join(DIST, '_astro');

const MARKER = 'bencat:author';
const LABEL = 'Éditer dans le CMS';

/** Tous les fichiers `.html` d'un dossier, chemins relatifs POSIX, triés. */
function htmlFiles(dir, root = dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...htmlFiles(path, root));
    else if (name.endsWith('.html')) out.push(relative(root, path).split(sep).join('/'));
  }
  return out.sort();
}

const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const hasAttr = (tag, name) => new RegExp(`\\s${name}(?=[\\s>=/])`).test(tag);

/** Liens d'édition d'une page : balise ouvrante, élément complet, position. */
const EDIT_LINK = /<a\b(?=[^>]*\sdata-edit-link(?=[\s>=]))[^>]*>[\s\S]*?<\/a\s*>/g;
const editLinks = (html) =>
  [...html.matchAll(EDIT_LINK)].map((m) => ({ element: m[0], tag: m[0].match(/^<a\b[^>]*>/)[0], at: m.index }));

/** Balises `<script>` qui portent le script du lien (inline ou fichier `_astro`). */
function revealScripts(html, astroDir) {
  const out = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const src = attr(` ${m[1]}`, 'src');
    let carries = false;
    if (src) {
      const file = src.startsWith('/_astro/') ? join(astroDir, src.slice('/_astro/'.length)) : undefined;
      carries = !!file && existsSync(file) && readFileSync(file, 'utf8').includes(MARKER);
    } else {
      carries = m[2].includes(MARKER);
    }
    if (carries) out.push(m[0]);
  }
  return out;
}

/** Intervalle [début, fin) de l'élément ouvert à `start` (balises de même nom comptées). */
function elementRange(html, start) {
  const name = html.slice(start).match(/^<([a-zA-Z][\w-]*)/)?.[1];
  if (!name) return undefined;
  const re = new RegExp(`<(/?)${name}\\b[^>]*>`, 'g');
  re.lastIndex = start;
  let depth = 0;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return [start, m.index + m[0].length];
  }
  return undefined;
}

const lines = [];
const notes = [];

// --- edit link --------------------------------------------------------------
/** Pages de détail attendues : `dist`-relatif → href attendu. */
const expected = new Map();
{
  const cfg = parseYaml(readFileSync(join(ROOT, 'public', 'admin', 'config.yml'), 'utf8'));
  for (const collection of cfg?.collections ?? []) {
    if (!collection.folder || typeof collection.preview_path !== 'string') continue;
    const folder = join(ROOT, collection.folder);
    if (!existsSync(folder)) continue;
    for (const id of readdirSync(folder).sort()) {
      const file = join(folder, id, 'index.md');
      if (!existsSync(file)) continue;
      const fm = readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
      if (parseYaml(fm)?.draft === true) continue;
      const page = `${collection.preview_path.replaceAll('{{slug}}', id).replace(/^\/+|\/+$/g, '')}/index.html`;
      expected.set(page, `/admin/#/collections/${collection.name}/entries/${id}/index`);
    }
  }
}
const pages = htmlFiles(DIST);
{
  let ok = 0;
  for (const [page, href] of expected) {
    const path = join(DIST, page);
    if (!existsSync(path)) {
      notes.push(`${page}: page absente`);
      continue;
    }
    const html = readFileSync(path, 'utf8');
    const links = editLinks(html);
    const problems = [];
    if (links.length !== 1) problems.push(`${links.length} a[data-edit-link]`);
    for (const { tag, at } of links) {
      if (!hasAttr(tag, 'hidden')) problems.push('sans hidden');
      if (!hasAttr(tag, 'data-pagefind-ignore')) problems.push('sans data-pagefind-ignore');
      if (attr(tag, 'href') !== href) problems.push(`href ${attr(tag, 'href')} ≠ ${href}`);
      if (attr(tag, 'aria-label') !== LABEL) problems.push(`aria-label ${attr(tag, 'aria-label')}`);
      const main = html.indexOf('<main');
      const mainRange = main >= 0 ? elementRange(html, main) : undefined;
      if (!mainRange || at < mainRange[0] || at >= mainRange[1]) problems.push('hors de <main>');
      for (const body of html.matchAll(/<[a-zA-Z][\w-]*\b[^>]*\sdata-pagefind-body(?=[\s>=])[^>]*>/g)) {
        const range = elementRange(html, body.index);
        if (!range) problems.push('élément data-pagefind-body non fermé');
        else if (at >= range[0] && at < range[1]) problems.push('dans data-pagefind-body');
      }
    }
    if (revealScripts(html, ASTRO).length === 0) problems.push(`aucun script portant ${MARKER}`);
    if (problems.length) notes.push(`${page}: ${problems.join(', ')}`);
    else ok += 1;
  }
  let elsewhere = 0;
  for (const page of pages) {
    if (expected.has(page)) continue;
    const n = [...readFileSync(join(DIST, page), 'utf8').matchAll(/\sdata-edit-link(?=[\s>=])/g)].length;
    if (n) notes.push(`${page}: ${n} data-edit-link hors page de détail`);
    elsewhere += n;
  }
  lines.push(
    `edit link: ${ok}/${expected.size} detail pages · 1 a[data-edit-link][hidden] each · ` +
      `href = /admin/#/collections/<name>/entries/<id>/index · outside data-pagefind-body · ${elsewhere} elsewhere`,
  );
}

// --- site pages ---------------------------------------------------------------
const basePages = htmlFiles(BASE).filter((page) => !page.startsWith('admin/'));
{
  const stylesheetName = (html) => html.replace(/(\/_astro\/[\w.-]+?)\.[\w-]{8}\.css\b/g, '$1.css');
  let identical = 0;
  for (const page of basePages) {
    const path = join(DIST, page);
    if (!existsSync(path)) {
      notes.push(`site pages: ${page} absente de la sortie`);
      continue;
    }
    let html = readFileSync(path, 'utf8');
    for (const { element } of editLinks(html)) html = html.replace(element, '');
    for (const script of revealScripts(html, ASTRO)) html = html.replace(script, '');
    const base = readFileSync(join(BASE, page), 'utf8');
    if (stylesheetName(html) === stylesheetName(base)) identical += 1;
    else notes.push(`site pages: ${page} diffère de la base au-delà du lien et de son script`);
  }
  lines.push(`site pages: ${identical} identical to base once the edit link and its script are removed`);
}

// --- pagefind -----------------------------------------------------------------
{
  const listing = (root, sub) => {
    const dir = join(root, 'pagefind', sub);
    return existsSync(dir) ? readdirSync(dir).sort() : [];
  };
  let same = true;
  for (const sub of ['index', 'fragment']) {
    const tip = listing(DIST, sub);
    const base = listing(BASE, sub);
    if (tip.length === 0 || JSON.stringify(tip) !== JSON.stringify(base)) {
      same = false;
      notes.push(`pagefind/${sub}: ${tip.length} fichiers, base ${base.length} (noms différents)`);
      continue;
    }
    for (const name of tip) {
      if (!readFileSync(join(DIST, 'pagefind', sub, name)).equals(readFileSync(join(BASE, 'pagefind', sub, name)))) {
        same = false;
        notes.push(`pagefind/${sub}/${name}: octets différents`);
      }
    }
  }
  const fragments = listing(DIST, 'fragment');
  let leaking = 0;
  for (const name of fragments) {
    const text = gunzipSync(readFileSync(join(DIST, 'pagefind', 'fragment', name))).toString('utf8');
    if (text.includes(LABEL) || text.includes('✏️')) {
      leaking += 1;
      notes.push(`pagefind/fragment/${name}: contient le texte du lien`);
    }
  }
  lines.push(
    `pagefind: ${same ? 'index and fragments identical to base' : 'index or fragments DIFFER from base'} · ` +
      `${leaking} fragment with the edit link text`,
  );
}

const EXPECTED = [
  `edit link: ${expected.size}/${expected.size} detail pages · 1 a[data-edit-link][hidden] each · ` +
    'href = /admin/#/collections/<name>/entries/<id>/index · outside data-pagefind-body · 0 elsewhere',
  `site pages: ${basePages.length} identical to base once the edit link and its script are removed`,
  'pagefind: index and fragments identical to base · 0 fragment with the edit link text',
];

for (const line of lines) console.log(line);

const errors = [];
if (expected.size === 0) errors.push('aucune page de détail attendue (config.yml ou src/content illisible)');
EXPECTED.forEach((want, i) => {
  if (lines[i] !== want) errors.push(`attendu : ${want}\n  obtenu  : ${lines[i]}`);
});
if (errors.length) {
  for (const e of [...errors, ...notes]) console.error(`check-edit-link: ${e}`);
  process.exit(1);
}
