/**
 * Frontmatter dans la forme que Sveltia CMS 0.221.0 écrit (plan 22, T1 ;
 * D148, D149).
 *
 * Une entrée ouverte puis sauvegardée sans modification est réécrite en
 * entier par Sveltia : frontmatter re-sérialisé, champs manquants remplis de
 * leur défaut, une ligne vide après le `---` fermant. Pour qu'une telle
 * sauvegarde ne change aucun octet, chaque fichier de `src/content/**` est
 * gardé dans cette forme. Ce module rejoue, hors navigateur et sans état, le
 * chemin lecture → ouverture → sauvegarde, recopié des sources publiées de
 * Sveltia (`npm/index.js.map`) :
 *
 * - lecture — `contents/file/parse.js` `parseEntryFile` / `parseFrontMatter` :
 *   texte rogné, CRLF → LF, `^---\n(tête)\n---(?:\n(corps))?$`, tête lue par
 *   `yaml` (`parse`, options par défaut), un saut de ligne retiré devant le
 *   corps ; puis le contenu est aplati (`flat` 6.0.1, `a.0.b`) ;
 * - ouverture — `draft/create/normalize.js` `normalizeContent` : un champ
 *   absent reçoit son défaut (`draft/defaults.js` `populateDefaultValue`,
 *   `fields/<type>/defaults.js` : booléen → `default` ou `false`, liste →
 *   `default` ou `[]`, …) ; une valeur de champ texte qui n'est pas une chaîne
 *   est convertie (`String`), un booléen écrit en texte relu en booléen ;
 * - sauvegarde — `draft/save/changes.js` `normalizeFieldValue` (chaque chaîne
 *   rognée), `draft/save/serialize.js` `finalizeContent` (clés dans l'ordre
 *   des champs de `config.yml`, items de liste dans l'ordre de leurs
 *   sous-champs, champs optionnels vides retirés si
 *   `output.omit_empty_optional_fields`, clés inconnues à la fin, triées par
 *   `Intl.Collator` numérique), `unflatten` de `flat`, puis
 *   `contents/file/format.js` `formatFrontMatter` : `yaml` `stringify(obj,
 *   null, { indent: 2, indentSeq: true, lineWidth: 0, defaultKeyType:
 *   'PLAIN', defaultStringType: 'PLAIN', singleQuote: true }).trim()`, fichier
 *   = `---\n<tête>\n---\n` + `\n<corps>\n` si le corps n'est pas vide.
 *
 * Sveltia embarque `yaml@2.9.1` : la devDependency du dépôt est épinglée à la
 * même version (D150), sans quoi la forme des chaînes pourrait diverger.
 *
 * Hors champ : ce que les éditeurs réécrivent eux-mêmes à l'ouverture (corps
 * et champs `code`, voir `cmsCanonical.ts`), passé ici en option
 * (`transforms`) par `scripts/canonicalize-content.mjs`. Seules les formes de
 * champs de notre `config.yml` sont prises en charge ; un champ `object`,
 * `types`, `hidden` ou `keyvalue` lève une erreur plutôt que d'être deviné.
 */
import { parse, stringify } from 'yaml';

export interface CmsField {
  name: string;
  widget?: string;
  required?: boolean | string[];
  default?: unknown;
  multiple?: boolean;
  fields?: CmsField[];
  field?: CmsField;
  types?: unknown;
  value_type?: string;
  options?: unknown[];
  output_code_only?: boolean;
}

export interface CmsCollection {
  name: string;
  folder: string;
  path?: string;
  extension?: string;
  format?: string;
  fields: CmsField[];
}

export interface CmsOutput {
  omit_empty_optional_fields?: boolean;
  yaml?: { indent_size?: number; indent_sequences?: boolean; quote?: 'none' | 'single' | 'double' };
}

export interface CmsConfig {
  collections: CmsCollection[];
  output?: CmsOutput;
}

/** Valeurs réécrites par les éditeurs de Sveltia à l'ouverture (hors de ce module). */
export interface EditorTransforms {
  /** Champs `widget: markdown` (le corps). */
  markdown?: (value: string) => string;
  /** Champs `widget: code` (`output_code_only`). */
  code?: (value: string) => string;
}

type Flat = Record<string, unknown>;

/** Lit `public/admin/config.yml`. */
export function parseCmsConfig(text: string): CmsConfig {
  return parse(text) as CmsConfig;
}

/* ------------------------------------------------------------------------ */
/* Lecture (`contents/file/parse.js`)                                        */
/* ------------------------------------------------------------------------ */

/**
 * `parseEntryFile` + `parseFrontMatter` pour `format: yaml-frontmatter` et
 * les délimiteurs `---`.
 */
export function parseEntryText(raw: string): Record<string, unknown> {
  const text = raw.trim().replace(/\r\n?/g, '\n');
  const match = /^---\n(?:(?<head>[\s\S]*?))\n---(?:\n(?<body>[\s\S]*))?$/s.exec(text);
  const { head, body } = match?.groups ?? {};
  if (!head && !body) return { body: text };
  let parsedHead: unknown = parse(head);
  if (!parsedHead || typeof parsedHead !== 'object' || Array.isArray(parsedHead)) parsedHead = {};
  const data = parsedHead as Record<string, unknown>;
  return { ...data, ...(!('body' in data) ? { body: body?.replace(/^\n/, '') } : {}) };
}

/**
 * Tête et corps séparés, comme les lit l'éditeur (`body` sorti des données).
 * Pour les tests et le contrôle « valeurs inchangées » (R19).
 */
export function readEntry(raw: string): { data: Record<string, unknown>; body: string } {
  const { body, ...data } = parseEntryText(raw);
  return { data, body: typeof body === 'string' ? body : '' };
}

/* ------------------------------------------------------------------------ */
/* `flat` 6.0.1 (options par défaut)                                         */
/* ------------------------------------------------------------------------ */

const typeOf = (value: unknown) => Object.prototype.toString.call(value);
const isContainer = (value: unknown) => typeOf(value) === '[object Object]' || typeOf(value) === '[object Array]';

export function flatten(target: object): Flat {
  const output: Flat = {};
  const step = (object: object, prev?: string) => {
    for (const key of Object.keys(object)) {
      const value = (object as Record<string, unknown>)[key];
      const newKey = prev ? `${prev}.${key}` : key;
      if (isContainer(value) && Object.keys(value as object).length) {
        step(value as object, newKey);
        continue;
      }
      output[newKey] = value;
    }
  };
  step(target);
  return output;
}

export function unflatten(target: unknown): any {
  if (typeOf(target) !== '[object Object]') return target;
  const getkey = (key: string | undefined): string | number | undefined => {
    if (key === undefined) return undefined;
    const parsed = Number(key);
    return Number.isNaN(parsed) || key.includes('.') ? key : parsed;
  };
  const isEmpty = (val: any) => !val || (Array.isArray(val) ? !val.length : typeOf(val) === '[object Object]' ? !Object.keys(val).length : undefined);
  const source = target as Flat;
  const expanded: Flat = {};
  for (const key of Object.keys(source)) {
    const value = source[key];
    if (!isContainer(value) || isEmpty(value)) {
      expanded[key] = value;
    } else {
      for (const [sub, v] of Object.entries(flatten(value as object))) expanded[`${key}.${sub}`] = v;
    }
  }
  const result: any = {};
  for (const key of Object.keys(expanded)) {
    const split = key.split('.');
    let key1 = getkey(split.shift())!;
    let key2 = getkey(split[0]);
    let recipient = result;
    let skip = false;
    while (key2 !== undefined) {
      if (key1 === '__proto__') {
        skip = true;
        break;
      }
      const current = recipient[key1];
      // `flat` n'écrase pas une valeur déjà posée (même `null`) : la clé est ignorée.
      if (!isContainer(current) && typeof current !== 'undefined') {
        skip = true;
        break;
      }
      if (current == null) recipient[key1] = typeof key2 === 'number' ? [] : {};
      recipient = recipient[key1];
      if (split.length > 0) {
        key1 = getkey(split.shift())!;
        key2 = getkey(split[0]);
      }
    }
    if (!skip) recipient[key1] = unflatten(expanded[key]);
  }
  return result;
}

/* ------------------------------------------------------------------------ */
/* Champs (`contents/entry/fields.js`, `contents/fields/index.js`)           */
/* ------------------------------------------------------------------------ */

const STRING_VALUE_FIELD_TYPES = ['color', 'compute', 'datetime', 'map', 'markdown', 'richtext', 'string', 'text', 'uuid'];
const MULTI_VALUE_FIELD_TYPES = ['file', 'image', 'relation', 'select'];
const OPAQUE_FIELD_TYPES = ['code', 'hidden', 'keyvalue'];
const UNSUPPORTED_FIELD_TYPES = ['object', 'hidden', 'keyvalue', 'compute'];

const widgetOf = (field: CmsField) => field.widget ?? 'string';
const isRequired = (field: CmsField) => (Array.isArray(field.required) ? field.required.length > 0 : field.required ?? true);
const isMultiple = (field: CmsField) => MULTI_VALUE_FIELD_TYPES.includes(widgetOf(field)) && field.multiple === true;
const isNumeric = (key: string) => /^\d+$/.test(key);

function assertSupported(fields: CmsField[]): void {
  for (const field of fields) {
    if (UNSUPPORTED_FIELD_TYPES.includes(widgetOf(field)) || field.types) {
      throw new Error(`cmsFrontmatter : champ « ${field.name} » (${widgetOf(field)}) non pris en charge par la réplique`);
    }
    if (field.fields) assertSupported(field.fields);
    if (field.field) assertSupported([field.field]);
  }
}

/** `getField` : le champ d'un chemin (`tags.0`, `files.2.excerpt`), ou `undefined`. */
export function fieldAt(fields: CmsField[], keyPath: string): CmsField | undefined {
  const [first, ...rest] = keyPath.split('.');
  let field = fields.find((f) => f.name === first);
  for (let i = 0; i < rest.length && field; i++) {
    const key = rest[i];
    const indexLike = isNumeric(key) || key === '*';
    if (indexLike && MULTI_VALUE_FIELD_TYPES.includes(widgetOf(field))) {
      field = isMultiple(field) ? field : undefined;
    } else if (field.field) {
      const next = indexLike ? rest[i + 1] : undefined;
      field = !next || field.field.name === next ? field.field : undefined;
    } else if (field.fields && indexLike) {
      // item d'une liste à sous-champs : on reste sur la liste
    } else if (field.fields && key !== '') {
      field = field.fields.find((f) => f.name === key);
    } else {
      field = undefined;
    }
  }
  return field;
}

/* ------------------------------------------------------------------------ */
/* Ouverture (`draft/create/normalize.js`, `draft/defaults.js`)              */
/* ------------------------------------------------------------------------ */

/** Entrées aplaties d'une valeur sous `keyPath` (`entry/subtree.js` `getSubtreeEntries`). */
function subtree(keyPath: string, value: unknown): Flat {
  if (isContainer(value) && Object.keys(value as object).length) {
    return Object.fromEntries(Object.entries(flatten(value as object)).map(([k, v]) => [`${keyPath}.${k}`, v]));
  }
  return { [keyPath]: value };
}

/** `populateDefaultValue` sans valeurs dynamiques (entrée existante). */
function defaultValueMap(field: CmsField, keyPath: string): Flat {
  const widget = widgetOf(field);
  const def = field.default;
  switch (widget) {
    case 'boolean':
      return { [keyPath]: typeof def === 'boolean' ? def : false };
    case 'list': {
      if (!Array.isArray(def) || !def.length) return { [keyPath]: [] };
      if (field.fields) throw new Error(`cmsFrontmatter : défaut d'une liste à sous-champs (« ${field.name} ») non pris en charge`);
      const items = field.field ? def : def.filter((v) => !(isContainer(v) && !Array.isArray(v)));
      return subtree(keyPath, items);
    }
    case 'select':
    case 'relation': {
      if (!field.multiple) {
        if (def !== undefined) return { [keyPath]: def };
        const [first] = field.options ?? [];
        const firstValue = first && typeof first === 'object' ? (first as { value: unknown }).value : first;
        // `getEmptyOptionValue` : '' pour une option texte (ou pas d'option), sinon null.
        return { [keyPath]: firstValue === undefined || typeof firstValue === 'string' ? '' : null };
      }
      return Array.isArray(def) && def.length ? Object.fromEntries(def.map((v, i) => [`${keyPath}.${i}`, v])) : { [keyPath]: [] };
    }
    case 'datetime':
      if (typeof def !== 'string') return { [keyPath]: '' };
      if (def === '{{now}}') {
        throw new Error(`cmsFrontmatter : « ${keyPath} » absent, Sveltia y écrirait l'heure de l'ouverture`);
      }
      return { [keyPath]: def };
    case 'code':
      if (!field.output_code_only) throw new Error(`cmsFrontmatter : champ code « ${field.name} » sans output_code_only`);
      return { [keyPath]: typeof def === 'string' ? def : '' };
    case 'number': {
      const valueType = field.value_type ?? 'int';
      if (def === undefined) return { [keyPath]: valueType === 'int' || valueType === 'float' ? null : '' };
      const isInt = valueType === 'int' || valueType === 'int/string';
      const parsed = typeof def === 'string' ? (isInt ? Number.parseInt(def, 10) : Number.parseFloat(def)) : (def as number);
      if (isInt ? !Number.isInteger(parsed) : !Number.isFinite(parsed)) return {};
      return { [keyPath]: valueType === 'int' || valueType === 'float' ? parsed : String(parsed) };
    }
    case 'file':
    case 'image': {
      if (field.multiple) {
        const items = (Array.isArray(def) ? def : []).map((v: string) => v.trim()).filter((v: string) => v !== '');
        return items.length ? subtree(keyPath, items) : {};
      }
      return { [keyPath]: typeof def === 'string' ? def.trim() : '' };
    }
    case 'markdown':
    case 'richtext':
      return { [keyPath]: (def as string) || '' };
    default:
      return { [keyPath]: (def as string) || '' };
  }
}

interface Index {
  keys: string[];
}

const hasChildKeys = (index: Index, keyPath: string) => index.keys.some((k) => k.startsWith(`${keyPath}.`));

function itemIndexes(index: Index, keyPath: string): number[] {
  const found = new Set<number>();
  for (const key of index.keys) {
    if (!key.startsWith(`${keyPath}.`)) continue;
    const next = key.slice(keyPath.length + 1).split('.')[0];
    if (isNumeric(next)) found.add(Number(next));
  }
  return [...found].sort((a, b) => a - b);
}

function deleteSubtree(content: Flat, keyPath: string): void {
  for (const key of Object.keys(content)) {
    if (key === keyPath || key.startsWith(`${keyPath}.`)) delete content[key];
  }
}

const isPlainObject = (value: unknown) => typeOf(value) === '[object Object]';

/** `isPlaceholder` : `[]` ou `{}` posé sur un chemin qui a des enfants. */
const isPlaceholder = (value: unknown) => (Array.isArray(value) || isPlainObject(value)) && !Object.keys(value as object).length;

function discardConflictingValue(content: Flat, keyPath: string): void {
  if (keyPath in content && !isPlaceholder(content[keyPath])) delete content[keyPath];
}

function reconcileScalar(field: CmsField, keyPath: string, content: Flat, index: Index): boolean {
  if (hasChildKeys(index, keyPath)) {
    const [first] = itemIndexes(index, keyPath);
    if (first === undefined) {
      deleteSubtree(content, keyPath);
      return false;
    }
    const firstItem = content[`${keyPath}.${first}`];
    deleteSubtree(content, keyPath);
    content[keyPath] = firstItem;
  }
  const value = content[keyPath];
  if (isPlainObject(value) || Array.isArray(value)) {
    deleteSubtree(content, keyPath);
    return false;
  }
  const widget = widgetOf(field);
  if (STRING_VALUE_FIELD_TYPES.includes(widget)) {
    if (typeof value !== 'string') content[keyPath] = String(value ?? '');
    return true;
  }
  if (widget === 'boolean') {
    if (typeof value !== 'boolean') {
      const normalized = typeof value === 'string' ? value.trim().toLowerCase() : value;
      if (normalized !== 'true' && normalized !== 'false') return false;
      content[keyPath] = normalized === 'true';
    }
    return true;
  }
  if (widget === 'number') {
    const valueType = field.value_type ?? 'int';
    if (valueType !== 'int' && valueType !== 'float') return true;
    if (typeof value === 'number' || value === null) return true;
    const parsed = typeof value === 'string' ? Number(value.trim()) : Number.NaN;
    if (value === '' || Number.isNaN(parsed)) return false;
    content[keyPath] = parsed;
  }
  return true;
}

function reconcileList(keyPath: string, content: Flat, index: Index, hasSubFields: boolean): boolean {
  if (itemIndexes(index, keyPath).length) {
    discardConflictingValue(content, keyPath);
    return true;
  }
  if (hasChildKeys(index, keyPath)) {
    deleteSubtree(content, keyPath);
    return false;
  }
  const value = content[keyPath];
  if (Array.isArray(value)) return true;
  if (!hasSubFields && value !== null && value !== undefined && !isPlainObject(value)) {
    delete content[keyPath];
    content[`${keyPath}.0`] = value;
    return true;
  }
  deleteSubtree(content, keyPath);
  return false;
}

function reconcile(field: CmsField, keyPath: string, content: Flat, index: Index): boolean {
  const widget = widgetOf(field);
  if (OPAQUE_FIELD_TYPES.includes(widget)) {
    if (hasChildKeys(index, keyPath)) discardConflictingValue(content, keyPath);
    return true;
  }
  if (widget === 'list') return reconcileList(keyPath, content, index, !!field.fields);
  if (isMultiple(field)) return reconcileList(keyPath, content, index, false);
  return reconcileScalar(field, keyPath, content, index);
}

function normalizeField(field: CmsField, keyPath: string, content: Flat, index: Index): void {
  const occupied = keyPath in content || hasChildKeys(index, keyPath);
  if (!occupied || !reconcile(field, keyPath, content, index)) {
    Object.assign(content, defaultValueMap(field, keyPath));
    return;
  }
  if (widgetOf(field) !== 'list' || (!field.field && !field.fields)) return;
  for (const i of itemIndexes(index, keyPath)) {
    const itemKeyPath = `${keyPath}.${i}`;
    if (field.field) {
      normalizeField(field.field, itemKeyPath, content, index);
      continue;
    }
    discardConflictingValue(content, itemKeyPath);
    for (const sub of field.fields!) normalizeField(sub, `${itemKeyPath}.${sub.name}`, content, index);
  }
}

/**
 * Contenu aplati tel que le brouillon le tient à l'ouverture d'une entrée
 * existante (`normalizeContent`).
 */
export function openEntry(parsed: Record<string, unknown>, fields: CmsField[]): Flat {
  assertSupported(fields);
  const content = flatten(structuredClone(parsed));
  const index: Index = { keys: Object.keys(content) };
  for (const field of fields) normalizeField(field, field.name, content, index);
  return content;
}

/* ------------------------------------------------------------------------ */
/* Sauvegarde (`draft/save/changes.js`, `serialize.js`, `file/format.js`)    */
/* ------------------------------------------------------------------------ */

const compare = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }).compare;

/** `isValueEmpty` de `services/utils/object.js`. */
const isValueEmpty = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === '' ||
  (Array.isArray(value) && !value.length) ||
  (isPlainObject(value) && !Object.keys(value as object).length);

/** `createKeyPathList` (`draft/save/key-path.js`). */
function keyPathList(fields: CmsField[]): string[] {
  const list: string[] = [];
  const visit = (field: CmsField, keyPath: string) => {
    list.push(keyPath);
    const widget = widgetOf(field);
    if (widget === 'list' || widget === 'object') {
      const isList = widget === 'list';
      if (field.fields) {
        for (const sub of field.fields) visit(sub, isList ? `${keyPath}.*.${sub.name}` : `${keyPath}.${sub.name}`);
      } else if (isList) {
        if (field.field) visit(field.field, `${keyPath}.*`);
        else list.push(`${keyPath}.*`);
      }
    } else if (isMultiple(field)) {
      list.push(`${keyPath}.*`);
    }
  };
  for (const field of fields) visit(field, field.name);
  return list;
}

/** `finalizeContent` : ordre des champs, champs optionnels vides retirés, reste trié. */
function finalizeContent(fields: CmsField[], valueMap: Flat, omitEmptyOptionalFields: boolean): Record<string, unknown> {
  const unsorted: Flat = { ...valueMap };
  const sorted: Flat = {};

  const copy = (key: string, field?: CmsField) => {
    const value = unsorted[key];
    if (omitEmptyOptionalFields && field && !isRequired(field) && isValueEmpty(value)) {
      const childKeys = Object.keys(unsorted).filter((k) => k.startsWith(`${key}.`));
      if (childKeys.some((k) => !isValueEmpty(unsorted[k]))) {
        sorted[key] = value;
      } else {
        for (const k of childKeys) delete unsorted[k];
      }
    } else {
      sorted[key] = value;
    }
    delete unsorted[key];
  };

  for (const keyPath of keyPathList(fields)) {
    const field = fieldAt(fields, keyPath);
    if (keyPath in unsorted) {
      copy(keyPath, field);
      continue;
    }
    const pattern = new RegExp(`^${keyPath.replace(/[.*+?^${}()|[\]\\]/g, (c) => (c === '*' ? '\\d+' : `\\${c}`))}$`);
    Object.keys(unsorted)
      .filter((k) => pattern.test(k))
      .sort(compare)
      .forEach((k) => copy(k, field ?? fieldAt(fields, k)));
  }

  Object.keys(unsorted)
    .sort(compare)
    .forEach((k) => copy(k));

  return unflatten(sorted);
}

/** `formatYAML` avec `output.yaml` de la config (aucune option chez nous). */
export function formatYaml(obj: unknown, output: CmsOutput = {}): string {
  const { indent_size: indent = 2, indent_sequences: indentSeq = true, quote = 'none' } = output.yaml ?? {};
  return stringify(obj, null, {
    indent,
    indentSeq,
    lineWidth: 0,
    defaultKeyType: 'PLAIN',
    defaultStringType: quote === 'double' ? 'QUOTE_DOUBLE' : quote === 'single' ? 'QUOTE_SINGLE' : 'PLAIN',
    singleQuote: quote !== 'double',
  }).trim();
}

/**
 * Fichier écrit par Sveltia pour ce contenu aplati (`normalizeFieldValue` :
 * chaînes rognées ; `serializeContent` ; `formatFrontMatter`).
 */
export function writeEntry(valueMap: Flat, fields: CmsField[], output: CmsOutput = {}): string {
  const trimmed: Flat = {};
  for (const [key, value] of Object.entries(valueMap)) {
    if (value === undefined) continue;
    trimmed[key] = typeof value === 'string' ? value.trim() : value;
  }
  const content = finalizeContent(fields, trimmed, output.omit_empty_optional_fields ?? false);
  let body = '';
  if ('body' in content) {
    body = typeof content.body === 'string' ? content.body : '';
    delete content.body;
  }
  if (!Object.keys(content).length) return `${body}\n`;
  return `---\n${formatYaml(content, output)}\n---\n${body ? `\n${body}\n` : ''}`;
}

/**
 * Ce que Sveltia écrit pour ce fichier après ouverture puis **Save** sans
 * modification. `transforms` rejoue en plus la réécriture des éditeurs
 * (corps, champs `code`), que ce module ne modélise pas.
 */
export function sveltiaSave(raw: string, collection: CmsCollection, output: CmsOutput = {}, transforms: EditorTransforms = {}): string {
  const content = openEntry(parseEntryText(raw), collection.fields);
  for (const [key, value] of Object.entries(content)) {
    if (typeof value !== 'string') continue;
    const widget = fieldAt(collection.fields, key)?.widget;
    if (widget === 'markdown' && transforms.markdown) content[key] = transforms.markdown(value);
    if (widget === 'code' && transforms.code) content[key] = transforms.code(value);
  }
  return writeEntry(content, collection.fields, output);
}
