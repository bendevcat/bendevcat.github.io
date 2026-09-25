/**
 * Gabarit d'aperçu des articles (plan 21, T4 ; R0, R2, R4 ; D140).
 *
 * Fonction pure `(data, h) => arbre` : ni `window` ni `document`, `data` n'est
 * jamais modifié. Montre la colonne centrale de la page article
 * (src/pages/blog/[...slug].astro), dans sa carte, avec les mêmes classes et
 * les mêmes crochets `data-*` — seules des classes déjà compilées pour le site
 * (le CSS du site ne bouge pas) :
 *
 * 1. le chapô : `description` ;
 * 2. la couverture, si `cover` : une `<img>` dont la `src` n'est posée qu'une
 *    fois résolue (`imageSrc`, D141), `alt` = `coverAlt ?? ''` ;
 * 3. la prose : le corps rendu par le pipeline du site (`bodyHtml`), images
 *    du corps résolues ou sans `src` (`resolveBodyImages`) ;
 * 4. la carte IA (AiMarkerCard.astro), si `aiUsage` est un niveau connu :
 *    emoji, libellé et description d'`AI_USAGE_META`, lien
 *    « ma règle sur l'IA → ».
 *
 * Omis (hors champ du plan) : en-tête, fil d'Ariane, rails, précédent/suivant.
 */
import { AI_USAGE_META, type AiUsage } from '../../lib/aiUsage';
import type { H } from './html';
import { imageSrc, resolveBodyImages, type ResolvedImages } from './images';

export interface ArticlePreviewData {
  id?: string | null;
  description?: string | null;
  cover?: string | null;
  coverAlt?: string | null;
  aiUsage?: string | null;
  body?: string | null;
  /** Corps rendu par `renderBody` (markdown.ts). */
  bodyHtml?: string | null;
  images?: ResolvedImages | null;
}

// Classes recopiées de la page article et d'AiMarkerCard : toutes déjà compilées.
// Le cadre de la page moins sa marge haute (l'en-tête, omis, la justifie).
const FRAME = 'card overflow-hidden';
const COLUMN = 'min-w-0 px-5 pt-7 pb-8 sm:px-10 sm:pt-[34px] sm:pb-11';
const LEAD = 'font-sans text-[17px] leading-[1.6] text-pretty text-muted';
const COVER = 'mt-6 h-[210px] w-full rounded-hero bg-chip object-cover';
const PROSE = 'prose mt-[34px]';
const EASE = 'duration-[220ms] ease-[cubic-bezier(.2,.8,.3,1)] motion-reduce:transition-none';
const AI_CARD = `group card-inner mt-[34px] flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-hero px-[17px] py-4 transition-transform hover:-translate-y-[3px] sm:flex-nowrap ${EASE}`;
const AI_TILE = `inline-flex size-10 shrink-0 items-center justify-center rounded-tile text-[20px] leading-none transition-transform group-hover:scale-[1.06] ${EASE}`;
const AI_LINK =
  'w-full shrink-0 pl-[54px] font-mono text-[11px] text-muted transition-colors hover:text-ink sm:w-auto sm:pl-0';

const isAiUsage = (value: unknown): value is AiUsage =>
  typeof value === 'string' && Object.hasOwn(AI_USAGE_META, value);

/** La carte IA de fin d'article (AiMarkerCard.astro), sans état ni script. */
export function aiCard<N>(usage: AiUsage, h: H<N>): N {
  const meta = AI_USAGE_META[usage];
  return h(
    'div',
    {
      className: AI_CARD,
      role: 'note',
      'aria-label': 'Transparence IA de cet article',
      'data-ai-card': '',
      'data-pagefind-ignore': '',
    },
    h(
      'span',
      {
        className: `${AI_TILE} ${meta.bannerClass}`,
        'data-ai-usage': usage,
        'data-tone': meta.tone,
        'aria-hidden': 'true',
      },
      meta.emoji,
    ),
    h(
      'div',
      { className: 'min-w-0 flex-1' },
      h('p', { className: 'font-sans text-[15.5px] font-semibold text-ink' }, meta.label),
      h(
        'p',
        {
          className: 'mt-[3px] font-sans text-[13.5px] leading-[1.5] text-pretty text-muted',
        },
        meta.description,
      ),
    ),
    // Le lien s'ouvrirait dans l'iframe d'aperçu : une nouvelle fenêtre.
    h(
      'a',
      {
        href: '/transparence-ia/',
        target: '_blank',
        rel: 'noopener',
        className: AI_LINK,
      },
      "ma règle sur l'IA →",
    ),
  );
}

export function articlePreview<N>(data: ArticlePreviewData, h: H<N>): N {
  const images = data.images ?? {};
  const cover = typeof data.cover === 'string' && data.cover !== '' ? data.cover : undefined;
  const aiUsage = isAiUsage(data.aiUsage) ? data.aiUsage : undefined;

  return h(
    'div',
    { className: FRAME, 'data-preview': 'blog' },
    h(
      'div',
      { className: COLUMN },
      h('p', { className: LEAD }, data.description ?? ''),
      cover
        ? h('img', {
            src: imageSrc(cover, images),
            alt: data.coverAlt ?? '',
            loading: 'eager',
            className: COVER,
          })
        : null,
      h('div', {
        className: PROSE,
        dangerouslySetInnerHTML: {
          __html: resolveBodyImages(data.bodyHtml ?? '', images),
        },
      }),
      aiUsage ? aiCard(aiUsage, h) : null,
    ),
  );
}
