/**
 * Explorateur de fichiers de la fiche skill (plan 17, inventaire §8) : arbre,
 * sélection par défaut, lignes colorées de l'aperçu.
 *
 * AUCUN import d'`astro:content` : fonctions pures, testables sans Astro. Le
 * composant rend les rangées et les segments ; il ne décide d'aucun ordre ni
 * d'aucune couleur.
 *
 * Arbre (Design rules du plan 17) : à chaque niveau, les dossiers avant les
 * fichiers, chacun trié par point de code (pas de `localeCompare`) ; un
 * dossier qui ne contient qu'une entrée est fusionné avec elle — un seul
 * fichier donne une rangée de fichier `hooks/hooks.json`, un seul dossier
 * prolonge la chaîne `a/b/`.
 */

export interface TreeRow {
  kind: 'dir' | 'file';
  /** Texte de la rangée, sans marqueur : `commands/`, `init.md`, `hooks/hooks.json`. */
  label: string;
  /** Chemin complet depuis la racine du plugin (sans `/` final pour un dossier). */
  path: string;
  /** Profondeur d'indentation, 0 à la racine. */
  depth: number;
}

interface DirNode {
  dirs: Map<string, DirNode>;
  files: string[];
}

function byCodePoint(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function buildTree(paths: readonly string[]): DirNode {
  const root: DirNode = { dirs: new Map(), files: [] };
  for (const path of paths) {
    const parts = path.split('/').filter((part) => part !== '');
    if (parts.length === 0) continue;
    let node = root;
    for (const part of parts.slice(0, -1)) {
      let next = node.dirs.get(part);
      if (!next) {
        next = { dirs: new Map(), files: [] };
        node.dirs.set(part, next);
      }
      node = next;
    }
    const file = parts[parts.length - 1];
    if (!node.files.includes(file)) node.files.push(file);
  }
  return root;
}

function walk(node: DirNode, prefix: string, depth: number, rows: TreeRow[]): void {
  for (const name of [...node.dirs.keys()].sort(byCodePoint)) {
    let dir = node.dirs.get(name)!;
    let label = name;
    let path = prefix + name;
    // Chaîne de dossiers à enfant unique : une seule rangée.
    while (dir.files.length === 0 && dir.dirs.size === 1) {
      const [childName, child] = [...dir.dirs.entries()][0];
      label += `/${childName}`;
      path += `/${childName}`;
      dir = child;
    }
    // Dossier à fichier unique : fusionné dans la rangée du fichier.
    if (dir.dirs.size === 0 && dir.files.length === 1) {
      const file = dir.files[0];
      rows.push({ kind: 'file', label: `${label}/${file}`, path: `${path}/${file}`, depth });
      continue;
    }
    rows.push({ kind: 'dir', label: `${label}/`, path, depth });
    walk(dir, `${path}/`, depth + 1, rows);
  }
  for (const file of [...node.files].sort(byCodePoint)) {
    rows.push({ kind: 'file', label: file, path: prefix + file, depth });
  }
}

/** Rangées de l'arbre, dans l'ordre d'affichage. */
export function fileTree(paths: readonly string[]): TreeRow[] {
  const rows: TreeRow[] = [];
  walk(buildTree(paths), '', 0, rows);
  return rows;
}

/**
 * Fichier sélectionné au chargement : `skills/<name>/SKILL.md` s'il existe,
 * sinon le premier `SKILL.md` dans l'ordre de l'arbre, sinon le premier
 * fichier ; `null` sans fichier.
 */
export function defaultFile(paths: readonly string[], name: string | undefined): string | null {
  const files = fileTree(paths)
    .filter((row) => row.kind === 'file')
    .map((row) => row.path);
  const own = name ? `skills/${name}/SKILL.md` : null;
  if (own && files.includes(own)) return own;
  return files.find((path) => path === 'SKILL.md' || path.endsWith('/SKILL.md')) ?? files[0] ?? null;
}

export type ExplorerTone = 'heading' | 'rule' | 'key' | 'value' | 'plain';

export interface ExplorerSegment {
  kind: ExplorerTone;
  text: string;
}

export interface ExplorerLine {
  /** Vide pour une ligne vide. Leur concaténation = la ligne de l'extrait. */
  segments: ExplorerSegment[];
}

/** `#` à `######` puis une espace. */
const HEADING = /^#{1,6} /;
/** Filet de front matter (ou thématique) : `---` seul, blancs de fin tolérés (`\r`). */
const RULE = /^---\s*$/;
/** Clé YAML du front matter : indentation, clé nue, `:` suivi d'un blanc ou de la fin. */
const YAML_KEY = /^(\s*)([A-Za-z_][\w.-]*:)(?=\s|$)(.*)$/s;
/** Clé JSON : indentation, `"clé"`, blancs, `:`. */
const JSON_KEY = /^(\s*)("(?:[^"\\]|\\.)*"\s*:)(.*)$/s;

function compact(segments: ExplorerSegment[]): ExplorerSegment[] {
  return segments.filter((segment) => segment.text !== '');
}

function keySegments(match: RegExpExecArray): ExplorerSegment[] {
  const [, lead, key, rest] = match;
  return compact([
    { kind: 'plain', text: lead },
    { kind: 'key', text: key },
    { kind: 'value', text: rest },
  ]);
}

/**
 * Lignes colorées d'un extrait (`explorerLines`, Design rules du plan 17) :
 * - une ligne `---` → `rule` (windowDim) ;
 * - dans le front matter d'un `.md` (ouvert par un `---` en première ligne,
 *   jusqu'au `---` suivant ou la fin de l'extrait) ou dans un `.json`, une
 *   clé → `key` (windowKey), le reste de sa ligne → `value` (windowValue) ;
 * - hors front matter, `#`–`######` + espace → `heading` (windowKey 600) —
 *   dans le front matter, un `# …` est un commentaire YAML, laissé neutre ;
 * - tout le reste → `plain` (windowInk).
 * Garde de rendu : `rebuildExcerpt(explorerLines(x, p)) === x`.
 */
export function explorerLines(excerpt: string, path: string): ExplorerLine[] {
  const isMarkdown = /\.md$/i.test(path);
  const isJson = /\.json$/i.test(path);
  const lines = excerpt.split('\n');
  let inFrontMatter = false;

  return lines.map((line, index) => {
    const one = (kind: ExplorerTone): ExplorerLine => ({ segments: compact([{ kind, text: line }]) });

    if (RULE.test(line)) {
      if (isMarkdown && index === 0) inFrontMatter = true;
      else if (inFrontMatter) inFrontMatter = false;
      return one('rule');
    }
    if (inFrontMatter) {
      const match = YAML_KEY.exec(line);
      return match ? { segments: keySegments(match) } : one('plain');
    }
    if (isJson) {
      const match = JSON_KEY.exec(line);
      return match ? { segments: keySegments(match) } : one('plain');
    }
    if (HEADING.test(line)) return one('heading');
    return one('plain');
  });
}

/** Le texte que des lignes affichent — garde de rendu : doit valoir l'extrait. */
export function rebuildExcerpt(lines: readonly ExplorerLine[]): string {
  return lines.map((line) => line.segments.map((segment) => segment.text).join('')).join('\n');
}

/**
 * Barre de l'aperçu, après le chemin : `l. 1–K / N` quand l'extrait montre K
 * des N lignes du fichier, `N l.` quand il les montre toutes. Un saut de
 * ligne final de l'extrait ne compte pas pour une ligne.
 */
export function previewRange(excerpt: string, lines: number): string {
  const text = excerpt.endsWith('\n') ? excerpt.slice(0, -1) : excerpt;
  const shown = text === '' ? 0 : text.split('\n').length;
  return shown >= lines ? `${lines} l.` : `l. 1–${shown} / ${lines}`;
}
