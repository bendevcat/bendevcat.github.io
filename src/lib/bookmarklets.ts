/**
 * Bookmarklets et liens de création rapide de `/admin/raccourcis` (plan 22,
 * T4, R12–R13 ; D150). Fonctions pures, appelées au build par la page.
 *
 * Chaque bookmarklet ouvre, dans un nouvel onglet, le formulaire « nouvelle
 * entrée » pré-rempli de Sveltia sur l'origine de PRODUCTION
 * (`<site>/admin/#/collections/<nom>/new?clé=valeur&…`). Sélection et adresse
 * de la page voyagent dans le fragment (`#…`) : jamais envoyés à un serveur.
 *
 * Relecture par Sveltia 0.221 (`app/navigation.js#parseLocation`,
 * `contents/draft/defaults.js`, sources de `npm/index.js.map`) :
 * - le hash devient le chemin + la requête d'une seconde URL ; un `#` brut y
 *   ouvrirait un nouveau fragment et couperait la requête → tout `#` doit être
 *   encodé (`%23`) ;
 * - `URLSearchParams` décode la requête : `+` → espace, puis `%XX` → un `+`
 *   littéral doit valoir `%2B` ; clés répétées jointes par `,` ;
 * - le parseur d'URL supprime tabulations et sauts de ligne BRUTS → `%0A` ;
 * - chaque valeur est `trim()`ée, une valeur vide est ignorée (défaut du champ) ;
 * - booléen : `'true'` → `true` ; widget `code` à `output_code_only` → la chaîne.
 * `encodeURIComponent` couvre tout cela (il encode `#`, `+`, `&`, `=`, `%`,
 * espaces, sauts de ligne et l'UTF-8).
 *
 * Longueur : les navigateurs acceptent des URL de l'ordre du Mo (Chrome 2 Mo,
 * Firefox 1 Mo). Les valeurs sont bornées en POINTS DE CODE (`Array.from`),
 * jamais en unités UTF-16 — couper une paire de substitution ferait lever
 * `URIError` à `encodeURIComponent` — et une valeur tronquée finit par `…`.
 * Pire cas (20 000 caractères de 4 octets, 12 caractères encodés chacun) :
 * ~240 Ko d'URL.
 *
 * Forme du `href` : le navigateur retire tabulations et sauts de ligne d'un
 * `javascript:` puis DÉCODE ses `%XX` avant de l'exécuter ; le source (sur une
 * ligne, sans commentaire) est donc entièrement passé à `encodeURIComponent`.
 */

/** Longueur maximale du titre (💡), en points de code, avant `…`. */
export const TITLE_MAX = 150;
/** Longueur maximale de la description `Source : <url>` (💡). */
export const DESCRIPTION_MAX = 2000;
/** Longueur maximale du texte du prompt (💬). */
export const PROMPT_MAX = 20000;

const SCHEME = 'javascript:';

/** `<origine du site>/admin/` — cible absolue des bookmarklets. */
export function adminBase(site: URL | string): string {
  return new URL('/admin/', site).href;
}

/**
 * Source JS d'un bookmarklet : lit la sélection (CRLF → LF, `trim`), construit
 * la requête avec `p(clé, valeur)` (valeur vide → omise), ajoute `draft=true`
 * et ouvre `<admin>#/collections/<collection>/new?…` sans `opener` ni
 * `Referer`. Une IIFE : un bookmarklet qui renvoie une valeur remplacerait la
 * page par cette valeur.
 */
function source(admin: string, collection: string, fill: string): string {
  const target = JSON.stringify(`${admin}#/collections/${collection}/new?`);
  return String.raw`(function(){var w=window,g=w.getSelection&&w.getSelection(),s=g?String(g).replace(/\r\n?/g,'\n').trim():'',q=[];function c(x,n){var a=Array.from(x);return a.length>n?a.slice(0,n).join('')+'…':x}function p(k,v){if(v)q.push(k+'='+encodeURIComponent(v))}${fill}q.push('draft=true');w.open(${target}+q.join('&'),'_blank','noopener,noreferrer')})()`;
}

function toHref(js: string): string {
  return SCHEME + encodeURIComponent(js);
}

/**
 * 💡 Idée d'article : titre = sélection (espaces blancs réduits à un espace,
 * un titre est une ligne) sinon titre de la page ; description =
 * `Source : <adresse de la page>` ; brouillon.
 */
export function ideaBookmarklet(admin: string): string {
  return toHref(
    source(
      admin,
      'blog',
      String.raw`p('title',c((s||document.title||'').replace(/\s+/g,' ').trim(),${TITLE_MAX}));p('description',c('Source : '+location.href,${DESCRIPTION_MAX}));`,
    ),
  );
}

/** 💬 Nouveau prompt : sélection (sauts de ligne gardés) → `prompt` ; brouillon. */
export function promptBookmarklet(admin: string): string {
  return toHref(source(admin, 'prompts', `p('prompt',c(s,${PROMPT_MAX}));`));
}

/** Source exécutée par le navigateur pour un `href` `javascript:` (décodage `%XX`). */
export function bookmarkletSource(href: string): string {
  if (!href.startsWith(SCHEME)) throw new Error(`pas un bookmarklet : ${href.slice(0, 40)}`);
  return decodeURIComponent(href.slice(SCHEME.length));
}

export interface Bookmarklet {
  id: 'idea' | 'prompt';
  label: string;
  href: string;
}

/** Les deux bookmarklets de la page, construits contre `<site>/admin/`. */
export function bookmarklets(site: URL | string): Bookmarklet[] {
  const admin = adminBase(site);
  return [
    { id: 'idea', label: "💡 Idée d'article", href: ideaBookmarklet(admin) },
    { id: 'prompt', label: '💬 Nouveau prompt', href: promptBookmarklet(admin) },
  ];
}

export interface QuickLink {
  label: string;
  href: string;
}

/** Liens simples (mobile, sans bookmarklet) : formulaire vide, brouillon. */
export function quickLinks(): QuickLink[] {
  return [
    { label: 'Nouvel article', href: '/admin/#/collections/blog/new?draft=true' },
    { label: 'Nouveau prompt', href: '/admin/#/collections/prompts/new?draft=true' },
  ];
}
