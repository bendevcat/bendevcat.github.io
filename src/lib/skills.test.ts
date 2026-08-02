import { describe, it, expect } from 'vitest';
import {
  sortSkills,
  collectTypes,
  collectSkillTags,
  sortAndFilterSkills,
  type SkillEntry,
} from './skills';

function skill(id: string, data: Partial<SkillEntry['data']> = {}): SkillEntry {
  return {
    id,
    collection: 'skills',
    data: {
      title: id,
      description: '',
      type: 'claude-code',
      tags: [],
      draft: false,
      ...data,
    },
  } as unknown as SkillEntry;
}

describe('sortSkills', () => {
  it('trie par titre A→Z en français', () => {
    const sorted = sortSkills([
      skill('b', { title: 'Vérification' }),
      skill('a', { title: 'Anti-drift' }),
    ]);
    expect(sorted.map((s) => s.data.title)).toEqual(['Anti-drift', 'Vérification']);
  });

  it('ne mute pas le tableau reçu', () => {
    const input = [skill('b', { title: 'B' }), skill('a', { title: 'A' })];
    sortSkills(input);
    expect(input.map((s) => s.data.title)).toEqual(['B', 'A']);
  });
});

describe('collectTypes', () => {
  it('renvoie l’union triée et dédoublonnée des types', () => {
    expect(
      collectTypes([
        skill('a', { type: 'claude-code' }),
        skill('b', { type: 'competence' }),
        skill('c', { type: 'claude-code' }),
      ]),
    ).toEqual(['claude-code', 'competence']);
  });
});

describe('collectSkillTags', () => {
  it('aplatit, dédoublonne et trie les tags', () => {
    expect(
      collectSkillTags([skill('a', { tags: ['b', 'a'] }), skill('b', { tags: ['a', 'c'] })]),
    ).toEqual(['a', 'b', 'c']);
  });
});

describe('sortAndFilterSkills', () => {
  it('écarte les entrées draft: true et conserve les draft: false', () => {
    const out = sortAndFilterSkills([
      skill('a', { title: 'A', draft: false }),
      skill('b', { title: 'B', draft: true }),
    ]);
    expect(out.map((s) => s.id)).toEqual(['a']);
  });

  it('trie les entrées restantes par titre A→Z après avoir écarté les drafts', () => {
    const out = sortAndFilterSkills([
      skill('c', { title: 'Vérification', draft: false }),
      skill('b', { title: 'Masquée', draft: true }),
      skill('a', { title: 'Anti-drift', draft: false }),
    ]);
    expect(out.map((s) => s.data.title)).toEqual(['Anti-drift', 'Vérification']);
  });
});
