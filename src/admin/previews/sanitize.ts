/**
 * Assainissement du HTML injecté dans l'aperçu `/admin/` (plan 21, F1 ;
 * décision D143).
 *
 * Le corps d'une entrée vient du dépôt — donc, potentiellement, d'une PR
 * malveillante. Rendu par le pipeline du site (`renderBody`), son HTML brut
 * passe tel quel : `<img onerror>`, `<svg onload>`, `javascript:`… Or l'iframe
 * d'aperçu de Sveltia permet les scripts ET la même origine
 * (`allow-scripts allow-same-origin`) : un script y lirait le jeton GitHub de
 * `/admin/`. L'aperçu par défaut de Sveltia assainit (`sanitize_preview`,
 * vrai par défaut) ; nos gabarits le remplacent, ils doivent donc assainir
 * aussi.
 *
 * - Assainisseur : DOMPurify, en version exacte — celle que Sveltia 0.221
 *   embarque (3.4.16), mais dans un morceau interne de son paquet (seul `.`
 *   est exporté) : on ne peut pas l'importer, on dépend donc de `dompurify`.
 *   Importé seulement par `register.ts` → bundle d'administration seul.
 * - `SANITIZE_CONFIG` : défauts de DOMPurify (gestionnaires `on*`,
 *   `<script>`, `<iframe>`, `<object>`, `<embed>`, vecteurs SVG/MathML,
 *   URL `javascript:`/`vbscript:`/`data:` hors image retirés) + `<style>`
 *   et `<form>` interdits, `formaction` interdit, et le schéma `blob:` admis
 *   dans les URL (les images résolues par `getAsset` en ont une, D141).
 * - Écrasement du DOM (« clobbering ») : `SANITIZE_DOM` de DOMPurify retire
 *   tout `id` dont la valeur est une propriété de `document` — dont les
 *   ancres de titres du site (`id="plugins"`, `id="images"`…). Il est coupé,
 *   et `name` interdit à la place : sans `name` (ni `<form>`, `<object>`,
 *   `<embed>`, `<iframe>`), aucun élément n'est exposé comme propriété de
 *   `document`.
 *   `style`, `class`, `id`, `href="#…"`, `lang`, `data-*` restent : tout ce
 *   qu'émet le pipeline du site passe inchangé (testé sur chaque entrée).
 * - Point d'application : `sanitizingH` enveloppe le `h` passé aux gabarits
 *   et assainit tout `dangerouslySetInnerHTML.__html` — la chaîne exacte
 *   injectée, après la résolution des images (`resolveBodyImages`, une
 *   réécriture par expressions régulières qu'il ne faut pas faire passer
 *   APRÈS l'assainisseur). Les gabarits restent des fonctions pures.
 * - Sans DOM utilisable, `createSanitizer` renvoie `null` : l'appelant
 *   n'enregistre alors rien (l'aperçu assaini de Sveltia reste) — jamais de
 *   repli en passe-plat.
 */
import DOMPurify, { type Config, type DOMPurify as DOMPurifyInstance, type WindowLike } from 'dompurify';
import type { H } from './html';

/** HTML → HTML assaini. */
export type Sanitize = (html: string) => string;

/**
 * Schémas d'URL admis : ceux de DOMPurify (`ALLOWED_URI_REGEXP` par défaut)
 * + `blob:` (URL d'objet créée par l'aperçu lui-même, jamais exécutable).
 */
const ALLOWED_URI = /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix|blob):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

/** Configuration DOMPurify de l'aperçu — la même dans le navigateur et les tests. */
export const SANITIZE_CONFIG = Object.freeze({
  FORBID_TAGS: Object.freeze(['style', 'form']) as string[],
  FORBID_ATTR: Object.freeze(['formaction', 'name']) as string[],
  ALLOWED_URI_REGEXP: ALLOWED_URI,
  SANITIZE_DOM: false,
}) satisfies Config;

/** Nombre de HTML assainis gardés en mémoire (un rendu par frappe). */
const CACHE_SIZE = 8;

/**
 * Assainisseur lié à la fenêtre `view` (dans `/admin/` : `window`), ou `null`
 * si DOMPurify ne peut pas y travailler (pas de DOM).
 */
export function createSanitizer(view: object | null | undefined): Sanitize | null {
  if (!view || typeof view !== 'object' || !(view as Partial<Window>).document) return null;
  let purify: DOMPurifyInstance;
  try {
    purify = DOMPurify(view as WindowLike);
  } catch {
    return null;
  }
  if (!purify.isSupported) return null;
  // Une copie : DOMPurify ne doit pas pouvoir toucher la configuration figée.
  const config: Config = {
    FORBID_TAGS: [...SANITIZE_CONFIG.FORBID_TAGS],
    FORBID_ATTR: [...SANITIZE_CONFIG.FORBID_ATTR],
    ALLOWED_URI_REGEXP: SANITIZE_CONFIG.ALLOWED_URI_REGEXP,
    SANITIZE_DOM: SANITIZE_CONFIG.SANITIZE_DOM,
  };
  const cache = new Map<string, string>();
  return (html) => {
    if (!html) return '';
    const hit = cache.get(html);
    if (hit !== undefined) return hit;
    const clean = String(purify.sanitize(html, config));
    if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value as string);
    cache.set(html, clean);
    return clean;
  };
}

/**
 * `h` qui assainit tout `dangerouslySetInnerHTML.__html` avant de le passer
 * au `h` d'origine ; les autres props et les enfants passent tels quels.
 */
export function sanitizingH<N>(h: H<N>, sanitize: Sanitize): H<N> {
  return (type, props, ...children) => {
    const inner = props?.dangerouslySetInnerHTML as { __html?: unknown } | undefined;
    if (!props || inner === undefined) return h(type, props, ...children);
    const html = inner && typeof inner.__html === 'string' ? inner.__html : '';
    return h(type, { ...props, dangerouslySetInnerHTML: { __html: sanitize(html) } }, ...children);
  };
}
