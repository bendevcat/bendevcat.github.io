import { describe, expect, it } from 'vitest';
import { codeWindowLines, codeWindowText, isYamlFile, type CodeLine } from './codeWindow';

// Les noms de tests cités par R2 (plan 15) sont repris MOT POUR MOT.

/** Une ligne réduite à ses segments `[genre, texte]`, pour des attentes lisibles. */
const shape = (line: CodeLine) => line.segments.map((segment) => [segment.kind, segment.text]);
const texts = (lines: CodeLine[]) => lines.map((line) => line.segments.map((s) => s.text).join(''));

describe('codeWindowLines', () => {
  it('numbers every line from 1, blank lines included, dropping one trailing newline', () => {
    const lines = codeWindowLines('a\n\nb\n', 'notes.txt');
    expect(lines.map((line) => line.number)).toEqual([1, 2, 3]);
    expect(texts(lines)).toEqual(['a', '', 'b']);

    // UN seul saut final est retiré : un second devient une dernière ligne vide.
    const twice = codeWindowLines('a\n\n', 'notes.txt');
    expect(twice.map((line) => line.number)).toEqual([1, 2]);
    expect(texts(twice)).toEqual(['a', '']);

    // Sans saut final, rien n'est retiré.
    expect(texts(codeWindowLines('a\nb', 'notes.txt'))).toEqual(['a', 'b']);

    // Le texte copié = les lignes jointes, sans les numéros.
    const snippet = 'name: Check PR\n\non:\n  push:\n';
    expect(codeWindowText(snippet)).toBe('name: Check PR\n\non:\n  push:');
    expect(texts(codeWindowLines(snippet, 'ci.yml')).join('\n')).toBe(codeWindowText(snippet));
  });

  it('colours a YAML key and the value after it', () => {
    const [name, on, checkout] = codeWindowLines(
      'name: Check PR\non:\n    - uses: actions/checkout@v4\n',
      '.github/workflows/check-pr.yml',
    );
    expect(shape(name)).toEqual([
      ['key', 'name:'],
      ['plain', ' '],
      ['value', 'Check PR'],
    ]);
    // Une clé sans valeur : la clé seule.
    expect(shape(on)).toEqual([['key', 'on:']]);
    expect(shape(checkout)).toEqual([
      ['plain', '    - '],
      ['key', 'uses:'],
      ['plain', ' '],
      ['value', 'actions/checkout@v4'],
    ]);
    // Valeur en flux ou entre guillemets : colorée d'un bloc.
    const [flow, quoted] = codeWindowLines(
      "permissions: { contents: read, pages: write }\n  group: \"pages\"\n",
      'deploy.yaml',
    );
    expect(shape(flow)).toEqual([
      ['key', 'permissions:'],
      ['plain', ' '],
      ['value', '{ contents: read, pages: write }'],
    ]);
    expect(shape(quoted)).toEqual([
      ['plain', '  '],
      ['key', 'group:'],
      ['plain', ' '],
      ['value', '"pages"'],
    ]);
  });

  it('leaves list dashes, indentation and block-scalar lines plain', () => {
    const snippet = [
      '    branches:',
      '      - main',
      '      - name: Outputs',
      '        run: |',
      '          echo "changed: ${{ steps.semver.outputs.changed }}"',
      '',
      '          release: $release',
      '      - run: npm ci',
      '# un commentaire: pas une clé',
      '',
    ].join('\n');
    const lines = codeWindowLines(snippet, 'check-pr.yml');
    expect(lines.map(shape)).toEqual([
      [
        ['plain', '    '],
        ['key', 'branches:'],
      ],
      [['plain', '      - main']],
      [
        ['plain', '      - '],
        ['key', 'name:'],
        ['plain', ' '],
        ['value', 'Outputs'],
      ],
      [
        ['plain', '        '],
        ['key', 'run:'],
        ['plain', ' '],
        ['value', '|'],
      ],
      // Contenu du scalaire bloc : du texte, même s'il ressemble à `clé: valeur`.
      [['plain', '          echo "changed: ${{ steps.semver.outputs.changed }}"']],
      [],
      [['plain', '          release: $release']],
      // Fin du bloc : retour à une indentation ≤ celle de la clé `run`.
      [
        ['plain', '      - '],
        ['key', 'run:'],
        ['plain', ' '],
        ['value', 'npm ci'],
      ],
      [['plain', '# un commentaire: pas une clé']],
    ]);
  });

  it('does not highlight a non-YAML file', () => {
    for (const file of ['script.sh', 'README.md', 'yml', undefined]) {
      const lines = codeWindowLines('name: Check PR\n  - run: x\n', file);
      expect(lines.map(shape)).toEqual([
        [['plain', 'name: Check PR']],
        [['plain', '  - run: x']],
      ]);
    }
  });
});

describe('isYamlFile', () => {
  it('recognises .yml and .yaml, case-insensitively', () => {
    expect(isYamlFile('.github/workflows/deploy.yml')).toBe(true);
    expect(isYamlFile('config.YAML')).toBe(true);
    expect(isYamlFile('deploy.yml.bak')).toBe(false);
    expect(isYamlFile(undefined)).toBe(false);
  });
});
