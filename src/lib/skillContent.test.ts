import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
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

function allSkills(): SkillFile[] {
  return readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
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

describe('contenu des skills — valeurs sourcées (D65, D66, D115, D116)', () => {
  it('no skill body is the literal No content', () => {
    const skills = allSkills();
    expect(skills.length).toBeGreaterThan(0);
    for (const s of skills) {
      expect(s.body.includes('No content'), `${s.id}: corps « No content »`).toBe(false);
    }
  });

  it('each changelog is newest first and holds the declared version', () => {
    let fed = 0;
    for (const s of allSkills()) {
      const changelog: { version: string; date: unknown; text: string }[] = s.data.changelog ?? [];
      if (changelog.length === 0) continue;
      fed += 1;
      for (const row of changelog) {
        expect(String(row.version).trim(), `${s.id}: version vide`).not.toBe('');
        expect(Number.isNaN(time(row.date)), `${s.id}: date illisible pour ${row.version}`).toBe(false);
        expect(String(row.text ?? '').trim(), `${s.id}: texte vide pour ${row.version}`).not.toBe('');
      }
      for (let i = 1; i < changelog.length; i += 1) {
        const newer = changelog[i - 1];
        const older = changelog[i];
        expect(compareVersions(newer.version, older.version), `${s.id}: ${newer.version} avant ${older.version}`).toBeGreaterThan(0);
        expect(time(newer.date), `${s.id}: date de ${newer.version} antérieure à ${older.version}`).toBeGreaterThanOrEqual(time(older.date));
      }
      const versions = changelog.map((row) => String(row.version));
      expect(new Set(versions).size, `${s.id}: version en double`).toBe(versions.length);
      expect(versions, `${s.id}: version déclarée absente du journal`).toContain(String(s.data.version));
    }
    expect(fed).toBeGreaterThan(0);
  });

  it('each excerpt has at most 16 lines, no more than its file, and no e-mail address', () => {
    let excerpts = 0;
    for (const s of allSkills()) {
      for (const file of s.data.files ?? []) {
        excerpts += 1;
        const excerpt: string = file.excerpt ?? '';
        const lines = excerpt.split('\n');
        expect(excerpt.trim(), `${s.id}: extrait vide pour ${file.path}`).not.toBe('');
        expect(lines.length, `${s.id}: ${file.path} dépasse ${MAX_EXCERPT_LINES} lignes`).toBeLessThanOrEqual(MAX_EXCERPT_LINES);
        expect(Number.isInteger(file.lines) && file.lines > 0, `${s.id}: ${file.path} sans nombre de lignes`).toBe(true);
        expect(lines.length, `${s.id}: ${file.path} plus long que son fichier`).toBeLessThanOrEqual(file.lines);
        for (const [i, line] of lines.entries()) {
          expect(EMAIL.test(line), `${s.id}: e-mail dans ${file.path}, l. ${i + 1}`).toBe(false);
        }
      }
    }
    expect(excerpts).toBeGreaterThan(0);
  });

  it('file paths are unique, relative and without ..', () => {
    for (const s of allSkills()) {
      const paths: string[] = (s.data.files ?? []).map((file: any) => String(file.path));
      expect(new Set(paths).size, `${s.id}: chemin en double`).toBe(paths.length);
      for (const path of paths) {
        expect(path, `${s.id}: chemin vide`).not.toBe('');
        expect(path.startsWith('/'), `${s.id}: ${path} absolu`).toBe(false);
        expect(path.startsWith('~'), `${s.id}: ${path} absolu`).toBe(false);
        expect(/^[A-Za-z]:/.test(path), `${s.id}: ${path} absolu`).toBe(false);
        expect(path.includes('\\'), `${s.id}: ${path} avec \\`).toBe(false);
        expect(path.endsWith('/'), `${s.id}: ${path} est un dossier`).toBe(false);
        expect(path.split('/').some((part) => part === '..' || part === '.' || part === ''), `${s.id}: ${path} non normalisé`).toBe(false);
      }
      if (paths.length > 0) {
        expect(String(s.data.filesSource ?? '').trim(), `${s.id}: fichiers sans filesSource`).not.toBe('');
      }
    }
  });

  it('superpowers is at 6.4.1 with a written body', () => {
    const { data, body } = readSkill('superpowers');
    expect(String(data.version)).toBe('6.4.1');
    expect(data.filesSource).toBe('6.4.1');
    expect(body.trim()).not.toBe('');
    // D66 : intro française, « How it works » cité en blockquotes, contenu.
    expect(body).toContain('## Comment il travaille');
    expect(body).toContain('## Ce qu\'il contient');
    // Plan 17, F4 (WCAG 3.1.2) : les 5 citations anglaises du README sont des
    // `<blockquote lang="en">` ; plus aucune blockquote Markdown `>` sans langue.
    const markdownQuotes = body.split(/\n\s*\n/).filter((block) => block.trimStart().startsWith('>'));
    expect(markdownQuotes).toHaveLength(0);
    const htmlQuotes = [...body.matchAll(/<blockquote\b([^>]*)>([\s\S]*?)<\/blockquote>/g)];
    expect(htmlQuotes).toHaveLength(5);
    for (const [, attrs, text] of htmlQuotes) {
      expect(attrs.trim()).toBe('lang="en"');
      expect(text.trim()).not.toBe('');
    }
  });
});
