/**
 * Règles de présentation des résultats Pagefind — module PUR.
 *
 * AUCUN import (surtout pas `astro:content`) : ce module est chargé par le
 * navigateur (src/scripts/search.ts) ET par les tests unitaires.
 *
 * La collection est déduite du PREMIER SEGMENT de l'URL plutôt que d'un
 * `data-pagefind-meta` posé dans 4 gabarits : la règle devient une fonction
 * testable sans build, et il n'y a qu'un seul endroit à corriger si une
 * route change.
 */

export type SearchCollection = 'blog' | 'projects' | 'prompts' | 'skills';

/** Segment d'URL (routes FR, design §4) → clé de collection. */
const SEGMENT_TO_COLLECTION: Record<string, SearchCollection> = {
  blog: 'blog',
  projets: 'projects',
  prompts: 'prompts',
  skills: 'skills',
};

/** Libellé affiché en tête de groupe dans le modal. */
export const COLLECTION_LABELS: Record<SearchCollection, string> = {
  blog: 'Articles',
  projects: 'Projets',
  prompts: 'Prompts',
  skills: 'Skills',
};

/** Ordre d'affichage des groupes — figé, indépendant de l'ordre des résultats. */
export const COLLECTION_ORDER: SearchCollection[] = ['blog', 'projects', 'prompts', 'skills'];

export interface SearchResult {
  url: string;
  title: string;
  excerpt: string;
}

export interface SearchGroup {
  collection: SearchCollection;
  label: string;
  results: SearchResult[];
}

/**
 * Collection d'une URL de résultat, ou `null` hors des 4 collections.
 * Le segment est comparé en ENTIER : `/blogueurs/x/` n'est pas du blog.
 */
export function collectionFromUrl(url: string): SearchCollection | null {
  // Base arbitraire : n'est utilisée que si `url` est relative, et on ne lit
  // que le chemin — jamais l'hôte.
  let pathname: string;
  try {
    pathname = new URL(url, 'https://placeholder.invalid').pathname;
  } catch {
    return null;
  }
  const segment = pathname.split('/').filter(Boolean)[0];
  if (!segment) return null;
  // Une URL d'INDEX (`/blog/`) n'a qu'un segment : ce n'est pas une entrée.
  if (pathname.split('/').filter(Boolean).length < 2) return null;
  return SEGMENT_TO_COLLECTION[segment] ?? null;
}

/**
 * Groupe les résultats par collection, dans `COLLECTION_ORDER`.
 * Les résultats hors des 4 collections sont écartés — jamais regroupés sous
 * un intitulé fourre-tout. Aucun groupe vide n'est produit.
 */
export function groupResultsByCollection(results: SearchResult[]): SearchGroup[] {
  const buckets = new Map<SearchCollection, SearchResult[]>();
  for (const result of results) {
    const collection = collectionFromUrl(result.url);
    if (!collection) continue;
    const bucket = buckets.get(collection);
    if (bucket) bucket.push(result);
    else buckets.set(collection, [result]);
  }
  return COLLECTION_ORDER.filter((c) => buckets.has(c)).map((collection) => ({
    collection,
    label: COLLECTION_LABELS[collection],
    results: buckets.get(collection) as SearchResult[],
  }));
}
