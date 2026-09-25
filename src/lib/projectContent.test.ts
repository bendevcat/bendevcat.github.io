import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';

/**
 * Règle de contenu (brief, D65) appliquée aux fiches projets du plan 15 : une
 * valeur n'est écrite que si une source vérifiable la donne. Ce test lit les
 * fichiers réels de `src/content/projects/` — pas une copie (D103, D104).
 *
 * Plan 19, F3 (D131) : l'auteur possède désormais le contenu et le modifie ou
 * le supprime depuis le CMS ; la CI lance `npm test` avant de déployer. Ce test
 * ne garde donc que des règles **génériques**, vraies pour toute fiche, et
 * plus aucune valeur figée d'une fiche nommée (`site-bencat`, `gha-svu`) :
 * supprimer ou modifier une fiche depuis le CMS ne doit jamais bloquer le
 * déploiement. Chaque règle est une fonction pure qui liste les défauts ; un
 * test sur des fiches fabriquées prouve qu'elle rougit encore sur un défaut
 * injecté, quel que soit le contenu réel.
 */
const PROJECTS_DIR = new URL('../content/projects/', import.meta.url);
const REPO_ROOT = new URL('../../', import.meta.url);

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

/** Toutes les fiches présentes sur le disque — zéro est permis (D131). */
function allProjects(): ProjectFile[] {
  return readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(new URL(`${d.name}/index.md`, PROJECTS_DIR)))
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

/**
 * D103 : chaque rôle nomme une techno de la `stack` de la fiche, n'est pas
 * vide, et se lit mot pour mot dans le texte propre de la fiche ; une techno
 * n'a qu'un rôle.
 */
function roleDefects(p: ProjectFile): string[] {
  const defects: string[] = [];
  const text = ownText(p);
  const stack: string[] = p.data.stack ?? [];
  const entries: any[] = p.data.stackRoles ?? [];
  for (const entry of entries) {
    if (!stack.includes(entry.name)) defects.push(`${p.id}: « ${entry.name} » hors de stack`);
    const role = normalise(entry.role ?? '');
    if (role === '') defects.push(`${p.id}: rôle vide pour ${entry.name}`);
    else if (!text.includes(role)) defects.push(`${p.id}: « ${role} » absent du titre, de la description et du corps`);
  }
  const names = entries.map((e) => e.name);
  if (new Set(names).size !== names.length) defects.push(`${p.id}: techno en double dans stackRoles`);
  return defects;
}

/** `snippet` et `snippetFile` vont ensemble : l'un sans l'autre est un défaut. */
function snippetPairDefects(p: ProjectFile): string[] {
  return (typeof p.data.snippet === 'string') === (typeof p.data.snippetFile === 'string')
    ? []
    : [`${p.id}: snippet sans snippetFile ou l'inverse`];
}

/** Dépôt de ce site, lu dans la config du CMS (`backend.repo`) — pas de git en CI. */
function thisRepoUrl(): string {
  const config = parse(readFileSync(new URL('public/admin/config.yml', REPO_ROOT), 'utf8'));
  return `https://github.com/${config.backend.repo}`;
}

/**
 * D104 : quand la source d'un extrait est joignable — le projet est ce dépôt
 * (`repoUrl` = `backend.repo` du CMS) et `snippetFile` y existe —, l'extrait
 * est une suite de lignes contiguës de ce fichier. Sinon (dépôt d'un autre
 * projet, fichier absent), rien à comparer : la règle se tait. `readSource`
 * rend `undefined` quand le fichier n'est pas joignable.
 */
function snippetSourceDefects(
  p: ProjectFile,
  repoUrl: string,
  readSource: (path: string) => string | undefined,
): string[] {
  if (typeof p.data.snippet !== 'string' || typeof p.data.snippetFile !== 'string') return [];
  if (String(p.data.repoUrl ?? '').replace(/(\.git)?\/?$/, '') !== repoUrl) return [];
  const source = readSource(p.data.snippetFile);
  if (source === undefined) return [];
  const snippetLines = p.data.snippet.replace(/\n$/, '').split('\n');
  const sourceLines = source.replace(/\n$/, '').split('\n');
  if (p.data.snippet.trim() === '') return [`${p.id}: snippet vide`];
  for (let start = 0; start + snippetLines.length <= sourceLines.length; start += 1) {
    if (snippetLines.every((line, i) => sourceLines[start + i] === line)) return [];
  }
  return [`${p.id}: snippet absent, en lignes contiguës, de ${p.data.snippetFile}`];
}

/** Lecture d'un fichier du dépôt, `undefined` s'il n'existe pas ou sort du dépôt. */
function readRepoFile(path: string): string | undefined {
  if (path.startsWith('/') || path.split('/').includes('..')) return undefined;
  const url = new URL(path, REPO_ROOT);
  return existsSync(url) ? readFileSync(url, 'utf8') : undefined;
}

describe('contenu des projets — règles génériques (D65, D103, D104, D131)', () => {
  // D131 : l'ancien garde-fou `roles > 0` rougissait dès que l'auteur retirait
  // le dernier rôle ou la dernière fiche ; la non-vacuité est prouvée par le
  // test sur fiches fabriquées plus bas.
  it("every stack role names a tech of the entry's stack and is a verbatim fragment of its own text", () => {
    expect(allProjects().flatMap(roleDefects)).toEqual([]);
  });

  // D131 : supprimé — « attaches exactly the roles listed in the plan's
  // Sources » figeait les rôles de `site-bencat` et `gha-svu` tels que sourcés
  // à la vague 3. Il ne faisait que redire la source ; la règle ci-dessus
  // garde ce qui se généralise (rôle tiré du texte, techno de la stack).

  // D131 : était « site-bencat's snippet is a contiguous run of deploy.yml »
  // (plus un `snippetFile` figé). Désormais, pour toute fiche dont la source
  // est joignable dans ce dépôt ; sans fiche ou sans source, rien à vérifier.
  it('every snippet whose source file is in this repo is a contiguous run of it', () => {
    const repoUrl = thisRepoUrl();
    expect(allProjects().flatMap((p) => snippetSourceDefects(p, repoUrl, readRepoFile))).toEqual([]);
  });

  // D131 : garde la règle générique ; le `snippetFile` figé de `gha-svu`
  // (`.github/workflows/check-pr.yml`) ne faisait que redire la source.
  it('names the file of every snippet, and only of a snippet', () => {
    expect(allProjects().flatMap(snippetPairDefects)).toEqual([]);
  });

  // D131 : supprimé — « leaves license unset: no source exists (D102) ».
  // `license` est un champ du CMS ; l'auteur, désormais source de son
  // contenu, peut le remplir sans bloquer le déploiement.

  it('each rule still flags an injected defect (fabricated entries)', () => {
    const base = {
      title: 'Démo',
      description: 'Un site statique avec un thème.',
      stack: ['Astro', 'Tailwind CSS'],
      stackRoles: [{ name: 'Astro', role: 'statique' }],
    };
    const ok: ProjectFile = { id: 'ok', data: base, body: '' };
    expect(roleDefects(ok)).toEqual([]);
    const outOfStack: ProjectFile = { id: 'x', data: { ...base, stackRoles: [{ name: 'Vue', role: 'statique' }] }, body: '' };
    expect(roleDefects(outOfStack)).toEqual(['x: « Vue » hors de stack']);
    const unsourced: ProjectFile = { id: 'x', data: { ...base, stackRoles: [{ name: 'Astro', role: 'rapide' }] }, body: '' };
    expect(roleDefects(unsourced)).toEqual(['x: « rapide » absent du titre, de la description et du corps']);
    const twice: ProjectFile = { id: 'x', data: { ...base, stackRoles: [...base.stackRoles, { name: 'Astro', role: 'thème' }] }, body: '' };
    expect(roleDefects(twice)).toEqual(['x: techno en double dans stackRoles']);

    expect(snippetPairDefects({ id: 'x', data: { snippet: 'a' }, body: '' })).toEqual(["x: snippet sans snippetFile ou l'inverse"]);

    const repo = 'https://github.com/me/site';
    const source = (path: string) => (path === 'ci.yml' ? 'a\nb\nc\n' : undefined);
    const snip = (snippet: string, snippetFile = 'ci.yml', repoUrl = repo): ProjectFile =>
      ({ id: 'x', data: { snippet, snippetFile, repoUrl }, body: '' });
    expect(snippetSourceDefects(snip('b\nc\n'), repo, source)).toEqual([]);
    expect(snippetSourceDefects(snip('a\nc\n'), repo, source)).toEqual(['x: snippet absent, en lignes contiguës, de ci.yml']);
    // Source injoignable : autre dépôt, ou fichier absent de ce dépôt.
    expect(snippetSourceDefects(snip('a\nc\n', 'ci.yml', 'https://github.com/other/repo'), repo, source)).toEqual([]);
    expect(snippetSourceDefects(snip('a\nc\n', 'absent.yml'), repo, source)).toEqual([]);
  });
});
