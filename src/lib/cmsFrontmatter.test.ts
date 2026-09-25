import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import {
  parseCmsConfig,
  parseEntryText,
  readEntry,
  sveltiaSave,
  type CmsCollection,
  type CmsField,
} from './cmsFrontmatter';

/**
 * Garde de contenu (plan 22, T1 ; D148, D149) : chaque fichier de
 * `src/content/**` est déjà ce que Sveltia 0.221 écrit quand on l'ouvre puis
 * le sauvegarde sans rien toucher — même frontmatter (guillemets, listes en
 * bloc, ordre des champs de `config.yml`, défauts explicites), même ligne vide
 * avant le corps, même fin. Une sauvegarde sans modification ne change donc
 * aucun octet. Correctif : `node scripts/canonicalize-content.mjs --write`.
 */
const ROOT = new URL('../../', import.meta.url);
const config = parseCmsConfig(readFileSync(new URL('public/admin/config.yml', ROOT), 'utf8'));

interface File {
  id: string;
  collection: CmsCollection;
  raw: string;
}

function contentFiles(): File[] {
  return config.collections.flatMap((collection) => {
    const dir = new URL(`${collection.folder}/`, ROOT);
    return readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => ({
        id: `${collection.name}/${d.name}`,
        collection,
        raw: readFileSync(new URL(`${d.name}/index.md`, dir), 'utf8'),
      }));
  });
}

const collection = (name: string) => config.collections.find((c) => c.name === name)!;
const save = (raw: string, name = 'blog') => sveltiaSave(raw, collection(name), config.output);

/** Première ligne différente, pour un message d'échec lisible. */
function firstDifference(before: string, after: string): string {
  const a = before.split('\n');
  const b = after.split('\n');
  const i = a.findIndex((line, k) => line !== b[k]);
  const at = i === -1 ? a.length : i;
  return `ligne ${at + 1}: ${JSON.stringify(a[at] ?? '<fin>')} → ${JSON.stringify(b[at] ?? '<fin>')}`;
}

const k9s = () => contentFiles().find((f) => f.id === 'blog/k9s-kubernetes-terminal-ui')!.raw;

describe('frontmatter dans la forme écrite par Sveltia 0.221 (plan 22, T1)', () => {
  it('chaque fichier = ce que Sveltia 0.221 écrit pour lui (frontmatter, ligne vide, fin)', () => {
    const files = contentFiles();
    expect(files.length).toBeGreaterThan(0);
    const drift = files
      .map((f) => ({ f, out: sveltiaSave(f.raw, f.collection, config.output) }))
      .filter(({ f, out }) => out !== f.raw)
      .map(({ f, out }) => `${f.id} — ${firstDifference(f.raw, out)}`);
    expect(drift, 'corriger avec node scripts/canonicalize-content.mjs --write').toEqual([]);
  });

  it('chaque article, prompt et skill déclare draft (le défaut du CMS est true)', () => {
    const withDraft = config.collections.filter((c) => c.fields.some((f) => f.name === 'draft')).map((c) => c.name);
    expect(withDraft).toEqual(['blog', 'prompts', 'skills']);
    const missing = contentFiles()
      .filter((f) => withDraft.includes(f.collection.name))
      .filter((f) => typeof readEntry(f.raw).data.draft !== 'boolean')
      .map((f) => f.id);
    expect(missing).toEqual([]);
  });

  it('signale chaque défaut planté (guillemets, liste en ligne, ordre, featured absent, ligne vide)', () => {
    const raw = k9s();
    expect(save(raw)).toBe(raw);
    const plants: Record<string, string> = {
      'title: "x"': raw.replace(/^title: .*$/m, 'title: "x"'),
      'tags: [a]': raw.replace(/^tags:\n(?: {2}- .*\n)+/m, 'tags: [a]\n'),
      'clés dans le désordre': raw.replace(/^(title: .*)\n(description: .*)$/m, '$2\n$1'),
      'featured absent': raw.replace(/^featured: false\n/m, ''),
      'pas de ligne vide après ---': raw.replace(/\n---\n\n/, '\n---\n'),
    };
    for (const [name, planted] of Object.entries(plants)) {
      expect(planted, name).not.toBe(raw);
      expect(save(planted), name).not.toBe(planted);
    }
  });
});

describe('réplique de la lecture et de l’écriture de Sveltia', () => {
  const blogHead = [
    'title: Titre',
    'description: Résumé',
    'pubDate: 2025-10-20T14:00:00+02:00',
    'category: Outils',
  ];

  it('lit le fichier comme parseFrontMatter (rogné, CRLF, un saut retiré devant le corps)', () => {
    expect(parseEntryText('\n---\r\ntitle: a\r\n---\r\n\r\n\r\nCorps\r\n\n')).toEqual({ title: 'a', body: '\nCorps' });
    expect(parseEntryText('---\ntitle: a\n---\n')).toEqual({ title: 'a', body: undefined });
    expect(parseEntryText('Sans frontmatter')).toEqual({ body: 'Sans frontmatter' });
  });

  it('écrit ---, la tête, ---, une ligne vide, le corps, un saut final ; rien après --- sans corps', () => {
    const out = save(`---\n${blogHead.join('\n')}\n---\nCorps  \n`);
    expect(out).toBe(`---\n${blogHead.join('\n')}\ndraft: false\nfeatured: false\n---\n\nCorps\n`);
    const prompt = sveltiaSave('---\ntitle: P\ndescription: D\ndraft: true\n---\n', collection('prompts'), config.output);
    expect(prompt).toBe('---\ntitle: P\ndescription: D\nformat: fiche\ntool: Claude\ndraft: true\n---\n');
  });

  it('guillemets simples seulement si YAML l’exige ; listes en bloc indentées', () => {
    const out = save(
      `---\ntitle: "a : b"\ndescription: "l'été"\npubDate: 2025-10-20T14:00:00+02:00\ncategory: "Outils"\ntags: [x, "y"]\n---\n\nC\n`,
    );
    expect(out).toContain("title: 'a : b'\ndescription: l'été\n");
    expect(out).toContain('category: Outils\ntags:\n  - x\n  - y\n');
  });

  it('ordre des champs de config.yml, items par ordre des sous-champs, clés inconnues triées à la fin', () => {
    const out = sveltiaSave(
      [
        '---',
        'zeta: 1',
        'variables:',
        '  - { default: "4", name: N, extra: e }',
        'alpha10: a',
        'alpha9: b',
        'description: D',
        'title: T',
        '---',
        '',
      ].join('\n'),
      collection('prompts'),
      config.output,
    );
    expect(out).toBe(
      [
        '---',
        'title: T',
        'description: D',
        'format: fiche',
        'variables:',
        '  - name: N',
        "    default: '4'",
        '    extra: e',
        'tool: Claude',
        'draft: false',
        'alpha9: b',
        'alpha10: a',
        'zeta: 1',
        '---',
        '',
      ].join('\n'),
    );
  });

  it('retire les champs optionnels vides, garde les requis ; rogne les chaînes ; texte non chaîne → chaîne', () => {
    const out = save(
      `---\n${blogHead.join('\n')}\ntags: []\ncoverAlt: ''\naiUsage:\nrelatedProjects: []\n---\n\nC\n`,
    );
    expect(out).not.toMatch(/^(tags|coverAlt|aiUsage|relatedProjects):/m);
    const skill = sveltiaSave(
      '---\ntitle: " S "\ndescription: ""\nversion: 2\nskillCount: "3"\n---\n',
      collection('skills'),
      config.output,
    );
    expect(skill).toBe("---\ntitle: S\ndescription: ''\ntype: claude-code\nversion: '2'\nskillCount: 3\ndraft: false\n---\n");
  });

  it('rejoue la réécriture des éditeurs quand on la lui passe (corps, champs code)', () => {
    const snippet = sveltiaSave(
      '---\ntitle: T\ndescription: D\nsnippet: |\n  a\n---\n\n*x*\n',
      collection('projects'),
      config.output,
      { markdown: (v) => v.replace('*x*', '_x_'), code: (v) => v.replace(/\n+$/, '') },
    );
    expect(snippet).toContain('snippet: a\n');
    expect(snippet).toMatch(/\n\n_x_\n$/);
  });

  it('refuse un type de champ qu’elle ne modélise pas', () => {
    const fields: CmsField[] = [{ name: 'o', widget: 'object', fields: [{ name: 'a' }] }];
    expect(() => sveltiaSave('---\no: 1\n---\n', { name: 'x', folder: 'x', fields }, {})).toThrow(/non pris en charge/);
  });
});

describe('yaml = la version embarquée par Sveltia', () => {
  it('devDependency yaml épinglée à 2.9.1, installée, et listée dans la carte de sources de Sveltia 0.221', () => {
    const pkg = JSON.parse(readFileSync(new URL('package.json', ROOT), 'utf8'));
    expect(pkg.devDependencies.yaml).toBe('2.9.1');
    const installed = JSON.parse(readFileSync(new URL('node_modules/yaml/package.json', ROOT), 'utf8'));
    expect(installed.version).toBe('2.9.1');
    const map = new URL('node_modules/@sveltia/cms/dist/sveltia-cms.mjs.map', ROOT);
    expect(existsSync(map)).toBe(true);
    const sources: string[] = JSON.parse(readFileSync(map, 'utf8')).sources;
    const bundled = new Set(sources.map((s) => /\/yaml@([\d.]+)\//.exec(s)?.[1]).filter(Boolean));
    expect([...bundled]).toEqual(['2.9.1']);
  });
});
