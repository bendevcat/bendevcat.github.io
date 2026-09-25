/**
 * Données des cartes de liste (plan 14, T2) : `/prompts`, `/skills` et le
 * héros de `/projets`.
 *
 * AUCUN import d'`astro:content` : fonctions pures sur des objets simples
 * (`entry.data`, `entry.body`), testables sans Astro — comme home.ts. Les
 * composants de carte n'ont qu'à afficher les chaînes rendues ici ; `null`
 * veut dire « emplacement absent », jamais une chaîne vide à masquer en CSS.
 */
import type { PromptFormat } from './promptView';
import { promptWindowSource, renderPromptText, type PromptVariable } from './promptWindow';

export interface PromptStats {
  lines: number;
  tokens: number;
}

/**
 * Le texte mesuré par la carte (D94) — et affiché par la fenêtre de la fiche
 * prompt (plan 16) : ce que la fiche présente comme sa valeur. Le champ
 * `prompt` d'une fiche qui en a un, ses variables déclarées rendues à leur
 * défaut (`{name}` sans défaut), sinon le corps, tel quel. Rogné, pour que les
 * lignes vides de bord (fin de fichier, saut après le frontmatter) ne
 * comptent pas. Source unique : promptWindowSource (src/lib/promptWindow.ts).
 */
export function measurePromptText(
  data: { format: PromptFormat; prompt?: string; variables?: readonly PromptVariable[] },
  body: string | undefined,
): string {
  const source = promptWindowSource(data, body);
  return renderPromptText(source.template, source.variables);
}

/**
 * Lignes = nombre de `\n` + 1 ; jetons = caractères / 4 arrondi (D94).
 * Un texte vide compte 0 ligne et 0 jeton (rien à mesurer).
 */
export function promptStats(text: string): PromptStats {
  if (text.length === 0) return { lines: 0, tokens: 0 };
  return {
    lines: text.split('\n').length,
    tokens: Math.round(text.length / 4),
  };
}

/** `v<version>`, ou `null` quand le champ est absent ou blanc. */
function versionSlot(version: string | undefined): string | null {
  const value = version?.trim();
  return value ? `v${value}` : null;
}

/** `1 variable`, `2 variables`… ; `null` à 0 (l'emplacement disparaît). */
function variablesSlot(variables: readonly unknown[] | undefined): string | null {
  const count = variables?.length ?? 0;
  if (count === 0) return null;
  return `${count} ${count === 1 ? 'variable' : 'variables'}`;
}

export interface PromptCardData {
  format: PromptFormat;
  tool: string;
  /** `v<version>` ou `null`. */
  version: string | null;
  /** `N variable(s)` ou `null`. */
  variables: string | null;
  /** `N l.` */
  lines: string;
  /** `~N tk`, sans séparateur de milliers. */
  tokens: string;
}

export function promptCardData(
  data: {
    format: PromptFormat;
    tool: string;
    prompt?: string;
    version?: string;
    variables?: readonly PromptVariable[];
  },
  body?: string,
): PromptCardData {
  const stats = promptStats(measurePromptText(data, body));
  return {
    format: data.format,
    tool: data.tool,
    version: versionSlot(data.version),
    variables: variablesSlot(data.variables),
    lines: `${stats.lines} l.`,
    tokens: `~${stats.tokens} tk`,
  };
}

/**
 * Résumé de contenu d'une skill (D94) : ses prompts liés PUBLIÉS —
 * `2 prompts`, `1 prompt`, `null` à 0. Reçoit les entrées résolues (après
 * assertEntriesResolved) ; un brouillon lié ne compte pas, il n'a pas de page.
 */
export function relatedPromptsSummary(
  related: readonly { data: { draft?: boolean } }[] | undefined,
): string | null {
  const count = (related ?? []).filter((entry) => !entry.data.draft).length;
  if (count === 0) return null;
  return `${count} ${count === 1 ? 'prompt' : 'prompts'}`;
}

/** `1 skill`, `7 commandes`… ; `null` à 0 ou sans valeur (la partie disparaît). */
function countPart(count: number | undefined, singular: string, plural: string): string | null {
  if (!count || count <= 0) return null;
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * Résumé de contenu d'une skill (plan 17, D117) — partagé par la carte de
 * `/skills/` et l'en-tête de la fiche : `N skill(s) · N commande(s) ·
 * N prompt(s)`, dans cet ordre, chaque partie omise à 0 ou sans valeur ;
 * `null` quand aucune ne reste. Les prompts sont les prompts liés PUBLIÉS
 * (relatedPromptsSummary).
 */
export function skillContentSummary(
  data: { skillCount?: number; commandCount?: number },
  related: readonly { data: { draft?: boolean } }[] | undefined,
): string | null {
  const parts = [
    countPart(data.skillCount, 'skill', 'skills'),
    countPart(data.commandCount, 'commande', 'commandes'),
    relatedPromptsSummary(related),
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export interface SkillCardData {
  type: string;
  license: string | null;
  /** `v<version>` ou `null`. */
  version: string | null;
  /** La commande d'installation telle qu'écrite, ou `null`. */
  install: string | null;
  /** `N skill(s) · N commande(s) · N prompt(s)` ou `null` (skillContentSummary). */
  summary: string | null;
}

export function skillCardData(
  data: {
    type: string;
    license?: string;
    version?: string;
    installCmd?: string;
    skillCount?: number;
    commandCount?: number;
  },
  related: readonly { data: { draft?: boolean } }[] | undefined,
): SkillCardData {
  return {
    type: data.type,
    license: data.license?.trim() || null,
    version: versionSlot(data.version),
    // Telle qu'écrite (check-lists compare la carte à `installCmd`).
    install: data.installCmd?.trim() ? data.installCmd : null,
    summary: skillContentSummary(data, related),
  };
}

/**
 * `depuis <mois année>` du héros de `/projets` (D93), `null` sans date.
 * Lu en UTC : `z.coerce.date('2026-07-30')` vaut minuit UTC, un fuseau
 * négatif ferait sinon glisser un 1er du mois dans le mois précédent.
 */
export function featuredSince(startDate: Date | undefined): string | null {
  if (!startDate) return null;
  const month = startDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return `depuis ${month}`;
}
