import { describe, expect, it } from 'vitest';
import {
  featuredSince,
  measurePromptText,
  promptCardData,
  promptStats,
  relatedPromptsSummary,
  skillCardData,
} from './listCards';

// Des objets simples suffisent : listCards.ts n'importe jamais `astro:content`.
// Les pages passent `entry.data` (et `entry.body`) tels que chargés.
const fiche = (extra: Record<string, unknown> = {}) => ({
  format: 'fiche' as const,
  tool: 'Claude',
  prompt: 'ligne 1\nligne 2',
  ...extra,
});

describe('prompt card data (D94)', () => {
  it('measures the prompt text for a fiche and the body for a guide', () => {
    expect(measurePromptText({ format: 'fiche', prompt: '  le prompt  ' }, 'le corps')).toBe('le prompt');
    expect(measurePromptText({ format: 'guide', prompt: 'le prompt' }, '\n le corps \n')).toBe('le corps');
    // Une fiche sans prompt (ou avec un prompt vide) ne rend pas de bloc
    // (shouldRenderPromptBlock) : c'est alors le corps qui porte la valeur.
    expect(measurePromptText({ format: 'fiche', prompt: '   ' }, 'le corps')).toBe('le corps');
    expect(measurePromptText({ format: 'fiche' }, 'le corps')).toBe('le corps');
    expect(measurePromptText({ format: 'guide' }, undefined)).toBe('');
  });

  it('counts lines and rounds chars / 4 into tokens', () => {
    expect(promptStats('abcd')).toEqual({ lines: 1, tokens: 1 });
    expect(promptStats('a\nb\nc')).toEqual({ lines: 3, tokens: 1 }); // 5 / 4 = 1.25
    expect(promptStats('abcdef')).toEqual({ lines: 1, tokens: 2 }); // 6 / 4 = 1.5 → 2
    expect(promptStats('')).toEqual({ lines: 0, tokens: 0 });
    // Pas de séparateur de milliers : `~2645 tk`, jamais `~2 645 tk`.
    const long = promptCardData(fiche({ prompt: 'x'.repeat(10578) }));
    expect(long.lines).toBe('1 l.');
    expect(long.tokens).toBe('~2645 tk');
    // Le texte est mesuré rogné : les lignes vides de bord ne comptent pas.
    const guide = promptCardData({ format: 'guide', tool: 'Claude Code' }, '\n\nun\ndeux\ntrois\n\n');
    expect(guide.lines).toBe('3 l.');
    expect(guide.tokens).toBe('~3 tk'); // 'un\ndeux\ntrois' = 13 caractères
  });

  it('shows N variables only when the prompt declares some', () => {
    expect(promptCardData(fiche()).variables).toBeNull();
    expect(promptCardData(fiche({ variables: [] })).variables).toBeNull();
    expect(promptCardData(fiche({ variables: [{ name: 'sujet' }] })).variables).toBe('1 variable');
    expect(
      promptCardData(fiche({ variables: [{ name: 'sujet' }, { name: 'ton', hint: 'formel', default: 'neutre' }] }))
        .variables,
    ).toBe('2 variables');
  });

  it('shows the version slot only when the prompt declares one', () => {
    expect(promptCardData(fiche()).version).toBeNull();
    expect(promptCardData(fiche({ version: '  ' })).version).toBeNull();
    expect(promptCardData(fiche({ version: '1.2' })).version).toBe('v1.2');
    const card = promptCardData(fiche({ version: '1.2' }));
    expect(card.format).toBe('fiche');
    expect(card.tool).toBe('Claude');
  });
});

describe('skill card data', () => {
  it('summarises published related prompts as « 2 prompts », « 1 prompt », nothing at 0', () => {
    const published = { data: { draft: false } };
    const draft = { data: { draft: true } };
    expect(relatedPromptsSummary([published, published])).toBe('2 prompts');
    expect(relatedPromptsSummary([published, draft])).toBe('1 prompt');
    expect(relatedPromptsSummary([draft])).toBeNull();
    expect(relatedPromptsSummary([])).toBeNull();
    expect(relatedPromptsSummary(undefined)).toBeNull();

    const card = skillCardData(
      { type: 'claude-code', license: 'MIT', version: '0.4.0', installCmd: 'claude plugin install x' },
      [published, published],
    );
    expect(card).toEqual({
      type: 'claude-code',
      license: 'MIT',
      version: 'v0.4.0',
      install: 'claude plugin install x',
      summary: '2 prompts',
    });
    expect(skillCardData({ type: 'claude-code' }, [])).toEqual({
      type: 'claude-code',
      license: null,
      version: null,
      install: null,
      summary: null,
    });
  });
});

describe('featured project hero', () => {
  it('writes the featured project\'s start as « depuis juillet 2026 »', () => {
    // z.coerce.date('2026-07-30') → minuit UTC.
    expect(featuredSince(new Date('2026-07-30'))).toBe('depuis juillet 2026');
    // Un 1er du mois reste dans son mois quel que soit le fuseau du build.
    expect(featuredSince(new Date('2026-08-01'))).toBe('depuis août 2026');
    expect(featuredSince(undefined)).toBeNull();
  });
});
