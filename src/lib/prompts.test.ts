import { describe, it, expect } from 'vitest';
import {
  sortPrompts,
  collectTools,
  collectPromptTags,
  sortAndFilterPrompts,
  type PromptEntry,
} from './prompts';

/** Fabrique d'entrées minimales — seuls les champs lus par les fonctions testées. */
function prompt(id: string, data: Partial<PromptEntry['data']> = {}): PromptEntry {
  return {
    id,
    collection: 'prompts',
    data: {
      title: id,
      description: '',
      format: 'fiche',
      tool: 'Claude',
      tags: [],
      draft: false,
      ...data,
    },
  } as unknown as PromptEntry;
}

describe('sortPrompts', () => {
  it('trie par titre A→Z en français', () => {
    const sorted = sortPrompts([
      prompt('c', { title: 'Zèbre' }),
      prompt('a', { title: 'Amorçage' }),
      prompt('b', { title: 'Écriture' }),
    ]);
    expect(sorted.map((p) => p.data.title)).toEqual(['Amorçage', 'Écriture', 'Zèbre']);
  });

  it('ne mute pas le tableau reçu', () => {
    const input = [prompt('b', { title: 'B' }), prompt('a', { title: 'A' })];
    sortPrompts(input);
    expect(input.map((p) => p.data.title)).toEqual(['B', 'A']);
  });
});

describe('collectTools', () => {
  it('renvoie l’union triée et dédoublonnée des outils', () => {
    const tools = collectTools([
      prompt('a', { tool: 'Claude' }),
      prompt('b', { tool: 'ChatGPT' }),
      prompt('c', { tool: 'Claude' }),
    ]);
    expect(tools).toEqual(['ChatGPT', 'Claude']);
  });

  it('renvoie un tableau vide quand il n’y a aucune entrée', () => {
    expect(collectTools([])).toEqual([]);
  });
});

describe('collectPromptTags', () => {
  it('aplatit, dédoublonne et trie les tags', () => {
    const tags = collectPromptTags([
      prompt('a', { tags: ['ia', 'claude-code'] }),
      prompt('b', { tags: ['claude-code', 'anti-drift'] }),
    ]);
    expect(tags).toEqual(['anti-drift', 'claude-code', 'ia']);
  });

  it('ignore les entrées sans tag', () => {
    expect(collectPromptTags([prompt('a'), prompt('b', { tags: ['x'] })])).toEqual(['x']);
  });
});

describe('sortAndFilterPrompts', () => {
  it('écarte les entrées draft: true et conserve les draft: false', () => {
    const out = sortAndFilterPrompts([
      prompt('a', { title: 'A', draft: false }),
      prompt('b', { title: 'B', draft: true }),
    ]);
    expect(out.map((p) => p.id)).toEqual(['a']);
  });

  it('trie les entrées restantes par titre A→Z après avoir écarté les drafts', () => {
    const out = sortAndFilterPrompts([
      prompt('c', { title: 'Zèbre', draft: false }),
      prompt('b', { title: 'Masquée', draft: true }),
      prompt('a', { title: 'Amorçage', draft: false }),
    ]);
    expect(out.map((p) => p.data.title)).toEqual(['Amorçage', 'Zèbre']);
  });
});
