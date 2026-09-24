/**
 * Données de la fiche prompt (plan 16, inventaire §6) : skills liés, prompts
 * liés et emplacements méta (version · date, comptes).
 *
 * AUCUN import d'`astro:content` : fonctions pures sur des objets simples,
 * testables sans Astro — comme projectDetail.ts. La page passe des ids (ou
 * des références `{ id }` telles que chargées) et des clés de tag déjà
 * normalisées ; `null` veut dire « emplacement absent », jamais une chaîne
 * vide à masquer en CSS.
 */
import type { PromptStats } from './listCards';

/** Un id, ou une référence de collection telle que chargée (`{ collection, id }`). */
export type EntryRef = string | { id: string };

const refId = (ref: EntryRef) => (typeof ref === 'string' ? ref : ref.id);

export interface SkillLinkInput {
  id: string;
  draft?: boolean;
  relatedPrompts?: readonly EntryRef[];
}

/**
 * Skills liés d'un prompt : ses `relatedSkills` déclarés (ordre déclaré), puis
 * les skills dont `relatedPrompts` liste le prompt (ordre de `skills` — la
 * page passe la liste triée), chacun une fois. Seules les skills PUBLIÉES de
 * `skills` comptent : un brouillon ou un id inconnu n'a pas de page.
 */
export function relatedSkillIds(
  promptId: string,
  declared: readonly EntryRef[] | undefined,
  skills: readonly SkillLinkInput[],
): string[] {
  const published = new Set(skills.filter((skill) => !skill.draft).map((skill) => skill.id));
  const ids: string[] = [];
  const add = (id: string) => {
    if (published.has(id) && !ids.includes(id)) ids.push(id);
  };
  for (const ref of declared ?? []) add(refId(ref));
  for (const skill of skills) {
    if ((skill.relatedPrompts ?? []).some((ref) => refId(ref) === promptId)) add(skill.id);
  }
  return ids;
}

export interface PromptRelationInput {
  id: string;
  title: string;
  draft?: boolean;
  /** Skills liés du prompt (relatedSkillIds). */
  skillIds: readonly string[];
  /** Clés de tag normalisées par la page (`tagSlug`), pour que `Sécurité` = `securite`. */
  tagKeys: readonly string[];
}

const sharedCount = (a: readonly string[], b: readonly string[]) => {
  const other = new Set(b);
  return new Set(a.filter((key) => other.has(key))).size;
};

/**
 * Prompts liés : les autres prompts publiés qui partagent au moins une skill
 * liée ou un tag ; les plus partagés (skills + tags) d'abord, puis titre A→Z
 * (fr) ; `limit` au plus (3, inventaire §6). Jamais le prompt lui-même.
 */
export function relatedPromptIds(
  current: PromptRelationInput,
  prompts: readonly PromptRelationInput[],
  limit = 3,
): string[] {
  return prompts
    .filter((prompt) => prompt.id !== current.id && !prompt.draft)
    .map((prompt) => ({
      prompt,
      score: sharedCount(current.skillIds, prompt.skillIds) + sharedCount(current.tagKeys, prompt.tagKeys),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.prompt.title.localeCompare(b.prompt.title, 'fr'))
    .slice(0, limit)
    .map(({ prompt }) => prompt.id);
}

export interface PromptMetaSlots {
  /** `v<version>` ou `null`. */
  version: string | null;
  /** Date `updated` en fr-FR long (`1 juillet 2026`) ou `null`. */
  date: string | null;
  /** `v1.2 — 1 juillet 2026`, une seule des deux parties, ou `null` sans aucune. */
  versionDate: string | null;
  /** En-tête et Fiche technique : `129 lignes · ~2645 tokens`. */
  headerCounts: string;
  /** Barre de la fenêtre : `129 l. · ~2645 tk`. */
  windowCounts: string;
}

/** Singulier à 0 et 1, comme le veut le français. */
const plural = (count: number, word: string) => `${word}${count > 1 ? 's' : ''}`;

/**
 * Emplacements méta de la fiche prompt. Les comptes viennent de `promptStats`
 * sur le texte de la fenêtre aux défauts — les mêmes que la carte de
 * `/prompts/`. Date lue en UTC : `z.coerce.date('2026-07-01')` vaut minuit UTC.
 */
export function promptMetaSlots(
  data: { version?: string; updated?: Date },
  stats: PromptStats,
): PromptMetaSlots {
  const versionValue = data.version?.trim();
  const version = versionValue ? `v${versionValue}` : null;
  const date = data.updated
    ? data.updated.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    : null;
  const parts = [version, date].filter((part): part is string => part !== null);
  return {
    version,
    date,
    versionDate: parts.length > 0 ? parts.join(' — ') : null,
    headerCounts: `${stats.lines} ${plural(stats.lines, 'ligne')} · ~${stats.tokens} ${plural(stats.tokens, 'token')}`,
    windowCounts: `${stats.lines} l. · ~${stats.tokens} tk`,
  };
}
