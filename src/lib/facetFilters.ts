/**
 * Moteur de filtrage à facettes, partagé par /prompts et /skills — et, via
 * l'adaptateur `projectFilters.ts`, par /projets.
 *
 * AUCUN import ici — surtout pas `astro:content`. Ce module est chargé par le
 * navigateur (src/scripts/facet-filters.ts) ET par les tests unitaires ; le
 * garder sans dépendance est ce qui rend les deux possibles.
 *
 * Toutes les valeurs d'entrée sont des tableaux, même les facettes
 * mono-valeur (`format: ['fiche']`) : le prédicat n'a alors qu'un seul cas à
 * traiter, et une facette mono-valeur peut devenir multi sans rien changer
 * ici.
 */

/** Valeur sentinelle « aucun filtre » — jamais une valeur de facette réelle. */
export const ALL = '__all__';

/** Facettes d'une entrée : clé → valeurs portées par cette entrée. */
export type FacetValues = Record<string, string[]>;

/** Sélection courante : clé → valeur choisie, ou `ALL`. */
export type FacetSelection = Record<string, string>;

/**
 * Vrai si l'entrée satisfait TOUTES les facettes sélectionnées (ET).
 * Une facette sélectionnée mais absente de l'entrée exclut l'entrée — c'est
 * volontaire : filtrer sur `tag: 'ia'` ne doit pas laisser passer une entrée
 * sans tag.
 */
export function matchesFacets(entry: FacetValues, selected: FacetSelection): boolean {
  return Object.entries(selected).every(
    ([key, value]) => value === ALL || (entry[key] ?? []).includes(value),
  );
}
