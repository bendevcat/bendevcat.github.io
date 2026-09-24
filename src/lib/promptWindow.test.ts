import { describe, expect, it } from 'vitest';
import {
  promptWindowLines,
  promptWindowSource,
  rebuildWindowText,
  renderPromptText,
  varDisplay,
} from './promptWindow';

// Les noms de tests cités par R1 (plan 16) sont repris MOT POUR MOT.
// Des objets simples suffisent : promptWindow.ts n'importe jamais `astro:content`.

const vars = [
  { name: 'N', hint: 'plan number', default: '4' },
  { name: 'topic', default: 'librairies' },
];

describe('renderPromptText', () => {
  it('substitutes declared variables and leaves other braces literal', () => {
    const template = 'plan-{N}-{topic} · {N} · {inconnu} · {} · { N } · {{N}}';
    expect(renderPromptText(template, vars)).toBe(
      'plan-4-librairies · 4 · {inconnu} · {} · { N } · {4}',
    );
    // Des valeurs saisies remplacent les défauts, variable par variable.
    expect(renderPromptText(template, vars, { N: '7' })).toBe(
      'plan-7-librairies · 7 · {inconnu} · {} · { N } · {7}',
    );
    // Sans variables déclarées, toutes les accolades restent littérales.
    expect(renderPromptText('{N} {topic}', undefined)).toBe('{N} {topic}');
    expect(renderPromptText('{N} {topic}', [])).toBe('{N} {topic}');
    // Une valeur contenant `{N}` ou `$&` est insérée telle quelle, sans ré-analyse.
    expect(renderPromptText('{N}-{topic}', vars, { N: '{topic}', topic: '$&' })).toBe('{topic}-$&');
  });

  it('shows {name} for an empty value or a variable without default', () => {
    expect(varDisplay('N', '')).toBe('{N}');
    expect(varDisplay('N', undefined)).toBe('{N}');
    expect(varDisplay('N', '7')).toBe('7');
    // Une valeur faite d'espaces est une valeur : l'utilisateur l'a tapée.
    expect(varDisplay('N', ' ')).toBe(' ');
    expect(renderPromptText('a {x} b', [{ name: 'x' }])).toBe('a {x} b');
    expect(renderPromptText('a {x} b', [{ name: 'x', default: '' }])).toBe('a {x} b');
    expect(renderPromptText('a {N} b', vars, { N: '' })).toBe('a {N} b');
  });
});

describe('promptWindowLines', () => {
  it('marks each occurrence of a variable as its own segment', () => {
    const [line] = promptWindowLines('plan-{N}-{topic}.md {N}{N} {autre}', vars);
    expect(line.segments).toEqual([
      { text: 'plan-' },
      { text: '4', var: 'N' },
      { text: '-' },
      { text: 'librairies', var: 'topic' },
      { text: '.md ' },
      { text: '4', var: 'N' },
      { text: '4', var: 'N' },
      { text: ' {autre}' },
    ]);
    // Une variable sans défaut s'affiche `{name}` dans son segment.
    const [bare] = promptWindowLines('x {y}', [{ name: 'y' }]);
    expect(bare.segments).toEqual([{ text: 'x ' }, { text: '{y}', var: 'y' }]);
  });

  it('flags lines starting with 2 to 6 # and a space as headings', () => {
    const text = [
      '# titre',
      '## deux',
      '###### six',
      '####### sept',
      '##sans espace',
      ' ## indenté',
      'texte ## milieu',
      '### ',
      '',
    ].join('\n');
    expect(promptWindowLines(text).map((line) => line.heading)).toEqual([
      false,
      true,
      true,
      false,
      false,
      false,
      false,
      true,
      false,
    ]);
    // Une ligne vide garde sa place (un segment vide) : les sauts de ligne survivent.
    expect(promptWindowLines('a\n\nb').map((line) => line.segments)).toEqual([
      [{ text: 'a' }],
      [{ text: '' }],
      [{ text: 'b' }],
    ]);
  });

  it('rebuilds the measured text from the segments at their defaults', () => {
    const template = '## Plan {N}\n\nplan-{N}-{topic} {inconnu}\n- {x}';
    const declared = [...vars, { name: 'x' }];
    const lines = promptWindowLines(template, declared);
    expect(rebuildWindowText(lines)).toBe(renderPromptText(template, declared));
    expect(rebuildWindowText(lines)).toBe('## Plan 4\n\nplan-4-librairies {inconnu}\n- {x}');
    expect(lines.map((line) => line.heading)).toEqual([true, false, false, false]);

    // Même règle que la carte : une fiche montre son `prompt` (variables
    // rendues), un guide montre son corps (accolades littérales), rogné.
    const fiche = promptWindowSource(
      { format: 'fiche', prompt: '\n plan-{N}\n', variables: vars },
      'notes',
    );
    expect(fiche).toEqual({ template: 'plan-{N}', variables: vars, showsPrompt: true });
    expect(rebuildWindowText(promptWindowLines(fiche.template, fiche.variables))).toBe('plan-4');

    const guide = promptWindowSource(
      { format: 'guide', prompt: 'ignoré', variables: vars },
      '\n## Titre {N}\n',
    );
    expect(guide).toEqual({ template: '## Titre {N}', variables: [], showsPrompt: false });
    expect(rebuildWindowText(promptWindowLines(guide.template, guide.variables))).toBe('## Titre {N}');
  });
});
