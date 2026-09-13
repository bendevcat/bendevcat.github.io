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
   * design §6 (« à confirmer ») : none→neutre, partial→ambre (amber),
   * full→bleu (blue) — pour ne pas se confondre avec le vert des tags/accent.
   *
   * `none` consomme les tokens du contrat §2 (`border-line bg-chip text-ink`) :
   * un seul jeu de classes pour les deux thèmes, sans variante `dark:`, car
   * `--color-line`/`--color-chip`/`--color-ink` sont déjà redéfinis sous
   * `:root[data-theme="dark"]` (src/styles/global.css). `chip` est le rôle
   * « fond de puce neutre » du contrat — c'est l'aplat le plus proche du
   * `bg-slate-100` d'origine, mesuré à une distance de 15.43 du nouveau
   * `--color-bg` clair (`slate-100` n'était plus qu'à 2.24, invisible depuis
   * que `bg` est passé à `#F1F4F7` — cf. handoffs/plan-6-deviations.md D02).
   * `ink` (texte fort) reprend le poids visuel de l'ancien `slate-800`/
   * `slate-200` et reste au même niveau de contraste que `partial`/`full`
   * (amber-900/blue-900, eux aussi très sombres) — 15.03:1 sur `chip` en
   * clair, largement AA. `line` est la bordure structurante par défaut du
   * site (déjà utilisée avec `bg-surface`/`bg-chip` ailleurs, ex.
   * `Header.astro`).
   *
   * `partial` et `full` restent en dehors des 23 tokens (palette Tailwind
   * `amber`/`blue` par défaut) : reportés à P8 par la même entrée D02, avec
   * `SearchDialog`'s `backdrop:bg-black/60`.
   */
  bannerClass: string;
}

export const AI_USAGE_META: Record<AiUsage, AiUsageMeta> = {
  none: {
    emoji: '✍️',
    label: '100% humain',
    description: "Cet article est rédigé intégralement par un humain, sans assistance d'IA.",
    bannerClass: 'border-line bg-chip text-ink',
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
