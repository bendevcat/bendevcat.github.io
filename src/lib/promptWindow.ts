/**
 * Texte et segments de la fenêtre du prompt (plan 16, inventaire §6).
 *
 * AUCUN import d'`astro:content` : ce module est chargé par la page côté
 * serveur, par les tests unitaires ET par le script du navigateur
 * (src/scripts/prompt-window.ts, qui n'utilise que `varDisplay`).
 *
 * Règles (Design rules du plan 16) :
 * - le texte de la fenêtre est celui que mesure la carte (`measurePromptText`,
 *   D94) : le `prompt` d'une fiche qui en a un, sinon le corps ; rogné ;
 * - `{name}` n'est une variable que si `name` est déclaré dans `variables` —
 *   toute autre accolade reste littérale, et un guide n'a jamais de variable ;
 * - un segment de variable affiche la valeur, ou `{name}` quand elle est vide
 *   (ou absente : variable sans défaut) ;
 * - une ligne qui commence par 2 à 6 `#` puis une espace est un titre.
 */
import { shouldRenderPromptBlock, type PromptFormat } from './promptView';

export interface PromptVariable {
  name: string;
  hint?: string;
  default?: string;
}

export interface PromptSegment {
  text: string;
  /** Nom de la variable dont ce segment affiche la valeur ; absent = texte littéral. */
  var?: string;
}

export interface PromptWindowLine {
  /** Ligne commençant par 2 à 6 `#` puis une espace (texte aux défauts). */
  heading: boolean;
  /** Au moins un segment, éventuellement vide : une ligne vide garde sa place. */
  segments: PromptSegment[];
}

export interface PromptWindowSource {
  /** Le texte avant rendu des variables, rogné. */
  template: string;
  /** Variables qui s'appliquent au texte ; `[]` quand la fenêtre montre le corps. */
  variables: PromptVariable[];
  /** `true` : la fenêtre montre le champ `prompt` ; `false` : le corps. */
  showsPrompt: boolean;
}

/** `{nom}` sans accolade ni saut de ligne à l'intérieur. */
const PLACEHOLDER = /\{([^{}\n]+)\}/g;

const HEADING = /^#{2,6} /;

/**
 * Ce qu'affiche un segment : la valeur telle que saisie, ou `{name}` quand
 * elle est vide ou absente. Une valeur faite d'espaces est gardée : c'est ce
 * que l'utilisateur a tapé.
 */
export function varDisplay(name: string, value: string | undefined): string {
  return value === undefined || value === '' ? `{${name}}` : value;
}

/** Première déclaration d'un nom gagnante ; un nom vide n'est pas une variable. */
function declaredMap(variables: readonly PromptVariable[] | undefined): Map<string, PromptVariable> {
  const map = new Map<string, PromptVariable>();
  for (const variable of variables ?? []) {
    if (variable.name !== '' && !map.has(variable.name)) map.set(variable.name, variable);
  }
  return map;
}

/** Découpe une ligne en segments littéraux / variables (valeurs = défauts ou `values`). */
function lineSegments(
  line: string,
  declared: Map<string, PromptVariable>,
  values: Readonly<Record<string, string>> | undefined,
): PromptSegment[] {
  const segments: PromptSegment[] = [];
  let literal = '';
  let last = 0;
  for (const match of line.matchAll(PLACEHOLDER)) {
    const name = match[1];
    const variable = declared.get(name);
    if (!variable) continue;
    literal += line.slice(last, match.index);
    if (literal !== '') segments.push({ text: literal });
    literal = '';
    const value = values && Object.hasOwn(values, name) ? values[name] : variable.default;
    segments.push({ text: varDisplay(name, value), var: name });
    last = match.index! + match[0].length;
  }
  literal += line.slice(last);
  if (literal !== '' || segments.length === 0) segments.push({ text: literal });
  return segments;
}

/**
 * Le texte avec chaque variable déclarée remplacée par `values[name]` s'il est
 * fourni, sinon par son défaut — `{name}` quand la valeur est vide. Les valeurs
 * sont insérées telles quelles (jamais ré-analysées).
 */
export function renderPromptText(
  template: string,
  variables: readonly PromptVariable[] | undefined,
  values?: Readonly<Record<string, string>>,
): string {
  const declared = declaredMap(variables);
  return template
    .split('\n')
    .map((line) =>
      lineSegments(line, declared, values)
        .map((segment) => segment.text)
        .join(''),
    )
    .join('\n');
}

/** Les lignes de la fenêtre, segmentées, aux valeurs par défaut. */
export function promptWindowLines(
  template: string,
  variables?: readonly PromptVariable[],
): PromptWindowLine[] {
  const declared = declaredMap(variables);
  return template.split('\n').map((line) => {
    const segments = lineSegments(line, declared, undefined);
    const text = segments.map((segment) => segment.text).join('');
    return { heading: HEADING.test(text), segments };
  });
}

/** Le texte que des lignes affichent — garde de rendu : doit valoir le texte mesuré. */
export function rebuildWindowText(lines: readonly PromptWindowLine[]): string {
  return lines.map((line) => line.segments.map((segment) => segment.text).join('')).join('\n');
}

/**
 * Ce que la fenêtre montre (règle de la carte, D94 / shouldRenderPromptBlock) :
 * le `prompt` d'une fiche qui en a un, avec ses variables ; sinon le corps,
 * sans variable. Rogné, pour que les lignes vides de bord ne comptent pas.
 */
export function promptWindowSource(
  data: { format: PromptFormat; prompt?: string; variables?: readonly PromptVariable[] },
  body: string | undefined,
): PromptWindowSource {
  if (shouldRenderPromptBlock(data.format, data.prompt)) {
    return { template: data.prompt!.trim(), variables: [...(data.variables ?? [])], showsPrompt: true };
  }
  return { template: (body ?? '').trim(), variables: [], showsPrompt: false };
}
