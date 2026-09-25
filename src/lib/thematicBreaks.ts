/**
 * Séparateurs thématiques (plan 19, R11–R13). La forme admise dans le contenu
 * est `---`, seule sur sa ligne, sans indentation. Toute autre forme CommonMark
 * (`- - -`, `***`, `___`, `* * *`, `-----`, indentée de 1 à 3 espaces…) est
 * signalée par `findThematicBreaks` et réécrite par `normalizeThematicBreaks`.
 *
 * Portée volontairement limitée au niveau bloc racine : le frontmatter
 * (fichier complet seulement), les blocs de code clôturés ``` / ~~~ et le code
 * indenté (4 espaces ou plus) sont ignorés. Une suite de `-` sans espace qui
 * suit directement une ligne de texte est un soulignement de titre setext, pas
 * un séparateur.
 */

export interface ThematicBreak {
  /** Numéro de ligne, à partir de 1. */
  line: number;
  /** La ligne telle qu'écrite (sans `\r`). */
  text: string;
}

const RULE = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const SETEXT_DASHES = /^ {0,3}-+[ \t]*$/;
const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const BLANK = /^[ \t]*$/;
const ATX_HEADING = /^ {0,3}#{1,6}(?:[ \t]|$)/;
const CANONICAL = '---';

interface RuleLine {
  index: number;
  text: string;
  /** La ligne précédente est du texte de paragraphe. */
  afterText: boolean;
}

function splitLines(markdown: string): string[] {
  return markdown.split('\n').map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l));
}

/** Parcourt les lignes et renvoie chaque séparateur thématique (y compris `---`). */
function scanRules(lines: string[], skipFrontmatter: boolean): RuleLine[] {
  const rules: RuleLine[] = [];
  let i = 0;

  if (skipFrontmatter && lines.length > 0 && /^---[ \t]*$/.test(lines[0])) {
    const end = lines.findIndex((l, n) => n > 0 && /^(?:---|\.\.\.)[ \t]*$/.test(l));
    if (end !== -1) i = end + 1;
  }

  let fence: { char: string; length: number } | null = null;
  let afterText = false;

  for (; i < lines.length; i++) {
    const line = lines[i];

    if (fence) {
      const close = /^ {0,3}(`+|~+)[ \t]*$/.exec(line);
      if (close && close[1][0] === fence.char && close[1].length >= fence.length) fence = null;
      afterText = false;
      continue;
    }

    const open = FENCE_OPEN.exec(line);
    if (open && !(open[1][0] === '`' && open[2].includes('`'))) {
      fence = { char: open[1][0], length: open[1].length };
      afterText = false;
      continue;
    }

    if (RULE.test(line)) {
      if (!(afterText && SETEXT_DASHES.test(line))) {
        rules.push({ index: i, text: line, afterText });
      }
      afterText = false;
      continue;
    }

    if (BLANK.test(line)) {
      afterText = false;
      continue;
    }

    // Code indenté : seulement s'il ne prolonge pas un paragraphe.
    if (!afterText && /^(?: {4}|\t)/.test(line)) continue;

    afterText = !ATX_HEADING.test(line);
  }

  return rules;
}

/**
 * Tout séparateur thématique autre que `---` d'un fichier Markdown complet
 * (frontmatter ignoré).
 */
export function findThematicBreaks(markdown: string): ThematicBreak[] {
  return scanRules(splitLines(markdown), true)
    .filter((r) => r.text !== CANONICAL)
    .map((r) => ({ line: r.index + 1, text: r.text }));
}

/**
 * Réécrit en `---` tout séparateur d'un corps Markdown (sans frontmatter), et
 * insère une ligne vide avant lui s'il suit du texte — sans quoi `---`
 * deviendrait un soulignement de titre setext. Renvoie la chaîne d'origine,
 * inchangée, quand il n'y a rien à réécrire.
 */
export function normalizeThematicBreaks(body: string): string {
  const raw = body.split('\n');
  const rules = scanRules(splitLines(body), false).filter((r) => r.text !== CANONICAL);
  if (rules.length === 0) return body;

  const targets = new Map(rules.map((r) => [r.index, r]));
  const out: string[] = [];
  raw.forEach((line, index) => {
    const rule = targets.get(index);
    if (!rule) {
      out.push(line);
      return;
    }
    const eol = line.endsWith('\r') ? '\r' : '';
    if (rule.afterText) out.push(eol);
    out.push(CANONICAL + eol);
  });
  return out.join('\n');
}
