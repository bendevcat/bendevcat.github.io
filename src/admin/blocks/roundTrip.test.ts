import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import type { EditorComponentDefinition } from '@sveltia/cms';
import { findBodyIssues } from '../../lib/cmsCanonical';
import { readSiteEntries } from '../../lib/blocks/readSiteEntries.mjs';
import { BLOCKS, type BlockId } from '../../lib/blocks/syntax.mjs';
import { normalizeThematicBreaks } from '../../lib/thematicBreaks';
import { blockComponents } from './editorComponents';
import {
  codeFieldRoundTrip,
  componentRegistry,
  componentValues,
  markdownFieldRoundTrip,
  type ComponentRegistry,
  type ComponentValues,
  type ReplicaField,
} from './lexicalRoundTrip';

/**
 * Aller-retour Lexical de Sveltia CMS 0.221 (plan 23, T5, R8 ; D152) : un
 * corps qui porte des blocs `:::` revient identique quand l'entrée est ouverte
 * puis enregistrée sans modification — motif → nœud de composant (valeurs du
 * formulaire, chaque champ relu par son propre éditeur) → `toBlock`. La
 * réplique (`lexicalRoundTrip.ts`) reprend les sources de Sveltia et de
 * @sveltia/ui et les paquets Lexical 0.51.0 que Sveltia embarque ; le banc
 * (R10) reste la preuve dans le navigateur. « Hors `---` » : l'éditeur
 * réécrit les séparateurs `***`, le hook `preSave` les rétablit
 * (`normalizeThematicBreaks`, D126).
 */

const ROOT = new URL('../../../', import.meta.url);
const CONTENT_DIR = new URL('src/content/', ROOT);

interface CollectionConfig {
  name: string;
  fields: (ReplicaField & { fields?: ReplicaField[] })[];
}

const config = parse(readFileSync(new URL('public/admin/config.yml', ROOT), 'utf8')) as {
  collections: CollectionConfig[];
};

/** Champ `name` de la collection, tel que public/admin/config.yml le déclare. */
function configField(collection: string, name: string): ReplicaField & { fields?: ReplicaField[] } {
  const field = config.collections.find((c) => c.name === collection)?.fields.find((f) => f.name === name);
  if (!field) throw new Error(`config.yml : ${collection}.${name} introuvable`);
  return field;
}

/** Les composants que `cms.ts` enregistre (index des entrées lu sur disque). */
const definitions = blockComponents(readSiteEntries());
const registry = componentRegistry(definitions);
const blogBody = configField('blog', 'body');

/** Corps d'article relu à l'ouverture puis enregistré (hook `preSave` compris). */
const saved = (body: string, reg: ComponentRegistry = registry) =>
  normalizeThematicBreaks(markdownFieldRoundTrip(body, blogBody, reg));

/** Lecture comme Sveltia (`file/parse.js`) : fichier rogné, un saut retiré devant le corps. */
function readBody(path: URL): { data: Record<string, any>; body: string } {
  const raw = readFileSync(path, 'utf8').trim();
  const match = /^---\n([\s\S]*?)\n---(?:\n([\s\S]*))?$/.exec(raw);
  if (!match) throw new Error(`${path}: frontmatter introuvable`);
  return { data: parse(match[1]), body: (match[2] ?? '').replace(/^\n/, '') };
}

const block = {
  encadre: (content: string, kind = 'note') => BLOCKS.encadre.toBlock({ kind, content }),
  terminal: (title: string, code: string, lang = 'bash') => BLOCKS.terminal.toBlock({ title, lang, code }),
  carte: (ref: string) => BLOCKS.carte.toBlock({ ref }),
  video: (provider: string, id: string, title: string) => BLOCKS.video.toBlock({ provider, id, title }),
};

const MULTILINE_CALLOUT = block.encadre(
  [
    'Premier paragraphe avec **gras**, _italique_, `code en ligne` et un [lien](/blog/).',
    '',
    '- une puce',
    '- une autre',
    '    - imbriquée',
    '',
    '1. un',
    '2. deux',
    '',
    'Accents « guillemets » — et "doubles" ; dernière ligne.',
  ].join('\n'),
  'astuce',
);

const MULTILINE_TERMINAL = block.terminal(
  'deploy.sh — « prod »',
  ['set -euo pipefail', '', 'npm ci', '  echo "a:::b" | tr : -', 'echo fin :::', ':::', '  - yaml: [liste]', '$ ls *.md ~ _x_\ttab'].join(
    '\n',
  ),
  'bash',
);

/** Blocs canoniques, chacun seul, avec l'id de leur composant. */
const SINGLE_BLOCKS: [string, string, BlockId][] = [
  ['encadré note', block.encadre('Une note.'), 'encadre'],
  ['encadré astuce', block.encadre('Une astuce.', 'astuce'), 'encadre'],
  ['encadré attention', block.encadre('Attention.', 'attention'), 'encadre'],
  ['encadré danger', block.encadre('Danger.', 'danger'), 'encadre'],
  ['encadré vide', block.encadre(''), 'encadre'],
  ['encadré multiligne', MULTILINE_CALLOUT, 'encadre'],
  ['encadré dont une ligne commence par :::', block.encadre('texte\n:::\nsuite\n\n::: pas une clôture'), 'encadre'],
  ['encadré qui cite ::: en fin de ligne', block.encadre('Le séparateur est :::'), 'encadre'],
  ['terminal', block.terminal('install.sh', 'npm ci'), 'terminal'],
  ['terminal sans langage', block.terminal('sortie', 'ok', ''), 'terminal'],
  ['terminal vide', block.terminal('vide', ''), 'terminal'],
  ['terminal multiligne (:::, yaml, blancs)', MULTILINE_TERMINAL, 'terminal'],
  ['terminal qui cite ::: en fin de ligne', block.terminal('fin.sh', 'echo début\necho fin :::'), 'terminal'],
  ['terminal, lignes vides en tête', block.terminal('t', '\n\nlead'), 'terminal'],
  [
    'terminal qui contient ``` et ~~~',
    block.terminal('README.md', 'cat <<EOF\n```sh\nnpm ci\n```\n~~~\nx\n~~~\nEOF\necho x ``` y ````'),
    'terminal',
  ],
  ['terminal, saut de ligne final', block.terminal('t', 'fin\n'), 'terminal'],
  ['carte', block.carte('projects/gha-svu'), 'carte'],
  ['vidéo YouTube', block.video('youtube', 'aqz-KE-bpKQ', 'Big Buck Bunny'), 'video'],
  ['vidéo asciinema', block.video('asciinema', '335480', 'Une session « asciinema »'), 'video'],
];

/** Valeurs attendues du formulaire : `fromBlock` du motif sur le texte du bloc. */
function expectedValues(text: string, id: BlockId): ComponentValues[] {
  const match = text.match(BLOCKS[id].pattern);
  if (!match || match.index !== 0 || match[0] !== text) throw new Error(`motif ${id} : ${JSON.stringify(text)}`);
  return [{ type: `x-${id}`, values: BLOCKS[id].fromBlock(match) }];
}

describe('aller-retour Lexical des blocs (plan 23, R8)', () => {
  it('la config enregistrée : blocs sur le corps des articles, sans imbrication', () => {
    expect(definitions.map((d) => d.id)).toEqual(['encadre', 'terminal', 'carte', 'video']);
    expect(blogBody.editor_components).toEqual(['code-block', 'image', 'encadre', 'terminal', 'carte', 'video']);
    expect(blogBody.allow_nested_components).toBe(false);
  });

  it('chaque bloc revient identique par l’aller-retour Lexical de Sveltia 0.221', () => {
    const fixture = readBody(new URL('src/lib/blocks/fixtures/blocs-demo.md', ROOT)).body;
    expect(fixture).toMatch(/^:::terminal\[/m);
    const all = SINGLE_BLOCKS.map(([, text]) => text);
    expect(all[5]).toBe(MULTILINE_CALLOUT);
    expect(all[11]).toBe(MULTILINE_TERMINAL);
    const bodies: [string, string][] = [
      ['fixture blocs-demo', fixture],
      ...SINGLE_BLOCKS.map(([name, text]): [string, string] => [`${name} seul`, text]),
      ...SINGLE_BLOCKS.map(([name, text]): [string, string] => [
        `${name} entre deux paragraphes`,
        `Avant **le** bloc.\n\n${text}\n\nAprès le bloc.`,
      ]),
      ...SINGLE_BLOCKS.map(([name, text]): [string, string] => [`${name} en fin de document`, `## Titre\n\nTexte.\n\n${text}`]),
      ['blocs adjacents', all.join('\n\n')],
      ['blocs adjacents, ordre inverse', [...all].reverse().join('\n\n')],
      ['blocs, code et image', `![alt](./a.png)\n\n${all[5]}\n\n\`\`\`yaml\na: 1\n\`\`\`\n\n${all[11]}\n\n---\n\nFin.`],
    ];
    const changed = bodies.filter(([, body]) => saved(body) !== body).map(([name, body]) => [name, body, saved(body)]);
    expect(changed).toEqual([]);
  });

  it('chaque bloc devient un nœud de composant : valeurs du formulaire = fromBlock', () => {
    // Un bloc que le motif manquerait resterait du texte et reviendrait souvent
    // identique : l'aller-retour seul ne prouve pas que le formulaire s'ouvre.
    const wrong = SINGLE_BLOCKS.flatMap(([name, text, id]) => {
      const alone = componentValues(text, blogBody, registry);
      const framed = componentValues(`Avant.\n\n${text}\n\nAprès.`, blogBody, registry);
      const expected = expectedValues(text, id);
      return JSON.stringify([alone, framed]) === JSON.stringify([expected, expected]) ? [] : [[name, alone, framed]];
    });
    expect(wrong).toEqual([]);
    const fixture = readBody(new URL('src/lib/blocks/fixtures/blocs-demo.md', ROOT)).body;
    expect(componentValues(fixture, blogBody, registry).map(({ type }) => type)).toEqual([
      ...Array(4).fill('x-encadre'),
      'x-terminal',
      'x-carte',
      'x-video',
      'x-video',
    ]);
    // Blocs adjacents : un nœud par bloc, dans l'ordre.
    const all = SINGLE_BLOCKS.map(([, text]) => text).join('\n\n');
    expect(componentValues(all, blogBody, registry)).toEqual(SINGLE_BLOCKS.flatMap(([, text, id]) => expectedValues(text, id)));
  });

  it('le contenu d’un encadré passe par son propre éditeur (boutons de l’encadré, sans composant)', () => {
    // `*x*` → `_x_`, `__y__` → `**y**` : l'éditeur Lexical imbriqué a relu le contenu.
    expect(saved(block.encadre('*x* et __y__'))).toBe(block.encadre('_x_ et **y**'));
    // Pas de bouton « barré » ni « bloc de code » dans l'encadré : `~~` et ``` ressortent échappés.
    expect(saved(block.encadre('~~barré~~'))).toBe(block.encadre('\\~\\~barré\\~\\~'));
    expect(saved(block.encadre('```sh\nls\n```'))).toBe(block.encadre('\\`\\`\\`sh\nls\n\\`\\`\\`'));
    // Aucun composant dans l'encadré : un bloc imbriqué reste du texte, identique.
    const nested = `::::note\n\n${block.carte('projects/gha-svu')}\n\n::::`;
    expect(saved(nested)).toBe(nested);
  });

  it('le code d’un terminal passe par un champ text : ``` et saut de ligne final gardés (F1, D158)', () => {
    for (const code of ['x ```', 'a\n```\nb', 'fin\n', '```sh\nls\n```']) {
      const body = block.terminal('t', code);
      expect(saved(body)).toBe(body);
      expect(componentValues(body, blogBody, registry)).toEqual([{ type: 'x-terminal', values: { title: 't', lang: 'bash', code } }]);
    }
    // L'éditeur de code (widget `code`, abandonné) aurait perdu ces valeurs.
    expect(codeFieldRoundTrip('a\n```\nb')).toBe('a\n```\n\nb\n\n```plain');
    expect(codeFieldRoundTrip('x ```')).toBe('');
    expect(codeFieldRoundTrip('fin\n')).toBe('fin');
  });

  it('une ligne ``` isolée dans le code inverse la bascule des passes du corps (fence-toggle)', () => {
    // `increaseListIndentation` / `padBlankBlockquoteLines` basculent à chaque
    // ligne ``` ou ~~~ : après une ligne impaire, le code est pris pour du texte…
    // (retrait doublé quand une ligne du corps ressemble à un élément de liste indenté)…
    const code = block.terminal('t', 'a\n```\n  - x\n  --flag');
    expect(saved(code)).toBe(block.terminal('t', 'a\n```\n    - x\n    --flag'));
    // … et la citation qui suit le bloc pour du code.
    const quote = `${block.terminal('t', 'a\n```\nb')}\n\n> q\n>\n> r`;
    expect(saved(quote)).toBe(`${block.terminal('t', 'a\n```\nb')}\n\n> q\n> >\n> r`);
    // Sans liste ni citation autour, rien ne bouge.
    expect(saved(block.terminal('t', 'a\n```\nb'))).toBe(block.terminal('t', 'a\n```\nb'));
  });

  it('garde et réplique d’accord : aucun écart signalé ⇔ corps identique après aller-retour', () => {
    const samples = [
      ...SINGLE_BLOCKS.map(([, text]) => text),
      // Écarts : forme non canonique d'un bloc reconnu…
      ':::note  \n\nx\n\n:::',
      ':::note\n\n\nx\n\n\n:::',
      ':::note\nx\n:::',
      '::::note\n\nx\n\n::::',
      ':::carte{ref="projects/gha-svu"}\n\n:::',
      ':::video[ T ]{youtube="aqz-KE-bpKQ"}\n:::',
      ':::terminal[t]\n```sh\nls\n```\n:::',
      ':::terminal[t]\n\n```sh \nls\n```\n\n:::',
      // … sans ligne vide autour…
      `Texte\n${block.carte('projects/gha-svu')}`,
      `${block.carte('projects/gha-svu')}\nTexte`,
      `${block.carte('projects/gha-svu')}\n${block.video('youtube', 'aqz-KE-bpKQ', 'V')}`,
      // … contenu qu'un éditeur du formulaire réécrit.
      block.encadre('*x*'),
      block.encadre('~~barré~~'),
      block.encadre('```sh\nls\n```'),
      block.encadre('- a\n\n- b'),
      block.encadre('**a\nb**'),
      block.terminal('t', 'a\n```\nb'),
      block.terminal('t', 'fin\n'),
      block.terminal('t', 'a **b\nc** d'),
      // Bascule des passes du corps inversée par une ligne ``` du code.
      block.terminal('t', 'a\n```\n  --flag'),
      block.terminal('t', 'a\n```\n  --flag\n```\n  --ok'),
      block.terminal('t', 'a\n```\n> '),
      block.terminal('t', 'a\n```\n>'),
      `${block.terminal('t', 'a\n```\nb')}\n\n> q\n>\n> r`,
      `> q\n>\n> r\n\n${block.terminal('t', 'a\n```\nb')}`,
      `- a\n    - b\n\n${block.terminal('t', 'a\n```\nb')}\n\n- c\n    - d`,
      `- a\n    - b\n\n${block.terminal('t', 'a\n```\n  - x')}`,
      '````md\n```\n  --x\n````\n\n- a\n    - b',
      '````md\n```\n  - x\n````',
    ];
    const disagreements = samples
      .map((body) => ({ body, clean: findBodyIssues(body).length === 0, stable: saved(body) === body }))
      .filter(({ clean, stable }) => clean !== stable);
    expect(disagreements).toEqual([]);
  });

  it('rouge quand un motif perd ses ancres ^ (réplique sensible aux motifs)', () => {
    const unanchored = componentRegistry(
      definitions.map(
        (d): EditorComponentDefinition => ({
          ...d,
          pattern: new RegExp(d.pattern.source.replace(/(?<!\[)\^/g, ''), d.pattern.flags),
        }),
      ),
    );
    const body = block.encadre('Le séparateur est :::\n\nsuite');
    expect(saved(body)).toBe(body);
    expect(saved(body, unanchored)).not.toBe(body);
    const terminal = block.terminal('fin.sh', 'echo début\necho fin :::');
    expect(componentValues(terminal, blogBody, registry)).toEqual(expectedValues(terminal, 'terminal'));
    expect(componentValues(terminal, blogBody, unanchored)).toEqual([]);
  });

  it('les corps réels de src/content reviennent identiques (hors `---`)', () => {
    const changed: string[] = [];
    let count = 0;
    for (const collection of ['blog', 'projects', 'prompts', 'skills']) {
      const field = configField(collection, 'body');
      for (const slug of readdirSync(new URL(`${collection}/`, CONTENT_DIR)).filter((d) => !d.startsWith('.'))) {
        const { body } = readBody(new URL(`${collection}/${slug}/index.md`, CONTENT_DIR));
        count++;
        const out = normalizeThematicBreaks(markdownFieldRoundTrip(body, field, registry));
        if (out !== body) changed.push(`${collection}/${slug}`);
      }
    }
    expect(count).toBe(13);
    expect(changed).toEqual([]);
  });

  it('les champs code réels reviennent identiques', () => {
    const changed: string[] = [];
    const fields: [string, string, (data: Record<string, any>) => unknown[]][] = [
      ['projects', 'snippet', (d) => [d.snippet]],
      ['prompts', 'prompt', (d) => [d.prompt]],
      ['skills', 'files', (d) => (d.files ?? []).map((f: { excerpt?: unknown }) => f.excerpt)],
    ];
    for (const [collection, name, values] of fields) {
      const top = configField(collection, name);
      const field = name === 'files' ? top.fields!.find((f) => f.name === 'excerpt')! : top;
      for (const slug of readdirSync(new URL(`${collection}/`, CONTENT_DIR)).filter((d) => !d.startsWith('.'))) {
        const { data } = readBody(new URL(`${collection}/${slug}/index.md`, CONTENT_DIR));
        for (const value of values(data)) {
          if (typeof value === 'string' && codeFieldRoundTrip(value, field) !== value) changed.push(`${collection}/${slug} ${name}`);
        }
      }
    }
    expect(changed).toEqual([]);
  });
});
