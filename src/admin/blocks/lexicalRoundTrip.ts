/**
 * Réplique Node de l'aller-retour Lexical de Sveltia CMS 0.221.0 (plan 23, T5,
 * R8 ; reprise du banc du plan 21, F2) — TEST SEULEMENT, jamais importée par
 * `cms.ts` ni par l'aperçu.
 *
 * À l'ouverture d'une entrée, chaque champ markdown de Sveltia relit sa valeur
 * dans un éditeur Lexical puis la réécrit (export markdown) : ce que renvoie
 * `markdownFieldRoundTrip` est la valeur qu'une sauvegarde sans modification
 * publierait. Les composants d'éditeur (`registerEditorComponent`) y passent
 * comme dans Sveltia : motif → nœud (props = `fromBlock(match)`), ouverture
 * du formulaire (chaque champ relu par SON éditeur : le contenu markdown d'un
 * encadré par un éditeur Lexical imbriqué, le code d'un terminal par un
 * champ `text`, rendu tel quel), puis `toBlock(props)` à l'export.
 *
 * Sources recopiées (licence MIT, Kohei Yoshino — `lexical/LICENSE-sveltia.txt`) :
 * - `lexical/sveltia-ui/*` : @sveltia/ui 0.77.0, `text-editor/{constants,
 *   markdown,code-editor}.js` et `transformers/{hr,table}.js`, à l'identique ;
 * - `lexical/sveltia-cms.js` : Sveltia CMS 0.221.0, `createTransformer` (à
 *   l'identique), nœud de composant (sans DOM), image liée, `getComponentDef`,
 *   boutons par défaut ;
 * - ci-dessous : `initEditor` / `onEditorUpdate` / `convertMarkdownToLexical`
 *   de `text-editor/core.js` (@sveltia/ui), les listes `buttons` et
 *   `components` de `rich-text-editor.svelte`, l'ouverture d'un composant
 *   (`editor-component.svelte` : `__sc_component_name`, `normalizeContent`
 *   sans défauts — identité pour des chaînes) et l'éditeur de champ `code`
 *   (`output_code_only` : langue = `default_language`, `plain` par défaut).
 * Lexical : paquets 0.51.0 en devDependencies, la version que Sveltia 0.221.0
 * embarque (`node_modules/.pnpm/lexical@0.51.0` et `@lexical+*@0.51.0` dans
 * les sources de `npm/index.js.map`).
 *
 * Hors réplique : le mode Raw, le collage, la coloration Shiki (sans effet
 * sur le markdown), la validation des formulaires. Le banc (R10) reste la
 * preuve dans le navigateur.
 */
import { $isCodeNode, CodeHighlightNode, CodeNode } from '@lexical/code-core';
import { HorizontalRuleNode } from '@lexical/extension';
import { CODE, $convertFromMarkdownString, $convertToMarkdownString, type Transformer } from '@lexical/markdown';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { $getNodeByKey, $getRoot, createEditor, type Klass, type LexicalEditor, type LexicalNode } from 'lexical';
import type { EditorComponentDefinition } from '@sveltia/cms';
import { DISABLED_MARKDOWN_TAGS, NODE_MAP, TRANSFORMER_MAP } from './lexical/sveltia-ui/constants.js';
import {
  increaseListIndentation,
  padBlankBlockquoteLines,
  splitMultilineFormatting,
  trimBlankBlockquoteLines,
} from './lexical/sveltia-ui/markdown.js';
import { parseCodeBlock, toCodeBlock } from './lexical/sveltia-ui/code-editor.js';
import { HR } from './lexical/sveltia-ui/transformers/hr.js';
import { TABLE } from './lexical/sveltia-ui/transformers/table.js';
import {
  BUILTIN_COMPONENTS,
  BUTTON_NAME_MAP,
  DEFAULT_BUTTONS,
  componentFeatures,
  getComponentDef,
  normalizeProps,
} from './lexical/sveltia-cms.js';

/** Champ de formulaire, tel que la config ou un composant le déclare (sous-ensemble lu ici). */
export interface ReplicaField {
  name: string;
  widget?: string;
  buttons?: readonly string[];
  editor_components?: readonly string[];
  allow_nested_components?: boolean;
  default_language?: string;
  output_code_only?: boolean;
}

/** Composants enregistrés (`registerEditorComponent`), par id d'enregistrement. */
export type ComponentRegistry = ReadonlyMap<string, EditorComponentDefinition>;

/** Registre à partir de définitions (dans l'ordre d'enregistrement). */
export function componentRegistry(definitions: readonly EditorComponentDefinition[]): ComponentRegistry {
  return new Map(definitions.map((definition) => [definition.id, definition]));
}

/** Contexte d'un éditeur markdown ouvert dans le formulaire d'un composant. */
interface NestedContext {
  /** `allow_nested_components` du champ markdown parent (celui du corps). */
  parentAllowNested: boolean | undefined;
}

interface Component {
  definition: any;
  node: Klass<LexicalNode>;
  transformer: Transformer;
}

interface ReplicaEditor {
  editor: LexicalEditor;
  enabledTransformers: Transformer[];
  components: Component[];
}

/**
 * `initEditor` (core.js) : nœuds et transformateurs dans l'ordre de Sveltia —
 * composants d'abord, puis ceux des boutons, puis `CODE` (éditeur de code) ou
 * `HR` + `TABLE` (toujours présents dans l'éditeur riche).
 */
function initEditor({
  enabledButtons,
  components,
  isCodeEditor,
  defaultLanguage,
}: {
  enabledButtons: readonly string[];
  components: Component[];
  isCodeEditor: boolean;
  defaultLanguage: string;
}): ReplicaEditor {
  const nodeMap = NODE_MAP as Record<string, Klass<LexicalNode>[]>;
  const transformerMap = TRANSFORMER_MAP as Record<string, Transformer[]>;
  const nodes = [
    ...components.map(({ node }) => node),
    ...new Set(
      Object.entries(nodeMap)
        .filter(([button]) => enabledButtons.includes(button))
        .flatMap(([, list]) => list),
    ),
    ...(isCodeEditor ? [CodeNode, CodeHighlightNode] : [HorizontalRuleNode, TableNode, TableCellNode, TableRowNode]),
  ];
  const enabledTransformers: Transformer[] = [
    ...components.map(({ transformer }) => transformer),
    ...new Set(
      Object.entries(transformerMap)
        .filter(([button]) => enabledButtons.includes(button))
        .flatMap(([, list]) => list),
    ),
    ...(isCodeEditor ? [CODE] : [HR as Transformer, TABLE as Transformer]),
  ];
  const editor = createEditor({
    namespace: 'editor',
    nodes,
    onError: (error) => {
      throw error;
    },
  });
  // registerCodeHighlighting → codeNodeTransform : un bloc sans langue prend la langue par défaut.
  if (enabledButtons.includes('code-block') || isCodeEditor) {
    editor.registerNodeTransform(CodeNode, (node) => {
      if (!node.getLanguage()) node.setLanguage(defaultLanguage);
    });
  }
  return { editor, enabledTransformers, components };
}

/** `convertMarkdownToLexical` (core.js), sans le préchargement Shiki. */
function importValue({ editor, enabledTransformers }: ReplicaEditor, value: string): void {
  let prepared = splitMultilineFormatting(value);
  prepared = increaseListIndentation(prepared);
  prepared = padBlankBlockquoteLines(prepared);
  editor.update(
    () => {
      $convertFromMarkdownString(prepared, enabledTransformers);
    },
    { discrete: true },
  );
}

/** `onEditorUpdate` (core.js), et le nettoyage de l'écouteur de l'éditeur de code. */
function exportValue({ editor, enabledTransformers }: ReplicaEditor, isCodeEditor: boolean): string {
  let out = '';
  editor.update(
    () => {
      if (isCodeEditor) {
        const children = $getRoot().getChildren();
        if (children.length === 1 && !$isCodeNode(children[0])) children[0].remove();
      }
      const transformers = enabledTransformers.filter(
        (transformer) => !DISABLED_MARKDOWN_TAGS.includes((transformer as { tag?: string }).tag as string),
      );
      out = trimBlankBlockquoteLines(
        $convertToMarkdownString(transformers)
          .replace(/\\([_\\])/g, '$1')
          .replace(/&#32;/g, ' '),
      );
    },
    { discrete: true },
  );
  return out;
}

/**
 * Valeur relue par l'éditeur d'un champ du formulaire d'un composant
 * (`FieldEditor`) : markdown → éditeur imbriqué ; code (`output_code_only`) →
 * éditeur de code ; chaîne, sélection, image → inchangée (une valeur absente
 * devient `''` pour une chaîne, comme `getStringInputValue`). `text` :
 * `text-editor.svelte` lie la chaîne à un `<textarea>` sans la transformer
 * (sources vérifiées par `terminalCode.test.ts`).
 */
function openField(field: ReplicaField, value: unknown, registry: ComponentRegistry, nested: NestedContext): unknown {
  const widget = field.widget ?? 'string';
  if (widget === 'markdown' || widget === 'richtext') {
    return markdownFieldRoundTrip(typeof value === 'string' ? value : '', field, registry, nested);
  }
  if (widget === 'code') {
    if (!field.output_code_only) throw new Error(`réplique : champ code « ${field.name} » sans output_code_only`);
    return codeFieldRoundTrip(typeof value === 'string' ? value : '', field);
  }
  if (widget === 'string' || widget === 'text') return typeof value === 'string' ? value : String(value ?? '');
  return value;
}

/**
 * Ouverture d'un composant (`editor-component.svelte`, mode block) : valeurs
 * lues + `__sc_component_name`, chaque champ relu par son éditeur, puis
 * `onChange('update', currentValues)` → `__props` du nœud.
 */
function openComponent(
  definition: any,
  props: Record<string, unknown>,
  registry: ComponentRegistry,
  nested: NestedContext,
): Record<string, unknown> {
  const values: Record<string, unknown> = { ...props, __sc_component_name: definition.id };
  for (const field of (definition.fields ?? []) as ReplicaField[]) {
    if (!(field.name in values) && (field.widget ?? 'string') === 'select') continue;
    values[field.name] = openField(field, values[field.name], registry, nested);
  }
  return values;
}

/** Tous les nœuds, en profondeur. */
function allNodes(node: LexicalNode): LexicalNode[] {
  const children = 'getChildren' in node ? (node as unknown as { getChildren(): LexicalNode[] }).getChildren() : [];
  return [node, ...children.flatMap(allNodes)];
}

/** Champ markdown ouvert : l'éditeur relu et les composants dont le formulaire s'est ouvert. */
interface OpenedField {
  replica: ReplicaEditor;
  opened: { key: string; component: Component; props: Record<string, unknown> }[];
}

/**
 * Ouverture d'un champ markdown (éditeur riche de Sveltia 0.221) : `buttons`
 * et `editor_components` du champ (défauts de Sveltia), composants résolus
 * dans `registry`, import, puis formulaire de chaque composant. `nested` :
 * champ d'un formulaire de composant (ses composants suivent
 * `allow_nested_components` du champ parent).
 */
function openMarkdownField(
  value: string,
  field: Omit<ReplicaField, 'name'> & { name?: string },
  registry: ComponentRegistry,
  nested: NestedContext | undefined,
): OpenedField {
  const editorComponents = field.editor_components ?? [...BUILTIN_COMPONENTS, ...registry.keys()];
  const buttonNames = field.buttons ?? DEFAULT_BUTTONS;
  const enabledButtons = [...buttonNames, ...(editorComponents.includes('code-block') ? ['code-block'] : [])]
    .map((name) => (BUTTON_NAME_MAP as Record<string, string>)[name])
    .filter(Boolean);

  const allowNested = nested ? (nested.parentAllowNested ?? true) : (field.allow_nested_components ?? true);
  const components: Component[] =
    nested && !allowNested
      ? []
      : editorComponents
          .map((name) => getComponentDef(name, registry as Map<string, unknown>))
          .filter(Boolean)
          .map((definition: any) => ({ definition, ...componentFeatures(definition) }));

  const replica = initEditor({ enabledButtons, components, isCodeEditor: false, defaultLanguage: 'plain' });
  importValue(replica, value || '');

  // Chaque composant du document ouvre son formulaire, dont les champs relisent leur valeur.
  const childContext: NestedContext = { parentAllowNested: nested ? nested.parentAllowNested : field.allow_nested_components };
  // (Lecture d'abord, formulaires ensuite hors de toute mise à jour : un champ markdown
  // imbriqué ouvre son propre éditeur.)
  const opened: OpenedField['opened'] = [];
  replica.editor.getEditorState().read(() => {
    for (const node of allNodes($getRoot())) {
      const component = components.find(({ node: klass }) => node instanceof klass);
      if (!component) continue;
      const props = (node as unknown as { __props?: Record<string, unknown> }).__props ?? {};
      opened.push({ key: node.getKey(), component, props });
    }
  });
  for (const item of opened) item.props = openComponent(item.component.definition, item.props, registry, childContext);
  replica.editor.update(
    () => {
      for (const { key, props } of opened) {
        const writable = $getNodeByKey(key)!.getWritable() as unknown as { __props?: Record<string, unknown> };
        writable.__props = props;
      }
    },
    { discrete: true },
  );
  return { replica, opened };
}

/**
 * Valeur qu'un champ markdown réécrit à l'ouverture : ce qu'une sauvegarde
 * sans modification publierait (avant les hooks `preSave`).
 */
export function markdownFieldRoundTrip(
  value: string,
  field: Omit<ReplicaField, 'name'> & { name?: string } = {},
  registry: ComponentRegistry = new Map(),
  nested?: NestedContext,
): string {
  return exportValue(openMarkdownField(value, field, registry, nested).replica, false);
}

/** Nœud de composant du document ouvert : type Lexical (`x-<id>` pour un composant enregistré) et valeurs du formulaire. */
export interface ComponentValues {
  type: string;
  values: Record<string, unknown>;
}

/**
 * Les nœuds de composant que l'éditeur crée à l'ouverture de `value`, dans
 * l'ordre du document, avec les valeurs de leur formulaire (chaque champ
 * relu par son éditeur ; clés internes `__sc_*` retirées).
 */
export function componentValues(
  value: string,
  field: Omit<ReplicaField, 'name'> & { name?: string } = {},
  registry: ComponentRegistry = new Map(),
): ComponentValues[] {
  return openMarkdownField(value, field, registry, undefined).opened.map(({ component, props }) => ({
    type: component.definition.id,
    values: normalizeProps(props),
  }));
}

/**
 * Valeur qu'un champ `code` à `output_code_only` réécrit à l'ouverture
 * (`fields/code/code-editor.svelte` + `CodeEditor` de @sveltia/ui).
 */
export function codeFieldRoundTrip(code: string, field: Pick<ReplicaField, 'default_language'> = {}): string {
  const lang = field.default_language ?? 'plain';
  const replica = initEditor({ enabledButtons: [], components: [], isCodeEditor: true, defaultLanguage: lang });
  importValue(replica, toCodeBlock(lang, code));
  return parseCodeBlock(exportValue(replica, true)).code;
}

/**
 * Corps réécrit à l'ouverture avec les composants par défaut d'avant les
 * blocs (`[code-block, image]`) — le banc du plan 21, F2.
 */
export function richTextRoundTrip(value: string): string {
  return markdownFieldRoundTrip(value, { editor_components: ['code-block', 'image'] });
}
