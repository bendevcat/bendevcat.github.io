#!/usr/bin/env node
/**
 * Contrôle des pages article sur la sortie de build (plan 13, critères R5 et
 * R13). À lancer après `npm run build` :
 *
 *   node scripts/check-article.mjs [dist]
 *
 * Imprime sur stdout, dans cet ordre :
 *
 *   articles: <ok>/<n> · <fil d'Ariane> · h1 · meta · 1 .card · rails left+right
 *   rail: <ligne> → <href> · … · <n> tags · Plus d'articles → <href>
 *   <id>: <catégorie> · <date> · <N> min · <marqueur IA> | related <ids> | ← <id> | → <id>
 *         | toc <n> | projects <ids> | code <n> | ai <niveau>        (une ligne par article)
 *   links: every internal href resolves in dist/ · every #anchor exists
 *   search: <n> fragments · title and prose indexed · rails, AI card, prev/next not indexed
 *
 * Les articles sont lus dans l'ordre canonique, celui des lignes
 * `[data-entry-id]` de `dist/blog/index.html` (getPublishedPosts : pubDate
 * desc, ordre de collection à égalité). `—` = absent.
 *
 * Code de sortie 1 (erreurs sur stderr, après stdout) si, pour un article :
 * - il n'y a pas exactement un `<main>` › `<article data-pagefind-body>` ;
 * - le fil d'Ariane `[data-article-crumb]` ne lit pas `~/ blog / article`, n'a
 *   pas de lien `/blog/` ou n'est pas `data-pagefind-ignore` ;
 * - il n'y a pas exactement un `h1` non vide ;
 * - la ligne de méta `[data-article-meta]` manque de pilule de catégorie, de
 *   `<time>`, de `N min` ou (article avec `aiUsage`) de `[data-ai-marker]` ;
 * - l'article n'a pas exactement un `.card`, ou un `<aside>` du cadre (un
 *   rail) manque de `data-rail` ou de `data-pagefind-ignore`, ou le rail
 *   gauche (Catégories) manque ;
 * - le rail gauche diffère d'un article à l'autre, ou une ligne de catégorie
 *   ne mène pas à `/blog/` (Tout) ou `/blog/?categorie=<valeur encodée>` ;
 * - les articles liés ne sont pas les ≤ 3 plus récents de la même catégorie,
 *   hors l'article lui-même ; précédent / suivant ne sont pas les voisins
 *   plus ancien / plus récent de l'ordre canonique (sans bouclage) ;
 * - le Sommaire ne liste pas, dans l'ordre, les h2/h3 à `id` de `.prose`, ou
 *   un de ses liens vise un `id` absent ;
 * - la carte IA `[data-ai-card]` n'est pas `data-pagefind-ignore`, n'a pas de
 *   lien `/transparence-ia/`, ou manque de tuile `[data-ai-usage]` ; la nav
 *   précédent / suivant n'est pas `data-pagefind-ignore` ;
 * - un `href` interne (requête retirée) ne résout pas dans `dist/`, ou une
 *   ancre `#id` de la page n'y existe pas ;
 * - son fragment Pagefind (`dist/pagefind/fragment/*.pf_fragment`, gunzip,
 *   JSON après `pagefind_dcd`) manque, ne contient pas le titre ou la
 *   première phrase de la prose, ou contient `Articles liés`,
 *   `Plus d'articles`, `Sommaire`, `Projets liés`, `ma règle sur l'IA`,
 *   `← précédent` ou `suivant →`.
 *
 * Balisage lu : src/pages/blog/[...slug].astro et src/components/blog/*
 * (`data-article-crumb`, `data-article-meta`, `data-related-posts`,
 * `data-related-projects`, `data-ai-card`, `data-adjacent`).
 *
 * Aucune dépendance : même petit tokeniseur que scripts/check-shell-blog.mjs.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';

const DIST = process.argv[2] ?? 'dist';
const ALL_HREF = '/blog/';
const FORBIDDEN_IN_INDEX = [
  'Articles liés',
  "Plus d'articles",
  'Sommaire',
  'Projets liés',
  "ma règle sur l'IA",
  '← précédent',
  'suivant →',
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
const has = (el, attr) => attr in el.attrs;
const squash = (text) => text.replace(/\s+/g, ' ').trim();
const idOf = (href) => (href ?? '').match(/^\/blog\/([^/?#]+)\/$/)?.[1] ?? null;

/** Une URL du site résout-elle dans `dist/` ? (`/blog/x/` → `dist/blog/x/index.html`) */
function resolves(href) {
  if (!href || !href.startsWith('/') || href.startsWith('//')) return false;
  const path = decodeURIComponent(href.split(/[?#]/)[0]);
  const file = path.endsWith('/') ? join(DIST, path, 'index.html') : join(DIST, path);
  return existsSync(file) || existsSync(`${join(DIST, path)}.html`);
}

const lines = [];
const errors = [];

if (!existsSync(DIST)) {
  console.error(`${DIST}/ introuvable — lancer \`npm run build\` d'abord`);
  process.exit(1);
}

// — Ordre canonique : les lignes de /blog —
const BLOG_FILE = join(DIST, 'blog', 'index.html');
if (!existsSync(BLOG_FILE)) {
  console.error(`${BLOG_FILE} introuvable`);
  process.exit(1);
}
const order = collectElements(tokenize(readFileSync(BLOG_FILE, 'utf8')))
  .elements.filter((el) => has(el, 'data-entry-id'))
  .map((el) => el.attrs['data-entry-id']);
const onDisk = readdirSync(join(DIST, 'blog'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(DIST, 'blog', entry.name, 'index.html')))
  .map((entry) => entry.name);
for (const id of onDisk) if (!order.includes(id)) errors.push(`/blog/${id}/ : page article absente des lignes de /blog`);
for (const id of order) if (!onDisk.includes(id)) errors.push(`/blog/${id}/ : ligne de /blog sans page article`);

// — Lecture de chaque article —
const articles = [];
for (const id of order.filter((id) => onDisk.includes(id))) {
  const route = `/blog/${id}/`;
  const { elements } = collectElements(tokenize(readFileSync(join(DIST, 'blog', id, 'index.html'), 'utf8')));
  const err = (message) => errors.push(`${route} : ${message}`);
  const info = { id, route, ok: true, rail: null, rails: '—' };
  const fail = (message) => {
    info.ok = false;
    err(message);
  };
  articles.push(info);

  const mains = elements.filter((el) => el.tag === 'main');
  const article = mains.length === 1
    ? descendants(mains[0]).filter((el) => el.tag === 'article' && has(el, 'data-pagefind-body'))
    : [];
  if (mains.length !== 1 || article.length !== 1) {
    fail(`${mains.length} <main>, ${article.length} <article data-pagefind-body> dedans (attendu : 1, 1)`);
    continue;
  }
  const inArticle = descendants(article[0]);
  const find = (attr) => inArticle.filter((el) => has(el, attr));

  // Fil d'Ariane.
  const crumbs = find('data-article-crumb');
  if (crumbs.length !== 1) {
    fail(`${crumbs.length} [data-article-crumb] (attendu : 1)`);
  } else {
    const crumb = crumbs[0];
    info.crumb = squash(crumb.text);
    if (info.crumb !== '~/ blog / article') fail(`fil d'Ariane « ${info.crumb} » (attendu : « ~/ blog / article »)`);
    if (!descendants(crumb).some((el) => el.tag === 'a' && el.attrs.href === ALL_HREF)) fail('fil d\'Ariane sans lien /blog/');
    if (!has(crumb, 'data-pagefind-ignore')) fail('fil d\'Ariane sans data-pagefind-ignore');
  }

  // Titre.
  const h1s = elements.filter((el) => el.tag === 'h1');
  if (h1s.length !== 1 || !squash(h1s[0].text) || !inArticle.includes(h1s[0])) {
    fail(`${h1s.length} h1 (attendu : 1, non vide, dans l'article)`);
  } else {
    info.title = squash(h1s[0].text);
  }

  // Ligne de méta.
  const metas = find('data-article-meta');
  if (metas.length !== 1) {
    fail(`${metas.length} [data-article-meta] (attendu : 1)`);
  } else {
    const inMeta = descendants(metas[0]);
    const pill = inMeta.find((el) => classes(el).includes('pill'));
    const time = inMeta.find((el) => el.tag === 'time');
    const minutes = squash(metas[0].text).match(/\b(\d+) min\b/)?.[1];
    const marker = inMeta.find((el) => has(el, 'data-ai-marker'));
    if (!pill) fail('méta sans pilule de catégorie');
    if (!time) fail('méta sans <time>');
    if (!minutes) fail('méta sans « N min »');
    info.category = pill ? squash(pill.text) : null;
    info.level = marker ? marker.attrs['data-ai-marker'] || null : null;
    info.meta = [
      info.category ?? '—',
      time ? squash(time.text) : '—',
      minutes ? `${minutes} min` : '—',
      ...(marker ? [squash(marker.text)] : []),
    ].join(' · ');
  }

  // Cadre et rails.
  const cards = inArticle.filter((el) => classes(el).includes('card'));
  if (cards.length !== 1) {
    fail(`${cards.length} .card dans l'article (attendu : 1)`);
    continue;
  }
  const inCard = descendants(cards[0]);
  const asides = inCard.filter((el) => el.tag === 'aside');
  for (const aside of asides) {
    const name = aside.attrs['aria-label'] ?? '<aside>';
    if (!has(aside, 'data-rail')) fail(`rail « ${name} » sans data-rail`);
    if (!has(aside, 'data-pagefind-ignore')) fail(`rail « ${name} » sans data-pagefind-ignore`);
  }
  const left = asides.find((aside) =>
    descendants(aside).some((el) => el.attrs.id === 'blog-rail-categories'),
  );
  const right = asides.find((aside) => aside !== left);
  if (!left) fail('pas de rail gauche (Catégories)');
  if (asides.length > 2) fail(`${asides.length} rails (attendu : 2 au plus)`);
  info.rails = [left ? 'left' : null, right ? 'right' : null].filter(Boolean).join('+') || '—';

  // Rail gauche : catégories, tags, articles liés, `Plus d'articles →`.
  if (left) {
    const inLeft = descendants(left);
    const nav = inLeft.find((el) => el.tag === 'nav' && el.attrs['aria-labelledby'] === 'blog-rail-categories');
    const rows = nav ? descendants(nav).filter((el) => el.tag === 'a') : [];
    if (rows.length === 0) fail('rail gauche sans lien de catégorie');
    const rowText = rows.map((a) => {
      const [label, count] = a.children.filter((c) => c.tag === 'span').map((c) => squash(c.text));
      const expected = label === 'Tout' ? ALL_HREF : `/blog/?categorie=${encodeURIComponent(label)}`;
      if (a.attrs.href !== expected) fail(`ligne « ${label} » : href « ${a.attrs.href ?? '—'} » (attendu : ${expected})`);
      return `${label} ${count} → ${a.attrs.href}`;
    });
    const tags = inLeft.filter((el) => el.tag === 'a' && has(el, 'data-tag'));
    const more = inLeft.filter((el) => el.tag === 'a' && squash(el.text) === "Plus d'articles →");
    if (more.length !== 1) fail(`${more.length} lien(s) « Plus d'articles → » (attendu : 1)`);
    info.rail = [
      ...rowText,
      `${tags.length} tags`,
      `Plus d'articles → ${more[0]?.attrs.href ?? '—'}`,
    ].join(' · ');
    if (more[0] && more[0].attrs.href !== ALL_HREF) fail(`« Plus d'articles → » mène à ${more[0].attrs.href}`);

    const related = inLeft.filter((el) => has(el, 'data-related-posts'));
    info.related = related.length === 1
      ? descendants(related[0]).filter((el) => el.tag === 'a' && idOf(el.attrs.href)).map((el) => idOf(el.attrs.href))
      : [];
    if (related.length > 1) fail(`${related.length} [data-related-posts] (attendu : 1 au plus)`);
  } else {
    info.related = [];
  }

  // Précédent / suivant.
  const navs = inArticle.filter((el) => el.tag === 'nav' && el.attrs['aria-label'] === 'Articles précédent et suivant');
  if (navs.length !== 1) {
    fail(`${navs.length} nav précédent / suivant (attendu : 1)`);
  } else {
    if (!has(navs[0], 'data-pagefind-ignore')) fail('nav précédent / suivant sans data-pagefind-ignore');
    const tiles = descendants(navs[0]).filter((el) => el.tag === 'a');
    const pick = (direction, label) => {
      const tile = tiles.filter((el) => el.attrs['data-adjacent'] === direction);
      if (tile.length > 1) fail(`${tile.length} tuiles ${direction}`);
      if (tile[0] && !squash(tile[0].text).includes(label)) fail(`tuile ${direction} sans « ${label} »`);
      return tile[0] ? idOf(tile[0].attrs.href) ?? tile[0].attrs.href : null;
    };
    info.previous = pick('previous', '← précédent');
    info.next = pick('next', 'suivant →');
  }

  // Sommaire (rail droit) contre les titres de la prose.
  const proses = inArticle.filter((el) => classes(el).includes('prose'));
  if (proses.length !== 1) fail(`${proses.length} .prose (attendu : 1)`);
  const prose = proses[0];
  const inProse = prose ? descendants(prose) : [];
  const ids = new Set(elements.filter((el) => el.attrs.id).map((el) => el.attrs.id));
  const headingIds = inProse.filter((el) => (el.tag === 'h2' || el.tag === 'h3') && el.attrs.id).map((el) => el.attrs.id);
  const tocs = inArticle.filter((el) => el.tag === 'nav' && el.attrs['aria-label'] === "Sommaire de l'article");
  const tocLinks = tocs.length === 1 ? descendants(tocs[0]).filter((el) => el.tag === 'a') : [];
  if (tocs.length > 1) fail(`${tocs.length} Sommaires (attendu : 1 au plus)`);
  if (tocs.length === 1 && !(right && descendants(right).includes(tocs[0]))) fail('Sommaire hors du rail droit');
  const tocTargets = tocLinks.map((a) => (a.attrs.href ?? '').replace(/^#/, ''));
  for (const a of tocLinks) {
    const target = (a.attrs.href ?? '').replace(/^#/, '');
    if (!a.attrs.href?.startsWith('#') || !ids.has(target)) fail(`entrée de Sommaire « ${squash(a.text)} » → « ${a.attrs.href ?? '—'} » : id absent`);
  }
  if (tocTargets.join('|') !== headingIds.join('|')) {
    fail(`Sommaire (${tocTargets.length} entrées) ≠ titres h2/h3 de la prose (${headingIds.length})`);
  }
  info.toc = tocLinks.length;

  // Projets liés (rail droit).
  const projects = inArticle.filter((el) => has(el, 'data-related-projects'));
  info.projects = projects.length === 1
    ? descendants(projects[0])
        .filter((el) => el.tag === 'a')
        .map((el) => (el.attrs.href ?? '').match(/^\/projets\/([^/?#]+)\/$/)?.[1] ?? el.attrs.href)
    : [];
  if (projects.length > 1) fail(`${projects.length} [data-related-projects] (attendu : 1 au plus)`);
  if (projects.length === 1 && !(right && descendants(right).includes(projects[0]))) fail('Projets liés hors du rail droit');

  // Blocs de code de la prose.
  info.code = inProse.filter((el) => el.tag === 'pre').length;

  // Carte IA.
  const aiCards = find('data-ai-card');
  if (aiCards.length > 1) fail(`${aiCards.length} [data-ai-card] (attendu : 1 au plus)`);
  if (aiCards.length === 1) {
    const card = aiCards[0];
    const inCardAi = descendants(card);
    if (!has(card, 'data-pagefind-ignore')) fail('carte IA sans data-pagefind-ignore');
    if (!inCardAi.some((el) => el.tag === 'a' && el.attrs.href === '/transparence-ia/')) fail('carte IA sans lien /transparence-ia/');
    const tile = inCardAi.find((el) => has(el, 'data-ai-usage'));
    if (!tile) fail('carte IA sans tuile [data-ai-usage]');
    info.ai = tile?.attrs['data-ai-usage'] ?? null;
    if (info.level !== info.ai) fail(`marqueur de la méta « ${info.level ?? '—'} » ≠ carte IA « ${info.ai ?? '—'} »`);
  } else {
    info.ai = null;
    if (info.level) fail(`méta marquée « ${info.level} » sans carte IA`);
  }

  // Liens internes et ancres, sur toute la page.
  for (const a of elements.filter((el) => el.tag === 'a' && el.attrs.href)) {
    const href = a.attrs.href;
    if (href.startsWith('#')) {
      const target = decodeURIComponent(href.slice(1));
      if (target && !ids.has(target)) fail(`ancre « ${href} » : id absent`);
    } else if (href.startsWith('/') && !href.startsWith('//')) {
      if (!resolves(href)) fail(`href « ${href} » ne résout pas dans ${DIST}/`);
      const [path, hash] = href.split('#');
      if (hash && path.split('?')[0] === route && !ids.has(decodeURIComponent(hash))) fail(`ancre « ${href} » : id absent`);
    }
  }

  // Première phrase de la prose (index de recherche).
  const firstP = inProse.find((el) => el.tag === 'p' && squash(el.text));
  if (!firstP) fail('prose sans paragraphe');
  else info.firstSentence = squash(firstP.text).match(/^.*?[.!?…](?=\s|$)/)?.[0] ?? squash(firstP.text);
}

// — Attendus calculés depuis l'ordre canonique —
for (const [index, info] of articles.entries()) {
  if (!info.category) continue;
  const expectedRelated = articles
    .filter((other) => other.id !== info.id && other.category === info.category)
    .slice(0, 3)
    .map((other) => other.id);
  if ((info.related ?? []).join('|') !== expectedRelated.join('|')) {
    info.ok = false;
    errors.push(`${info.route} : articles liés « ${(info.related ?? []).join(', ') || '—'} » (attendu : « ${expectedRelated.join(', ') || '—'} »)`);
  }
  const expectedPrevious = articles[index + 1]?.id ?? null;
  const expectedNext = index > 0 ? articles[index - 1].id : null;
  if ((info.previous ?? null) !== expectedPrevious || (info.next ?? null) !== expectedNext) {
    info.ok = false;
    errors.push(
      `${info.route} : ← ${info.previous ?? '—'} / → ${info.next ?? '—'} (attendu : ← ${expectedPrevious ?? '—'} / → ${expectedNext ?? '—'})`,
    );
  }
}

// — Lignes —
const okCount = articles.filter((info) => info.ok).length;
const crumb = articles.find((info) => info.crumb)?.crumb ?? '—';
const railKinds = [...new Set(articles.map((info) => info.rails))];
lines.push(
  `articles: ${okCount}/${articles.length} · ${crumb} · h1 · meta · 1 .card · rails ${railKinds.length === 1 ? railKinds[0] : railKinds.join(' | ')}`,
);

const rails = [...new Set(articles.map((info) => info.rail).filter(Boolean))];
if (rails.length > 1) errors.push(`rail gauche différent selon l'article (${rails.length} variantes)`);
lines.push(`rail: ${rails[0] ?? '—'}`);

const list = (ids) => (ids && ids.length > 0 ? ids.join(', ') : '—');
for (const info of articles) {
  lines.push(
    `${info.id}: ${info.meta ?? '—'} | related ${list(info.related)} | ← ${info.previous ?? '—'} | → ${info.next ?? '—'} | toc ${info.toc ?? 0} | projects ${list(info.projects)} | code ${info.code ?? 0} | ai ${info.ai ?? '—'}`,
  );
}

const linkErrors = errors.filter((message) => /ne résout pas|ancre|id absent/.test(message));
lines.push(
  linkErrors.length === 0
    ? 'links: every internal href resolves in dist/ · every #anchor exists'
    : `links: ${linkErrors.length} broken`,
);

// — Index de recherche (R13) —
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
for (const info of articles) {
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
  for (const text of FORBIDDEN_IN_INDEX) {
    if (content.includes(text)) {
      clean = false;
      errors.push(`${info.route} : le fragment contient « ${text} »`);
    }
  }
}
lines.push(
  `search: ${indexed} fragments · ${titleAndProse ? 'title and prose indexed' : 'title or prose missing'} · ${clean ? 'rails, AI card, prev/next not indexed' : 'rails, AI card or prev/next indexed'}`,
);

for (const line of lines) console.log(line);
for (const error of errors) console.error(`  ✗ ${error}`);
process.exit(errors.length > 0 ? 1 : 0);
