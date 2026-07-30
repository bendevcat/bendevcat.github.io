import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

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
