/**
 * État précédent d'une entrée à la sauvegarde (plan 22, T3 — R5 ; D149).
 *
 * `preSave` ne reçoit que les données neuves : les règles de date
 * (`dateRules.ts`) comparent donc au **dernier fichier engagé** au chemin de
 * l'entrée (`entry.get('path')`, `src/content/<collection>/<slug>/index.md`).
 * Sources, dans l'ordre :
 *
 * 1. la mémoire de la session, remplie par `postSave` avec les données que
 *    Sveltia vient d'écrire (une deuxième sauvegarde compare à la première,
 *    même si l'API GitHub sert encore l'ancienne version) ;
 * 2. sur le tableau de test (dev, `?test-repo`), l'arbre de travail, lu par le
 *    glob `?raw` qui amorce ce dépôt (`dev/testRepo.ts` `readWorkingTreeFile`)
 *    — lecteur posé par `cms.ts` dans sa branche `import.meta.env.DEV` ;
 * 3. sinon (production, ou dev sur le vrai backend), l'API contents publique
 *    de GitHub, **sans jeton** (celui
 *    de l'auteur n'est pas lu), `cache: 'no-store'`, `credentials: 'omit'` :
 *    404 = pas de fichier (nouvelle entrée), toute autre réponse ou erreur =
 *    inconnu. Réponse `access-control-allow-origin: *`, 60 requêtes/h par IP ;
 *    l'en-tête `Accept` choisi est « CORS-safelisted » (pas de pré-vol).
 *
 * Le fichier est lu exactement comme Sveltia 0.221 le lit
 * (`cmsFrontmatter.ts` `parseEntryText` : texte rogné, CRLF → LF, tête YAML,
 * un saut de ligne retiré devant le corps).
 */
import { parseEntryText } from '../lib/cmsFrontmatter';
import type { PreviousState } from './dateRules';

/** Backend de `public/admin/config.yml` (test : `previousEntry.test.ts`). */
export const GITHUB_REPO = 'bendevcat/bendevcat.github.io';
export const GITHUB_BRANCH = 'main';

/** Lit un fichier du dépôt en texte ; `null` s'il n'existe pas. */
export type FileReader = (path: string) => Promise<string | null>;

export type Fetcher = (url: string, init: RequestInit) => Promise<Pick<Response, 'ok' | 'status' | 'text'>>;

/** Données de l'entrée telles que Sveltia les lit dans `text` (corps sous `body`). */
export function parseCommittedFile(text: string): Record<string, unknown> {
  return parseEntryText(text);
}

/** URL de l'API contents pour un chemin du dépôt, chaque segment encodé. */
export function contentsApiUrl(path: string): string {
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return `https://api.github.com/repos/${GITHUB_REPO}/contents/${encoded}?ref=${encodeURIComponent(GITHUB_BRANCH)}`;
}

/** Requête exacte envoyée à GitHub : ni jeton, ni cookie, ni cache HTTP. */
export const CONTENTS_REQUEST: RequestInit = {
  headers: { Accept: 'application/vnd.github.raw+json' },
  cache: 'no-store',
  credentials: 'omit',
};

/** Le fichier engagé sur `main`, via l'API contents sans authentification. */
export function githubReader(fetcher: Fetcher = (url, init) => fetch(url, init)): FileReader {
  return async (path) => {
    const res = await fetcher(contentsApiUrl(path), CONTENTS_REQUEST);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GitHub contents ${path} → HTTP ${res.status}`);
    return res.text();
  };
}

export interface PreviousEntries {
  /** Retient ce qui vient d'être écrit à `path` (handler `postSave`). */
  remember(path: string, data: Record<string, unknown>): void;
  /** État engagé à `path` : mémoire, sinon le lecteur ; échec → `unknown`. */
  lookup(path: string): Promise<PreviousState>;
}

/**
 * `reader` : l'arbre de travail en dev, l'API GitHub sinon (défaut).
 */
export function createPreviousEntries(reader: FileReader = githubReader()): PreviousEntries {
  const memory = new Map<string, Record<string, unknown>>();
  return {
    remember(path, data) {
      memory.set(path, structuredClone(data));
    },
    async lookup(path) {
      const remembered = memory.get(path);
      if (remembered) return { kind: 'found', data: structuredClone(remembered) };
      try {
        const text = await reader(path);
        return text === null ? { kind: 'new' } : { kind: 'found', data: parseCommittedFile(text) };
      } catch {
        return { kind: 'unknown' };
      }
    },
  };
}
