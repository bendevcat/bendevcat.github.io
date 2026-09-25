import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import {
  TEST_REPO_ROOT,
  TEST_REPO_SEED_MARKER,
  contentFiles,
  repoPath,
  writeTestRepo,
  type DirectoryHandleLike,
  type SeedFile,
} from './testRepo';

/**
 * Dépôt de test de Sveltia CMS en dev (plan 19, T5). Le backend `test-repo` de
 * Sveltia 0.221.0 lit ses fichiers dans l'OPFS, sous le dossier
 * `sveltia-cms-test/<chemin du dépôt>` : `testRepo.ts` y recopie
 * `src/content/**` avant `CMS.init()`. Le faux ci-dessous imite le sous-ensemble
 * de `FileSystemDirectoryHandle` utilisé (création de dossiers et de fichiers,
 * suppression récursive, `createWritable`).
 */
class FakeDir implements DirectoryHandleLike {
  readonly dirs = new Map<string, FakeDir>();
  readonly files = new Map<string, string | Blob>();

  async getDirectoryHandle(name: string, { create = false } = {}): Promise<FakeDir> {
    let dir = this.dirs.get(name);
    if (!dir) {
      if (!create) throw new DOMException(`${name} absent`, 'NotFoundError');
      dir = new FakeDir();
      this.dirs.set(name, dir);
    }
    return dir;
  }

  async getFileHandle(name: string, { create = false } = {}) {
    if (!this.files.has(name) && !create) throw new DOMException(`${name} absent`, 'NotFoundError');
    return {
      createWritable: async () => {
        let data: string | Blob = '';
        return {
          write: async (chunk: string | Blob) => {
            data = chunk;
          },
          close: async () => {
            this.files.set(name, data);
          },
        };
      },
    };
  }

  async removeEntry(name: string, { recursive = false } = {}): Promise<void> {
    const dir = this.dirs.get(name);
    if (dir) {
      if (!recursive && (dir.dirs.size || dir.files.size)) throw new DOMException('non vide', 'InvalidModificationError');
      this.dirs.delete(name);
    } else if (!this.files.delete(name)) {
      throw new DOMException(`${name} absent`, 'NotFoundError');
    }
  }

  /** Tous les fichiers sous ce dossier, `chemin → contenu`, chemins triés. */
  tree(prefix = ''): Record<string, string | Blob> {
    const out: Record<string, string | Blob> = {};
    for (const [name, data] of this.files) out[`${prefix}${name}`] = data;
    for (const [name, dir] of this.dirs) Object.assign(out, dir.tree(`${prefix}${name}/`));
    return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
  }
}

const ROOT = new URL('../../../', import.meta.url).pathname;

/** Fichiers de `src/content/` sur disque (hors fichiers cachés), chemins du dépôt. */
function contentOnDisk(dir = join(ROOT, 'src', 'content')): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...contentOnDisk(path));
    else out.push(relative(ROOT, path).split(sep).join('/'));
  }
  return out.sort();
}

const file = (path: string, data: string | Blob): SeedFile => ({ path, load: async () => data });

describe('dépôt de test (dev) : correspondance des chemins', () => {
  it('écrit sous sveltia-cms-test/, le dossier OPFS lu par le backend test-repo de Sveltia', () => {
    expect(TEST_REPO_ROOT).toBe('sveltia-cms-test');
  });

  it('mappe une clé de glob /src/content/… vers le chemin du dépôt src/content/…', () => {
    expect(repoPath('/src/content/blog/k9s/index.md')).toBe('src/content/blog/k9s/index.md');
    expect(repoPath('/src/content/blog/k9s/k9s-header.png')).toBe('src/content/blog/k9s/k9s-header.png');
    expect(() => repoPath('/src/pages/index.astro')).toThrow(/src\/content/);
    expect(() => repoPath('/src/content/../pages/x.md')).toThrow(/src\/content/);
  });

  it('couvre tout src/content : chaque fichier du disque, une fois, au même chemin', () => {
    const paths = contentFiles().map((f) => f.path);
    expect([...paths].sort()).toEqual(contentOnDisk());
    expect(paths.filter((p) => p.endsWith('/index.md')).length).toBe(13);
  });

  it('charge le markdown tel quel (octet pour octet)', async () => {
    const md = contentFiles().find((f) => f.path === 'src/content/blog/k9s-kubernetes-terminal-ui/index.md');
    expect(md).toBeDefined();
    expect(await md!.load()).toBe(readFileSync(join(ROOT, md!.path), 'utf8'));
  });

  it('expose un marqueur d’amorçage non vide (absent du build : scripts/check-admin.mjs)', () => {
    expect(TEST_REPO_SEED_MARKER).toMatch(/^[\w-]{12,}$/);
  });
});

describe('dépôt de test (dev) : écriture OPFS', () => {
  it('crée les dossiers intermédiaires et écrit chaque fichier sous sveltia-cms-test/', async () => {
    const storage = new FakeDir();
    const blob = new Blob(['png']);
    const n = await writeTestRepo(storage, [
      file('src/content/blog/a/index.md', '# A'),
      file('src/content/blog/a/cover.png', blob),
      file('src/content/skills/s/index.md', '# S'),
    ]);
    expect(n).toBe(3);
    expect([...storage.dirs.keys()]).toEqual(['sveltia-cms-test']);
    expect(storage.tree()).toEqual({
      'sveltia-cms-test/src/content/blog/a/cover.png': blob,
      'sveltia-cms-test/src/content/blog/a/index.md': '# A',
      'sveltia-cms-test/src/content/skills/s/index.md': '# S',
    });
  });

  it('repart d’un dossier vide : un fichier laissé par une session précédente disparaît', async () => {
    const storage = new FakeDir();
    await writeTestRepo(storage, [file('src/content/blog/vieux/index.md', 'ancien')]);
    await writeTestRepo(storage, [file('src/content/blog/a/index.md', '# A')]);
    expect(Object.keys(storage.tree())).toEqual(['sveltia-cms-test/src/content/blog/a/index.md']);
  });

  it('ne touche pas au reste de l’OPFS', async () => {
    const storage = new FakeDir();
    await (await storage.getDirectoryHandle('autre', { create: true })).getFileHandle('x', { create: true });
    storage.dirs.get('autre')!.files.set('x', 'garde');
    await writeTestRepo(storage, [file('src/content/blog/a/index.md', '# A')]);
    expect(storage.tree()['autre/x']).toBe('garde');
  });
});
