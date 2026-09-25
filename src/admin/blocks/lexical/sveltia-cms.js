// Adapted from Sveltia CMS 0.221.0 (sources embedded in @sveltia/cms npm/index.js.map). MIT
// License, Copyright (c) 2026 Kohei Yoshino — full text in ./LICENSE-sveltia.txt.
// Test-only: part of the Lexical round-trip replica (../lexicalRoundTrip.ts), never imported by
// the admin bundle.
//
// What is copied, and how faithfully:
// - `createTransformer` — src/lib/services/contents/fields/rich-text/components/transformers.js,
//   verbatim (JSDoc trimmed).
// - `isMultiLinePattern`, `replaceQuotes` — components/utils.js, verbatim. `normalizeProps` —
//   same file; the original goes through `flatten`/`unflatten` of the `flat` package to drop keys
//   whose last segment starts with `__sc_`; here a recursive filter does the same on plain JSON
//   values (the only values a component holds), without the dependency.
// - `createCustomNodeClass` — components/custom-node.js, reduced to what the markdown round trip
//   reads: type, props, inline-ness, clone, JSON. The DOM side (mounting the form, paste
//   conversion) is left out: no DOM in the replica.
// - `IMAGE_REGEX`, `LINKED_IMAGE_REGEX`, `IMAGE_OR_LINKED_IMAGE_REGEX` — rich-text/constants.js;
//   `LINKED_IMAGE_COMPONENT` — components/definitions.js (without `toPreview`, which the round
//   trip never calls); `getComponentDef` — same file, the `x-` prefix of custom components.
// - `DEFAULT_BUTTONS`, `BUTTON_NAME_MAP`, `BUILTIN_COMPONENTS` — rich-text/index.js, verbatim.

import { DecoratorNode } from 'lexical';

/* ------------------------------------------------------------------------------------------ */
/* rich-text/index.js                                                                           */
/* ------------------------------------------------------------------------------------------ */

export const DEFAULT_BUTTONS = [
  'bold',
  'italic',
  'strikethrough',
  'code',
  'link',
  'heading-one',
  'heading-two',
  'heading-three',
  'heading-four',
  'heading-five',
  'heading-six',
  'bulleted-list',
  'numbered-list',
  'quote',
];

export const BUTTON_NAME_MAP = {
  bold: 'bold',
  italic: 'italic',
  strikethrough: 'strikethrough',
  code: 'code',
  link: 'link',
  'heading-one': 'heading-1',
  'heading-two': 'heading-2',
  'heading-three': 'heading-3',
  'heading-four': 'heading-4',
  'heading-five': 'heading-5',
  'heading-six': 'heading-6',
  'bulleted-list': 'bulleted-list',
  'numbered-list': 'numbered-list',
  quote: 'blockquote',
  'code-block': 'code-block',
};

export const BUILTIN_COMPONENTS = ['code-block', 'image'];

/* ------------------------------------------------------------------------------------------ */
/* components/utils.js                                                                          */
/* ------------------------------------------------------------------------------------------ */

/**
 * Check if the given pattern is multiline.
 * @param {RegExp} pattern Pattern.
 * @returns {boolean} Result.
 */
export const isMultiLinePattern = ({ multiline, dotAll, source }) =>
  multiline || dotAll || source.includes('[\\s\\S]') || source.includes('[\\S\\s]');

/**
 * Normalize properties by removing internal properties (keys starting with `__sc_`).
 * @param {Record<string, any>} props Properties to normalize.
 * @returns {Record<string, any>} Properties without internal keys.
 */
export const normalizeProps = (props) => {
  /** @param {any} value */
  const strip = (value) => {
    if (Array.isArray(value)) return value.map(strip);
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => !key.startsWith('__sc_'))
          .map(([key, v]) => [key, strip(v)]),
      );
    }
    return value;
  };

  return strip(props);
};

/**
 * Replace double quotes with single quotes to avoid breaking Markdown syntax.
 * @param {string} str String to escape.
 * @returns {string} Escaped string.
 */
export const replaceQuotes = (str) => str.replace(/"/g, "'");

/* ------------------------------------------------------------------------------------------ */
/* rich-text/constants.js, components/definitions.js                                            */
/* ------------------------------------------------------------------------------------------ */

export const IMAGE_REGEX =
  /!\[(?<alt>(?:[^\]\\]|\\.)*)\]\((?<src>(?:[^"()\\]|\\.|\([^)]*\)|"[^"]*")*?)(?:\s+"(?<title>(?:[^"\\]|\\.)*)")?\)/;

export const LINKED_IMAGE_REGEX =
  /\[!\[(?<alt2>(?:[^\]\\]|\\.)*)\]\((?<src2>(?:[^"()\\]|\\.|\([^)]*\)|"[^"]*")*?)(?:\s+"(?<title2>(?:[^"\\]|\\.)*)")?\)\](?:\((?<link>[^)]*\([^)]*\)[^)]*|[^)]*)\))/;

export const IMAGE_OR_LINKED_IMAGE_REGEX = new RegExp(
  `${IMAGE_REGEX.source}|${LINKED_IMAGE_REGEX.source}`,
);

/** Built-in linked image component (`image` in `editor_components`, `linked_images` on). */
export const LINKED_IMAGE_COMPONENT = {
  id: 'linked-image',
  label: 'Image',
  fields: [
    { name: 'src', label: 'Source', widget: 'image' },
    { name: 'alt', label: 'Alt Text', required: false },
    { name: 'title', label: 'Title', required: false },
    { name: 'link', label: 'Link', required: false },
  ],
  pattern: IMAGE_OR_LINKED_IMAGE_REGEX,
  /** @param {RegExpMatchArray} match */
  fromBlock: (match) => {
    const { src, alt, title, src2, alt2, title2, link } = match.groups ?? {};

    return {
      src: (src || src2 || '').trim(),
      alt: (alt || alt2 || '').trim(),
      title: (title || title2 || '').trim(),
      link: (link || '').trim(),
    };
  },
  /** @param {Record<string, any>} props */
  toBlock: (props) => {
    const { src = '', alt = '', title = '', link = '' } = props;
    const img = src ? `![${alt}](${src}${title ? ` "${replaceQuotes(title)}"` : ''})` : '';

    return img && link ? `[${img}](${link})` : img;
  },
};

/**
 * Component definition for a name of `editor_components`, as `getComponentDef` resolves it: a
 * registered custom component gets the id `x-<name>`; `image` is the linked image when
 * `linked_images` is on (the default); `code-block` is a button, not a component.
 * @param {string} name Component name.
 * @param {Map<string, any>} registry Custom components, by the id they were registered with.
 * @returns {any} Definition, or `undefined`.
 */
export const getComponentDef = (name, registry) => {
  const customComponentDef = registry.get(name);

  if (customComponentDef) {
    return { ...customComponentDef, id: `x-${name}` };
  }

  return name === 'image' || name === 'linked-image' ? LINKED_IMAGE_COMPONENT : undefined;
};

/* ------------------------------------------------------------------------------------------ */
/* components/custom-node.js (reduced)                                                          */
/* ------------------------------------------------------------------------------------------ */

/**
 * Dynamically create a custom {@link DecoratorNode} class for a component definition.
 * @param {any} componentDef Component definition.
 * @returns {any} Custom node class.
 */
export const createCustomNodeClass = (componentDef) => {
  const { id: componentName, pattern } = componentDef;
  const inline = !isMultiLinePattern(pattern);

  class CustomNode extends DecoratorNode {
    /** @type {Record<string, any> | undefined} */
    __props;

    /**
     * @param {Record<string, any>} [props] Field properties.
     * @param {string} [key] Node key.
     */
    constructor(props, key) {
      super(key);
      this.__props = props;
    }

    static getType() {
      return componentName;
    }

    isInline() {
      return inline;
    }

    /** @param {CustomNode} node Node. */
    static clone(node) {
      return new CustomNode(node.__props, node.__key);
    }

    /** @param {any} serializedNode Input. */
    static importJSON(serializedNode) {
      return new CustomNode().updateFromJSON(serializedNode);
    }

    exportJSON() {
      return { ...normalizeProps(this.__props ?? {}), type: componentName, version: 1 };
    }

    createDOM() {
      return /** @type {any} */ (null);
    }

    updateDOM() {
      return false;
    }

    decorate() {
      return null;
    }
  }

  return CustomNode;
};

/* ------------------------------------------------------------------------------------------ */
/* components/transformers.js (verbatim)                                                        */
/* ------------------------------------------------------------------------------------------ */

/**
 * Create a singleline/inline or multiline transformer for the given component definition.
 * @param {object} args Arguments.
 * @param {any} args.componentDef Component definition passed with `registerEditorComponent()`.
 * @param {any} args.CustomNode Lexical node class implementation.
 * @returns {any} Transformer.
 * @see https://github.com/sveltia/sveltia-cms/issues/410
 */
export const createTransformer = ({ componentDef, CustomNode }) => {
  const { id: componentName, pattern, fromBlock, toBlock } = componentDef;
  const nonGlobalPattern = new RegExp(pattern.source, pattern.flags.replace('g', ''));
  /** @param {RegExpMatchArray} matchArray */
  const getProps = (matchArray) => fromBlock?.(matchArray) ?? matchArray.groups ?? {};
  /** @param {any} node */
  const isCustomNode = (node) => node instanceof CustomNode && node.getType() === componentName;

  /** @param {any} node */
  const exportNode = (node) => {
    if (isCustomNode(node)) {
      return toBlock(normalizeProps(/** @type {any} */ (node).__props ?? {}));
    }

    return null;
  };

  if (isMultiLinePattern(pattern)) {
    return {
      type: 'multiline-element',
      dependencies: [CustomNode],
      // Match every line to check for a multiline pattern. It’s not great for performance, but
      // (part of) the developer-defined `pattern` cannot be used because it can be complex
      regExpStart: /^./,
      regExpEnd: { optional: true, regExp: /.$/ },
      /** @param {{ lines: string[], rootNode: any, startLineIndex: number }} args */
      handleImportAfterStartMatch: ({ lines, rootNode, startLineIndex }) => {
        const fullString = lines.slice(startLineIndex).join('\n');
        const [matchString] = fullString.match(nonGlobalPattern) ?? [];

        if (!matchString || !fullString.startsWith(matchString)) {
          return null;
        }

        const matchArray = matchString.match(nonGlobalPattern);
        const endLineIndex = startLineIndex + matchString.split('\n').length - 1;

        if (!matchArray) {
          // this should not happen
          return [false, endLineIndex];
        }

        rootNode.append(new CustomNode(getProps(matchArray)));

        return [true, endLineIndex];
      },
      replace: () => undefined,
      export: exportNode,
    };
  }

  return {
    type: 'text-match',
    dependencies: [CustomNode],
    importRegExp: nonGlobalPattern,
    regExp: nonGlobalPattern,
    /** @param {any} textNode @param {RegExpMatchArray} matchArray */
    replace: (textNode, matchArray) => {
      textNode.replace(new CustomNode(getProps(matchArray)));
    },
    export: exportNode,
  };
};

/**
 * `createLexicalNodeFeatures` of components/index.js: the node class and transformer of a
 * component. Sveltia caches them by id for the page's lifetime (`featureCacheMap`, since Lexical
 * refuses two classes of one type in an editor); the replica builds them per editor instead, so a
 * test can swap a definition under the same id.
 * @param {any} componentDef Component definition (id already prefixed by `getComponentDef`).
 * @returns {{ node: any, transformer: any }} Features.
 */
export const componentFeatures = (componentDef) => {
  const CustomNode = createCustomNodeClass(componentDef);

  return { node: CustomNode, transformer: createTransformer({ componentDef, CustomNode }) };
};
