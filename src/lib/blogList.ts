/**
 * Données du rail de /blog (plan 12, T5 ; inventaire §1 ; D73).
 *
 * - « Catégories » : `Tout` (tous les articles publiés) puis chaque catégorie
 *   UTILISÉE, dans l'ordre de `CATEGORIES` — une ligne à compte nul filtrerait
 *   la liste jusqu'au vide sans que l'utilisateur comprenne pourquoi.
 * - « Tags » : les tags des articles publiés, comptés une fois par article
 *   (même règle que /tags, via collectTagIndex) ; chaque puce mène à
 *   `/tags/<slug>/`.
 *
 * Les brouillons sont écartés ici même : la page passe déjà
 * getPublishedPosts(), mais le compte affiché ne doit pas dépendre de ce que
 * l'appelant a filtré.
 */
import { ALL } from './facetFilters';
import { collectTagIndex, type TagBuckets, type TagSummary } from './tags';

/** Libellé de la ligne de repos du rail — aussi `data-facet-all-label` (méta `catégorie : Tout`). */
export const ALL_CATEGORIES_LABEL = 'Tout';

export interface BlogPostLike {
  data: { category: string; tags?: string[]; draft?: boolean };
}

export interface CategoryRow {
  /** Valeur de facette : `ALL` pour `Tout`, sinon la catégorie. */
  value: string;
  label: string;
  count: number;
}

const published = <T extends BlogPostLike>(posts: T[]) => posts.filter((post) => !post.data.draft);

export function blogCategoryRows(posts: BlogPostLike[], categories: readonly string[]): CategoryRow[] {
  const live = published(posts);
  const used = categories
    .map((category) => ({
      value: category,
      label: category,
      count: live.filter((post) => post.data.category === category).length,
    }))
    .filter((row) => row.count > 0);
  return [{ value: ALL, label: ALL_CATEGORIES_LABEL, count: live.length }, ...used];
}

export function blogTagCloud(posts: BlogPostLike[]): TagSummary[] {
  // collectTagIndex ne lit que `data.tags` (TagEntryLike) ; son type d'entrée
  // nomme les collections Astro, d'où la conversion.
  const blog = published(posts) as unknown as TagBuckets['blog'];
  return collectTagIndex({ blog, projects: [], prompts: [], skills: [] });
}
