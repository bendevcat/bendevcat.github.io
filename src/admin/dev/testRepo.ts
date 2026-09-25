/**
 * Dépôt de test de Sveltia CMS, en dev seulement (plan 19, T5 — R5/R6).
 *
 * `/admin/?test-repo` sous `astro dev` : `cms.ts` importe dynamiquement ce
 * module, recopie `src/content/**` dans l'OPFS du navigateur puis lance
 * `CMS.init({ config: { backend: { name: 'test-repo' } } })`. Le bouton
 * « Work with Test Repository » ouvre alors le vrai tableau, sans jeton ni
 * sélecteur de dossier.
 *
 * Contrat lu dans `@sveltia/cms` 0.221.0 (`npm/index.js`) : le backend
 * `test-repo` ouvre au `signIn` le dossier `sveltia-cms-test` de
 * `navigator.storage.getDirectory()`, puis `fetchFiles` le parcourt comme un
 * dépôt local — chemins relatifs à ce dossier, donc `src/content/blog/…`
 * comme dans `config.yml`. Les fichiers sont lus à la connexion, pas au
 * chargement : il suffit qu'ils soient écrits avant `init()`. La
 * déconnexion supprime ce dossier ; ce module le vide lui aussi à chaque
 * chargement (tableau de démonstration, remis à l'état du dépôt).
 *
 * Jamais dans le build : la branche `import.meta.env.DEV` de `cms.ts` est
 * éliminée en production avec son `import()`. `scripts/check-admin.mjs`
 * (ligne « dev-only ») vérifie qu'aucun `dist/_astro/*.js` ne contient le
 * marqueur ci-dessous ni une clé `/src/content/`.
 */

/** Marqueur propre à ce module ; sa présence dans `dist/` trahirait une fuite. */
export const TEST_REPO_SEED_MARKER = 'bencat-test-repo-seed';

/** Dossier OPFS lu par le backend `test-repo` de Sveltia 0.221.0. */
export const TEST_REPO_ROOT = 'sveltia-cms-test';

/** Un fichier à écrire : chemin dans le dépôt et chargement de son contenu. */
export interface SeedFile {
  path: string;
  load: () => Promise<string | Blob>;
}

/** Sous-ensemble de `FileSystemWritableFileStream` utilisé ici. */
interface WritableLike {
  write(data: string | Blob): Promise<void>;
  close(): Promise<void>;
}

/** Sous-ensemble de `FileSystemDirectoryHandle` utilisé ici (facilite les tests). */
export interface DirectoryHandleLike {
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryHandleLike>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<{ createWritable(): Promise<WritableLike> }>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
}

// Globs paresseux : rien n'est chargé tant que `load()` n'est pas appelé.
const MARKDOWN = import.meta.glob<string>('/src/content/**/*.md', { query: '?raw', import: 'default' });
const ASSETS = import.meta.glob<string>(['/src/content/**/*', '!/src/content/**/*.md'], {
  query: '?url',
  import: 'default',
});

/** Clé de glob `/src/content/…` → chemin du dépôt `src/content/…`. */
export function repoPath(globKey: string): string {
  const segments = globKey.split('/').slice(3);
  const inside = globKey.startsWith('/src/content/') && segments.every((s) => s !== '' && s !== '.' && s !== '..');
  if (!inside) {
    throw new Error(`test-repo: chemin hors de /src/content/ : ${globKey}`);
  }
  return globKey.slice(1);
}

/** Tous les fichiers de `src/content/` : markdown en texte brut, le reste en binaire. */
export function contentFiles(): SeedFile[] {
  return [
    ...Object.entries(MARKDOWN).map(([key, load]) => ({ path: repoPath(key), load })),
    ...Object.entries(ASSETS).map(([key, url]) => ({
      path: repoPath(key),
      load: async () => {
        const res = await fetch(await url());
        if (!res.ok) throw new Error(`test-repo: ${key} → HTTP ${res.status}`);
        return res.blob();
      },
    })),
  ];
}

/**
 * Vide puis remplit `<storage>/sveltia-cms-test/` avec `files`. Le reste de
 * l'OPFS n'est pas touché. Renvoie le nombre de fichiers écrits.
 */
export async function writeTestRepo(storage: DirectoryHandleLike, files: SeedFile[]): Promise<number> {
  try {
    await storage.removeEntry(TEST_REPO_ROOT, { recursive: true });
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'NotFoundError')) throw error;
  }
  const root = await storage.getDirectoryHandle(TEST_REPO_ROOT, { create: true });
  const contents = await Promise.all(files.map((f) => f.load()));
  for (const [i, { path }] of files.entries()) {
    const segments = path.split('/');
    const name = segments.pop()!;
    let dir = root;
    for (const segment of segments) dir = await dir.getDirectoryHandle(segment, { create: true });
    const writable = await (await dir.getFileHandle(name, { create: true })).createWritable();
    try {
      await writable.write(contents[i]);
    } finally {
      await writable.close();
    }
  }
  return files.length;
}

/** Recopie `src/content/**` dans l'OPFS du navigateur, sous `sveltia-cms-test/`. */
export async function seedTestRepo(): Promise<number> {
  const storage = (await navigator.storage.getDirectory()) as unknown as DirectoryHandleLike;
  const count = await writeTestRepo(storage, contentFiles());
  console.info(`[${TEST_REPO_SEED_MARKER}] ${count} fichiers de src/content copiés dans l'OPFS ${TEST_REPO_ROOT}/`);
  return count;
}
