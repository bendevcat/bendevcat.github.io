import { getCollection, type CollectionEntry } from 'astro:content';

export function sortAndFilter(posts: CollectionEntry<'blog'>[]) {
  return posts
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

export async function getPublishedPosts() {
  return sortAndFilter(await getCollection('blog'));
}

/**
 * Estimation grossière (~200 mots/min, arrondi au supérieur, minimum 1 min).
 * Reprise verbatim d'ArticleCard.astro (Plan 1) : ce plan la déplace pour que
 * le tri « court / long » (R7) et la carte lisent le MÊME nombre. Changer la
 * formule ici changerait un affichage livré — ce serait une déviation.
 */
export function estimateReadingMinutes(body: string): number {
  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}
