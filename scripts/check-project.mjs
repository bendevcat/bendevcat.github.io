#!/usr/bin/env node
/**
 * Contrôle des fiches projet sur la sortie de build (plan 15, critères R7 et
 * R16). À lancer après `npm run build` :
 *
 *   node scripts/check-project.mjs [dist]
 *
 * Imprime sur stdout, dans cet ordre :
 *
 *   projects: <ok>/<n> · <lien retour> → <href> · h1 · <n> main .card · <n> aside · <variante> tabs
 *   <id>: <onglets> · banner <derived|cover> · statut <v> · depuis <v|—> · licence <v|—>
 *         · code source ↗ <href|—> · démo ↗ <href> | démo — · aside articles <n|—>
 *   <id> stack: <nom> (logo|<monogramme>)[ · <rôle>] | …
 *   <id> window: <fichier> · <n> lines · <yaml|text> · <n> Copier · code = snippet      (ou `—`)
 *   links: every internal href resolves in dist/
 *   search: <n> fragments · title and prose indexed · tab row, sidebar, window and panel labels not indexed
 *
 * Les fiches sont lues dans l'ordre des noms de dossier de `dist/projets/`
 * (une par `<id>/index.html`) ; chaque entrée `[data-entry-id]` de
 * `dist/projets/index.html` doit y avoir sa fiche, et inversement. Les
 * attendus viennent du frontmatter de `src/content/projects/<id>/index.md`,
 * lu avec `yaml` (devDependency). `—` = absent.
 *
 * Code de sortie 1 (erreurs sur stderr, après stdout) si, pour une fiche :
 * - il n'y a pas exactement un `<main>` › `<article data-pagefind-body>` ;
 * - un bloc manque : lien `← tous les projets` (`[data-project-back]`, vers
 *   `/projets/`, hors index), un seul `h1` (= `title`) dans la carte
 *   principale, exactement un `.card` hors de la barre latérale
 *   (`[data-project-main]`, bandeau en premier enfant : image ou trame
 *   `[data-thumb-derived]` de 150 px), exactement un `<aside>`, la carte méta
 *   `[data-project-meta]` (lignes `statut` · `depuis` · `licence` dans cet
 *   ordre, `statut` en `.pill` = `status`), `code source ↗` / `démo ↗` dont
 *   la présence et le `href` ne suivent pas `repoUrl` / `demoUrl` ;
 * - la racine des onglets n'a pas `data-tab-variant="underline"` ;
 * - l'effectif d'un onglet diffère du nombre de tuiles / liens de son
 *   panneau, la carte Articles liés de la barre latérale ne compte pas autant
 *   de liens, ou les tuiles Stack ne suivent pas `stack` (noms, ordre, rôles
 *   de `stackRoles`) ;
 * - une tuile n'a ni `svg` ni monogramme `[data-monogram]` ;
 * - la fenêtre de code manque alors que `snippet` est renseigné (ou
 *   l'inverse), sa puce ≠ `snippetFile`, les numéros de la gouttière ne sont
 *   pas 1…n (n = lignes du `<code>`), le texte du `<code>` + `\n` ≠ le
 *   `snippet` du frontmatter, ou elle n'a pas exactement un `Copier` ;
 * - la rangée d'onglets (`role="tablist"`), l'`<aside>`, la fenêtre de code
 *   ou un libellé de panneau (`[data-panel-label]`) n'est pas
 *   `data-pagefind-ignore` ;
 * - un `href` interne (requête retirée) ne résout pas dans `dist/`, ou une
 *   ancre `#id` de la page n'y existe pas ;
 * - son fragment Pagefind (`dist/pagefind/fragment/*.pf_fragment`, gunzip,
 *   JSON après `pagefind_dcd` — comme scripts/check-article.mjs) manque, ne
 *   contient pas le titre ou la première phrase de la prose, ou contient
 *   `tous les projets`, `code source`, `Copier`, `ce qui fait tourner`,
 *   `écrit à propos`, `Le projet en bref` ou les libellés de la rangée
 *   d'onglets mis bout à bout, effectifs compris (`Aperçu Stack 4 …` —
 *   plan 17, F3).
 *
 * Balisage lu : src/pages/projets/[...slug].astro, src/components/project/*,
 * src/components/DetailTabs.astro et src/components/Thumbnail.astro.
 *
 * Même petit tokeniseur que scripts/check-article.mjs ; seule dépendance :
 * `yaml`, pour le frontmatter.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { parse as parseYaml } from 'yaml';

const DIST = process.argv[2] ?? 'dist';
const CONTENT = join('src', 'content', 'projects');
const BACK_HREF = '/projets/';
const BACK_TEXT = '← tous les projets';
const ASIDE_LABEL = 'Le projet en bref';
const META_ORDER = ['statut', 'depuis', 'licence'];
const FORBIDDEN_IN_INDEX = [
  'tous les projets',
  'code source',
  'Copier',
  'ce qui fait tourner',
  'écrit à propos',
  'Le projet en bref',
];

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

/** Tous les éléments, dans l'ordre du document, avec enfants directs, parent et texte décodé (blancs gardés). */
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
const ancestors = (el) => {
  const out = [];
  for (let node = el.parent; node; node = node.parent) out.push(node);
  return out;
};
const within = (el, scope) => ancestors(el).includes(scope);
const classes = (el) => (el.attrs.class ?? '').split(/\s+/).filter(Boolean);
const has = (el, attr) => attr in el.attrs;
const squash = (text) => text.replace(/\s+/g, ' ').trim();
/** Hors index de recherche : l'élément ou un de ses ancêtres porte `data-pagefind-ignore`. */
const ignored = (el) => [el, ...ancestors(el)].some((node) => has(node, 'data-pagefind-ignore'));

/** Une URL du site résout-elle dans `dist/` ? (`/blog/x/` → `dist/blog/x/index.html`) */
function resolves(href) {
  if (!href || !href.startsWith('/') || href.startsWith('//')) return false;
  const path = decodeURIComponent(href.split(/[?#]/)[0]);
  const file = path.endsWith('/') ? join(DIST, path, 'index.html') : join(DIST, path);
  return existsSync(file) || existsSync(`${join(DIST, path)}.html`);
}

/** Frontmatter d'un projet (`index.md` ou `index.mdx`), `null` s'il est introuvable. */
function frontmatterOf(id) {
  for (const name of ['index.md', 'index.mdx']) {
    const file = join(CONTENT, id, name);
    if (!existsSync(file)) continue;
    const match = readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    return match ? (parseYaml(match[1]) ?? {}) : {};
  }
  return null;
}

/** `2025-05-05` (Date YAML ou chaîne) → `mai 2025`, mois lu en UTC comme projectMetaRows. */
function monthYear(value) {
  if (value === undefined || value === null || value === '') return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

const lines = [];
const errors = [];

const PROJECTS_DIR = join(DIST, 'projets');
if (!existsSync(PROJECTS_DIR)) {
  console.error(`${PROJECTS_DIR}/ introuvable — lancer \`npm run build\` d'abord`);
  process.exit(1);
}

// — Fiches sur disque et entrées de /projets —
const ids = readdirSync(PROJECTS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(PROJECTS_DIR, entry.name, 'index.html')))
  .map((entry) => entry.name)
  .sort();
const LIST_FILE = join(PROJECTS_DIR, 'index.html');
if (existsSync(LIST_FILE)) {
  const listed = new Set(
    collectElements(tokenize(readFileSync(LIST_FILE, 'utf8')))
      .elements.filter((el) => has(el, 'data-entry-id'))
      .map((el) => el.attrs['data-entry-id']),
  );
  for (const id of listed) if (!ids.includes(id)) errors.push(`/projets/ : entrée « ${id} » sans fiche`);
  for (const id of ids) if (!listed.has(id)) errors.push(`/projets/${id}/ : fiche absente des entrées de /projets`);
} else {
  errors.push(`${LIST_FILE} introuvable`);
}

// — Lecture de chaque fiche —
const projects = [];
for (const id of ids) {
  const route = `/projets/${id}/`;
  const { elements } = collectElements(tokenize(readFileSync(join(PROJECTS_DIR, id, 'index.html'), 'utf8')));
  const info = { id, route, ok: true };
  const fail = (message) => {
    info.ok = false;
    errors.push(`${route} : ${message}`);
  };
  projects.push(info);

  const fm = frontmatterOf(id);
  if (!fm) {
    fail(`frontmatter introuvable dans ${CONTENT}/${id}/`);
    continue;
  }
  const stack = Array.isArray(fm.stack) ? fm.stack.map(String) : [];
  const roles = new Map(
    (Array.isArray(fm.stackRoles) ? fm.stackRoles : []).map((entry) => [
      String(entry.name).trim().toLowerCase(),
      String(entry.role ?? '').trim(),
    ]),
  );
  const snippet = typeof fm.snippet === 'string' && fm.snippet.trim() ? fm.snippet : null;

  const mains = elements.filter((el) => el.tag === 'main');
  const articles = mains.length === 1
    ? descendants(mains[0]).filter((el) => el.tag === 'article' && has(el, 'data-pagefind-body'))
    : [];
  if (mains.length !== 1 || articles.length !== 1) {
    fail(`${mains.length} <main>, ${articles.length} <article data-pagefind-body> dedans (attendu : 1, 1)`);
    continue;
  }
  const article = articles[0];
  const inArticle = descendants(article);

  // Barre latérale.
  const asides = inArticle.filter((el) => el.tag === 'aside');
  info.asides = asides.length;
  if (asides.length !== 1) fail(`${asides.length} <aside> (attendu : 1)`);
  const aside = asides[0] ?? null;
  if (aside) {
    if (!has(aside, 'data-pagefind-ignore')) fail('<aside> sans data-pagefind-ignore');
    if (aside.attrs['aria-label'] !== ASIDE_LABEL) fail(`<aside> aria-label « ${aside.attrs['aria-label'] ?? '—'} » (attendu : « ${ASIDE_LABEL} »)`);
  }

  // Carte principale.
  const mainCards = inArticle.filter((el) => classes(el).includes('card') && !asides.some((a) => el === a || within(el, a)));
  info.mainCards = mainCards.length;
  if (mainCards.length !== 1) {
    fail(`${mainCards.length} .card hors de la barre latérale (attendu : 1)`);
    continue;
  }
  const card = mainCards[0];
  const inCard = descendants(card);
  if (!has(card, 'data-project-main')) fail('carte principale sans data-project-main');
  if (!classes(card).includes('overflow-hidden')) fail('carte principale sans overflow-hidden');

  // Bandeau : premier enfant de la carte.
  const banner = card.children[0];
  if (banner?.tag === 'img') info.banner = 'cover';
  else if (banner && has(banner, 'data-thumb-derived')) info.banner = 'derived';
  else info.banner = null;
  if (!info.banner) fail('pas de bandeau (img ou [data-thumb-derived]) en tête de la carte principale');
  else if (!classes(banner).includes('h-[150px]') || !classes(banner).includes('w-full')) fail('bandeau sans h-[150px] w-full');
  if (info.banner === 'derived' && !has(banner, 'data-rail')) fail('trame du bandeau sans data-rail');
  if (info.banner === 'cover' && !banner.attrs.alt) fail('couverture du bandeau sans alt');

  // Lien retour.
  const backs = inArticle.filter((el) => el.tag === 'a' && has(el, 'data-project-back'));
  if (backs.length !== 1) {
    fail(`${backs.length} [data-project-back] (attendu : 1)`);
  } else {
    const back = backs[0];
    info.back = `${squash(back.text)} → ${back.attrs.href ?? '—'}`;
    if (squash(back.text) !== BACK_TEXT) fail(`lien retour « ${squash(back.text)} » (attendu : « ${BACK_TEXT} »)`);
    if (back.attrs.href !== BACK_HREF) fail(`lien retour vers « ${back.attrs.href ?? '—'} » (attendu : ${BACK_HREF})`);
    if (!within(back, card)) fail('lien retour hors de la carte principale');
    if (!ignored(back)) fail('lien retour sans data-pagefind-ignore');
  }

  // Titre.
  const h1s = elements.filter((el) => el.tag === 'h1');
  if (h1s.length !== 1 || !within(h1s[0], card)) {
    fail(`${h1s.length} h1 (attendu : 1, dans la carte principale)`);
  } else {
    info.title = squash(h1s[0].text);
    if (info.title !== squash(String(fm.title ?? ''))) fail(`h1 « ${info.title} » ≠ title « ${fm.title} »`);
  }

  // Onglets.
  const roots = inCard.filter((el) => has(el, 'data-detail-tabs'));
  if (roots.length !== 1) {
    fail(`${roots.length} [data-detail-tabs] dans la carte principale (attendu : 1)`);
    continue;
  }
  const tabRoot = roots[0];
  info.variant = tabRoot.attrs['data-tab-variant'] ?? null;
  if (info.variant !== 'underline') fail(`racine des onglets data-tab-variant « ${info.variant ?? '—'} » (attendu : underline)`);
  const inRoot = descendants(tabRoot);
  const tabs = inRoot.filter((el) => el.attrs.role === 'tab');
  const byId = new Map(elements.filter((el) => el.attrs.id).map((el) => [el.attrs.id, el]));
  /** Panneau d'un onglet par son id (`tabpanel-<id>`) ; sans rangée (D13), la racine entière. */
  const panelOf = (tabId) => (tabs.length === 0 ? tabRoot : byId.get(`tabpanel-${tabId}`) ?? null);
  const tabInfo = new Map(
    tabs.map((tab) => {
      const countSpan = tab.children.find((child) => child.tag === 'span');
      const tabId = (tab.attrs.id ?? '').replace(/^tab-/, '');
      return [tabId, { text: squash(tab.text), count: countSpan ? Number(squash(countSpan.text)) : null }];
    }),
  );
  info.tabs = tabs.length > 0 ? tabs.map((tab) => squash(tab.text)).join(' | ') : '(aucune rangée)';
  // Plan 17, F3 : les libellés d'onglets n'entrent pas dans l'index.
  for (const tablist of inRoot.filter((el) => el.attrs.role === 'tablist')) {
    if (!ignored(tablist)) fail('rangée d\'onglets (role="tablist") sans data-pagefind-ignore');
  }
  if (tabs.length > 0) info.tabRow = tabs.map((tab) => squash(tab.text)).join(' ');
  if (tabInfo.get('apercu')?.count != null) fail('Aperçu porte un effectif');

  // Libellés de panneau.
  for (const label of inRoot.filter((el) => has(el, 'data-panel-label'))) {
    if (!ignored(label)) fail(`libellé « ${squash(label.text)} » sans data-pagefind-ignore`);
  }

  // Stack.
  const stackPanel = tabInfo.has('stack') || tabs.length === 0 ? panelOf('stack') : null;
  const tiles = stackPanel ? descendants(stackPanel).filter((el) => has(el, 'data-stack-tile')) : [];
  if (stack.length > 0 && !tabInfo.has('stack') && tabs.length > 0) fail(`stack de ${stack.length} sans onglet Stack`);
  if (tabInfo.has('stack') && tabInfo.get('stack').count !== tiles.length) {
    fail(`onglet Stack ${tabInfo.get('stack').count} pour ${tiles.length} tuile(s)`);
  }
  if (tiles.length !== stack.length) fail(`${tiles.length} tuile(s) Stack pour ${stack.length} techno(s) dans stack`);
  info.stack = tiles.map((tile, index) => {
    const inTile = descendants(tile);
    const name = squash(inTile.find((el) => has(el, 'data-stack-name'))?.text ?? '');
    const svg = inTile.some((el) => el.tag === 'svg');
    const mono = inTile.find((el) => has(el, 'data-monogram'));
    const role = inTile.find((el) => has(el, 'data-stack-role'));
    if (!name) fail(`tuile ${index + 1} sans nom [data-stack-name]`);
    if (name && stack[index] !== undefined && name !== stack[index]) fail(`tuile ${index + 1} « ${name} » (attendu : « ${stack[index]} »)`);
    if (!svg && !(mono && squash(mono.text))) fail(`tuile « ${name} » sans svg ni monogramme`);
    const expectedRole = roles.get(name.toLowerCase()) || null;
    const shownRole = role ? squash(role.text) : null;
    if (shownRole !== expectedRole) fail(`tuile « ${name} » : rôle « ${shownRole ?? '—'} » (attendu : « ${expectedRole ?? '—'} »)`);
    const mark = svg ? '(logo)' : `(${squash(mono?.text ?? '') || '—'})`;
    return `${name} ${mark}${shownRole ? ` · ${shownRole}` : ''}`;
  });

  // Articles liés : onglet, panneau, carte de la barre latérale.
  const postsPanel = tabInfo.has('articles-lies') ? panelOf('articles-lies') : null;
  const panelPosts = postsPanel
    ? descendants(postsPanel).filter((el) => el.tag === 'a' && has(el, 'data-related-post'))
    : [];
  if (tabInfo.has('articles-lies') && tabInfo.get('articles-lies').count !== panelPosts.length) {
    fail(`onglet Articles liés ${tabInfo.get('articles-lies').count} pour ${panelPosts.length} tuile(s)`);
  }
  for (const a of panelPosts) {
    if (!/^\/blog\/[^/?#]+\/$/.test(a.attrs.href ?? '')) fail(`tuile d'article vers « ${a.attrs.href ?? '—'} »`);
    if (!squash(a.text).endsWith('Lire →')) fail(`tuile d'article « ${a.attrs.href} » sans « Lire → »`);
  }
  const asidePostCards = aside ? descendants(aside).filter((el) => has(el, 'data-project-posts')) : [];
  if (asidePostCards.length > 1) fail(`${asidePostCards.length} [data-project-posts] (attendu : 1 au plus)`);
  const asidePosts = asidePostCards[0]
    ? descendants(asidePostCards[0]).filter((el) => el.tag === 'a')
    : [];
  info.asidePosts = asidePostCards[0] ? String(asidePosts.length) : '—';
  if (asidePosts.map((a) => a.attrs.href).join('|') !== panelPosts.map((a) => a.attrs.href).join('|')) {
    fail(`barre latérale : articles « ${asidePosts.map((a) => a.attrs.href).join(', ') || '—'} » ≠ panneau « ${panelPosts.map((a) => a.attrs.href).join(', ') || '—'} »`);
  }
  if (asidePostCards[0] && asidePosts.length === 0) fail('carte Articles liés de la barre latérale vide');

  // Carte méta.
  const metas = aside ? descendants(aside).filter((el) => has(el, 'data-project-meta')) : [];
  if (metas.length !== 1) {
    fail(`${metas.length} [data-project-meta] (attendu : 1)`);
    info.meta = 'statut — · depuis — · licence —';
  } else {
    const meta = metas[0];
    const inMeta = descendants(meta);
    const dts = inMeta.filter((el) => el.tag === 'dt');
    const rows = dts.map((dt) => {
      const siblings = dt.parent.children;
      const dd = siblings[siblings.indexOf(dt) + 1];
      return { label: squash(dt.text), dd: dd?.tag === 'dd' ? dd : null };
    });
    const labels = rows.map((row) => row.label);
    const order = META_ORDER.filter((label) => labels.includes(label));
    if (labels.join('|') !== order.join('|')) fail(`lignes méta « ${labels.join(', ')} » (attendu : sous-suite de ${META_ORDER.join(', ')})`);
    const value = (label) => {
      const row = rows.find((r) => r.label === label);
      return row?.dd ? squash(row.dd.text) : null;
    };
    const statusRow = rows.find((row) => row.label === 'statut');
    if (!statusRow?.dd || !descendants(statusRow.dd).some((el) => classes(el).includes('pill'))) fail('ligne statut sans .pill');
    if (value('statut') !== String(fm.status ?? 'actif')) fail(`statut « ${value('statut') ?? '—'} » (attendu : « ${fm.status ?? 'actif'} »)`);
    const since = monthYear(fm.startDate);
    if (value('depuis') !== since) fail(`depuis « ${value('depuis') ?? '—'} » (attendu : « ${since ?? '—'} »)`);
    const license = typeof fm.license === 'string' && fm.license.trim() ? fm.license.trim() : null;
    if (value('licence') !== license) fail(`licence « ${value('licence') ?? '—'} » (attendu : « ${license ?? '—'} »)`);
    info.meta = `statut ${value('statut') ?? '—'} · depuis ${value('depuis') ?? '—'} · licence ${value('licence') ?? '—'}`;

    const button = (attr, text, expected) => {
      const found = inMeta.filter((el) => el.tag === 'a' && has(el, attr));
      if (found.length > 1) fail(`${found.length} [${attr}] (attendu : 1 au plus)`);
      const a = found[0];
      if (!a && expected) fail(`« ${text} » absent alors que l'URL est renseignée`);
      if (a && !expected) fail(`« ${text} » présent sans URL dans le frontmatter`);
      if (a && squash(a.text) !== text) fail(`[${attr}] « ${squash(a.text)} » (attendu : « ${text} »)`);
      if (a && expected && a.attrs.href !== expected) fail(`« ${text} » vers « ${a.attrs.href} » (attendu : ${expected})`);
      return a ? `${text} ${a.attrs.href}` : `${text.replace(/ ↗$/, '')} —`;
    };
    info.repo = button('data-project-repo', 'code source ↗', fm.repoUrl ?? null);
    info.demo = button('data-project-demo', 'démo ↗', fm.demoUrl ?? null);
  }

  // Aperçu : prose et fenêtre de code.
  const apercu = tabInfo.has('apercu') || tabs.length === 0 ? panelOf('apercu') : null;
  const inApercu = apercu ? descendants(apercu) : [];
  const windows = inArticle.filter((el) => has(el, 'data-code-window'));
  if (windows.length > 1) fail(`${windows.length} [data-code-window] (attendu : 1 au plus)`);
  const win = windows[0] ?? null;
  if (snippet && !win) fail('snippet renseigné sans fenêtre de code');
  if (!snippet && win) fail('fenêtre de code sans snippet dans le frontmatter');
  if (win) {
    if (!inApercu.includes(win)) fail("fenêtre de code hors de l'onglet Aperçu");
    if (!has(win, 'data-pagefind-ignore')) fail('fenêtre de code sans data-pagefind-ignore');
    const inWin = descendants(win);
    const chip = inWin.find((el) => has(el, 'data-code-file'));
    const file = chip ? squash(chip.text) : null;
    const expectedFile = typeof fm.snippetFile === 'string' && fm.snippetFile ? fm.snippetFile : null;
    if (file !== expectedFile) fail(`puce « ${file ?? '—'} » (attendu : « ${expectedFile ?? '—'} »)`);
    const codes = inWin.filter((el) => el.tag === 'code' && el.parent.tag === 'pre');
    const gutters = inWin.filter((el) => has(el, 'data-code-gutter'));
    const copiers = inWin.filter((el) => el.tag === 'button' && squash(el.text) === 'Copier');
    if (copiers.length !== 1) fail(`${copiers.length} « Copier » dans la fenêtre (attendu : 1)`);
    if (codes.length !== 1 || gutters.length !== 1) {
      fail(`${codes.length} pre › code, ${gutters.length} gouttière(s) (attendu : 1, 1)`);
      info.window = `${file ?? '—'} · ? lines`;
    } else {
      const text = codes[0].text;
      const count = text.split('\n').length;
      const numbers = gutters[0].text.split('\n').map((n) => n.trim());
      const expected = Array.from({ length: count }, (_, i) => String(i + 1));
      if (numbers.join(',') !== expected.join(',')) {
        const at = expected.findIndex((n, i) => numbers[i] !== n);
        const where = at === -1 ? `${numbers.length} numéros` : `ligne ${at + 1} numérotée « ${numbers[at] ?? '—'} »`;
        fail(`gouttière ≠ 1…${count} (${where})`);
      }
      if (gutters[0].attrs['aria-hidden'] !== 'true') fail('gouttière sans aria-hidden="true"');
      const same = `${text}\n` === snippet;
      if (!same) fail('texte du <code> + « \\n » ≠ snippet du frontmatter');
      const lang = win.attrs['data-code-lang'] ?? '—';
      if (lang === 'yaml' && !inWin.some((el) => has(el, 'data-code-key'))) fail('fenêtre yaml sans clé colorée');
      info.window = `${file ?? '—'} · ${count} lines · ${lang} · ${copiers.length} Copier · ${same ? 'code = snippet' : 'code ≠ snippet'}`;
    }
  }

  // Liens internes et ancres, sur toute la page.
  const pageIds = new Set(elements.filter((el) => el.attrs.id).map((el) => el.attrs.id));
  for (const a of elements.filter((el) => el.tag === 'a' && el.attrs.href)) {
    const href = a.attrs.href;
    if (href.startsWith('#')) {
      const target = decodeURIComponent(href.slice(1));
      if (target && !pageIds.has(target)) fail(`ancre « ${href} » : id absent`);
    } else if (href.startsWith('/') && !href.startsWith('//')) {
      if (!resolves(href)) fail(`href « ${href} » ne résout pas dans ${DIST}/`);
    }
  }

  // Première phrase de la prose (index de recherche).
  const prose = inApercu.find((el) => classes(el).includes('prose'));
  const firstP = prose ? descendants(prose).find((el) => el.tag === 'p' && squash(el.text)) : null;
  info.firstSentence = firstP
    ? squash(firstP.text).match(/^.*?[.!?…](?=\s|$)/)?.[0] ?? squash(firstP.text)
    : null;
  if (prose && !firstP) fail('prose sans paragraphe');
}

// — Lignes —
const okCount = projects.filter((info) => info.ok).length;
const uniform = (key, fallback = '—') => {
  const values = [...new Set(projects.map((info) => info[key]).filter((v) => v !== undefined && v !== null))];
  return values.length === 0 ? fallback : values.join(' | ');
};
lines.push(
  `projects: ${okCount}/${projects.length} · ${uniform('back')} · h1 · ${uniform('mainCards', '0')} main .card · ${uniform('asides', '0')} aside · ${uniform('variant')} tabs`,
);
for (const info of projects) {
  lines.push(
    `${info.id}: ${info.tabs ?? '—'} · banner ${info.banner ?? '—'} · ${info.meta ?? '—'} · ${info.repo ?? 'code source —'} · ${info.demo ?? 'démo —'} · aside articles ${info.asidePosts ?? '—'}`,
  );
  lines.push(`${info.id} stack: ${info.stack && info.stack.length > 0 ? info.stack.join(' | ') : '—'}`);
  lines.push(`${info.id} window: ${info.window ?? '—'}`);
}

const linkErrors = errors.filter((message) => /ne résout pas|ancre|id absent/.test(message));
lines.push(
  linkErrors.length === 0 ? 'links: every internal href resolves in dist/' : `links: ${linkErrors.length} broken`,
);

// — Index de recherche (R16) —
const FRAGMENTS = join(DIST, 'pagefind', 'fragment');
const fragments = new Map(); // url → fragment
if (!existsSync(FRAGMENTS)) {
  errors.push(`${FRAGMENTS} introuvable (Pagefind n'a pas tourné)`);
} else {
  for (const name of readdirSync(FRAGMENTS).filter((n) => n.endsWith('.pf_fragment'))) {
    const raw = gunzipSync(readFileSync(join(FRAGMENTS, name))).toString('utf8');
    const start = raw.indexOf('{');
    if (!raw.startsWith('pagefind_dcd') || start === -1) {
      errors.push(`${name} : fragment illisible`);
      continue;
    }
    const fragment = JSON.parse(raw.slice(start));
    fragments.set(fragment.url, fragment);
  }
}
let indexed = 0;
let titleAndProse = true;
let clean = true;
for (const info of projects) {
  const fragment = fragments.get(info.route);
  if (!fragment) {
    titleAndProse = false;
    errors.push(`${info.route} : pas de fragment Pagefind`);
    continue;
  }
  indexed += 1;
  const content = squash(fragment.content ?? '');
  if (!info.title || !content.includes(info.title)) {
    titleAndProse = false;
    errors.push(`${info.route} : le fragment ne contient pas le titre`);
  }
  if (!info.firstSentence || !content.includes(info.firstSentence)) {
    titleAndProse = false;
    errors.push(`${info.route} : le fragment ne contient pas « ${info.firstSentence ?? '—'} »`);
  }
  for (const text of [...FORBIDDEN_IN_INDEX, info.tabRow].filter(Boolean)) {
    if (content.includes(text)) {
      clean = false;
      errors.push(`${info.route} : le fragment contient « ${text} »`);
    }
  }
}
lines.push(
  `search: ${indexed} fragments · ${titleAndProse ? 'title and prose indexed' : 'title or prose missing'} · ${clean ? 'tab row, sidebar, window and panel labels not indexed' : 'tab row, sidebar, window or panel labels indexed'}`,
);

for (const line of lines) console.log(line);
for (const error of errors) console.error(`  ✗ ${error}`);
process.exit(errors.length > 0 ? 1 : 0);
