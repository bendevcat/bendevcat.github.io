import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import {
  CONTENTS_REQUEST,
  GITHUB_BRANCH,
  GITHUB_REPO,
  contentsApiUrl,
  createPreviousEntries,
  githubReader,
  parseCommittedFile,
  type Fetcher,
} from './previousEntry';
import { readWorkingTreeFile } from './dev/testRepo';

/**
 * État précédent d'une entrée (plan 22, R5 ; D149) : le dernier fichier engagé
 * au chemin de l'entrée — mémoire `postSave`, sinon l'arbre de travail (dev),
 * sinon l'API contents de GitHub sans jeton (prod).
 */
const K9S = 'src/content/blog/k9s-kubernetes-terminal-ui/index.md';
const root = new URL('../../', import.meta.url);

/** Faux `fetch` : enregistre les appels, répond ce qu'on lui dit. */
function fakeFetch(respond: () => { status: number; body?: string } | Error) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetcher: Fetcher = async (url, init) => {
    calls.push({ url, init });
    const r = respond();
    if (r instanceof Error) throw r;
    return { ok: r.status >= 200 && r.status < 300, status: r.status, text: async () => r.body ?? '' };
  };
  return { fetcher, calls };
}

describe('état précédent (règles de date)', () => {
  it('lit le fichier comme Sveltia (trim, corps sans saut initial)', () => {
    const text = '\n---\r\ntitle: k9s\r\ndraft: false\r\nversion: 1.0\r\n---\r\n\r\nCorps.\r\n\r\n---\r\n\r\nSuite.\r\n\n';
    expect(parseCommittedFile(text)).toEqual({
      title: 'k9s',
      draft: false,
      version: 1,
      body: 'Corps.\n\n---\n\nSuite.',
    });
    // Sans ligne vide après le `---` fermant, sans corps.
    expect(parseCommittedFile('---\ntitle: x\n---\nCorps.\n')).toEqual({ title: 'x', body: 'Corps.' });
    expect(parseCommittedFile('---\ntitle: x\n---\n')).toEqual({ title: 'x', body: undefined });
    // Un vrai fichier du dépôt.
    const k9s = parseCommittedFile(readFileSync(new URL(K9S, root), 'utf8'));
    expect(k9s.draft).toBe(false);
    expect(k9s.body).toMatch(/^Gérer un cluster Kubernetes/);
    expect(k9s.body).not.toMatch(/\n$/);
  });

  it('la mémoire postSave prime', async () => {
    const reader = vi.fn(async () => '---\ntitle: Ancien\ndraft: false\n---\n\nAncien corps.\n');
    const previous = createPreviousEntries(reader);

    expect(await previous.lookup(K9S)).toEqual({
      kind: 'found',
      data: { title: 'Ancien', draft: false, body: 'Ancien corps.' },
    });
    expect(reader).toHaveBeenCalledTimes(1);

    const saved = { title: 'Neuf', draft: false, body: 'Nouveau corps.' };
    previous.remember(K9S, saved);
    saved.body = 'modifié après coup';
    expect(await previous.lookup(K9S)).toEqual({
      kind: 'found',
      data: { title: 'Neuf', draft: false, body: 'Nouveau corps.' },
    });
    expect(reader).toHaveBeenCalledTimes(1);

    // Mémoire par chemin ; lecteur absent ou en échec → nouveau / inconnu.
    const other = createPreviousEntries(async (path) => {
      if (path.endsWith('absent/index.md')) return null;
      throw new Error('hors ligne');
    });
    expect(await other.lookup('src/content/blog/absent/index.md')).toEqual({ kind: 'new' });
    expect(await other.lookup(K9S)).toEqual({ kind: 'unknown' });
  });

  it('prod : API contents GitHub sans jeton, cache no-store, 404 = nouveau, échec = inconnu', async () => {
    const ok = fakeFetch(() => ({ status: 200, body: '---\ndraft: false\n---\n\nCorps.\n' }));
    expect(await createPreviousEntries(githubReader(ok.fetcher)).lookup(K9S)).toEqual({
      kind: 'found',
      data: { draft: false, body: 'Corps.' },
    });
    expect(ok.calls).toHaveLength(1);
    const [{ url, init }] = ok.calls;
    expect(url).toBe(
      'https://api.github.com/repos/bendevcat/bendevcat.github.io/contents/src/content/blog/k9s-kubernetes-terminal-ui/index.md?ref=main',
    );
    expect(init).toEqual({
      headers: { Accept: 'application/vnd.github.raw+json' },
      cache: 'no-store',
      credentials: 'omit',
    });
    expect(init).toBe(CONTENTS_REQUEST);
    const headers = new Headers(init.headers);
    expect(headers.has('Authorization')).toBe(false);
    expect([...headers.keys()]).toEqual(['accept']);

    // Segments encodés.
    expect(contentsApiUrl('src/content/blog/é t#é/index.md')).toBe(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/src/content/blog/%C3%A9%20t%23%C3%A9/index.md?ref=main`,
    );

    const missing = fakeFetch(() => ({ status: 404 }));
    expect(await createPreviousEntries(githubReader(missing.fetcher)).lookup(K9S)).toEqual({ kind: 'new' });

    for (const failure of [{ status: 403 }, { status: 500 }, new TypeError('Failed to fetch')]) {
      const failing = fakeFetch(() => failure);
      expect(await createPreviousEntries(githubReader(failing.fetcher)).lookup(K9S)).toEqual({ kind: 'unknown' });
    }
  });

  it('dépôt et branche = backend de config.yml', () => {
    const config = parse(readFileSync(new URL('public/admin/config.yml', root), 'utf8'));
    expect(config.backend.name).toBe('github');
    expect(GITHUB_REPO).toBe(config.backend.repo);
    expect(GITHUB_BRANCH).toBe(config.backend.branch);
  });

  it('tableau de test : l’arbre de travail, par le glob ?raw de l’amorçage', async () => {
    expect(await readWorkingTreeFile(K9S)).toBe(readFileSync(new URL(K9S, root), 'utf8'));
    expect(await readWorkingTreeFile('src/content/blog/absent/index.md')).toBeNull();
    expect(await createPreviousEntries(readWorkingTreeFile).lookup(K9S)).toMatchObject({
      kind: 'found',
      data: { draft: false },
    });
  });
});
