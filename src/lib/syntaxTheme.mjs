// @ts-check
/**
 * Thème de coloration syntaxique (Shiki, cf. astro.config.mjs →
 * markdown.shikiConfig.theme) tiré des tokens du contrat visuel — plan 11,
 * R5, décision D52.
 *
 * Chaque couleur est `var(--color-<token>)`, jamais une valeur : le bloc de
 * code suit le thème du site par la seule cascade CSS (`@theme static` en
 * clair, `:root[data-theme="dark"]` en sombre), sans second thème Shiki ni
 * bascule `--shiki-dark`. Shiki accepte une couleur non hexadécimale dans un
 * thème : `normalizeTheme` (@shikijs/primitive) la remplace par un
 * hexadécimal de substitution pour le tokeniseur TextMate, puis la restitue
 * telle quelle dans le `style` inline via `colorReplacements`.
 *
 * Rôles : texte `body`, fond `code`, commentaires `muted`, et six familles de
 * portées sur `accent` et les cinq encres de tons (`tag<Ton>Ink`). Chacune
 * tient 4.5:1 sur `code` dans les deux thèmes (src/lib/syntaxTheme.test.ts,
 * calcul par src/lib/contrast.ts sur les valeurs de global.css). `dim` en est
 * exclu : 4.15:1 sur `code` en clair.
 *
 * Aucun littéral de couleur ici (garde palette.test.ts).
 */

/** @param {string} token nom du token sans `--color-` */
const t = (token) => `var(--color-${token})`;

/** @type {NonNullable<Exclude<import('astro').ShikiConfig['theme'], string>>} */
export const syntaxTheme = {
  name: 'bencat-tokens',
  type: 'light',
  fg: t('body'),
  bg: t('code'),
  colors: {
    'editor.foreground': t('body'),
    'editor.background': t('code'),
  },
  tokenColors: [
    // Réglage global (sans portée) : Shiki en tire fg/bg par défaut.
    { settings: { foreground: t('body'), background: t('code') } },

    // Commentaires → muted
    {
      scope: ['comment', 'punctuation.definition.comment', 'string.comment'],
      settings: { foreground: t('muted'), fontStyle: 'italic' },
    },

    // Mots-clés, stockage, opérateurs nommés → rose
    {
      scope: ['keyword', 'storage', 'storage.type', 'storage.modifier'],
      settings: { foreground: t('tagRoseInk') },
    },
    // …mais la ponctuation d'opérateur reste en texte courant.
    {
      scope: ['keyword.operator', 'keyword.operator.assignment', 'punctuation'],
      settings: { foreground: t('body') },
    },

    // Chaînes → bleu
    {
      scope: [
        'string',
        'string.quoted',
        'string.template',
        'string.unquoted.block',
        'punctuation.definition.string',
        'string.regexp',
        'markup.inline.raw',
        'markup.underline.link',
      ],
      settings: { foreground: t('tagBlueInk') },
    },

    // Constantes : nombres, booléens, null, échappements, variables système → ambre
    {
      scope: [
        'constant',
        'constant.numeric',
        'constant.language',
        'constant.character',
        'constant.character.escape',
        'constant.other',
        'support.constant',
        'variable.other.constant',
        'variable.language',
        'variable.other.normal.shell',
        'punctuation.definition.variable',
      ],
      settings: { foreground: t('tagAmberInk') },
    },

    // Fonctions, commandes, types, classes → violet
    {
      scope: [
        'entity.name.function',
        'support.function',
        'meta.function-call entity.name.function',
        'entity.name.command',
        'entity.name.type',
        'entity.name.class',
        'entity.other.inherited-class',
        'support.class',
        'support.type',
      ],
      settings: { foreground: t('tagVioletInk') },
    },

    // Paramètres, attributs, options de ligne de commande → vert
    {
      scope: [
        'variable.parameter',
        'entity.other.attribute-name',
        'constant.other.option',
        'meta.definition.variable variable.other',
      ],
      settings: { foreground: t('tagGreenInk') },
    },

    // Clés et balises : clés YAML/JSON, propriétés d'objet, balises HTML,
    // instructions Dockerfile, titres Markdown → accent
    {
      scope: [
        'entity.name.tag',
        'support.type.property-name',
        'meta.object-literal.key',
        'entity.name.section',
        'markup.heading',
        'keyword.other.special-method.dockerfile',
        'keyword.other.dockerfile',
      ],
      settings: { foreground: t('accent') },
    },

    // Diff
    { scope: ['markup.inserted'], settings: { foreground: t('tagGreenInk') } },
    { scope: ['markup.deleted'], settings: { foreground: t('tagRoseInk') } },
    { scope: ['markup.changed'], settings: { foreground: t('tagAmberInk') } },

    // Mise en forme (sans couleur propre)
    { scope: ['markup.bold'], settings: { fontStyle: 'bold' } },
    { scope: ['markup.italic'], settings: { fontStyle: 'italic' } },
  ],
};
