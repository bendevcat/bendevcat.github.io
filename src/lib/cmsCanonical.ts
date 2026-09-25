/**
 * Forme canonique Sveltia du contenu (plan 21, F2 ; D145).
 *
 * À l'ouverture d'une entrée, les éditeurs Lexical de Sveltia CMS 0.221.0
 * (`@sveltia/ui` 0.77.0, Lexical 0.51.0) relisent chaque valeur puis la
 * réécrivent dans leur propre forme Markdown. Si le résultat diffère du
 * fichier, le brouillon est « modifié » dès le chargement : **Save** s'active
 * sans que l'auteur ait touché à rien, et la sauvegarde suivante publie la
 * forme réécrite — parfois fausse (`\*\*` littéraux). Ce module décrit, et
 * détecte, les constructions que cet aller-retour réécrit, relevées dans les
 * sources publiées de Sveltia (`npm/index.js.map`) :
 *
 * Corps (`widget: markdown`) — `text-editor/core.js` `convertMarkdownToLexical`
 * puis `onEditorUpdate` :
 * - `span` : `**`, `~~` ou `` ` `` ouvert sur une ligne et fermé sur une
 *   autre. `markdown.js` `splitMultilineFormatting` coupe la paire en deux
 *   quand elle est bordée de blancs (`**a**⏎**b**`) ; sinon Lexical
 *   (`$convertFromMarkdownString`) lit chaque ligne seule, le délimiteur reste
 *   du texte et ressort échappé (`\*\*`). Forme canonique : le saut de ligne
 *   passe hors de la paire. (Un `_` littéral ressort tel quel : `onEditorUpdate`
 *   retire l'échappement `\_`.)
 * - `split-multiline` : les motifs exacts de `splitMultilineFormatting` (`_`,
 *   `**`, `~~`, `` ` `` sur deux lignes, bordés de blancs), appliqués aussi
 *   dans les blocs de code et les champs de code.
 * - `star` : `constants.js` `DISABLED_MARKDOWN_TAGS` (`*`, `__`, `***`,
 *   `___`) — l'italique ressort `_x_`, le gras `**x**`, le gras-italique
 *   `**_x_**` ; un `*` isolé restant est du texte, que l'export Lexical
 *   (`exportTextFormat`) échappe en `\*`. Dans une cellule de tableau
 *   (`transformers/table.js`, transformeurs Lexical par défaut), l'inverse :
 *   l'italique ressort `*x*`. Un `*x*` collé à un mot ne peut pas devenir
 *   `_x_` sans changer le rendu (`_` ne marque pas l'emphase dans un mot).
 * - `underscore-strong` : `__x__` → `**x**` ; `nesting` : `_**x**_` →
 *   `**_x_**`.
 * - `tilde` : un `~` isolé est échappé en `\~` (`exportTextFormat`).
 * - `table` / `table-align` : `transformers/table.js` réécrit chaque ligne
 *   `| a | b |` (cellules rognées, un espace de part et d'autre) et le
 *   séparateur `| --- | --- |` ; l'alignement (`:---:`) est perdu, un `|`
 *   échappé coupe la cellule, une ligne plus courte sort du tableau.
 * - `fence` : bloc de code sans langue → `` ```plain `` (`shiki/highlighter.js`
 *   `codeNodeTransform`, langue par défaut). La forme canonique retenue est
 *   `` ```plaintext ``, que le site rend octet pour octet comme un bloc sans
 *   langue (`plain` changerait `data-language`) ; `~~~`, bloc indenté ou
 *   langue hors `[\w-]+` sont mal relus (`CODE_START_REGEX` de Lexical).
 * - `blank-lines` : plusieurs lignes vides n'en font qu'une.
 * - `block-gap` : titre, bloc de code, tableau, liste qui suit un paragraphe,
 *   suite paresseuse d'une citation — Lexical sépare chaque bloc d'une ligne
 *   vide.
 * - `loose-list` : une ligne vide dans une liste disparaît — la liste
 *   « lâche » devient serrée et le site perd les `<p>` de ses éléments (rendu
 *   changé : à trancher, pas à normaliser) ; `list-indent` : 4 espaces par
 *   niveau (`increaseListIndentation` puis l'export des listes) ;
 *   `list-number` : liste numérotée renumérotée en suite.
 * - `setext` : `---` sous une ligne de texte devient un séparateur.
 * - `block` (plan 23, T5, R9) : une ligne qui commence par `:::` doit ouvrir
 *   un bloc de l'éditeur (`src/lib/blocks/syntax.mjs`) écrit exactement comme
 *   son composant Sveltia l'écrit — `toBlock(fromBlock(match))`, titre, id et
 *   langage élagués comme dans `src/admin/blocks/editorComponents.ts`. Le
 *   motif est confronté au reste du document à partir de cette ligne, comme
 *   le transformateur `multiline-element` de Sveltia (`components/
 *   transformers.js`) ; sans correspondance (attribut sans guillemets, `:::`
 *   dans un encadré à la même longueur de clôture, nom inconnu, indentation),
 *   la ligne reste du texte dans l'éditeur ; avec une correspondance d'une
 *   autre forme (ligne vide en trop ou en moins, blancs, clôture trop longue),
 *   l'export la réécrit. `block-gap` : un bloc non précédé ou non suivi d'une
 *   ligne vide.
 * - Contenu d'un encadré : relu par l'éditeur imbriqué du formulaire (boutons
 *   gras, italique, code, lien, listes ; ni composant, ni bloc de code, ni
 *   barré) — les règles du corps, plus `block-content` pour un bloc de code
 *   clôturé ou un `~~` (réécrits `` \` `` et `\~`).
 * - Code d'un terminal : un champ `text` (plan 23, F1 ; D158) — un
 *   `<textarea>` qui rend la valeur telle quelle (`text-editor.svelte`), sans
 *   éditeur Lexical : ```` ``` ```` et saut de ligne final y survivent. Seules
 *   comptent les passes du corps qui le précèdent (`split-multiline`,
 *   `fence-toggle`).
 * - `fence-toggle` : `increaseListIndentation` et `padBlankBlockquoteLines`
 *   (`markdown.js`) sautent les blocs de code, mais les repèrent en basculant
 *   à CHAQUE ligne qui commence par ```` ``` ```` ou `~~~`, sans longueur ni
 *   clôture. Une telle ligne dans du code (code d'un terminal, bloc à clôture
 *   plus longue) inverse la bascule : une ligne de code prise pour du texte
 *   est réécrite (retrait doublé devant `-`, `+`, `*` ou `1.` si le corps a
 *   une ligne `^\s{2}(?:-|\+|\*|\d+\.)\s` ; `>` seul → `> ` s'il y en a
 *   un), et une citation prise pour du code perd sa ligne `>` vide (→ `> >`).
 *
 * Champs `widget: code` (`prompt`, `snippet`, `excerpt`) — `code-editor.js`
 * `toCodeBlock` / `parseCodeBlock` autour du transformeur `CODE` :
 * - `final-newline` : le ou les sauts de ligne finaux disparaissent (`|` →
 *   `|-` dans le YAML). Le site rend pareil avec ou sans : `codeWindowText`
 *   retire un saut final, `promptWindowSource` rogne ;
 * - `fence-in-code` : une suite de trois backticks ou plus, où qu'elle soit :
 *   en tête de ligne elle ferme le bloc ; ailleurs l'export Lexical allonge
 *   la clôture (```` ```` ````), que `parseCodeBlock` ne relit pas — la valeur
 *   entière est VIDÉE (relevé au banc, plan 23, T5) ;
 * - `split-multiline`, comme pour les corps.
 *
 * Hors garde, volontairement : les séparateurs `---`, réécrits `***` à
 * l'ouverture, parce que la règle du site est `---` (D126) et que le hook
 * `preSave` de `src/admin/hooks.ts` les rétablit à l'écriture.
 *
 * Le détecteur est une lecture ligne à ligne, pas un parseur Markdown : il
 * vise les formes que le contenu emploie et celles, voisines, qu'un auteur
 * écrirait, et accepte tout ce que Sveltia écrit lui-même. Il ignore le
 * contenu des blocs de code (sauf `split-multiline`), les portées de code en
 * ligne, les caractères échappés et les adresses de liens.
 */

import { BLOCKS, type BlockId } from './blocks/syntax.mjs';

export type CanonicalRule =
  | 'span'
  | 'split-multiline'
  | 'star'
  | 'underscore-strong'
  | 'nesting'
  | 'tilde'
  | 'table'
  | 'table-align'
  | 'fence'
  | 'blank-lines'
  | 'block-gap'
  | 'loose-list'
  | 'list-indent'
  | 'list-number'
  | 'setext'
  | 'final-newline'
  | 'fence-in-code'
  | 'fence-toggle'
  | 'block'
  | 'block-content';

export interface CanonicalIssue {
  /** Numéro de ligne dans la valeur, à partir de 1. */
  line: number;
  rule: CanonicalRule;
  /** La ligne telle qu'écrite. */
  text: string;
}

/**
 * `splitMultilineFormatting` de `@sveltia/ui` 0.77.0 (`text-editor/markdown.js`),
 * motifs recopiés tels quels : appliqués à toute valeur avant la relecture
 * Lexical, blocs de code compris.
 */
const SPLIT_MULTILINE: readonly RegExp[] = [
  /(\s+)_([^_\n]+?)\n([^_\n]+?)_(\s+)/gm,
  /(\s+)\*\*([^*\n]+?)\n([^*\n]+?)\*\*(\s+)/gm,
  /(\s+)~~([^~\n]+?)\n([^~\n]+?)~~(\s+)/gm,
  /(\s+)`([^`\n]+?)\n([^`\n]+?)`(\s+)/gm,
];

const FENCE = /^(\s*)(`{3,}|~{3,})(.*)$/;
const BLANK = /^\s*$/;
const HEADING = /^ {0,3}#{1,6}(?:\s|$)/;
const THEMATIC_BREAK = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const LIST_ITEM = /^(\s*)([*+-]|\d+[.)])(?:\s+|$)/;
const TABLE_ROW = /^\s*\|/;
const TABLE_DIVIDER = /^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/;
const QUOTE = /^\s*>/;
const SETEXT = /^ {0,3}(?:-+|=+)[ \t]*$/;
/** Langue de bloc que le transformeur `CODE` relit sans la déformer. */
const FENCE_INFO = /^[\w-]+(?: \S.*)?$/;
const WORD = /[\p{L}\p{N}]/u;

/** Caractères de masque : même longueur, jamais un délimiteur. */
const MASK_ESCAPE = '\u0001';
const MASK_CODE = '\u0002';
const MASK_URL = '\u0003';

interface Run {
  start: number;
  length: number;
}

function lineOf(value: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (value[i] === '\n') line++;
  return line;
}

function isWordChar(ch: string | undefined): boolean {
  return ch !== undefined && WORD.test(ch);
}

function isSpace(ch: string | undefined): boolean {
  return ch === undefined || /\s/.test(ch);
}

/** Suites d'un même caractère : position et longueur. */
function runs(text: string, char: string): Run[] {
  const found: Run[] = [];
  for (let i = 0; i < text.length; ) {
    if (text[i] !== char) {
      i++;
      continue;
    }
    let n = 0;
    while (text[i + n] === char) n++;
    found.push({ start: i, length: n });
    i += n;
  }
  return found;
}

/**
 * Masque ce qui n'est pas de la mise en forme — caractères échappés, portées
 * de code en ligne complètes, adresses de liens et d'images — en gardant la
 * longueur de la ligne. Une suite de backticks sans fermeture reste telle
 * quelle.
 */
export function maskInline(line: string): string {
  const escaped = line.replace(/\\[\s\S]/g, MASK_ESCAPE.repeat(2));

  let out = '';
  for (let i = 0; i < escaped.length; ) {
    if (escaped[i] !== '`') {
      out += escaped[i];
      i++;
      continue;
    }
    let n = 0;
    while (escaped[i + n] === '`') n++;
    let close = -1;
    for (let j = i + n; j < escaped.length; ) {
      if (escaped[j] !== '`') {
        j++;
        continue;
      }
      let m = 0;
      while (escaped[j + m] === '`') m++;
      if (m === n) {
        close = j;
        break;
      }
      j += m;
    }
    if (close === -1) {
      out += escaped.slice(i, i + n);
      i += n;
    } else {
      out += MASK_CODE.repeat(close + n - i);
      i = close + n;
    }
  }

  return out.replace(/\]\([^)\s]*(?:\s+"[^"]*")?\)/g, (m) => `](${MASK_URL.repeat(m.length - 3)})`);
}

/** Règles en ligne d'un texte de paragraphe, de titre, d'élément ou de citation. */
function inlineIssues(masked: string): CanonicalRule[] {
  const rules = new Set<CanonicalRule>();

  const stars = runs(masked, '*');
  if (stars.filter((r) => r.length === 2).length % 2 === 1) rules.add('span');
  if (stars.some((r) => r.length !== 2)) rules.add('star');

  const tildes = runs(masked, '~');
  if (tildes.filter((r) => r.length === 2).length % 2 === 1) rules.add('span');
  if (tildes.some((r) => r.length !== 2)) rules.add('tilde');

  if (masked.includes('`')) rules.add('span');
  if (runs(masked, '_').some((r) => r.length >= 2)) rules.add('underscore-strong');
  if (/(?:^|[^\p{L}\p{N}_])_\*\*/u.test(masked)) rules.add('nesting');

  return [...rules];
}

/** Règles en ligne d'une cellule : l'italique canonique y est `*x*`. */
function cellIssues(masked: string): CanonicalRule[] {
  const rules: CanonicalRule[] = inlineIssues(masked).filter((r) => r !== 'star');
  const stars = runs(masked, '*');
  const singles = stars.filter((r) => r.length === 1).length;
  if (singles % 2 === 1 || stars.some((r) => r.length > 2)) rules.push('star');
  if (/(?:^|[^\p{L}\p{N}_])_[^_\s]/u.test(masked)) rules.push('star');
  return rules;
}

function splitCells(row: string): string[] {
  return row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|');
}

/** La ligne telle que l'écrit `transformers/table.js`. */
export function canonicalTableRow(row: string, divider: boolean): string {
  const cells = splitCells(row).map((c) => c.trim());
  return `| ${(divider ? cells.map(() => '---') : cells).join(' | ')} |`;
}

interface Scan {
  lines: string[];
  issues: CanonicalIssue[];
  /** Lignes de code (clôtures comprises) selon ce scan ; corps seulement. */
  code?: boolean[];
}

function push(scan: Scan, index: number, rule: CanonicalRule): void {
  if (scan.issues.some((i) => i.line === index + 1 && i.rule === rule)) return;
  scan.issues.push({ line: index + 1, rule, text: scan.lines[index] });
}

function sorted(scan: Scan): CanonicalIssue[] {
  return scan.issues.sort((a, b) => a.line - b.line || a.rule.localeCompare(b.rule));
}

function splitMultilineIssues(value: string, scan: Scan): void {
  for (const pattern of SPLIT_MULTILINE) {
    for (const match of value.matchAll(pattern)) {
      push(scan, lineOf(value, match.index + match[1].length) - 1, 'split-multiline');
    }
  }
}

/** Famille d'un marqueur de liste : deux familles différentes = deux listes. */
function markerFamily(marker: string): string {
  return /^\d/.test(marker) ? `ol${marker.slice(-1)}` : `ul${marker}`;
}

/** Ligne qui commence par `:::` (indentée ou non) : candidate à un bloc de l'éditeur. */
const BLOCK_LINE = /^[ \t]*:{3,}/;

/** Ids des composants, dans l'ordre de `editor_components` (public/admin/config.yml). */
const BLOCK_IDS: readonly BlockId[] = ['encadre', 'terminal', 'carte', 'video'];

interface BlockMatch {
  id: BlockId;
  /** Le texte reconnu, de la ligne d'ouverture à la clôture. */
  text: string;
  props: Record<string, string>;
  /** Index de la dernière ligne du bloc. */
  end: number;
}

/**
 * Le bloc que Sveltia reconnaît à la ligne `start` : motif confronté au reste
 * du document, retenu seulement s'il commence à cette ligne
 * (`handleImportAfterStartMatch`, `components/transformers.js`).
 */
function matchBlock(lines: readonly string[], start: number): BlockMatch | null {
  const rest = lines.slice(start).join('\n');
  for (const id of BLOCK_IDS) {
    const { pattern, fromBlock } = BLOCKS[id];
    const match = rest.match(new RegExp(pattern.source, pattern.flags.replace('g', '')));
    if (match && match.index === 0) {
      return { id, text: match[0], props: fromBlock(match), end: start + match[0].split('\n').length - 1 };
    }
  }
  return null;
}

/**
 * Le bloc tel que son composant Sveltia l'écrit : `toBlock` de syntax.mjs,
 * titre, id et langage élagués (`editorComponents.ts`).
 */
export function editorBlock(id: BlockId, props: Record<string, unknown>): string {
  const trimmed = { ...props };
  for (const key of ['title', 'id', 'lang']) if (typeof trimmed[key] === 'string') trimmed[key] = (trimmed[key] as string).trim();
  return BLOCKS[id].toBlock(trimmed);
}

/** Décale les écarts d'une valeur imbriquée (lignes à partir de `offset`) dans le scan du corps. */
function pushNested(scan: Scan, offset: number, issues: CanonicalIssue[]): void {
  for (const issue of issues) push(scan, offset + issue.line - 1, issue.rule);
}

/**
 * Écarts du bloc qui commence à la ligne `start` ; renvoie l'index de sa
 * dernière ligne (`start` s'il n'est pas reconnu).
 */
function blockIssues(scan: Scan, start: number): number {
  const { lines } = scan;
  const blank = (i: number) => i < 0 || i >= lines.length || BLANK.test(lines[i]);
  const block = matchBlock(lines, start);
  if (!block) {
    push(scan, start, 'block');
    return start;
  }
  // Un terminal est du code de l'ouverture à la clôture (ses autres lignes
  // ne ressemblent ni à un élément de liste ni à `>`).
  if (block.id === 'terminal' && scan.code) for (let k = start; k <= block.end; k++) scan.code[k] = true;
  if (!blank(start - 1)) push(scan, start, 'block-gap');
  if (!blank(block.end + 1)) push(scan, block.end, 'block-gap');
  if (block.text !== editorBlock(block.id, block.props)) {
    push(scan, start, 'block');
    return block.end;
  }
  // Forme canonique : le contenu commence deux lignes sous l'ouverture (ligne vide entre).
  if (block.id === 'encadre' && block.props.content !== '') {
    const content = block.props.content;
    pushNested(scan, start + 2, scanBody(content, false));
    const contentLines = content.split('\n');
    let fence = false;
    contentLines.forEach((line, k) => {
      if (FENCE.test(line)) {
        push(scan, start + 2 + k, 'block-content');
        fence = !fence;
      } else if (!fence && /~~/.test(maskInline(line))) push(scan, start + 2 + k, 'block-content');
    });
  }
  // Code d'un terminal : champ `text`, rendu tel quel (F1, D158) — seules les
  // passes du corps s'y appliquent (`split-multiline`, `fence-toggle`).
  return block.end;
}

/**
 * Les constructions d'un corps Markdown que l'éditeur riche de Sveltia
 * réécrit à l'ouverture. Liste vide = le corps relu est identique (au `---`
 * près, rétabli par le hook `preSave`).
 */
export function findBodyIssues(body: string): CanonicalIssue[] {
  return scanBody(body, true);
}

/**
 * `blocks` : les lignes `:::` sont des blocs de l'éditeur (corps d'article) ;
 * faux pour le contenu d'un encadré, dont l'éditeur n'a aucun composant.
 */
function scanBody(body: string, blocks: boolean): CanonicalIssue[] {
  const lines = body.split('\n');
  const scan: Scan = { lines, issues: [], code: lines.map(() => false) };
  splitMultilineIssues(body, scan);

  const blank = (i: number) => i < 0 || i >= lines.length || BLANK.test(lines[i]);
  let fence: { char: string; length: number } | null = null;
  /** Prochain numéro attendu des listes ordonnées, par indentation. */
  let ordered = new Map<number, number>();
  /** Famille du dernier élément de premier niveau. */
  let family: string | null = null;
  let inList = false;
  let blankRun = 0;
  let paragraph = false;

  if (lines.length > 1 && BLANK.test(lines[0])) push(scan, 0, 'blank-lines');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (fence) {
      scan.code![i] = true;
      const close = /^(\s*)(`+|~+)\s*$/.exec(line);
      if (close && close[2][0] === fence.char && close[2].length >= fence.length) {
        fence = null;
        if (close[1] !== '') push(scan, i, 'fence');
        if (!blank(i + 1)) push(scan, i, 'block-gap');
      }
      continue;
    }

    if (BLANK.test(line)) {
      blankRun++;
      if (blankRun === 2) push(scan, i, 'blank-lines');
      paragraph = false;
      continue;
    }
    const afterBlank = blankRun > 0;
    blankRun = 0;

    if (blocks && BLOCK_LINE.test(line)) {
      i = blockIssues(scan, i);
      inList = false;
      paragraph = false;
      continue;
    }

    const open = FENCE.exec(line);
    if (open && !(open[2][0] === '`' && open[3].includes('`'))) {
      fence = { char: open[2][0], length: open[2].length };
      scan.code![i] = true;
      if (open[2][0] === '~' || open[1] !== '' || !FENCE_INFO.test(open[3])) push(scan, i, 'fence');
      if (!blank(i - 1)) push(scan, i, 'block-gap');
      inList = false;
      paragraph = false;
      continue;
    }

    if (THEMATIC_BREAK.test(line)) {
      if (paragraph && SETEXT.test(line)) push(scan, i, 'setext');
      inList = false;
      paragraph = false;
      continue;
    }

    if (paragraph && /^ {0,3}=+[ \t]*$/.test(line)) push(scan, i, 'setext');

    if (HEADING.test(line)) {
      if (!blank(i - 1) || !blank(i + 1)) push(scan, i, 'block-gap');
      for (const rule of inlineIssues(maskInline(line))) push(scan, i, rule);
      inList = false;
      paragraph = false;
      continue;
    }

    if (TABLE_ROW.test(line)) {
      const first = !TABLE_ROW.test(lines[i - 1] ?? '');
      const last = !TABLE_ROW.test(lines[i + 1] ?? '');
      if ((first && !blank(i - 1)) || (last && !blank(i + 1))) push(scan, i, 'block-gap');
      const divider = TABLE_DIVIDER.test(line);
      if (divider && line.includes(':')) push(scan, i, 'table-align');
      if (line.includes('\\|') || line !== canonicalTableRow(line, divider)) push(scan, i, 'table');
      let start = i;
      while (start > 0 && TABLE_ROW.test(lines[start - 1])) start--;
      if (splitCells(line).length !== splitCells(lines[start]).length) push(scan, i, 'table');
      if (!divider) for (const cell of splitCells(line)) for (const rule of cellIssues(maskInline(cell))) push(scan, i, rule);
      inList = false;
      paragraph = false;
      continue;
    }

    const item = LIST_ITEM.exec(line);
    if (item) {
      const indent = item[1].replace(/\t/g, '    ').length;
      const itemFamily = markerFamily(item[2]);
      // Après une ligne vide, un élément de premier niveau d'une autre famille ouvre une autre liste.
      const sameList = inList && !(afterBlank && indent === 0 && itemFamily !== family);
      if (paragraph && !inList) push(scan, i, 'block-gap');
      if (sameList && afterBlank) push(scan, i, 'loose-list');
      if (indent % 4 !== 0) push(scan, i, 'list-indent');
      if (!sameList) ordered = new Map();
      for (const key of [...ordered.keys()]) if (key > indent) ordered.delete(key);
      const number = /^\d+/.exec(item[2]);
      if (number) {
        const n = Number(number[0]);
        const expected = ordered.get(indent);
        if (expected !== undefined && n !== expected) push(scan, i, 'list-number');
        ordered.set(indent, n + 1);
      } else ordered.delete(indent);
      if (indent === 0) family = itemFamily;
      for (const rule of inlineIssues(maskInline(line.slice(item[0].length)))) push(scan, i, rule);
      inList = true;
      paragraph = false;
      continue;
    }

    if (inList && /^\s+\S/.test(line)) {
      // Suite d'un élément de liste.
      if (afterBlank) push(scan, i, 'loose-list');
      for (const rule of inlineIssues(maskInline(line))) push(scan, i, rule);
      continue;
    }

    if (QUOTE.test(line)) {
      if (!blank(i + 1) && !QUOTE.test(lines[i + 1])) push(scan, i, 'block-gap');
      for (const rule of inlineIssues(maskInline(line.replace(/^\s*>\s?/, '')))) push(scan, i, rule);
      inList = false;
      paragraph = false;
      continue;
    }

    // Paragraphe (ou suite paresseuse d'un élément de liste, sans ligne vide).
    if (afterBlank) inList = false;
    for (const rule of inlineIssues(maskInline(line))) push(scan, i, rule);
    paragraph = true;
  }

  fenceToggleIssues(body, scan);
  return sorted(scan);
}

/**
 * Lignes que `mapLinesOutsideCodeBlocks` (@sveltia/ui 0.77.0, `markdown.js`)
 * tient pour du code : bascule à chaque ligne `^[ \t]*(`{3,}|~{3,})`, sans
 * longueur ni clôture (la ligne de bascule est laissée telle quelle).
 */
function sveltiaCodeLines(lines: readonly string[]): boolean[] {
  let inCode = false;
  return lines.map((line) => {
    if (/^[ \t]*(`{3,}|~{3,})/.test(line)) {
      inCode = !inCode;
      return true;
    }
    return inCode;
  });
}

/**
 * `fence-toggle` : lignes que `increaseListIndentation` /
 * `padBlankBlockquoteLines` réécrivent (ou sautent) parce que leur bascule
 * de code diffère des blocs de code réels (`scan.code`). Conditions et
 * motifs recopiés de `markdown.js`.
 */
function fenceToggleIssues(body: string, scan: Scan): void {
  const { lines, code } = scan;
  if (!code) return;
  const lists = /^\s{2}(?:-|\+|\*|\d+\.)\s/m.test(body);
  const quotes = /^>$/m.test(body);
  const sveltia = sveltiaCodeLines(lines);
  lines.forEach((line, i) => {
    if (code[i] === sveltia[i]) return;
    // Code pris pour du texte : retrait d'élément doublé ; `> ` rogné en `>`
    // par `trimBlankBlockquoteLines` à l'export (même bascule) — un `>` seul,
    // complété à l'import puis rogné à l'export, revient tel quel. Texte pris
    // pour du code : la ligne `>` vide n'est pas complétée et ressort `> >`
    // (un élément de liste non doublé ressort, lui, inchangé). Relevé sur la
    // réplique (`roundTrip.test.ts`).
    const rewritten = code[i]
      ? line === '> ' || (lists && /^(\s+)(-|\+|\*|\d+\.)/.test(line))
      : quotes && line === '>';
    if (rewritten) push(scan, i, 'fence-toggle');
  });
}

/**
 * Les constructions d'une valeur de champ `code` (`output_code_only`) que
 * l'éditeur de code de Sveltia réécrit à l'ouverture.
 */
export function findCodeFieldIssues(value: string): CanonicalIssue[] {
  const lines = value.split('\n');
  const scan: Scan = { lines, issues: [] };
  splitMultilineIssues(value, scan);
  lines.forEach((line, i) => {
    if (/`{3,}/.test(line)) push(scan, i, 'fence-in-code');
  });
  if (value.endsWith('\n')) push(scan, lines.length - 1, 'final-newline');
  return sorted(scan);
}

/** Retire le ou les sauts de ligne finaux d'une valeur de champ `code`. */
export function normalizeCodeField(value: string): string {
  return value.replace(/\n+$/, '');
}

/** Position du `**` resté ouvert en fin de ligne, ou -1. */
function openStrongIndex(line: string): number {
  const doubles = runs(maskInline(line), '*').filter((r) => r.length === 2);
  return doubles.length % 2 === 1 ? doubles[doubles.length - 1].start : -1;
}

/** `*x*` → `_x_` quand les deux bords sont hors d'un mot (sinon le rendu changerait). */
function rewriteStars(line: string): string {
  const masked = maskInline(line);
  const item = LIST_ITEM.exec(line);
  const marker = item && item[2] === '*' ? item[1].length : -1;
  const singles = runs(masked, '*').filter((r) => r.length === 1 && r.start !== marker);
  const out = line.split('');
  for (let k = 0; k + 1 < singles.length; k += 2) {
    const a = singles[k].start;
    const b = singles[k + 1].start;
    const opens = !isWordChar(masked[a - 1]) && !isSpace(masked[a + 1]);
    const closes = !isSpace(masked[b - 1]) && !isWordChar(masked[b + 1]);
    if (opens && closes) {
      out[a] = '_';
      out[b] = '_';
    }
  }
  return out.join('');
}

/** `~` isolé → `\~` (hors `~~`, code et adresses). */
function escapeTildes(line: string): string {
  const singles = new Set(
    runs(maskInline(line), '~')
      .filter((r) => r.length === 1)
      .map((r) => r.start),
  );
  if (singles.size === 0) return line;
  // Index en unités UTF-16, comme `split('')`.
  return line
    .split('')
    .map((ch, i) => (singles.has(i) ? `\\${ch}` : ch))
    .join('');
}

/**
 * Remet un corps dans la forme canonique pour les règles purement
 * syntaxiques dont le rendu HTML du site ne change pas (au placement d'un
 * saut de ligne près) : paire `**` ouverte sur deux lignes (le saut passe
 * devant la paire), `*x*` → `_x_` hors d'un mot, `~` → `\~`, tableaux, bloc
 * sans langue → `plaintext`, lignes vides multiples, bloc de l'éditeur dans
 * la forme de `toBlock` (plan 23). Laisse tel quel ce qui
 * changerait le rendu — liste lâche, `*` dans un mot, alignement de tableau —
 * et `---` (D126).
 */
export function normalizeBody(body: string): string {
  const lines = body.split('\n');
  const out: string[] = [];
  let fence: { char: string; length: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (fence) {
      const close = /^(\s*)(`+|~+)\s*$/.exec(line);
      if (close && close[2][0] === fence.char && close[2].length >= fence.length) fence = null;
      out.push(line);
      continue;
    }

    if (BLANK.test(line)) {
      if (out.length === 0 || !BLANK.test(out[out.length - 1])) out.push(line);
      continue;
    }

    // Bloc de l'éditeur reconnu : réécrit par `toBlock` (contenu d'encadré
    // normalisé) — sans élaguer titre ni id, que le build refuse d'ailleurs.
    // Une ligne `:::` non reconnue reste telle quelle.
    if (BLOCK_LINE.test(line)) {
      const block = matchBlock(lines, i);
      if (block) {
        const props =
          block.id === 'encadre' ? { ...block.props, content: normalizeBody(block.props.content) } : block.props;
        out.push(BLOCKS[block.id].toBlock(props));
        i = block.end;
      } else out.push(line);
      continue;
    }

    const open = FENCE.exec(line);
    if (open && !(open[2][0] === '`' && open[3].includes('`'))) {
      fence = { char: open[2][0], length: open[2].length };
      if (open[2][0] === '`' && open[3].trim() === '') line = `${open[1]}${open[2]}plaintext`;
      out.push(line);
      continue;
    }

    if (THEMATIC_BREAK.test(line)) {
      out.push(line);
      continue;
    }

    if (TABLE_ROW.test(line)) {
      const divider = TABLE_DIVIDER.test(line);
      if (!(divider && line.includes(':')) && !line.includes('\\|')) line = canonicalTableRow(line, divider);
      out.push(line);
      continue;
    }

    line = escapeTildes(rewriteStars(line));

    // `**` ouvert en fin de ligne, fermé sur la suivante : la ligne suivante
    // reprend la paire entière, la ligne courante s'arrête devant.
    const next = lines[i + 1];
    const at = openStrongIndex(line);
    if (at !== -1 && next !== undefined && !BLANK.test(next)) {
      const head = line.slice(0, at).replace(/\s+$/, '');
      if (head.trim() !== '' && !/^\s*(?:[*+-]|\d+[.)])$/.test(head)) {
        const indent = /^\s*/.exec(next)![0];
        out.push(head);
        lines[i + 1] = `${indent}${line.slice(at)} ${next.slice(indent.length)}`;
        continue;
      }
    }
    out.push(line);
  }

  return out.join('\n');
}
