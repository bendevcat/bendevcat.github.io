/**
 * Source de vérité unique pour la transparence IA (déclarée par article via
 * `aiUsage` dans le frontmatter blog, cf. content.config.ts).
 *
 * Réutilisé par :
 * - `blog/ArticleRow.astro` (plan 12, T5 ; carte d'article au Plan 1 / C1) →
 *   marqueur compact emoji + label sur les lignes de /blog.
 * - `AiBanner.astro` (Plan 1 / C3) → bannière détaillée sur la page article.
 *
 * Garder ce module comme unique endroit où les libellés/emoji/tons sont
 * définis évite que la carte et la bannière divergent (DRY).
 */

import { TONE_CLASSES, type Tone } from './tones';

export type AiUsage = 'none' | 'partial' | 'full';

interface AiUsageMeta {
  emoji: string;
  label: string;
  /** Phrase courte (FR) expliquant le niveau de contribution IA — bannière article. */
  description: string;
  /**
   * Ton du contrat §2.3 (plan 10, D40) : `none` vert, `partial` ambre, `full`
   * bleu — les couleurs des marqueurs du prototype, prises dans les 5 tons
   * de tags plutôt que dans des tokens propres à l'IA. Les trois niveaux sont
   * donc distincts entre eux, et du fond `bg` (aplat teinté + bordure).
   */
  tone: Tone;
  /**
   * Classes de la bannière colorée (page article, /transparence-ia) :
   * fond / texte / bordure du ton, lues dans `TONE_CLASSES` — jamais écrites
   * ici, et plus aucune couleur de la palette Tailwind (R13). Un seul jeu de
   * classes pour les deux thèmes : les tokens `--color-tag*` sont redéfinis
   * sous `:root[data-theme="dark"]` (src/styles/global.css). Remplace le
   * `border-line bg-chip text-ink` / ambre / bleu Tailwind du plan 6 (D02).
   */
  bannerClass: string;
}

/**
 * Déclaration des niveaux. Garder `emoji` puis `label` côte à côte et entre
 * apostrophes simples : scripts/check-home.mjs lit ces paires dans ce source.
 */
const LEVELS: Record<AiUsage, Omit<AiUsageMeta, 'bannerClass'>> = {
  none: {
    emoji: '✍️', label: '100% humain',
    description: "Cet article est rédigé intégralement par un humain, sans assistance d'IA.",
    tone: 'green',
  },
  partial: {
    emoji: '🤝', label: 'co-créé avec IA',
    description: "Cet article a été co-écrit avec l'aide d'une IA, puis relu et corrigé par un humain.",
    tone: 'amber',
  },
  full: {
    emoji: '🤖', label: 'IA relue',
    description: "Cet article a été rédigé par une IA, puis relu et vérifié par un humain avant publication.",
    tone: 'blue',
  },
};

const withBanner = (level: AiUsage): AiUsageMeta => ({
  ...LEVELS[level],
  bannerClass: TONE_CLASSES[LEVELS[level].tone],
});

/** Ordre de déclaration `none`, `partial`, `full` — lu tel quel par la home. */
export const AI_USAGE_META: Record<AiUsage, AiUsageMeta> = {
  none: withBanner('none'),
  partial: withBanner('partial'),
  full: withBanner('full'),
};
