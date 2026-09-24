import { describe, expect, it } from 'vitest';
import { promptMetaSlots, relatedPromptIds, relatedSkillIds } from './promptDetail';

// Les noms de tests cités par R4 (plan 16) sont repris MOT POUR MOT.
// Des objets simples suffisent : promptDetail.ts n'importe jamais `astro:content`.

describe('relatedSkillIds', () => {
  it('lists declared related skills first, then skills listing the prompt, once each', () => {
    const skills = [
      { id: 'alpha', relatedPrompts: [{ id: 'mon-prompt' }] },
      { id: 'beta' },
      { id: 'brouillon', draft: true, relatedPrompts: [{ id: 'mon-prompt' }] },
      { id: 'gamma', relatedPrompts: ['autre', 'mon-prompt'] },
      { id: 'delta', relatedPrompts: [{ id: 'autre' }] },
      { id: 'zeta', relatedPrompts: [{ id: 'mon-prompt' }] },
    ];
    // Déclarés d'abord, dans l'ordre déclaré ; puis les skills qui listent le
    // prompt, dans l'ordre reçu ; un id déjà vu n'est pas répété.
    expect(relatedSkillIds('mon-prompt', [{ id: 'zeta' }, 'beta'], skills)).toEqual([
      'zeta',
      'beta',
      'alpha',
      'gamma',
    ]);
    // Un brouillon ou une skill inconnue n'a pas de page : jamais listé.
    expect(relatedSkillIds('mon-prompt', ['brouillon', 'fantome'], skills)).toEqual(['alpha', 'gamma', 'zeta']);
    // Un doublon dans la déclaration ne produit qu'une entrée.
    expect(relatedSkillIds('autre', ['delta', 'delta'], skills)).toEqual(['delta', 'gamma']);
    expect(relatedSkillIds('seul', undefined, skills)).toEqual([]);
  });
});

describe('relatedPromptIds', () => {
  it('relates prompts sharing a skill or a tag, most shared first, at most 3, never itself', () => {
    const current = { id: 'moi', title: 'Moi', skillIds: ['s1', 's2'], tagKeys: ['t1', 't2'] };
    const prompts = [
      current,
      { id: 'un-tag', title: 'Zèbre', skillIds: [], tagKeys: ['t1'] },
      { id: 'tout', title: 'Tout', skillIds: ['s1', 's2'], tagKeys: ['t1', 't2'] },
      { id: 'rien', title: 'Rien', skillIds: ['s9'], tagKeys: ['t9'] },
      { id: 'brouillon', title: 'Brouillon', draft: true, skillIds: ['s1', 's2'], tagKeys: ['t1', 't2'] },
      { id: 'une-skill', title: 'Abeille', skillIds: ['s2'], tagKeys: [] },
      { id: 'deux', title: 'Deux', skillIds: ['s1'], tagKeys: ['t2', 't2'] },
      { id: 'encore-un', title: 'Élan', skillIds: [], tagKeys: ['t2'] },
    ];
    // tout = 4, deux = 2 (un tag répété ne compte qu'une fois), puis à 1 :
    // Abeille < Élan < Zèbre (titre A→Z, fr) — coupé à 3.
    expect(relatedPromptIds(current, prompts)).toEqual(['tout', 'deux', 'une-skill']);
    expect(relatedPromptIds(current, prompts, 10)).toEqual(['tout', 'deux', 'une-skill', 'encore-un', 'un-tag']);
    // Rien en commun : liste vide.
    expect(relatedPromptIds({ id: 'seul', title: 'Seul', skillIds: [], tagKeys: [] }, prompts)).toEqual([]);
  });
});

describe('promptMetaSlots', () => {
  const stats = { lines: 129, tokens: 2645 };

  it('hides version and date when unset', () => {
    expect(promptMetaSlots({}, stats)).toMatchObject({ version: null, date: null, versionDate: null });
    expect(promptMetaSlots({ version: '  ' }, stats).versionDate).toBeNull();
    // Chaque partie disparaît seule ; la date est lue en UTC, format fr-FR long.
    expect(promptMetaSlots({ version: '1.2' }, stats)).toMatchObject({
      version: 'v1.2',
      date: null,
      versionDate: 'v1.2',
    });
    const updated = new Date('2026-07-01');
    expect(promptMetaSlots({ updated }, stats)).toMatchObject({
      version: null,
      date: '1 juillet 2026',
      versionDate: '1 juillet 2026',
    });
    expect(promptMetaSlots({ version: '1.2', updated }, stats).versionDate).toBe('v1.2 — 1 juillet 2026');
  });

  it('formats header counts as N lignes · ~N tokens and window counts as N l. · ~N tk', () => {
    expect(promptMetaSlots({}, stats)).toMatchObject({
      headerCounts: '129 lignes · ~2645 tokens',
      windowCounts: '129 l. · ~2645 tk',
    });
    // Pas de séparateur de milliers ; singulier à 1 (et 0) en français.
    expect(promptMetaSlots({}, { lines: 1, tokens: 1 })).toMatchObject({
      headerCounts: '1 ligne · ~1 token',
      windowCounts: '1 l. · ~1 tk',
    });
    expect(promptMetaSlots({}, { lines: 48, tokens: 12345 }).headerCounts).toBe('48 lignes · ~12345 tokens');
  });
});
