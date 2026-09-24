import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';
import { renderPromptText, type PromptVariable } from './promptWindow';
import { measurePromptText, promptStats } from './listCards';

/**
 * Règle de contenu (brief, D65) appliquée aux prompts du plan 16 : une valeur
 * n'est écrite que si une source vérifiable la donne. Ce test lit les fichiers
 * réels de `src/content/prompts/` — pas une copie.
 *
 * - D109 : le `prompt` de `bootstrap-session-anti-drift` est la forme gabarit
 *   de l'instance émise (placeholders du gabarit canonique
 *   `anti-drift-planning/skills/anti-drift-planning/references/bootstrap-prompt-template.md`,
 *   indices tirés de `commands/start-session.md`) ; rendu à ses défauts, il
 *   redonne octet pour octet l'instance stockée à la base du plan (1e4ef42).
 * - D110 : `macos-clone` n'a changé que par ses blancs (sauts de ligne), et
 *   son corps littéral `No content` est vidé.
 */
const PROMPTS_DIR = new URL('../content/prompts/', import.meta.url);

/**
 * SHA-256 du champ `prompt` (valeur YAML, octets UTF-8) stocké au commit de
 * base du plan 16 (1e4ef42) — empreinte figée ici pour que la preuve ne
 * dépende pas de l'historique git (clones superficiels de la CI).
 */
const BASE_PROMPT_SHA256 = {
  'bootstrap-session-anti-drift': '222bd2a13d2f0ec443cedfa13d368555d54c467d3d0ecc4d5efee3223328d249',
  'macos-clone': 'aa1c98802c73e38ea7902cda3d84d95a40692bd8c260cfef04fc6708204b80f2',
} as const;

interface PromptFile {
  id: string;
  data: Record<string, any>;
  body: string;
}

function readPrompt(id: string): PromptFile {
  const raw = readFileSync(new URL(`${id}/index.md`, PROMPTS_DIR), 'utf8');
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw);
  if (!match) throw new Error(`${id}: frontmatter introuvable`);
  return { id, data: parse(match[1]), body: match[2] };
}

function allPrompts(): PromptFile[] {
  return readdirSync(PROMPTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => readPrompt(d.name));
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

describe('contenu des prompts — valeurs sourcées (D65, D109, D110)', () => {
  it('every declared variable occurs in its prompt', () => {
    const prompts = allPrompts();
    expect(prompts.length).toBeGreaterThan(0);
    let declared = 0;
    for (const p of prompts) {
      const variables: PromptVariable[] = p.data.variables ?? [];
      const names = variables.map((v) => v.name);
      expect(new Set(names).size, `${p.id}: variable déclarée deux fois`).toBe(names.length);
      for (const v of variables) {
        declared += 1;
        expect(typeof p.data.prompt, `${p.id}: variables sans prompt`).toBe('string');
        expect(p.data.prompt.includes(`{${v.name}}`), `${p.id}: {${v.name}} absent du prompt`).toBe(true);
      }
    }
    expect(declared).toBeGreaterThan(0);
  });

  it('bootstrap keeps its placeholders where the canonical template has them', () => {
    const { data } = readPrompt('bootstrap-session-anti-drift');
    const prompt: string = data.prompt;
    expect(count(prompt, '{N}')).toBe(13);
    expect(count(prompt, '{topic}')).toBe(4);
    expect(count(prompt, '{BASE_REF}')).toBe(1);
    expect(count(prompt, '{LANGUAGE}')).toBe(1);
    // Coquille de l'instance, discutée par le corps : laissée littérale.
    expect(count(prompt, 'milestone-plan-3')).toBe(2);
    expect(count(prompt, 'milestone-plan-{N}')).toBe(0);
    // Préfixe de re-validation (lignes 1–16) : jamais gabarisé.
    const lines = prompt.split('\n');
    expect(lines.slice(0, 16).join('\n')).not.toMatch(/\{(N|topic|BASE_REF|LANGUAGE)\}/);
    // Lignes (1-based) portant chaque placeholder, comme au gabarit canonique.
    const linesWith = (needle: string) =>
      lines.flatMap((line, i) => Array(count(line, needle)).fill(i + 1));
    expect(linesWith('{N}')).toEqual([18, 22, 23, 24, 25, 29, 36, 72, 94, 97, 122, 124, 127]);
    expect(linesWith('{topic}')).toEqual([18, 22, 23, 29]);
    expect(linesWith('{BASE_REF}')).toEqual([29]);
    expect(linesWith('{LANGUAGE}')).toEqual([129]);
    // Défauts = valeurs de l'instance ; indices cités de start-session.md (étape 4).
    expect(data.variables).toEqual([
      { name: 'N', hint: 'plan number', default: '4' },
      { name: 'topic', hint: 'topic extracted from the spec filename', default: 'librairies-prompts-skills' },
      { name: 'BASE_REF', hint: 'the ref the execution session must branch off', default: 'main' },
      { name: 'LANGUAGE', hint: 'the language the user is currently conversing in', default: 'français' },
    ]);
  });

  it('bootstrap renders byte-identical to the instance stored at the plan base (1e4ef42)', () => {
    const { data } = readPrompt('bootstrap-session-anti-drift');
    const rendered = renderPromptText(data.prompt, data.variables);
    expect(sha256(rendered)).toBe(BASE_PROMPT_SHA256['bootstrap-session-anti-drift']);
  });

  it('bootstrap renders to 129 lines and ~2645 tokens at its defaults', () => {
    const { data, body } = readPrompt('bootstrap-session-anti-drift');
    expect(promptStats(measurePromptText(data as any, body))).toEqual({ lines: 129, tokens: 2645 });
  });

  it('macos-clone has 48 lines, one bullet per line, and an empty body', () => {
    const { data, body } = readPrompt('macos-clone');
    const prompt: string = data.prompt;
    const lines = prompt.split('\n');
    expect(lines).toHaveLength(48);
    expect(promptStats(measurePromptText(data as any, body))).toEqual({ lines: 48, tokens: 607 });
    // Liste plate : 43 puces, chacune en début de ligne, aucune restée en ligne.
    expect(lines.filter((line) => line.startsWith('- '))).toHaveLength(43);
    expect(count(prompt, ' - ')).toBe(0);
    expect(lines.filter((line) => /^\s/.test(line))).toEqual([]);
    // Une ligne vide avant `Exigences:` et `Important:`, et nulle part ailleurs.
    expect(prompt).toContain('\n\nExigences:\n- ');
    expect(prompt).toContain('\n\nImportant:\n- ');
    expect(count(prompt, '\n\n')).toBe(2);
    // Seuls les blancs ont bougé : réduits à une espace, on retrouve la base.
    expect(sha256(prompt.replace(/\s+/g, ' '))).toBe(BASE_PROMPT_SHA256['macos-clone']);
    expect(body.trim()).toBe('');
    expect(data.variables).toBeUndefined();
  });

  it('no prompt body is the literal No content', () => {
    for (const p of allPrompts()) {
      expect(p.body.includes('No content'), `${p.id}: corps « No content »`).toBe(false);
    }
  });

  it('leaves the optional updated field empty (no sourced date, D111)', () => {
    for (const p of allPrompts()) {
      expect(p.data.updated, `${p.id}: updated sans source`).toBeUndefined();
    }
  });
});
