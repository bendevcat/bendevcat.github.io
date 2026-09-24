/**
 * Logique du patron « liste filtrable » (contrat visuel §5.1, Plan 7).
 *
 * AUCUN import d'`astro:content` : ce module est chargé par le navigateur
 * (src/scripts/list-pattern.ts) ET par les tests unitaires — comme
 * facetFilters.ts, dont il est le seul consommateur côté logique.
 *
 * Une seule fonction décide de TOUT ce que la page affiche. Le script de glue
 * n'a aucune décision à prendre : il lit le DOM, appelle computeListState(),
 * applique. C'est ce qui rend R4, R5, R6 et R7 testables sans navigateur.
 */
import { ALL, matchesFacets, type FacetSelection, type FacetValues } from './facetFilters';

export type SortOrder = 'none' | 'recent' | 'oldest' | 'shortest' | 'longest';

export interface ListEntry {
  id: string;
  facets: FacetValues;
  featured: boolean;
  date: number;
  minutes: number;
}

export interface FacetLabel {
  key: string;
  label: string;
  /**
   * Libellé de repos (plan 12, D75 — `data-facet-all-label`, ex. `Tout`).
   * Une facette qui le déclare s'écrit TOUJOURS `libellé : valeur` dans la
   * ligne de méta, au repos compris (`catégorie : Tout`). Sans lui, la facette
   * garde le format historique `libellé valeur`, et seulement quand elle est
   * active.
   */
  allLabel?: string;
}

export interface ListLabels {
  singular: string;
  plural: string;
  facets: FacetLabel[];
}

/**
 * Options du calcul (plan 12, T4). `featured: false` — la page ne rend aucun
 * `[data-list-featured]` (/blog, D75) : aucune entrée n'est désignée, toutes
 * restent dans la liste et suivent le tri. Par défaut `true` : /projets,
 * /prompts et /skills gardent l'entrée à la une.
 */
export interface ListOptions {
  featured?: boolean;
}

export interface ListState {
  visibleIds: string[];
  count: number;
  featuredId: string | null;
  meta: string;
  empty: string | null;
}

/** Vrai dès qu'une seule facette porte autre chose que la sentinelle. */
export function isAnyFacetActive(selected: FacetSelection): boolean {
  return Object.values(selected).some((value) => value !== ALL);
}

/** Les facettes actives, dans l'ordre d'affichage déclaré par la page. */
function activeFacets(selected: FacetSelection, labels: ListLabels): string[] {
  return labels.facets
    .filter((facet) => (selected[facet.key] ?? ALL) !== ALL)
    .map((facet) => `${facet.label} ${selected[facet.key]}`);
}

/**
 * Les facettes de la ligne de méta (plan 12, D75), dans l'ordre déclaré : une
 * facette à libellé de repos y figure toujours, en `libellé : valeur`
 * (`catégorie : Tout`, puis `catégorie : DevOps`) ; les autres n'y figurent
 * qu'actives, au format historique `libellé valeur`. L'état vide, lui, ne
 * nomme que les facettes actives (activeFacets) — une phrase, pas une ligne
 * de données.
 */
function metaFacets(selected: FacetSelection, labels: ListLabels): string[] {
  return labels.facets.flatMap((facet) => {
    const value = selected[facet.key] ?? ALL;
    if (facet.allLabel !== undefined) {
      return [`${facet.label} : ${value === ALL ? facet.allLabel : value}`];
    }
    return value === ALL ? [] : [`${facet.label} ${value}`];
  });
}

/**
 * Énumération française : `a`, `a et b`, `a, b et c` (Fix 4, revue finale).
 * Joindre TOUT avec ' et ' donnait « outil Claude et format guide et tag
 * prompt-engineering » dès trois facettes actives — « et » ne doit relier que
 * le dernier terme, les autres se séparent par une virgule.
 */
function joinWithEt(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`;
}

/**
 * Règle de dérivation de l'entrée à la une (spec §6.1) : `featured: true` là où
 * le champ existe, à défaut la PREMIÈRE entrée de l'ordre canonique. Exportée
 * pour que les pages l'appellent CÔTÉ SERVEUR et désignent exactement la même
 * entrée que le script — c'est ce qui permet de rendre le bloc « à la une »
 * avec une seule carte, et donc de ne pas afficher de doublon sans JavaScript.
 *
 * Contrainte générique en `T extends object` + paramètre `(T & { featured?
 * }...)[]` plutôt que `T extends { featured?: boolean }` directement (Défaut
 * de plan constaté — voir rapport de tâche) : cette dernière est un type
 * « faible » (toutes propriétés optionnelles) au sens de TypeScript, et le
 * test « à défaut, retient la première entrée » (Step 1) l'appelle avec des
 * littéraux `{ id: ... }` qui ne partagent AUCUNE propriété avec `{ featured?:
 * boolean }` — `tsc --strict` rejette alors l'appel (TS2353 / TS2345), quel
 * que soit le corps de la fonction. La forme ci-dessous accepte exactement
 * les mêmes appels réels (tableau d'objets, `featured` optionnel ou non) sans
 * jamais recourir à `any`, et sans toucher au test.
 */
export function pickFeaturedEntry<T extends object>(
  entries: (T & { featured?: boolean })[],
): T | null {
  return entries.find((entry) => entry.featured) ?? entries[0] ?? null;
}

/**
 * Comparateurs de tri. `none` préserve l'ordre canonique de la collection —
 * chaque lib de collection (posts.ts, projects.ts, prompts.ts, skills.ts) l'a
 * déjà appliqué côté serveur, on ne le recalcule pas ici.
 */
const COMPARATORS: Record<Exclude<SortOrder, 'none'>, (a: ListEntry, b: ListEntry) => number> = {
  recent: (a, b) => b.date - a.date,
  oldest: (a, b) => a.date - b.date,
  shortest: (a, b) => a.minutes - b.minutes,
  longest: (a, b) => b.minutes - a.minutes,
};

export function computeListState(
  entries: ListEntry[],
  selected: FacetSelection,
  order: SortOrder,
  labels: ListLabels,
  options: ListOptions = {},
): ListState {
  const filtered = entries.filter((entry) => matchesFacets(entry.facets, selected));

  // Ne mute jamais le tableau reçu (leçon de sortProjects, Plan 3).
  const sorted = order === 'none' ? [...filtered] : [...filtered].sort(COMPARATORS[order]);

  // R5 : l'entrée à la une n'existe QUE sans filtre. Règle de dérivation de la
  // spec §6.1 : `featured: true` là où le champ existe, à défaut la première
  // entrée de **l'ordre canonique de la collection**.
  //
  // `entries` et NON `sorted` : c'est l'ordre canonique que la spec nomme, et
  // c'est aussi ce que le serveur calcule quand il choisit la carte à rendre
  // dans le bloc « à la une ». Dériver du tableau trié les ferait diverger dès
  // qu'un tri est actif (le cas de `/blog`) : le slot serveur porterait une
  // entrée, le client en désignerait une autre, le slot n'afficherait donc
  // rien — et l'entrée désignée serait AUSSI retirée de la grille par la ligne
  // suivante. Une entrée disparaîtrait de la page tout en restant comptée.
  // L'entrée à la une n'existant que sans facette active, `entries` et le
  // tableau filtré sont alors identiques : aucune information n'est perdue.
  //
  // Plan 12 (D75) : une page sans bloc « à la une » (`featured: false`) n'en
  // désigne aucune — toutes ses entrées restent dans la liste et suivent le tri.
  const featured =
    options.featured === false || isAnyFacetActive(selected) ? null : pickFeaturedEntry(entries);

  const visibleIds = sorted.filter((entry) => entry.id !== featured?.id).map((entry) => entry.id);

  // R4 : le compte est celui des cartes RÉELLEMENT visibles — l'entrée à la une
  // en fait partie.
  const count = visibleIds.length + (featured ? 1 : 0);

  const active = activeFacets(selected, labels);
  // Fix 1 (revue finale de Plan 7) : le français accorde le singulier après
  // zéro comme après un — « 0 prompt », jamais « 0 prompts ». P-13 avait déjà
  // corrigé « 1 projets » ; `count === 1` laissait passer le cas symétrique.
  const noun = count <= 1 ? labels.singular : labels.plural;
  const meta = [`${count} ${noun}`, ...metaFacets(selected, labels)].join(' · ');

  // R6 : contextualisé — le message nomme les facettes actives. Prose, donc
  // jamais en `font-mono` (contrainte globale n°7).
  const empty =
    count > 0
      ? null
      : active.length > 0
        ? `Aucun ${labels.singular} pour ${joinWithEt(active)}.`
        : `Aucun ${labels.singular} à afficher.`;

  return { visibleIds, count, featuredId: featured?.id ?? null, meta, empty };
}

/**
 * Ordre des entrées DANS le DOM de la grille (plan 12, F4) : les visibles dans
 * l'ordre calculé (`visibleIds`), puis les masquées — l'entrée à la une,
 * les entrées filtrées — dans l'ordre canonique reçu (`ids`, celui du rendu
 * serveur). Le script déplace les nœuds selon cet ordre : un `order` CSS
 * suffirait au visuel mais laisserait l'ordre de tabulation et de lecture
 * d'écran à l'ordre serveur. Un id visible inconnu est ignoré ; aucun id n'est
 * dupliqué ; les tableaux reçus ne sont pas mutés.
 */
export function domOrder(ids: readonly string[], visibleIds: readonly string[]): string[] {
  const known = new Set(ids);
  const visible = [...new Set(visibleIds.filter((id) => known.has(id)))];
  const shown = new Set(visible);
  return [...visible, ...ids.filter((id) => !shown.has(id))];
}
