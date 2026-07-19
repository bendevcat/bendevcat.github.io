/**
 * Source de vérité unique pour la transparence IA (déclarée par article via
 * `aiUsage` dans le frontmatter blog, cf. content.config.ts).
 *
 * Réutilisé par :
 * - `ArticleCard.astro` (Plan 1 / C1) → puce compacte emoji + label sur les cartes.
 * - `AiBanner.astro` (Plan 1 / C3, à venir) → bannière détaillée sur la page article.
 *
 * Garder ce module comme unique endroit où les libellés/emoji sont définis
 * évite que la carte et la bannière divergent (DRY).
 */

export type AiUsage = 'none' | 'partial' | 'full';

export const AI_USAGE_META: Record<AiUsage, { emoji: string; label: string }> = {
  none: { emoji: '✍️', label: '100% humain' },
  partial: { emoji: '🤝', label: 'co-créé avec IA' },
  full: { emoji: '🤖', label: 'IA relue' },
};
