/**
 * Hooks d'événements de Sveltia CMS (plan 19, R13/R14).
 *
 * L'éditeur riche (`@sveltia/ui`, `transformers/hr.js`) lit `---`, `***` et
 * `___` comme un séparateur thématique mais les réécrit tous en `***`. Le
 * contenu n'admet que `---` (garde : `src/lib/thematicBreaks.test.ts`, lancé
 * par la CI) : le hook `preSave` remet donc le corps en forme avant écriture.
 *
 * Contrat vérifié dans `@sveltia/cms` 0.221.0 (`types/public.d.ts`,
 * `AppEventListener`, et `dist/sveltia-cms.mjs`) : le handler reçoit
 * `{ author, entry }`, `entry` étant une Map Immutable construite par
 * `fromJS({ data, i18n, slug, path, … })` — le corps est donc
 * `entry.get('data').get('body')`. Pour `preSave` seulement, si le handler
 * renvoie une Map, Sveltia en fait `toJS()` et, si elle a `data` et `i18n`,
 * remplace le contenu de la locale par défaut par `data`. Toute autre valeur de
 * retour est ignorée. Le hook renvoie donc `entry.setIn(['data', 'body'], …)`,
 * ou l'entrée reçue telle quelle quand il n'y a rien à changer.
 *
 * Plan 22 (T3, R6 ; D149) : UN seul handler `preSave`, `createSaveHooks().preSave`,
 * enchaîne dans cet ordre fixe (`PRE_SAVE_STEPS`) les séparateurs puis les
 * règles de date (`dateRules.ts`), celles-ci lisant l'entrée déjà normalisée.
 * L'état précédent vient de `previousEntry.ts` ; le handler `postSave` y
 * retient ce qui vient d'être écrit. Sveltia attend chaque handler l'un après
 * l'autre (`callEventHooks`) : un seul handler rend l'ordre indépendant de
 * celui des enregistrements. Une erreur des règles de date ne bloque jamais la
 * sauvegarde : l'entrée repart sans date modifiée (`console.warn`).
 */
import { normalizeThematicBreaks } from '../lib/thematicBreaks';
import { dateRuleMayApply, dateUpdates, formatLocalTimestamp, type SavingEntry } from './dateRules';
import type { PreviousEntries } from './previousEntry';

/** Ce que le hook lit de la Map Immutable passée par Sveltia. */
export interface EntryMap {
  get(key: string): unknown;
  setIn(keyPath: string[], value: unknown): EntryMap;
}

interface DataMap {
  get(key: string): unknown;
}

const isDataMap = (value: unknown): value is DataMap =>
  value !== null && typeof value === 'object' && typeof (value as DataMap).get === 'function';

/** Handler `preSave` : réécrit en `---` les séparateurs du champ `body`. */
export function normalizeBodyBeforeSave<E extends EntryMap>({ entry }: { author: unknown; entry: E }): E {
  const data = entry.get('data');
  if (!isDataMap(data)) return entry;

  const body = data.get('body');
  if (typeof body !== 'string') return entry;

  const normalized = normalizeThematicBreaks(body);
  return normalized === body ? entry : (entry.setIn(['data', 'body'], normalized) as E);
}

/** Handler `preSave` : champs de date selon `dateRules.ts` (état précédent lu à `path`). */
export async function applyDateRulesBeforeSave<E extends EntryMap>(
  { entry }: { author: unknown; entry: E },
  { previous, now = () => new Date(), warn = console.warn }: SaveHookDeps,
): Promise<E> {
  try {
    const data = entry.get('data');
    const collection = entry.get('collection');
    const path = entry.get('path');
    if (!isDataMap(data) || typeof collection !== 'string') return entry;

    const saving: SavingEntry = {
      collection,
      newRecord: entry.get('newRecord') === true,
      data: { draft: data.get('draft'), body: data.get('body'), version: data.get('version') },
    };
    if (!dateRuleMayApply(saving)) return entry;
    if (typeof path !== 'string' || path === '') {
      warn(`dates : chemin de l'entrée inconnu, dates inchangées (${collection})`);
      return entry;
    }

    const state = await previous.lookup(path);
    if (state.kind === 'unknown') {
      warn(`dates : état précédent de ${path} introuvable, dates inchangées`);
      return entry;
    }

    let result = entry;
    for (const [key, value] of Object.entries(dateUpdates(saving, state, formatLocalTimestamp(now())))) {
      result = result.setIn(['data', key], value) as E;
    }
    return result;
  } catch (error) {
    warn('dates : règle non appliquée, dates inchangées', error);
    return entry;
  }
}

export interface SaveHookDeps {
  previous: PreviousEntries;
  now?: () => Date;
  warn?: (...args: unknown[]) => void;
}

/** Étapes du handler `preSave`, dans l'ordre où elles s'appliquent. */
export const PRE_SAVE_STEPS = ['séparateurs', 'dates'] as const;

interface JsMap {
  toJS(): unknown;
}

const isJsMap = (value: unknown): value is JsMap =>
  value !== null && typeof value === 'object' && typeof (value as JsMap).toJS === 'function';

/** Les deux handlers enregistrés par `cms.ts`. */
export function createSaveHooks(deps: SaveHookDeps) {
  const steps = {
    séparateurs: async <E extends EntryMap>(args: { author: unknown; entry: E }) => normalizeBodyBeforeSave(args),
    dates: <E extends EntryMap>(args: { author: unknown; entry: E }) => applyDateRulesBeforeSave(args, deps),
  };
  return {
    /** Séparateurs puis dates, sur l'entrée renvoyée par l'étape précédente. */
    async preSave<E extends EntryMap>({ author, entry }: { author: unknown; entry: E }): Promise<E> {
      let current = entry;
      for (const step of PRE_SAVE_STEPS) current = await steps[step]({ author, entry: current });
      return current;
    },
    /** Retient les données écrites à `path` : la sauvegarde suivante s'y compare. */
    postSave({ entry }: { author: unknown; entry: EntryMap }): void {
      const path = entry.get('path');
      const data = entry.get('data');
      if (typeof path !== 'string' || path === '' || !isJsMap(data)) return;
      const plain = data.toJS();
      if (plain !== null && typeof plain === 'object') deps.previous.remember(path, plain as Record<string, unknown>);
    },
  };
}
