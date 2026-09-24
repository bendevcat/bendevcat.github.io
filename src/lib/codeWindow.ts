/**
 * Lignes de la fenêtre de code de la fiche projet (plan 15, inventaire §4) :
 * gouttière numérotée + coloration YAML minimale.
 *
 * AUCUN import d'`astro:content` : fonctions pures, testables sans Astro. Le
 * composant n'a qu'à rendre les segments ; il ne décide d'aucune couleur.
 *
 * Coloration volontairement étroite (Design rules du plan 15) : en YAML, la
 * `clé:` prend `windowKey`, la valeur qui la suit sur la même ligne
 * `windowValue` ; tout le reste — indentation, tirets de liste, éléments de
 * liste nus, commentaires, lignes d'un scalaire bloc (`run: |`) — reste
 * `windowInk`. Hors `.yml` / `.yaml`, rien n'est coloré.
 */

export type CodeSegmentKind = 'key' | 'value' | 'plain';

export interface CodeSegment {
  kind: CodeSegmentKind;
  text: string;
}

export interface CodeLine {
  /** Numéro affiché dans la gouttière, à partir de 1. */
  number: number;
  /** Segments dans l'ordre ; vide pour une ligne vide. Leur concaténation = la ligne. */
  segments: CodeSegment[];
}

/** `.yml` / `.yaml` en fin de nom, sans tenir compte de la casse. */
export function isYamlFile(file: string | undefined): boolean {
  return /\.ya?ml$/i.test(file ?? '');
}

/**
 * Le texte que montre (et copie) la fenêtre : l'extrait moins UN saut de
 * ligne final — celui que laisse un scalaire bloc YAML ou un fichier bien
 * terminé. Un second saut final reste : c'est une vraie ligne vide.
 */
export function codeWindowText(snippet: string): string {
  return snippet.endsWith('\n') ? snippet.slice(0, -1) : snippet;
}

/**
 * Préfixe (indentation + tirets de liste), clé (nue ou entre guillemets), `:`
 * suivi d'un blanc ou de la fin de ligne, puis le reste.
 */
const KEY_LINE = /^(\s*(?:-\s+)*)("[^"]*"|'[^']*'|[^\s#"'{}[\],&*!|>%@`-][^:#"]*?):(?=\s|$)(.*)$/;

/** Indicateur de scalaire bloc : `|`, `>`, avec chomping / indentation éventuels. */
const BLOCK_SCALAR = /^[|>][-+0-9]*$/;

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

/** Retire les segments vides et fusionne les voisins de même genre. */
function compact(segments: CodeSegment[]): CodeSegment[] {
  const out: CodeSegment[] = [];
  for (const segment of segments) {
    if (segment.text === '') continue;
    const last = out[out.length - 1];
    if (last && last.kind === segment.kind) last.text += segment.text;
    else out.push({ ...segment });
  }
  return out;
}

/** Découpe « blancs + valeur + commentaire éventuel + blancs de fin ». */
function valueSegments(rest: string): CodeSegment[] {
  const lead = rest.slice(0, rest.length - rest.trimStart().length);
  let value = rest.trim();
  let comment = '';
  if (value.startsWith('#')) {
    // `clé: # note` : pas de valeur, un commentaire.
    comment = value;
    value = '';
  } else if (!value.startsWith('"') && !value.startsWith("'")) {
    const hash = value.search(/\s#/);
    if (hash >= 0) {
      comment = value.slice(hash);
      value = value.slice(0, hash);
    }
  }
  const trail = rest.slice(lead.length + value.length + comment.length);
  return [
    { kind: 'plain', text: lead },
    { kind: 'value', text: value },
    { kind: 'plain', text: comment + trail },
  ];
}

/**
 * Une entrée par ligne de `codeWindowText(snippet)`, lignes vides comprises,
 * numérotées à partir de 1.
 */
export function codeWindowLines(snippet: string, file?: string): CodeLine[] {
  const yaml = isYamlFile(file);
  const rawLines = codeWindowText(snippet).split('\n');
  /** Colonne de la clé qui a ouvert un scalaire bloc ; `null` hors bloc. */
  let blockKeyColumn: number | null = null;

  return rawLines.map((line, index) => {
    const number = index + 1;
    const plain = (): CodeLine => ({ number, segments: compact([{ kind: 'plain', text: line }]) });
    if (!yaml) return plain();

    if (blockKeyColumn !== null) {
      if (line.trim() === '' || indentOf(line) > blockKeyColumn) return plain();
      blockKeyColumn = null;
    }

    const match = KEY_LINE.exec(line);
    if (!match || line.trimStart().startsWith('#')) return plain();
    const [, prefix, key, rest] = match;
    const segments = compact([
      { kind: 'plain', text: prefix },
      { kind: 'key', text: `${key}:` },
      ...valueSegments(rest),
    ]);
    const value = segments.find((segment) => segment.kind === 'value');
    if (value && BLOCK_SCALAR.test(value.text)) blockKeyColumn = prefix.length;
    return { number, segments };
  });
}
