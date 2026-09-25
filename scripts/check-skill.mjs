#!/usr/bin/env node
/**
 * Contrôle des fiches skill sur la sortie de build (plan 17, critères R8,
 * R16 et R21). À lancer après `npm run build` :
 *
 *   node scripts/check-skill.mjs [dist]
 *
 * Imprime sur stdout, dans cet ordre :
 *
 *   skills: <ok>/<n> · <lien retour> → <href> · h1 · install window · explorer · sticky aside · no "No content"
 *   <id>: <type> · <v…|—> · <licence|—> · <résumé|—> · maj. <date|—>
 *   <id> install: installation · <outil> · <n> step(s) · Copier · note · copy = installCmd   (ou `no install window`)
 *   <id> left: <n> highlights · explorer <n> files / <n> rows · selected <chemin> · <n> preview shown · source <s> · en détail
 *   <id> aside: <onglets> · <n> triggers · versions <v …|—> · prompts du skill <ids|—>
 *   counts: header summary = /skills/ card on <n>/<total>
 *   links: every internal href resolves in dist/
 *   search: <n> fragments · title, highlights, triggers and body indexed · tab row, install window, explorer, versions, infos and prompts card not indexed
 *
 * Les fiches sont lues dans l'ordre des noms de dossier de `dist/skills/`
 * (une par `<id>/index.html`) ; chaque carte `[data-entry-id]` de
 * `dist/skills/index.html` doit avoir sa fiche, et inversement. Les attendus
 * viennent du frontmatter de `src/content/skills/<id>/index.md` (lu avec
 * `yaml`, devDependency) et de son corps ; les prompts liés, de
 * `src/content/prompts/<id>/index.md` (titre, brouillon). Les règles sont
 * réécrites ici, sans importer le code du site.
 *
 * Code de sortie 1 (erreurs sur stderr, après stdout) si, pour une fiche :
 * - il n'y a pas exactement un `<main>` › `<article data-pagefind-body>` ;
 * - un bloc manque ou est en trop : fil `~/ skills` (`[data-skill-back]` vers
 *   `/skills/`) suivi de ` / <name ?? id>`, un seul `h1` (= `title`), la
 *   rangée méta (`[data-skill-meta]` : type, `v<version>`, licence, résumé,
 *   `maj.` = la date de la ligne du journal de `version`, fr-FR long UTC) ;
 *   la fenêtre `figure[data-install-window]` (avec `installCmd`) ; la carte
 *   `[data-skill-highlights]` (avec `highlights`) ; l'explorateur
 *   `figure[data-skill-explorer]` (avec `files`) ; la carte
 *   `[data-skill-notes]` (corps non blanc) ; un `<aside aria-label="Autour du
 *   skill">` collant à partir de 1024 px seulement (`lg:sticky lg:top-5`, sans
 *   `sticky` nu) et, à partir de 1024 px, haut au plus de la fenêtre moins
 *   40 px avec défilement interne (`lg:max-h-[calc(100vh-40px)]`,
 *   `lg:overflow-y-auto` — plan 17, F3), avec sa racine d'onglets
 *   `data-tab-variant="track"` ; la carte `Prompts du skill` (avec un prompt
 *   lié publié) ;
 * - les onglets ne sont pas ceux de la règle (déclencheurs si `triggers`,
 *   versions si `changelog`, infos), ou un panneau manque ;
 * - `Copier` n'est pas `hidden` dans le HTML, ou son `data-install-cmd` ≠
 *   `installCmd` ; les étapes ≠ `installCmd` coupée sur `&&` ; la note ≠
 *   `installNote` ;
 * - les points forts, les déclencheurs ou les versions ≠ le frontmatter ;
 * - (plan 17, F4, WCAG 3.1.2) la description de l'en-tête, la note
 *   d'installation ou une blockquote du corps n'a pas la langue de la règle
 *   quoteLang (src/lib/skillDetail.ts, réécrite ici) : `lang="en"` pour une
 *   citation anglaise, aucun `lang` pour une phrase française ;
 * - l'explorateur : un fichier sans bouton ou sans aperçu, un aperçu dont le
 *   `<pre>` ≠ son `excerpt`, dont la barre ≠ son chemin ; ≠ 1 aperçu montré,
 *   ≠ 1 bouton `aria-pressed="true"`, ou l'aperçu montré n'est pas celui du
 *   bouton pressé ; la sélection ≠ `skills/<name>/SKILL.md`, sinon le premier
 *   `SKILL.md` de l'arbre, sinon le premier fichier ; l'en-tête ≠
 *   `fichiers · <filesSource>` ;
 * - le résumé de l'en-tête ≠ celui de la carte de la fiche sur `/skills/` ;
 * - les prompts de `Prompts du skill` ≠ les prompts liés publiés, triés par
 *   titre (fr) ;
 * - la rangée d'onglets (`role="tablist"`), la fenêtre, l'explorateur, les
 *   panneaux versions et infos ou la carte Prompts du skill ne sont pas
 *   `data-pagefind-ignore`, ou les points forts, les déclencheurs ou le corps
 *   le sont ;
 * - `No content` apparaît dans un `dist/skills/**\/index.html` ;
 * - un `href` interne (requête retirée) ne résout pas dans `dist/`, ou une
 *   ancre `#id` de la page n'y existe pas ;
 * - son fragment Pagefind (`dist/pagefind/fragment/*.pf_fragment`, gunzip,
 *   JSON après `pagefind_dcd` — comme scripts/check-article.mjs) manque, ne
 *   contient pas le titre, le premier point fort, le premier déclencheur ou
 *   le début du corps, ou contient `Copier`, `Fiche technique`,
 *   `Notes de version`, `Prompts du skill`, `fichiers ·` ou les libellés de
 *   la rangée d'onglets mis bout à bout (`déclencheurs versions infos`).
 *
 * Balisage lu : src/pages/skills/[...slug].astro, src/components/skill/*,
 * src/components/DetailTabs.astro, src/components/prompt/RelatedPromptsCard.astro
 * et src/components/SkillCard.astro.
 *
 * Même petit tokeniseur que scripts/check-prompt.mjs.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { parse as parseYaml } from 'yaml';

const DIST = process.argv[2] ?? 'dist';
const CONTENT = join('src', 'content', 'skills');
const PROMPTS = join('src', 'content', 'prompts');
const BACK_HREF = '/skills/';
const BACK_TEXT = '~/ skills';
const ASIDE_LABEL = 'Autour du skill';
const PLACEHOLDER = 'No content';
const FORBIDDEN_IN_INDEX = ['Copier', 'Fiche technique', 'Notes de version', 'Prompts du skill', 'fichiers ·'];
/** Panneaux : id d'onglet → libellé et crochet de contenu. */
const PANELS = [
  { id: 'declencheurs', label: 'déclencheurs', hook: 'data-skill-triggers' },
  { id: 'versions', label: 'versions', hook: 'data-skill-versions' },
  { id: 'infos', label: 'infos', hook: 'data-skill-infos' },
];

/**
 * Langue d'une citation — même règle que quoteLang (src/lib/skillDetail.ts) :
 * une lettre accentuée du français ou un mot-outil français → `fr` ; sinon
 * `en`. Attendu : `lang="en"` pour `en`, aucun `lang` pour `fr`.
 */
const FRENCH_LETTER = /[àâçéèêëîïôûùüÿœæ]/i;
const FRENCH_WORD =
  /(?:^|[^\p{L}])(?:le|la|les|un|une|des|du|de|et|est|ne|pas|rien|entre|chaque|toute|tout|ce|qui|que|par|pour|avec|sans|dans|sur|son|sa|ses)(?=$|[^\p{L}])/iu;
const expectedLang = (text) => (FRENCH_LETTER.test(text) || FRENCH_WORD.test(text) ? undefined : 'en');

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

/** Frontmatter et corps d'une entrée (`index.md` ou `index.mdx`), `null` si introuvable. */
function entryOf(dir, id) {
  for (const name of ['index.md', 'index.mdx']) {
    const file = join(dir, id, name);
    if (!existsSync(file)) continue;
    const source = readFileSync(file, 'utf8');
    const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!match) return { data: {}, body: source };
    return { data: parseYaml(match[1]) ?? {}, body: source.slice(match[0].length) };
  }
  return null;
}

const list = (value) => (Array.isArray(value) ? value : []);
const asDate = (value) => (value instanceof Date ? value : new Date(String(value)));
const isoDay = (value) => asDate(value).toISOString().slice(0, 10);
const longDate = (value) =>
  asDate(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;
const stripVersion = (value) => String(value ?? '').trim().replace(/^v/i, '');

/** Résumé attendu : `N skill(s) · N commande(s) · N prompt(s)`, parties à 0 omises. */
function expectedSummary(data, publishedPrompts) {
  const parts = [];
  if (Number(data.skillCount) > 0) parts.push(plural(Number(data.skillCount), 'skill', 'skills'));
  if (Number(data.commandCount) > 0) parts.push(plural(Number(data.commandCount), 'commande', 'commandes'));
  if (publishedPrompts > 0) parts.push(plural(publishedPrompts, 'prompt', 'prompts'));
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** Arbre attendu : dossiers avant fichiers, point de code, dossiers à entrée unique fusionnés. */
function treeOf(paths) {
  const root = { dirs: new Map(), files: [] };
  for (const path of paths) {
    const parts = path.split('/').filter(Boolean);
    let node = root;
    for (const part of parts.slice(0, -1)) {
      if (!node.dirs.has(part)) node.dirs.set(part, { dirs: new Map(), files: [] });
      node = node.dirs.get(part);
    }
    node.files.push(parts[parts.length - 1]);
  }
  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  const rows = [];
  const walk = (node, prefix) => {
    for (const name of [...node.dirs.keys()].sort(cmp)) {
      let dir = node.dirs.get(name);
      let path = prefix + name;
      while (dir.files.length === 0 && dir.dirs.size === 1) {
        const [child, next] = [...dir.dirs.entries()][0];
        path += `/${child}`;
        dir = next;
      }
      if (dir.dirs.size === 0 && dir.files.length === 1) {
        rows.push({ kind: 'file', path: `${path}/${dir.files[0]}` });
        continue;
      }
      rows.push({ kind: 'dir', path });
      walk(dir, `${path}/`);
    }
    for (const file of [...node.files].sort(cmp)) rows.push({ kind: 'file', path: prefix + file });
  };
  walk(root, '');
  return rows;
}

const idFromHref = (href, prefix) => {
  const m = (href ?? '').match(new RegExp(`^/${prefix}/([^/?#]+)/$`));
  return m ? decodeURIComponent(m[1]) : null;
};
/** Début du corps tel que la recherche l'indexe : première ligne de texte, marques Markdown retirées. */
function bodyLead(body) {
  const line = (body ?? '')
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l !== '' && !/^(#|\||>|-{3,}|```)/.test(l));
  if (!line) return null;
  return squash(line.replace(/\*\*|`|\*|_/g, '')).split(' ').slice(0, 6).join(' ');
}

const lines = [];
const errors = [];

const SKILLS_DIR = join(DIST, 'skills');
if (!existsSync(SKILLS_DIR)) {
  console.error(`${SKILLS_DIR}/ introuvable — lancer \`npm run build\` d'abord`);
  process.exit(1);
}

// — Fiches sur disque et cartes de /skills —
const ids = readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(SKILLS_DIR, entry.name, 'index.html')))
  .map((entry) => entry.name)
  .sort();
const LIST_FILE = join(SKILLS_DIR, 'index.html');
const cards = new Map(); // id → résumé de la carte (ou null)
if (existsSync(LIST_FILE)) {
  const { elements } = collectElements(tokenize(readFileSync(LIST_FILE, 'utf8')));
  for (const card of elements.filter((el) => has(el, 'data-entry-id'))) {
    const el = descendants(card).find((node) => node.attrs['data-card-field'] === 'summary');
    cards.set(card.attrs['data-entry-id'], el ? squash(el.text) : null);
  }
  for (const id of cards.keys()) if (!ids.includes(id)) errors.push(`/skills/ : carte « ${id} » sans fiche`);
  for (const id of ids) if (!cards.has(id)) errors.push(`/skills/${id}/ : fiche sans carte sur /skills/`);
} else {
  errors.push(`${LIST_FILE} introuvable`);
}

// — No content, sur tout dist/skills/ —
const htmlFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? htmlFiles(join(dir, entry.name))
      : entry.name === 'index.html'
        ? [join(dir, entry.name)]
        : [],
  );
const withPlaceholder = htmlFiles(SKILLS_DIR).filter((file) => readFileSync(file, 'utf8').includes(PLACEHOLDER));
for (const file of withPlaceholder) errors.push(`${file} contient « ${PLACEHOLDER} »`);

// — Lecture de chaque fiche —
const skills = [];
const blocks = { install: 0, explorer: 0, aside: 0 };
for (const id of ids) {
  const route = `/skills/${id}/`;
  const { elements } = collectElements(tokenize(readFileSync(join(SKILLS_DIR, id, 'index.html'), 'utf8')));
  const info = { id, route, ok: true, summaryAgrees: false };
  const fail = (message) => {
    info.ok = false;
    errors.push(`${route} : ${message}`);
  };
  skills.push(info);

  const entry = entryOf(CONTENT, id);
  if (!entry) {
    fail(`frontmatter introuvable dans ${CONTENT}/${id}/`);
    continue;
  }
  const { data, body } = entry;
  const type = String(data.type ?? 'claude-code');
  const version = data.version ? `v${String(data.version).trim()}` : null;
  const license = data.license ? String(data.license).trim() : null;
  const changelog = list(data.changelog);
  const triggers = list(data.triggers).map(String);
  const highlights = list(data.highlights).map(String);
  const files = list(data.files);
  const installCmd = typeof data.installCmd === 'string' ? data.installCmd : '';
  const steps = installCmd.split('&&').map((part) => part.trim()).filter(Boolean);
  const updatedRow = version ? changelog.find((row) => stripVersion(row.version) === stripVersion(data.version)) : null;
  const updated = updatedRow ? longDate(updatedRow.date) : null;
  const related = list(data.relatedPrompts)
    .map((ref) => ({ id: String(ref), entry: entryOf(PROMPTS, String(ref)) }))
    .filter(({ entry: prompt }) => prompt && prompt.data.draft !== true)
    .sort((a, b) => String(a.entry.data.title).localeCompare(String(b.entry.data.title), 'fr'))
    .map(({ id: promptId }) => promptId);
  const summary = expectedSummary(data, related.length);
  info.title = squash(String(data.title ?? ''));
  info.highlight = highlights[0] ? squash(highlights[0]) : null;
  info.trigger = triggers[0] ? squash(triggers[0]) : null;
  info.bodyLead = bodyLead(body);

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
  /** Un seul bloc quand `expected`, aucun sinon. */
  const block = (els, expected, name) => {
    if (els.length !== (expected ? 1 : 0)) fail(`${els.length} ${name} (attendu : ${expected ? 1 : 0})`);
    return els[0] ?? null;
  };

  // Fil d'Ariane.
  const backs = inArticle.filter((el) => el.tag === 'a' && has(el, 'data-skill-back'));
  if (backs.length !== 1) {
    fail(`${backs.length} [data-skill-back] (attendu : 1)`);
  } else {
    const back = backs[0];
    info.back = `${squash(back.text)} → ${back.attrs.href ?? '—'}`;
    if (squash(back.text) !== BACK_TEXT) fail(`lien retour « ${squash(back.text)} » (attendu : « ${BACK_TEXT} »)`);
    if (back.attrs.href !== BACK_HREF) fail(`lien retour vers « ${back.attrs.href ?? '—'} » (attendu : ${BACK_HREF})`);
    const crumb = squash(find('data-skill-crumb')[0]?.text ?? '');
    const expectedCrumb = `/ ${data.name ?? id}`;
    if (crumb !== expectedCrumb) fail(`fil « ${crumb || '—'} » (attendu : « ${expectedCrumb} »)`);
  }

  // Titre.
  const h1s = elements.filter((el) => el.tag === 'h1');
  if (h1s.length !== 1 || !within(h1s[0], article)) fail(`${h1s.length} h1 (attendu : 1, dans l'article)`);
  else if (squash(h1s[0].text) !== info.title) fail(`h1 « ${squash(h1s[0].text)} » ≠ title « ${info.title} »`);

  // Description (plan 17, F4) : la langue de la règle quoteLang.
  const description = squash(String(data.description ?? ''));
  if (description) {
    const descEl = find('data-skill-header').flatMap(descendants).find((el) => el.tag === 'p' && squash(el.text) === description);
    if (!descEl) fail('description absente de l\'en-tête');
    else if (descEl.attrs.lang !== expectedLang(description)) {
      fail(`description lang « ${descEl.attrs.lang ?? '—'} » (attendu : « ${expectedLang(description) ?? '—'} »)`);
    }
  }

  // Rangée méta.
  const metas = find('data-skill-meta');
  if (metas.length !== 1) fail(`${metas.length} [data-skill-meta] (attendu : 1)`);
  const metaField = (name) => {
    const el = metas[0] ? descendants(metas[0]).find((node) => node.attrs['data-meta-field'] === name) : null;
    return el ? squash(el.text) : null;
  };
  const meta = {
    type: metaField('type'),
    version: metaField('version'),
    license: metaField('license'),
    summary: metaField('summary'),
    updated: metaField('updated'),
  };
  const expectedMeta = { type, version, license, summary, updated };
  for (const [key, value] of Object.entries(expectedMeta)) {
    if (meta[key] !== value) fail(`méta ${key} « ${meta[key] ?? '—'} » (attendu : « ${value ?? '—'} »)`);
  }
  info.header = `${meta.type ?? '—'} · ${meta.version ?? '—'} · ${meta.license ?? '—'} · ${meta.summary ?? '—'} · maj. ${meta.updated ?? '—'}`;
  const card = cards.get(id);
  if (card === undefined) {
    // déjà signalé
  } else if (card !== meta.summary) {
    fail(`résumé de l'en-tête « ${meta.summary ?? '—'} » ≠ carte de /skills/ « ${card ?? '—'} »`);
  } else {
    info.summaryAgrees = true;
  }

  // Colonne de gauche.
  const left = find('data-skill-left');
  if (left.length !== 1) fail(`${left.length} [data-skill-left] (attendu : 1)`);

  // Fenêtre d'installation.
  const win = block(
    inArticle.filter((el) => el.tag === 'figure' && has(el, 'data-install-window')),
    steps.length > 0,
    'figure[data-install-window]',
  );
  if (win) {
    blocks.install += 1;
    const inWin = descendants(win);
    if (!ignored(win)) fail('fenêtre d\'installation sans data-pagefind-ignore');
    if (win.attrs['aria-label'] !== 'Installation') fail(`fenêtre aria-label « ${win.attrs['aria-label'] ?? '—'} »`);
    const title = squash(find('data-install-title', inWin)[0]?.text ?? '');
    const tool = type === 'claude-code' ? 'Claude Code' : type;
    if (title !== `installation · ${tool}`) fail(`barre « ${title || '—'} » (attendu : « installation · ${tool} »)`);
    const copies = inWin.filter((el) => el.tag === 'button' && has(el, 'data-install-copy'));
    const copy = copies[0];
    if (copies.length !== 1) fail(`${copies.length} [data-install-copy] (attendu : 1)`);
    if (copy && squash(copy.text) !== 'Copier') fail(`bouton « ${squash(copy.text)} » (attendu : « Copier »)`);
    if (copy && !has(copy, 'hidden')) fail('« Copier » sans hidden dans le HTML');
    const copyOk = copy && copy.attrs['data-install-cmd'] === installCmd;
    if (copy && !copyOk) fail(`Copier copie « ${copy.attrs['data-install-cmd'] ?? '—'} » ≠ installCmd`);
    const shownSteps = find('data-install-step', inWin).map((li) =>
      squash(descendants(li).filter((el) => el.tag === 'span' && !has(el, 'aria-hidden')).map((el) => el.text).join('')),
    );
    const numbers = find('data-install-step', inWin).map((li) =>
      squash(descendants(li).find((el) => has(el, 'aria-hidden'))?.text ?? ''),
    );
    if (shownSteps.join('\n') !== steps.join('\n')) fail(`étapes « ${shownSteps.join(' | ')} » ≠ installCmd coupée sur && « ${steps.join(' | ')} »`);
    if (numbers.join(' ') !== steps.map((_, i) => `${i + 1}.`).join(' ')) fail(`numéros « ${numbers.join(' ')} »`);
    const notes = find('data-install-note', inWin);
    const note = notes[0] ? squash(notes[0].text) : null;
    const expectedNote = data.installNote ? squash(String(data.installNote)) : null;
    if (note !== expectedNote) fail(`note « ${note ?? '—'} » (attendu : « ${expectedNote ?? '—'} »)`);
    if (notes[0] && notes[0].attrs.lang !== expectedLang(note)) {
      fail(`note lang « ${notes[0].attrs.lang ?? '—'} » (attendu : « ${expectedLang(note) ?? '—'} »)`);
    }
    info.install = `${title || '—'} · ${plural(shownSteps.length, 'step', 'steps')} · ${copy ? squash(copy.text) : '—'} · ${note ? 'note' : 'no note'} · ${copyOk ? 'copy = installCmd' : 'copy ≠ installCmd'}`;
  } else {
    info.install = 'no install window';
  }

  // Ce que fait ce skill.
  const leftParts = [];
  const highlightCard = block(find('data-skill-highlights'), highlights.length > 0, '[data-skill-highlights]');
  if (highlightCard) {
    if (ignored(highlightCard)) fail('points forts hors index de recherche');
    const heading = descendants(highlightCard).find((el) => el.tag === 'h2');
    if (squash(heading?.text ?? '') !== 'Ce que fait ce skill') fail(`titre des points forts « ${squash(heading?.text ?? '') || '—'} »`);
    const items = find('data-highlight', descendants(highlightCard)).map((el) => squash(el.text));
    if (items.join('\n') !== highlights.map(squash).join('\n')) fail('points forts ≠ highlights du frontmatter');
    const icons = find('data-highlight', descendants(highlightCard)).filter((el) => el.children.some((child) => child.tag === 'svg'));
    if (icons.length !== items.length) fail(`${icons.length} icônes pour ${items.length} points forts`);
    leftParts.push(`${items.length} highlights`);
  } else {
    leftParts.push('no highlights');
  }

  // Explorateur.
  const explorer = block(
    inArticle.filter((el) => el.tag === 'figure' && has(el, 'data-skill-explorer')),
    files.length > 0,
    'figure[data-skill-explorer]',
  );
  if (explorer) {
    blocks.explorer += 1;
    const inEx = descendants(explorer);
    if (!ignored(explorer)) fail('explorateur sans data-pagefind-ignore');
    const paths = files.map((file) => String(file.path));
    const tree = treeOf(paths);
    const rows = find('data-explorer-row', inEx);
    const rowPaths = rows.map((row) =>
      row.attrs['data-explorer-row'] === 'file'
        ? `file:${descendants(row).find((el) => el.tag === 'button')?.attrs['data-explorer-file'] ?? '?'}`
        : `dir:${squash(row.text).replace(/^▸\s*/, '')}`,
    );
    const expectedRows = tree.map((row) => (row.kind === 'file' ? `file:${row.path}` : `dir:${row.path.split('/').pop()}/`));
    // Libellé d'un dossier fusionné : la chaîne depuis son parent affiché.
    const dirLabel = (row, index) => {
      const parent = tree.slice(0, index).reverse().find((r) => r.kind === 'dir' && row.path.startsWith(`${r.path}/`));
      return `dir:${parent ? row.path.slice(parent.path.length + 1) : row.path}/`;
    };
    tree.forEach((row, index) => {
      if (row.kind === 'dir') expectedRows[index] = dirLabel(row, index);
    });
    if (rowPaths.join('|') !== expectedRows.join('|')) fail(`rangées « ${rowPaths.join(', ')} » (attendu : ${expectedRows.join(', ')})`);
    for (const row of rows.filter((r) => r.attrs['data-explorer-row'] === 'dir')) {
      if (descendants(row).some((el) => ['button', 'a'].includes(el.tag))) fail('rangée de dossier interactive');
    }
    const buttons = inEx.filter((el) => el.tag === 'button' && has(el, 'data-explorer-file'));
    const previews = find('data-explorer-preview', inEx);
    const pressed = buttons.filter((button) => button.attrs['aria-pressed'] === 'true');
    const shown = previews.filter((preview) => !has(preview, 'hidden'));
    for (const button of buttons) {
      if (!['true', 'false'].includes(button.attrs['aria-pressed'])) fail(`bouton « ${button.attrs['data-explorer-file']} » sans aria-pressed`);
    }
    if (buttons.length !== paths.length) fail(`${buttons.length} boutons pour ${paths.length} fichiers`);
    if (previews.length !== paths.length) fail(`${previews.length} aperçus pour ${paths.length} fichiers`);
    if (pressed.length !== 1) fail(`${pressed.length} bouton(s) aria-pressed="true" (attendu : 1)`);
    if (shown.length !== 1) fail(`${shown.length} aperçu(s) montré(s) (attendu : 1)`);
    const fileRows = tree.filter((row) => row.kind === 'file').map((row) => row.path);
    const own = data.name ? `skills/${data.name}/SKILL.md` : null;
    const expectedSelected =
      (own && fileRows.includes(own) ? own : null) ??
      fileRows.find((path) => path === 'SKILL.md' || path.endsWith('/SKILL.md')) ??
      fileRows[0];
    const selected = pressed[0]?.attrs['data-explorer-file'] ?? '—';
    if (selected !== expectedSelected) fail(`sélection « ${selected} » (attendu : ${expectedSelected})`);
    if (pressed[0] && shown[0] && pressed[0].attrs['aria-controls'] !== shown[0].attrs.id) {
      fail(`aperçu montré « ${shown[0].attrs['data-explorer-preview']} » ≠ bouton pressé « ${selected} »`);
    }
    for (const button of buttons) {
      const target = previews.find((preview) => preview.attrs.id === button.attrs['aria-controls']);
      if (!target) fail(`bouton « ${button.attrs['data-explorer-file']} » : aria-controls sans aperçu`);
      else if (target.attrs['data-explorer-preview'] !== button.attrs['data-explorer-file']) fail(`bouton « ${button.attrs['data-explorer-file']} » pilote l'aperçu « ${target.attrs['data-explorer-preview']} »`);
    }
    for (const file of files) {
      const path = String(file.path);
      const preview = previews.find((el) => el.attrs['data-explorer-preview'] === path);
      if (!preview) {
        fail(`fichier « ${path} » sans aperçu`);
        continue;
      }
      const inPreview = descendants(preview);
      const bar = squash(find('data-explorer-path', inPreview)[0]?.text ?? '');
      if (bar !== path) fail(`barre de l'aperçu « ${bar || '—'} » ≠ « ${path} »`);
      const pres = inPreview.filter((el) => el.tag === 'pre');
      if (pres.length !== 1) {
        fail(`aperçu « ${path} » : ${pres.length} <pre> (attendu : 1)`);
      } else if (pres[0].text !== String(file.excerpt)) {
        const a = pres[0].text.split('\n');
        const b = String(file.excerpt).split('\n');
        const at = b.findIndex((line, i) => a[i] !== line);
        fail(`aperçu « ${path} » : texte ≠ excerpt (ligne ${at === -1 ? b.length + 1 : at + 1})`);
      }
    }
    const source = squash(find('data-explorer-source', inEx)[0]?.text ?? '');
    const expectedSource = data.filesSource ? `fichiers · ${data.filesSource}` : 'fichiers';
    if (source !== expectedSource) fail(`en-tête de l'arbre « ${source || '—'} » (attendu : « ${expectedSource} »)`);
    if (find('data-explorer-tree', inEx).length !== 1) fail('arbre [data-explorer-tree] absent');
    leftParts.push(
      `explorer ${buttons.length} files / ${rows.length} rows`,
      `selected ${selected}`,
      `${shown.length} preview shown`,
      `source ${data.filesSource ?? '—'}`,
    );
  } else {
    leftParts.push('no explorer');
  }

  // En détail.
  const bodyBlank = (body ?? '').trim() === '';
  const notes = block(find('data-skill-notes'), !bodyBlank, '[data-skill-notes]');
  if (notes) {
    if (ignored(notes)) fail('En détail hors index de recherche');
    const heading = descendants(notes).find((el) => el.tag === 'h2');
    if (squash(heading?.text ?? '') !== 'En détail') fail(`titre du corps « ${squash(heading?.text ?? '') || '—'} »`);
    for (const quote of descendants(notes).filter((el) => el.tag === 'blockquote')) {
      const text = squash(quote.text);
      if (quote.attrs.lang !== expectedLang(text)) {
        fail(`blockquote « ${text.slice(0, 40)}… » lang « ${quote.attrs.lang ?? '—'} » (attendu : « ${expectedLang(text) ?? '—'} »)`);
      }
    }
    leftParts.push('en détail');
  }
  info.left = leftParts.join(' · ');

  // Colonne.
  const asides = inArticle.filter((el) => el.tag === 'aside');
  if (asides.length !== 1) fail(`${asides.length} <aside> (attendu : 1)`);
  const aside = asides[0] ?? null;
  if (aside) {
    if (aside.attrs['aria-label'] !== ASIDE_LABEL) fail(`<aside> aria-label « ${aside.attrs['aria-label'] ?? '—'} » (attendu : « ${ASIDE_LABEL} »)`);
    const classes = (aside.attrs.class ?? '').split(/\s+/);
    const sticky = classes.includes('lg:sticky') && classes.includes('lg:top-5') && !classes.includes('sticky');
    // Plan 17, F3 : collante, la colonne ne dépasse pas la fenêtre (20 px en
    // haut, 20 en bas) et défile en interne — à partir de 1024 px seulement.
    const fits =
      classes.includes('lg:max-h-[calc(100vh-40px)]') &&
      classes.includes('lg:overflow-y-auto') &&
      !classes.some((c) => /^(max-h-|overflow-)/.test(c));
    if (!sticky) fail('<aside> pas collant à 20 px à partir de 1024 px seulement (lg:sticky lg:top-5)');
    else if (!fits) fail('<aside> collant sans lg:max-h-[calc(100vh-40px)] lg:overflow-y-auto (ou avec un max-h / overflow hors lg)');
    else blocks.aside += 1;
    if (left[0] && elements.indexOf(left[0]) > elements.indexOf(aside)) fail('la colonne précède les blocs de gauche dans le DOM');
    const inAside = descendants(aside);
    const roots = find('data-detail-tabs', inAside);
    const asideParts = [];
    if (roots.length !== 1) {
      fail(`${roots.length} [data-detail-tabs] dans la colonne (attendu : 1)`);
    } else {
      const root = roots[0];
      if (root.attrs['data-tab-variant'] !== 'track') fail(`racine des onglets data-tab-variant « ${root.attrs['data-tab-variant'] ?? '—'} » (attendu : track)`);
      const inRoot = descendants(root);
      const tabs = inRoot.filter((el) => el.attrs.role === 'tab');
      const present = PANELS.filter((panel) => find(panel.hook, inRoot).length > 0);
      const expectedIds = [triggers.length > 0 ? 'declencheurs' : null, changelog.length > 0 ? 'versions' : null, 'infos'].filter(Boolean);
      const shownIds = tabs.length > 0 ? tabs.map((tab) => (tab.attrs.id ?? '').replace(/^tab-/, '')) : present.map((p) => p.id);
      if (shownIds.join('|') !== expectedIds.join('|')) fail(`onglets « ${shownIds.join(', ')} » (attendu : ${expectedIds.join(', ')})`);
      if (present.map((p) => p.id).join('|') !== expectedIds.join('|')) fail(`panneaux « ${present.map((p) => p.id).join(', ')} » (attendu : ${expectedIds.join(', ')})`);
      if (shownIds.includes('apercu')) fail('onglet apercu');
      asideParts.push(tabs.length > 0 ? tabs.map((tab) => squash(tab.text)).join(' | ') : present.map((p) => p.label).join(' | ') || '—');
      // Plan 17, F3 : les libellés d'onglets n'entrent pas dans l'index.
      for (const tablist of inRoot.filter((el) => el.attrs.role === 'tablist')) {
        if (!ignored(tablist)) fail('rangée d\'onglets (role="tablist") sans data-pagefind-ignore');
      }
      if (tabs.length > 0) info.tabRow = tabs.map((tab) => squash(tab.text)).join(' ');

      const triggerEls = find('data-trigger', inRoot);
      const shownTriggers = triggerEls.map((el) => squash(el.text));
      if (shownTriggers.join('\n') !== triggers.map(squash).join('\n')) fail('déclencheurs ≠ triggers du frontmatter');
      for (const el of find('data-skill-triggers', inRoot)) if (ignored(el)) fail('déclencheurs hors index de recherche');
      for (const el of triggerEls) {
        const box = el.parent;
        if (!squash(box.text).startsWith('«') || !squash(box.text).endsWith('»')) fail(`déclencheur « ${squash(el.text)} » sans guillemets « … »`);
        if (!['en', 'fr'].includes(el.attrs.lang)) fail(`déclencheur « ${squash(el.text)} » sans lang`);
      }
      asideParts.push(plural(shownTriggers.length, 'trigger', 'triggers'));

      const versionRows = find('data-version-row', inRoot).map((el) => el.attrs['data-version-row']);
      const expectedVersions = changelog.map((row) => String(row.version));
      if (versionRows.join(' ') !== expectedVersions.join(' ')) fail(`versions « ${versionRows.join(' ')} » (attendu : ${expectedVersions.join(' ')})`);
      for (const row of find('data-version-row', inRoot)) {
        const source = changelog.find((r) => String(r.version) === row.attrs['data-version-row']);
        const time = descendants(row).find((el) => el.tag === 'time');
        if (source && time?.attrs.datetime !== isoDay(source.date)) fail(`version ${row.attrs['data-version-row']} : date ${time?.attrs.datetime ?? '—'} (attendu : ${isoDay(source.date)})`);
      }
      asideParts.push(`versions ${versionRows.join(' ') || '—'}`);

      for (const hook of ['data-skill-versions', 'data-skill-infos']) {
        for (const el of find(hook, inRoot)) if (!ignored(el)) fail(`[${hook}] sans data-pagefind-ignore`);
      }
      const infos = find('data-skill-infos', inRoot)[0];
      if (!infos) {
        fail('panneau infos absent');
      } else {
        const infoField = (name) => {
          const el = find('data-info-field', descendants(infos)).find((node) => node.attrs['data-info-field'] === name);
          return el ? squash(el.text) : null;
        };
        const expectedInfos = { type, version, license, summary, updated };
        for (const [key, value] of Object.entries(expectedInfos)) {
          if (infoField(key) !== value) fail(`infos ${key} « ${infoField(key) ?? '—'} » (attendu : « ${value ?? '—'} »)`);
        }
        const repo = find('data-skill-repo', descendants(infos))[0];
        if (Boolean(repo) !== Boolean(data.repoUrl)) fail(`code source ↗ ${repo ? 'présent sans repoUrl' : 'absent'}`);
        if (repo && (repo.attrs.href !== data.repoUrl || repo.attrs.target !== '_blank' || repo.attrs.rel !== 'noopener noreferrer')) {
          fail('code source ↗ : href, target ou rel inattendu');
        }
      }
    }

    // Prompts du skill.
    const promptCards = find('data-prompt-related', inAside);
    const promptCard = block(promptCards, related.length > 0, 'carte Prompts du skill');
    let promptIds = [];
    if (promptCard) {
      if (!ignored(promptCard)) fail('carte Prompts du skill sans data-pagefind-ignore');
      const heading = descendants(promptCard).find((el) => el.tag === 'h2');
      if (squash(heading?.text ?? '') !== 'Prompts du skill') fail(`titre de la carte « ${squash(heading?.text ?? '') || '—'} »`);
      const links = descendants(promptCard).filter((el) => el.tag === 'a');
      promptIds = links.filter((a) => a.attrs.href !== '/prompts/').map((a) => idFromHref(a.attrs.href, 'prompts') ?? '?');
      if (promptIds.join(',') !== related.join(',')) fail(`prompts du skill « ${promptIds.join(', ')} » (attendu : ${related.join(', ')})`);
      if (!links.some((a) => a.attrs.href === '/prompts/' && squash(a.text) === 'Tous les prompts →')) fail('carte sans « Tous les prompts → »');
    }
    asideParts.push(`prompts du skill ${promptIds.join(', ') || '—'}`);
    info.aside = asideParts.join(' · ');
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
const okCount = skills.filter((info) => info.ok).length;
const uniform = (key, fallback = '—') => {
  const values = [...new Set(skills.map((info) => info[key]).filter((v) => v !== undefined && v !== null))];
  return values.length === 0 ? fallback : values.join(' | ');
};
const all = (count, label) => (count === skills.length ? label : `${label} ${count}/${skills.length}`);
lines.push(
  `skills: ${okCount}/${skills.length} · ${uniform('back')} · h1 · ${all(blocks.install, 'install window')} · ${all(blocks.explorer, 'explorer')} · ${all(blocks.aside, 'sticky aside')} · ${withPlaceholder.length === 0 ? 'no "No content"' : `"No content" on ${withPlaceholder.length} page(s)`}`,
);
for (const info of skills) {
  lines.push(`${info.id}: ${info.header ?? '—'}`);
  lines.push(`${info.id} install: ${info.install ?? '—'}`);
  lines.push(`${info.id} left: ${info.left ?? '—'}`);
  lines.push(`${info.id} aside: ${info.aside ?? '—'}`);
}
lines.push(`counts: header summary = /skills/ card on ${skills.filter((info) => info.summaryAgrees).length}/${skills.length}`);

const linkErrors = errors.filter((message) => /ne résout pas|ancre|id absent/.test(message));
lines.push(linkErrors.length === 0 ? 'links: every internal href resolves in dist/' : `links: ${linkErrors.length} broken`);

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
let present = true;
let clean = true;
for (const info of skills) {
  const fragment = fragments.get(info.route);
  if (!fragment) {
    present = false;
    errors.push(`${info.route} : pas de fragment Pagefind`);
    continue;
  }
  indexed += 1;
  const content = squash(fragment.content ?? '');
  const expected = [
    ['le titre', info.title],
    ['le premier point fort', info.highlight],
    ['le premier déclencheur', info.trigger],
    ['le début du corps', info.bodyLead],
  ];
  for (const [what, text] of expected) {
    if (text && !content.includes(text)) {
      present = false;
      errors.push(`${info.route} : le fragment ne contient pas ${what} « ${text} »`);
    }
  }
  if (!info.title || !info.highlight) {
    present = false;
    errors.push(`${info.route} : titre ou premier point fort absent du frontmatter`);
  }
  for (const text of [...FORBIDDEN_IN_INDEX, info.tabRow].filter(Boolean)) {
    if (content.includes(text)) {
      clean = false;
      errors.push(`${info.route} : le fragment contient « ${text} »`);
    }
  }
}
lines.push(
  `search: ${indexed} fragments · ${present ? 'title, highlights, triggers and body indexed' : 'title, highlights, triggers or body missing'} · ${clean ? 'tab row, install window, explorer, versions, infos and prompts card not indexed' : 'tab row, install window, explorer, versions, infos or prompts card indexed'}`,
);

for (const line of lines) console.log(line);
for (const error of errors) console.error(`  ✗ ${error}`);
process.exit(errors.length > 0 ? 1 : 0);
