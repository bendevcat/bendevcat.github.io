#!/usr/bin/env node
/**
 * Contrôle LOCAL des valeurs sourcées des skills (plan 17, critère R6 ;
 * Règle de contenu du brief, D65/D66, D115, D116). Compare chaque valeur
 * écrite dans `src/content/skills/<id>/index.md` au plugin réel :
 *
 *   node scripts/check-skill-sources.mjs [dossier des skills]
 *
 * Sources (lecture seule, jamais modifiées) :
 * - anti-drift-planning ← dépôt git `~/workspace/claudeworkspaces/anti-drift-planning`
 *   au commit `3dc3336` (lu par `git show 3dc3336:<chemin>`, jamais l'arbre de
 *   travail) — surchargeable par `ANTI_DRIFT_REPO` ;
 * - superpowers ← cache `~/.claude/plugins/cache/claude-plugins-official/superpowers/6.4.1/`
 *   — surchargeable par `SUPERPOWERS_DIR`.
 * La CI n'a pas ces chemins : ce script n'y tourne pas ; les invariants qui
 * s'en passent sont dans src/lib/skillContent.test.ts.
 *
 * Imprime une ligne par skill :
 *
 *   <id> @ <réf>: version <v> = plugin.json · license <l> = plugin.json · N/N triggers quoted
 *     · N/N changelog rows (heading, date, text) · N/N highlights quoted · install note quoted
 *     · N skill(s) · N command(s) · N/N excerpts verbatim, no e-mail[ · body: N/N blockquotes quoted]
 *
 * « Cité » (quoted) = sous-chaîne après normalisation : `**` et accents
 * graves retirés, blancs réduits à une espace, casse ignorée, un `.` / `:`
 * final de la valeur ignoré. Réservoirs :
 * - déclencheurs : descriptions des `skills/* /SKILL.md` + README ;
 * - points forts, note d'installation : README, description de `plugin.json`
 *   ou corps de la fiche elle-même ;
 * - texte d'une ligne de version : la section de CETTE version dans le
 *   CHANGELOG (`## [x.y.z] - date`) ou les RELEASE-NOTES (`## vX.Y.Z (date)`),
 *   dont le titre doit exister avec la même date ;
 * - blockquotes du corps : README.
 * Extraits (D116) : `lines` = nombre de lignes du fichier ; l'extrait =
 * ses K premières lignes mot pour mot, K ≤ 16, sans aucune adresse e-mail.
 * Comptes : `skillCount` = nombre de `skills/* /SKILL.md`, `commandCount`
 * (absent = 0) = nombre de `commands/*.md`. `filesSource` = la réf lue.
 *
 * Code de sortie : 2 (`source introuvable`) si une source manque ; 1 sur tout
 * écart (détail sur stderr, après stdout) ; 0 sinon.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

const CONTENT = process.argv[2] ?? join('src', 'content', 'skills');
const MAX_EXCERPT_LINES = 16;
/** Même motif que src/lib/skillContent.test.ts. */
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;

const SOURCES = [
  {
    id: 'anti-drift-planning',
    ref: '3dc3336',
    root: process.env.ANTI_DRIFT_REPO ?? join(homedir(), 'workspace', 'claudeworkspaces', 'anti-drift-planning'),
    kind: 'git',
    changelog: 'CHANGELOG.md',
    heading: /^## \[(?<version>[^\]]+)\] - (?<date>\d{4}-\d{2}-\d{2})\s*$/,
  },
  {
    id: 'superpowers',
    ref: '6.4.1',
    root: process.env.SUPERPOWERS_DIR
      ?? join(homedir(), '.claude', 'plugins', 'cache', 'claude-plugins-official', 'superpowers', '6.4.1'),
    kind: 'dir',
    changelog: 'RELEASE-NOTES.md',
    heading: /^## v(?<version>\S+) \((?<date>\d{4}-\d{2}-\d{2})\)\s*$/,
  },
];

// — Accès aux sources —

/** Lecteur d'une source : `read(chemin)` → texte ou `null`, `paths` = tous les fichiers. */
function openSource(source) {
  if (source.kind === 'git') {
    const git = (...args) => execFileSync('git', ['-C', source.root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    try {
      git('cat-file', '-e', `${source.ref}^{commit}`);
    } catch {
      return null;
    }
    const paths = git('ls-tree', '-r', '--name-only', source.ref).split('\n').filter(Boolean);
    const known = new Set(paths);
    return {
      paths,
      read: (path) => (known.has(path) ? git('show', `${source.ref}:${path}`) : null),
    };
  }
  if (!existsSync(join(source.root, '.claude-plugin', 'plugin.json'))) return null;
  const paths = [];
  const walk = (dir) => {
    for (const entry of readdirSync(join(source.root, dir), { withFileTypes: true })) {
      const rel = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(rel);
      else paths.push(rel);
    }
  };
  walk('');
  const known = new Set(paths);
  return {
    paths,
    read: (path) => (known.has(path) && statSync(join(source.root, path)).isFile() ? readFileSync(join(source.root, path), 'utf8') : null),
  };
}

// — Normalisation et citations —

function normalise(text) {
  return String(text).replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Valeur à chercher : normalisée, sans `.` / `:` final. */
function needle(text) {
  return normalise(text).replace(/[.:]$/, '');
}

function quoted(value, pool) {
  const n = needle(value);
  return n !== '' && pool.includes(n);
}

/** Lignes d'un fichier (sans l'entrée vide après le saut de ligne final). */
function fileLines(text) {
  const lines = text.split('\n');
  if (text.endsWith('\n')) lines.pop();
  return lines;
}

function frontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (!match) return null;
  return { data: parseYaml(match[1]) ?? {}, body: match[2] };
}

/** Sections `## …` d'un journal : version → { date, texte de la section }. */
function changelogSections(text, heading) {
  const sections = new Map();
  let current = null;
  for (const line of fileLines(text)) {
    const match = heading.exec(line);
    if (match) {
      current = { date: match.groups.date, lines: [] };
      sections.set(match.groups.version, current);
    } else if (/^## /.test(line)) {
      current = null;
    } else if (current) {
      current.lines.push(line);
    }
  }
  return sections;
}

/** Blockquotes Markdown du corps (blocs séparés par une ligne vide), texte sans `>`. */
function blockquotes(body) {
  return body
    .split(/\n[ \t]*\n/)
    .map((block) => block.trim())
    .filter((block) => block.startsWith('>'))
    .map((block) => block.split('\n').map((line) => line.replace(/^>\s?/, '')).join('\n'));
}

function isoDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
}

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

// — Contrôle —

const lines = [];
const errors = [];

for (const source of SOURCES) {
  const plugin = openSource(source);
  if (!plugin) {
    console.error(`source introuvable: ${source.id} @ ${source.ref} (${source.root})`);
    process.exit(2);
  }
  const indexPath = join(CONTENT, source.id, 'index.md');
  if (!existsSync(indexPath)) {
    errors.push(`${source.id}: ${indexPath} introuvable`);
    continue;
  }
  const entry = frontmatter(readFileSync(indexPath, 'utf8'));
  if (!entry) {
    errors.push(`${source.id}: frontmatter illisible`);
    continue;
  }
  const { data, body } = entry;
  const fail = (message) => errors.push(`${source.id}: ${message}`);
  const parts = [];

  // plugin.json : version et licence.
  const manifest = JSON.parse(plugin.read('.claude-plugin/plugin.json') ?? '{}');
  const version = String(data.version ?? '');
  if (version !== manifest.version) fail(`version ${version} ≠ plugin.json ${manifest.version}`);
  parts.push(`version ${version} ${version === manifest.version ? '=' : '≠'} plugin.json`);
  const license = String(data.license ?? '');
  if (license !== manifest.license) fail(`license ${license} ≠ plugin.json ${manifest.license}`);
  parts.push(`license ${license} ${license === manifest.license ? '=' : '≠'} plugin.json`);

  const readme = plugin.read('README.md') ?? '';
  const skillFiles = plugin.paths.filter((path) => /^skills\/[^/]+\/SKILL\.md$/.test(path)).sort();
  const commandFiles = plugin.paths.filter((path) => /^commands\/[^/]+\.md$/.test(path));

  // Déclencheurs : descriptions SKILL.md + README.
  const descriptions = skillFiles.map((path) => frontmatter(plugin.read(path) ?? '')?.data?.description ?? '');
  const triggerPool = normalise([...descriptions, readme].join('\n'));
  const triggers = data.triggers ?? [];
  const triggersOk = triggers.filter((t) => quoted(t, triggerPool));
  for (const t of triggers) if (!triggersOk.includes(t)) fail(`déclencheur non cité : « ${t} »`);
  parts.push(`${triggersOk.length}/${triggers.length} triggers quoted`);

  // Journal : titre de la version, même date, texte cité de sa section.
  const sections = changelogSections(plugin.read(source.changelog) ?? '', source.heading);
  const rows = data.changelog ?? [];
  let rowsOk = 0;
  for (const row of rows) {
    const section = sections.get(String(row.version));
    if (!section) {
      fail(`version ${row.version} sans titre dans ${source.changelog}`);
      continue;
    }
    if (isoDate(row.date) !== section.date) {
      fail(`version ${row.version} : date ${isoDate(row.date)} ≠ ${section.date}`);
      continue;
    }
    if (!quoted(row.text ?? '', normalise(section.lines.join('\n')))) {
      fail(`version ${row.version} : texte non cité de sa section : « ${row.text} »`);
      continue;
    }
    rowsOk += 1;
  }
  parts.push(`${rowsOk}/${rows.length} changelog rows (heading, date, text)`);

  // Points forts et note d'installation : README, description, corps.
  const ownPool = normalise([readme, manifest.description ?? '', body].join('\n'));
  const highlights = data.highlights ?? [];
  const highlightsOk = highlights.filter((h) => quoted(h, ownPool));
  for (const h of highlights) if (!highlightsOk.includes(h)) fail(`point fort non cité : « ${h} »`);
  parts.push(`${highlightsOk.length}/${highlights.length} highlights quoted`);
  if (data.installNote !== undefined) {
    const noteOk = quoted(data.installNote, ownPool);
    if (!noteOk) fail(`note d'installation non citée : « ${data.installNote} »`);
    parts.push(noteOk ? 'install note quoted' : 'install note not quoted');
  } else {
    parts.push('no install note');
  }

  // Comptes.
  const skillCount = data.skillCount ?? 0;
  const commandCount = data.commandCount ?? 0;
  if (skillCount !== skillFiles.length) fail(`skillCount ${skillCount} ≠ ${skillFiles.length} skills/*/SKILL.md`);
  if (commandCount !== commandFiles.length) fail(`commandCount ${commandCount} ≠ ${commandFiles.length} commands/*.md`);
  parts.push(plural(skillCount, 'skill', 'skills'), plural(commandCount, 'command', 'commands'));

  // Extraits.
  if ((data.files ?? []).length > 0 && String(data.filesSource ?? '') !== source.ref) {
    fail(`filesSource ${data.filesSource} ≠ ${source.ref}`);
  }
  const files = data.files ?? [];
  let excerptsOk = 0;
  for (const file of files) {
    const text = plugin.read(String(file.path));
    if (text === null) {
      fail(`${file.path} absent de la source`);
      continue;
    }
    const sourceLines = fileLines(text);
    const excerpt = String(file.excerpt ?? '').split('\n');
    const problems = [];
    if (file.lines !== sourceLines.length) problems.push(`lines ${file.lines} ≠ ${sourceLines.length}`);
    if (excerpt.length > MAX_EXCERPT_LINES) problems.push(`${excerpt.length} lignes > ${MAX_EXCERPT_LINES}`);
    const differs = excerpt.findIndex((line, i) => line !== sourceLines[i]);
    if (differs !== -1) problems.push(`l. ${differs + 1} ≠ source`);
    const email = excerpt.findIndex((line) => EMAIL.test(line));
    if (email !== -1) problems.push(`e-mail l. ${email + 1}`);
    if (problems.length > 0) fail(`${file.path} : ${problems.join(', ')}`);
    else excerptsOk += 1;
  }
  parts.push(`${excerptsOk}/${files.length} excerpts verbatim, no e-mail`);

  // Corps : blockquotes cités du README.
  const quotes = blockquotes(body);
  if (quotes.length > 0) {
    const readmePool = normalise(readme);
    const quotesOk = quotes.filter((q) => quoted(q, readmePool));
    for (const q of quotes) if (!quotesOk.includes(q)) fail(`blockquote non cité : « ${q.slice(0, 60)}… »`);
    parts.push(`body: ${quotesOk.length}/${quotes.length} blockquotes quoted`);
  }

  lines.push(`${source.id} @ ${source.ref}: ${parts.join(' · ')}`);
}

console.log(lines.join('\n'));
if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exit(1);
}
