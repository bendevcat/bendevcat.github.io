// @ts-check
/**
 * Échec du build sur un bloc invalide (plan 23, T1, R3 ; décision D152) —
 * NODE UNIQUEMENT.
 *
 * Pourquoi un contrôle à part : le chargeur `glob` d'Astro 7
 * (`content/loaders/glob.js`) ATTRAPE l'erreur de rendu d'une entrée, la
 * journalise (`[ERROR] [glob-loader] Error rendering …`) et enregistre
 * l'entrée sans HTML — le build continue et sort 0. De plus, une entrée dont
 * le fichier n'a pas changé n'est pas re-rendue (magasin `.astro/`, clé =
 * empreinte du fichier) : une carte vers une entrée supprimée depuis ne serait
 * pas revue.
 *
 * `astro:build:start` (après la synchronisation du contenu, avant la
 * génération des pages) relit donc chaque `src/content/<collection>/<slug>/index.md`
 * dont le corps ouvre un conteneur `:::` et le rend avec les options markdown
 * du site : toute erreur de bloc (nom inconnu, id, titre, ref inconnue,
 * brouillon cité…) fait échouer le build, message nommant le fichier et la
 * ref. Sans conteneur dans le contenu, rien n'est rendu.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createMarkdownProcessor, parseFrontmatter } from '@astrojs/markdown-remark';

const CONTENT_DIR = new URL('../../content/', import.meta.url);

/** Ligne d'ouverture d'un conteneur (jusqu'à 3 espaces, ≥ 3 `:`, un nom). */
export const CONTAINER_OPENING = /^ {0,3}:{3,}[A-Za-z]/m;

/**
 * Rend chaque corps de `contentDir` qui ouvre un conteneur `:::`.
 * @param {{ markdown: object, contentDir?: URL }} options `markdown` = les
 *   options markdown du site (`markdownOptions`)
 * @returns {Promise<string[]>} fichiers contrôlés
 * @throws {Error} la liste des erreurs de blocs, une par fichier
 */
export async function checkBlocksOnDisk({ markdown, contentDir = CONTENT_DIR }) {
  /** @type {{ file: URL, frontmatter: Record<string, unknown>, content: string }[]} */
  const bodies = [];
  if (existsSync(contentDir)) {
    for (const collection of readdirSync(contentDir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
      const dir = new URL(`${collection.name}/`, contentDir);
      for (const slug of readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
        const file = new URL(`${slug.name}/index.md`, dir);
        if (!existsSync(file)) continue;
        const { frontmatter, content } = parseFrontmatter(readFileSync(file, 'utf8'));
        if (CONTAINER_OPENING.test(content)) bodies.push({ file, frontmatter, content });
      }
    }
  }
  if (bodies.length === 0) return [];

  const processor = await createMarkdownProcessor(/** @type {any} */ (markdown));
  /** @type {string[]} */
  const errors = [];
  for (const { file, frontmatter, content } of bodies) {
    try {
      await processor.render(content, { fileURL: file, frontmatter });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (errors.length > 0) throw new Error(`Blocs invalides :\n${errors.join('\n')}`);
  return bodies.map(({ file }) => file.pathname);
}

/**
 * Intégration Astro : le contrôle ci-dessus à `astro:build:start`.
 * @param {object} markdown options markdown du site
 * @returns {import('astro').AstroIntegration}
 */
export function blocksBuildCheck(markdown) {
  return {
    name: 'bencat:blocks-build-check',
    hooks: {
      'astro:build:start': async ({ logger }) => {
        const checked = await checkBlocksOnDisk({ markdown });
        if (checked.length > 0) logger.info(`blocs : ${checked.length} corps contrôlé(s)`);
      },
    },
  };
}
