// Copied verbatim from @sveltia/ui 0.77.0 — dist/components/text-editor/transformers/hr.js
// (sources embedded in @sveltia/cms 0.221.0 npm/index.js.map). MIT License,
// Copyright (c) 2026 Kohei Yoshino — full text in ../../LICENSE-sveltia.txt.
// Test-only: part of the Lexical round-trip replica (lexicalRoundTrip.ts).
// Sveltia adapted it from Lexical's playground (MIT License, Copyright (c) Meta Platforms, Inc.
// and affiliates — the notice ships in node_modules/lexical/LICENSE).

// Adopted from https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/plugins/MarkdownTransformers/index.ts

/* eslint-disable jsdoc/require-jsdoc */

import {
  $createHorizontalRuleNode as createHorizontalRuleNode,
  HorizontalRuleNode,
  $isHorizontalRuleNode as isHorizontalRuleNode,
} from '@lexical/extension';

/**
 * @import { ElementTransformer } from '@lexical/markdown';
 */

/**
 * @type {ElementTransformer}
 */
export const HR = {
  dependencies: [HorizontalRuleNode],
  export: (node) => (isHorizontalRuleNode(node) ? '***' : null),
  regExp: /^(---|\*\*\*|___)\s?$/,
  replace: (parentNode, _1, _2, isImport) => {
    const line = createHorizontalRuleNode();

    if (isImport || parentNode.getNextSibling() !== null) {
      parentNode.replace(line);
    } else {
      parentNode.insertBefore(line);
    }

    line.selectNext();
  },
  type: 'element',
};
