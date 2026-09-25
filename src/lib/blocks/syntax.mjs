// @ts-check
/**
 * Syntaxe `:::` des blocs de l'éditeur (plan 23, T1, R1 ; décision D152) —
 * LE module unique : noms, motifs, `fromBlock`, `toBlock`, validateurs. Lu par
 * le plugin du site (`remarkBlocks.mjs`), par les composants Sveltia
 * (`src/admin/blocks/`) et par le garde canonique (`src/lib/cmsCanonical.ts`).
 *
 * Quatre directives conteneur (`micromark-extension-directive`), clôture `:::` :
 *
 *   :::note | :::astuce | :::attention | :::danger      encadré, markdown dedans
 *   :::terminal[<titre>]  + UN bloc de code clôturé      fenêtre de terminal
 *   :::carte{ref="<collection>/<id>"}                    carte vers une entrée
 *   :::video[<titre>]{youtube="<id>"} | {asciinema="<id>"}
 *
 * Forme canonique = ce qu'écrit `toBlock` :
 * - encadré et terminal : une ligne vide après la ligne d'ouverture et une
 *   avant la clôture (le contenu est détaché des clôtures) ; encadré vide :
 *   `:::note` puis `:::` ;
 * - carte et vidéo : ligne d'ouverture puis clôture, sans ligne vide ;
 * - attributs entre guillemets doubles ;
 * - clôture allongée (`::::`, …) dès qu'une ligne du contenu commence par
 *   `:::` (sinon elle fermerait le conteneur, micromark acceptant une clôture
 *   au moins aussi longue que l'ouverture) ; clôture de code plus longue que
 *   toute suite de backticks du code.
 * Dans le document, le bloc est précédé et suivi d'une ligne vide (l'export
 * markdown de Lexical sépare ainsi ses nœuds de bloc).
 *
 * Motifs (Sveltia 0.221, `rich-text/components/transformers.js`) : drapeau
 * `m` (motif multiligne), ancrés par `^` ; à chaque ligne, Sveltia applique
 * le motif au reste du document et ne retient la correspondance que si elle
 * COMMENCE à cette ligne. Ils tolèrent à la lecture ce que micromark tolère
 * autour du contenu (lignes vides en plus ou en moins, clôture plus longue,
 * blancs de fin) ; `toBlock` réécrit la forme canonique.
 *
 * `toBlock` et `fromBlock` ne lèvent jamais (Sveltia appelle `toBlock({})`) ;
 * les validateurs (`blockErrors`, …) servent au site (le build échoue) et aux
 * formulaires.
 */

/** Genres d'encadré, dans l'ordre du menu. */
export const CALLOUT_KINDS = /** @type {const} */ (['note', 'astuce', 'attention', 'danger']);

/** Libellé affiché d'un encadré. */
export const CALLOUT_LABELS = /** @type {const} */ ({
  note: 'Note',
  astuce: 'Astuce',
  attention: 'Attention',
  danger: 'Danger',
});

/** Tous les noms de conteneur reconnus ; tout autre nom est une erreur de build. */
export const BLOCK_NAMES = /** @type {const} */ ([...CALLOUT_KINDS, 'terminal', 'carte', 'video']);

/** Fournisseurs vidéo, dans l'ordre du formulaire. */
export const VIDEO_PROVIDERS = /** @type {const} */ (['youtube', 'asciinema']);

/** Nom affiché d'un fournisseur (« Lecture sur <fournisseur> au clic »). */
export const VIDEO_PROVIDER_LABELS = /** @type {const} */ ({ youtube: 'YouTube', asciinema: 'asciinema' });

/** Identifiant vidéo accepté, par fournisseur. */
export const VIDEO_ID_PATTERNS = /** @type {const} */ ({
  youtube: /^[A-Za-z0-9_-]{11}$/,
  asciinema: /^[A-Za-z0-9]{1,32}$/,
});

/** Collections qu'une carte peut viser. */
export const ENTRY_COLLECTIONS = /** @type {const} */ (['blog', 'projects', 'prompts', 'skills']);

/** `<collection>/<id>` d'une carte. */
export const ENTRY_REF_PATTERN = /^(blog|projects|prompts|skills)\/[a-z0-9-]+$/;

/** Libellé du genre d'entrée sur une carte (et dans le sélecteur de l'éditeur). */
export const ENTRY_KIND_LABELS = /** @type {const} */ ({
  blog: 'Article',
  projects: 'Projet',
  prompts: 'Prompt',
  skills: 'Skill',
});

/**
 * Chemin de base d'une entrée sur le site — le `preview_path` de
 * public/admin/config.yml sans `{{slug}}` (vérifié par
 * src/admin/blocks/siteEntries.test.ts).
 */
export const ENTRY_BASE_PATHS = /** @type {const} */ ({
  blog: '/blog/',
  projects: '/projets/',
  prompts: '/prompts/',
  skills: '/skills/',
});

/** Langage d'un bloc de terminal : chaîne d'info d'une clôture (vide permis, sans backtick ni blanc). */
export const LANG_PATTERN = /^[A-Za-z0-9_+#.-]*$/;

/** Longueur maximale d'un titre (terminal, vidéo). */
export const TITLE_MAX = 200;

/* ------------------------------------------------------------------------ */
/* Validateurs : message d'erreur, ou `null`                                 */
/* ------------------------------------------------------------------------ */

/**
 * Titre d'un terminal ou d'une vidéo : une ligne non vide, sans blanc en
 * bordure, sans `[` ni `]` (il est écrit dans l'étiquette `[…]`), sans `\`
 * final (il échapperait le `]`), au plus `TITLE_MAX` caractères.
 * @param {unknown} title
 * @returns {string | null}
 */
export function titleError(title) {
  if (typeof title !== 'string' || title.trim() === '') return 'titre vide';
  if (title !== title.trim()) return `titre « ${title} » : blanc en début ou en fin`;
  if (/[\r\n]/.test(title)) return 'titre sur plusieurs lignes';
  if (/[[\]]/.test(title)) return `titre « ${title} » : « [ » et « ] » interdits`;
  if (title.endsWith('\\')) return `titre « ${title} » : « \\ » final interdit`;
  if (title.length > TITLE_MAX) return `titre de plus de ${TITLE_MAX} caractères`;
  return null;
}

/**
 * @param {unknown} provider
 * @param {unknown} id
 * @returns {string | null}
 */
export function videoIdError(provider, id) {
  if (provider !== 'youtube' && provider !== 'asciinema') return `fournisseur vidéo inconnu « ${String(provider)} »`;
  if (typeof id !== 'string' || !VIDEO_ID_PATTERNS[provider].test(id)) {
    return `id ${VIDEO_PROVIDER_LABELS[provider]} invalide « ${String(id)} »`;
  }
  return null;
}

/**
 * @param {unknown} ref
 * @returns {string | null}
 */
export function refError(ref) {
  if (typeof ref !== 'string' || !ENTRY_REF_PATTERN.test(ref)) return `ref invalide « ${String(ref)} »`;
  return null;
}

/**
 * @param {unknown} kind
 * @returns {string | null}
 */
export function calloutKindError(kind) {
  return typeof kind === 'string' && /** @type {readonly string[]} */ (CALLOUT_KINDS).includes(kind)
    ? null
    : `genre d'encadré inconnu « ${String(kind)} »`;
}

/**
 * @param {unknown} lang
 * @returns {string | null}
 */
export function langError(lang) {
  return typeof lang === 'string' && LANG_PATTERN.test(lang) ? null : `langage invalide « ${String(lang)} »`;
}

/**
 * Erreurs des propriétés d'un bloc (vide = valide).
 * @param {BlockId} id
 * @param {Record<string, unknown>} props
 * @returns {string[]}
 */
export function blockErrors(id, props) {
  /** @type {(string | null)[]} */
  let errors;
  switch (id) {
    case 'encadre':
      errors = [calloutKindError(props.kind), typeof props.content === 'string' ? null : 'contenu absent'];
      break;
    case 'terminal':
      errors = [
        titleError(props.title),
        langError(props.lang ?? ''),
        typeof props.code === 'string' ? null : 'code absent',
      ];
      break;
    case 'carte':
      errors = [refError(props.ref)];
      break;
    case 'video':
      errors = [videoIdError(props.provider, props.id), titleError(props.title)];
      break;
    default:
      errors = [`bloc inconnu « ${String(id)} »`];
  }
  return /** @type {string[]} */ (errors.filter(Boolean));
}

/* ------------------------------------------------------------------------ */
/* Écriture                                                                  */
/* ------------------------------------------------------------------------ */

/**
 * Clôture `:::` assez longue pour qu'aucune ligne de `text` ne la ferme :
 * une de plus que la plus longue suite de `:` (≥ 3) en tête de ligne.
 * @param {string} text
 */
export function colonFence(text) {
  let longest = 0;
  for (const [, run] of text.matchAll(/^[ \t]*(:+)/gm)) longest = Math.max(longest, run.length);
  return ':'.repeat(Math.max(3, longest + 1));
}

/**
 * Clôture de code plus longue que toute suite de backticks de `code`.
 * @param {string} code
 */
export function backtickFence(code) {
  let longest = 0;
  for (const [run] of code.matchAll(/`+/g)) longest = Math.max(longest, run.length);
  return '`'.repeat(Math.max(3, longest + 1));
}

/**
 * Contenu d'encadré normalisé : sans lignes vides en tête, sans blancs en fin.
 * @param {string} content
 */
export function normalizeCalloutContent(content) {
  return content.replace(/^(?:[ \t]*\r?\n)+/, '').trimEnd();
}

/** @param {unknown} value */
const str = (value) => (typeof value === 'string' ? value : value == null ? '' : String(value));

/**
 * @param {Record<string, unknown>} props
 * @returns {string}
 */
function calloutToBlock(props) {
  const kind = calloutKindError(props.kind) === null ? str(props.kind) : 'note';
  const content = normalizeCalloutContent(str(props.content));
  const fence = colonFence(content);
  return content === '' ? `${fence}${kind}\n${fence}` : `${fence}${kind}\n\n${content}\n\n${fence}`;
}

/**
 * @param {Record<string, unknown>} props
 * @returns {string}
 */
function terminalToBlock(props) {
  const title = str(props.title);
  const lang = str(props.lang).trim();
  const code = str(props.code);
  const ticks = backtickFence(code);
  const fence = colonFence(code);
  const body = code === '' ? `${ticks}${lang}\n${ticks}` : `${ticks}${lang}\n${code}\n${ticks}`;
  return `${fence}terminal[${title}]\n\n${body}\n\n${fence}`;
}

/**
 * @param {Record<string, unknown>} props
 * @returns {string}
 */
function carteToBlock(props) {
  return `:::carte{ref="${str(props.ref)}"}\n:::`;
}

/**
 * @param {Record<string, unknown>} props
 * @returns {string}
 */
function videoToBlock(props) {
  const provider = props.provider === 'asciinema' ? 'asciinema' : 'youtube';
  return `:::video[${str(props.title)}]{${provider}="${str(props.id)}"}\n:::`;
}

/* ------------------------------------------------------------------------ */
/* Lecture                                                                   */
/* ------------------------------------------------------------------------ */

// Morceaux de motif. `\1` = la clôture d'ouverture ; la fermeture est une ligne
// d'au moins autant de `:` (jusqu'à 3 espaces avant, blancs après), comme
// micromark-extension-directive 4.0.0.
const CLOSE = String.raw` {0,3}\1:*[ \t]*$`;
const BLANKS = String.raw`(?:[ \t]*\n)*`;
/** Un caractère qui n'ouvre pas une ligne de fermeture (jeton tempéré). */
const NOT_CLOSE = String.raw`(?:(?!^` + CLOSE + String.raw`)[\s\S])`;

const CALLOUT_PATTERN = new RegExp(
  String.raw`^(:{3,})(note|astuce|attention|danger)[ \t]*$([\s\S]*?)^` + CLOSE,
  'm',
);
const TERMINAL_PATTERN = new RegExp(
  String.raw`^(:{3,})terminal\[([^[\]\n]*)\][ \t]*\n` +
    BLANKS +
    String.raw`(\`{3,})([^\`\n]*)$(` +
    NOT_CLOSE +
    String.raw`*?)^\3\`*[ \t]*\n` +
    BLANKS +
    CLOSE,
  'm',
);
const CARTE_PATTERN = new RegExp(String.raw`^(:{3,})carte\{ref="([^"\n]*)"\}[ \t]*\n` + BLANKS + CLOSE, 'm');
const VIDEO_PATTERN = new RegExp(
  String.raw`^(:{3,})video\[([^[\]\n]*)\]\{(youtube|asciinema)="([^"\n]*)"\}[ \t]*\n` + BLANKS + CLOSE,
  'm',
);

/**
 * Lignes entre deux lignes (le groupe capturé commence par le saut de la
 * ligne d'ouverture et finit par celui de la dernière ligne) : `"\n"` → `""`,
 * `"\nx\n"` → `"x"`, `"\n\n"` → `""`.
 * @param {string | undefined} inner
 */
const between = (inner) => (inner ?? '\n').slice(1, -1);

/**
 * @param {RegExpMatchArray} match
 * @returns {Record<string, string>}
 */
function calloutFromBlock(match) {
  return { kind: match[2] ?? 'note', content: normalizeCalloutContent(between(match[3])) };
}

/**
 * @param {RegExpMatchArray} match
 * @returns {Record<string, string>}
 */
function terminalFromBlock(match) {
  return { title: match[2] ?? '', lang: (match[4] ?? '').trim(), code: between(match[5]) };
}

/**
 * @param {RegExpMatchArray} match
 * @returns {Record<string, string>}
 */
function carteFromBlock(match) {
  return { ref: match[2] ?? '' };
}

/**
 * @param {RegExpMatchArray} match
 * @returns {Record<string, string>}
 */
function videoFromBlock(match) {
  return { provider: match[3] ?? 'youtube', id: match[4] ?? '', title: match[2] ?? '' };
}

/**
 * @typedef {'encadre' | 'terminal' | 'carte' | 'video'} BlockId
 * @typedef {object} BlockSyntax
 * @property {RegExp} pattern motif Sveltia (multiligne, ancré)
 * @property {(match: RegExpMatchArray) => Record<string, string>} fromBlock
 * @property {(props: Record<string, unknown>) => string} toBlock
 */

/**
 * Syntaxe par composant de l'éditeur (ids Sveltia de public/admin/config.yml).
 * @type {Record<BlockId, BlockSyntax>}
 */
export const BLOCKS = {
  encadre: { pattern: CALLOUT_PATTERN, fromBlock: calloutFromBlock, toBlock: calloutToBlock },
  terminal: { pattern: TERMINAL_PATTERN, fromBlock: terminalFromBlock, toBlock: terminalToBlock },
  carte: { pattern: CARTE_PATTERN, fromBlock: carteFromBlock, toBlock: carteToBlock },
  video: { pattern: VIDEO_PATTERN, fromBlock: videoFromBlock, toBlock: videoToBlock },
};

/**
 * Titre écrit dans l'étiquette `[…]` de la ligne d'ouverture `line`, tel quel
 * (source brute : ni échappement markdown, ni typographie de smartypants) ;
 * `undefined` sans étiquette.
 * @param {string} line ligne d'ouverture, à partir des `:`
 * @returns {string | undefined}
 */
export function openingLabel(line) {
  const match = /^:{3,}[A-Za-z][\w-]*\[([^\n]*?)\]/.exec(line);
  if (match) return match[1];
  // Étiquette ouverte mais non fermée sur la ligne, ou crochets imbriqués :
  // rendue telle quelle pour que le validateur la refuse.
  const open = /^:{3,}[A-Za-z][\w-]*\[([^\n]*)/.exec(line);
  return open ? open[1] : undefined;
}
