#!/usr/bin/env node
/**
 * Contrôle de la page d'administration Sveltia CMS sur la sortie de build
 * (plan 19, critère R3). À lancer après `npm run build` :
 *
 *   node scripts/check-admin.mjs
 *
 * Lit `dist/` et `public/admin/config.yml`, imprime sur stdout, dans cet
 * ordre, les lignes attendues ci-dessous (EXPECTED) :
 *
 *   admin page: … — `dist/admin/index.html` existe, porte
 *     `<meta name="robots" content="noindex">`, un lien `cms-config-url` vers
 *     `/admin/config.yml`, exactement 1 `<script type="module">`, aucun
 *     `<link rel="stylesheet">` et aucun élément du chrome du site (`<header>`,
 *     `<nav>`, `<footer>`, `<dialog>`, `data-shell`, `data-pagefind-body`,
 *     script de thème de BaseLayout, `<style>` inline) (T2) ;
 *   sveltia: … — le graphe JS de la page admin embarque `@sveltia/cms` à la
 *     version épinglée dans package.json, et la page n'a aucune balise
 *     `<script>` vers un CDN (http(s):// ou //) (T2) ;
 *   preview css: … — un chunk du graphe JS de la page admin embarque le CSS
 *     compilé du site (`global.css?inline`) : une règle `.prose{`, la variable
 *     `--color-bg:` et un `@font-face` Nebula Sans ; chaque `url(/_astro/…)`
 *     de ce CSS désigne un fichier présent dans `dist/_astro/` (sinon la
 *     ligne signale les cibles absentes) (T3) ;
 *   dev-only: … — le dépôt de test de dev (`src/admin/dev/testRepo.ts`,
 *     chargé sous `import.meta.env.DEV` seulement) n'a laissé aucune trace
 *     dans `dist/_astro/*.js` : ni son marqueur `TEST_REPO_SEED_MARKER` (lu
 *     dans le source), ni une chaîne commençant par `/src/content/` (clé de
 *     son `import.meta.glob`) — occurrences comptées sur tous les fichiers (T5) ;
 *   isolation: … — seules les pages dont le graphe JS touche un chunk du
 *     graphe admin sont comptées : 1 (la page admin) sur toutes les pages (T2) ;
 *   config: … — `dist/admin/config.yml` identique octet pour octet à
 *     `public/admin/config.yml` (T2) ;
 *   logo: … — `dist/admin/logo.svg` identique octet pour octet à
 *     `public/admin/logo.svg`, et la clé `logo.src` de
 *     `public/admin/config.yml` vaut `/admin/logo.svg` (plan 20, T2) ;
 *   view on site: … — pour chaque collection de `public/admin/config.yml`,
 *     chaque entrée `<folder>/<dossier>/index.md` sur disque : son
 *     `preview_path` rempli (`{{slug}}` → nom du dossier, comme Sveltia avec
 *     `path: '{{slug}}/index'`) désigne `dist/<chemin>/index.html`. Une entrée
 *     publiée doit l'avoir, un brouillon (`draft: true`) ne doit PAS l'avoir.
 *     Comptes lus sur disque, jamais figés (plan 20, T4, R17).
 *
 * Toute ligne différente de l'attendu est signalée sur stderr APRÈS stdout ;
 * code de sortie 1 s'il y en a au moins une.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { parse as parseYaml } from 'yaml';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
const ASTRO = join(DIST, '_astro');
const ADMIN_HTML = join(DIST, 'admin', 'index.html');

if (!existsSync(DIST)) {
  console.error('check-admin: dist/ absent — lancer `npm run build` d’abord.');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const pinned = pkg.dependencies?.['@sveltia/cms'] ?? '(absent de package.json)';

/** Tous les fichiers `.html` de `dist/`, triés. */
function htmlFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...htmlFiles(path));
    else if (name.endsWith('.html')) out.push(path);
  }
  return out.sort();
}

/** Noms de fichiers `_astro/*.js` cités par un source (HTML ou JS). */
function jsRefs(source) {
  const refs = new Set();
  const re = /(?:\/_astro\/|_astro\/|\.\/)([\w.@~-]+\.js)(?![\w.])/g;
  for (const m of source.matchAll(re)) {
    if (existsSync(join(ASTRO, m[1]))) refs.add(m[1]);
  }
  return refs;
}

/** Fermeture transitive des chunks JS atteints depuis un HTML. */
function jsClosure(html) {
  const seen = new Set();
  const todo = [...jsRefs(html)];
  while (todo.length) {
    const name = todo.pop();
    if (seen.has(name)) continue;
    seen.add(name);
    for (const ref of jsRefs(readFileSync(join(ASTRO, name), 'utf8'))) {
      if (!seen.has(ref)) todo.push(ref);
    }
  }
  return seen;
}

const lines = [];
/** Détails imprimés sur stderr en cas d'échec. */
const notes = [];

// --- admin page (T2) --------------------------------------------------------
const adminExists = existsSync(ADMIN_HTML);
const admin = adminExists ? readFileSync(ADMIN_HTML, 'utf8') : '';
{
  const where = adminExists ? '/admin/index.html' : 'MISSING /admin/index.html';
  const noindex = /<meta\s+name="robots"\s+content="noindex"\s*\/?>/.test(admin) ? 'noindex' : 'INDEXABLE';
  const cfgHref =
    admin.match(/<link\b(?=[^>]*\brel="cms-config-url")[^>]*\bhref="([^"]*)"/)?.[1] ?? 'none';
  const moduleScripts = [...admin.matchAll(/<script\b[^>]*\btype="module"[^>]*>/g)].length;
  const stylesheets = [...admin.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*>/g)].length;
  const chrome = [
    /<header\b/g,
    /<nav\b/g,
    /<footer\b/g,
    /<dialog\b/g,
    /\bdata-shell=/g,
    /\bdata-pagefind-body\b/g,
    /localStorage\.getItem\('theme'\)/g,
    /<style\b/g,
  ].reduce((n, re) => n + [...admin.matchAll(re)].length, 0);
  lines.push(
    `admin page: ${where} · ${noindex} · cms-config-url ${cfgHref} · ${moduleScripts} module script · ` +
      `${stylesheets} stylesheet link · ${chrome} site chrome`,
  );
}

// --- sveltia (T2) -----------------------------------------------------------
const adminChunks = adminExists ? jsClosure(admin) : new Set();
{
  let bundled = 'not bundled';
  for (const name of adminChunks) {
    const m = readFileSync(join(ASTRO, name), 'utf8').match(
      /name:\s*[`'"]@sveltia\/cms[`'"],\s*version:\s*[`'"]([^`'"]+)[`'"]/,
    );
    if (m) {
      bundled = `${m[1]} bundled`;
      break;
    }
  }
  const cdn = [...admin.matchAll(/<script\b[^>]*\bsrc="(?:https?:)?\/\/[^"]*"/g)].length;
  lines.push(`sveltia: @sveltia/cms ${bundled} · ${cdn} CDN script tag`);
}

// --- preview css (T3) -------------------------------------------------------
{
  const markers = [
    ['.prose', /\.prose\{/],
    ['--color-bg', /--color-bg:/],
    ['@font-face Nebula Sans', /@font-face\{[^}]*font-family:\s*\\?["']?Nebula Sans/],
  ];
  let best = { name: null, found: [] };
  for (const name of adminChunks) {
    const js = readFileSync(join(ASTRO, name), 'utf8');
    const found = markers.filter(([, re]) => re.test(js)).map(([label]) => label);
    if (found.length > best.found.length) best = { name, found, js };
    if (found.length === markers.length) break;
  }
  let line;
  if (best.found.length === markers.length) {
    // Les polices du CSS inliné doivent exister dans le build (sinon 404 en aperçu).
    const targets = new Set(
      [...best.js.matchAll(/url\(\s*\\?["']?\/_astro\/([^"'()\s\\]+)/g)].map((m) => m[1]),
    );
    const missing = [...targets].filter((t) => !existsSync(join(ASTRO, t)));
    line = `preview css: site CSS inlined in the admin bundle (${best.found.join(', ')})`;
    if (missing.length) {
      line += ` · ${missing.length} missing url() target`;
      notes.push(`preview css url() targets absent from dist/_astro: ${missing.join(', ')}`);
    }
  } else {
    const absent = markers.map(([label]) => label).filter((l) => !best.found.includes(l));
    line = `preview css: site CSS NOT in the admin bundle (missing ${absent.join(', ')})`;
  }
  lines.push(line);
}

// --- dev-only (T5) ---------------------------------------------------------
{
  const source = readFileSync(join(ROOT, 'src', 'admin', 'dev', 'testRepo.ts'), 'utf8');
  const marker = source.match(/export const TEST_REPO_SEED_MARKER = '([^']+)'/)?.[1];
  if (!marker) {
    console.error('check-admin: TEST_REPO_SEED_MARKER introuvable dans src/admin/dev/testRepo.ts');
    process.exit(1);
  }
  let markers = 0;
  let keys = 0;
  const leaks = new Set();
  for (const name of readdirSync(ASTRO).filter((n) => n.endsWith('.js')).sort()) {
    const js = readFileSync(join(ASTRO, name), 'utf8');
    const m = js.split(marker).length - 1;
    const k = [...js.matchAll(/[`'"]\/src\/content\//g)].length;
    markers += m;
    keys += k;
    if (m || k) leaks.add(name);
  }
  lines.push(`dev-only: ${markers} test-repo seed marker · ${keys} /src/content/ key in dist/_astro`);
  if (leaks.size) notes.push(`dev-only code in: ${[...leaks].join(', ')}`);
}

// --- isolation (T2) ---------------------------------------------------------
{
  const pages = htmlFiles(DIST);
  const touching = pages.filter((file) => {
    const closure = jsClosure(readFileSync(file, 'utf8'));
    return [...closure].some((name) => adminChunks.has(name));
  });
  const stray = touching.filter((file) => file !== ADMIN_HTML).map((f) => relative(DIST, f).split(sep).join('/'));
  lines.push(`isolation: admin bundle referenced by ${touching.length}/${pages.length} pages`);
  if (stray.length) notes.push(`site pages loading admin chunks: ${stray.join(', ')}`);
}

// --- config (T2) ------------------------------------------------------------
{
  const built = join(DIST, 'admin', 'config.yml');
  const src = join(ROOT, 'public', 'admin', 'config.yml');
  let rel = 'dist/admin/config.yml missing';
  if (existsSync(built) && existsSync(src)) {
    rel = readFileSync(built).equals(readFileSync(src))
      ? 'dist/admin/config.yml = public/admin/config.yml'
      : 'dist/admin/config.yml ≠ public/admin/config.yml';
  }
  lines.push(`config: ${rel}`);
}

// --- logo (plan 20, T2) -----------------------------------------------------
{
  const built = join(DIST, 'admin', 'logo.svg');
  const src = join(ROOT, 'public', 'admin', 'logo.svg');
  let rel = 'dist/admin/logo.svg missing';
  if (!existsSync(src)) rel = 'public/admin/logo.svg missing';
  else if (existsSync(built)) {
    rel = readFileSync(built).equals(readFileSync(src))
      ? 'dist/admin/logo.svg = public/admin/logo.svg'
      : 'dist/admin/logo.svg ≠ public/admin/logo.svg';
  }
  const cfg = parseYaml(readFileSync(join(ROOT, 'public', 'admin', 'config.yml'), 'utf8'));
  const logoSrc = cfg?.logo?.src ?? 'none';
  lines.push(`logo: ${rel} · config logo.src ${logoSrc}`);
}

// --- view on site (plan 20, T4) ---------------------------------------------
/** Entrées publiées et brouillons comptés sur disque (attendu de la ligne). */
const entryTotals = { published: 0, drafts: 0 };
{
  const cfg = parseYaml(readFileSync(join(ROOT, 'public', 'admin', 'config.yml'), 'utf8'));
  let built = 0;
  let draftsWithoutPage = 0;
  for (const collection of cfg?.collections ?? []) {
    if (!collection.folder) continue;
    const folder = join(ROOT, collection.folder);
    if (!existsSync(folder)) continue;
    const template = collection.preview_path;
    for (const name of readdirSync(folder).sort()) {
      const file = join(folder, name, 'index.md');
      if (!existsSync(file)) continue;
      const fm = readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
      const draft = parseYaml(fm)?.draft === true;
      const where = `${collection.name}/${name}`;
      // Même remplissage que Sveltia pour notre gabarit : seul `{{slug}}` est connu ici.
      const path = typeof template === 'string' ? template.replaceAll('{{slug}}', name) : undefined;
      const page =
        path && !path.includes('{{') ? join(DIST, path.replace(/^\/+|\/+$/g, ''), 'index.html') : undefined;
      const hasPage = !!page && existsSync(page);
      if (draft) {
        entryTotals.drafts += 1;
        if (!hasPage) draftsWithoutPage += 1;
        else notes.push(`draft ${where} has a page at ${path}`);
      } else {
        entryTotals.published += 1;
        if (hasPage) built += 1;
        else notes.push(`published ${where}: no page at ${path ?? `(preview_path ${template ?? 'absent'})`}`);
      }
    }
  }
  lines.push(
    `view on site: ${built}/${entryTotals.published} published entries built at their preview_path · ` +
      `${draftsWithoutPage} draft(s) without page`,
  );
}

const pageCount = htmlFiles(DIST).length;
const EXPECTED = [
  'admin page: /admin/index.html · noindex · cms-config-url /admin/config.yml · 1 module script · 0 stylesheet link · 0 site chrome',
  `sveltia: @sveltia/cms ${pinned} bundled · 0 CDN script tag`,
  'preview css: site CSS inlined in the admin bundle (.prose, --color-bg, @font-face Nebula Sans)',
  'dev-only: 0 test-repo seed marker · 0 /src/content/ key in dist/_astro',
  `isolation: admin bundle referenced by 1/${pageCount} pages`,
  'config: dist/admin/config.yml = public/admin/config.yml',
  'logo: dist/admin/logo.svg = public/admin/logo.svg · config logo.src /admin/logo.svg',
  `view on site: ${entryTotals.published}/${entryTotals.published} published entries built at their preview_path · ` +
    `${entryTotals.drafts} draft(s) without page`,
];

for (const line of lines) console.log(line);

const errors = [];
if (!/^\d+\.\d+\.\d+$/.test(pinned)) errors.push(`@sveltia/cms n'est pas épinglé à une version exacte : ${pinned}`);
EXPECTED.forEach((want, i) => {
  if (lines[i] !== want) errors.push(`attendu : ${want}\n  obtenu  : ${lines[i]}`);
});
if (errors.length) {
  for (const e of [...errors, ...notes]) console.error(`check-admin: ${e}`);
  process.exit(1);
}
