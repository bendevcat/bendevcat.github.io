/**
 * Logique du patron « liste filtrable » (contrat visuel §5.1, Plan 7).
 *
 * AUCUN import d'`astro:content` : ce module est chargé par le navigateur
 * (src/scripts/list-pattern.ts) ET par les tests unitaires — comme
 * facetFilters.ts, dont il est le seul consommateur côté logique.
 *
 * Une seule fonction décide de TOUT ce que la page affiche. Le script de glue
 * n'a aucune décision à prendre : il lit le DOM, appelle computeListState(),
 * applique. C'est ce qui rend R4, R5, R6 et R7 testables sans navigateur.
 */
import { ALL, matchesFacets, type FacetSelection, type FacetValues } from './facetFilters';

export type SortOrder = 'none' | 'recent' | 'oldest' | 'shortest' | 'longest';

export interface ListEntry {
  id: string;
  facets: FacetValues;
  featured: boolean;
  date: number;
  minutes: number;
}

export interface FacetLabel {
  key: string;
  label: string;
}

export interface ListLabels {
  singular: string;
  plural: string;
  facets: FacetLabel[];
}

export interface ListState {
  visibleIds: string[];
  count: number;
  featuredId: string | null;
  meta: string;
  empty: string | null;
}

/** Vrai dès qu'une seule facette porte autre chose que la sentinelle. */
export function isAnyFacetActive(selected: FacetSelection): boolean {
  return Object.values(selected).some((value) => value !== ALL);
}

/** Les facettes actives, dans l'ordre d'affichage déclaré par la page. */
function activeFacets(selected: FacetSelection, labels: ListLabels): string[] {
  return labels.facets
    .filter((facet) => (selected[facet.key] ?? ALL) !== ALL)
    .map((facet) => `${facet.label} ${selected[facet.key]}`);
}

/**
 * Règle de dérivation de l'entrée à la une (spec §6.1) : `featured: true` là où
 * le champ existe, à défaut la PREMIÈRE entrée de l'ordre canonique. Exportée
 * pour que les pages l'appellent CÔTÉ SERVEUR et désignent exactement la même
 * entrée que le script — c'est ce qui permet de rendre le bloc « à la une »
 * avec une seule carte, et donc de ne pas afficher de doublon sans JavaScript.
 *
 * Contrainte générique en `T extends object` + paramètre `(T & { featured?
 * }...)[]` plutôt que `T extends { featured?: boolean }` directement (Défaut
 * de plan constaté — voir rapport de tâche) : cette dernière est un type
 * « faible » (toutes propriétés optionnelles) au sens de TypeScript, et le
 * test « à défaut, retient la première entrée » (Step 1) l'appelle avec des
 * littéraux `{ id: ... }` qui ne partagent AUCUNE propriété avec `{ featured?:
 * boolean }` — `tsc --strict` rejette alors l'appel (TS2353 / TS2345), quel
 * que soit le corps de la fonction. La forme ci-dessous accepte exactement
 * les mêmes appels réels (tableau d'objets, `featured` optionnel ou non) sans
 * jamais recourir à `any`, et sans toucher au test.
 */
export function pickFeaturedEntry<T extends object>(
  entries: (T & { featured?: boolean })[],
): T | null {
  return entries.find((entry) => entry.featured) ?? entries[0] ?? null;
}

/**
 * Comparateurs de tri. `none` préserve l'ordre canonique de la collection —
 * chaque lib de collection (posts.ts, projects.ts, prompts.ts, skills.ts) l'a
 * déjà appliqué côté serveur, on ne le recalcule pas ici.
 */
const COMPARATORS: Record<Exclude<SortOrder, 'none'>, (a: ListEntry, b: ListEntry) => number> = {
  recent: (a, b) => b.date - a.date,
  oldest: (a, b) => a.date - b.date,
  shortest: (a, b) => a.minutes - b.minutes,
  longest: (a, b) => b.minutes - a.minutes,
};

export function computeListState(
  entries: ListEntry[],
  selected: FacetSelection,
  order: SortOrder,
  labels: ListLabels,
): ListState {
  const filtered = entries.filter((entry) => matchesFacets(entry.facets, selected));

  // Ne mute jamais le tableau reçu (leçon de sortProjects, Plan 3).
  const sorted = order === 'none' ? [...filtered] : [...filtered].sort(COMPARATORS[order]);

  // R5 : l'entrée à la une n'existe QUE sans filtre. Règle de dérivation de la
  // spec §6.1 : `featured: true` là où le champ existe, à défaut la première
  // entrée de l'ordre canonique — ce qui, ici, est la première du tableau.
  const featured = isAnyFacetActive(selected) ? null : pickFeaturedEntry(sorted);

  const visibleIds = sorted.filter((entry) => entry.id !== featured?.id).map((entry) => entry.id);

  // R4 : le compte est celui des cartes RÉELLEMENT visibles — l'entrée à la une
  // en fait partie.
  const count = visibleIds.length + (featured ? 1 : 0);

  const active = activeFacets(selected, labels);
  const noun = count === 1 ? labels.singular : labels.plural;
  const meta = [`${count} ${noun}`, ...active].join(' · ');

  // R6 : contextualisé — le message nomme les facettes actives. Prose, donc
  // jamais en `font-mono` (contrainte globale n°7).
  const empty =
    count > 0
      ? null
      : active.length > 0
        ? `Aucun ${labels.singular} pour ${active.join(' et ')}.`
        : `Aucun ${labels.singular} à afficher.`;

  return { visibleIds, count, featuredId: featured?.id ?? null, meta, empty };
}
