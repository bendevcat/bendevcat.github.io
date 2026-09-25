import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import { findThematicBreaks, normalizeThematicBreaks } from './thematicBreaks';

/**
 * Règle de contenu (plan 19, R11) : le seul séparateur thématique admis dans
 * `src/content/**` est `---`, seul sur sa ligne. `- - -` était mal relu par
 * l'éditeur de Sveltia (pris pour une liste) et l'éditeur réécrit tout
 * séparateur en `***` : ce test lit les fichiers réels — pas une copie — et
 * échoue dès qu'une autre forme revient.
 */
const CONTENT_DIR = fileURLToPath(new URL('../content/', import.meta.url));

function markdownFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const path = join(dir, d.name);
    if (d.isDirectory()) return markdownFiles(path);
    return /\.mdx?$/.test(d.name) ? [path] : [];
  });
}

describe('séparateurs thématiques', () => {
  it('aucun séparateur autre que --- dans src/content/**', () => {
    const files = markdownFiles(CONTENT_DIR);
    expect(files.length).toBeGreaterThan(0);
    const offenders = files.flatMap((file) =>
      findThematicBreaks(readFileSync(file, 'utf8')).map(
        ({ line, text }) => `${relative(CONTENT_DIR, file)}:${line}: ${JSON.stringify(text)}`,
      ),
    );
    expect(offenders).toEqual([]);
  });

  it('signale - - -, ***, ___, * * *, _ _ _ et leurs variantes indentées', () => {
    const rules = ['- - -', '***', '___', '* * *', '_ _ _', '----', '*****', '- -  -', '--- '];
    const indented = rules.flatMap((r) => [` ${r}`, `  ${r}`, `   ${r}`]);
    const all = [...rules, ...indented, '   ---'];
    const markdown = ['Intro.', '', ...all.flatMap((r) => [r, ''])].join('\n');
    expect(findThematicBreaks(markdown)).toEqual(
      all.map((text, i) => ({ line: 3 + 2 * i, text })),
    );
  });

  it('signale un séparateur collé à un paragraphe, sauf un soulignement de titre setext', () => {
    const markdown = ['Texte', '***', 'Texte', '- - -', 'Titre setext', '-----', '', '# Titre', '-----'].join('\n');
    expect(findThematicBreaks(markdown)).toEqual([
      { line: 2, text: '***' },
      { line: 4, text: '- - -' },
      { line: 9, text: '-----' },
    ]);
  });

  it('ignore le frontmatter, les blocs de code ``` et ~~~, ***gras*** et les listes', () => {
    const markdown = [
      '---',
      'title: "x"',
      'prompt: |',
      '  ***',
      '  ---',
      '---',
      '',
      '---',
      '',
      '***gras*** et **gras** et ___souligné___',
      '',
      '- item',
      '* item',
      '- - item',
      '* **gras**',
      '',
      '```bash',
      '***',
      '- - -',
      '```',
      '',
      '````md',
      '___',
      '```',
      '* * *',
      '````',
      '',
      '~~~~',
      '* * *',
      '~~~',
      '_ _ _',
      '~~~~',
      '',
      '    ***',
      '',
      '*-*',
      '--',
      '**',
    ].join('\n');
    expect(findThematicBreaks(markdown)).toEqual([]);
  });

  it('un bloc de code non fermé court jusqu’à la fin du document', () => {
    expect(findThematicBreaks(['```', '***'].join('\n'))).toEqual([]);
  });
});

describe('normalizeThematicBreaks', () => {
  it('réécrit en --- tout séparateur du corps, hors blocs de code', () => {
    const body = ['A', '', '***', '', 'B', '', '  - - -', '', '```', '***', '```', '', '___', ''].join('\n');
    expect(normalizeThematicBreaks(body)).toBe(
      ['A', '', '---', '', 'B', '', '---', '', '```', '***', '```', '', '---', ''].join('\n'),
    );
  });

  it('insère une ligne vide avant --- si la ligne précédente est du texte', () => {
    expect(normalizeThematicBreaks('Texte\n***\nSuite')).toBe('Texte\n\n---\nSuite');
    expect(normalizeThematicBreaks('# Titre\n***\n')).toBe('# Titre\n---\n');
  });

  it('ne touche pas un corps déjà conforme, ni un titre setext', () => {
    const body = 'A\n\n---\n\nTitre\n---\n\n```\n***\n```\n';
    expect(normalizeThematicBreaks(body)).toBe(body);
  });

  it('conserve les fins de ligne CRLF', () => {
    expect(normalizeThematicBreaks('A\r\n\r\n***\r\n\r\nB')).toBe('A\r\n\r\n---\r\n\r\nB');
  });

  it('ne considère pas un --- initial du corps comme un frontmatter', () => {
    expect(normalizeThematicBreaks('***\n\nA\n\n***\n')).toBe('---\n\nA\n\n---\n');
  });
});
