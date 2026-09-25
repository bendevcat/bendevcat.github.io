#!/usr/bin/env node
/**
 * Parité texte des aperçus `/admin/` avec les pages du build (plan 21, T8,
 * critère R8 ; décisions D138, D140). À lancer après `npm run build` :
 *
 *   node scripts/check-previews.mjs
 *
 * Pour chaque entrée `src/content/<collection>/<slug>/index.md` d'une
 * collection qui a un gabarit d'aperçu (`PREVIEWS` de
 * src/admin/previews/register.ts, ceux que Sveltia reçoit), le gabarit est
 * appelé sur l'entrée lue sur disque (`diskEntries` : frontmatter lu avec
 * `yaml` comme le CMS, corps rendu par le pipeline du site), avec le `h` hors
 * navigateur (`treeH`) ; son arbre est sérialisé puis relu (`treeNodes`). Les
 * gabarits et leurs imports TypeScript (`src/lib/`) sont chargés par un
 * serveur Vite en mode SSR (`createServer` + `ssrLoadModule`), sans la config
 * d'Astro.
 *
 * Chaque région de la colonne centrale (crochets des pages, voir REGIONS) est
 * cherchée dans l'arbre de l'aperçu ET dans `dist/<preview_path>/index.html`
 * (`preview_path` de public/admin/config.yml, `{{slug}}` → dossier) ; leurs
 * textes doivent être égaux. Texte = `regionText` (html.ts) : nœuds texte
 * hors `button`, `[hidden]`, `input`, `svg`, `script` ; NBSP → espace ; blancs
 * réduits. Une région absente des deux côtés est omise (règle de la page) ;
 * absente d'un seul côté, c'est un écart.
 *
 * Imprime sur stdout :
 *
 *   previews: blog <ok>/<P> · projects <ok>/<P> · prompts <ok>/<P> · skills <ok>/<P> published entries — centre-column text = page
 *   drafts: <ok> previewed without page
 *
 * `<P>` = entrées publiées (pas `draft: true`) sur disque ; `<ok>` = celles
 * dont chaque région égale la page (et au moins une région non vide). Un
 * brouillon compte dans `drafts` si son aperçu a au moins une région non vide
 * et qu'aucune page n'est construite pour lui. Comptes lus sur disque, jamais
 * figés (D131).
 *
 * Chaque écart est détaillé sur stderr APRÈS stdout ; code de sortie 1 s'il y
 * en a au moins un (ou si `dist/` manque).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { parse as parseYaml } from 'yaml';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');

if (!existsSync(DIST)) {
  console.error('check-previews: dist/ absent — lancer `npm run build` d’abord.');
  process.exit(1);
}

/* ------------------------------------------------------------------------ */
/* Sélection dans les nœuds de html.ts (`parseHtml` / `treeNodes`)           */
/* ------------------------------------------------------------------------ */

const isElement = (node) => typeof node !== 'string';
const has = (name, value) => (el) => Object.hasOwn(el.attrs, name) && (value === undefined || el.attrs[name] === value);
const hasClass = (name) => (el) => (el.attrs.class ?? '').split(/\s+/).includes(name);
const isTag = (tag) => (el) => el.tag === tag;
const both = (a, b) => (el) => a(el) && b(el);

/** Éléments qui vérifient `test`, en profondeur, ordre du document. */
function findAll(nodes, test) {
  const found = [];
  const walk = (list) => {
    for (const node of list) {
      if (!isElement(node)) continue;
      if (test(node)) found.push(node);
      walk(node.children);
    }
  };
  walk(nodes);
  return found;
}

const findFirst = (nodes, test) => findAll(nodes, test)[0];

/** Parent de chaque élément de `nodes` (racines : `null`). */
function parents(nodes) {
  const map = new Map();
  const walk = (list, parent) => {
    for (const node of list) {
      if (!isElement(node)) continue;
      map.set(node, parent);
      walk(node.children, node);
    }
  };
  walk(nodes, null);
  return map;
}

/** Copie de `el` sans ses descendants qui vérifient `test`. */
function without(el, test) {
  const prune = (node) =>
    isElement(node) ? { ...node, children: node.children.filter((c) => !isElement(c) || !test(c)).map(prune) } : node;
  return prune(el);
}

/* ------------------------------------------------------------------------ */
/* Régions de la colonne centrale (plan 21, « Built facts »)                 */
/* ------------------------------------------------------------------------ */

/**
 * Régions d'une collection : `(nodes, page) => [[nom, nœuds | undefined]]`.
 * `page` = vrai pour la page du build (portée `article`, onglet Aperçu), faux
 * pour l'arbre de l'aperçu (sa racine `[data-preview]`).
 */
const REGIONS = {
  prompts: (nodes) => [
    ['window', findFirst(nodes, has('data-prompt-window'))],
    ['variables', findFirst(nodes, has('data-prompt-variables'))],
    ['notes', findFirst(nodes, has('data-prompt-notes'))],
  ],

  // Le parent de `.prose` dans `article`, moins sa `nav` (précédent/suivant).
  blog: (nodes, page) => {
    const scopes = page ? findAll(nodes, isTag('article')) : nodes;
    const tree = parents(nodes);
    const prose = findFirst(scopes, hasClass('prose'));
    const column = prose ? tree.get(prose) : undefined;
    return [['column', column ? without(column, isTag('nav')) : undefined]];
  },

  projects: (nodes, page) => {
    const tree = parents(nodes);
    const header = findFirst(nodes, has('data-project-header'));
    const meta = findFirst(nodes, has('data-project-meta'));
    // La prose de l'onglet Aperçu (l'aperçu n'a pas d'onglets).
    const apercu = page ? findFirst(nodes, both(has('role', 'tabpanel'), has('id', 'tabpanel-apercu'))) : undefined;
    const tiles = findFirst(nodes, both(isTag('ul'), has('aria-label', 'Technologies')));
    const tileParent = tiles ? tree.get(tiles) : undefined;
    const label = tileParent?.children.find((child) => isElement(child) && has('data-panel-label')(child));
    return [
      ['header', header ? without(header, has('data-project-back')) : undefined],
      ['meta', meta ? findFirst([meta], isTag('dl')) : undefined],
      ['prose', findFirst(apercu ? [apercu] : nodes, hasClass('prose'))],
      ['code', findFirst(nodes, has('data-code-window'))],
      ['stack', tiles ? [label, tiles].filter(Boolean) : undefined],
    ];
  },

  skills: (nodes) => [
    ['install', findFirst(nodes, has('data-install-window'))],
    ['highlights', findFirst(nodes, has('data-skill-highlights'))],
    ['triggers', findFirst(nodes, has('data-skill-triggers'))],
    ['file', findFirst(nodes, (el) => has('data-explorer-preview')(el) && !has('hidden')(el))],
    ['notes', findFirst(nodes, has('data-skill-notes'))],
  ],
};

/** Premier écart entre deux textes, avec un peu de contexte. */
function firstDifference(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  const from = Math.max(0, i - 40);
  const clip = (s) => JSON.stringify(s.slice(from, i + 60));
  return `au caractère ${i} : page …${clip(a)}… · aperçu …${clip(b)}…`;
}

/* ------------------------------------------------------------------------ */
/* Contrôle                                                                  */
/* ------------------------------------------------------------------------ */

const config = parseYaml(readFileSync(join(ROOT, 'public/admin/config.yml'), 'utf8'));
const previewPaths = Object.fromEntries((config.collections ?? []).map((c) => [c.name, c.preview_path]));

const server = await createServer({
  root: ROOT,
  configFile: false,
  logLevel: 'error',
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] },
});

const failures = [];
const counts = [];
let draftsOk = 0;

try {
  const { parseHtml, treeNodes, treeH, regionText } = await server.ssrLoadModule('/src/admin/previews/html.ts');
  const { PREVIEWS } = await server.ssrLoadModule('/src/admin/previews/register.ts');
  const { diskEntries } = await server.ssrLoadModule('/src/admin/previews/diskEntries.ts');

  const text = (region) => (region === undefined ? undefined : regionText(region));

  for (const collection of Object.keys(PREVIEWS)) {
    const regions = REGIONS[collection];
    if (!regions) {
      failures.push(`${collection}: gabarit sans régions connues dans check-previews.mjs`);
      counts.push(`${collection} 0/?`);
      continue;
    }
    const route = previewPaths[collection];
    if (typeof route !== 'string') failures.push(`${collection}: pas de preview_path dans public/admin/config.yml`);
    let published = 0;
    let ok = 0;

    for (const entry of await diskEntries(collection)) {
      const preview = treeNodes(PREVIEWS[collection].template(entry.data, treeH));
      const previewRegions = regions(preview, false).map(([name, region]) => [name, text(region)]);
      const pagePath =
        typeof route === 'string' ? join(DIST, route.replaceAll('{{slug}}', entry.id), 'index.html') : undefined;
      const pageExists = pagePath !== undefined && existsSync(pagePath);
      const shown = previewRegions.filter(([, value]) => value).length;

      if (entry.data.draft === true) {
        if (pageExists) failures.push(`${entry.name}: brouillon, mais une page existe (${pagePath})`);
        else if (shown === 0) failures.push(`${entry.name}: brouillon, aperçu sans aucune région non vide`);
        else draftsOk += 1;
        continue;
      }

      published += 1;
      if (!pageExists) {
        failures.push(`${entry.name}: page absente (${pagePath ?? 'pas de preview_path'})`);
        continue;
      }
      const page = regions(parseHtml(readFileSync(pagePath, 'utf8')), true).map(([name, region]) => [name, text(region)]);
      const problems = [];
      page.forEach(([name, pageText], index) => {
        const previewText = previewRegions[index][1];
        if (pageText === undefined && previewText === undefined) return;
        if (pageText === undefined) problems.push(`${name}: absente de la page, présente dans l'aperçu`);
        else if (previewText === undefined) problems.push(`${name}: présente sur la page, absente de l'aperçu`);
        else if (pageText !== previewText) problems.push(`${name}: texte différent ${firstDifference(pageText, previewText)}`);
      });
      if (shown === 0) problems.push('aucune région non vide dans l’aperçu');
      if (problems.length === 0) ok += 1;
      else for (const problem of problems) failures.push(`${entry.name} ${problem}`);
    }
    counts.push(`${collection} ${ok}/${published}`);
  }
} finally {
  await server.close();
}

console.log(`previews: ${counts.join(' · ')} published entries — centre-column text = page`);
console.log(`drafts: ${draftsOk} previewed without page`);

if (failures.length > 0) {
  for (const failure of failures) console.error(`check-previews: ${failure}`);
  process.exit(1);
}
