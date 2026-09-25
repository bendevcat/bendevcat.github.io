import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';

/**
 * Règle de contenu (brief, D65/D66) appliquée aux skills du plan 17 : les
 * champs de la fiche (déclencheurs, journal des versions, points forts,
 * fichiers du plugin) ne sont écrits que depuis le plugin réel (D115, D116).
 * Ce test lit les fichiers réels de `src/content/skills/` — pas une copie.
 *
 * Il tourne en CI, où les sources des plugins n'existent pas : il ne vérifie
 * donc que les invariants internes. La comparaison mot pour mot avec les
 * sources est `node scripts/check-skill-sources.mjs` (local).
 *
 * Plan 19, F3 (D131) : l'auteur possède désormais le contenu et le modifie ou
 * le supprime depuis le CMS ; la CI lance `npm test` avant de déployer. Ce test
 * ne garde que des règles **génériques**, vraies pour toute fiche, et plus
 * aucune valeur figée d'une fiche nommée (`superpowers` en 6.4.1…). Chaque
 * règle est une fonction pure qui liste les défauts ; un test sur des fiches
 * fabriquées prouve qu'elle rougit encore sur un défaut injecté, quel que soit
 * le contenu réel.
 */
const SKILLS_DIR = new URL('../content/skills/', import.meta.url);

/**
 * Adresse e-mail (D116) : jamais dans un extrait. Même motif que
 * `scripts/check-skill-sources.mjs`. `superpowers@claude-plugins-official`
 * (sans point après l'arobase) n'en est pas une.
 */
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;

/** Plafond d'un extrait (Sources du plan 17). */
const MAX_EXCERPT_LINES = 16;

interface SkillFile {
  id: string;
  data: Record<string, any>;
  body: string;
}

function readSkill(id: string): SkillFile {
  const raw = readFileSync(new URL(`${id}/index.md`, SKILLS_DIR), 'utf8');
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw);
  if (!match) throw new Error(`${id}: frontmatter introuvable`);
  return { id, data: parse(match[1]), body: match[2] };
}

/** Toutes les fiches présentes sur le disque — zéro est permis (D131). */
function allSkills(): SkillFile[] {
  return readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(new URL(`${d.name}/index.md`, SKILLS_DIR)))
    .map((d) => readSkill(d.name));
}

/** `x.y.z` → tuple numérique, pour l'ordre du journal. */
function versionParts(version: string): number[] {
  return String(version).replace(/^v/i, '').split('.').map((part) => Number.parseInt(part, 10));
}

function compareVersions(a: string, b: string): number {
  const pa = versionParts(a);
  const pb = versionParts(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** `2026-09-18` (chaîne YAML 1.2) ou Date → horodatage UTC. */
function time(date: unknown): number {
  return new Date(date as string).getTime();
}


/** D66 : le corps littéral `No content` (reliquat d'import) n'est jamais publié. */
function bodyDefects(s: SkillFile): string[] {
  return s.body.includes('No content') ? [`${s.id}: corps « No content »`] : [];
}

/**
 * Journal des versions : chaque ligne a une version, une date lisible et un
 * texte ; le plus récent d'abord (version et date) ; pas de doublon ; la
 * version déclarée de la fiche y figure. Une fiche sans journal n'a rien à
 * vérifier.
 */
function changelogDefects(s: SkillFile): string[] {
  const changelog: { version: string; date: unknown; text: string }[] = s.data.changelog ?? [];
  if (changelog.length === 0) return [];
  const defects: string[] = [];
  for (const row of changelog) {
    if (String(row.version ?? '').trim() === '') defects.push(`${s.id}: version vide`);
    if (Number.isNaN(time(row.date))) defects.push(`${s.id}: date illisible pour ${row.version}`);
    if (String(row.text ?? '').trim() === '') defects.push(`${s.id}: texte vide pour ${row.version}`);
  }
  for (let i = 1; i < changelog.length; i += 1) {
    const newer = changelog[i - 1];
    const older = changelog[i];
    if (compareVersions(newer.version, older.version) <= 0) defects.push(`${s.id}: ${newer.version} avant ${older.version}`);
    if (time(newer.date) < time(older.date)) defects.push(`${s.id}: date de ${newer.version} antérieure à ${older.version}`);
  }
  const versions = changelog.map((row) => String(row.version));
  if (new Set(versions).size !== versions.length) defects.push(`${s.id}: version en double`);
  if (!versions.includes(String(s.data.version))) defects.push(`${s.id}: version déclarée absente du journal`);
  return defects;
}

/** D116 : extrait non vide, au plus 16 lignes, pas plus long que son fichier, sans e-mail. */
function excerptDefects(s: SkillFile): string[] {
  const defects: string[] = [];
  for (const file of s.data.files ?? []) {
    const excerpt: string = file.excerpt ?? '';
    const lines = excerpt.split('\n');
    if (excerpt.trim() === '') defects.push(`${s.id}: extrait vide pour ${file.path}`);
    if (lines.length > MAX_EXCERPT_LINES) defects.push(`${s.id}: ${file.path} dépasse ${MAX_EXCERPT_LINES} lignes`);
    if (!(Number.isInteger(file.lines) && file.lines > 0)) defects.push(`${s.id}: ${file.path} sans nombre de lignes`);
    else if (lines.length > file.lines) defects.push(`${s.id}: ${file.path} plus long que son fichier`);
    for (const [i, line] of lines.entries()) {
      if (EMAIL.test(line)) defects.push(`${s.id}: e-mail dans ${file.path}, l. ${i + 1}`);
    }
  }
  return defects;
}

/** Chemins de fichiers uniques, relatifs, normalisés ; des fichiers impliquent `filesSource`. */
function pathDefects(s: SkillFile): string[] {
  const defects: string[] = [];
  const paths: string[] = (s.data.files ?? []).map((file: any) => String(file.path ?? ''));
  if (new Set(paths).size !== paths.length) defects.push(`${s.id}: chemin en double`);
  for (const path of paths) {
    if (path === '') defects.push(`${s.id}: chemin vide`);
    else if (path.startsWith('/') || path.startsWith('~') || /^[A-Za-z]:/.test(path)) defects.push(`${s.id}: ${path} absolu`);
    else if (path.includes('\\')) defects.push(`${s.id}: ${path} avec \\`);
    else if (path.endsWith('/')) defects.push(`${s.id}: ${path} est un dossier`);
    else if (path.split('/').some((part) => part === '..' || part === '.' || part === '')) defects.push(`${s.id}: ${path} non normalisé`);
  }
  if (paths.length > 0 && String(s.data.filesSource ?? '').trim() === '') defects.push(`${s.id}: fichiers sans filesSource`);
  return defects;
}

describe('contenu des skills — règles génériques (D65, D66, D116, D131)', () => {
  // D131 : les anciens garde-fous `skills.length > 0`, `fed > 0` (journaux) et
  // `excerpts > 0` rougissaient dès que l'auteur supprimait la dernière fiche,
  // le dernier journal ou le dernier extrait ; la non-vacuité est prouvée par
  // le test sur fiches fabriquées plus bas.
  it('no skill body is the literal No content', () => {
    expect(allSkills().flatMap(bodyDefects)).toEqual([]);
  });

  it('each changelog is newest first and holds the declared version', () => {
    expect(allSkills().flatMap(changelogDefects)).toEqual([]);
  });

  it('each excerpt has at most 16 lines, no more than its file, and no e-mail address', () => {
    expect(allSkills().flatMap(excerptDefects)).toEqual([]);
  });

  it('file paths are unique, relative and without ..', () => {
    expect(allSkills().flatMap(pathDefects)).toEqual([]);
  });

  // D131 : supprimé — « superpowers is at 6.4.1 with a written body » figeait
  // `version` et `filesSource` à 6.4.1, deux titres du corps et 5
  // `<blockquote lang="en">` (plan 17, F4). Toute montée de version ou
  // retouche du corps depuis le CMS le rougissait. Ce qui se généralise est
  // gardé ailleurs : la version déclarée figure au journal (ci-dessus), le
  // corps n'est pas `No content` ; la comparaison aux sources du plugin reste
  // `node scripts/check-skill-sources.mjs` (local).

  it('each rule still flags an injected defect (fabricated skills)', () => {
    const skill = (data: Record<string, any>, body = 'Texte.'): SkillFile => ({ id: 'x', data, body });
    const changelog = [
      { version: '1.1.0', date: '2026-09-02', text: 'b' },
      { version: '1.0.0', date: '2026-09-01', text: 'a' },
    ];
    expect(bodyDefects(skill({}))).toEqual([]);
    expect(bodyDefects(skill({}, 'No content'))).toEqual(['x: corps « No content »']);

    expect(changelogDefects(skill({ version: '1.1.0', changelog }))).toEqual([]);
    expect(changelogDefects(skill({ version: '1.2.0', changelog }))).toEqual(['x: version déclarée absente du journal']);
    expect(changelogDefects(skill({ version: '1.1.0', changelog: [...changelog].reverse() })))
      .toEqual(['x: 1.0.0 avant 1.1.0', 'x: date de 1.0.0 antérieure à 1.1.0']);

    const file = { path: 'README.md', lines: 20, excerpt: '# Titre' };
    expect(excerptDefects(skill({ files: [file] }))).toEqual([]);
    expect(excerptDefects(skill({ files: [{ ...file, excerpt: Array(17).fill('l').join('\n') }] })))
      .toEqual(['x: README.md dépasse 16 lignes']);
    expect(excerptDefects(skill({ files: [{ ...file, excerpt: 'Auteur : jo@example.com' }] })))
      .toEqual(['x: e-mail dans README.md, l. 1']);

    expect(pathDefects(skill({ filesSource: '1.0.0', files: [file] }))).toEqual([]);
    expect(pathDefects(skill({ filesSource: '1.0.0', files: [{ ...file, path: '../README.md' }] })))
      .toEqual(['x: ../README.md non normalisé']);
    expect(pathDefects(skill({ files: [file, file] }))).toEqual(['x: chemin en double', 'x: fichiers sans filesSource']);
  });
});
