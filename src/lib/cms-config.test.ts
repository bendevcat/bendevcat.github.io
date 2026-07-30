import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { CATEGORIES } from '../content.config';

/**
 * Charge la config réelle du CMS (public/admin/config.yml) telle qu'elle sera
 * servie. Le test lit le fichier sur disque — pas une copie — pour que toute
 * dérive entre le CMS et le schéma Zod casse le build de tests.
 */
export function loadCmsConfig(): any {
  return parse(readFileSync(new URL('../../public/admin/config.yml', import.meta.url), 'utf8'));
}

describe('config CMS — backend', () => {
  it('cible le repo GitHub du site, branche main, sans backend serveur', () => {
    const cfg = loadCmsConfig();
    expect(cfg.backend.name).toBe('github');
    expect(cfg.backend.repo).toBe('bendevcat/bendevcat.github.io');
    expect(cfg.backend.branch).toBe('main');
    // Aucun relais OAuth : ces clés doivent rester absentes (spec §5).
    expect(cfg.backend.base_url).toBeUndefined();
    expect(cfg.backend.auth_endpoint).toBeUndefined();
  });

  it('déclare exactement une collection, nommée blog', () => {
    const cfg = loadCmsConfig();
    expect(cfg.collections).toHaveLength(1);
    expect(cfg.collections[0].name).toBe('blog');
  });
});

describe('page /admin', () => {
  it('épingle la version du CDN Sveltia et interdit l’indexation', () => {
    const html = readFileSync(new URL('../../public/admin/index.html', import.meta.url), 'utf8');
    expect(html).toContain('https://unpkg.com/@sveltia/cms@0.175.1/dist/sveltia-cms.js');
    expect(html).toMatch(/<meta\s+name="robots"\s+content="noindex"\s*\/?>/);
    // Un tag flottant ferait sauter l’épinglage (spec §6.2).
    expect(html).not.toContain('@sveltia/cms/dist');
    expect(html).not.toContain('@latest');
  });
});

describe('config CMS — sortie', () => {
  it('omet les champs optionnels vides (le défaut Sveltia est false)', () => {
    expect(loadCmsConfig().output.omit_empty_optional_fields).toBe(true);
  });
});

describe('config CMS — collection blog', () => {
  const blog = () => loadCmsConfig().collections[0];
  const fieldNames = () => blog().fields.map((f: any) => f.name);

  it('écrit des bundles src/content/blog/<slug>/index.md', () => {
    expect(blog().folder).toBe('src/content/blog');
    expect(blog().path).toBe('{{slug}}/index');
    expect(blog().extension).toBe('md');
    expect(blog().format).toBe('yaml-frontmatter');
  });

  it('stocke les médias à côté de l’article (entry-relative)', () => {
    expect(blog().media_folder).toBe('');
    expect(blog().public_folder).toBe('');
  });

  it('mappe tous les champs du schéma Zod sauf relatedProjects', () => {
    expect(fieldNames().sort()).toEqual([
      'aiUsage', 'body', 'category', 'cover', 'coverAlt', 'description',
      'draft', 'featured', 'pubDate', 'tags', 'title', 'updatedDate',
    ]);
  });

  it('rend obligatoires exactement les champs non-optionnels du Zod', () => {
    const required = blog().fields
      .filter((f: any) => f.required !== false)
      .map((f: any) => f.name)
      .sort();
    expect(required).toEqual(['body', 'category', 'description', 'pubDate', 'title']);
  });

  it('propose exactement les 7 catégories du schéma', () => {
    const category = blog().fields.find((f: any) => f.name === 'category');
    expect(category.widget).toBe('select');
    expect(category.options).toEqual([...CATEGORIES]);
  });

  it('propose exactement les 3 niveaux aiUsage du schéma', () => {
    const ai = blog().fields.find((f: any) => f.name === 'aiUsage');
    expect(ai.widget).toBe('select');
    expect(ai.options.map((o: any) => o.value ?? o)).toEqual(['none', 'partial', 'full']);
  });

  it('utilise les widgets attendus pour les champs typés', () => {
    const byName = Object.fromEntries(blog().fields.map((f: any) => [f.name, f]));
    expect(byName.pubDate.widget).toBe('datetime');
    expect(byName.updatedDate.widget).toBe('datetime');
    expect(byName.draft.widget).toBe('boolean');
    expect(byName.featured.widget).toBe('boolean');
    expect(byName.tags.widget).toBe('list');
    expect(byName.cover.widget).toBe('image');
    expect(byName.body.widget).toBe('markdown');
  });
});
