import { getPublishedPosts } from './posts';
import { getSortedProjects, type ProjectEntry } from './projects';
import { getSortedPrompts, type PromptEntry } from './prompts';
import { getSortedSkills, type SkillEntry } from './skills';
import type { CollectionEntry } from 'astro:content';

/** Ordre d'affichage des groupes sur `/tags/<tag>` — figé. */
export const TAG_COLLECTIONS = ['blog', 'projects', 'prompts', 'skills'] as const;
export type TagCollection = (typeof TAG_COLLECTIONS)[number];

export const TAG_COLLECTION_LABELS: Record<TagCollection, string> = {
  blog: 'Articles',
  projects: 'Projets',
  prompts: 'Prompts',
  skills: 'Skills',
};

/** Le minimum qu'une entrée doit exposer pour être indexée par tag. */
export interface TagEntryLike {
  data: { tags?: string[] };
}

export interface TagBuckets {
  blog: CollectionEntry<'blog'>[];
  projects: ProjectEntry[];
  prompts: PromptEntry[];
  skills: SkillEntry[];
}

export interface TagSummary {
  slug: string;
  label: string;
  count: number;
}

/**
 * Clé d'URL d'un tag : minuscules, accents retirés, tout le reste réduit à des
 * tirets. `Sécurité` et `securite` tombent donc sur la MÊME page — c'est
 * voulu : les tags sont saisis à la main dans 4 collections et via le CMS,
 * deux graphies du même mot ne doivent pas produire deux pages orphelines.
 */
export function tagSlug(tag: string): string {
  return tag
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // marques diacritiques combinantes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Index de tous les tags des 4 collections.
 * Le libellé retenu est la PREMIÈRE graphie rencontrée dans l'ordre de
 * parcours `TAG_COLLECTIONS` — déterministe, donc le build est reproductible.
 * Tri : compte décroissant, puis libellé A→Z.
 */
export function collectTagIndex(buckets: TagBuckets): TagSummary[] {
  const index = new Map<string, TagSummary>();
  for (const collection of TAG_COLLECTIONS) {
    for (const entry of buckets[collection] as TagEntryLike[]) {
      // Dédoublonnage PAR ENTRÉE : `count` compte des entrées, pas des
      // occurrences (R2). Une entrée qui porte deux graphies du même tag
      // — `Kubernetes` et `kubernetes`, saisissables depuis /admin — ne doit
      // compter qu'une fois, sinon le badge annonce plus d'entrées que la
      // page n'en liste.
      const seen = new Set<string>();
      for (const tag of entry.data.tags ?? []) {
        const slug = tagSlug(tag);
        if (!slug || seen.has(slug)) continue;
        seen.add(slug);
        const existing = index.get(slug);
        if (existing) existing.count += 1;
        else index.set(slug, { slug, label: tag, count: 1 });
      }
    }
  }
  return [...index.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr'),
  );
}

/**
 * Entrées portant ce tag, comparé sur le SLUG.
 * L'ordre reçu est préservé : les helpers de collection (`getPublishedPosts`,
 * `getSorted*`) ont déjà appliqué l'ordre canonique — re-trier ici le
 * casserait en silence.
 */
export function entriesWithTag<T extends TagEntryLike>(entries: T[], slug: string): T[] {
  return entries.filter((entry) => (entry.data.tags ?? []).some((t) => tagSlug(t) === slug));
}

/**
 * Les 4 collections publiées, chacune dans son ordre canonique.
 * `draft: true` est déjà écarté par chaque helper : une entrée non publiée
 * n'a pas de route, la lister depuis un tag produirait un lien mort.
 */
export async function getTagBuckets(): Promise<TagBuckets> {
  const [blog, projects, prompts, skills] = await Promise.all([
    getPublishedPosts(),
    getSortedProjects(),
    getSortedPrompts(),
    getSortedSkills(),
  ]);
  return { blog, projects, prompts, skills };
}
