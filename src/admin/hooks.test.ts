import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { normalizeBodyBeforeSave, type EntryMap } from './hooks';

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
  constructor(private readonly value: Record<string, unknown>) {}

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
    return new FakeMap({ ...this.value, [head]: child });
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

  it('cms.ts enregistre ce hook sur preSave', () => {
    const cms = readFileSync(new URL('./cms.ts', import.meta.url), 'utf8');
    expect(cms).toMatch(/import\s*\{[^}]*\bnormalizeBodyBeforeSave\b[^}]*\}\s*from\s*'\.\/hooks'/);
    expect(cms).toMatch(
      /CMS\.registerEventListener\(\s*\{\s*name:\s*'preSave',\s*handler:\s*normalizeBodyBeforeSave\s*,?\s*\}\s*\)/,
    );
    // Enregistré avant init().
    expect(cms.indexOf('registerEventListener')).toBeLessThan(cms.indexOf('CMS.init('));
  });
});
