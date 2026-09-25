// @ts-check
/**
 * Plugin remark des blocs `:::` (plan 23, T1, R2–R4 ; décisions D152, D153),
 * dans `markdownOptions.mjs` : le site ET l'aperçu de `/admin/` le passent.
 *
 * Analyse : seule la construction CONTENEUR de `micromark-extension-directive`
 * est enregistrée (plus le from-markdown de `mdast-util-directive`) — ni la
 * forme texte `:x` ni la forme feuille `::x` : `:pods`, `a:b`, `::x`,
 * `:x[y]{z}` restent du texte, comme sans le plugin.
 *
 * Rendu (mdast `data.hName/hProperties/hChildren`, classes écrites en toutes
 * lettres pour Tailwind — D41 —, tokens seulement) :
 * - encadré : `<aside role="note" data-callout aria-label>` + libellé + le
 *   markdown rendu, tons tag* (note bleu, astuce vert, attention ambre,
 *   danger rose) ; indexé par Pagefind ;
 * - terminal : le balisage de CodeWindow.astro (`figure[data-code-window]
 *   [data-terminal]`, barre, pastilles, puce de titre, « Copier » caché,
 *   gouttière numérotée, lignes de `codeWindowLines(code, titre)`) — un `pre`
 *   à deux enfants, que Shiki ne colore pas ; indexé comme le code d'article
 *   (gouttière et bouton exclus) ;
 * - carte : `<a data-entry-card data-pagefind-ignore href>` avec genre, titre
 *   et description de l'entrée (index de `siteEntries.mjs`) ;
 * - vidéo : `<figure data-video data-provider data-video-id
 *   data-pagefind-ignore>` avec UN lien vers la page du fournisseur (façade :
 *   aucun `<iframe>`, aucune `<img>`, aucune autre URL tierce), tokens
 *   window* toujours sombres, 16:9.
 * `.prose` (global.css) est hors couche et bat les utilitaires : les
 * propriétés qu'il pose sur `pre`, `pre code`, `code` et les liens sont
 * reprises en `!important` (suffixe `!` de Tailwind v4).
 *
 * Erreurs (le build échoue, le message nomme le fichier) : nom de conteneur
 * inconnu, étiquette ou attributs inattendus, titre / id / ref invalides,
 * terminal sans exactement un bloc de code ; ref inconnue ou brouillon cité
 * selon la politique de `siteEntries.mjs`. Dans l'aperçu (fournisseur
 * d'entrées en mode `preview` — plan 23, F2 ; D158), un tel bloc est rendu
 * par un espace réservé neutre « Bloc incomplet : <bloc> — <problème> »,
 * sans exception : un bloc juste inséré a ses champs vides, et chaque frappe
 * jetait deux `console.error` (celui de `@astrojs/markdown-remark`, qui
 * journalise toute erreur de rendu, puis celui de `previews/register.ts`).
 * Sans fournisseur, ou en mode `site`, l'erreur est levée.
 *
 * Drapeau : un corps qui porte des blocs reçoit `blocks: { callout, terminal,
 * carte, video }` (comptes) dans le frontmatter des plugins
 * (`remarkPluginFrontmatter`) — la page n'ajoute un script que s'il sert.
 */
import { directive } from 'micromark-extension-directive';
import { directiveFromMarkdown } from 'mdast-util-directive';
import { codeWindowLines, codeWindowText, isYamlFile } from '../codeWindow';
import {
  BLOCK_NAMES,
  CALLOUT_KINDS,
  CALLOUT_LABELS,
  VIDEO_PROVIDER_LABELS,
  langError,
  openingLabel,
  refError,
  titleError,
  videoIdError,
} from './syntax.mjs';
import { resolveCards, siteEntriesProvider } from './siteEntries.mjs';

/**
 * @typedef {{ type: 'element', tagName: string, properties: Record<string, unknown>, children: HastNode[] }} HastElement
 * @typedef {HastElement | { type: 'text', value: string }} HastNode
 * @typedef {{ type: string, name?: string, attributes?: Record<string, string | null | undefined> | null,
 *   children?: MdNode[], value?: string, lang?: string | null,
 *   data?: Record<string, unknown>, position?: { start: { line: number, offset?: number } } }} MdNode
 */

/** Extension micromark réduite à la construction conteneur (`:::`). */
function containerDirectiveOnly() {
  const all = directive();
  const flow = /** @type {any} */ (all.flow)?.[58];
  const containers = (Array.isArray(flow) ? flow : [flow]).filter(
    (construct) => construct?.tokenize?.name === 'tokenizeDirectiveContainer',
  );
  if (containers.length !== 1) {
    throw new Error('remarkBlocks : construction conteneur introuvable dans micromark-extension-directive');
  }
  return { flow: { 58: containers } };
}

/* ------------------------------------------------------------------------ */
/* Classes (en toutes lettres, tokens seulement)                             */
/* ------------------------------------------------------------------------ */

/** Tons des encadrés : boîte, libellé. */
export const CALLOUT_CLASSES = {
  note: {
    box: 'my-6 rounded-inner border border-l-[3px] border-tagBlueLine border-l-tagBlueInk bg-tagBlueBg px-4 py-3 sm:px-5',
    label: 'mb-1.5 font-mono text-[12px] font-semibold tracking-[.04em] text-tagBlueInk',
  },
  astuce: {
    box: 'my-6 rounded-inner border border-l-[3px] border-tagGreenLine border-l-tagGreenInk bg-tagGreenBg px-4 py-3 sm:px-5',
    label: 'mb-1.5 font-mono text-[12px] font-semibold tracking-[.04em] text-tagGreenInk',
  },
  attention: {
    box: 'my-6 rounded-inner border border-l-[3px] border-tagAmberLine border-l-tagAmberInk bg-tagAmberBg px-4 py-3 sm:px-5',
    label: 'mb-1.5 font-mono text-[12px] font-semibold tracking-[.04em] text-tagAmberInk',
  },
  danger: {
    box: 'my-6 rounded-inner border border-l-[3px] border-tagRoseLine border-l-tagRoseInk bg-tagRoseBg px-4 py-3 sm:px-5',
    label: 'mb-1.5 font-mono text-[12px] font-semibold tracking-[.04em] text-tagRoseInk',
  },
};

/** Corps d'encadré : dernier bloc sans marge ; code en ligne sur fond `card` (contraste AA sur les tons). */
const CALLOUT_BODY_CLASS = '[&>:last-child]:mb-0! [&_:not(pre)>code]:bg-card!';

const TERMINAL_CLASSES = {
  figure: 'my-6 overflow-hidden rounded-inner border border-windowLine bg-windowBg',
  bar: 'flex h-[38px] items-center gap-3 border-b border-windowLine bg-windowHead px-3.5',
  dots: 'flex shrink-0 gap-1.5',
  dotRed: 'size-2.5 rounded-pill bg-windowDotRed',
  dotAmber: 'size-2.5 rounded-pill bg-windowDotAmber',
  dotGreen: 'size-2.5 rounded-pill bg-windowDotGreen',
  title: 'min-w-0 truncate rounded-small bg-windowLine px-2 py-0.5 font-mono text-[11px] text-windowDim',
  copy: 'ml-auto shrink-0 cursor-pointer rounded-small px-2 py-1 font-mono text-[10px] leading-none text-windowDim transition-colors hover:text-windowInk focus-visible:text-windowInk focus-visible:outline-2 focus-visible:outline-windowInk',
  pre: 'm-0! grid grid-cols-[46px_1fr] overflow-x-auto rounded-none! border-0! bg-windowBg! py-4! pr-4! pl-0! font-mono text-[13px]! leading-[1.7]!',
  gutter: 'select-none pr-3.5 text-right text-windowDim',
  code: 'bg-transparent! p-0! text-windowInk!',
};

/** @type {Record<string, string | null>} */
const SEGMENT_CLASSES = { key: 'text-windowKey', value: 'text-windowValue', plain: null };

const CARD_CLASSES = {
  link: 'my-6 block rounded-inner border border-line bg-card px-4 py-3 no-underline! transition-colors hover:bg-cardHover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:px-5',
  kind: 'block font-mono text-[11px] text-muted',
  title: 'mt-1 block font-semibold leading-snug text-ink',
  description: 'mt-1 block text-[14px] leading-[1.6] text-muted',
  missing: 'my-6 rounded-inner border border-tagRoseLine bg-tagRoseBg px-4 py-3 font-mono text-[13px] text-tagRoseInk',
};

/** Espace réservé d'un bloc incomplet ou invalide (aperçu seulement) : neutre, tokens seulement. */
export const INCOMPLETE_CLASS = 'my-6 rounded-inner border border-line bg-card px-4 py-3 font-mono text-[13px] text-muted';

const VIDEO_CLASSES = {
  figure: 'my-6 aspect-video overflow-hidden rounded-inner border border-windowLine bg-windowBg',
  link: 'flex size-full flex-col items-center justify-center gap-3 p-6 text-center no-underline! focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-windowInk',
  play: 'flex size-14 items-center justify-center rounded-pill border border-windowLine bg-windowHead text-windowInk',
  title: 'block max-w-full font-semibold text-balance text-windowInk',
  hint: 'block font-mono text-[12px] text-windowDim',
};

/** Page du fournisseur (sans JS, le lien y mène). @type {Record<string, (id: string) => string>} */
const VIDEO_PAGE = {
  youtube: (id) => `https://www.youtube.com/watch?v=${id}`,
  asciinema: (id) => `https://asciinema.org/a/${id}`,
};

/* ------------------------------------------------------------------------ */
/* Hast                                                                      */
/* ------------------------------------------------------------------------ */

/**
 * @param {string} tagName
 * @param {Record<string, unknown>} properties
 * @param {HastNode[]} [children]
 * @returns {HastElement}
 */
const el = (tagName, properties, children = []) => ({ type: 'element', tagName, properties, children });

/** @param {string} value @returns {HastNode} */
const text = (value) => ({ type: 'text', value });

/** @param {string} classes */
const cls = (classes) => classes.split(' ');

/**
 * Glyphe lecture (triangle), couleur du texte. Sans `focusable="false"`
 * (utile au seul IE/Edge historique) : l'assainisseur de l'aperçu (DOMPurify,
 * D143/D153, inchangé) le retire, et le HTML des blocs doit le traverser
 * intact (plan 23, T4, R5).
 */
const PLAY_GLYPH = el(
  'svg',
  { viewBox: '0 0 24 24', width: '24', height: '24', ariaHidden: 'true' },
  [el('path', { d: 'M8 5.5v13l10.5-6.5z', fill: 'currentColor' })],
);

/**
 * @param {string} title
 * @param {string} lang
 * @param {string} code
 * @returns {HastElement}
 */
function terminalHast(title, lang, code) {
  const lines = codeWindowLines(code, title);
  const gutter = lines.map((line) => line.number).join('\n');
  /** @type {HastNode[]} */
  const codeChildren = [];
  lines.forEach((line, index) => {
    if (index > 0) codeChildren.push(text('\n'));
    for (const { kind, text: segment } of line.segments) {
      const segmentClass = SEGMENT_CLASSES[kind];
      codeChildren.push(
        segmentClass
          ? el('span', { className: cls(segmentClass), [`dataCode${kind[0].toUpperCase()}${kind.slice(1)}`]: true }, [
              text(segment),
            ])
          : text(segment),
      );
    }
  });
  // Garde-fou (comme CodeWindow.astro) : les segments redonnent le texte.
  const plain = lines.map((line) => line.segments.map((segment) => segment.text).join('')).join('\n');
  if (plain !== codeWindowText(code)) throw new Error(`terminal « ${title} » : les segments ne redonnent pas le code`);

  return el(
    'figure',
    {
      className: cls(TERMINAL_CLASSES.figure),
      ariaLabel: `Terminal : ${title}`,
      dataCodeWindow: true,
      dataTerminal: true,
      dataCodeLang: lang || (isYamlFile(title) ? 'yaml' : 'text'),
    },
    [
      el('div', { className: cls(TERMINAL_CLASSES.bar) }, [
        el('span', { className: cls(TERMINAL_CLASSES.dots), ariaHidden: 'true' }, [
          el('span', { className: cls(TERMINAL_CLASSES.dotRed) }),
          el('span', { className: cls(TERMINAL_CLASSES.dotAmber) }),
          el('span', { className: cls(TERMINAL_CLASSES.dotGreen) }),
        ]),
        el('span', { className: cls(TERMINAL_CLASSES.title), dataCodeFile: true }, [text(title)]),
        el(
          'button',
          {
            type: 'button',
            hidden: true,
            ariaLive: 'polite',
            className: cls(TERMINAL_CLASSES.copy),
            dataCodeCopy: true,
            dataPagefindIgnore: true,
          },
          [text('Copier')],
        ),
      ]),
      el('pre', { className: cls(TERMINAL_CLASSES.pre) }, [
        el(
          'span',
          { ariaHidden: 'true', className: cls(TERMINAL_CLASSES.gutter), dataCodeGutter: true, dataPagefindIgnore: true },
          [text(gutter)],
        ),
        el('code', { className: cls(TERMINAL_CLASSES.code) }, codeChildren),
      ]),
    ],
  );
}

/**
 * @param {import('./siteEntries.mjs').ResolvedCard} card
 * @returns {HastElement}
 */
function cardHast(card) {
  if ('missing' in card) {
    return el('div', { className: cls(CARD_CLASSES.missing), dataEntryCardMissing: card.ref, dataPagefindIgnore: true }, [
      text(card.missing),
    ]);
  }
  /** @type {HastNode[]} */
  const children = [
    el('span', { className: cls(CARD_CLASSES.kind), dataEntryCardKind: true }, [text(card.kind)]),
    el('span', { className: cls(CARD_CLASSES.title), dataEntryCardTitle: true }, [text(card.entry.title)]),
  ];
  if (card.entry.description) {
    children.push(
      el('span', { className: cls(CARD_CLASSES.description), dataEntryCardDescription: true }, [
        text(card.entry.description),
      ]),
    );
  }
  return el('a', { href: card.href, className: cls(CARD_CLASSES.link), dataEntryCard: card.ref, dataPagefindIgnore: true }, children);
}

/**
 * @param {'youtube' | 'asciinema'} provider
 * @param {string} id
 * @param {string} title
 * @returns {HastElement}
 */
function videoHast(provider, id, title) {
  return el(
    'figure',
    {
      className: cls(VIDEO_CLASSES.figure),
      dataVideo: true,
      dataProvider: provider,
      dataVideoId: id,
      dataPagefindIgnore: true,
    },
    [
      el('a', { href: VIDEO_PAGE[provider](id), className: cls(VIDEO_CLASSES.link), dataVideoLink: true }, [
        el('span', { className: cls(VIDEO_CLASSES.play), ariaHidden: 'true' }, [PLAY_GLYPH]),
        el('span', { className: cls(VIDEO_CLASSES.title), dataVideoTitle: true }, [text(title)]),
        el('span', { className: cls(VIDEO_CLASSES.hint) }, [
          text(`Lecture sur ${VIDEO_PROVIDER_LABELS[provider]} au clic`),
        ]),
      ]),
    ],
  );
}

/**
 * Espace réservé d'un bloc incomplet ou invalide (aperçu).
 * @param {string} name nom du conteneur
 * @param {string} problem
 * @returns {HastElement}
 */
function incompleteHast(name, problem) {
  return el('div', { className: cls(INCOMPLETE_CLASS), dataBlockIncomplete: name, dataPagefindIgnore: true }, [
    text(`Bloc incomplet : ${blockLabel(name)} — ${problem}`),
  ]);
}

/** Nom lisible d'un bloc (message de l'espace réservé). @param {string} name */
function blockLabel(name) {
  if (/** @type {readonly string[]} */ (CALLOUT_KINDS).includes(name)) return 'Encadré';
  /** @type {Record<string, string>} */
  const labels = { terminal: 'Terminal', carte: 'Carte', video: 'Vidéo' };
  return labels[name] ?? `« ${name} »`;
}

/** Erreur de validation d'un bloc : message complet (build) et problème seul (aperçu). */
class BlockError extends Error {
  /**
   * @param {string} message
   * @param {string} problem
   */
  constructor(message, problem) {
    super(message);
    this.name = 'BlockError';
    this.problem = problem;
  }
}

/* ------------------------------------------------------------------------ */
/* Plugin                                                                    */
/* ------------------------------------------------------------------------ */

/**
 * Le conteneur est rendu par l'élément `hast` (même balise, propriétés, enfants).
 * @param {MdNode} node
 * @param {HastElement} hast
 */
function replaceWith(node, hast) {
  node.data = { hName: hast.tagName, hProperties: hast.properties, hChildren: hast.children };
  node.children = [];
}

/**
 * @param {MdNode} tree
 * @returns {MdNode[]} conteneurs `:::`, ordre du document (imbriqués compris)
 */
function containers(tree) {
  /** @type {MdNode[]} */
  const found = [];
  /** @param {MdNode} node */
  const walk = (node) => {
    if (node.type === 'containerDirective') found.push(node);
    node.children?.forEach(walk);
  };
  walk(tree);
  return found;
}

/**
 * Plugin unified (remark). Aucune option : l'index des cartes vient du
 * fournisseur de `siteEntries.mjs`.
 * @this {any}
 */
export function remarkBlocks() {
  const data = this.data();
  (data.micromarkExtensions ??= []).push(containerDirectiveOnly());
  (data.fromMarkdownExtensions ??= []).push(directiveFromMarkdown());

  /**
   * @param {any} tree racine mdast
   * @param {any} file VFile
   */
  return async (tree, file) => {
    const blocks = containers(/** @type {MdNode} */ (tree));
    if (blocks.length === 0) return;

    const source = String(file.value ?? '');
    const path = file.path ?? file.history?.[0] ?? '<markdown>';
    const frontmatter = file.data?.astro?.frontmatter ?? {};

    /** @param {MdNode} node @param {string} message */
    const fail = (node, message) => {
      const line = node.position?.start.line;
      return new BlockError(`Bloc « ${node.name} » dans ${path}${line ? ` (ligne ${line})` : ''} : ${message}`, message);
    };
    // Aperçu : un bloc invalide devient un espace réservé ; ailleurs, il lève.
    const preview = siteEntriesProvider()?.mode === 'preview';

    /** @param {MdNode} node */
    const label = (node) => {
      const first = node.children?.[0];
      if (!first?.data?.directiveLabel) return undefined;
      const offset = node.position?.start.offset;
      if (offset === undefined) throw fail(node, 'position absente');
      const end = source.indexOf('\n', offset);
      return openingLabel(source.slice(offset, end === -1 ? undefined : end)) ?? '';
    };

    /** @param {MdNode} node */
    const content = (node) => (node.children ?? []).filter((child) => !child.data?.directiveLabel);

    /** @param {MdNode} node @param {string[]} allowed */
    const checkAttributes = (node, allowed) => {
      const names = Object.keys(node.attributes ?? {});
      const extra = names.filter((name) => !allowed.includes(name));
      if (extra.length > 0) throw fail(node, `attribut inattendu « ${extra.join(', ')} »`);
    };

    const counts = { callout: 0, terminal: 0, carte: 0, video: 0 };
    /** @type {{ node: MdNode, ref: string }[]} */
    const cards = [];

    /** Rend un conteneur (mutation du nœud) ; lève une `BlockError` s'il est invalide. @param {MdNode} node */
    const renderBlock = (node) => {
      const name = node.name ?? '';
      if (!(/** @type {readonly string[]} */ (BLOCK_NAMES).includes(name))) {
        throw fail(node, `nom de bloc inconnu (attendus : ${BLOCK_NAMES.join(', ')})`);
      }

      if (/** @type {readonly string[]} */ (CALLOUT_KINDS).includes(name)) {
        const kind = /** @type {keyof typeof CALLOUT_CLASSES} */ (name);
        if (label(node) !== undefined) throw fail(node, 'un encadré ne prend pas de titre');
        checkAttributes(node, []);
        const { box, label: labelClass } = CALLOUT_CLASSES[kind];
        node.data = {
          hName: 'aside',
          hProperties: { role: 'note', ariaLabel: CALLOUT_LABELS[kind], dataCallout: kind, className: cls(box) },
        };
        node.children = [
          {
            type: 'blockCalloutLabel',
            children: [],
            data: {
              hName: 'div',
              hProperties: { className: cls(labelClass), dataCalloutLabel: true },
              hChildren: [text(CALLOUT_LABELS[kind])],
            },
          },
          {
            type: 'blockCalloutBody',
            children: content(node),
            data: { hName: 'div', hProperties: { className: cls(CALLOUT_BODY_CLASS), dataCalloutBody: true } },
          },
        ];
        counts.callout += 1;
        return;
      }

      if (name === 'terminal') {
        const title = label(node);
        const titleProblem = titleError(title);
        if (titleProblem) throw fail(node, titleProblem);
        checkAttributes(node, []);
        const body = content(node);
        if (body.length !== 1 || body[0].type !== 'code') {
          throw fail(node, 'un terminal contient exactement un bloc de code clôturé (```)');
        }
        const lang = body[0].lang ?? '';
        const langProblem = langError(lang);
        if (langProblem) throw fail(node, langProblem);
        replaceWith(node, terminalHast(/** @type {string} */ (title), lang, body[0].value ?? ''));
        counts.terminal += 1;
        return;
      }

      if (name === 'carte') {
        if (label(node) !== undefined) throw fail(node, 'une carte ne prend pas de titre');
        checkAttributes(node, ['ref']);
        const ref = node.attributes?.ref;
        const refProblem = refError(ref);
        if (refProblem) throw fail(node, refProblem);
        if (content(node).length > 0) throw fail(node, 'une carte est vide entre ses clôtures');
        cards.push({ node, ref: /** @type {string} */ (ref) });
        counts.carte += 1;
        return;
      }

      // video
      const title = label(node);
      const titleProblem = titleError(title);
      if (titleProblem) throw fail(node, titleProblem);
      const providers = Object.keys(node.attributes ?? {});
      if (providers.length !== 1) throw fail(node, 'un seul attribut attendu : youtube="<id>" ou asciinema="<id>"');
      const [provider] = providers;
      const id = node.attributes?.[provider];
      const idProblem = videoIdError(provider, id);
      if (idProblem) throw fail(node, idProblem);
      if (content(node).length > 0) throw fail(node, 'une vidéo est vide entre ses clôtures');
      replaceWith(
        node,
        videoHast(/** @type {'youtube' | 'asciinema'} */ (provider), /** @type {string} */ (id), /** @type {string} */ (title)),
      );
      counts.video += 1;
    };

    for (const node of blocks) {
      try {
        renderBlock(node);
      } catch (error) {
        if (!(preview && error instanceof BlockError)) throw error;
        replaceWith(node, incompleteHast(node.name ?? '', error.problem));
      }
    }

    if (cards.length > 0) {
      const resolved = await resolveCards(
        [...new Set(cards.map((card) => card.ref))],
        { file: path, citingDraft: frontmatter.draft === true },
      );
      for (const { node, ref } of cards) {
        const card = /** @type {import('./siteEntries.mjs').ResolvedCard} */ (resolved.get(ref));
        replaceWith(node, cardHast(card));
      }
    }

    // Nouvel objet : le frontmatter reçu (données de l'entrée) n'est pas modifié.
    (file.data.astro ??= {}).frontmatter = { ...frontmatter, blocks: counts };
  };
}
