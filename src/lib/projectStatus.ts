/**
 * Source de vérité unique pour l'affichage du statut d'un projet
 * (`status` dans le frontmatter, cf. content.config.ts → PROJECT_STATUSES).
 *
 * Réutilisé par `ProjectCard.astro` (puce sur la carte) et par la fiche
 * `src/pages/projets/[...slug].astro`. Même rôle que `src/lib/aiUsage.ts` :
 * garder les libellés et les couleurs à UN endroit évite que la carte et la
 * fiche divergent.
 *
 * Palette : `actif` réutilise l'accent du site (tokens `--color-acc*`) ;
 * `wip` prend l'ambre par défaut de Tailwind — comme la bannière `partial`
 * de aiUsage.ts — pour ne pas se confondre avec le vert ; `archivé` reste
 * neutre (tokens `--color-line` / `--color-muted`).
 */
export type ProjectStatus = 'actif' | 'wip' | 'archivé';

interface ProjectStatusMeta {
  label: string;
  /** Classes de la puce — bordure + fond + texte. */
  chipClass: string;
}

export const PROJECT_STATUS_META: Record<ProjectStatus, ProjectStatusMeta> = {
  actif: {
    label: 'actif',
    chipClass: 'border-acc/40 bg-acc-dim text-acc',
  },
  wip: {
    label: 'wip',
    chipClass:
      'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
  },
  'archivé': {
    label: 'archivé',
    chipClass: 'border-line bg-surface text-muted',
  },
};
