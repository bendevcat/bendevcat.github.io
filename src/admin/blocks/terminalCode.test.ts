import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { EditorComponentDefinition } from '@sveltia/cms';
import { findCodeFieldIssues } from '../../lib/cmsCanonical';
import { readSiteEntries } from '../../lib/blocks/readSiteEntries.mjs';
import { CODE_FORM_MESSAGE, CODE_FORM_PATTERN, blockComponents } from './editorComponents';
import { codeFieldRoundTrip } from './lexicalRoundTrip';

/**
 * Code du Terminal : une suite de trois backticks est REFUSÉE par le
 * formulaire (plan 23, T4b ; D156) — l'éditeur de code de Sveltia se ferme
 * dessus et vide la valeur entière à l'ouverture suivante (T5).
 *
 * Preuve par le chemin de validation de Sveltia 0.221 lui-même :
 * `validateFields` (`contents/draft/validate/fields.js`), le résolveur du
 * champ `code` (`fields/code/validate.js`), `getRegex` (`utils/regex.js`),
 * `validateStringField` et les messages (`validate/messages.js`), tirés TELS
 * QUELS des `sourcesContent` de `npm/index.js.map` (comme `slugify` au plan
 * 22, F2), écrits dans un dossier temporaire et importés. Seuls les modules
 * qu'ils importent sans intervenir ici sont remplacés : `getField` lit les
 * champs du composant enregistré (`componentName ? getComponentDef(…).fields`),
 * `getFieldKind` / `isFieldRequired` / `isFieldMultiple` reprennent leur code
 * pour nos widgets, `_` renvoie la clé i18n.
 *
 * Pourquoi c'est le chemin d'une sauvegarde : `saveEntry` refuse d'écrire si
 * `validateEntry` échoue (`draft/save/index.js`), qui valide `currentValues`
 * PUIS `extraValues` (`validate/index.js`) — les valeurs de chaque composant
 * ouvert dans le corps, clés `<champ>:<id>:<sous-champ>` avec
 * `__sc_component_name` (`editor-component.svelte`). Pour un champ `code`
 * `output_code_only`, `resolveCodeField` rend la valeur telle quelle (la clé
 * `body:c1:code` n'a pas de `.code` à retirer) et `validateScalarField` teste
 * `pattern[0]` sur la valeur élaguée ; `messages.js` affiche `pattern[1]`. Le
 * `toBlock` du composant, lui, a déjà réécrit le corps à la frappe : c'est la
 * sauvegarde qui est bloquée, le fichier publié n'a jamais la suite.
 */

const definitions = blockComponents(readSiteEntries());
const registry = new Map(definitions.map((d) => [d.id, d]));

type Validity = Record<string, boolean>;
type ValidateFields = (
  store: 'extraValues',
  options: { draft: Record<string, unknown>; enforceRequired?: boolean },
) => { valid: boolean; validities: Record<string, Record<string, Validity>>; validationMessages: Record<string, Record<string, string[]>> };

const map = JSON.parse(
  readFileSync(new URL('../../../node_modules/@sveltia/cms/npm/index.js.map', import.meta.url), 'utf8'),
) as { sources: string[]; sourcesContent: string[] };

/** Source unique de `npm/index.js.map` dont le chemin finit par `suffix`. */
function source(suffix: string): string {
  const matches = map.sources.flatMap((s, i) => (s.endsWith(suffix) ? [i] : []));
  if (matches.length !== 1) throw new Error(`${suffix} : ${matches.length} source(s) dans index.js.map`);
  return map.sourcesContent[matches[0]];
}

const SRC = 'src/lib/services/';
const STUBS = './stubs.mjs';
const imports: Record<string, string> = {
  '@sveltia/i18n': STUBS,
  '$lib/services/contents/draft/validate/custom-fields': STUBS,
  '$lib/services/contents/draft/validate/messages': './messages.mjs',
  '$lib/services/contents/draft/validate/required': STUBS,
  '$lib/services/contents/entry/fields': STUBS,
  '$lib/services/contents/fields': STUBS,
  '$lib/services/contents/fields/code/validate': './code.mjs',
  '$lib/services/contents/fields/date-time/config': STUBS,
  '$lib/services/contents/fields/date-time/validate': STUBS,
  '$lib/services/contents/fields/key-value/validate': STUBS,
  '$lib/services/contents/fields/list/helpers': STUBS,
  '$lib/services/contents/fields/list/validate': STUBS,
  '$lib/services/contents/fields/number/validate': STUBS,
  '$lib/services/contents/fields/rich-text': './rich-text.mjs',
  '$lib/services/contents/fields/select/helpers': STUBS,
  '$lib/services/contents/fields/string/validate': './string.mjs',
  '$lib/services/utils/regex': './regex.mjs',
};

/** Instructions `import … from '…'` en début de ligne seulement (pas les `@import` des JSDoc). */
const rewrite = (code: string) =>
  code.replace(/^(import\s[^;]*?\sfrom\s)'([^']+)'/gm, (_, head: string, spec: string) => {
    if (!(spec in imports)) throw new Error(`import inattendu : ${spec}`);
    return `${head}'${imports[spec]}'`;
  });

/** La seule constante lue dans `rich-text/index.js` (le reste importe l'éditeur). */
function componentPrefixModule(): string {
  const line = /^export const COMPONENT_NAME_PREFIX_REGEX = .+;$/m.exec(source(`${SRC}contents/fields/rich-text/index.js`));
  if (!line) throw new Error('COMPONENT_NAME_PREFIX_REGEX introuvable');
  return line[0];
}

let dir: string;
let validateFields: ValidateFields;
/** Registre des composants que lit le `getField` remplacé. */
let components: Map<string, EditorComponentDefinition>;

beforeAll(async () => {
  const files: Record<string, string> = {
    'fields.mjs': rewrite(source(`${SRC}contents/draft/validate/fields.js`)),
    'messages.mjs': rewrite(source(`${SRC}contents/draft/validate/messages.js`)),
    'code.mjs': rewrite(source(`${SRC}contents/fields/code/validate.js`)),
    'string.mjs': rewrite(source(`${SRC}contents/fields/string/validate.js`)),
    'regex.mjs': rewrite(source(`${SRC}utils/regex.js`)),
    'rich-text.mjs': componentPrefixModule(),
    'stubs.mjs': [
      'export const components = new Map();',
      'export const _ = (key) => key;',
      'export const validateCustomField = () => {};',
      'export const isRequiredEnforced = () => true;',
      'export const LIST_KEY_PATH_REGEX = /\\.\\d+$/;',
      "export const MEDIA_FIELD_TYPES = ['file', 'image'];",
      "export const MIN_MAX_VALUE_FIELD_TYPES = ['list', 'select', 'relation', 'datetime', 'keyvalue', 'number'];",
      "const BUILTIN = ['boolean', 'code', 'color', 'compute', 'datetime', 'file', 'hidden', 'image', 'keyvalue', 'list', 'map', 'markdown', 'number', 'object', 'relation', 'richtext', 'select', 'string', 'text', 'uuid'];",
      "export const getFieldKind = (f) => (BUILTIN.includes(f.widget ?? 'string') ? 'builtin' : 'unknown');",
      'export const isFieldRequired = ({ fieldConfig: { required = true }, locale }) => Array.isArray(required) ? required.includes(locale) : !!required;',
      'export const isFieldMultiple = (f) => !!f.multiple;',
      "export const getField = ({ componentName, keyPath }) => componentName ? components.get(componentName)?.fields?.find((f) => f.name === keyPath) : undefined;",
      'export const isOptionValue = ({ fieldConfig, value }) => (fieldConfig.options ?? []).some((o) => (o?.value ?? o) === value);',
      'const unused = (name) => () => { throw new Error(`${name} : hors chemin testé`); };',
      "export const validateDateTimeField = unused('validateDateTimeField');",
      "export const getFormattedDateTime = unused('getFormattedDateTime');",
      "export const parseDateTimeConfig = unused('parseDateTimeConfig');",
      "export const validateKeyValueField = unused('validateKeyValueField');",
      "export const getListFieldInfo = unused('getListFieldInfo');",
      "export const validateListField = unused('validateListField');",
      "export const validateNumberField = unused('validateNumberField');",
    ].join('\n'),
  };
  dir = mkdtempSync(join(tmpdir(), 'sveltia-validate-'));
  for (const [name, code] of Object.entries(files)) writeFileSync(join(dir, name), code);
  const stubs = await import(/* @vite-ignore */ pathToFileURL(join(dir, 'stubs.mjs')).href);
  components = stubs.components;
  for (const [id, def] of registry) components.set(id, def);
  ({ validateFields } = await import(/* @vite-ignore */ pathToFileURL(join(dir, 'fields.mjs')).href));
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

/**
 * Brouillon d'un article dont le corps porte un Terminal ouvert, validé comme
 * à la sauvegarde (`validateFields('extraValues')`).
 */
function validateTerminal(values: Record<string, string>) {
  const prefix = 'body:c1:';
  const draft = {
    collectionName: 'blog',
    isIndexFile: false,
    currentLocales: { _default: true },
    collection: { _i18n: { i18nEnabled: false, defaultLocale: '_default' } },
    files: {},
    extraValues: {
      _default: Object.fromEntries([
        [`${prefix}__sc_component_name`, 'terminal'],
        ...Object.entries(values).map(([key, value]) => [`${prefix}${key}`, value]),
      ]),
    },
  };
  const { valid, validities, validationMessages } = validateFields('extraValues', { draft });
  return { valid, code: validities._default[`${prefix}code`], messages: validationMessages._default[`${prefix}code`] };
}

describe('Terminal : le code refuse une suite de ``` (D156)', () => {
  it('le champ code garde le widget code et porte le motif, message en français', () => {
    const code = (registry.get('terminal')?.fields as unknown as Record<string, unknown>[]).find((f) => f.name === 'code');
    expect(code?.widget).toBe('code');
    expect(code?.pattern).toEqual([CODE_FORM_PATTERN, CODE_FORM_MESSAGE]);
    expect(CODE_FORM_MESSAGE).toMatch(/```/);
    expect(CODE_FORM_MESSAGE).toMatch(/vid/);
  });

  it('validation de Sveltia : une suite de ``` bloque la sauvegarde, avec le message du motif', () => {
    for (const code of ['x ```', 'a\n```\nb', '```bash\nls\n```', 'echo ````', '  ```  ']) {
      const result = validateTerminal({ title: 'run.sh', lang: 'bash', code });
      expect(result.valid, JSON.stringify(code)).toBe(false);
      expect(result.code?.patternMismatch, JSON.stringify(code)).toBe(true);
      expect(result.messages, JSON.stringify(code)).toEqual([CODE_FORM_MESSAGE]);
    }
  });

  it('validation de Sveltia : du code ordinaire passe (un ou deux backticks compris)', () => {
    // (Code vide : refusé comme avant, champ obligatoire — `valueMissing`, pas le motif.)
    for (const code of ['npm ci', 'echo `date`\nls ``x``', 'a\n\nb', ':::\nfin', '  indenté\n']) {
      const result = validateTerminal({ title: 'run.sh', lang: '', code });
      expect(result.valid, JSON.stringify(code)).toBe(true);
      expect(result.messages, JSON.stringify(code)).toEqual([]);
    }
  });

  it('rouge sans le motif (le chemin testé dépend bien du champ)', () => {
    const terminal = registry.get('terminal')!;
    const bare = (terminal.fields as unknown as Record<string, unknown>[]).map((f) =>
      f.name === 'code' ? { ...f, pattern: undefined } : f,
    );
    components.set('terminal', { ...terminal, fields: bare as unknown as EditorComponentDefinition['fields'] });
    try {
      expect(validateTerminal({ title: 'run.sh', lang: 'bash', code: 'x ```' }).valid).toBe(true);
    } finally {
      components.set('terminal', terminal);
    }
  });

  it('motif = règle fence-in-code du garde ; ce qu’il accepte ne perd pas son code à l’ouverture', () => {
    const samples = ['x ```', 'a\n```\nb', '``', '`a` ``b``', 'ls\n  ``` \n', 'a`` `b', 'plain', '', '\n\n', 'x\n````'];
    for (const code of samples) {
      const fence = findCodeFieldIssues(code).some(({ rule }) => rule === 'fence-in-code');
      expect(CODE_FORM_PATTERN.test(code.trim()), JSON.stringify(code)).toBe(!fence);
      // Accepté par le formulaire ⇒ l'éditeur de code ne vide pas la valeur.
      if (!fence && code.trim() !== '') expect(codeFieldRoundTrip(code), JSON.stringify(code)).not.toBe('');
    }
  });
});
