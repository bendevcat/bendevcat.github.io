#!/usr/bin/env node
/**
 * Contrôle du patron « détail à onglets » sur la sortie de build (Plan 8,
 * critères R2 et R8, décision D15). À lancer après `npm run build` :
 *
 *   node scripts/check-detail-tabs.mjs
 *
 * Parcourt `dist/{projets,prompts,skills}/<slug>/index.html` et imprime, sur
 * stdout, une ligne par page dans l'ordre famille puis slug :
 *
 *   <famille>/<slug>: Label | Label        (ou `(panneau unique)`)
 *
 * Code de sortie 1 (erreurs détaillées sur stderr) si une page viole R2/R8 :
 * - exactement un `role="tablist"`, avec un `aria-label` non vide et
 *   `data-pagefind-ignore` (plan 17, F3 : les libellés d'onglets n'ont rien
 *   à faire dans l'index de recherche, quelle que soit la variante) ;
 * - chaque `role="tab"` est un <button> dont `aria-controls` nomme un
 *   `role="tabpanel"` existant, dont `aria-labelledby` nomme cet onglet ;
 * - autant d'onglets que de panneaux ;
 * - premier onglet `aria-selected="true"`, les autres `"false"` ; premier
 *   panneau sans `hidden`, tous les autres avec ;
 * - aucun panneau vide (texte, balises retirées, trimé) ;
 * - `<article>` garde `data-pagefind-body`.
 * Une page à un seul onglet (D13) n'a pas de rangée : elle s'imprime
 * `(panneau unique)` (plan 16) si elle a exactement une racine
 * `[data-detail-tabs]` au texte non vide — sinon code 1 (aucune racine, ou
 * panneau unique vide).
 * Code 1 aussi si, dans `dist/_astro/*.css`, le repli sans JS des panneaux
 * (R9) n'est pas dans `@layer base` à côté du preflight `[hidden]`.
 *
 * Familles pas encore migrées (PENDING_FAMILIES) : une page sans rangée
 * d'onglets y est signalée, pas comptée en erreur. Une fois la famille
 * migrée, la retirer de l'ensemble — une page sans rangée devient une erreur.
 *
 * Aucune dépendance : un petit tokeniseur HTML suffit, la sortie d'Astro est
 * régulière (attributs entre guillemets, `>` échappé dans le texte).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const FAMILIES = ['projets', 'prompts', 'skills'];
// Plan 8 / T3 : les trois familles portent le patron — plus aucune en attente.
const PENDING_FAMILIES = new Set();

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
 * Éléments d'intérêt, avec leur texte (balises retirées). Un élément ouvert
 * se ferme sur la balise fermante de même nom à sa profondeur.
 */
function collectElements(tokens) {
  const elements = [];
  const stack = [];
  for (const token of tokens) {
    if (token.type === 'text') {
      for (const el of stack) el.text += token.text;
    } else if (token.type === 'open') {
      const el = { tag: token.tag, attrs: token.attrs, text: '' };
      elements.push(el);
      if (!VOID.has(token.tag)) stack.push(el);
    } else {
      const at = stack.map((el) => el.tag).lastIndexOf(token.tag);
      if (at !== -1) stack.length = at; // referme aussi les éléments laissés ouverts dedans
    }
  }
  for (const el of elements) el.text = decode(el.text).replace(/\s+/g, ' ').trim();
  return elements;
}

function checkPage(family, html) {
  const errors = [];
  const elements = collectElements(tokenize(html));
  const byRole = (role) => elements.filter((el) => el.attrs.role === role);
  const byId = new Map(elements.filter((el) => el.attrs.id).map((el) => [el.attrs.id, el]));

  const articles = elements.filter((el) => el.tag === 'article');
  if (!articles.some((el) => 'data-pagefind-body' in el.attrs)) {
    errors.push('<article> sans data-pagefind-body');
  }

  const tablists = byRole('tablist');
  const tabs = byRole('tab');
  const panels = byRole('tabpanel');

  if (tablists.length === 0 && tabs.length === 0 && panels.length === 0) {
    // Moins de deux onglets (D13) : pas de rangée, le panneau unique est
    // rendu nu dans la racine `[data-detail-tabs]` (plan 16). Il doit exister
    // et ne pas être vide ; sans racine du tout, la page n'a pas le patron.
    const roots = elements.filter((el) => 'data-detail-tabs' in el.attrs);
    if (roots.length === 1) {
      if (roots[0].text === '') errors.push('panneau unique vide ([data-detail-tabs] sans texte)');
      return { row: '(panneau unique)', errors };
    }
    if (roots.length > 1) {
      errors.push(`${roots.length} [data-detail-tabs] sans rangée d'onglets (attendu : 1)`);
      return { row: '(panneau unique)', errors };
    }
    if (!PENDING_FAMILIES.has(family)) errors.push('aucune rangée d\'onglets (role="tablist") ni [data-detail-tabs]');
    return { row: '(aucune rangée d\'onglets)', errors };
  }

  if (tablists.length !== 1) errors.push(`${tablists.length} role="tablist" (attendu : 1)`);
  else {
    if (!tablists[0].attrs['aria-label']?.trim()) errors.push('role="tablist" sans aria-label');
    if (!('data-pagefind-ignore' in tablists[0].attrs)) errors.push('role="tablist" sans data-pagefind-ignore');
  }

  if (tabs.length !== panels.length) {
    errors.push(`${tabs.length} onglet(s) pour ${panels.length} panneau(x)`);
  }
  if (tabs.length === 0) errors.push('aucun role="tab"');

  tabs.forEach((tab, index) => {
    const name = `onglet « ${tab.text} »`;
    if (tab.tag !== 'button') errors.push(`${name} : <${tab.tag}> au lieu de <button>`);
    const expected = index === 0 ? 'true' : 'false';
    if (tab.attrs['aria-selected'] !== expected) {
      errors.push(`${name} : aria-selected="${tab.attrs['aria-selected'] ?? ''}" (attendu "${expected}")`);
    }
    const panel = byId.get(tab.attrs['aria-controls'] ?? '');
    if (!panel || panel.attrs.role !== 'tabpanel') {
      errors.push(`${name} : aria-controls="${tab.attrs['aria-controls'] ?? ''}" ne nomme aucun role="tabpanel"`);
    } else if (!tab.attrs.id || panel.attrs['aria-labelledby'] !== tab.attrs.id) {
      errors.push(`${name} : le panneau #${panel.attrs.id} a aria-labelledby="${panel.attrs['aria-labelledby'] ?? ''}"`);
    }
  });

  panels.forEach((panel, index) => {
    const name = `panneau #${panel.attrs.id ?? '?'}`;
    const hidden = 'hidden' in panel.attrs;
    if (index === 0 && hidden) errors.push(`${name} : premier panneau masqué au chargement`);
    if (index > 0 && !hidden) errors.push(`${name} : pas d'attribut hidden au chargement`);
    if (panel.text === '') errors.push(`${name} : panneau vide`);
  });

  return { row: tabs.map((tab) => tab.text).join(' | '), errors };
}

let failed = false;
let pending = 0;
for (const family of FAMILIES) {
  const dir = join(DIST, family);
  if (!existsSync(dir)) {
    console.error(`${family}: dossier ${dir} introuvable — lancer \`npm run build\` d'abord`);
    failed = true;
    continue;
  }
  const slugs = readdirSync(dir)
    .filter((slug) => statSync(join(dir, slug)).isDirectory() && existsSync(join(dir, slug, 'index.html')))
    .sort();
  for (const slug of slugs) {
    const { row, errors } = checkPage(family, readFileSync(join(dir, slug, 'index.html'), 'utf8'));
    console.log(`${family}/${slug}: ${row}`);
    if (row === '(aucune rangée d\'onglets)' && errors.length === 0) pending += 1;
    for (const error of errors) console.error(`  ✗ ${family}/${slug} — ${error}`);
    if (errors.length > 0) failed = true;
  }
}

/**
 * Repli sans JS (R9, D11) sur le CSS construit : la règle qui réaffiche les
 * panneaux `hidden` doit vivre dans `@layer base`, la couche du preflight
 * `[hidden] { display: none !important }`. Hors couche, un `!important` perd
 * contre toute couche quelle que soit sa spécificité (constat T4, fix round 1).
 * Contrôle structurel : le calcul réel du style reste mesuré au navigateur.
 */
function layerBlocks(css, name) {
  const blocks = [];
  const open = `@layer ${name}{`;
  for (let at = css.indexOf(open); at !== -1; at = css.indexOf(open, at + 1)) {
    let depth = 0;
    for (let i = at + open.length - 1; i < css.length; i += 1) {
      if (css[i] === '{') depth += 1;
      else if (css[i] === '}' && (depth -= 1) === 0) {
        blocks.push(css.slice(at + open.length, i));
        break;
      }
    }
  }
  return blocks.join('');
}

const ASTRO = join(DIST, '_astro');
const cssFiles = existsSync(ASTRO) ? readdirSync(ASTRO).filter((file) => file.endsWith('.css')) : [];
const base = cssFiles.map((file) => layerBlocks(readFileSync(join(ASTRO, file), 'utf8'), 'base')).join('');
// Le minifieur regroupe les règles voisines aux déclarations identiques
// (plan 17 : le repli de l'explorateur de la fiche skill a la même
// déclaration) : le sélecteur est cherché dans la liste de chaque règle.
const noJsSelector = /^html:not\(\[data-js\]\) \[data-detail-tabs\] \[role="?tabpanel"?\]\[hidden\]$/;
const noJsRule = [...base.matchAll(/([^{}]+)\{([^{}]*)\}/g)].some(
  ([, selectors, declarations]) =>
    declarations.trim() === 'display:block!important' &&
    selectors.split(',').some((selector) => noJsSelector.test(selector.trim())),
);
if (!base.includes('[hidden]:where(')) {
  console.error('  ✗ CSS — preflight `[hidden]` introuvable dans @layer base');
  failed = true;
}
if (!noJsRule) {
  console.error('  ✗ CSS — repli sans JS des panneaux absent de @layer base (R9) : le preflight [hidden] le masque');
  failed = true;
}

if (pending > 0) {
  console.error(`${pending} page(s) d'une famille pas encore migrée, sans rangée d'onglets (PENDING_FAMILIES).`);
}
process.exit(failed ? 1 : 0);
