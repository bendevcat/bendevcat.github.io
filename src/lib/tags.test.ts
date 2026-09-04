// src/lib/tags.test.ts
import { describe, it, expect } from 'vitest';
import { collectTagIndex, entriesWithTag, tagSlug, TAG_COLLECTIONS } from './tags';

const entry = (...tags: string[]) => ({ data: { tags } }) as any;

describe('tagSlug', () => {
  it('minuscule, sans accent, séparateurs normalisés', () => {
    expect(tagSlug('Sécurité')).toBe('securite');
    expect(tagSlug('CI/CD')).toBe('ci-cd');
    expect(tagSlug('  anti drift  ')).toBe('anti-drift');
    expect(tagSlug('méthodologie')).toBe('methodologie');
  });

  it('est idempotent (le slug d’un slug est le même slug)', () => {
    expect(tagSlug(tagSlug('CI/CD'))).toBe('ci-cd');
  });

  it('ne rend jamais de tirets en tête ou en queue', () => {
    expect(tagSlug('--k8s--')).toBe('k8s');
  });
});

describe('collectTagIndex', () => {
  const buckets = {
    blog: [entry('DevOps', 'linux'), entry('devops')],
    // Troisième graphie, DIFFÉRENTE de la première : c'est ce qui rend le test
    // de libellé discriminant. Avec 'DevOps' ici, une implémentation qui
    // garderait la DERNIÈRE graphie passerait aussi.
    projects: [entry('DEVOPS')],
    prompts: [entry('anti-drift')],
    skills: [entry('anti-drift')],
  } as any;

  it('compte les entrées de TOUTES les collections pour un tag', () => {
    const index = collectTagIndex(buckets);
    const devops = index.find((t) => t.slug === 'devops');
    expect(devops?.count).toBe(3); // 2 blog + 1 projet, graphies différentes
  });

  it('garde la PREMIÈRE graphie rencontrée comme libellé', () => {
    const index = collectTagIndex(buckets);
    expect(index.find((t) => t.slug === 'devops')?.label).toBe('DevOps');
  });

  it('trie par compte décroissant puis libellé A→Z', () => {
    const index = collectTagIndex(buckets);
    expect(index.map((t) => t.slug)).toEqual(['devops', 'anti-drift', 'linux']);
  });

  it('départage deux tags à égalité de compte par libellé A→Z', () => {
    // Comptes égaux : seul le départage par libellé décide. L'ordre
    // d'insertion est zeta puis alpha ; sans le comparateur secondaire, le
    // tri stable les laisserait dans cet ordre.
    const egalite = {
      blog: [entry('zeta', 'alpha')],
      projects: [],
      prompts: [],
      skills: [],
    } as any;
    expect(collectTagIndex(egalite).map((t) => t.slug)).toEqual(['alpha', 'zeta']);
  });

  it('rend un index vide sans planter quand aucune entrée n’a de tag', () => {
    expect(collectTagIndex({ blog: [], projects: [], prompts: [], skills: [] } as any)).toEqual([]);
  });

  it('tolère une entrée sans champ tags', () => {
    const withoutTags = { data: {} } as any;
    expect(collectTagIndex({ blog: [withoutTags], projects: [], prompts: [], skills: [] } as any)).toEqual([]);
  });

  it('compte des ENTRÉES, pas des occurrences — deux graphies dans la même entrée comptent 1', () => {
    // Saisissable depuis /admin : deux graphies du même tag sur un seul
    // article. Sans dédoublonnage par entrée, le badge annonce 2 alors que la
    // page ne liste qu'une entrée.
    const doublon = {
      blog: [entry('Kubernetes', 'kubernetes')],
      projects: [],
      prompts: [],
      skills: [],
    } as any;
    const index = collectTagIndex(doublon);
    expect(index).toHaveLength(1);
    expect(index[0].count).toBe(1);
    expect(index[0].label).toBe('Kubernetes'); // première graphie, comme partout
  });
});

describe('entriesWithTag', () => {
  it('compare sur le SLUG, pas sur la graphie', () => {
    const list = [entry('Sécurité'), entry('securite'), entry('linux')];
    expect(entriesWithTag(list, 'securite')).toHaveLength(2);
  });

  it('préserve l’ordre reçu (les helpers de collection ont déjà trié)', () => {
    const a = entry('x'), b = entry('x');
    expect(entriesWithTag([a, b], 'x')).toEqual([a, b]);
  });
});

describe('TAG_COLLECTIONS', () => {
  it('couvre les 4 collections, dans l’ordre d’affichage', () => {
    expect(TAG_COLLECTIONS).toEqual(['blog', 'projects', 'prompts', 'skills']);
  });
});
