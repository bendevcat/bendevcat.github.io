import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';

/**
 * Règle de contenu (brief, D65) appliquée aux fiches projets du plan 15 : une
 * valeur n'est écrite que si une source vérifiable la donne. Ce test lit les
 * fichiers réels de `src/content/projects/` — pas une copie — et échoue sur
 * toute valeur qui ne se retrouve pas dans sa source (D103, D104).
 */
const PROJECTS_DIR = new URL('../content/projects/', import.meta.url);

interface ProjectFile {
  id: string;
  data: Record<string, any>;
  body: string;
}

function readProject(id: string): ProjectFile {
  const raw = readFileSync(new URL(`${id}/index.md`, PROJECTS_DIR), 'utf8');
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw);
  if (!match) throw new Error(`${id}: frontmatter introuvable`);
  return { id, data: parse(match[1]), body: match[2] };
}

function allProjects(): ProjectFile[] {
  return readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => readProject(d.name));
}

/** `*` retirés (gras/italique Markdown), blancs consécutifs réduits à une espace. */
function normalise(text: string): string {
  return text.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
}

/** Texte propre du projet : titre + description + corps. */
function ownText(p: ProjectFile): string {
  return normalise([p.data.title, p.data.description, p.body].join('\n'));
}

describe('contenu des projets — valeurs sourcées (D65, D103, D104)', () => {
  it('every stack role is a verbatim fragment of its project\'s own text', () => {
    const projects = allProjects();
    expect(projects.length).toBeGreaterThan(0);
    let roles = 0;
    for (const p of projects) {
      const text = ownText(p);
      const stack: string[] = p.data.stack ?? [];
      for (const entry of p.data.stackRoles ?? []) {
        roles += 1;
        expect(stack, `${p.id}: « ${entry.name} » hors de stack`).toContain(entry.name);
        const role = normalise(entry.role ?? '');
        expect(role, `${p.id}: rôle vide pour ${entry.name}`).not.toBe('');
        expect(text.includes(role), `${p.id}: « ${role} » absent du titre, de la description et du corps`).toBe(true);
      }
      const names = (p.data.stackRoles ?? []).map((e: any) => e.name);
      expect(new Set(names).size, `${p.id}: techno en double dans stackRoles`).toBe(names.length);
    }
    expect(roles).toBeGreaterThan(0);
  });

  it('attaches exactly the roles listed in the plan\'s Sources', () => {
    const roles = Object.fromEntries(
      allProjects().map((p) => [p.id, Object.fromEntries((p.data.stackRoles ?? []).map((e: any) => [e.name, e.role]))]),
    );
    expect(roles['site-bencat']).toEqual({
      Astro: 'statique',
      'Tailwind CSS': 'thème',
      'Sveltia CMS': 'écrire sans toucher au code',
      'GitHub Pages': 'déploiement',
    });
    expect(roles['gha-svu']).toEqual({
      'GitHub Actions': 'action composite',
      SVU: 'prochain numéro de version',
    });
  });

  it("site-bencat's snippet is a contiguous run of .github/workflows/deploy.yml", () => {
    const p = readProject('site-bencat');
    const source = readFileSync(new URL('../../.github/workflows/deploy.yml', import.meta.url), 'utf8');
    const snippet: string = p.data.snippet;
    expect(typeof snippet).toBe('string');
    expect(snippet.trim()).not.toBe('');
    const sourceLines = source.replace(/\n$/, '').split('\n');
    const snippetLines = snippet.replace(/\n$/, '').split('\n');
    const start = sourceLines.indexOf(snippetLines[0]);
    expect(start, 'première ligne du snippet absente de deploy.yml').toBeGreaterThanOrEqual(0);
    expect(sourceLines.slice(start, start + snippetLines.length)).toEqual(snippetLines);
    expect(p.data.snippetFile).toBe('.github/workflows/deploy.yml');
  });

  it('names the file of every snippet, and only of a snippet', () => {
    for (const p of allProjects()) {
      expect(typeof p.data.snippet === 'string', `${p.id}: snippet sans snippetFile ou l'inverse`)
        .toBe(typeof p.data.snippetFile === 'string');
    }
    expect(readProject('gha-svu').data.snippetFile).toBe('.github/workflows/check-pr.yml');
  });

  it('leaves license unset: no source exists (D102)', () => {
    for (const p of allProjects()) {
      expect(p.data, `${p.id}: licence sans source`).not.toHaveProperty('license');
    }
  });
});
