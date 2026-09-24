import { describe, expect, it } from 'vitest';
import { pickHomePosts, takeSectionEntries } from './home';

// Des objets simples suffisent : home.ts est générique et n'importe jamais
// `astro:content`. L'ordre du tableau EST l'ordre canonique (pubDate desc,
// drafts retirés par getPublishedPosts()).
const post = (id: string, featured?: boolean) =>
  featured === undefined ? { id } : { id, featured };

const ids = (entries: { id: string }[]) => entries.map((entry) => entry.id);

describe('pickHomePosts', () => {
  it('features the post flagged featured, else the first published post', () => {
    const flagged = pickHomePosts([post('a'), post('b', false), post('c', true), post('d')]);
    expect(flagged.featured?.id).toBe('c');

    const unflagged = pickHomePosts([post('a'), post('b'), post('c')]);
    expect(unflagged.featured?.id).toBe('a');
  });

  it('lists the next 3 posts in order and never the featured one', () => {
    const posts = [post('a'), post('b'), post('c'), post('d'), post('e')];
    const byDefault = pickHomePosts(posts);
    expect(byDefault.featured?.id).toBe('a');
    expect(ids(byDefault.latest)).toEqual(['b', 'c', 'd']);

    // L'entrée flaggée au milieu de la liste : elle est sautée, pas l'extrémité.
    const flagged = pickHomePosts([post('a'), post('b'), post('c', true), post('d'), post('e')]);
    expect(flagged.featured?.id).toBe('c');
    expect(ids(flagged.latest)).toEqual(['a', 'b', 'd']);
    expect(ids(flagged.latest)).not.toContain('c');

    // Le nombre d'éléments est paramétrable, 3 par défaut.
    expect(ids(pickHomePosts(posts, 2).latest)).toEqual(['b', 'c']);

    // Ne mute jamais le tableau reçu.
    expect(ids(posts)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('lists fewer items when fewer posts remain', () => {
    expect(ids(pickHomePosts([post('a'), post('b'), post('c')]).latest)).toEqual(['b', 'c']);
    const single = pickHomePosts([post('a')]);
    expect(single.featured?.id).toBe('a');
    expect(single.latest).toEqual([]);
  });

  it('returns no featured post and no item when there is no post', () => {
    expect(pickHomePosts([])).toEqual({ featured: null, latest: [] });
  });
});

describe('takeSectionEntries', () => {
  it('keeps the first N entries in the given order', () => {
    const entries = [post('z'), post('a'), post('m')];
    expect(ids(takeSectionEntries(entries))).toEqual(['z', 'a']);
    expect(ids(takeSectionEntries(entries, 1))).toEqual(['z']);
    expect(ids(takeSectionEntries(entries, 5))).toEqual(['z', 'a', 'm']);
    expect(takeSectionEntries([])).toEqual([]);
    expect(ids(entries)).toEqual(['z', 'a', 'm']);
  });
});
