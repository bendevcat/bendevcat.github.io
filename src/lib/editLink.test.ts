import { describe, it, expect, vi } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { AUTHOR_KEY, AUTHOR_VALUE, EDIT_COLLECTIONS, editHref, isAuthor, markAuthor, revealEditLinks } from './editLink';

/**
 * Plan 22, T5 (R16). Le lien ✏️ Éditer des pages de détail ouvre l'entrée
 * dans Sveltia 0.221 ; il n'est montré que si `/admin/` a posé le marqueur
 * `localStorage['bencat:author']` (commodité, jamais un contrôle d'accès).
 */

const ROOT = new URL('../../', import.meta.url);
const loadCmsConfig = (): any => parse(readFileSync(new URL('public/admin/config.yml', ROOT), 'utf8'));

/**
 * Réplique, pour notre config (ni i18n, ni `index_file`, ni `nested`), de
 * `getEntryPathRegEx` / `getFilePathMatcher` (`contents/file/config.js` de
 * Sveltia 0.221, `npm/index.js.map`) : `^<folder>/(?<subPath><path, {{…}} →
 * [^/]+?>)\.md$`. Le `subPath` capturé est celui que la liste d'entrées ouvre
 * (`entry-list-item.svelte` : `goto('/collections/<name>/entries/<subPath>')`).
 */
function sveltiaSubPath(folder: string, pathTemplate: string, file: string): string | undefined {
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  const sub = escape(pathTemplate).replace(/\\\{\\\{[^}]+\\\}\\\}/g, '[^/]+?');
  return file.match(new RegExp(`^${escape(folder)}\\/(?<subPath>${sub})\\.md$`))?.groups?.subPath;
}

/**
 * Relecture d'un href comme Sveltia 0.221 : `parseLocation`
 * (`app/navigation.js` : le hash devient un chemin, `decodeURIComponent`)
 * puis le motif de route de `contents/navigation.js`.
 */
function readRoute(href: string) {
  const { origin, hash } = new URL(href, 'https://bendevcat.github.io');
  const { pathname } = new URL(`${origin}${hash.substring(1)}`);
  const path = decodeURIComponent(pathname.replace(/(?!^)\/+$/, ''));
  return path.match(
    /^\/collections(?:\/(?<_collectionName>[^/]+)(?:\/(?<routeType>new|entries|filter))?(?:\/(?<subPath>.+?))?)?$/,
  )?.groups;
}

describe("lien d'édition (plan 22, T5)", () => {
  it("href d'édition = route d'entrée de config.yml (path {{slug}}/index) pour les quatre collections", () => {
    const config = loadCmsConfig();
    expect([...EDIT_COLLECTIONS]).toEqual(['blog', 'projects', 'prompts', 'skills']);
    let checked = 0;
    for (const name of EDIT_COLLECTIONS) {
      const collection = config.collections.find((c: any) => c.name === name);
      expect(collection, name).toBeDefined();
      expect(collection.path).toBe('{{slug}}/index');
      expect(collection.index_file).toBeUndefined();
      expect(collection.nested).toBeUndefined();
      const folder = new URL(`${collection.folder}/`, ROOT);
      const ids = readdirSync(folder).filter((id) => existsSync(new URL(`${id}/index.md`, folder)));
      expect(ids.length, name).toBeGreaterThan(0);
      for (const id of ids) {
        const subPath = sveltiaSubPath(collection.folder, collection.path, `${collection.folder}/${id}/index.md`);
        expect(subPath).toBe(`${id}/index`);
        const href = editHref(name, id);
        expect(href).toBe(`/admin/#/collections/${name}/entries/${subPath}`);
        expect(readRoute(href)).toEqual({ _collectionName: name, routeType: 'entries', subPath });
        checked += 1;
      }
    }
    expect(checked).toBe(13);
  });

  it('un id hors [a-z0-9-] est encodé puis relu tel quel par Sveltia', () => {
    const href = editHref('blog', 'été & #1');
    expect(href).toBe('/admin/#/collections/blog/entries/%C3%A9t%C3%A9%20%26%20%231/index');
    expect(readRoute(href)?.subPath).toBe('été & #1/index');
  });

  it('cms.ts pose le marqueur bencat:author avant init', () => {
    const cms = readFileSync(new URL('../admin/cms.ts', import.meta.url), 'utf8');
    expect(cms).toMatch(/^import\s*\{[^}]*\bmarkAuthor\b[^}]*\}\s*from\s*'\.\.\/lib\/editLink';$/m);
    const calls = [...cms.matchAll(/^markAuthor\(\(\) => window\.localStorage\);$/gm)];
    expect(calls).toHaveLength(1);
    const call = calls[0].index ?? -1;
    // Au niveau du module, hors de la branche dev : posé à CHAQUE chargement de /admin/.
    expect(call).toBeLessThan(cms.indexOf('if (import.meta.env.DEV'));
    for (const init of cms.matchAll(/CMS\.init\(/g)) expect(call).toBeLessThan(init.index ?? 0);
    expect(AUTHOR_KEY).toBe('bencat:author');
    expect(AUTHOR_VALUE).toBe('1');
  });
});

/** `Storage` factice : `getItem` / `setItem` sur une Map. */
function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: vi.fn((key: string) => map.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => void map.set(key, value)),
  };
}

const throwing = () => {
  throw new DOMException('The operation is insecure.', 'SecurityError');
};

describe('marqueur auteur', () => {
  it("isAuthor : vrai pour '1' seulement ; toute erreur → faux (navigation privée, stockage bloqué)", () => {
    expect(isAuthor(() => fakeStorage({ [AUTHOR_KEY]: '1' }))).toBe(true);
    expect(isAuthor(() => fakeStorage())).toBe(false);
    for (const other of ['0', 'true', ' 1', '']) expect(isAuthor(() => fakeStorage({ [AUTHOR_KEY]: other }))).toBe(false);
    expect(isAuthor(throwing)).toBe(false);
    expect(isAuthor(() => ({ getItem: throwing }))).toBe(false);
    expect(isAuthor(() => undefined as unknown as Storage)).toBe(false);
  });

  it("markAuthor : pose '1' ; une erreur de stockage est avalée", () => {
    const storage = fakeStorage();
    markAuthor(() => storage);
    expect(storage.map.get(AUTHOR_KEY)).toBe('1');
    expect(() => markAuthor(throwing)).not.toThrow();
    expect(() => markAuthor(() => ({ setItem: throwing }))).not.toThrow();
  });

  it('revealEditLinks : retire hidden des [data-edit-link] avec le marqueur, rien sans', () => {
    const page = () => {
      const links = [{ hidden: true }, { hidden: true }];
      const root = { querySelectorAll: vi.fn((_selector: string) => links) };
      return { links, root };
    };
    const marked = page();
    expect(revealEditLinks(marked.root, () => fakeStorage({ [AUTHOR_KEY]: '1' }))).toBe(2);
    expect(marked.root.querySelectorAll).toHaveBeenCalledWith('a[data-edit-link]');
    expect(marked.links.map((l) => l.hidden)).toEqual([false, false]);

    for (const storage of [() => fakeStorage(), throwing]) {
      const visitor = page();
      expect(revealEditLinks(visitor.root, storage)).toBe(0);
      expect(visitor.links.map((l) => l.hidden)).toEqual([true, true]);
    }
  });
});
