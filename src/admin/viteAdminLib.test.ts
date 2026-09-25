import { describe, it, expect } from 'vitest';
import { adminLibCopy } from './viteAdminLib.mjs';
import { markdownOptions } from '../lib/markdownOptions.mjs';

/**
 * Copie admin de `src/lib` (plan 21, T1, R19 ; décision D138). Importer
 * `src/lib/*` depuis `src/admin/` faisait partager des chunks Rollup entre le
 * bundle admin et les scripts du site (isolation 8/52, 8 pages du site
 * modifiées). Le plugin résout chaque import `src/lib/**` fait depuis
 * `src/admin/**` — ou depuis un module déjà suffixé — vers `<fichier>?admin` :
 * l'admin a sa propre copie, les pages du site ne bougent pas.
 */
const ROOT = '/repo';

/** Faux contexte de plugin : `this.resolve` renvoie le chemin absolu tel quel. */
function fakeContext(calls: unknown[] = []) {
  return {
    async resolve(source: string, importer: string | undefined, options: Record<string, unknown>) {
      calls.push({ source, importer, options });
      if (source === 'virtual:x') return { id: '\0virtual:x' };
      if (source === 'ext') return { id: 'ext', external: true };
      if (source === 'missing') return null;
      if (source.startsWith('/')) return { id: source };
      const base = (importer ?? `${ROOT}/`).split('?')[0].replace(/[^/]*$/, '');
      const url = new URL(source, `file://${base}`);
      return { id: url.pathname + url.search, moduleSideEffects: true };
    },
  };
}

async function resolve(source: string, importer: string | undefined, calls?: unknown[]) {
  const plugin = adminLibCopy({ root: ROOT });
  const hook = plugin.resolveId as (
    this: ReturnType<typeof fakeContext>,
    s: string,
    i: string | undefined,
    o: Record<string, unknown>,
  ) => Promise<unknown>;
  return hook.call(fakeContext(calls), source, importer, { isEntry: false });
}

describe('plugin Vite adminLibCopy', () => {
  it('donne à src/admin sa propre copie de src/lib', async () => {
    const plugin = adminLibCopy({ root: ROOT });
    expect(plugin.name).toBe('admin-lib-copy');
    expect(plugin.enforce).toBe('pre');
    // Build seulement : en dev et sous Vitest, une seule instance par module.
    expect(plugin.apply).toBe('build');

    // Depuis src/admin (et ses sous-dossiers) : src/lib → ?admin, en gardant
    // les autres champs de la résolution.
    expect(await resolve('../../lib/promptWindow.ts', `${ROOT}/src/admin/previews/prompt.ts`)).toEqual({
      id: `${ROOT}/src/lib/promptWindow.ts?admin`,
      moduleSideEffects: true,
    });
    expect(await resolve('../lib/thematicBreaks.ts', `${ROOT}/src/admin/hooks.ts`)).toMatchObject({
      id: `${ROOT}/src/lib/thematicBreaks.ts?admin`,
    });
    expect(await resolve('../lib/syntaxTheme.mjs', `${ROOT}/src/admin/cms.ts?v=1`)).toMatchObject({
      id: `${ROOT}/src/lib/syntaxTheme.mjs?admin`,
    });

    // Depuis un module déjà suffixé : ses propres imports src/lib suivent.
    expect(await resolve('./codeWindow.ts', `${ROOT}/src/lib/promptWindow.ts?admin`)).toMatchObject({
      id: `${ROOT}/src/lib/codeWindow.ts?admin`,
    });
    // Une requête existante est conservée, suffixe ajouté une seule fois.
    expect(await resolve('/repo/src/lib/a.ts?raw', `${ROOT}/src/admin/cms.ts`)).toMatchObject({
      id: `${ROOT}/src/lib/a.ts?raw&admin`,
    });
    expect(await resolve('/repo/src/lib/a.ts?admin', `${ROOT}/src/admin/cms.ts`)).toMatchObject({
      id: `${ROOT}/src/lib/a.ts?admin`,
    });

    // Le site ne change pas : import src/lib depuis une page, un composant ou
    // src/lib non suffixé → la résolution par défaut (null), sans appel.
    const calls: unknown[] = [];
    expect(await resolve('../lib/promptWindow.ts', `${ROOT}/src/components/Prompt.astro`, calls)).toBeNull();
    expect(await resolve('./codeWindow.ts', `${ROOT}/src/lib/promptWindow.ts`, calls)).toBeNull();
    expect(await resolve('./codeWindow.ts', `${ROOT}/src/lib/promptWindow.ts?administration`, calls)).toBeNull();
    expect(await resolve('src/lib/x.ts', undefined, calls)).toBeNull();
    expect(calls).toHaveLength(0);

    // Hors src/lib, externe, virtuel ou introuvable : inchangé.
    expect(await resolve('../styles/global.css?inline', `${ROOT}/src/admin/cms.ts`)).toBeNull();
    expect(await resolve('/repo/node_modules/yaml/index.js', `${ROOT}/src/admin/cms.ts`)).toBeNull();
    expect(await resolve('/repo/src/library/a.ts', `${ROOT}/src/admin/cms.ts`)).toBeNull();
    expect(await resolve('../lib/promptWindow', `${ROOT}/src/admin/previews/prompt.ts`)).toBeNull(); // src/admin/lib
    expect(await resolve('ext', `${ROOT}/src/admin/cms.ts`)).toBeNull();
    expect(await resolve('virtual:x', `${ROOT}/src/admin/cms.ts`)).toBeNull();
    expect(await resolve('missing', `${ROOT}/src/admin/cms.ts`)).toBeNull();

    // La résolution déléguée se saute elle-même (pas de récursion).
    const own: Array<{ options: Record<string, unknown> }> = [];
    await resolve('../lib/a.ts', `${ROOT}/src/admin/cms.ts`, own);
    expect(own[0].options).toMatchObject({ isEntry: false, skipSelf: true });
  });

  it('astro.config.mjs branche le plugin et lit src/lib/markdownOptions.mjs', async () => {
    const { default: config } = await import('../../astro.config.mjs');
    // Un seul objet d'options markdown, partagé avec l'aperçu (R7, D138).
    expect(config.markdown).toBe(markdownOptions);
    const names = (config.vite?.plugins ?? []).flat().map((p: any) => p?.name);
    expect(names).toContain('admin-lib-copy');
    // Pré-regroupés en dev comme Sveltia (D132) : chargés par /admin/ seulement.
    expect(config.vite?.optimizeDeps?.include).toEqual(
      expect.arrayContaining(['@sveltia/cms', '@astrojs/markdown-remark', 'rehype-slug', 'rehype-autolink-headings']),
    );
  });
});
