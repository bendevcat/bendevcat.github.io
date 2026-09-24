/**
 * Logique du patron « détail à onglets » (contrat visuel §5.2, Plan 8).
 *
 * AUCUN import d'`astro:content` : ce module est chargé par le navigateur
 * (src/scripts/detail-tabs.ts) ET par les pages côté serveur ET par les tests
 * unitaires — comme listPattern.ts pour le patron liste.
 *
 * Deux familles de fonctions :
 * - `projectTabs` / `promptTabs` / `skillTabs` décident, côté serveur, QUELS
 *   onglets existent : un onglet n'apparaît que si le contenu existant le
 *   nourrit (D1). Les pages leur passent des faits bruts (corps, présence
 *   d'une couverture, tailles), jamais une entrée de collection.
 * - `computeTabState` / `nextTabIndex` décident, côté client, de l'état
 *   sélectionné et du déplacement clavier. Le script de glue n'a aucune règle
 *   à lui : il lit le DOM, appelle ces fonctions, applique.
 */

export interface Tab {
  /** Suffixe stable ; le composant le préfixe (`tab-` / `tabpanel-`). */
  id: string;
  label: string;
}

export interface TabState {
  selected: boolean;
  /** Roving tabindex (D10) : 0 pour l'onglet sélectionné, -1 pour les autres. */
  tabIndex: 0 | -1;
  panelHidden: boolean;
}

export interface ProjectTabInput {
  body: string | undefined;
  hasCover: boolean;
  stackCount: number;
  /** Articles liés APRÈS `sortAndFilter` : les brouillons sont déjà écartés. */
  relatedCount: number;
}

export interface BodyTabInput {
  body: string | undefined;
}

/**
 * « Vide » = vide après trim. Le texte littéral `No content` n'est PAS vide
 * (D4) : c'est un placeholder conservé volontairement, il nourrit son onglet.
 * `body` peut être `undefined` — c'est le type d'`entry.body` dans Astro.
 */
function isBlank(body: string | undefined): boolean {
  return (body ?? '').trim() === '';
}

/** Ordre d'affichage = ordre de la Tab map du plan 8 ; le premier est sélectionné au chargement. */
export function projectTabs(input: ProjectTabInput): Tab[] {
  const tabs: Tab[] = [];
  if (!isBlank(input.body) || input.hasCover) tabs.push({ id: 'apercu', label: 'Aperçu' });
  if (input.stackCount > 0) tabs.push({ id: 'stack', label: 'Stack' });
  if (input.relatedCount > 0) tabs.push({ id: 'articles-lies', label: 'Articles liés' });
  return tabs;
}

/**
 * Infos est toujours là : `format` et `tool` ont des valeurs par défaut dans le
 * schéma, le panneau a donc toujours de quoi s'afficher. Le corps d'un prompt
 * « guide » va lui aussi sous Pourquoi (D3).
 */
export function promptTabs(input: BodyTabInput): Tab[] {
  const tabs: Tab[] = [];
  if (!isBlank(input.body)) tabs.push({ id: 'pourquoi', label: 'Pourquoi' });
  tabs.push({ id: 'infos', label: 'Infos' });
  return tabs;
}

/** Infos est toujours là : `type` a une valeur par défaut dans le schéma. Corps sous « Aperçu » (D2). */
export function skillTabs(input: BodyTabInput): Tab[] {
  const tabs: Tab[] = [];
  if (!isBlank(input.body)) tabs.push({ id: 'apercu', label: 'Aperçu' });
  tabs.push({ id: 'infos', label: 'Infos' });
  return tabs;
}

/** Moins de deux onglets : pas de rangée, le panneau unique s'affiche nu (D13). */
export function hasTabRow(tabs: Tab[]): boolean {
  return tabs.length >= 2;
}

/**
 * État exclusif (R3) : exactement un onglet sélectionné, un seul panneau
 * visible. Un index hors bornes retombe sur le premier onglet plutôt que de
 * produire un état sans aucun panneau visible.
 */
export function computeTabState(count: number, selected: number): TabState[] {
  const active = Number.isInteger(selected) && selected >= 0 && selected < count ? selected : 0;
  return Array.from({ length: count }, (_, i) => ({
    selected: i === active,
    tabIndex: i === active ? 0 : -1,
    panelHidden: i !== active,
  }));
}

/**
 * Modèle clavier WAI-ARIA des onglets, activation automatique (D10) : les
 * flèches bouclent, Home/End vont aux extrémités. Toute autre touche renvoie
 * `null` — la glue laisse alors le navigateur faire (Tab entre dans le panneau).
 */
export function nextTabIndex(current: number, key: string, count: number): number | null {
  if (count <= 0) return null;
  switch (key) {
    case 'ArrowRight':
      return (current + 1) % count;
    case 'ArrowLeft':
      return (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
