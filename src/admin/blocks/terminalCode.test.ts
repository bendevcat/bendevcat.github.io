import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { findBodyIssues } from '../../lib/cmsCanonical';
import { readSiteEntries } from '../../lib/blocks/readSiteEntries.mjs';
import { BLOCKS } from '../../lib/blocks/syntax.mjs';
import { normalizeThematicBreaks } from '../../lib/thematicBreaks';
import { blockComponents } from './editorComponents';
import { codeFieldRoundTrip, componentRegistry, componentValues, markdownFieldRoundTrip } from './lexicalRoundTrip';

/**
 * Code du Terminal par un champ `text` (plan 23, F1 ; D158, qui remplace le
 * motif de D156) : une valeur qui contient ```` ``` ```` fait l'aller-retour
 * formulaire → `toBlock` → import du corps par Lexical (réplique de Sveltia
 * 0.221) → `fromBlock` → formulaire, à l'identique.
 *
 * Le widget `code` ouvrait l'éditeur de code Lexical, qui vide ou tronque la
 * valeur dès qu'on y tape ``` (vérification 1 : code vide sauvé) — aucun
 * `pattern` ne pouvait l'empêcher. Le champ `text` est un `<textarea>` : la
 * réplique le traite comme l'identité (`openField`), ce que les sources de
 * Sveltia fixent ci-dessous.
 */

const ROOT = new URL('../../../', import.meta.url);
const definitions = blockComponents(readSiteEntries());
const registry = componentRegistry(definitions);
const config = parse(readFileSync(new URL('public/admin/config.yml', ROOT), 'utf8')) as {
  collections: { name: string; fields: { name: string }[] }[];
};
const blogBody = config.collections.find((c) => c.name === 'blog')!.fields.find((f) => f.name === 'body')!;

const map = JSON.parse(
  readFileSync(new URL('node_modules/@sveltia/cms/npm/index.js.map', ROOT), 'utf8'),
) as { sources: string[]; sourcesContent: string[] };

/** Source unique de `npm/index.js.map` dont le chemin finit par `suffix`. */
function source(suffix: string): string {
  const matches = map.sources.flatMap((s, i) => (s.endsWith(suffix) ? [i] : []));
  if (matches.length !== 1) throw new Error(`${suffix} : ${matches.length} source(s) dans index.js.map`);
  return map.sourcesContent[matches[0]];
}

/** Définition du champ `code` du Terminal enregistré. */
const codeField = () =>
  (definitions.find((d) => d.id === 'terminal')!.fields as unknown as Record<string, unknown>[]).find(
    (f) => f.name === 'code',
  );

/** Corps relu à l'ouverture puis enregistré (hook `preSave` compris). */
const saved = (body: string) => normalizeThematicBreaks(markdownFieldRoundTrip(body, blogBody, registry));

/** Valeurs du formulaire d'un Terminal, telles que l'auteur les tape. */
const form = (code: string) => ({ title: 'README.md', lang: 'bash', code });

/** Le corps qu'écrit le composant pour ces valeurs (`toBlock` de la définition enregistrée). */
const written = (code: string) => definitions.find((d) => d.id === 'terminal')!.toBlock(form(code));

/** Code avec ```, ````, ~~~ en nombre PAIR de lignes de clôture (voir `fence-toggle`). */
const CODES = [
  'x ```',
  'echo ````',
  '```bash\nls\n```',
  'cat <<EOF > README.md\n# Titre\n\n```sh\nnpm ci\n```\n\n````md\n```\nimbriqué\n```\n````\nEOF',
  'a ``` b ```` c `````',
  '~~~\ntilde\n~~~',
  '```\n:::\n```',
  'fin\n',
  '\n\nlignes vides en tête',
  '  indenté\n\ttab  ',
];

describe('Terminal : le code passe par un champ text (F1, D158)', () => {
  it('le champ code est un champ text, sans motif ni autocomplétion d’emoji', () => {
    const field = codeField();
    expect(field?.widget).toBe('text');
    expect(field).not.toHaveProperty('pattern');
    expect(field).not.toHaveProperty('output_code_only');
    expect(field?.use_emoji_autocomplete).toBe(false);
  });

  it('sources Sveltia 0.221 : le champ text rend la chaîne telle quelle', () => {
    const editor = source('src/lib/components/contents/details/fields/text/text-editor.svelte');
    // Valeur → <textarea> et <textarea> → valeur, sans transformation.
    expect(editor).toContain("const newValue = typeof currentValue === 'string' ? currentValue : '';");
    expect(editor).toContain('const newValue = inputValue;');
    expect(editor).toMatch(/<TextArea[\s\S]*bind:value=\{inputValue\}/);
    expect(editor).not.toMatch(/\.trim|\.replace/);
    // Ouverture d'un composant : `normalizeContent` garde une chaîne d'un champ `text`.
    const fields = source('src/lib/services/contents/fields/index.js');
    expect(fields).toMatch(/SIMPLE_VALUE_FIELD_TYPES = \[[^\]]*'text'/);
    expect(fields).toMatch(/STRING_VALUE_FIELD_TYPES = SIMPLE_VALUE_FIELD_TYPES\.filter/);
    // Les valeurs du formulaire vont au nœud puis à `toBlock` sans passer par ailleurs.
    const transformers = source('src/lib/services/contents/fields/rich-text/components/transformers.js');
    expect(transformers).toContain('return toBlock(normalizeProps(/** @type {any} */ (node).__props ?? {}));');
  });

  it('formulaire → toBlock → import Lexical du corps → fromBlock : même code, corps identique', () => {
    const wrong = CODES.flatMap((code) => {
      const bodies = [written(code), `Avant.\n\n${written(code)}\n\nAprès.`, `${written(code)}\n\n${written('ls')}`];
      return bodies.flatMap((body) => {
        const values = componentValues(body, blogBody, registry);
        const ok =
          saved(body) === body &&
          values[0]?.type === 'x-terminal' &&
          JSON.stringify(values[0].values) === JSON.stringify(form(code)) &&
          findBodyIssues(body).length === 0;
        return ok ? [] : [{ code, body, saved: saved(body), values, issues: findBodyIssues(body) }];
      });
    });
    expect(wrong).toEqual([]);
  });

  it('le bloc écrit garde une clôture plus longue que toute suite de backticks du code', () => {
    expect(written('x ```')).toBe(':::terminal[README.md]\n\n````bash\nx ```\n````\n\n:::');
    expect(written('a ``` b ```` c `````')).toMatch(/^:::terminal\[README\.md\]\n\n``````bash\n/);
  });

  it('rouge avec le widget code : l’éditeur de code perd la valeur (pourquoi F1)', () => {
    expect(codeFieldRoundTrip('x ```')).toBe('');
    expect(codeFieldRoundTrip('a\n```\nb')).not.toBe('a\n```\nb');
    const asCode = componentRegistry(
      definitions.map((d) =>
        d.id !== 'terminal'
          ? d
          : {
              ...d,
              fields: (d.fields as unknown as Record<string, unknown>[]).map((f) =>
                f.name === 'code' ? { name: 'code', label: 'Code', widget: 'code', output_code_only: true } : f,
              ) as unknown as typeof d.fields,
            },
      ),
    );
    const body = written('x ```');
    expect(normalizeThematicBreaks(markdownFieldRoundTrip(body, blogBody, asCode))).toBe(
      BLOCKS.terminal.toBlock(form('')),
    );
    expect(saved(body)).toBe(body);
  });
});
