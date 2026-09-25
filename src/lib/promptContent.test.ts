import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';
import type { PromptVariable } from './promptWindow';

/**
 * Règle de contenu (brief, D65) appliquée aux prompts du plan 16 : une valeur
 * n'est écrite que si une source vérifiable la donne. Ce test lit les fichiers
 * réels de `src/content/prompts/` — pas une copie.
 *
 * Plan 19, F3 (D131) : l'auteur possède désormais le contenu et le modifie ou
 * le supprime depuis le CMS ; la CI lance `npm test` avant de déployer. Les
 * instantanés de la vague 3 — `bootstrap-session-anti-drift` (placeholders
 * aux lignes du gabarit canonique, empreinte SHA-256 du rendu, 129 lignes /
 * 2645 jetons ; D109) et `macos-clone` (48 lignes, 43 puces, empreinte des
 * blancs, corps vide ; D110, plan 18 T4) — sont retirés : ils rougissaient dès
 * que l'auteur supprimait ou retouchait ces prompts, et leur source (gabarit
 * du plugin, instance au commit 1e4ef42) n'est pas joignable en CI. Restent
 * les règles **génériques**, vraies pour tout prompt ; chacune est une
 * fonction pure dont un test sur des prompts fabriqués prouve qu'elle rougit
 * encore sur un défaut injecté, quel que soit le contenu réel.
 */
const PROMPTS_DIR = new URL('../content/prompts/', import.meta.url);

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

/** Tous les prompts présents sur le disque — zéro est permis (D131). */
function allPrompts(): PromptFile[] {
  return readdirSync(PROMPTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(new URL(`${d.name}/index.md`, PROMPTS_DIR)))
    .map((d) => readPrompt(d.name));
}

/**
 * Chaque variable déclarée a un nom non vide, n'est déclarée qu'une fois, et
 * paraît sous la forme `{nom}` dans le champ `prompt` de sa fiche.
 */
function variableDefects(p: PromptFile): string[] {
  const variables: PromptVariable[] = p.data.variables ?? [];
  if (variables.length === 0) return [];
  const defects: string[] = [];
  const names = variables.map((v) => String(v.name ?? ''));
  if (new Set(names).size !== names.length) defects.push(`${p.id}: variable déclarée deux fois`);
  if (typeof p.data.prompt !== 'string') return [...defects, `${p.id}: variables sans prompt`];
  for (const name of names) {
    if (name.trim() === '') defects.push(`${p.id}: variable sans nom`);
    else if (!p.data.prompt.includes(`{${name}}`)) defects.push(`${p.id}: {${name}} absent du prompt`);
  }
  return defects;
}

/** D110 : le corps littéral `No content` (reliquat d'import) n'est jamais publié. */
function bodyDefects(p: PromptFile): string[] {
  return p.body.includes('No content') ? [`${p.id}: corps « No content »`] : [];
}

describe('contenu des prompts — règles génériques (D65, D110, D131)', () => {
  // D131 : l'ancien garde-fou `declared > 0` rougissait dès que l'auteur
  // supprimait `bootstrap-session-anti-drift`, seul prompt à variables ; la
  // non-vacuité est prouvée par le test sur prompts fabriqués plus bas.
  it('every declared variable occurs in its prompt', () => {
    expect(allPrompts().flatMap(variableDefects)).toEqual([]);
  });

  // D131 : supprimés, instantanés d'une fiche nommée, sans règle générale à
  // en tirer —
  // · « bootstrap keeps its placeholders where the canonical template has
  //   them » (13 `{N}`, 4 `{topic}`… aux lignes du gabarit du plugin) ;
  // · « bootstrap renders byte-identical to the instance stored at the plan
  //   base (1e4ef42) » (SHA-256 du rendu) ;
  // · « bootstrap renders to 129 lines and ~2645 tokens at its defaults »
  //   (le calcul lui-même est couvert par `listCards.test.ts`) ;
  // · « macos-clone has 48 lines, one bullet per line, and an empty body » ;
  // · « macos-clone has no tab, trailing space or double space inside a
  //   line » (garde d'une mise en forme sourcée, plan 18 T4 : un blanc de
  //   l'auteur n'a pas à bloquer le déploiement).

  it('no prompt body is the literal No content', () => {
    expect(allPrompts().flatMap(bodyDefects)).toEqual([]);
  });

  // D131 : supprimé — « leaves the optional updated field empty (no sourced
  // date, D111) ». `updated` est un champ du CMS ; l'auteur, désormais source
  // de son contenu, peut le remplir sans bloquer le déploiement.

  it('each rule still flags an injected defect (fabricated prompts)', () => {
    const variables = [{ name: 'N', default: '4' }];
    expect(variableDefects({ id: 'ok', data: { prompt: 'Plan {N}', variables }, body: '' })).toEqual([]);
    expect(variableDefects({ id: 'x', data: { prompt: 'Plan 4', variables }, body: '' })).toEqual(['x: {N} absent du prompt']);
    expect(variableDefects({ id: 'x', data: { prompt: 'Plan {N}', variables: [...variables, ...variables] }, body: '' }))
      .toEqual(['x: variable déclarée deux fois']);
    expect(variableDefects({ id: 'x', data: { variables }, body: 'Plan {N}' })).toEqual(['x: variables sans prompt']);
    expect(bodyDefects({ id: 'ok', data: {}, body: '' })).toEqual([]);
    expect(bodyDefects({ id: 'x', data: {}, body: 'No content\n' })).toEqual(['x: corps « No content »']);
  });
});
