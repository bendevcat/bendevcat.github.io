import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';
import {
  findBodyIssues,
  findCodeFieldIssues,
  normalizeBody,
  normalizeCodeField,
  type CanonicalIssue,
  type CanonicalRule,
} from './cmsCanonical';
import { codeWindowText } from './codeWindow';
import { measurePromptText } from './listCards';

/**
 * Garde de contenu (plan 21, F2 ; D145) : chaque valeur que Sveltia édite
 * — le corps (`widget: markdown`) et les champs `prompt`, `snippet`,
 * `files[].excerpt` (`widget: code`) — est déjà dans la forme que ses
 * éditeurs Lexical réécrivent à l'ouverture. Sinon **Save** s'active sans
 * modification et la sauvegarde suivante publie la forme réécrite. Ce test lit
 * les fichiers réels de `src/content/**`, comme `thematicBreaks.test.ts`.
 */
const CONTENT_DIR = new URL('../content/', import.meta.url);
const COLLECTIONS = ['blog', 'projects', 'prompts', 'skills'] as const;

/**
 * Écarts connus, laissés en place parce que la forme canonique changerait ce
 * que le site affiche (D145 : rien ne change à l'écran) — à trancher, pas à
 * normaliser. Tolérés (jamais exigés) : une sauvegarde depuis le CMS les fait
 * disparaître sans rougir la CI.
 */
const PENDING: Record<string, readonly CanonicalRule[]> = {
  // Vide depuis F3 (D146) : la liste lâche de `meilleurs-vpn-2025` et le guide
  // `decouper-un-projet-en-plans-anti-drift` sont passés en forme canonique.
};

interface Entry {
  id: string;
  data: Record<string, any>;
  body: string;
}

/** Lecture comme Sveltia (`file/parse.js`) : fichier rogné, un saut retiré devant le corps. */
function readEntry(collection: string, slug: string): Entry {
  const raw = readFileSync(new URL(`${collection}/${slug}/index.md`, CONTENT_DIR), 'utf8').trim();
  const match = /^---\n([\s\S]*?)\n---(?:\n([\s\S]*))?$/.exec(raw);
  if (!match) throw new Error(`${collection}/${slug}: frontmatter introuvable`);
  return { id: `${collection}/${slug}`, data: parse(match[1]), body: (match[2] ?? '').replace(/^\n/, '') };
}

function allEntries(): Entry[] {
  return COLLECTIONS.flatMap((collection) =>
    readdirSync(new URL(`${collection}/`, CONTENT_DIR), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => readEntry(collection, d.name)),
  );
}

/** Les valeurs de champs `code` d'une entrée, nommées comme dans le frontmatter. */
function codeFields(entry: Entry): [string, string][] {
  const { data } = entry;
  const fields: [string, unknown][] = [
    ['prompt', data.prompt],
    ['snippet', data.snippet],
    ...((data.files ?? []) as { excerpt?: unknown }[]).map((f, i): [string, unknown] => [`files[${i}].excerpt`, f.excerpt]),
  ];
  return fields.filter((f): f is [string, string] => typeof f[1] === 'string');
}

const describeIssue = (where: string) => (i: CanonicalIssue) => `${where}:${i.line} ${i.rule} ${JSON.stringify(i.text)}`;
const rules = (issues: CanonicalIssue[]) => [...new Set(issues.map((i) => i.rule))].sort();

describe('forme canonique Sveltia du contenu (plan 21, F2)', () => {
  const entries = allEntries();

  it('aucune valeur de src/content/** n’est réécrite par Sveltia à l’ouverture', () => {
    expect(entries.length).toBeGreaterThan(0);
    const offenders = entries.flatMap((entry) => {
      const allowed = PENDING[entry.id] ?? [];
      return [
        ...findBodyIssues(entry.body)
          .filter((i) => !allowed.includes(i.rule))
          .map(describeIssue(`${entry.id} corps`)),
        ...codeFields(entry).flatMap(([name, value]) =>
          findCodeFieldIssues(value).map(describeIssue(`${entry.id} ${name}`)),
        ),
      ];
    });
    expect(offenders).toEqual([]);
  });

  it('chaque corps hors écart connu est un point fixe de normalizeBody', () => {
    const moved = entries.filter((e) => !(e.id in PENDING) && normalizeBody(e.body) !== e.body).map((e) => e.id);
    expect(moved).toEqual([]);
  });

  it('signale un gras sur deux lignes, un *x*, un tableau |---| et une valeur de code finie par \\n', () => {
    expect(rules(findBodyIssues('Et la **table des\nrationalisations**, la suite.'))).toEqual(['span']);
    expect(rules(findBodyIssues('dans une **action\ncomposite** : une étape'))).toEqual(['span', 'split-multiline']);
    expect(rules(findBodyIssues('logger *avant* d’exécuter'))).toEqual(['star']);
    expect(rules(findBodyIssues('| Plan | Objectif |\n|---|---|\n| P1 | blog |'))).toEqual(['table']);
    expect(rules(findCodeFieldIssues('name: Check PR\non: push\n'))).toEqual(['final-newline']);
  });

  it('signale les autres constructions réécrites à l’ouverture', () => {
    const cases: [string, CanonicalRule[]][] = [
      ['Perte : ~18 %', ['tilde']],
      ['5 * 3', ['star']],
      ['***gras italique*** ici', ['star']],
      ['__gras__ ici', ['underscore-strong']],
      ['_**gras italique**_ ici', ['nesting']],
      ['du `code\nsur deux lignes` ici', ['span', 'split-multiline']],
      ['du ~~barré\nsur deux~~ ici', ['span', 'split-multiline']],
      ['un _mot\npenché_ ici', ['split-multiline']],
      ['| A | B |\n| :--- | ---: |\n| a | b |', ['table', 'table-align']],
      ['| A     | B |\n| ----- | - |\n| a     | b |', ['table']],
      ['| A | B |\n| --- | --- |\n| a \\| b | c |', ['table']],
      ['| A | B |\n| --- | --- |\n| a |', ['table']],
      ['| A | B |\n| --- | --- |\n| _a_ | b |', ['star']],
      ['```\nkubectl get pods\n```', ['fence']],
      ['~~~sh\nls\n~~~', ['fence']],
      ['```c++\nx\n```', ['fence']],
      ['- a\n\n  ```sh\n  ls\n  ```', ['fence']],
      ['Un\n\n\nDeux', ['blank-lines']],
      ['## Titre\nTexte', ['block-gap']],
      ['Texte\n## Titre', ['block-gap']],
      ['Texte :\n- item', ['block-gap']],
      ['Texte\n```sh\nls\n```', ['block-gap']],
      ['```sh\nls\n```\nTexte', ['block-gap']],
      ['Texte\n| A |\n| --- |', ['block-gap']],
      ['> cité\nsuite paresseuse', ['block-gap']],
      ['- a\n\n- b', ['loose-list']],
      ['1. **WireGuard**\n\n   * rapide', ['list-indent', 'loose-list']],
      ['- a\n  - b', ['list-indent']],
      ['1. a\n1. b', ['list-number']],
      ['Titre\n---', ['setext']],
    ];
    for (const [body, expected] of cases) expect([body, rules(findBodyIssues(body))]).toEqual([body, expected]);
    expect(rules(findCodeFieldIssues('a\n```\nb'))).toEqual(['fence-in-code']);
    expect(rules(findCodeFieldIssues('Le **plan\nsuivant** vient'))).toEqual(['split-multiline']);
    expect(rules(findCodeFieldIssues('a\n\n'))).toEqual(['final-newline']);
  });

  it('accepte ce que Sveltia écrit lui-même (sorties de l’éditeur relevées au banc Lexical)', () => {
    const written = [
      'Le **protocole** impose de logger _avant_ d’exécuter.',
      'Et la\n**table des rationalisations**, la partie la plus utile.',
      'Un **a**\n**b** coupé par splitMultilineFormatting.',
      '**_gras italique_** et ~~barré~~, `code`, `` a`b ``.',
      'Perte : \\~18 % · 5 \\* 3 · \\*\\*littéral\\*\\*.',
      '_redirects, snake_case et https://x.y/a_b',
      '[lien_1](https://x.y/a_b*c~d "titre") et ![alt](./a_b.png)',
      '| Plan | Objectif |\n| --- | --- |\n| *P1* | **blog** |\n| `:q` |  |',
      '```plaintext\n  **pas** du *Markdown*\n```',
      '```plain\nx\n```\n\n```js title="a"\ny\n```',
      '- a\n    - b\n        - c\n- d\n\n1. un\n2. deux\n    1. sous\n\n* e\n\n- f',
      '> cité\n>\n> **encore**',
      '# Titre\n\nTexte\n\n---\n\n## Suite',
      '<blockquote lang="en">\n\nIt _doesn’t_ jump.\n\n</blockquote>',
    ];
    const flagged = written.flatMap((body) => findBodyIssues(body).map(describeIssue(JSON.stringify(body))));
    expect(flagged).toEqual([]);
    expect(findCodeFieldIssues('name: Check PR\n\non: push')).toEqual([]);
  });

  it('normalizeBody ne touche que la syntaxe et rend un corps sans écart', () => {
    const body = [
      'Et la **table des',
      'rationalisations**, la partie la plus utile.',
      '',
      '',
      'Le contenu vit en *page bundles* — pas dans un*mot*.',
      '',
      '| Touche | Action          |',
      '|--------|-----------------|',
      '| `:`    | Commande        |',
      '',
      '```',
      '  *brut*  ~ ',
      '```',
      '',
      'Perte : ~18 %',
    ].join('\n');
    const normalized = normalizeBody(body);
    expect(normalized).toBe(
      [
        'Et la',
        '**table des rationalisations**, la partie la plus utile.',
        '',
        'Le contenu vit en _page bundles_ — pas dans un*mot*.',
        '',
        '| Touche | Action |',
        '| --- | --- |',
        '| `:` | Commande |',
        '',
        '```plaintext',
        '  *brut*  ~ ',
        '```',
        '',
        'Perte : \\~18 %',
      ].join('\n'),
    );
    // Mêmes mots, dans le même ordre.
    const words = (s: string) => s.replace(/[*_|`\\~-]/g, ' ').split(/\s+/).filter((w) => w && w !== 'plaintext');
    expect(words(normalized)).toEqual(words(body));
    // Seul reste le `*` collé à un mot : l'écrire `_` changerait le rendu.
    expect(rules(findBodyIssues(normalized))).toEqual(['star']);
    expect(normalizeBody(normalized)).toBe(normalized);
    expect(normalizeCodeField('a\nb\n\n')).toBe('a\nb');
    expect(normalizeCodeField('a\nb')).toBe('a\nb');
  });

  it('le site rend chaque valeur de code pareil avec ou sans saut de ligne final', () => {
    for (const entry of entries) {
      if (typeof entry.data.snippet === 'string') {
        const bare = normalizeCodeField(entry.data.snippet);
        expect(codeWindowText(`${bare}\n`)).toBe(codeWindowText(bare));
      }
      if (typeof entry.data.prompt === 'string') {
        const data = { format: entry.data.format, prompt: normalizeCodeField(entry.data.prompt), variables: entry.data.variables };
        const withNewline = { ...data, prompt: `${data.prompt}\n` };
        expect(measurePromptText(withNewline, entry.body)).toBe(measurePromptText(data, entry.body));
      }
    }
  });
});
