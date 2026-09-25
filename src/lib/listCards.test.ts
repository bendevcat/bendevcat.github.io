import { describe, expect, it } from 'vitest';
import {
  featuredSince,
  measurePromptText,
  promptCardData,
  promptStats,
  relatedPromptsSummary,
  skillCardData,
  skillContentSummary,
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

  it("measures a fiche's prompt with its variables at their defaults", () => {
    const variables = [
      { name: 'N', default: '4' },
      { name: 'topic', default: 'librairies-prompts-skills' },
      { name: 'vide' },
    ];
    const data = { format: 'fiche' as const, prompt: '\nplan-{N}-{topic}\n{vide} {autre}\n', variables };
    // Défauts rendus, `{name}` sans défaut, accolades non déclarées littérales, rogné.
    expect(measurePromptText(data, 'notes')).toBe('plan-4-librairies-prompts-skills\n{vide} {autre}');
    // La carte compte ce même texte : 2 lignes, 47 caractères → ~12 tk.
    const card = promptCardData({ ...data, tool: 'Claude Code' }, 'notes');
    expect(card.lines).toBe('2 l.');
    expect(card.tokens).toBe(`~${Math.round('plan-4-librairies-prompts-skills\n{vide} {autre}'.length / 4)} tk`);
    // Un guide ne rend jamais de variables : son corps est mesuré tel quel.
    expect(measurePromptText({ format: 'guide', prompt: '{N}', variables }, ' corps {N} ')).toBe('corps {N}');
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

// Les noms de tests cités par R2 (plan 17) sont repris MOT POUR MOT.
describe('skill content summary (plan 17)', () => {
  const published = { data: { draft: false } };
  const draft = { data: { draft: true } };

  it('summarises skills, commands and prompts in that order, omitting zeros', () => {
    expect(skillContentSummary({ skillCount: 1, commandCount: 7 }, [published, published])).toBe(
      '1 skill · 7 commandes · 2 prompts',
    );
    expect(skillContentSummary({ skillCount: 15 }, [published])).toBe('15 skills · 1 prompt');
    expect(skillContentSummary({ skillCount: 15, commandCount: 0 }, [published, draft])).toBe('15 skills · 1 prompt');
    expect(skillContentSummary({ skillCount: 0, commandCount: 3 }, [])).toBe('3 commandes');
    expect(skillContentSummary({}, [published, published])).toBe('2 prompts');
    // La carte de /skills/ et l'en-tête de la fiche lisent la même chaîne.
    const card = skillCardData(
      { type: 'claude-code', license: 'MIT', version: '0.4.0', skillCount: 1, commandCount: 7 },
      [published, published],
    );
    expect(card.summary).toBe('1 skill · 7 commandes · 2 prompts');
  });

  it('uses singular forms for 1 skill, 1 commande, 1 prompt', () => {
    expect(skillContentSummary({ skillCount: 1, commandCount: 1 }, [published])).toBe('1 skill · 1 commande · 1 prompt');
    expect(skillContentSummary({ skillCount: 2, commandCount: 2 }, [published, published])).toBe(
      '2 skills · 2 commandes · 2 prompts',
    );
  });

  it('returns null when nothing is counted', () => {
    expect(skillContentSummary({}, [])).toBeNull();
    expect(skillContentSummary({}, undefined)).toBeNull();
    expect(skillContentSummary({ skillCount: 0, commandCount: 0 }, [draft])).toBeNull();
    expect(skillCardData({ type: 'claude-code', skillCount: 0 }, [draft]).summary).toBeNull();
  });
});

describe('featured project hero', () => {
  it('writes the featured project\'s start as « depuis juillet 2026 »', () => {
    // z.coerce.date('2026-07-30') → minuit UTC.
    expect(featuredSince(new Date('2026-07-30'))).toBe('depuis juillet 2026');
    // Un 1er du mois reste dans son mois quel que soit le fuseau du build.
    expect(featuredSince(new Date('2026-08-01'))).toBe('depuis août 2026');
    // Instants de bord : sans `timeZone: 'UTC'`, 23:30Z le 31 passe en août
    // dans un fuseau en avance (Paris, Tokyo) et 00:30Z le 1er retombe en
    // juillet dans un fuseau en retard (New York).
    expect(featuredSince(new Date('2026-07-31T23:30:00Z'))).toBe('depuis juillet 2026');
    expect(featuredSince(new Date('2026-08-01T00:30:00Z'))).toBe('depuis août 2026');
    expect(featuredSince(undefined)).toBeNull();
  });
});
