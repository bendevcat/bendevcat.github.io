#!/usr/bin/env node
/**
 * Contrôle des pages secondaires sur la sortie de build (Plan 10, critères
 * R4 à R7). À lancer après `npm run build` :
 *
 *   node scripts/check-secondary.mjs
 *
 * Imprime sur stdout, dans cet ordre :
 *
 *   whoami <clé>: <valeur>          (×8, /a-propos — T4)
 *   toolbox: <item>[+] | …          (/a-propos — T4)
 *   ai-rule: <emoji label ton> | …  (/a-propos — T4)
 *   ai-banner: <niveau ton> | …     (/transparence-ia — T3)
 *   tags: <s> slugs · <c> chips on <p> pages · <n>/5 tones
 *
 * Les erreurs sont collectées puis imprimées sur stderr APRÈS toutes les
 * lignes de stdout. Code de sortie 1 s'il y en a au moins une.
 *
 * R4 — une puce de tag est, dans tout `dist/**.html` :
 * - un `li` d'un `ul[aria-label="Tags"]` (cartes /prompts et /skills, onglet
 *   Infos des fiches, puce d'en-tête de /tags/<slug>) ;
 * - sur /tags, un lien vers `/tags/<slug>/` ;
 * - un `button[data-facet-key="tag"]` autre que `tous` (filtre de /skills) ;
 * - tout autre élément portant `data-tag`.
 * Chacune doit porter `data-tag` (= slug de son libellé) et `data-tone`
 * (= ton haché du slug, FNV-1a 32 bits mod 5 — même calcul que `tagTone` de
 * src/lib/tags.ts, épinglé par tags.test.ts), les trois utilitaires de ce ton,
 * `rounded-pill`, `border`, `font-mono`, et pas `text-muted`. Un slug ne peut
 * avoir qu'un ton dans tout `dist/`. Chaque /tags/<slug>/ porte exactement
 * une puce, celle de son slug.
 *
 * R7 (T3) — niveaux IA et patrons du contrat (§4) :
 * - toute bannière IA de `dist/` (`[data-ai-usage]`, AiBanner.astro) porte
 *   `data-tone` = le ton de son niveau (D40 : none green, partial amber,
 *   full blue) et les trois utilitaires de ce ton ;
 * - /transparence-ia : exactement 3 bannières, dans l'ordre none, partial,
 *   full, chacune dans son propre `.card-inner`, les trois dans un même
 *   `.card` — d'où la ligne `ai-banner:` ;
 * - /tags : un même `.card` autour de tous les liens `/tags/<slug>/` ;
 * - chaque /tags/<slug>/ (dont /tags/devops/) : ≥ 1 groupe
 *   (`[data-tag-group]`), chaque groupe est un `.card` et chacun de ses liens
 *   un `.card-inner` ;
 * - /404 : un `.card` qui contient des liens `.pill` vers `/`, `/blog` et
 *   `/tags` (barre finale facultative) ;
 * - dans le `<main>` de /a-propos, /transparence-ia, /tags, /tags/<slug>/ et
 *   /404 : aucun élément ne combine `border-line` et `rounded-card` ou
 *   `rounded-inner` (carte dessinée à la main au lieu du patron).
 *
 * Le compte des puces ignore la copie masquée par le serveur de la carte à la
 * une (`[data-entry-id][hidden]` dans la grille de /prompts et /skills) : elle
 * duplique la carte visible (patron de liste, plan 7 / I3). Ces copies sont
 * tout de même vérifiées.
 *
 * Aucune dépendance : même petit tokeniseur que scripts/check-home.mjs, avec
 * un lien enfant → parent pour remonter les ancêtres.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST = 'dist';
const ALL = '__all__'; // src/lib/facetFilters.ts
const TONES = ['green', 'blue', 'violet', 'amber', 'rose']; // src/lib/tones.ts, ordre §2.3

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

/**
 * Tous les éléments, dans l'ordre du document, avec leur texte (balises
 * retirées), leurs enfants directs et leur parent. Un élément ouvert se ferme
 * sur la balise fermante de même nom à sa profondeur.
 */
function collectElements(tokens) {
  const root = { tag: '#root', attrs: {}, text: '', children: [], parent: null };
  const elements = [];
  const stack = [root];
  for (const token of tokens) {
    if (token.type === 'text') {
      for (const el of stack) el.text += token.text;
    } else if (token.type === 'open') {
      const parent = stack[stack.length - 1];
      const el = { tag: token.tag, attrs: token.attrs, text: '', children: [], parent };
      parent.children.push(el);
      elements.push(el);
      if (!VOID.has(token.tag)) stack.push(el);
    } else {
      const at = stack.map((el) => el.tag).lastIndexOf(token.tag);
      if (at > 0) stack.length = at;
    }
  }
  for (const el of [root, ...elements]) el.text = decode(el.text).replace(/\s+/g, ' ').trim();
  return { root, elements };
}

function ancestors(el) {
  const out = [];
  for (let node = el.parent; node && node.tag !== '#root'; node = node.parent) out.push(node);
  return out;
}

function descendants(el) {
  return el.children.flatMap((child) => [child, ...descendants(child)]);
}

const classes = (el) => (el.attrs.class ?? '').split(/\s+/).filter(Boolean);

/** Même règle que `tagSlug` (src/lib/tags.ts). */
function tagSlug(tag) {
  return tag
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Même calcul que `tagTone` (src/lib/tags.ts) : FNV-1a 32 bits du slug, mod 5. */
function hashedTone(slug) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < slug.length; i++) {
    hash ^= slug.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return TONES[hash % TONES.length];
}

const toneUtilities = (tone) => {
  const T = tone[0].toUpperCase() + tone.slice(1);
  return [`bg-tag${T}Bg`, `text-tag${T}Ink`, `border-tag${T}Line`];
};

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
function route(file) {
  const rel = relative(DIST, file).split(sep).join('/');
  return '/' + rel.replace(/index\.html$/, '').replace(/\.html$/, '');
}

const lines = [];
const errors = [];

if (!existsSync(DIST)) {
  console.error(`${DIST}/ introuvable — lancer \`npm run build\` d'abord`);
  process.exit(1);
}

// — T4 : /a-propos (R5, R6) — pas encore construit —
for (const key of ['nom', 'alias', 'rôle', 'lieu', 'terrain', 'écrit', 'stack', 'règle']) {
  errors.push(`whoami ${key} : absent (plan 10 / T4)`);
}
errors.push('toolbox : absent (plan 10 / T4)');
errors.push('ai-rule : absent (plan 10 / T4)');
// — T3 : niveaux IA et patrons des pages secondaires (R7) —
const AI_TONES = { none: 'green', partial: 'amber', full: 'blue' }; // D40, src/lib/aiUsage.ts
const hasClass = (el, name) => classes(el).includes(name);
const closest = (el, name) => ancestors(el).find((a) => hasClass(a, name));

/** Éléments d'une route de `dist/`, ou `null` (erreur notée) si la page manque. */
function loadPage(path) {
  const file = path.endsWith('/') ? join(DIST, path, 'index.html') : join(DIST, `${path}.html`);
  if (!existsSync(file)) {
    errors.push(`${path} : page absente de ${DIST}/`);
    return null;
  }
  return collectElements(tokenize(readFileSync(file, 'utf8')));
}

// Toute bannière IA du site porte le ton de son niveau.
for (const file of htmlFiles(DIST)) {
  const { elements } = collectElements(tokenize(readFileSync(file, 'utf8')));
  for (const banner of elements.filter((el) => 'data-ai-usage' in el.attrs)) {
    const where = `${route(file)} bannière IA « ${banner.attrs['data-ai-usage']} »`;
    const expected = AI_TONES[banner.attrs['data-ai-usage']];
    if (!expected) {
      errors.push(`${where} : niveau inconnu`);
      continue;
    }
    if (banner.attrs['data-tone'] !== expected) {
      errors.push(`${where} : data-tone="${banner.attrs['data-tone'] ?? ''}" (attendu : ${expected})`);
    }
    const missing = toneUtilities(expected).filter((c) => !hasClass(banner, c));
    if (missing.length > 0) errors.push(`${where} : classe sans ${missing.join(', ')}`);
  }
}

// /transparence-ia : un `.card` qui tient les 3 niveaux, chacun un `.card-inner` avec sa bannière.
const transparence = loadPage('/transparence-ia/');
if (transparence) {
  const banners = transparence.elements.filter((el) => 'data-ai-usage' in el.attrs);
  lines.push(`ai-banner: ${banners.map((b) => `${b.attrs['data-ai-usage']} ${b.attrs['data-tone'] ?? '?'}`).join(' | ')}`);
  const order = banners.map((b) => b.attrs['data-ai-usage']).join(',');
  if (order !== 'none,partial,full') errors.push(`/transparence-ia/ : bannières ${order || 'absentes'} (attendu : none,partial,full)`);
  const levels = new Set(banners.map((b) => closest(b, 'card-inner')));
  const cards = new Set([...levels].map((level) => level && closest(level, 'card')));
  if (levels.has(undefined) || levels.size !== 3) {
    errors.push('/transparence-ia/ : chaque niveau doit être son propre .card-inner (3 attendus)');
  } else if (cards.has(undefined) || cards.size !== 1) {
    errors.push('/transparence-ia/ : les 3 niveaux .card-inner ne sont pas dans un même .card');
  }
} else {
  errors.push('ai-banner : absent');
}

// /tags : un même `.card` autour de toutes les puces.
const tagsIndex = loadPage('/tags/');
if (tagsIndex) {
  const links = tagsIndex.elements.filter((el) => el.tag === 'a' && /^\/tags\/[^/]+\/$/.test(el.attrs.href ?? ''));
  const cards = new Set(links.map((link) => closest(link, 'card')));
  if (links.length === 0) errors.push('/tags/ : aucune puce de tag');
  else if (cards.has(undefined) || cards.size !== 1) errors.push('/tags/ : les puces ne sont pas dans un même .card');
}

// /tags/<slug>/ : chaque groupe de collection est un `.card`, chaque lien d'entrée un `.card-inner`.
const tagRoutes = existsSync(join(DIST, 'tags'))
  ? readdirSync(join(DIST, 'tags'))
      .filter((name) => existsSync(join(DIST, 'tags', name, 'index.html')))
      .sort()
      .map((name) => `/tags/${name}/`)
  : [];
if (!tagRoutes.includes('/tags/devops/')) errors.push('/tags/devops/ : page absente');
for (const path of tagRoutes) {
  const tagPage = loadPage(path);
  if (!tagPage) continue;
  const groups = tagPage.elements.filter((el) => 'data-tag-group' in el.attrs);
  if (groups.length === 0) errors.push(`${path} : aucun groupe [data-tag-group]`);
  for (const group of groups) {
    const where = `${path} groupe « ${group.attrs['data-tag-group']} »`;
    if (!hasClass(group, 'card')) errors.push(`${where} : pas un .card`);
    const links = descendants(group).filter((el) => el.tag === 'a');
    if (links.length === 0) errors.push(`${where} : aucun lien d'entrée`);
    for (const link of links) {
      if (!hasClass(link, 'card-inner')) errors.push(`${where} : lien ${link.attrs.href ?? '?'} pas un .card-inner`);
    }
  }
}

// /404 : un `.card` avec des liens `.pill` vers /, /blog et /tags.
const notFound = loadPage('/404');
if (notFound) {
  const normalise = (href) => (href.length > 1 ? href.replace(/\/$/, '') : href);
  const ok = notFound.elements
    .filter((el) => hasClass(el, 'card'))
    .some((card) => {
      const hrefs = new Set(
        descendants(card)
          .filter((el) => el.tag === 'a' && hasClass(el, 'pill'))
          .map((el) => normalise(el.attrs.href ?? '')),
      );
      return ['/', '/blog', '/tags'].every((href) => hrefs.has(href));
    });
  if (!ok) errors.push('/404 : aucun .card avec des liens .pill vers /, /blog et /tags');
}

// Aucune carte dessinée à la main dans le <main> des pages secondaires.
for (const path of ['/a-propos/', '/transparence-ia/', '/tags/', ...tagRoutes, '/404']) {
  const secondary = loadPage(path);
  if (!secondary) continue;
  for (const main of secondary.elements.filter((el) => el.tag === 'main')) {
    for (const el of descendants(main)) {
      const cls = classes(el);
      if (cls.includes('border-line') && (cls.includes('rounded-card') || cls.includes('rounded-inner'))) {
        errors.push(`${path} <${el.tag}> « ${el.text.slice(0, 40)} » : border-line + ${cls.includes('rounded-card') ? 'rounded-card' : 'rounded-inner'} (carte dessinée à la main)`);
      }
    }
  }
}

// — R4 : puces de tag —
const toneOfSlug = new Map(); // slug → Map(ton → première route)
const chipPages = new Set();
let chipCount = 0;

for (const file of htmlFiles(DIST)) {
  const path = route(file);
  const { elements } = collectElements(tokenize(readFileSync(file, 'utf8')));
  const chips = new Set();

  for (const el of elements) {
    if (el.tag === 'li' && el.parent?.tag === 'ul' && el.parent.attrs['aria-label'] === 'Tags') chips.add(el);
    if (path === '/tags/' && el.tag === 'a' && /^\/tags\/[^/]+\/$/.test(el.attrs.href ?? '')) chips.add(el);
    if (
      el.tag === 'button' &&
      el.attrs['data-facet-key'] === 'tag' &&
      (el.attrs['data-facet-value'] ?? ALL) !== ALL
    ) {
      chips.add(el);
    }
    if ('data-tag' in el.attrs) chips.add(el);
  }

  const tagPage = path.match(/^\/tags\/([^/]+)\/$/);
  if (tagPage) {
    const own = [...chips];
    if (own.length !== 1) errors.push(`${path} : ${own.length} puce(s) de tag (attendu : 1, en en-tête)`);
    else if (own[0].attrs['data-tag'] !== tagPage[1]) {
      errors.push(`${path} : la puce d'en-tête porte data-tag="${own[0].attrs['data-tag'] ?? ''}"`);
    }
  }

  for (const chip of chips) {
    const where = `${path} <${chip.tag}> « ${chip.text} »`;
    const duplicate = ancestors(chip).some((a) => 'data-entry-id' in a.attrs && 'hidden' in a.attrs);
    if (!duplicate) {
      chipCount += 1;
      chipPages.add(path);
    }
    const slug = chip.attrs['data-tag'];
    const tone = chip.attrs['data-tone'];
    if (!slug) errors.push(`${where} : pas de data-tag`);
    if (!tone) errors.push(`${where} : pas de data-tone`);
    if (!slug || !tone) continue;

    // Le slug doit être celui du libellé (lien de /tags : celui de son href).
    const expectedSlug =
      chip.tag === 'a' && path === '/tags/'
        ? (chip.attrs.href ?? '').split('/')[2]
        : chip.tag === 'button'
          ? tagSlug(chip.attrs['data-facet-value'] ?? '')
          : tagSlug(chip.text);
    if (slug !== expectedSlug) errors.push(`${where} : data-tag="${slug}" (attendu « ${expectedSlug} »)`);

    if (!TONES.includes(tone)) errors.push(`${where} : data-tone="${tone}" hors des 5 tons`);
    else if (tone !== hashedTone(slug)) errors.push(`${where} : data-tone="${tone}" (hash du slug : ${hashedTone(slug)})`);

    const cls = classes(chip);
    const missing = [...(TONES.includes(tone) ? toneUtilities(tone) : []), 'rounded-pill', 'border', 'font-mono'].filter(
      (c) => !cls.includes(c),
    );
    if (missing.length > 0) errors.push(`${where} : classe sans ${missing.join(', ')}`);
    if (cls.includes('text-muted')) errors.push(`${where} : garde text-muted`);

    const tones = toneOfSlug.get(slug) ?? new Map();
    if (!tones.has(tone)) tones.set(tone, path);
    toneOfSlug.set(slug, tones);
  }
}

for (const [slug, tones] of toneOfSlug) {
  if (tones.size > 1) {
    errors.push(`tag ${slug} : ${tones.size} tons (${[...tones].map(([t, p]) => `${t} sur ${p}`).join(', ')})`);
  }
}
const usedTones = new Set([...toneOfSlug.values()].flatMap((tones) => [...tones.keys()]));
lines.push(
  `tags: ${toneOfSlug.size} slugs · ${chipCount} chips on ${chipPages.size} pages · ${usedTones.size}/5 tones`,
);
if (usedTones.size < 3) errors.push(`tags : ${usedTones.size} ton(s) utilisé(s) (attendu : ≥ 3)`);

for (const line of lines) console.log(line);
for (const error of errors) console.error(`  ✗ ${error}`);
process.exit(errors.length > 0 ? 1 : 0);
