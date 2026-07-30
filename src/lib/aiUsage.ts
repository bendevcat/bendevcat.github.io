/**
 * Source de vérité unique pour la transparence IA (déclarée par article via
 * `aiUsage` dans le frontmatter blog, cf. content.config.ts).
 *
 * Réutilisé par :
 * - `ArticleCard.astro` (Plan 1 / C1) → puce compacte emoji + label sur les cartes.
 * - `AiBanner.astro` (Plan 1 / C3) → bannière détaillée sur la page article.
 *
 * Garder ce module comme unique endroit où les libellés/emoji/couleurs sont
 * définis évite que la carte et la bannière divergent (DRY).
 */

export type AiUsage = 'none' | 'partial' | 'full';

interface AiUsageMeta {
  emoji: string;
  label: string;
  /** Phrase courte (FR) expliquant le niveau de contribution IA — bannière article. */
  description: string;
  /**
   * Classes Tailwind de la bannière colorée (page article). Échelle couleur
   * design §6 (« à confirmer ») : none→ardoise (slate), partial→ambre (amber),
   * full→bleu (blue) — pour ne pas se confondre avec le vert des tags/accent.
   * Palette par défaut Tailwind (pas de token `--color-*` dédié), variante
   * `dark:` pilotée par le même `@custom-variant dark` que le reste du site.
   */
  bannerClass: string;
}

export const AI_USAGE_META: Record<AiUsage, AiUsageMeta> = {
  none: {
    emoji: '✍️',
    label: '100% humain',
    description: "Cet article est rédigé intégralement par un humain, sans assistance d'IA.",
    bannerClass:
      'border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200',
  },
  partial: {
    emoji: '🤝',
    label: 'co-créé avec IA',
    description: "Cet article a été co-écrit avec l'aide d'une IA, puis relu et corrigé par un humain.",
    bannerClass:
      'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
  },
  full: {
    emoji: '🤖',
    label: 'IA relue',
    description: "Cet article a été rédigé par une IA, puis relu et vérifié par un humain avant publication.",
    bannerClass:
      'border-blue-300 bg-blue-100 text-blue-900 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-200',
  },
};
