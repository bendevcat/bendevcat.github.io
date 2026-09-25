#!/usr/bin/env node
/**
 * Contrôle des fiches prompt sur la sortie de build (plan 16, critères R7,
 * R16 et R22). À lancer après `npm run build` :
 *
 *   node scripts/check-prompt.mjs [dist]
 *
 * Imprime sur stdout, dans cet ordre :
 *
 *   prompts: <ok>/<n> · <lien retour> → <href> · h1 · <n> prompt window · <n> aside · no "No content"
 *   <id>: <format> · <outil> · <modèle|—> · version <v|—> · date <d|—> · <N lignes · ~N tokens>
 *   <id> window: <id>.md · <N l.> · <~N tk> · .md · Copier · <n> headings · <nom>×<n>=<défaut> … | no variables
 *   <id> aside: <onglets> · <n> inputs · vient du skill <id|—> · skills liés <ids|—> · prompts liés <ids|—>
 *   counts: header = window = /prompts/ card on <n>/<total>
 *   links: every internal href resolves in dist/
 *   search: <n> fragments · title and prompt text indexed · tab row, window bar, variables, infos and related cards not indexed
 *
 * Les fiches sont lues dans l'ordre des noms de dossier de `dist/prompts/`
 * (une par `<id>/index.html`) ; chaque entrée `[data-entry-id]` de
 * `dist/prompts/index.html` doit y avoir sa fiche, et inversement. Les
 * attendus viennent du frontmatter de `src/content/prompts/<id>/index.md`
 * (lu avec `yaml`, devDependency) et de son corps. `—` = absent. Sans rangée
 * d'onglets (D13), `<onglets>` nomme le panneau unique d'après son contenu.
 *
 * Code de sortie 1 (erreurs sur stderr, après stdout) si, pour une fiche :
 * - il n'y a pas exactement un `<main>` › `<article data-pagefind-body>` ;
 * - un bloc manque : lien `~/ prompts` (`[data-prompt-back]` vers
 *   `/prompts/`), un seul `h1` (= `title`), la rangée méta
 *   (`[data-prompt-meta]` : format, outil, modèle = frontmatter), exactement
 *   une fenêtre `figure[data-prompt-window]`, exactement un
 *   `<aside aria-label="Autour du prompt">` avec sa racine d'onglets
 *   `data-tab-variant="track"` et le panneau `infos` ; les onglets ne sont pas
 *   ceux qu'attend la règle (variables si déclarées, décryptage si la fenêtre
 *   montre le `prompt` et que le corps n'est pas blanc, infos) ;
 * - les boutons `.md` / `Copier` / `réinitialiser` ou un champ de variable ne
 *   sont pas `hidden` dans le HTML ; la rangée d'onglets
 *   (`role="tablist"`), la barre, le panneau variables, le panneau infos ou
 *   une carte liée n'est pas `data-pagefind-ignore` ;
 * - la `value` d'un champ ≠ son `data-default`, le texte d'un `[data-var]` ≠
 *   le défaut de sa variable, une variable déclarée n'a pas de champ ;
 * - le texte du `<code>` ≠ le texte attendu (le `prompt` d'une fiche qui en a
 *   un, variables déclarées remplacées par leur défaut, sinon le corps ;
 *   rogné) ;
 * - le nombre de lignes ou `round(longueur / 4)` du texte de la fenêtre
 *   diffère de l'en-tête, de la barre ou de la carte de la fiche sur
 *   `/prompts/` ;
 * - `No content` apparaît dans un `dist/prompts/**\/index.html` ;
 * - un `href` interne (requête retirée) ne résout pas dans `dist/`, ou une
 *   ancre `#id` de la page n'y existe pas ;
 * - son fragment Pagefind (`dist/pagefind/fragment/*.pf_fragment`, gunzip,
 *   JSON après `pagefind_dcd` — comme scripts/check-article.mjs) manque, ne
 *   contient pas le titre ou la première ligne non vide de la fenêtre, ou
 *   contient `Copier`, `réinitialiser`, `Fiche technique`, `Skills liés`,
 *   `Prompts liés`, `Vient du skill`, `Tous les prompts` ou les libellés de
 *   la rangée d'onglets mis bout à bout (`variables décryptage infos` —
 *   plan 17, F3).
 *
 * Balisage lu : src/pages/prompts/[...slug].astro, src/components/prompt/*,
 * src/components/DetailTabs.astro et src/components/PromptCard.astro.
 *
 * Même petit tokeniseur que scripts/check-project.mjs.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { parse as parseYaml } from 'yaml';

const DIST = process.argv[2] ?? 'dist';
const CONTENT = join('src', 'content', 'prompts');
const BACK_HREF = '/prompts/';
const BACK_TEXT = '~/ prompts';
const ASIDE_LABEL = 'Autour du prompt';
const PLACEHOLDER = 'No content';
const FORBIDDEN_IN_INDEX = [
  'Copier',
  'réinitialiser',
  'Fiche technique',
  'Skills liés',
  'Prompts liés',
  'Vient du skill',
  'Tous les prompts',
];
/** Panneaux : id d'onglet → libellé et crochet de contenu. */
const PANELS = [
  { id: 'variables', label: 'variables', hook: 'data-prompt-variables' },
  { id: 'decryptage', label: 'décryptage', hook: 'data-prompt-notes' },
  { id: 'infos', label: 'infos', hook: 'data-prompt-infos' },
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
const has = (el, attr) => attr in el.attrs;
const squash = (text) => text.replace(/\s+/g, ' ').trim();
/** Hors index de recherche : l'élément ou un de ses ancêtres porte `data-pagefind-ignore`. */
const ignored = (el) => [el, ...ancestors(el)].some((node) => has(node, 'data-pagefind-ignore'));

/** Une URL du site résout-elle dans `dist/` ? (`/skills/x/` → `dist/skills/x/index.html`) */
function resolves(href) {
  if (!href || !href.startsWith('/') || href.startsWith('//')) return false;
  const path = decodeURIComponent(href.split(/[?#]/)[0]);
  const file = path.endsWith('/') ? join(DIST, path, 'index.html') : join(DIST, path);
  return existsSync(file) || existsSync(`${join(DIST, path)}.html`);
}

/** Frontmatter et corps d'un prompt (`index.md` ou `index.mdx`), `null` s'il est introuvable. */
function entryOf(id) {
  for (const name of ['index.md', 'index.mdx']) {
    const file = join(CONTENT, id, name);
    if (!existsSync(file)) continue;
    const source = readFileSync(file, 'utf8');
    const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!match) return { data: {}, body: source };
    return { data: parseYaml(match[1]) ?? {}, body: source.slice(match[0].length) };
  }
  return null;
}

/**
 * Le texte attendu dans la fenêtre — réécrit ici, sans importer le code du
 * site : le `prompt` d'une fiche qui en a un, chaque `{nom}` déclaré remplacé
 * par son défaut (`{nom}` sans défaut), sinon le corps ; rogné.
 */
function expectedWindow(data, body) {
  const format = data.format ?? 'fiche';
  const prompt = typeof data.prompt === 'string' ? data.prompt : '';
  if (format === 'fiche' && prompt.trim() !== '') {
    const declared = new Map();
    for (const variable of Array.isArray(data.variables) ? data.variables : []) {
      const name = String(variable?.name ?? '');
      if (name !== '' && !declared.has(name)) declared.set(name, variable);
    }
    const text = prompt.trim().replace(/\{([^{}\n]+)\}/g, (all, name) => {
      if (!declared.has(name)) return all;
      const value = declared.get(name).default;
      return value === undefined || value === null || value === '' ? all : String(value);
    });
    return { text, showsPrompt: true, variables: [...declared.values()] };
  }
  return { text: (body ?? '').trim(), showsPrompt: false, variables: [] };
}

const statsOf = (text) =>
  text.length === 0 ? { lines: 0, tokens: 0 } : { lines: text.split('\n').length, tokens: Math.round(text.length / 4) };
const idFromHref = (href, prefix) => {
  const m = (href ?? '').match(new RegExp(`^/${prefix}/([^/?#]+)/$`));
  return m ? decodeURIComponent(m[1]) : null;
};

const lines = [];
const errors = [];

const PROMPTS_DIR = join(DIST, 'prompts');
if (!existsSync(PROMPTS_DIR)) {
  console.error(`${PROMPTS_DIR}/ introuvable — lancer \`npm run build\` d'abord`);
  process.exit(1);
}

// — Fiches sur disque et cartes de /prompts —
const ids = readdirSync(PROMPTS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(PROMPTS_DIR, entry.name, 'index.html')))
  .map((entry) => entry.name)
  .sort();
const LIST_FILE = join(PROMPTS_DIR, 'index.html');
const cards = new Map(); // id → { lines, tokens }
if (existsSync(LIST_FILE)) {
  const { elements } = collectElements(tokenize(readFileSync(LIST_FILE, 'utf8')));
  for (const card of elements.filter((el) => has(el, 'data-entry-id'))) {
    const field = (name) => {
      const el = descendants(card).find((node) => node.attrs['data-card-field'] === name);
      return el ? squash(el.text) : null;
    };
    cards.set(card.attrs['data-entry-id'], { lines: field('lines'), tokens: field('tokens') });
  }
  for (const id of cards.keys()) if (!ids.includes(id)) errors.push(`/prompts/ : carte « ${id} » sans fiche`);
  for (const id of ids) if (!cards.has(id)) errors.push(`/prompts/${id}/ : fiche sans carte sur /prompts/`);
} else {
  errors.push(`${LIST_FILE} introuvable`);
}

// — No content, sur tout dist/prompts/ —
const htmlFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? htmlFiles(join(dir, entry.name))
      : entry.name === 'index.html'
        ? [join(dir, entry.name)]
        : [],
  );
const withPlaceholder = htmlFiles(PROMPTS_DIR).filter((file) => readFileSync(file, 'utf8').includes(PLACEHOLDER));
for (const file of withPlaceholder) errors.push(`${file} contient « ${PLACEHOLDER} »`);

// — Lecture de chaque fiche —
const prompts = [];
for (const id of ids) {
  const route = `/prompts/${id}/`;
  const { elements } = collectElements(tokenize(readFileSync(join(PROMPTS_DIR, id, 'index.html'), 'utf8')));
  const info = { id, route, ok: true, countsAgree: false };
  const fail = (message) => {
    info.ok = false;
    errors.push(`${route} : ${message}`);
  };
  prompts.push(info);

  const entry = entryOf(id);
  if (!entry) {
    fail(`frontmatter introuvable dans ${CONTENT}/${id}/`);
    continue;
  }
  const { data, body } = entry;
  const expected = expectedWindow(data, body);

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
  const find = (attr, scope = inArticle) => scope.filter((el) => has(el, attr));

  // Lien retour.
  const backs = inArticle.filter((el) => el.tag === 'a' && has(el, 'data-prompt-back'));
  if (backs.length !== 1) {
    fail(`${backs.length} [data-prompt-back] (attendu : 1)`);
  } else {
    const back = backs[0];
    info.back = `${squash(back.text)} → ${back.attrs.href ?? '—'}`;
    if (squash(back.text) !== BACK_TEXT) fail(`lien retour « ${squash(back.text)} » (attendu : « ${BACK_TEXT} »)`);
    if (back.attrs.href !== BACK_HREF) fail(`lien retour vers « ${back.attrs.href ?? '—'} » (attendu : ${BACK_HREF})`);
  }

  // Titre.
  const h1s = elements.filter((el) => el.tag === 'h1');
  if (h1s.length !== 1 || !within(h1s[0], article)) {
    fail(`${h1s.length} h1 (attendu : 1, dans l'article)`);
  } else {
    info.title = squash(h1s[0].text);
    if (info.title !== squash(String(data.title ?? ''))) fail(`h1 « ${info.title} » ≠ title « ${data.title} »`);
  }

  // Rangée méta.
  const metas = find('data-prompt-meta');
  const metaField = (name) => {
    const el = metas[0] ? descendants(metas[0]).find((node) => node.attrs['data-meta-field'] === name) : null;
    return el ? squash(el.text) : null;
  };
  if (metas.length !== 1) fail(`${metas.length} [data-prompt-meta] (attendu : 1)`);
  const format = metaField('format');
  const tool = metaField('tool');
  const model = metaField('model');
  const headerCounts = metaField('counts');
  if (format !== String(data.format ?? 'fiche')) fail(`format « ${format ?? '—'} » (attendu : « ${data.format ?? 'fiche'} »)`);
  if (tool !== String(data.tool ?? 'Claude')) fail(`outil « ${tool ?? '—'} » (attendu : « ${data.tool ?? 'Claude'} »)`);
  const expectedModel = typeof data.model === 'string' && data.model ? data.model : null;
  if (model !== expectedModel) fail(`modèle « ${model ?? '—'} » (attendu : « ${expectedModel ?? '—'} »)`);
  if (!headerCounts) fail('rangée méta sans comptes');
  info.header = `${format ?? '—'} · ${tool ?? '—'} · ${model ?? '—'} · version ${metaField('version') ?? '—'} · date ${metaField('date') ?? '—'} · ${headerCounts ?? '—'}`;

  // Fenêtre.
  const windows = inArticle.filter((el) => el.tag === 'figure' && has(el, 'data-prompt-window'));
  info.windows = windows.length;
  if (windows.length !== 1) fail(`${windows.length} figure[data-prompt-window] (attendu : 1)`);
  const win = windows[0] ?? null;
  let windowText = null;
  if (win) {
    const inWin = descendants(win);
    const file = `${id}.md`;
    if (win.attrs['aria-label'] !== `Prompt : ${file}`) fail(`fenêtre aria-label « ${win.attrs['aria-label'] ?? '—'} »`);
    const bars = find('data-prompt-bar', inWin);
    if (bars.length !== 1) fail(`${bars.length} [data-prompt-bar] (attendu : 1)`);
    else if (!ignored(bars[0])) fail('barre de la fenêtre sans data-pagefind-ignore');
    if (ignored(win)) fail('fenêtre entière hors index : le texte du prompt doit rester indexé');
    const filename = squash(find('data-prompt-filename', inWin)[0]?.text ?? '');
    if (filename !== file) fail(`nom de fichier « ${filename || '—'} » (attendu : « ${file} »)`);
    const barCounts = squash(find('data-prompt-counts', inWin)[0]?.text ?? '').replace(/^·\s*/, '');
    const buttons = (attr, text) => {
      const found = inWin.filter((el) => el.tag === 'button' && has(el, attr));
      if (found.length !== 1) fail(`${found.length} [${attr}] (attendu : 1)`);
      const button = found[0];
      if (button && squash(button.text) !== text) fail(`[${attr}] « ${squash(button.text)} » (attendu : « ${text} »)`);
      if (button && !has(button, 'hidden')) fail(`« ${text} » sans hidden dans le HTML`);
      return button ? squash(button.text) : '—';
    };
    const md = buttons('data-prompt-download', '.md');
    const copier = buttons('data-prompt-copy', 'Copier');
    const codes = inWin.filter((el) => el.tag === 'code' && el.parent.tag === 'pre');
    if (codes.length !== 1) {
      fail(`${codes.length} pre › code (attendu : 1)`);
    } else {
      windowText = codes[0].text;
      if (windowText !== expected.text) {
        const a = windowText.split('\n');
        const b = expected.text.split('\n');
        const at = b.findIndex((line, i) => a[i] !== line);
        fail(`texte de la fenêtre ≠ texte attendu (ligne ${at === -1 ? b.length + 1 : at + 1})`);
      }
    }
    const headings = find('data-prompt-heading', inWin).length;
    const expectedHeadings = expected.text.split('\n').filter((line) => /^#{2,6} /.test(line)).length;
    if (headings !== expectedHeadings) fail(`${headings} [data-prompt-heading] (attendu : ${expectedHeadings})`);

    // Segments de variable : texte = défaut.
    const segments = find('data-var', inWin);
    const byName = new Map();
    for (const segment of segments) {
      const name = segment.attrs['data-var'];
      byName.set(name, [...(byName.get(name) ?? []), segment]);
    }
    const declared = new Map(expected.variables.map((variable) => [String(variable.name), variable]));
    const varParts = [];
    for (const [name, list] of byName) {
      const variable = declared.get(name);
      if (!variable) {
        fail(`[data-var="${name}"] : variable non déclarée`);
        continue;
      }
      const def = variable.default ?? '';
      const shown = def === '' ? `{${name}}` : String(def);
      const texts = [...new Set(list.map((segment) => segment.text))];
      if (texts.length !== 1 || texts[0] !== shown) fail(`[data-var="${name}"] « ${texts.join(' / ')} » (attendu : « ${shown} »)`);
      varParts.push(`${name}×${list.length}=${texts[0]}`);
    }
    for (const name of declared.keys()) {
      if (!byName.has(name)) fail(`variable « ${name} » déclarée sans segment dans la fenêtre`);
    }
    info.window = `${filename || '—'} · ${barCounts || '—'} · ${md} · ${copier} · ${headings} headings · ${varParts.length > 0 ? varParts.join(' ') : 'no variables'}`;

    // Comptes : texte de la fenêtre = en-tête = barre = carte.
    if (windowText !== null) {
      const stats = statsOf(windowText);
      const header = `${stats.lines} ${stats.lines > 1 ? 'lignes' : 'ligne'} · ~${stats.tokens} ${stats.tokens > 1 ? 'tokens' : 'token'}`;
      const bar = `${stats.lines} l. · ~${stats.tokens} tk`;
      const card = cards.get(id);
      const cardText = card ? `${card.lines} · ${card.tokens}` : null;
      let agree = true;
      if (headerCounts !== header) {
        agree = false;
        fail(`en-tête « ${headerCounts ?? '—'} » ≠ fenêtre « ${header} »`);
      }
      if (barCounts !== bar) {
        agree = false;
        fail(`barre « ${barCounts || '—'} » ≠ fenêtre « ${bar} »`);
      }
      if (cardText !== bar) {
        agree = false;
        fail(`carte de /prompts/ « ${cardText ?? '—'} » ≠ fenêtre « ${bar} »`);
      }
      info.countsAgree = agree;
      info.firstLine = squash(windowText.split('\n').find((line) => line.trim() !== '') ?? '');
    }
  }

  // Colonne.
  const asides = inArticle.filter((el) => el.tag === 'aside');
  info.asides = asides.length;
  if (asides.length !== 1) fail(`${asides.length} <aside> (attendu : 1)`);
  const aside = asides[0] ?? null;
  if (aside) {
    if (aside.attrs['aria-label'] !== ASIDE_LABEL) fail(`<aside> aria-label « ${aside.attrs['aria-label'] ?? '—'} » (attendu : « ${ASIDE_LABEL} »)`);
    const inAside = descendants(aside);
    const roots = find('data-detail-tabs', inAside);
    if (roots.length !== 1) {
      fail(`${roots.length} [data-detail-tabs] dans la colonne (attendu : 1)`);
    } else {
      const root = roots[0];
      if (root.attrs['data-tab-variant'] !== 'track') fail(`racine des onglets data-tab-variant « ${root.attrs['data-tab-variant'] ?? '—'} » (attendu : track)`);
      const inRoot = descendants(root);
      const tabs = inRoot.filter((el) => el.attrs.role === 'tab');
      const present = PANELS.filter((panel) => find(panel.hook, inRoot).length > 0);
      const bodyBlank = (body ?? '').trim() === '';
      const expectedIds = [
        expected.variables.length > 0 ? 'variables' : null,
        expected.showsPrompt && !bodyBlank ? 'decryptage' : null,
        'infos',
      ].filter(Boolean);
      const shownIds = tabs.length > 0 ? tabs.map((tab) => (tab.attrs.id ?? '').replace(/^tab-/, '')) : present.map((p) => p.id);
      if (shownIds.join('|') !== expectedIds.join('|')) fail(`onglets « ${shownIds.join(', ')} » (attendu : ${expectedIds.join(', ')})`);
      if (present.map((p) => p.id).join('|') !== expectedIds.join('|')) fail(`panneaux « ${present.map((p) => p.id).join(', ')} » (attendu : ${expectedIds.join(', ')})`);
      if (tabs.length === 1) fail('un seul onglet rendu en rangée (D13 : panneau nu)');
      if (shownIds.includes('sortie') || shownIds.includes('pourquoi')) fail('onglet sortie ou pourquoi');
      info.tabs = tabs.length > 0 ? tabs.map((tab) => squash(tab.text)).join(' | ') : present.map((p) => p.label).join(' | ') || '—';
      // Plan 17, F3 : les libellés d'onglets n'entrent pas dans l'index.
      for (const tablist of inRoot.filter((el) => el.attrs.role === 'tablist')) {
        if (!ignored(tablist)) fail('rangée d\'onglets (role="tablist") sans data-pagefind-ignore');
      }
      if (tabs.length > 0) info.tabRow = tabs.map((tab) => squash(tab.text)).join(' ');

      for (const hook of ['data-prompt-variables', 'data-prompt-infos']) {
        for (const el of find(hook, inRoot)) if (!ignored(el)) fail(`[${hook}] sans data-pagefind-ignore`);
      }
      for (const el of find('data-prompt-notes', inRoot)) if (ignored(el)) fail('décryptage hors index de recherche');
      if (find('data-prompt-infos', inRoot).length !== 1) fail('panneau infos absent');
    }

    // Champs de variable.
    const inputs = inAside.filter((el) => el.tag === 'input' && has(el, 'data-var-input'));
    info.inputs = inputs.length;
    for (const input of inputs) {
      const name = input.attrs['data-var-input'];
      if (!has(input, 'hidden')) fail(`champ « ${name} » sans hidden dans le HTML`);
      if (!has(input, 'data-default')) fail(`champ « ${name} » sans data-default`);
      if ((input.attrs.value ?? '') !== (input.attrs['data-default'] ?? '')) fail(`champ « ${name} » : value « ${input.attrs.value ?? ''} » ≠ data-default « ${input.attrs['data-default'] ?? ''} »`);
      const variable = expected.variables.find((v) => String(v.name) === name);
      if (!variable) fail(`champ « ${name} » sans variable déclarée`);
      else if ((input.attrs['data-default'] ?? '') !== String(variable.default ?? '')) fail(`champ « ${name} » : data-default ≠ défaut du frontmatter`);
      const labels = inAside.filter((el) => el.tag === 'label' && el.attrs.for && el.attrs.for === input.attrs.id);
      if (labels.length !== 1 || squash(labels[0].text) !== `{${name}}`) fail(`champ « ${name} » sans <label for> « {${name}} »`);
    }
    if (inputs.length !== expected.variables.length) fail(`${inputs.length} champ(s) pour ${expected.variables.length} variable(s) déclarée(s)`);
    const resets = inAside.filter((el) => el.tag === 'button' && has(el, 'data-var-reset'));
    if (expected.variables.length > 0 && resets.length !== 1) fail(`${resets.length} « réinitialiser » (attendu : 1)`);
    for (const reset of resets) if (!has(reset, 'hidden')) fail('« réinitialiser » sans hidden dans le HTML');

    // Vient du skill, Skills liés, Prompts liés.
    const origins = inAside.filter((el) => el.tag === 'a' && has(el, 'data-prompt-origin'));
    info.origin = origins[0] ? idFromHref(origins[0].attrs.href, 'skills') ?? '?' : '—';
    const skillCards = find('data-prompt-skills', inAside);
    const promptCards = find('data-prompt-related', inAside);
    if (skillCards.length > 1 || promptCards.length > 1) fail('carte liée en double');
    const skillIds = skillCards[0]
      ? descendants(skillCards[0]).filter((el) => el.tag === 'a').map((a) => idFromHref(a.attrs.href, 'skills') ?? '?')
      : [];
    const promptLinks = promptCards[0] ? descendants(promptCards[0]).filter((el) => el.tag === 'a') : [];
    const promptIds = promptLinks.filter((a) => a.attrs.href !== BACK_HREF).map((a) => idFromHref(a.attrs.href, 'prompts') ?? '?');
    for (const cardEl of [...skillCards, ...promptCards]) if (!ignored(cardEl)) fail('carte liée sans data-pagefind-ignore');
    if (skillCards[0] && skillIds.length === 0) fail('carte Skills liés vide');
    if (promptCards[0] && promptIds.length === 0) fail('carte Prompts liés vide');
    if (promptCards[0] && !promptLinks.some((a) => a.attrs.href === BACK_HREF && squash(a.text) === 'Tous les prompts →')) {
      fail('carte Prompts liés sans « Tous les prompts → »');
    }
    if (promptIds.includes(id)) fail('le prompt se lie lui-même');
    if (promptIds.length > 3) fail(`${promptIds.length} prompts liés (3 au plus)`);
    if (info.origin !== (skillIds[0] ?? '—')) fail(`« Vient du skill » ${info.origin} ≠ premier skill lié ${skillIds[0] ?? '—'}`);
    const declaredSkills = Array.isArray(data.relatedSkills) ? data.relatedSkills.map(String) : [];
    for (const [index, skill] of declaredSkills.entries()) {
      if (skillIds[index] !== skill && resolves(`/skills/${skill}/`)) fail(`skill déclaré « ${skill} » pas à la place ${index + 1} des skills liés`);
    }
    info.aside = `${info.tabs ?? '—'} · ${info.inputs} inputs · vient du skill ${info.origin} · skills liés ${skillIds.join(', ') || '—'} · prompts liés ${promptIds.join(', ') || '—'}`;
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
}

// — Lignes —
const okCount = prompts.filter((info) => info.ok).length;
const uniform = (key, fallback = '—') => {
  const values = [...new Set(prompts.map((info) => info[key]).filter((v) => v !== undefined && v !== null))];
  return values.length === 0 ? fallback : values.join(' | ');
};
lines.push(
  `prompts: ${okCount}/${prompts.length} · ${uniform('back')} · h1 · ${uniform('windows', '0')} prompt window · ${uniform('asides', '0')} aside · ${withPlaceholder.length === 0 ? 'no "No content"' : `"No content" on ${withPlaceholder.length} page(s)`}`,
);
for (const info of prompts) {
  lines.push(`${info.id}: ${info.header ?? '—'}`);
  lines.push(`${info.id} window: ${info.window ?? '—'}`);
  lines.push(`${info.id} aside: ${info.aside ?? '—'}`);
}
lines.push(`counts: header = window = /prompts/ card on ${prompts.filter((info) => info.countsAgree).length}/${prompts.length}`);

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
let titleAndText = true;
let clean = true;
for (const info of prompts) {
  const fragment = fragments.get(info.route);
  if (!fragment) {
    titleAndText = false;
    errors.push(`${info.route} : pas de fragment Pagefind`);
    continue;
  }
  indexed += 1;
  const content = squash(fragment.content ?? '');
  if (!info.title || !content.includes(info.title)) {
    titleAndText = false;
    errors.push(`${info.route} : le fragment ne contient pas le titre`);
  }
  if (!info.firstLine || !content.includes(info.firstLine)) {
    titleAndText = false;
    errors.push(`${info.route} : le fragment ne contient pas la première ligne de la fenêtre « ${info.firstLine ?? '—'} »`);
  }
  for (const text of [...FORBIDDEN_IN_INDEX, info.tabRow].filter(Boolean)) {
    if (content.includes(text)) {
      clean = false;
      errors.push(`${info.route} : le fragment contient « ${text} »`);
    }
  }
}
lines.push(
  `search: ${indexed} fragments · ${titleAndText ? 'title and prompt text indexed' : 'title or prompt text missing'} · ${clean ? 'tab row, window bar, variables, infos and related cards not indexed' : 'tab row, window bar, variables, infos or related cards indexed'}`,
);

for (const line of lines) console.log(line);
for (const error of errors) console.error(`  ✗ ${error}`);
process.exit(errors.length > 0 ? 1 : 0);
