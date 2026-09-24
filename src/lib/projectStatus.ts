/**
 * Source de vérité unique pour l'affichage du statut d'un projet
 * (`status` dans le frontmatter, cf. content.config.ts → PROJECT_STATUSES).
 *
 * Réutilisé par `ProjectCard.astro` (puce sur la carte) et par la fiche
 * `src/pages/projets/[...slug].astro`. Même rôle que `src/lib/aiUsage.ts` :
 * garder les libellés et les couleurs à UN endroit évite que la carte et la
 * fiche divergent.
 *
 * Palette : `actif` réutilise l'accent du site (tokens `--color-accent*`) ;
 * `wip` prend le ton de tag ambre du contrat §2.3 (`TONE_CLASSES.amber`) —
 * comme le niveau IA `partial` de aiUsage.ts (D40, plan 11 D53) — pour ne
 * pas se confondre avec le vert ; `archivé` reste
 * neutre, sur `--color-chip` (« fond de puce neutre », contrat visuel v2 §2)
 * et non sur `--color-surface` : en thème clair `surface` vaut `#FFFFFF`,
 * exactement le fond de la carte qui porte la puce — la puce y était donc
 * invisible (T-D1).
 */
import { TONE_CLASSES } from './tones';

export type ProjectStatus = 'actif' | 'wip' | 'archivé';

interface ProjectStatusMeta {
  label: string;
  /** Classes de la puce — bordure + fond + texte. */
  chipClass: string;
}

export const PROJECT_STATUS_META: Record<ProjectStatus, ProjectStatusMeta> = {
  actif: {
    label: 'actif',
    chipClass: 'border-accent/40 bg-accentSoft text-accent',
  },
  wip: {
    label: 'wip',
    chipClass: TONE_CLASSES.amber,
  },
  'archivé': {
    label: 'archivé',
    chipClass: 'border-line bg-chip text-muted',
  },
};
