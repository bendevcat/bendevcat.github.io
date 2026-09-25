#!/usr/bin/env node
/**
 * Contrôle des blocs `:::` sur la sortie de build (plan 23, T3, critères
 * R12, R15, R17 ; décisions D152, D153). À lancer après `npm run build` :
 *
 *   node scripts/check-blocks.mjs [--dist <dist>] [--content <src/content>] [--base <dist de base>]
 *
 * `--dist` : la sortie contrôlée (défaut `dist/` du dépôt). `--content` : le
 * dossier `src/content/` dont `--dist` est issu (défaut `<dist>/../src/content`
 * — la construction jetable de la fixture, lancée depuis ce dépôt avec
 * `--dist <scratch>/dist`, est ainsi comparée à SES sources). `--base` : le
 * `dist/` d'un build de référence d'avant les blocs (plan 23 : `ead7b81`).
 *
 * Attendu : les blocs écrits dans les SOURCES. Chaque corps
 * `<content>/<collection>/<id>/index.md` publié (pas `draft: true`) est lu
 * comme l'import de Sveltia lit ses composants : à chaque ligne hors bloc de
 * code clôturé, les motifs de `src/lib/blocks/syntax.mjs` (`BLOCKS`) sont
 * essayés sur le reste du document et retenus s'ils commencent à cette ligne.
 * La page de l'entrée (`ENTRY_BASE_PATHS`) doit porter ces blocs, dans cet
 * ordre ; toute autre page n'en porte aucun.
 *
 * Observé : dans chaque page HTML hors `admin/`, les éléments
 * `aside[data-callout]`, `figure[data-terminal]`, `a[data-entry-card]`,
 * `[data-entry-card-missing]` (carte d'erreur de l'aperçu, jamais sur le
 * site) et `figure[data-video]`, dans l'ordre du document. Script de façade
 * vidéo = balise `<script>` (inline — Astro l'intègre à la page — ou fichier
 * de `dist/_astro/`) dont le texte contient `youtube-nocookie.com/embed` et
 * `figure[data-video]` ; script « Copier » des terminaux = celui qui contient
 * `[data-code-window][data-terminal]`.
 *
 * Imprime sur stdout, dans cet ordre :
 *
 *   Sans page à blocs (contenu réel, R15) :
 *     blocks: 0 on <n> pages · video script on 0 pages · terminal script on 0 blog pages
 *   Sinon (fixture, R12), pour chaque page à blocs :
 *     blocks: <url> · <c> callouts (<genres>) · <t> terminal · <k> card → <hrefs> · <v> video facades (<fournisseurs>)
 *     facade: <i> iframe · <m> img · third-party URLs = the <v> facade links · video script loaded|absent
 *       <i> = balises `<iframe` de toute la page ; <m> = `<img` dans les
 *       façades ; URLs tierces = toute URL absolue d'un attribut de balise
 *       (hors texte de script) vers un hôte vidéo (youtube*, youtu.be, ytimg,
 *       googlevideo, asciinema) — égales, en multiensemble, aux liens des
 *       façades ; dans une façade, aucune autre URL que son lien.
 *     pagefind: callout text indexed · card and video text absent
 *       fragment Pagefind de la page : chaque mot des encadrés y figure ;
 *       ni le titre ni la description d'une carte, ni le titre ni la
 *       mention « Lecture sur … au clic » d'une vidéo n'y figurent.
 *   puis :
 *     scripts: video script on <v> pages (<urls>) · terminal script on <t> blog pages (<urls>)
 *   Avec `--base` (R17) :
 *     site pages: <n> identical to base
 *       chaque page HTML de la base hors `admin/` existe dans la sortie et
 *       lui est identique octet pour octet ; seule normalisation, des deux
 *       côtés, le hachage du nom de la feuille de style
 *       (`/_astro/<nom>.<hachage>.css` → `/_astro/<nom>.css`), comme
 *       check-edit-link ; aucune page hors `admin/` n'apparaît en plus.
 *     pagefind: index and fragments identical to base
 *
 * Contrôles de structure (chaque écart est une note, et toute note fait
 * échouer) : encadré `role="note"`, `aria-label` et libellé du genre, non
 * exclu de Pagefind ; terminal : titre de la source, « Copier » `hidden` et
 * exclu, gouttière exclue, pas de coloration Shiki ; carte : `href` =
 * chemin de la ref, `data-pagefind-ignore`, genre, titre et description de
 * l'entrée visée (lue dans `<content>`) ; vidéo : `data-pagefind-ignore`,
 * fournisseur et id de la source, UN lien vers la page du fournisseur,
 * titre de la source, mention « Lecture sur <fournisseur> au clic ».
 *
 * Écarts sur stderr APRÈS stdout ; code de sortie 1 s'il y en a au moins un.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { parseFrontmatter } from '@astrojs/markdown-remark';
import { readSiteEntries } from '../src/lib/blocks/readSiteEntries.mjs';
import { entryHref } from '../src/lib/blocks/siteEntries.mjs';
import {
  BLOCKS,
  CALLOUT_KINDS,
  CALLOUT_LABELS,
  ENTRY_BASE_PATHS,
  ENTRY_KIND_LABELS,
  VIDEO_PROVIDER_LABELS,
} from '../src/lib/blocks/syntax.mjs';

const ROOT = new URL('..', import.meta.url).pathname;

function option(name) {
  const at = process.argv.indexOf(name);
  return at > 0 ? process.argv[at + 1] : undefined;
}

const DIST = resolve(option('--dist') ?? join(ROOT, 'dist'));
const CONTENT = resolve(option('--content') ?? join(DIST, '..', 'src', 'content'));
const BASE = option('--base') && resolve(option('--base'));
for (const [label, dir] of [
  ['dist', DIST],
  ['content', CONTENT],
  ...(BASE ? [['base', BASE]] : []),
]) {
  if (!existsSync(dir)) {
    console.error(`check-blocks: ${label} absent (${dir}) — lancer \`npm run build\` d’abord (ou passer --${label}).`);
    process.exit(1);
  }
}
const ASTRO = join(DIST, '_astro');

const VIDEO_PAGE = {
  youtube: (id) => `https://www.youtube.com/watch?v=${id}`,
  asciinema: (id) => `https://asciinema.org/a/${id}`,
};
/** Hôtes des fournisseurs vidéo (et de leurs vignettes / flux). */
const VIDEO_HOST = /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be|ytimg\.com|googlevideo\.com|asciinema\.org)$/i;

const lines = [];
const notes = [];

/* -------------------------------------------------------------------------- */
/* Outils HTML                                                                */
/* -------------------------------------------------------------------------- */

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

/** `blog/x/index.html` → `/blog/x/`. */
const pageUrl = (page) => `/${page.replace(/(^|\/)index\.html$/, '$1')}`;

/**
 * Corps d'une balise, guillemets respectés : les classes Tailwind portent des
 * `>` non échappés (`[&>:last-child]:mb-0!`), `[^>]*` s'y arrêterait.
 */
const TAG_BODY = String.raw`(?:"[^"]*"|'[^']*'|[^'">])*`;
const OPEN_TAG = new RegExp(`<([a-zA-Z][\\w-]*)${TAG_BODY}>`, 'g');
/** Balise ouvrante en tête de `html`. */
const headTag = (html) => new RegExp(`^<[a-zA-Z][\\w-]*${TAG_BODY}>`).exec(html)?.[0] ?? '';

const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const hasAttr = (tag, name) => new RegExp(`\\s${name}(?=[\\s>=/])`).test(tag);

/** Entités HTML courantes → caractères. */
const decode = (value) =>
  value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');

/** Texte d'un fragment HTML : balises retirées, entités décodées, blancs réduits. */
const textOf = (html) =>
  decode(html.replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/g, ' ').replace(new RegExp(`</?[a-zA-Z!]${TAG_BODY}>`, 'g'), ' '))
    .replace(/\s+/g, ' ')
    .trim();

/** Intervalle [début, fin) de l'élément ouvert à `start` (balises de même nom comptées). */
function elementRange(html, start) {
  const name = html.slice(start).match(/^<([a-zA-Z][\w-]*)/)?.[1];
  if (!name) return undefined;
  const re = new RegExp(`<(/?)${name}\\b${TAG_BODY}>`, 'g');
  re.lastIndex = start;
  let depth = 0;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return [start, m.index + m[0].length];
  }
  return undefined;
}

/** Premier élément de `html` dont la balise ouvrante porte l'attribut `name` (HTML complet ou `undefined`). */
function elementWith(html, name) {
  const m = [...html.matchAll(OPEN_TAG)].find((tag) => hasAttr(tag[0], name));
  if (!m) return undefined;
  const range = elementRange(html, m.index);
  return range ? html.slice(...range) : undefined;
}

/** Blocs rendus d'une page, dans l'ordre du document. */
const BLOCK_KINDS = ['callout', 'terminal', 'entry-card', 'entry-card-missing', 'video'];
function renderedBlocks(html) {
  const out = [];
  for (const m of html.matchAll(OPEN_TAG)) {
    const kind = BLOCK_KINDS.find((name) => hasAttr(m[0], `data-${name}`));
    if (!kind) continue;
    const range = elementRange(html, m.index);
    out.push({ kind, tagName: m[1].toLowerCase(), tag: m[0], element: range ? html.slice(...range) : m[0] });
  }
  return out;
}

/** URLs absolues (`https://…`, `//…`) des attributs de balises (texte des scripts exclu). */
function attributeUrls(html) {
  const out = [];
  const withoutScripts = html.replace(/(<script\b[^>]*>)[\s\S]*?(<\/script\s*>)/g, '$1$2');
  for (const tag of withoutScripts.matchAll(OPEN_TAG)) {
    for (const value of tag[0].matchAll(/\s[\w:-]+=(?:"([^"]*)"|'([^']*)')/g)) {
      for (const url of decode(value[1] ?? value[2] ?? '').matchAll(/(?:https?:)?\/\/[^\s"'<>),]+/gi)) {
        out.push(url[0]);
      }
    }
  }
  return out;
}

const hostOf = (url) => {
  try {
    return new URL(url.startsWith('//') ? `https:${url}` : url).hostname;
  } catch {
    return '';
  }
};

/** Textes des `<script>` d'une page (inline, ou fichier `/_astro/` lu). */
function scriptTexts(html) {
  const out = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/g)) {
    const src = attr(` ${m[1]}`, 'src');
    if (!src) out.push(m[2]);
    else if (src.startsWith('/_astro/')) {
      const file = join(ASTRO, src.slice('/_astro/'.length));
      if (existsSync(file)) out.push(readFileSync(file, 'utf8'));
    }
  }
  return out;
}
const loadsVideoScript = (html) =>
  scriptTexts(html).some((text) => text.includes('youtube-nocookie.com/embed') && text.includes('figure[data-video]'));
const loadsTerminalScript = (html) => scriptTexts(html).some((text) => text.includes('[data-code-window][data-terminal]'));

/* -------------------------------------------------------------------------- */
/* Sources : blocs attendus                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Blocs d'un corps, lus comme l'import de Sveltia : à chaque ligne, le motif
 * (multiligne, ancré) appliqué au reste du document doit commencer à cette
 * ligne ; le bloc lu est sauté. Les blocs de code clôturés hors blocs sont
 * sautés (un exemple de syntaxe dans un bloc de code n'est pas un bloc).
 */
function sourceBlocks(body) {
  const found = [];
  let at = 0;
  let fence;
  while (at < body.length) {
    const end = body.indexOf('\n', at);
    const lineEnd = end === -1 ? body.length : end;
    const line = body.slice(at, lineEnd);
    if (fence) {
      if (new RegExp(`^ {0,3}${fence[0] === '`' ? '`' : '~'}{${fence.length},}[ \\t]*$`).test(line)) fence = undefined;
      at = lineEnd + 1;
      continue;
    }
    const opening = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (opening) {
      fence = opening[1];
      at = lineEnd + 1;
      continue;
    }
    const rest = body.slice(at);
    let matched = false;
    for (const [id, syntax] of Object.entries(BLOCKS)) {
      const match = syntax.pattern.exec(rest);
      if (match && match.index === 0) {
        found.push({ id, props: syntax.fromBlock(match) });
        at += match[0].length;
        at = body.indexOf('\n', at) === -1 ? body.length : body.indexOf('\n', at) + 1;
        matched = true;
        break;
      }
    }
    if (!matched) at = lineEnd + 1;
  }
  return found;
}

/** Pages attendues à blocs : URL → blocs de la source. */
const expectedPages = new Map();
for (const collection of Object.keys(ENTRY_BASE_PATHS)) {
  const dir = join(CONTENT, collection);
  if (!existsSync(dir)) continue;
  for (const id of readdirSync(dir).sort()) {
    const file = join(dir, id, 'index.md');
    if (!existsSync(file)) continue;
    const { frontmatter, content } = parseFrontmatter(readFileSync(file, 'utf8'));
    if (frontmatter.draft === true) continue;
    const blocks = sourceBlocks(content);
    if (blocks.length) expectedPages.set(`${ENTRY_BASE_PATHS[collection]}${id}/`, blocks);
  }
}
const entries = new Map(readSiteEntries(pathToFileURL(`${CONTENT}/`)).map((e) => [`${e.collection}/${e.id}`, e]));

/* -------------------------------------------------------------------------- */
/* Lignes                                                                     */
/* -------------------------------------------------------------------------- */

const plural = (n, word, words = `${word}s`) => `${n} ${n === 1 || n === 0 ? word : words}`;

/** Ligne `blocks:` d'une page, depuis une liste neutre de blocs. */
function blocksLine(url, blocks) {
  const callouts = blocks.filter((b) => b.type === 'callout');
  const terminals = blocks.filter((b) => b.type === 'terminal');
  const cards = blocks.filter((b) => b.type === 'card');
  const videos = blocks.filter((b) => b.type === 'video');
  const list = (items) => (items.length ? ` (${items.join(', ')})` : '');
  return (
    `blocks: ${url} · ${plural(callouts.length, 'callout')}${list(callouts.map((b) => b.kind))} · ` +
    `${plural(terminals.length, 'terminal')} · ` +
    `${plural(cards.length, 'card')}${cards.length ? ` → ${cards.map((b) => b.href).join(', ')}` : ''} · ` +
    `${plural(videos.length, 'video facade')}${list(videos.map((b) => b.provider))}`
  );
}

/** Blocs de la source sous la forme neutre de `blocksLine`. */
const fromSource = (blocks) =>
  blocks.map(({ id, props }) => {
    if (id === 'encadre') return { type: 'callout', kind: props.kind };
    if (id === 'terminal') return { type: 'terminal', title: props.title };
    if (id === 'carte') return { type: 'card', ref: props.ref, href: entryHref(props.ref) };
    return { type: 'video', provider: props.provider, id: props.id, title: props.title };
  });

/** Blocs rendus sous la forme neutre, avec les contrôles de structure. */
function fromPage(page, html, expected) {
  const out = [];
  const rendered = renderedBlocks(html);
  /** Rang du bloc parmi ceux de son type : comparé au bloc de même rang et de même type de la source. */
  const seen = { callout: 0, terminal: 0, card: 0, video: 0 };
  const TYPE = { callout: 'callout', terminal: 'terminal', 'entry-card': 'card', 'entry-card-missing': 'card', video: 'video' };
  rendered.forEach((block, index) => {
    const type = TYPE[block.kind];
    const want = expected.filter((b) => b.type === type)[seen[type]++];
    const where = `${page}: bloc ${index + 1} (${block.kind})`;
    const problem = (message) => notes.push(`${where}: ${message}`);
    const { tag, element } = block;

    if (block.kind === 'callout') {
      const kind = attr(tag, 'data-callout');
      if (block.tagName !== 'aside') problem(`<${block.tagName}> au lieu de <aside>`);
      if (!CALLOUT_KINDS.includes(kind)) problem(`genre inconnu « ${kind} »`);
      if (attr(tag, 'role') !== 'note') problem('sans role="note"');
      if (attr(tag, 'aria-label') !== CALLOUT_LABELS[kind]) problem(`aria-label « ${attr(tag, 'aria-label')} »`);
      const label = elementWith(element, 'data-callout-label');
      if (!label || textOf(label) !== CALLOUT_LABELS[kind]) problem('libellé absent ou différent');
      if (!elementWith(element, 'data-callout-body')) problem('corps absent');
      if (hasAttr(tag, 'data-pagefind-ignore')) problem('exclu de Pagefind (un encadré est indexé)');
      out.push({ type: 'callout', kind, text: textOf(element) });
      return;
    }

    if (block.kind === 'terminal') {
      if (block.tagName !== 'figure' || !hasAttr(tag, 'data-code-window')) problem('pas un figure[data-code-window]');
      const title = textOf(elementWith(element, 'data-code-file') ?? '');
      if (want?.type === 'terminal' && title !== want.title) problem(`titre « ${title} » ≠ « ${want.title} »`);
      const copy = elementWith(element, 'data-code-copy');
      const copyTag = headTag(copy ?? '');
      if (!copy || !hasAttr(copyTag, 'hidden') || !hasAttr(copyTag, 'data-pagefind-ignore') || textOf(copy) !== 'Copier') {
        problem('« Copier » absent, visible sans script ou indexé');
      }
      const gutterTag = headTag(elementWith(element, 'data-code-gutter') ?? '');
      if (!gutterTag || !hasAttr(gutterTag, 'data-pagefind-ignore')) problem('gouttière absente ou indexée');
      if (/astro-code|shiki|style="[^"]*color/.test(element)) problem('colorié par Shiki');
      const code = element.match(new RegExp(`<code\\b${TAG_BODY}>([\\s\\S]*?)</code>`))?.[1];
      if (code === undefined) problem('sans <code>');
      out.push({ type: 'terminal', title, code: code === undefined ? '' : textOf(code) });
      return;
    }

    if (block.kind === 'entry-card-missing') {
      problem(`carte d'erreur sur le site (${attr(tag, 'data-entry-card-missing')})`);
      out.push({ type: 'card', ref: attr(tag, 'data-entry-card-missing'), href: '(introuvable)' });
      return;
    }

    if (block.kind === 'entry-card') {
      const ref = attr(tag, 'data-entry-card');
      const href = attr(tag, 'href');
      if (block.tagName !== 'a') problem(`<${block.tagName}> au lieu de <a>`);
      if (!hasAttr(tag, 'data-pagefind-ignore')) problem('sans data-pagefind-ignore');
      let target;
      try {
        if (href !== entryHref(ref)) problem(`href ${href} ≠ ${entryHref(ref)}`);
        target = entries.get(ref);
      } catch (error) {
        problem(String(error.message));
      }
      if (!target) problem(`ref ${ref} absente de ${CONTENT}`);
      const kind = textOf(elementWith(element, 'data-entry-card-kind') ?? '');
      const title = textOf(elementWith(element, 'data-entry-card-title') ?? '');
      const description = textOf(elementWith(element, 'data-entry-card-description') ?? '');
      if (target) {
        const norm = (s) => s.replace(/\s+/g, ' ').trim();
        if (kind !== ENTRY_KIND_LABELS[target.collection]) problem(`genre « ${kind} »`);
        if (title !== norm(target.title)) problem(`titre « ${title} » ≠ « ${target.title} »`);
        if (description !== norm(target.description)) problem('description ≠ celle de l’entrée');
      }
      out.push({ type: 'card', ref, href, title, description, excluded: hasAttr(tag, 'data-pagefind-ignore') });
      return;
    }

    // vidéo
    const provider = attr(tag, 'data-provider');
    const id = attr(tag, 'data-video-id');
    if (block.tagName !== 'figure') problem(`<${block.tagName}> au lieu de <figure>`);
    if (!hasAttr(tag, 'data-pagefind-ignore')) problem('sans data-pagefind-ignore');
    if (!VIDEO_PAGE[provider]) problem(`fournisseur « ${provider} »`);
    if (want?.type === 'video' && (provider !== want.provider || id !== want.id)) {
      problem(`${provider}/${id} ≠ source ${want.provider}/${want.id}`);
    }
    const links = [...element.matchAll(OPEN_TAG)].filter((m) => m[1].toLowerCase() === 'a').map((m) => m[0]);
    const providerPage = VIDEO_PAGE[provider]?.(id);
    if (links.length !== 1 || decode(attr(links[0], 'href') ?? '') !== providerPage) {
      problem(`${links.length} lien(s), attendu 1 vers ${providerPage}`);
    }
    const inner = attributeUrls(element).filter((url) => url !== providerPage);
    if (inner.length) problem(`URL(s) en plus dans la façade : ${inner.join(', ')}`);
    const title = textOf(elementWith(element, 'data-video-title') ?? '');
    if (want?.type === 'video' && title !== want.title) problem(`titre « ${title} » ≠ « ${want.title} »`);
    const hint = `Lecture sur ${VIDEO_PROVIDER_LABELS[provider]} au clic`;
    if (!textOf(element).includes(hint)) problem(`sans « ${hint} »`);
    out.push({
      type: 'video',
      provider,
      id,
      page: providerPage,
      title,
      hint,
      imgs: [...element.matchAll(/<img\b/gi)].length,
      excluded: hasAttr(tag, 'data-pagefind-ignore'),
    });
  });
  return out;
}

/** Fragments Pagefind décompressés d'un dist : URL → contenu. */
function pagefindContents(dist) {
  const dir = join(dist, 'pagefind', 'fragment');
  const out = new Map();
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const text = gunzipSync(readFileSync(join(dir, name))).toString('utf8');
    const json = JSON.parse(text.slice(text.indexOf('{')));
    out.set(json.url, String(json.content ?? ''));
  }
  return out;
}

const words = (text) => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
const squash = (text) => text.replace(/\s+/g, ' ').trim();

// --- blocs ------------------------------------------------------------------
const pages = htmlFiles(DIST).filter((page) => !page.startsWith('admin/'));
const fragments = pagefindContents(DIST);
const videoScriptPages = [];
const terminalScriptPages = [];
const blockPages = [];
const EXPECTED = [];

for (const page of pages) {
  const url = pageUrl(page);
  const html = readFileSync(join(DIST, page), 'utf8');
  if (loadsVideoScript(html)) videoScriptPages.push(url);
  if (loadsTerminalScript(html)) terminalScriptPages.push(url);
  const expected = expectedPages.has(url) ? fromSource(expectedPages.get(url)) : [];
  if (renderedBlocks(html).length === 0 && expected.length === 0) continue;

  const rendered = fromPage(page, html, expected);
  blockPages.push({ url, rendered, expected });
  const videos = rendered.filter((b) => b.type === 'video');
  const wantVideos = expected.filter((b) => b.type === 'video').length;

  lines.push(blocksLine(url, rendered));
  EXPECTED.push(blocksLine(url, expected));

  // façade
  const iframes = [...html.matchAll(/<iframe\b/gi)].length;
  const imgs = videos.reduce((sum, v) => sum + v.imgs, 0);
  const third = attributeUrls(html).filter((u) => VIDEO_HOST.test(hostOf(u)));
  const facadeLinks = videos.map((v) => v.page);
  const sameUrls = JSON.stringify([...third].sort()) === JSON.stringify([...facadeLinks].sort());
  if (!sameUrls) notes.push(`${page}: URLs vers un hôte vidéo : ${third.join(', ') || 'aucune'}`);
  const videoScript = videoScriptPages.at(-1) === url;
  lines.push(
    `facade: ${iframes} iframe · ${imgs} img · third-party URLs = ` +
      `${sameUrls ? `the ${facadeLinks.length} facade links` : `${third.length} (facade links: ${facadeLinks.length})`} · ` +
      `video script ${videoScript ? 'loaded' : 'absent'}`,
  );
  EXPECTED.push(
    `facade: 0 iframe · 0 img · third-party URLs = the ${wantVideos} facade links · ` +
      `video script ${wantVideos ? 'loaded' : 'absent'}`,
  );

  // pagefind
  const content = fragments.get(url);
  if (content === undefined) {
    lines.push(`pagefind: no fragment for ${url}`);
  } else {
    const indexed = new Set(words(content));
    const flat = squash(content);
    const missing = rendered
      .filter((b) => b.type === 'callout')
      .flatMap((b) => words(b.text).filter((w) => !indexed.has(w)));
    if (missing.length) notes.push(`${page}: mots d'encadré absents de l'index : ${[...new Set(missing)].join(', ')}`);
    for (const t of rendered.filter((b) => b.type === 'terminal')) {
      if (!flat.includes(squash(t.code))) notes.push(`${page}: code du terminal « ${t.title} » absent de l'index`);
    }
    const leaked = rendered
      .flatMap((b) => (b.type === 'card' ? [b.title, b.description] : b.type === 'video' ? [b.title, b.hint] : []))
      .filter((text) => text && flat.includes(squash(text)));
    // Le fragment reflète la page indexée ; l'attribut, la page servie (une
    // copie modifiée après Pagefind garde l'ancien fragment).
    const notExcluded = rendered.some((b) => (b.type === 'card' || b.type === 'video') && !b.excluded);
    if (leaked.length) notes.push(`${page}: texte de carte ou de vidéo indexé : ${leaked.join(' | ')}`);
    lines.push(
      `pagefind: callout text ${missing.length ? 'NOT indexed' : 'indexed'} · ` +
        `card and video text ${leaked.length ? 'PRESENT' : notExcluded ? 'not excluded (data-pagefind-ignore missing)' : 'absent'}`,
    );
  }
  EXPECTED.push('pagefind: callout text indexed · card and video text absent');
}

for (const url of expectedPages.keys()) {
  if (!blockPages.some((p) => p.url === url)) notes.push(`${url}: page à blocs attendue, absente de la sortie`);
}

const wantVideoPages = blockPages.filter((p) => p.expected.some((b) => b.type === 'video')).map((p) => p.url);
const wantTerminalPages = blockPages.filter((p) => p.expected.some((b) => b.type === 'terminal')).map((p) => p.url);
const urls = (list) => (list.length ? ` (${list.join(', ')})` : '');
if (blockPages.length === 0) {
  lines.push(
    `blocks: 0 on ${pages.length} pages · video script on ${videoScriptPages.length} pages · ` +
      `terminal script on ${terminalScriptPages.length} blog pages`,
  );
  EXPECTED.push(`blocks: 0 on ${pages.length} pages · video script on 0 pages · terminal script on 0 blog pages`);
} else {
  lines.push(
    `scripts: video script on ${videoScriptPages.length} pages${urls(videoScriptPages)} · ` +
      `terminal script on ${terminalScriptPages.length} blog pages${urls(terminalScriptPages)}`,
  );
  EXPECTED.push(
    `scripts: video script on ${wantVideoPages.length} pages${urls(wantVideoPages)} · ` +
      `terminal script on ${wantTerminalPages.length} blog pages${urls(wantTerminalPages)}`,
  );
}

// --- base (R17) -------------------------------------------------------------
if (BASE) {
  const basePages = htmlFiles(BASE).filter((page) => !page.startsWith('admin/'));
  const stylesheetName = (html) => html.replace(/(\/_astro\/[\w.-]+?)\.[\w-]{8}\.css\b/g, '$1.css');
  let identical = 0;
  for (const page of basePages) {
    const path = join(DIST, page);
    if (!existsSync(path)) {
      notes.push(`site pages: ${page} absente de la sortie`);
      continue;
    }
    if (stylesheetName(readFileSync(path, 'utf8')) === stylesheetName(readFileSync(join(BASE, page), 'utf8'))) {
      identical += 1;
    } else {
      notes.push(`site pages: ${page} diffère de la base`);
    }
  }
  const extra = pages.filter((page) => !basePages.includes(page));
  if (extra.length) notes.push(`site pages: ${extra.length} page(s) absente(s) de la base : ${extra.join(', ')}`);
  lines.push(`site pages: ${identical} identical to base${extra.length ? ` · ${extra.length} new` : ''}`);
  EXPECTED.push(`site pages: ${basePages.length} identical to base`);

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
  lines.push(`pagefind: index and fragments ${same ? 'identical to' : 'DIFFER from'} base`);
  EXPECTED.push('pagefind: index and fragments identical to base');
}

for (const line of lines) console.log(line);

const errors = [];
EXPECTED.forEach((want, i) => {
  if (lines[i] !== want) errors.push(`attendu : ${want}\n  obtenu  : ${lines[i]}`);
});
if (pages.length === 0) errors.push(`aucune page HTML dans ${DIST}`);
if (errors.length || notes.length) {
  for (const e of [...errors, ...notes]) console.error(`check-blocks: ${e}`);
  process.exit(1);
}
