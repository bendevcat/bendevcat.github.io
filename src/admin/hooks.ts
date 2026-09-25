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
 */
import { normalizeThematicBreaks } from '../lib/thematicBreaks';

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
