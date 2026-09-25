/**
 * Rendu des corps dans l'aperçu `/admin/` (plan 21, T2, R7 ; décision D138).
 *
 * Même pipeline que les pages : `createMarkdownProcessor` de
 * `@astrojs/markdown-remark` (dépendance du site, export `browser` pour son
 * `#import-plugin`) avec l'objet `markdownOptions` que lit aussi
 * `astro.config.mjs` — thème Shiki `syntaxTheme`, `rehype-slug`,
 * `rehype-autolink-headings`. Le HTML obtenu est celui de la prose des pages,
 * au détail près des images (voir `images.ts`).
 *
 * Piège navigateur : le paquet lit `process.env.ASTRO_PERFORMANCE_BENCHMARK`
 * sans garde au chargement du module (ReferenceError hors Node). Il n'est donc
 * importé que dynamiquement, après `guardProcess()`. Le processeur est créé une
 * seule fois ; les grammaires Shiki se chargent à la demande.
 */
import type { AstroMarkdownOptions, MarkdownRenderer } from '@astrojs/markdown-remark';
import { markdownOptions } from '../../lib/markdownOptions.mjs';

/** L'objet d'options du site, tel quel (pas une copie) : R7. */
export const previewMarkdownOptions = markdownOptions;

/**
 * Fichier fictif passé au rendu : avec un chemin, les images relatives du corps
 * deviennent des repères `__ASTRO_IMAGE_` sans `src`, comme au build du site —
 * aucune `<img src="./…">` ne peut partir vers l'origine (D136). Le chemin
 * n'entre pas dans le HTML (les repères gardent le chemin écrit dans le corps).
 */
const PREVIEW_FILE = 'file:///preview/index.md';

type ProcessScope = { process?: { env?: Record<string, string | undefined> } };

/** Pose un `process.env` vide là où il manque (navigateur) ; n'écrase rien. */
export function guardProcess(scope: ProcessScope = globalThis as ProcessScope): void {
  scope.process ??= { env: {} };
  scope.process.env ??= {};
}

let processor: Promise<MarkdownRenderer> | undefined;

function loadProcessor(): Promise<MarkdownRenderer> {
  if (!processor) {
    guardProcess();
    // Cast : la config utilisateur d'Astro (champs optionnels) et les options
    // du processeur ne diffèrent que par l'optionalité — Astro fait de même.
    processor = import('@astrojs/markdown-remark').then(({ createMarkdownProcessor }) =>
      createMarkdownProcessor(previewMarkdownOptions as AstroMarkdownOptions),
    );
    // Un échec de chargement (réseau) n'est pas mis en cache : l'appel suivant réessaie.
    processor.catch(() => {
      processor = undefined;
    });
  }
  return processor;
}

/** HTML du corps Markdown `md`, par le pipeline du site ; `''` pour un corps vide. */
export async function renderBody(md: string | null | undefined): Promise<string> {
  if (!md) return '';
  const renderer = await loadProcessor();
  const { code } = await renderer.render(md, { fileURL: new URL(PREVIEW_FILE) });
  return code;
}
