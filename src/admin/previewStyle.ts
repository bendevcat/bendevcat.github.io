/**
 * CSS du site dans le volet d'aperçu de Sveltia CMS (plan 19, R8/R9).
 *
 * `cms.ts` importe `src/styles/global.css?inline` (CSS compilé par Tailwind,
 * polices comprises) et l'enregistre avec `registerPreviewStyle(css, { raw:
 * true })`. Sveltia en fait une feuille `blob:` : une URL racine comme
 * `url(/_astro/nebula-sans-….woff2)` n'y a pas d'origine et ne se résout pas.
 * Les URL racine sont donc rendues absolues vers l'origine de la page admin
 * avant l'enregistrement. (`global.css?url` n'est pas utilisable : au build il
 * pointe vers un fichier que Vite n'émet pas — sonde du plan 19.)
 */

/** Sous-ensemble de l'API Sveltia utilisé ici (facilite les tests). */
export interface PreviewStyleApi {
  registerPreviewStyle(style: string, options?: { raw?: boolean }): void;
}

/**
 * `url(…)` dont la cible commence par UNE seule barre (`/x`, pas `//x`),
 * guillemets simples, doubles ou absents, espaces internes conservés.
 */
const ROOT_URL = /url\(\s*(['"]?)(\/(?!\/)[^'")\s]*)\1\s*\)/g;

/**
 * Préfixe par `origin` chaque `url()` racine du CSS. Les URL absolues
 * (`https:`, `//`), `data:`, relatives (`./`, `../`, `x.png`) et les fragments
 * (`#x`) restent intactes, de même que tout texte hors `url()`.
 */
export function absolutizeCssUrls(css: string, origin: string): string {
  const base = origin.replace(/\/+$/, '');
  return css.replace(ROOT_URL, (match, _quote: string, path: string) =>
    match.replace(path, `${base}${path}`),
  );
}

/** Enregistre le CSS du site, une fois, comme feuille brute de l'aperçu. */
export function registerSiteStyle(cms: PreviewStyleApi, css: string, origin: string): void {
  cms.registerPreviewStyle(absolutizeCssUrls(css, origin), { raw: true });
}
