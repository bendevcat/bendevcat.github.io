/**
 * Données de la page article (plan 13, T1 ; inventaire §2 ; prototype
 * 230–342 ; D86).
 *
 * AUCUN import d'`astro:content` : ces fonctions ne lisent que la forme des
 * entrées (`id`, `data.category`, `data.pubDate`, `data.draft`) et des titres
 * rendus (`depth`, `slug`, `text`), ce qui les rend testables sans Astro.
 *
 * Les brouillons sont écartés ici même, comme dans blogList.ts : l'appelant
 * passe déjà getPublishedPosts(), mais un voisin ou un article lié ne doit
 * jamais dépendre de ce filtrage.
 */
import { ALL } from './facetFilters';
import { CATEGORY_QUERY_PARAM } from './listPattern';

export interface ArticlePostLike {
  id: string;
  data: { category: string; pubDate: Date; draft?: boolean };
}

export interface HeadingLike {
  depth: number;
  slug: string;
  text: string;
}

export interface TocEntry {
  depth: 2 | 3;
  slug: string;
  text: string;
  /** Un h3 est décalé de 14 px sous son h2 (Design rules, Sommaire). */
  indented: boolean;
}

/** Nombre d'articles liés dans le rail gauche (prototype : 3 cartes). */
export const RELATED_LIMIT = 3;

/**
 * Articles publiés, pubDate desc. Tri stable : deux articles publiés au même
 * instant gardent l'ordre reçu — celui de la collection, comme
 * getPublishedPosts() (`docker-…` avant `k9s-…`). Ne mute pas l'entrée.
 */
function canonical<T extends ArticlePostLike>(posts: readonly T[]): T[] {
  return posts
    .filter((post) => !post.data.draft)
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

/**
 * « Articles liés » (R1) : jusqu'à `limit` articles publiés de la même
 * catégorie, du plus récent au plus ancien, jamais l'article lui-même. Liste
 * vide quand la catégorie n'a pas d'autre article : le bloc est alors omis.
 */
export function relatedPosts<T extends ArticlePostLike>(
  post: ArticlePostLike,
  posts: readonly T[],
  limit: number = RELATED_LIMIT,
): T[] {
  return canonical(posts)
    .filter((other) => other.id !== post.id && other.data.category === post.data.category)
    .slice(0, limit);
}

/**
 * Précédent / suivant (R2, D86) dans l'ordre canonique, SANS bouclage :
 * `previous` = l'article immédiatement plus ancien (tuile `← précédent`, à
 * gauche), `next` = l'article immédiatement plus récent (`suivant →`, à
 * droite). Le plus récent n'a pas de suivant, le plus ancien pas de
 * précédent ; un article absent de la liste n'a ni l'un ni l'autre.
 */
export function adjacentPosts<T extends ArticlePostLike>(
  post: ArticlePostLike,
  posts: readonly T[],
): { previous: T | null; next: T | null } {
  const ordered = canonical(posts);
  const index = ordered.findIndex((other) => other.id === post.id);
  if (index === -1) return { previous: null, next: null };
  return {
    previous: ordered[index + 1] ?? null,
    next: index > 0 ? ordered[index - 1] : null,
  };
}

/**
 * Entrées du Sommaire (R3) : les h2 et h3 seuls, dans l'ordre du document,
 * les h3 marqués `indented`. Liste vide → le Sommaire est omis.
 */
export function tocEntries(headings: readonly HeadingLike[]): TocEntry[] {
  return headings
    .filter((heading): heading is HeadingLike & { depth: 2 | 3 } =>
      heading.depth === 2 || heading.depth === 3,
    )
    .map(({ depth, slug, text }) => ({ depth, slug, text, indented: depth === 3 }));
}

/**
 * Lien d'une ligne « Catégories » du rail d'article (D86) : `Tout` (valeur
 * `ALL`) → `/blog/` ; une catégorie → `/blog/?categorie=<valeur encodée>`,
 * que /blog lit au chargement (listPattern.ts, facetsFromQuery).
 */
export function categoryHref(value: string): string {
  return value === ALL
    ? '/blog/'
    : `/blog/?${CATEGORY_QUERY_PARAM}=${encodeURIComponent(value)}`;
}
