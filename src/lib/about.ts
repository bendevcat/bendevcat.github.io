/**
 * Données de la page /a-propos (plan 10, About map ; D26, D42).
 *
 * AUCUN import d'`astro:content` : fonctions pures sur des objets simples,
 * testables sans Astro (comme home.ts). La page lit les collections
 * (getPublishedPosts, getSorted*, getTagBuckets → collectTagIndex) puis
 * délègue ici la mise en forme du terminal `whoami --long` et de la boîte à
 * outils.
 *
 * Aucune valeur inventée ni reprise du prototype : chaque ligne vient d'un
 * texte de l'auteur (ABOUT_FACTS) ou d'une dérivation du dépôt ; une ligne
 * dont la source est vide n'est pas affichée.
 */

/**
 * Faits d'identité, tirés des textes existants de l'auteur :
 * - `name`, `alias` : le `<h1>` de l'ancien Hero.astro
 *   (« Benoît Catillon, alias benCat_ ») — la page les réutilise pour son `<h1>` ;
 * - `role`, `place` : « Ingénieur DevOps depuis 2019, en France. »
 *   (paragraphe « Qui je suis » de /a-propos) ;
 * - `rule` : le titre « L'IA : une aide, pas un ghostwriter » de /a-propos.
 */
export const ABOUT_FACTS = {
  name: 'Benoît Catillon',
  alias: 'benCat_',
  role: 'ingénieur DevOps depuis 2019',
  place: 'France',
  rule: 'une aide, pas un ghostwriter',
} as const;

/** Clés du terminal, dans l'ordre d'affichage. */
export const WHOAMI_KEYS = ['nom', 'alias', 'rôle', 'lieu', 'terrain', 'écrit', 'stack', 'règle'] as const;
export type WhoamiKey = (typeof WHOAMI_KEYS)[number];

export interface WhoamiLine {
  key: WhoamiKey;
  value: string;
}

/** Nombre d'entrées publiées par collection (drafts déjà écartés par les helpers). */
export interface PublishedCounts {
  articles: number;
  projets: number;
  prompts: number;
  skills: number;
}

export interface WhoamiSource {
  name: string;
  alias: string;
  role: string;
  place: string;
  rule: string;
  /** Index des tags DÉJÀ trié (collectTagIndex : compte décroissant, puis libellé). */
  tags: readonly { label: string }[];
  counts: PublishedCounts;
  /** Boîte à outils (collectStack). */
  stack: readonly string[];
}

/** Séparateur des listes du terminal. */
const SEP = ' · ';

/** Libellés singulier / pluriel de la ligne `écrit`, dans l'ordre d'affichage. */
const COUNT_LABELS: Record<keyof PublishedCounts, [string, string]> = {
  articles: ['article', 'articles'],
  projets: ['projet', 'projets'],
  prompts: ['prompt', 'prompts'],
  skills: ['skill', 'skills'],
};

/**
 * Union des `stack` des projets, chaque élément une seule fois, dans l'ordre
 * reçu (celui de getSortedProjects(), puis l'ordre de saisie dans chaque
 * fiche). Comparaison exacte après `trim` — la même égalité que le filtre
 * stack de /projets (collectStacks) ; les éléments vides sont ignorés.
 */
export function collectStack(projects: readonly { data: { stack?: readonly string[] } }[]): string[] {
  const seen = new Set<string>();
  for (const project of projects) {
    for (const raw of project.data.stack ?? []) {
      const item = raw.trim();
      if (item) seen.add(item);
    }
  }
  return [...seen];
}

/** « 5 articles · 2 projets · … » ; une collection à 0 est omise. */
function formatCounts(counts: PublishedCounts): string {
  return (Object.keys(COUNT_LABELS) as (keyof PublishedCounts)[])
    .filter((key) => counts[key] > 0)
    .map((key) => `${counts[key]} ${COUNT_LABELS[key][counts[key] === 1 ? 0 : 1]}`)
    .join(SEP);
}

/**
 * Lignes `clé: valeur` du terminal `whoami --long`, dans l'ordre WHOAMI_KEYS :
 * `terrain` = les 3 premiers libellés de l'index des tags, `écrit` = les
 * comptes publiés, `stack` = la boîte à outils. Une ligne dont la valeur est
 * vide est retirée (D26).
 */
export function whoamiLines(source: WhoamiSource): WhoamiLine[] {
  const values: Record<WhoamiKey, string> = {
    nom: source.name,
    alias: source.alias,
    rôle: source.role,
    lieu: source.place,
    terrain: source.tags.slice(0, 3).map((tag) => tag.label).join(SEP),
    écrit: formatCounts(source.counts),
    stack: source.stack.join(SEP),
    règle: source.rule,
  };
  return WHOAMI_KEYS.map((key) => ({ key, value: values[key].trim() })).filter((line) => line.value !== '');
}
