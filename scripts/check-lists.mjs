#!/usr/bin/env node
/**
 * Contrôle des listes /projets, /prompts et /skills sur la sortie de build
 * (plan 14, critère R5 ; inventaire §3, §5, §7 ; D92–D96). À lancer après
 * `npm run build` :
 *
 *   node scripts/check-lists.mjs
 *
 * Imprime sur stdout, dans cet ordre :
 *
 *   headers: <fil> · <h1> | …                          (les trois listes)
 *   projets segments: <facette> · <segment> · …
 *   projets dropdown: <facette> · <option> <compte> · …
 *   projets hero: <id> · <statut> · <méta> · <n> stack · <bouton> <href> · …
 *   projets grid: <id> (hidden) | <id> · <statut> · <n> stack | …
 *   prompts segments: …          prompts dropdown: …
 *   prompts cards: <id> <champ> · <champ> · … | …
 *   skills segments: …           skills dropdown: …
 *   skills cards: <id> <champ> · … | …
 *   empty: <liste> « <phrase ou gabarit> » <bouton> | …
 *   bare: /prompts/ /skills/ · <n> img · <n> derived · <n> tag chip · <n> featured
 *
 * Les erreurs sont collectées puis imprimées sur stderr APRÈS toutes les
 * lignes de stdout. Code de sortie 1 s'il y en a au moins une.
 *
 * Contrat de balisage lu (hooks) :
 * - en-tête : `[data-list-header]` (ListHeader.astro) — son `<p>` et son `<h1>` ;
 * - contrôle segmenté : `[data-segmented]` ; chaque `<button>` porte
 *   `aria-pressed` et un badge `[data-segment-count]` numérique ; la facette
 *   est le `data-facet-label` du premier segment ;
 * - menu de facette : `[data-dropdown][data-facet-key]` ; options
 *   `[role="option"]` (`data-label`, compte = texte numérique de leur dernier
 *   `<span>`) ;
 * - héros /projets : `[data-list-featured] [data-entry-id]`, `[data-hero-status]`,
 *   `[data-hero-meta]`, `[data-hero-stack]`, `[data-hero-link]` ;
 * - carte /projets : `[data-card-status]`, `[data-card-stack]` ;
 * - cartes /prompts et /skills : les `[data-card-field]` de la carte, dans
 *   l'ordre du document ; `data-card-field="install"` s'imprime `install` et
 *   son texte doit être l'`installCmd` du frontmatter de la skill
 *   (`src/content/skills/<id>/index.md`) ;
 * - état vide : `[data-list-empty]`, `[data-list-empty-text]`,
 *   `[data-list-reset]` ; gabarit `data-list-empty-template` sur `[data-list]`.
 *
 * Code 1 si, dans le `[data-list]` d'une liste : un `<select>` existe ; une
 * entrée `[data-entry-id]` n'est pas un `.card` ou son plus proche ancêtre
 * peint n'est pas le fond de page ; le `href` du titre (`h2 a`) d'une carte
 * ne se résout pas dans `dist/` ; un segment n'a pas `aria-pressed` ou son
 * badge ; `[data-list-filters]`, `[data-dropdown]` ou `[data-list-empty]`
 * n'est pas `hidden` côté serveur ; /projets/ n'a pas exactement un
 * `[data-list-featured]`, ou un bouton du héros n'a pas `target="_blank"` et
 * un `rel` contenant `noopener` ; /prompts/ ou /skills/ contient un `img`, un
 * `[data-thumb-derived]`, un `data-tag`, un `ul[aria-label="Tags"]` ou un
 * `[data-list-featured]` ; la commande d'une carte diffère de l'`installCmd`
 * de l'entrée. Une ligne dont le balisage manque (liste pas encore migrée)
 * s'imprime `(absent)` et compte comme une erreur.
 *
 * Aucune dépendance : même petit tokeniseur que scripts/check-finition.mjs.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const GLOBAL_CSS = join('src', 'styles', 'global.css');
const SKILLS_SRC = join('src', 'content', 'skills');
const LISTS = ['projets', 'prompts', 'skills'];
const BARE_LISTS = ['prompts', 'skills'];

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

/** Tous les éléments, dans l'ordre du document, avec enfants directs, parent et texte. */
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
      if (at > 0) stack.length = at;
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
const squash = (text) => text.replace(/\s+/g, ' ').trim();
const find = (scope, pred) => scope.find(pred);
const all = (scope, pred) => scope.filter(pred);

// — Niveaux de surface (même règle que check-finition.mjs) —
const TOKENS = new Set(
  [...readFileSync(GLOBAL_CSS, 'utf8').matchAll(/--color-([A-Za-z0-9]+)\s*:/g)].map((m) => m[1]),
);
const PATTERN_LEVEL = { card: 'surface', panel: 'panel', 'card-inner': 'card', pill: 'accentSoft' };

function paints(el) {
  let level = null;
  for (const cls of classes(el)) {
    if (cls in PATTERN_LEVEL) level = PATTERN_LEVEL[cls];
    const m = cls.match(/^bg-([A-Za-z0-9]+)(?:\/\d+)?$/);
    if (m && TOKENS.has(m[1])) level = m[1];
  }
  return level;
}

function paintedParent(el) {
  for (const node of ancestors(el)) {
    const level = paints(node);
    if (level) return { el: node, level };
  }
  return { el: null, level: 'bg' };
}

/** `/projets/gha-svu/` → vrai si `dist/projets/gha-svu/index.html` existe. */
function resolves(href) {
  if (!href || !href.startsWith('/') || href.startsWith('//')) return false;
  const path = href.split(/[?#]/)[0];
  const file = path.endsWith('/') ? join(DIST, path, 'index.html') : join(DIST, path);
  return existsSync(file) || existsSync(`${join(DIST, path)}.html`);
}

/** `installCmd` du frontmatter d'une skill, tel qu'écrit (guillemets doubles JSON ou simples retirés). */
function installCmdOf(id) {
  const file = join(SKILLS_SRC, id, 'index.md');
  if (!existsSync(file)) return null;
  const front = readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  const raw = front.match(/^installCmd:\s*(.*)$/m)?.[1]?.trim();
  if (raw === undefined) return null;
  if (raw.startsWith('"')) return JSON.parse(raw);
  if (raw.startsWith("'")) return raw.slice(1, -1).replace(/''/g, "'");
  return raw;
}

const lines = [];
const errors = [];

if (!existsSync(DIST)) {
  console.error(`${DIST}/ introuvable — lancer \`npm run build\` d'abord`);
  process.exit(1);
}

/** Page d'une liste : `{ elements, scope }` (scope = descendants de `[data-list]`), ou null. */
function loadList(list) {
  const file = join(DIST, list, 'index.html');
  if (!existsSync(file)) {
    errors.push(`${file} introuvable`);
    return null;
  }
  const { elements } = collectElements(tokenize(readFileSync(file, 'utf8')));
  const roots = elements.filter((el) => has(el, 'data-list'));
  if (roots.length !== 1) {
    errors.push(`/${list}/ : ${roots.length} [data-list] (attendu : 1)`);
    return { elements, root: null, scope: [] };
  }
  return { elements, root: roots[0], scope: descendants(roots[0]) };
}

const pages = Object.fromEntries(LISTS.map((list) => [list, loadList(list)]));

// — En-têtes —
{
  const parts = [];
  for (const list of LISTS) {
    const page = pages[list];
    if (!page) {
      parts.push('(absent)');
      continue;
    }
    const header = find(page.elements, (el) => has(el, 'data-list-header'));
    const scope = header ? descendants(header) : page.elements;
    const crumb = find(scope, (el) => el.tag === 'p' && squash(el.text).startsWith('~/'));
    const h1 = find(scope, (el) => el.tag === 'h1');
    if (!header) errors.push(`/${list}/ : pas de [data-list-header] (ListHeader.astro)`);
    parts.push(crumb && h1 ? `${squash(crumb.text)} · ${squash(h1.text)}` : '(absent)');
    if (!crumb || !h1) errors.push(`/${list}/ : fil d'Ariane ou h1 introuvable`);
  }
  lines.push(`headers: ${parts.join(' | ')}`);
}

/** Ligne `segments` d'une liste ; erreurs sur `aria-pressed` et badges. */
function segmentsLine(list, page) {
  const track = page && find(page.scope, (el) => has(el, 'data-segmented'));
  if (!track) {
    errors.push(`/${list}/ : pas de [data-segmented]`);
    return `${list} segments: (absent)`;
  }
  if (track.attrs.role !== 'group') errors.push(`/${list}/ : [data-segmented] role="${track.attrs.role ?? ''}" (attendu : group)`);
  const buttons = all(descendants(track), (el) => el.tag === 'button');
  if (buttons.length === 0) errors.push(`/${list}/ : [data-segmented] sans segment`);
  const parts = [];
  for (const button of buttons) {
    const text = squash(button.text);
    if (!has(button, 'aria-pressed')) errors.push(`/${list}/ : segment « ${text} » sans aria-pressed`);
    const badge = find(descendants(button), (el) => has(el, 'data-segment-count'));
    if (!badge || !/^\d+$/.test(squash(badge.text))) errors.push(`/${list}/ : segment « ${text} » sans badge de compte`);
    parts.push(text);
  }
  const facet = buttons[0]?.attrs['data-facet-label'] ?? '?';
  return `${list} segments: ${[facet, ...parts].join(' · ')}`;
}

/** Ligne `dropdown` d'une liste (menu de facette). */
function dropdownLine(list, page) {
  const menus = page ? all(page.scope, (el) => has(el, 'data-dropdown') && has(el, 'data-facet-key')) : [];
  if (menus.length !== 1) {
    errors.push(`/${list}/ : ${menus.length} menu(s) de facette [data-dropdown][data-facet-key] (attendu : 1)`);
    if (menus.length === 0) return `${list} dropdown: (absent)`;
  }
  const menu = menus[0];
  const options = all(descendants(menu), (el) => el.attrs.role === 'option');
  const parts = options.map((option) => {
    const spans = option.children.filter((child) => child.tag === 'span');
    const count = squash(spans[spans.length - 1]?.text ?? '');
    if (!/^\d+$/.test(count)) errors.push(`/${list}/ : option « ${option.attrs['data-label'] ?? ''} » sans compte`);
    if (has(option, 'data-tag')) errors.push(`/${list}/ : option « ${option.attrs['data-label'] ?? ''} » porte data-tag`);
    return `${option.attrs['data-label'] ?? '?'} ${count}`;
  });
  return `${list} dropdown: ${[menu.attrs['data-facet-label'] ?? '?', ...parts].join(' · ')}`;
}

/** Contrôles communs à chaque liste : `<select>`, `hidden` serveur, entrées sur le fond, titres. */
function commonChecks(list, page) {
  if (!page?.root) return;
  const { scope } = page;
  if (scope.some((el) => el.tag === 'select')) errors.push(`/${list}/ : <select> dans [data-list]`);
  for (const attr of ['data-list-filters', 'data-dropdown', 'data-list-empty']) {
    const found = all(scope, (el) => has(el, attr));
    if (found.length === 0) errors.push(`/${list}/ : aucun [${attr}]`);
    for (const el of found) if (!has(el, 'hidden')) errors.push(`/${list}/ : [${attr}] n'est pas hidden côté serveur`);
  }
  const entries = all(scope, (el) => has(el, 'data-entry-id'));
  if (entries.length === 0) errors.push(`/${list}/ : aucune entrée [data-entry-id]`);
  for (const entry of entries) {
    const id = entry.attrs['data-entry-id'];
    if (!classes(entry).includes('card')) errors.push(`/${list}/ : l'entrée ${id} n'est pas un .card`);
    const host = paintedParent(entry);
    if (host.level !== 'bg') errors.push(`/${list}/ : l'entrée ${id} repose sur ${host.level} (attendu : bg)`);
    const title = find(descendants(entry), (el) => el.tag === 'a' && el.parent?.tag === 'h2');
    if (!title) errors.push(`/${list}/ : l'entrée ${id} n'a pas de lien de titre (h2 a)`);
    else if (!resolves(title.attrs.href)) errors.push(`/${list}/ : l'entrée ${id} — titre ${title.attrs.href ?? ''} ne se résout pas dans dist/`);
  }
}

// — /projets —
{
  const list = 'projets';
  const page = pages[list];
  commonChecks(list, page);
  lines.push(segmentsLine(list, page));
  lines.push(dropdownLine(list, page));

  const boxes = page ? all(page.scope, (el) => has(el, 'data-list-featured')) : [];
  if (boxes.length !== 1) errors.push(`/projets/ : ${boxes.length} [data-list-featured] (attendu : 1)`);
  const hero = boxes[0] && find(descendants(boxes[0]), (el) => has(el, 'data-entry-id'));
  if (!hero) {
    errors.push('/projets/ : pas de héros [data-list-featured] [data-entry-id]');
    lines.push('projets hero: (absent)');
  } else {
    const inHero = descendants(hero);
    const text = (attr) => squash(find(inHero, (el) => has(el, attr))?.text ?? '');
    const stack = all(inHero, (el) => has(el, 'data-hero-stack')).length;
    const title = find(inHero, (el) => el.tag === 'a' && el.parent?.tag === 'h2');
    const buttons = all(inHero, (el) => el.tag === 'a' && el !== title);
    for (const button of buttons) {
      const label = squash(button.text);
      if (!has(button, 'data-hero-link')) errors.push(`/projets/ : lien du héros « ${label} » sans data-hero-link`);
      if (button.attrs.target !== '_blank') errors.push(`/projets/ : bouton « ${label} » target="${button.attrs.target ?? ''}" (attendu : _blank)`);
      if (!(button.attrs.rel ?? '').split(/\s+/).includes('noopener')) errors.push(`/projets/ : bouton « ${label} » rel sans noopener`);
    }
    const parts = [
      hero.attrs['data-entry-id'],
      text('data-hero-status'),
      text('data-hero-meta'),
      `${stack} stack`,
      ...buttons.map((button) => `${squash(button.text)} ${button.attrs.href ?? ''}`),
    ];
    lines.push(`projets hero: ${parts.join(' · ')}`);
  }

  const grid = page && find(page.scope, (el) => has(el, 'data-list-grid'));
  if (!grid) {
    errors.push('/projets/ : pas de [data-list-grid]');
    lines.push('projets grid: (absent)');
  } else {
    const cards = grid.children.filter((el) => has(el, 'data-entry-id'));
    const parts = cards.map((card) => {
      const id = card.attrs['data-entry-id'];
      if (has(card, 'hidden')) return `${id} (hidden)`;
      const inCard = descendants(card);
      const status = squash(find(inCard, (el) => has(el, 'data-card-status'))?.text ?? '?');
      const stack = all(inCard, (el) => has(el, 'data-card-stack')).length;
      return `${id} · ${status} · ${stack} stack`;
    });
    lines.push(`projets grid: ${parts.join(' | ')}`);
  }
}

// — /prompts et /skills —
for (const list of BARE_LISTS) {
  const page = pages[list];
  commonChecks(list, page);
  lines.push(segmentsLine(list, page));
  lines.push(dropdownLine(list, page));

  const grid = page && find(page.scope, (el) => has(el, 'data-list-grid'));
  const cards = grid ? grid.children.filter((el) => has(el, 'data-entry-id')) : [];
  const parts = [];
  for (const card of cards) {
    const id = card.attrs['data-entry-id'];
    const fields = all(descendants(card), (el) => has(el, 'data-card-field'));
    const shown = fields.map((field) => {
      if (field.attrs['data-card-field'] !== 'install') return squash(field.text);
      const expected = list === 'skills' ? installCmdOf(id) : null;
      const actual = field.text.trim();
      if (expected !== actual) errors.push(`/${list}/ : ${id} install « ${actual} » ≠ installCmd « ${expected ?? ''} »`);
      return 'install';
    });
    if (list === 'skills' && !fields.some((f) => f.attrs['data-card-field'] === 'install') && installCmdOf(id)) {
      errors.push(`/${list}/ : ${id} — installCmd déclaré mais pas de [data-card-field="install"]`);
    }
    if (fields.length === 0) errors.push(`/${list}/ : ${id} sans [data-card-field]`);
    parts.push(fields.length ? `${id} ${shown.join(' · ')}` : `${id} (absent)`);
  }
  if (cards.length === 0) errors.push(`/${list}/ : aucune carte dans [data-list-grid]`);
  lines.push(`${list} cards: ${parts.join(' | ') || '(absent)'}`);
}

// — États vides —
{
  const parts = [];
  for (const list of LISTS) {
    const page = pages[list];
    const box = page && find(page.scope, (el) => has(el, 'data-list-empty'));
    if (!box) {
      parts.push(`${list} (absent)`);
      continue;
    }
    const inBox = descendants(box);
    const sentence = page.root.attrs['data-list-empty-template'] ?? squash(find(inBox, (el) => has(el, 'data-list-empty-text'))?.text ?? '');
    const reset = find(inBox, (el) => has(el, 'data-list-reset'));
    if (!sentence) errors.push(`/${list}/ : état vide sans phrase`);
    if (!reset) errors.push(`/${list}/ : état vide sans [data-list-reset]`);
    parts.push(`${list} « ${sentence} » ${squash(reset?.text ?? '(absent)')}`);
  }
  lines.push(`empty: ${parts.join(' | ')}`);
}

// — Listes nues (/prompts, /skills) —
{
  let img = 0;
  let derived = 0;
  let tagChips = 0;
  let featured = 0;
  for (const list of BARE_LISTS) {
    const scope = pages[list]?.scope ?? [];
    const n = {
      img: all(scope, (el) => el.tag === 'img').length,
      derived: all(scope, (el) => has(el, 'data-thumb-derived')).length,
      tag: all(scope, (el) => has(el, 'data-tag') || (el.tag === 'ul' && el.attrs['aria-label'] === 'Tags')).length,
      featured: all(scope, (el) => has(el, 'data-list-featured')).length,
    };
    img += n.img;
    derived += n.derived;
    tagChips += n.tag;
    featured += n.featured;
    if (n.img) errors.push(`/${list}/ : ${n.img} img (attendu : 0)`);
    if (n.derived) errors.push(`/${list}/ : ${n.derived} [data-thumb-derived] (attendu : 0)`);
    if (n.tag) errors.push(`/${list}/ : ${n.tag} data-tag / ul[aria-label="Tags"] (attendu : 0)`);
    if (n.featured) errors.push(`/${list}/ : ${n.featured} [data-list-featured] (attendu : 0)`);
  }
  lines.push(
    `bare: ${BARE_LISTS.map((list) => `/${list}/`).join(' ')} · ${img} img · ${derived} derived · ${tagChips} tag chip · ${featured} featured`,
  );
}

for (const line of lines) console.log(line);
for (const error of errors) console.error(`  ✗ ${error}`);
process.exit(errors.length > 0 ? 1 : 0);
