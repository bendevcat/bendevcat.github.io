import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { markdownOptions } from '../markdownOptions.mjs';
import { blocksBuildCheck, checkBlocksOnDisk } from './buildCheck.mjs';
import { readSiteEntries } from './readSiteEntries.mjs';
import { provideSiteEntries } from './siteEntries.mjs';

/**
 * Le build échoue sur un bloc invalide (plan 23, T1, R3) même si le chargeur
 * de contenu d'Astro n'a fait que journaliser l'erreur de rendu : contrôle
 * `astro:build:start` sur les fichiers du disque.
 */
const FIXTURE = readFileSync(new URL('./fixtures/blocs-demo.md', import.meta.url), 'utf8');
const PROJECT = '---\ntitle: gha-svu\ndescription: Une action.\n---\nCorps.\n';
const DRAFT = '---\ntitle: Brouillon\ndescription: d\ndraft: true\n---\nCorps.\n';

let root: string;
let contentDir: URL;

function write(path: string, text: string) {
  const file = join(root, path);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, text);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'blocs-'));
  contentDir = pathToFileURL(`${root}/`);
  write('projects/gha-svu/index.md', PROJECT);
  write('blog/brouillon/index.md', DRAFT);
  provideSiteEntries({ mode: 'site', entries: () => readSiteEntries(contentDir) });
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('contrôle des blocs au build', () => {
  it('sans conteneur `:::` dans le contenu : rien n’est rendu', async () => {
    await expect(checkBlocksOnDisk({ markdown: markdownOptions, contentDir })).resolves.toEqual([]);
  });

  it('la fixture passe ; une ref inconnue échoue en nommant le fichier et la ref', async () => {
    write('blog/blocs-demo/index.md', FIXTURE);
    const checked = await checkBlocksOnDisk({ markdown: markdownOptions, contentDir });
    expect(checked).toHaveLength(1);
    expect(checked[0]).toMatch(/blocs-demo\/index\.md$/);

    write('blog/blocs-demo/index.md', FIXTURE.replace('projects/gha-svu', 'blog/inexistant'));
    await expect(checkBlocksOnDisk({ markdown: markdownOptions, contentDir })).rejects.toThrow(
      /blocs-demo\/index\.md[\s\S]*blog\/inexistant/,
    );
  });

  it('un brouillon cité par un article publié échoue ; cité par un brouillon, non', async () => {
    write('blog/blocs-demo/index.md', FIXTURE.replace('projects/gha-svu', 'blog/brouillon'));
    await expect(checkBlocksOnDisk({ markdown: markdownOptions, contentDir })).rejects.toThrow(/blog\/brouillon/);
    write('blog/blocs-demo/index.md', FIXTURE.replace('projects/gha-svu', 'blog/brouillon').replace('draft: false', 'draft: true'));
    await expect(checkBlocksOnDisk({ markdown: markdownOptions, contentDir })).resolves.toHaveLength(1);
  });

  it('intégration Astro : le contrôle tourne à astro:build:start', () => {
    const integration = blocksBuildCheck(markdownOptions);
    expect(Object.keys(integration.hooks)).toEqual(['astro:build:start']);
  });

  it('astro.config.mjs installe l’intégration et le lecteur disque en mode site', async () => {
    const { default: config } = await import('../../../astro.config.mjs');
    expect((config.integrations ?? []).map((i) => (i as { name: string }).name)).toContain('bencat:blocks-build-check');
    const { siteEntriesProvider } = await import('./siteEntries.mjs');
    expect(siteEntriesProvider()?.mode).toBe('site');
  });
});
