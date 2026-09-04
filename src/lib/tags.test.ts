// src/lib/tags.test.ts
import { describe, it, expect } from 'vitest';
import { collectTagIndex, entriesWithTag, tagSlug, TAG_COLLECTIONS } from './tags';

const entry = (...tags: string[]) => ({ data: { tags } }) as any;

describe('tagSlug', () => {
  it('minuscule, sans accent, separateurs normalises', () => {
    expect(tagSlug('Securite')).toBe('securite');
    expect(tagSlug('CI/CD')).toBe('ci-cd');
    expect(tagSlug('  anti drift  ')).toBe('anti-drift');
    expect(tagSlug('methodologie')).toBe('methodologie');
  });

  it('est idempotent (le slug d un slug est le meme slug)', () => {
    expect(tagSlug(tagSlug('CI/CD'))).toBe('ci-cd');
  });

  it('ne rend jamais de tirets en tete ou en queue', () => {
    expect(tagSlug('--k8s--')).toBe('k8s');
  });
});

describe('collectTagIndex', () => {
  const buckets = {
    blog: [entry('DevOps', 'linux'), entry('devops')],
    // Troisieme graphie, DIFFERENTE de la premiere : c est ce qui rend le test
    // de libelle discriminant. Avec 'DevOps' ici, une implementation qui
    // garderait la DERNIERE graphie passerait aussi.
    projects: [entry('DEVOPS')],
    prompts: [entry('anti-drift')],
    skills: [entry('anti-drift')],
  } as any;

  it('compte les entrees de TOUTES les collections pour un tag', () => {
    const index = collectTagIndex(buckets);
    const devops = index.find((t) => t.slug === 'devops');
    expect(devops?.count).toBe(3); // 2 blog + 1 projet, graphies differentes
  });

  it('garde la PREMIERE graphie rencontree comme libelle', () => {
    const index = collectTagIndex(buckets);
    expect(index.find((t) => t.slug === 'devops')?.label).toBe('DevOps');
  });

  it('trie par compte decroissant puis libelle A-Z', () => {
    const index = collectTagIndex(buckets);
    expect(index.map((t) => t.slug)).toEqual(['devops', 'anti-drift', 'linux']);
  });

  it('departage deux tags a egalite de compte par libelle A-Z', () => {
    // Comptes egaux : seul le departage par libelle decide. L ordre
    // d insertion est zeta puis alpha ; sans le comparateur secondaire, le
    // tri stable les laisserait dans cet ordre.
    const egalite = {
      blog: [entry('zeta', 'alpha')],
      projects: [],
      prompts: [],
      skills: [],
    } as any;
    expect(collectTagIndex(egalite).map((t) => t.slug)).toEqual(['alpha', 'zeta']);
  });

  it('rend un index vide sans planter quand aucune entree n a de tag', () => {
    expect(collectTagIndex({ blog: [], projects: [], prompts: [], skills: [] } as any)).toEqual([]);
  });

  it('tolere une entree sans champ tags', () => {
    const withoutTags = { data: {} } as any;
    expect(collectTagIndex({ blog: [withoutTags], projects: [], prompts: [], skills: [] } as any)).toEqual([]);
  });
});

describe('entriesWithTag', () => {
  it('compare sur le SLUG, pas sur la graphie', () => {
    const list = [entry('Securite'), entry('securite'), entry('linux')];
    expect(entriesWithTag(list, 'securite')).toHaveLength(2);
  });

  it('preserve l ordre recu (les helpers de collection ont deja tri)', () => {
    const a = entry('x'), b = entry('x');
    expect(entriesWithTag([a, b], 'x')).toEqual([a, b]);
  });
});

describe('TAG_COLLECTIONS', () => {
  it('couvre les 4 collections, dans l ordre d affichage', () => {
    expect(TAG_COLLECTIONS).toEqual(['blog', 'projects', 'prompts', 'skills']);
  });
});
