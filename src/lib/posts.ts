import { getCollection, type CollectionEntry } from 'astro:content';

export function sortAndFilter(posts: CollectionEntry<'blog'>[]) {
  return posts
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

export async function getPublishedPosts() {
  return sortAndFilter(await getCollection('blog'));
}
