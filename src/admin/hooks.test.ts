import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { PRE_SAVE_STEPS, createSaveHooks, normalizeBodyBeforeSave, type EntryMap } from './hooks';
import { createPreviousEntries, type FileReader } from './previousEntry';

/**
 * Hook `preSave` de Sveltia CMS (plan 19, R13). L'éditeur riche exporte tout
 * séparateur thématique en `***` : le hook réécrit le corps en `---` avant
 * l'écriture, sans quoi le test de garde (`thematicBreaks.test.ts`) — donc la
 * CI — passerait au rouge après une sauvegarde CMS.
 *
 * Sveltia 0.221.0 passe `{ author, entry }`, `entry` étant une Map Immutable
 * (`fromJS({ data, i18n, slug, … })`), et n'utilise la valeur de retour que si
 * c'est une Map. Le faux ci-dessous imite ce qu'en lit le hook : `get` et un
 * `setIn` qui renvoie une nouvelle Map sans toucher l'ancienne.
 */
class FakeMap implements EntryMap {
  /** Chemins passés à `setIn`, dans l'ordre, cumulés d'une Map à la suivante. */
  constructor(
    private readonly value: Record<string, unknown>,
    readonly writes: string[] = [],
  ) {}

  get(key: string): unknown {
    const v = this.value[key];
    return v !== null && typeof v === 'object' ? new FakeMap(v as Record<string, unknown>) : v;
  }

  setIn([head, ...rest]: string[], next: unknown): FakeMap {
    const current = this.value[head];
    const child =
      rest.length === 0
        ? next
        : new FakeMap((current ?? {}) as Record<string, unknown>).setIn(rest, next).toJS();
    return new FakeMap({ ...this.value, [head]: child }, [...this.writes, [head, ...rest].join('.')]);
  }

  toJS(): Record<string, unknown> {
    return structuredClone(this.value);
  }
}

const entryWith = (body: unknown) =>
  new FakeMap({ data: { title: 'Titre', body }, i18n: {}, slug: 'x', collection: 'blog' });

const bodyOf = (entry: EntryMap) => (entry as FakeMap).toJS().data as Record<string, unknown>;

describe('hook preSave : séparateurs thématiques', () => {
  it('réécrit en --- un séparateur *** ou ___ du corps, hors blocs de code', () => {
    const body = [
      'Intro.',
      '',
      '***',
      '',
      'Suite.',
      '',
      '___',
      '',
      '```md',
      '***',
      '___',
      '```',
      '',
      'Fin avec ***gras***.',
    ].join('\n');
    const entry = entryWith(body);
    const result = normalizeBodyBeforeSave({ author: {}, entry });

    expect(bodyOf(result)).toEqual({
      title: 'Titre',
      body: [
        'Intro.',
        '',
        '---',
        '',
        'Suite.',
        '',
        '---',
        '',
        '```md',
        '***',
        '___',
        '```',
        '',
        'Fin avec ***gras***.',
      ].join('\n'),
    });
    // Le reste de l'entrée est conservé, l'entrée reçue n'est pas modifiée.
    expect((result as FakeMap).toJS().slug).toBe('x');
    expect(bodyOf(entry).body).toBe(body);
  });

  it('insère une ligne vide avant --- si la ligne précédente est du texte', () => {
    const result = normalizeBodyBeforeSave({ author: {}, entry: entryWith('Texte\n***\n\nSuite.') });
    expect(bodyOf(result).body).toBe('Texte\n\n---\n\nSuite.');
  });

  it('rend l’entrée telle quelle quand le corps n’a rien à changer', () => {
    for (const body of ['Intro.\n\n---\n\nSuite.', '', undefined, 42]) {
      const entry = entryWith(body);
      expect(normalizeBodyBeforeSave({ author: {}, entry })).toBe(entry);
    }
    const noData = new FakeMap({ slug: 'x' });
    expect(normalizeBodyBeforeSave({ author: {}, entry: noData })).toBe(noData);
  });

  it('cms.ts enregistre ce hook sur preSave (dans le handler unique)', () => {
    const cms = readFileSync(new URL('./cms.ts', import.meta.url), 'utf8');
    expect(cms).toMatch(/import\s*\{[^}]*\bcreateSaveHooks\b[^}]*\}\s*from\s*'\.\/hooks'/);
    expect(cms).toMatch(/CMS\.registerEventListener\(\s*\{\s*name:\s*'preSave',\s*handler:\s*saveHooks\.preSave\s*,?\s*\}\s*\)/);
    // Enregistré avant init().
    expect(cms.indexOf('registerEventListener')).toBeLessThan(cms.indexOf('CMS.init('));
  });
});

/**
 * Plan 22 (T3, R6) : un seul `preSave` (séparateurs puis dates) et un
 * `postSave` qui retient ce qui a été écrit. Entrée comme la construit
 * Sveltia 0.221 (`createEntryMap`) : `data`, `path`, `newRecord`, `collection`.
 */
const K9S = 'src/content/blog/k9s-kubernetes-terminal-ui/index.md';
const MACOS = 'src/content/prompts/macos-clone/index.md';
const BODY = 'Intro.\n\n---\n\nSuite.';
const NOW = new Date('2026-09-25T12:03:07Z');

const saving = (collection: string, path: string, data: Record<string, unknown>, newRecord = false) =>
  new FakeMap({ data, i18n: {}, slug: 'x', path, newRecord, collection });

function hooksWith(files: Record<string, string | null | Error>) {
  const reader = vi.fn<FileReader>(async (path) => {
    const file = files[path];
    if (file instanceof Error) throw file;
    return file ?? null;
  });
  const warn = vi.fn();
  const hooks = createSaveHooks({ previous: createPreviousEntries(reader), now: () => NOW, warn });
  return { hooks, reader, warn };
}

const dataOf = (entry: EntryMap) => (entry as FakeMap).toJS().data as Record<string, unknown>;

describe('hooks de sauvegarde : séparateurs et dates', () => {
  it('un seul preSave : séparateurs puis dates', async () => {
    expect(PRE_SAVE_STEPS).toEqual(['séparateurs', 'dates']);
    const { hooks } = hooksWith({ [K9S]: `---\ntitle: k9s\ndraft: false\n---\n\n${BODY}\n` });

    // Corps modifié ET écrit en `***` : les deux étapes écrivent, dans l'ordre.
    const edited = await hooks.preSave({
      author: {},
      entry: saving('blog', K9S, { title: 'k9s', draft: false, body: 'Intro.\n\n***\n\nSuite. Un mot.' }),
    });
    expect((edited as FakeMap).writes).toEqual(['data.body', 'data.updatedDate']);
    expect(dataOf(edited)).toEqual({
      title: 'k9s',
      draft: false,
      body: 'Intro.\n\n---\n\nSuite. Un mot.',
      updatedDate: expect.stringMatching(/^2026-09-25T\d{2}:03:07[+-]\d{2}:\d{2}$/),
    });

    // Seuls les séparateurs diffèrent : la date ne bouge pas.
    const breaksOnly = await hooks.preSave({
      author: {},
      entry: saving('blog', K9S, { title: 'k9s', draft: false, body: 'Intro.\n\n***\n\nSuite.' }),
    });
    expect((breaksOnly as FakeMap).writes).toEqual(['data.body']);

    // Sauvegarde sans modification : l'entrée reçue, telle quelle.
    const unchanged = saving('blog', K9S, { title: 'k9s', draft: false, body: BODY });
    expect(await hooks.preSave({ author: {}, entry: unchanged })).toBe(unchanged);
  });

  it('prompt : version changée → updated, via le même preSave', async () => {
    const { hooks } = hooksWith({ [MACOS]: '---\ntitle: MacOS Clone\nversion: 0.9.0\ndraft: false\n---\n' });
    const result = await hooks.preSave({
      author: {},
      entry: saving('prompts', MACOS, { title: 'MacOS Clone', version: '1.0.0', draft: false }),
    });
    expect((result as FakeMap).writes).toEqual(['data.updated']);
    const same = saving('prompts', MACOS, { title: 'Autre titre', version: '0.9.0', draft: false });
    expect(await hooks.preSave({ author: {}, entry: same })).toBe(same);
  });

  it('ne cherche l’état précédent que si une règle peut s’appliquer ; inconnu → rien, un avertissement', async () => {
    const { hooks, reader, warn } = hooksWith({ [K9S]: new Error('hors ligne') });
    for (const entry of [
      saving('blog', K9S, { draft: false, body: 'Autre.' }, true),
      saving('blog', K9S, { draft: true, body: 'Autre.' }),
      saving('prompts', MACOS, { version: '' }),
      saving('skills', 'src/content/skills/superpowers/index.md', { version: '2.0.0', body: 'x' }),
      saving('projects', 'src/content/projects/gha-svu/index.md', { body: 'x' }),
    ]) {
      expect(await hooks.preSave({ author: {}, entry })).toBe(entry);
    }
    expect(reader).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();

    const entry = saving('blog', K9S, { draft: false, body: 'Autre.' });
    expect(await hooks.preSave({ author: {}, entry })).toBe(entry);
    expect(reader).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('postSave : la sauvegarde suivante compare à ce qui vient d’être écrit', async () => {
    const { hooks, reader } = hooksWith({ [K9S]: `---\ndraft: false\n---\n\n${BODY}\n` });
    const first = await hooks.preSave({ author: {}, entry: saving('blog', K9S, { draft: false, body: 'V2.' }) });
    expect(dataOf(first).updatedDate).toBeDefined();
    hooks.postSave({ author: {}, entry: first });

    // Même corps que la sauvegarde précédente : rien (l'arbre ou GitHub diraient BODY).
    const again = saving('blog', K9S, { draft: false, body: 'V2.', updatedDate: dataOf(first).updatedDate });
    expect(await hooks.preSave({ author: {}, entry: again })).toBe(again);
    const third = await hooks.preSave({ author: {}, entry: saving('blog', K9S, { draft: false, body: 'V3.' }) });
    expect((third as FakeMap).writes).toEqual(['data.updatedDate']);
    expect(reader).toHaveBeenCalledTimes(1);
  });

  it('cms.ts enregistre preSave et postSave avant init', () => {
    const cms = readFileSync(new URL('./cms.ts', import.meta.url), 'utf8');
    const registrations = [...cms.matchAll(/CMS\.registerEventListener\(\s*\{\s*name:\s*'(\w+)'/g)].map((m) => m[1]);
    expect(registrations).toEqual(['preSave', 'postSave']);
    expect(cms).toMatch(/name:\s*'postSave',\s*handler:\s*saveHooks\.postSave\b/);
    const init = cms.indexOf('CMS.init(');
    expect(init).toBeGreaterThan(0);
    for (const m of cms.matchAll(/CMS\.registerEventListener\(/g)) expect(m.index).toBeLessThan(init);
    // État précédent : GitHub par défaut ; l'arbre de travail seulement dans la
    // branche dev du tableau de test (import dynamique), avant son init().
    expect(cms).toMatch(/let readCommitted: FileReader = githubReader\(\);/);
    expect(cms).toMatch(/createPreviousEntries\(\(path\) => readCommitted\(path\)\)/);
    const dev = cms.slice(cms.indexOf("import('./dev/testRepo')"));
    expect(dev).toMatch(/^[\s\S]*?readCommitted = readWorkingTreeFile;[\s\S]*?CMS\.init\(\{ config \}\)/);
    expect([...cms.matchAll(/readCommitted = /g)]).toHaveLength(1);
    expect(cms).not.toMatch(/^import[^;]*'\.\/dev\//m);
  });
});
