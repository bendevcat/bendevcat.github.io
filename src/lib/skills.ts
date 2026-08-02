import { getCollection, type CollectionEntry } from 'astro:content';

export type SkillEntry = CollectionEntry<'skills'>;

/** Ordre de la grille `/skills` — titre A→Z. Ne mute pas le tableau reçu. */
export function sortSkills(skills: SkillEntry[]): SkillEntry[] {
  return [...skills].sort((a, b) => a.data.title.localeCompare(b.data.title, 'fr'));
}

/** Union triée des types déclarés — alimente le filtre type. */
export function collectTypes(skills: SkillEntry[]): string[] {
  return [...new Set(skills.map((s) => s.data.type))].sort((a, b) => a.localeCompare(b, 'fr'));
}

/** Union triée des tags déclarés — alimente le `<select>` de filtre tag. */
export function collectSkillTags(skills: SkillEntry[]): string[] {
  return [...new Set(skills.flatMap((s) => s.data.tags))].sort((a, b) => a.localeCompare(b, 'fr'));
}

/** Skills publiés, triés — `draft: true` écartés (cf. `getSortedPrompts`). */
export async function getSortedSkills(): Promise<SkillEntry[]> {
  return sortSkills((await getCollection('skills')).filter((s) => !s.data.draft));
}
