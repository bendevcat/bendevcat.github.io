import { describe, expect, it } from 'vitest';
import { defaultFile, explorerLines, fileTree, previewRange, rebuildExcerpt, type TreeRow } from './skillExplorer';

// Les noms de tests cités par R3 (plan 17) sont repris MOT POUR MOT.

const ANTI_DRIFT = [
  'skills/anti-drift-planning/SKILL.md',
  'commands/verify.md',
  'commands/init.md',
  '.claude-plugin/plugin.json',
  'commands/lint.md',
  'commands/new-plan.md',
  'commands/resume.md',
  'commands/start-session.md',
  'commands/status.md',
];

const SUPERPOWERS = [
  '.claude-plugin/plugin.json',
  'hooks/hooks.json',
  'skills/using-superpowers/SKILL.md',
  'skills/brainstorming/SKILL.md',
  'skills/using-git-worktrees/SKILL.md',
  'skills/writing-plans/SKILL.md',
  'skills/subagent-driven-development/SKILL.md',
  'skills/executing-plans/SKILL.md',
  'skills/test-driven-development/SKILL.md',
  'skills/requesting-code-review/SKILL.md',
  'skills/finishing-a-development-branch/SKILL.md',
];

const show = (rows: TreeRow[]) =>
  rows.map((row) => `${'  '.repeat(row.depth)}${row.kind === 'dir' ? '▸' : '·'} ${row.label}`);

describe('skill file explorer (plan 17)', () => {
  it('lists directories before files, each level by code point', () => {
    const rows = fileTree(['b.md', 'a.md', 'Z/x.md', 'Z/y.md', 'a/one.md', 'a/two.md', 'B.md']);
    expect(show(rows)).toEqual([
      '▸ Z/',
      '  · x.md',
      '  · y.md',
      '▸ a/',
      '  · one.md',
      '  · two.md',
      '· B.md',
      '· a.md',
      '· b.md',
    ]);
    // anti-drift-planning : 9 fichiers, 10 rangées ; `.` (0x2E) passe avant les lettres.
    const anti = fileTree(ANTI_DRIFT);
    expect(show(anti)).toEqual([
      '· .claude-plugin/plugin.json',
      '▸ commands/',
      '  · init.md',
      '  · lint.md',
      '  · new-plan.md',
      '  · resume.md',
      '  · start-session.md',
      '  · status.md',
      '  · verify.md',
      '· skills/anti-drift-planning/SKILL.md',
    ]);
    expect(anti.filter((row) => row.kind === 'file')).toHaveLength(9);
    // Une rangée de fichier porte le chemin complet ; une rangée de dossier aussi.
    expect(anti[0].path).toBe('.claude-plugin/plugin.json');
    expect(anti[1]).toEqual({ kind: 'dir', label: 'commands/', path: 'commands', depth: 0 });
    expect(anti[2].path).toBe('commands/init.md');
  });

  it('merges a single-file directory into its file row and a single-directory chain into one row', () => {
    const rows = fileTree(SUPERPOWERS);
    expect(show(rows)).toEqual([
      '· .claude-plugin/plugin.json',
      '· hooks/hooks.json',
      '▸ skills/',
      '  · brainstorming/SKILL.md',
      '  · executing-plans/SKILL.md',
      '  · finishing-a-development-branch/SKILL.md',
      '  · requesting-code-review/SKILL.md',
      '  · subagent-driven-development/SKILL.md',
      '  · test-driven-development/SKILL.md',
      '  · using-git-worktrees/SKILL.md',
      '  · using-superpowers/SKILL.md',
      '  · writing-plans/SKILL.md',
    ]);
    expect(rows).toHaveLength(12);
    expect(rows.filter((row) => row.kind === 'file')).toHaveLength(11);
    expect(rows[3].path).toBe('skills/brainstorming/SKILL.md');
    // Une chaîne de dossiers à enfant unique qui s'ouvre sur plusieurs entrées : une rangée de dossier.
    expect(show(fileTree(['a/b/c/x.md', 'a/b/c/y.md']))).toEqual(['▸ a/b/c/', '  · x.md', '  · y.md']);
    expect(fileTree(['a/b/c/x.md', 'a/b/c/y.md'])[0].path).toBe('a/b/c');
    // Un fichier seul à la racine reste tel quel ; une liste vide ne donne rien.
    expect(show(fileTree(['README.md']))).toEqual(['· README.md']);
    expect(fileTree([])).toEqual([]);
  });

  it("selects the SKILL.md of the skill's name, else the first SKILL.md, else the first file", () => {
    expect(defaultFile(ANTI_DRIFT, 'anti-drift-planning')).toBe('skills/anti-drift-planning/SKILL.md');
    // superpowers : pas de skills/superpowers/SKILL.md → le premier SKILL.md dans l'ordre de l'arbre.
    expect(defaultFile(SUPERPOWERS, 'superpowers')).toBe('skills/brainstorming/SKILL.md');
    expect(defaultFile(SUPERPOWERS, undefined)).toBe('skills/brainstorming/SKILL.md');
    expect(defaultFile(SUPERPOWERS, 'writing-plans')).toBe('skills/writing-plans/SKILL.md');
    // Aucun SKILL.md : le premier fichier dans l'ordre de l'arbre, pas dans l'ordre stocké.
    expect(defaultFile(['z.md', 'docs/a.md', 'docs/b.md'], 'x')).toBe('docs/a.md');
    expect(defaultFile([], 'x')).toBeNull();
  });

  it('tones headings, rules, front-matter and JSON keys and values', () => {
    const md = ['---', 'name: brainstorming', 'description: "Use when"', '---', '', '# Brainstorming', '## Steps', 'Plain text: no key', '####### seven'].join('\n');
    const lines = explorerLines(md, 'skills/brainstorming/SKILL.md');
    expect(lines.map((line) => line.segments)).toEqual([
      [{ kind: 'rule', text: '---' }],
      [
        { kind: 'key', text: 'name:' },
        { kind: 'value', text: ' brainstorming' },
      ],
      [
        { kind: 'key', text: 'description:' },
        { kind: 'value', text: ' "Use when"' },
      ],
      [{ kind: 'rule', text: '---' }],
      [],
      [{ kind: 'heading', text: '# Brainstorming' }],
      [{ kind: 'heading', text: '## Steps' }],
      // Hors front matter, une « clé: » n'est pas colorée.
      [{ kind: 'plain', text: 'Plain text: no key' }],
      [{ kind: 'plain', text: '####### seven' }],
    ]);
    // Un `#` sans espace n'est pas un titre ; un `---` hors tête reste un filet.
    expect(explorerLines('#tag\ntext\n---', 'a.md').map((line) => line.segments)).toEqual([
      [{ kind: 'plain', text: '#tag' }],
      [{ kind: 'plain', text: 'text' }],
      [{ kind: 'rule', text: '---' }],
    ]);
    // Front matter non refermé (extrait coupé) : il court jusqu'à la fin ; indentation gardée neutre.
    expect(explorerLines('---\nallowed-tools:\n  - Read', 'commands/lint.md').map((line) => line.segments)).toEqual([
      [{ kind: 'rule', text: '---' }],
      [{ kind: 'key', text: 'allowed-tools:' }],
      [{ kind: 'plain', text: '  - Read' }],
    ]);
    // JSON : clé entre guillemets + `:` → windowKey, le reste de la ligne → windowValue.
    const json = '{\n  "name": "superpowers",\n  "version": "6.4.1",\n  "author": {\n  }\n}';
    expect(explorerLines(json, '.claude-plugin/plugin.json').map((line) => line.segments)).toEqual([
      [{ kind: 'plain', text: '{' }],
      [
        { kind: 'plain', text: '  ' },
        { kind: 'key', text: '"name":' },
        { kind: 'value', text: ' "superpowers",' },
      ],
      [
        { kind: 'plain', text: '  ' },
        { kind: 'key', text: '"version":' },
        { kind: 'value', text: ' "6.4.1",' },
      ],
      [
        { kind: 'plain', text: '  ' },
        { kind: 'key', text: '"author":' },
        { kind: 'value', text: ' {' },
      ],
      [{ kind: 'plain', text: '  }' }],
      [{ kind: 'plain', text: '}' }],
    ]);
    // Ailleurs qu'en .md / .json, pas de clé : `name: x` reste neutre.
    expect(explorerLines('name: x', 'notes.txt')[0].segments).toEqual([{ kind: 'plain', text: 'name: x' }]);
    // Un .md sans front matter en tête : pas de clé.
    expect(explorerLines('intro\nname: x', 'a.md')[1].segments).toEqual([{ kind: 'plain', text: 'name: x' }]);
  });

  it('rebuilds each excerpt from its segments', () => {
    const samples: [string, string][] = [
      ['---\nname: x\ndescription: "a: b"\n---\n\n# T\n\ntext  \n', 'skills/x/SKILL.md'],
      ['{\n  "hooks": {\n    "SessionStart": [\n', 'hooks/hooks.json'],
      ['', 'empty.md'],
      ['\n\n', 'blank.md'],
      ['---\r\nk: v\r\n---', 'crlf.md'],
    ];
    for (const [excerpt, path] of samples) {
      expect(rebuildExcerpt(explorerLines(excerpt, path))).toBe(excerpt);
    }
  });

  it('writes the preview range as l. 1–K / N, or N l. when the excerpt is the whole file', () => {
    expect(previewRange('a\nb\nc', 40)).toBe('l. 1–3 / 40');
    // Un saut de ligne final ne compte pas pour une ligne.
    expect(previewRange('a\nb\nc\n', 40)).toBe('l. 1–3 / 40');
    expect(previewRange('a\nb\nc\n', 3)).toBe('3 l.');
  });
});
