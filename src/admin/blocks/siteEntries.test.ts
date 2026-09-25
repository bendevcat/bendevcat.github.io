import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from '@astrojs/markdown-remark';
import { parse } from 'yaml';
import siteEntries from 'virtual:bencat-site-entries';
import { readSiteEntries } from '../../lib/blocks/readSiteEntries.mjs';
import {
  entryHref,
  entryRef,
  missingCardText,
  resetSiteEntries,
  siteEntriesProvider,
} from '../../lib/blocks/siteEntries.mjs';
import { ENTRY_BASE_PATHS, ENTRY_COLLECTIONS } from '../../lib/blocks/syntax.mjs';
import { renderBody } from '../previews/markdown';
import { SITE_ENTRIES_ID, siteEntriesModule, siteEntriesModuleSource } from '../viteSiteEntries.mjs';
import { provideAdminEntries } from './editorComponents';

/**
 * Index des entrées de `/admin/` (plan 23, T4, R6 ; D152) : module virtuel
 * construit au build par src/admin/viteSiteEntries.mjs, fournisseur de
 * l'aperçu en mode `preview`. Comptes lus sur le disque, jamais figés (D131).
 */
const CONTENT_DIR = new URL('../../content/', import.meta.url);

/** Chaque `src/content/<collection>/<slug>/index.md` : ref et `draft`. */
function diskIndex(): { ref: string; draft: boolean }[] {
  return readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((collection) => {
      const dir = new URL(`${collection.name}/`, CONTENT_DIR);
      return readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && existsSync(new URL(`${d.name}/index.md`, dir)))
        .map((d) => {
          const { frontmatter } = parseFrontmatter(readFileSync(new URL(`${d.name}/index.md`, dir), 'utf8'));
          return { ref: `${collection.name}/${d.name}`, draft: frontmatter.draft === true };
        });
    });
}

function loadCmsConfig(): { collections: { name: string; preview_path?: string; folder: string }[] } {
  return parse(readFileSync(new URL('../../../public/admin/config.yml', import.meta.url), 'utf8'));
}

afterEach(() => resetSiteEntries());

describe('index des entrées de /admin/ (module virtuel)', () => {
  it('module virtuel = entrées lues sur disque (13, brouillons marqués)', () => {
    const disk = diskIndex();
    // Le même index que le lecteur du site, champ pour champ.
    expect(siteEntries).toEqual(readSiteEntries());
    // Une entrée par fichier index.md des collections qu'une carte peut viser.
    expect(siteEntries.map(entryRef).sort()).toEqual(disk.map((e) => e.ref).sort());
    expect(new Set(siteEntries.map((e) => e.collection))).toEqual(new Set(ENTRY_COLLECTIONS));
    // Brouillons marqués tels que le frontmatter les déclare.
    const drafts = siteEntries.filter((e) => e.draft).map(entryRef).sort();
    expect(drafts).toEqual(disk.filter((e) => e.draft).map((e) => e.ref).sort());
    expect(drafts.length).toBeGreaterThan(0);
    // Titre et description remplis pour chaque entrée.
    for (const entry of siteEntries) {
      expect(entry.title, entryRef(entry)).not.toBe('');
      expect(entry.description, entryRef(entry)).not.toBe('');
    }
    // Figé : l'aperçu ne peut pas le modifier.
    expect(Object.isFrozen(siteEntries)).toBe(true);
    expect(Object.isFrozen(siteEntries[0])).toBe(true);
  });

  it('source du module : les seuls champs de l’index, aucun chemin /src/content/', () => {
    const source = siteEntriesModuleSource(readSiteEntries());
    expect(source).not.toContain('/src/content/');
    const extra = siteEntriesModuleSource([
      { collection: 'blog', id: 'x', title: 'T', description: 'D', draft: false, body: 'secret' } as never,
    ]);
    expect(extra).not.toContain('secret');
  });

  it('plugin : résout l’id virtuel pour src/admin/ seulement, relit le disque au chargement', () => {
    const root = fileURLToPath(new URL('../../../', import.meta.url));
    let reads = 0;
    const plugin = siteEntriesModule({
      root,
      read: () => {
        reads += 1;
        return [{ collection: 'blog', id: 'a', title: 'A', description: '', draft: true }];
      },
    });
    const errors: string[] = [];
    const ctx = {
      error(message: string): never {
        errors.push(message);
        throw new Error(message);
      },
    };
    const resolveId = plugin.resolveId as unknown as (this: typeof ctx, source: string, importer?: string) => string | null;
    const load = plugin.load as unknown as (id: string) => string | null;

    const id = resolveId.call(ctx, SITE_ENTRIES_ID, `${root}src/admin/cms.ts`);
    expect(id).toBe(`\0${SITE_ENTRIES_ID}`);
    expect(resolveId.call(ctx, 'autre', `${root}src/admin/cms.ts`)).toBeNull();
    expect(() => resolveId.call(ctx, SITE_ENTRIES_ID, `${root}src/pages/index.astro`)).toThrow();
    expect(errors[0]).toMatch(/réservé à src\/admin\//);

    expect(load('autre')).toBeNull();
    expect(load(id as string)).toContain('"draft":true');
    expect(reads).toBe(1);
  });
});

describe('aperçu : blocs Carte avec l’index de /admin/', () => {
  it('aperçu : ref inconnue → carte d’erreur, pas d’exception', async () => {
    provideAdminEntries(siteEntries);
    expect(siteEntriesProvider()?.mode).toBe('preview');

    const html = await renderBody(':::carte{ref="blog/inexistant"}\n:::\n');
    expect(html).toContain(missingCardText('blog/inexistant'));
    expect(html).not.toContain('href="/blog/inexistant/"');

    // Une ref connue — brouillon compris — est rendue normalement.
    for (const entry of [siteEntries.find((e) => !e.draft), siteEntries.find((e) => e.draft)]) {
      if (!entry) throw new Error('index sans entrée publiée ou sans brouillon');
      const ref = entryRef(entry);
      const card = await renderBody(`:::carte{ref="${ref}"}\n:::\n`);
      expect(card, ref).toContain(`data-entry-card="${ref}"`);
      expect(card, ref).toContain(`href="${entryHref(ref)}"`);
      expect(card, ref).not.toContain('Entrée introuvable');
    }
  });

  it('chemins de carte = preview_path de config.yml', () => {
    const config = loadCmsConfig();
    const byName = new Map(config.collections.map((c) => [c.name, c]));
    expect(Object.keys(ENTRY_BASE_PATHS).sort()).toEqual([...ENTRY_COLLECTIONS].sort());
    for (const collection of ENTRY_COLLECTIONS) {
      const preview = byName.get(collection)?.preview_path;
      expect(preview, collection).toMatch(/^\/[a-z]+\/\{\{slug\}\}$/);
      expect(ENTRY_BASE_PATHS[collection], collection).toBe((preview as string).replace('{{slug}}', ''));
    }
    // Chaque entrée de l'index : lien de carte = preview_path rempli + barre finale.
    for (const entry of siteEntries) {
      const preview = byName.get(entry.collection)?.preview_path as string;
      expect(entryHref(entryRef(entry)), entryRef(entry)).toBe(`${preview.replace('{{slug}}', entry.id)}/`);
    }
  });
});
