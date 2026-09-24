/**
 * Logique de sélection de la page d'accueil (Plan 9, « Home map »).
 *
 * AUCUN import d'`astro:content` : fonctions pures, génériques sur des objets
 * simples, testables sans Astro (comme listPattern.ts). La page appelle
 * getPublishedPosts() / getSorted*() puis délègue ici le choix des entrées.
 */
import { pickFeaturedEntry } from './listPattern';

export interface HomePosts<T> {
  featured: T | null;
  latest: T[];
}

/**
 * L'article « à la une » et les « Derniers articles ».
 *
 * `featured` passe par pickFeaturedEntry() — la MÊME règle de dérivation que
 * `/blog` (spec §6.1 : `featured: true`, à défaut la première entrée de
 * l'ordre canonique). Les deux pages désignent donc toujours le même article,
 * à condition de recevoir le même tableau : celui de getPublishedPosts(),
 * jamais un tableau retrié.
 *
 * `latest` : les `latestCount` articles suivants dans l'ordre canonique,
 * l'article à la une exclu où qu'il soit dans la liste. L'exclusion se fait
 * par identité d'objet (pas par `id`) pour rester générique : l'entrée
 * retournée par pickFeaturedEntry() est l'élément même du tableau reçu.
 * Moins d'articles restants → moins d'éléments, jamais de remplissage.
 */
export function pickHomePosts<T extends object>(
  posts: (T & { featured?: boolean })[],
  latestCount = 3,
): HomePosts<T> {
  const featured = pickFeaturedEntry(posts);
  const latest = posts.filter((post) => post !== featured).slice(0, latestCount);
  return { featured, latest };
}

/**
 * Les `count` premières entrées d'une section (Projets · Prompts · Skills),
 * dans l'ordre reçu — celui des pages de liste (getSorted*()), qu'on ne
 * recalcule pas ici. Ne mute jamais le tableau reçu.
 */
export function takeSectionEntries<T>(entries: readonly T[], count = 2): T[] {
  return entries.slice(0, count);
}
