import { describe, expect, it } from 'vitest';
import { ABOUT_FACTS, collectStack, whoamiLines, type WhoamiSource } from './about';
import { collectTagIndex } from './tags';

// about.ts est pur : des objets simples suffisent (comme home.test.ts).
const project = (...stack: string[]) => ({ data: { stack } });
const tagged = (...tags: string[]) => ({ data: { tags } }) as any;

const source = (overrides: Partial<WhoamiSource> = {}): WhoamiSource => ({
  ...ABOUT_FACTS,
  tags: [{ label: 'devops' }],
  counts: { articles: 5, projets: 2, prompts: 3, skills: 2 },
  stack: ['Astro', 'Go'],
  ...overrides,
});

const valueOf = (lines: { key: string; value: string }[], key: string) =>
  lines.find((line) => line.key === key)?.value;

describe('collectStack', () => {
  it('lists each stack item once, in project order', () => {
    const projects = [
      project('Astro', 'Tailwind CSS', 'TypeScript'),
      project('GitHub Actions', 'Astro', 'Go'),
      project(),
      project('Go', 'Bash'),
    ];
    expect(collectStack(projects)).toEqual([
      'Astro',
      'Tailwind CSS',
      'TypeScript',
      'GitHub Actions',
      'Go',
      'Bash',
    ]);
    // Blancs et entrées vides ignorés ; le tableau reçu n'est pas muté.
    expect(collectStack([project(' Astro ', ''), project('Astro')])).toEqual(['Astro']);
    expect(collectStack([])).toEqual([]);
  });
});

describe('whoamiLines', () => {
  it('lists the eight keys in order, from the author facts', () => {
    const lines = whoamiLines(source());
    expect(lines.map((line) => line.key)).toEqual([
      'nom', 'alias', 'rôle', 'lieu', 'terrain', 'écrit', 'stack', 'règle',
    ]);
    expect(valueOf(lines, 'nom')).toBe('Benoît Catillon');
    expect(valueOf(lines, 'alias')).toBe('benCat_');
    expect(valueOf(lines, 'rôle')).toBe('ingénieur DevOps depuis 2019');
    expect(valueOf(lines, 'lieu')).toBe('France');
    expect(valueOf(lines, 'stack')).toBe('Astro · Go');
    expect(valueOf(lines, 'règle')).toBe('une aide, pas un ghostwriter');
  });

  it('derives écrit from the four published counts', () => {
    expect(valueOf(whoamiLines(source()), 'écrit')).toBe('5 articles · 2 projets · 3 prompts · 2 skills');
    // Singulier à 1 ; une collection vide disparaît de la ligne.
    expect(
      valueOf(whoamiLines(source({ counts: { articles: 1, projets: 0, prompts: 1, skills: 1 } })), 'écrit'),
    ).toBe('1 article · 1 prompt · 1 skill');
  });

  it('names the three most used tags as terrain', () => {
    const index = collectTagIndex({
      blog: [tagged('DevOps', 'kubernetes'), tagged('devops', 'claude-code'), tagged('claude-code')],
      projects: [tagged('claude-code', 'anti-drift')],
      prompts: [tagged('anti-drift', 'devops')],
      skills: [tagged('bash')],
    });
    // claude-code 3, DevOps 3 (première graphie), anti-drift 2, puis bash / kubernetes à 1.
    expect(valueOf(whoamiLines(source({ tags: index })), 'terrain')).toBe('claude-code · DevOps · anti-drift');
    // Moins de trois tags : ceux qui existent, sans remplissage.
    expect(valueOf(whoamiLines(source({ tags: [{ label: 'go' }] })), 'terrain')).toBe('go');
  });

  it('drops a line whose source is empty', () => {
    const lines = whoamiLines(
      source({
        place: '',
        tags: [],
        counts: { articles: 0, projets: 0, prompts: 0, skills: 0 },
        stack: [],
        rule: '   ',
      }),
    );
    expect(lines.map((line) => line.key)).toEqual(['nom', 'alias', 'rôle']);
  });
});
