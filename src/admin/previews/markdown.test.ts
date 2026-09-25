import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createMarkdownProcessor, parseFrontmatter, type AstroMarkdownOptions } from '@astrojs/markdown-remark';
import { guardProcess, previewMarkdownOptions, renderBody } from './markdown';

/**
 * Corps de l'aperçu `/admin/` rendus par le pipeline du site (plan 21, T2, R7 ;
 * décision D138) : `createMarkdownProcessor` de `@astrojs/markdown-remark` avec
 * l'objet d'options que lit `astro.config.mjs` (`markdown:`). Les entrées sont
 * lues sur le disque, sans valeur figée (D131) : toute entrée présente — publiée
 * ou brouillon — est comparée.
 */
const CONTENT_DIR = new URL('../../content/', import.meta.url);

interface Entry {
  name: string;
  file: URL;
  frontmatter: Record<string, unknown>;
  body: string;
}

/** Chaque `src/content/<collection>/<slug>/index.md` sur le disque. */
function allEntries(): Entry[] {
  return readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((collection) => {
      const dir = new URL(`${collection.name}/`, CONTENT_DIR);
      return readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && existsSync(new URL(`${d.name}/index.md`, dir)))
        .map((d) => {
          const file = new URL(`${d.name}/index.md`, dir);
          // Découpage du site (content-layer d'Astro : `parseFrontmatter`).
          const { frontmatter, content } = parseFrontmatter(readFileSync(file, 'utf8'));
          return { name: `${collection.name}/${d.name}`, file, frontmatter, body: content };
        });
    });
}

describe('corps de l’aperçu : pipeline markdown du site', () => {
  it('astro.config.mjs et l’aperçu lisent le même objet d’options markdown', async () => {
    const { default: config } = await import('../../../astro.config.mjs');
    expect(config.markdown).toBeDefined();
    // Le même objet, pas une copie : une option ajoutée au site l'est à l'aperçu.
    expect(previewMarkdownOptions).toBe(config.markdown);
  });

  it('rend le corps de chaque entrée comme le pipeline du site', { timeout: 60_000 }, async () => {
    const { default: config } = await import('../../../astro.config.mjs');
    const site = await createMarkdownProcessor(config.markdown as AstroMarkdownOptions);
    const entries = allEntries();
    expect(entries.length).toBeGreaterThan(0);

    let headings = 0;
    let codeBlocks = 0;
    for (const entry of entries) {
      // Référence = rendu du site : fichier réel (images collectées) et
      // frontmatter, comme `content-layer` le fait au build.
      const expected = (
        await site.render(entry.body, { fileURL: entry.file, frontmatter: entry.frontmatter })
      ).code;
      const actual = await renderBody(entry.body);
      expect(actual, entry.name).toBe(expected);

      // Garde-fous indépendants de l'objet d'options partagé : un changement
      // commun aux deux côtés (thème, plugin retiré) rougit ici aussi.
      expect(actual, entry.name).not.toMatch(/github-dark/);
      for (const [, level, id, inner] of actual.matchAll(/<h([2-6]) id="([^"]+)">([\s\S]*?)<\/h\1>/g)) {
        headings += 1;
        // rehype-autolink-headings (`wrap`) : le titre entier est un lien #id.
        expect(inner, `${entry.name} h${level}#${id}`).toMatch(new RegExp(`^<a href="#${id}">[\\s\\S]*</a>$`));
      }
      const fences = entry.body.match(/^```/gm)?.length ?? 0;
      const blocks = actual.match(/<pre class="astro-code[^"]*"/g)?.length ?? 0;
      expect(blocks, entry.name).toBe(fences / 2);
      codeBlocks += blocks;
    }
    // Le contenu réel porte des titres et des blocs de code : les garde-fous
    // ci-dessus ont bien été exercés.
    expect(headings).toBeGreaterThan(0);
    expect(codeBlocks).toBeGreaterThan(0);
  });

  it('un corps vide ou absent rend une chaîne vide', async () => {
    expect(await renderBody('')).toBe('');
    expect(await renderBody(undefined)).toBe('');
  });

  it('pose la garde process avant de charger le pipeline', async () => {
    // Le paquet lit `process.env.ASTRO_PERFORMANCE_BENCHMARK` sans garde au
    // chargement (ReferenceError dans un navigateur) : le module de l'aperçu
    // ne l'importe que dynamiquement, après la garde.
    const source = readFileSync(new URL('./markdown.ts', import.meta.url), 'utf8');
    // (un `import type` est effacé à la compilation : permis)
    expect(source).not.toMatch(/^import (?!type )[^;]*from '@astrojs\/markdown-remark'/m);
    const guard = source.indexOf('guardProcess();');
    const load = source.indexOf("import('@astrojs/markdown-remark')");
    expect(guard).toBeGreaterThan(-1);
    expect(load).toBeGreaterThan(guard);

    // La garde elle-même : sans `process`, un objet `{ env: {} }` ; un
    // `process` existant n'est pas remplacé.
    const bare: { process?: { env?: Record<string, string | undefined> } } = {};
    guardProcess(bare);
    expect(bare.process).toEqual({ env: {} });
    const env = { A: '1' };
    const existing = { process: { env } };
    guardProcess(existing);
    expect(existing.process.env).toBe(env);
    const noEnv: { process?: { env?: Record<string, string | undefined> } } = { process: {} };
    guardProcess(noEnv);
    expect(noEnv.process).toEqual({ env: {} });
  });
});
