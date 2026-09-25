import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import {
  datetimeEditorValue,
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
const save = (raw: string, name = 'blog', timeZone?: string) =>
  sveltiaSave(raw, collection(name), config.output, {}, { timeZone });

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

  // Un `draft` absent reçoit le défaut de config.yml, `true` depuis le plan 22
  // (T2) : c'est pourquoi chaque fichier du dépôt déclare `draft`.
  it('écrit ---, la tête, ---, une ligne vide, le corps, un saut final ; rien après --- sans corps', () => {
    const out = save(`---\n${blogHead.join('\n')}\n---\nCorps  \n`);
    expect(out).toBe(`---\n${blogHead.join('\n')}\ndraft: true\nfeatured: false\n---\n\nCorps\n`);
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
        'draft: true',
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
    expect(skill).toBe("---\ntitle: S\ndescription: ''\ntype: claude-code\nversion: '2'\nskillCount: 3\ndraft: true\n---\n");
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

/**
 * Plan 22, F1 (D151) : l'éditeur `datetime` de Sveltia 0.221 réécrit la
 * valeur dès qu'il est monté (`date-time-editor.svelte`, deux `watch` =
 * `$effect`) : `getInputValue` ne garde que `YYYY-MM-DDTHH:mm` pour
 * l'`<input type="datetime-local">`, `getCurrentValue` le reformate
 * (`format` du champ, décalage du navigateur), et `shouldUpdateValue` ne
 * remplace la valeur que si l'instant change — donc seulement quand ses
 * secondes ne sont pas nulles. Valeurs attendues relevées en exécutant
 * `helpers.js` / `timezone.js` / `config.js` de `npm/index.js.map` avec le
 * dayjs 1.11.23 qu'il embarque, sous chaque fuseau.
 */
describe('champs datetime : réécriture par l’éditeur de Sveltia (plan 22, F1)', () => {
  const updated = 'updatedDate: 2026-09-25T17:32:52+02:00';
  const withUpdated = (line: string) => k9s().replace(/^(pubDate: .*)$/m, `$1\n${line}`);

  it('signale une date aux secondes non nulles (updatedDate: …T17:32:52+02:00) et la ramène à la minute', () => {
    const planted = withUpdated(updated);
    expect(planted).not.toBe(k9s());
    expect(save(planted, 'blog', 'Europe/Paris')).toBe(withUpdated('updatedDate: 2026-09-25T17:32:00+02:00'));
    expect(save(planted, 'blog', 'UTC')).toBe(withUpdated('updatedDate: 2026-09-25T15:32:00+00:00'));
    expect(save(planted)).not.toBe(planted);
  });

  it('une date à la minute est stable, quel que soit le fuseau', () => {
    const minute = withUpdated('updatedDate: 2026-09-25T17:32:00+02:00');
    for (const tz of ['Europe/Paris', 'UTC', 'America/New_York', 'Asia/Kolkata']) expect(save(minute, 'blog', tz), tz).toBe(minute);
  });

  const datetime = collection('blog').fields.find((f) => f.name === 'updatedDate')!;
  const dateOnly = collection('skills').fields.find((f) => f.name === 'changelog')!.fields!.find((f) => f.name === 'date')!;

  // [valeur, Europe/Paris, UTC, America/New_York, Asia/Kolkata]
  const observed: [string, string, string, string, string][] = [
    ['2026-09-25T17:32:52+02:00', '2026-09-25T17:32:00+02:00', '2026-09-25T15:32:00+00:00', '2026-09-25T11:32:00-04:00', '2026-09-25T21:02:00+05:30'],
    ['2025-10-28T23:59:07.000+01:00', '2025-10-28T23:59:00+01:00', '2025-10-28T22:59:00+00:00', '2025-10-28T18:59:00-04:00', '2025-10-29T04:29:00+05:30'],
    ['2025-10-20T14:00:30Z', '2025-10-20T16:00:00+02:00', '2025-10-20T14:00:00+00:00', '2025-10-20T10:00:00-04:00', '2025-10-20T19:30:00+05:30'],
    ['2025-05-05T10:20:30', '2025-05-05T10:20:00+02:00', '2025-05-05T10:20:00+00:00', '2025-05-05T10:20:00-04:00', '2025-05-05T10:20:00+05:30'],
    ['2025-10-26T02:30:15-03:30', '2025-10-26T07:00:00+01:00', '2025-10-26T06:00:00+00:00', '2025-10-26T02:00:00-04:00', '2025-10-26T11:30:00+05:30'],
    // Sans décalage, `getDate` se rabat sur `dayjs(valeur)`, qui garde les millisecondes.
    ['2024-05-13T08:12:00.648', '2024-05-13T08:12:00+02:00', '2024-05-13T08:12:00+00:00', '2024-05-13T08:12:00-04:00', '2024-05-13T08:12:00+05:30'],
  ];
  const zones = ['Europe/Paris', 'UTC', 'America/New_York', 'Asia/Kolkata'];

  it('datetime-local : secondes non nulles → minute de l’instant au décalage du navigateur', () => {
    for (const [value, ...expected] of observed) {
      zones.forEach((tz, i) => expect(datetimeEditorValue(value, datetime, tz), `${value} @ ${tz}`).toBe(expected[i]));
    }
  });

  it('datetime-local : valeur inchangée quand l’instant tombe sur la minute (millisecondes ignorées par le format)', () => {
    const kept = [
      '',
      '2026-09-25T17:32:00+02:00',
      '2025-10-28T23:59:00.000+01:00',
      '2025-10-28T23:59:00.500+01:00',
      '2025-10-20T14:00:00Z',
      '2025-10-26T02:30:00+05:45',
      '2025-05-05',
      '2025-05-05T10:20',
      '2025-05-05T10:20:00',
    ];
    for (const value of kept) for (const tz of zones) expect(datetimeEditorValue(value, datetime, tz), `${value} @ ${tz}`).toBe(value);
  });

  it('date seule (changelog, YYYY-MM-DD, time_format: false) : valeur inchangée', () => {
    for (const value of ['2026-09-18', '2026-09-18T10:00:00Z', '2026-09-18T23:30:00-05:00', '']) {
      for (const tz of zones) expect(datetimeEditorValue(value, dateOnly, tz), `${value} @ ${tz}`).toBe(value);
    }
  });

  it('chaque champ datetime de config.yml est d’une forme modélisée', () => {
    const all = config.collections.flatMap((c) => c.fields.flatMap((f) => [f, ...(f.fields ?? [])])).filter((f) => f.widget === 'datetime');
    expect(all.map((f) => f.name).sort()).toEqual(['date', 'pubDate', 'startDate', 'updated', 'updatedDate']);
    for (const f of all) expect(() => datetimeEditorValue('2026-09-25T17:32:00+02:00', f, 'UTC'), f.name).not.toThrow();
  });

  it('refuse une option ou une valeur qu’elle ne modélise pas', () => {
    expect(() => datetimeEditorValue('2026-09-25T17:32:52Z', { ...datetime, picker_utc: true } as never, 'UTC')).toThrow(/non pris en charge/);
    expect(() => datetimeEditorValue('2026-09-25T17:32:52Z', { name: 'd', widget: 'datetime' }, 'UTC')).toThrow(/non pris en charge/);
    expect(() => datetimeEditorValue('25/09/2026', datetime, 'UTC')).toThrow(/non prise en charge/);
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
