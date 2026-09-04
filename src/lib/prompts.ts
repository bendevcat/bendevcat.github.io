import { getCollection, type CollectionEntry } from 'astro:content';

export type PromptEntry = CollectionEntry<'prompts'>;

/**
 * Ordre de la grille `/prompts` — titre A→Z (`localeCompare` en 'fr').
 * Le schéma §3.3 n'a ni date ni `featured` : il n'existe pas d'ordre
 * chronologique possible. Ne mute pas le tableau reçu.
 */
export function sortPrompts(prompts: PromptEntry[]): PromptEntry[] {
  return [...prompts].sort((a, b) => a.data.title.localeCompare(b.data.title, 'fr'));
}

/** Union triée des outils déclarés — alimente le `<select>` de filtre outil. */
export function collectTools(prompts: PromptEntry[]): string[] {
  return [...new Set(prompts.map((p) => p.data.tool))].sort((a, b) => a.localeCompare(b, 'fr'));
}

/** Union triée des tags déclarés — alimente le `<select>` de filtre tag. */
export function collectPromptTags(prompts: PromptEntry[]): string[] {
  return [...new Set(prompts.flatMap((p) => p.data.tags))].sort((a, b) => a.localeCompare(b, 'fr'));
}

/**
 * Filtre les `draft: true` puis trie — même règle que le blog
 * (`sortAndFilter`, src/lib/posts.ts) : pas de route publique, donc les lier
 * depuis un skill produirait un lien mort.
 */
export function sortAndFilterPrompts(prompts: PromptEntry[]): PromptEntry[] {
  return sortPrompts(prompts.filter((p) => !p.data.draft));
}

/** Prompts publiés, triés. */
export async function getSortedPrompts(): Promise<PromptEntry[]> {
  return sortAndFilterPrompts(await getCollection('prompts'));
}
