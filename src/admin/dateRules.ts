/**
 * Règles de date appliquées à la sauvegarde CMS (plan 22, T3 — R4 ; D149).
 *
 * Fonctions pures, appelées par le hook `preSave` (`hooks.ts`) :
 *
 * - `blog` : un article **publié** (`draft` différent de `true` avant ET
 *   après — une première publication ne compte pas) dont le **corps** change
 *   reçoit `updatedDate` = maintenant. Le corps neuf est comparé après
 *   `normalizeThematicBreaks` (la forme que le hook écrit), au corps du
 *   fichier précédent lu comme Sveltia le lit (`previousEntry.ts`). Toute autre
 *   modification (titre, tags, couverture…) laisse les dates telles quelles.
 * - `prompts` : une `version` neuve non vide et différente de la précédente
 *   (`String(previous.version ?? '')`) donne `updated` = maintenant. Version
 *   inchangée ou vidée : rien.
 * - Jamais sur une nouvelle entrée (`newRecord`, duplicata compris), jamais
 *   quand l'état précédent est inconnu ou absent : dans le doute, les dates
 *   ne bougent pas (le hook émet alors un `console.warn`).
 *
 * `preSave` ne reçoit que les données neuves (Sveltia 0.221, `api/events.js`
 * `callEventHooks` › `createEntryMap` : `data`, `i18n`, `slug`, `path`,
 * `newRecord`, `collection`, `mediaFiles` — aucune valeur précédente) : l'état
 * précédent vient d'ailleurs (`previousEntry.ts`).
 *
 * Horodatage : `YYYY-MM-DDTHH:mm:ssZ` au décalage du navigateur, le format
 * des champs `datetime` de `config.yml` (celui qu'écrit le widget), secondes
 * à `00` (plan 22, F1 ; D151) : l'éditeur datetime de Sveltia 0.221 ne tient
 * que les minutes (`<input type="datetime-local">`, `getInputValue`) et
 * réécrirait `…:52` en `…:00` à la sauvegarde suivante, même sans
 * modification — la garde `cmsFrontmatter.ts` signale une telle valeur.
 */
import { normalizeThematicBreaks } from '../lib/thematicBreaks';

/** État du fichier engagé au chemin de l'entrée, avant cette sauvegarde. */
export type PreviousState =
  | { kind: 'found'; data: Record<string, unknown> }
  /** Aucun fichier à ce chemin : rien à comparer. */
  | { kind: 'new' }
  /** Source injoignable ou illisible : on ne touche à rien. */
  | { kind: 'unknown' };

/** Ce que les règles lisent de l'entrée en cours de sauvegarde. */
export interface SavingEntry {
  collection: string;
  newRecord: boolean;
  data: Record<string, unknown>;
}

/** Champ de date mis à jour, par collection concernée. */
export const DATE_FIELDS = { blog: 'updatedDate', prompts: 'updated' } as const;

const text = (value: unknown): string => (value === undefined || value === null ? '' : String(value));

/**
 * Une règle peut-elle s'appliquer, au vu des seules données neuves ? Sinon
 * l'état précédent n'est même pas cherché (pas de requête inutile).
 */
export function dateRuleMayApply({ collection, newRecord, data }: SavingEntry): boolean {
  if (newRecord) return false;
  if (collection === 'blog') return data.draft !== true;
  if (collection === 'prompts') return text(data.version) !== '';
  return false;
}

/**
 * Champs de date à écrire (vide : ne rien changer). `now` est déjà formaté
 * (`formatLocalTimestamp`).
 */
export function dateUpdates(entry: SavingEntry, previous: PreviousState, now: string): Record<string, string> {
  if (!dateRuleMayApply(entry) || previous.kind !== 'found') return {};
  const { collection, data } = entry;
  const before = previous.data;

  if (collection === 'blog') {
    if (before.draft === true) return {};
    const body = normalizeThematicBreaks(text(data.body));
    return body === text(before.body) ? {} : { [DATE_FIELDS.blog]: now };
  }

  if (collection === 'prompts') {
    const version = text(data.version);
    return version !== '' && version !== text(before.version) ? { [DATE_FIELDS.prompts]: now } : {};
  }

  return {};
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * `YYYY-MM-DDTHH:mm:ssZ` (dayjs) au décalage local, à la minute (secondes
 * `00`, comme le bouton « Maintenant » de l'éditeur) : `2026-09-25T14:03:00+02:00`.
 */
export function formatLocalTimestamp(date: Date): string {
  const offset = -date.getTimezoneOffset();
  const sign = offset < 0 ? '-' : '+';
  const abs = Math.abs(offset);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}
