import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import AiMarkerCard from '../../components/blog/AiMarkerCard.astro';
import { AI_USAGE_META, type AiUsage } from '../../lib/aiUsage';
import { diskEntries } from './diskEntries';
import {
  findAll,
  hasAttr,
  parseHtml,
  regionText,
  renderToHtml,
  textContent,
  treeH,
  treeNodes,
  type HtmlElement,
  type HtmlNode,
} from './html';
import { articlePreview, type ArticlePreviewData } from './article';
import { resolveBodyImages } from './images';

/**
 * Aperçu des articles (plan 21, R4) : chapô, couverture, prose et carte IA de
 * la page, pour chaque article présent sur le disque (D131 : aucune valeur
 * figée). Les attentes viennent du frontmatter, d'`AI_USAGE_META` et du
 * composant du site (AiMarkerCard.astro, rendu par le conteneur d'Astro).
 */
const articles = await diskEntries('blog');

const classOf = (el: HtmlElement) => el.attrs.class ?? '';

/** La colonne centrale : l'unique enfant élément de la racine `[data-preview]`. */
function column(nodes: readonly HtmlNode[], label: string): HtmlElement {
  const roots = findAll(nodes, hasAttr('data-preview', 'blog'));
  expect(roots, `${label} : racine`).toHaveLength(1);
  const children = roots[0].children.filter((child): child is HtmlElement => typeof child !== 'string');
  expect(children, `${label} : colonne`).toHaveLength(1);
  return children[0];
}

describe('aperçu des articles : la colonne centrale de la page', () => {
  it('lit des articles réels sur le disque', () => {
    expect(articles.length).toBeGreaterThan(0);
  });

  it('chapô, couverture, prose et carte IA de chaque article', () => {
    let covers = 0;
    let cards = 0;
    for (const { name, data } of articles) {
      const fields = data as typeof data & ArticlePreviewData;
      const html = renderToHtml(articlePreview(fields, treeH));
      const col = column(parseHtml(html), name);
      const [lead, ...rest] = col.children.filter((child): child is HtmlElement => typeof child !== 'string');

      // Chapô = `description`.
      expect(lead.tag, name).toBe('p');
      expect(textContent(lead), name).toBe(fields.description);

      // Couverture : une <img> ssi `cover`, alt = coverAlt ?? '' ; sans URL
      // résolue (hors navigateur), pas de src (R12).
      const imgs = rest.filter((el) => el.tag === 'img');
      expect(imgs.length, name).toBe(fields.cover ? 1 : 0);
      if (fields.cover) {
        covers += 1;
        expect(imgs[0].attrs.alt, name).toBe(fields.coverAlt ?? '');
        expect(Object.hasOwn(imgs[0].attrs, 'src'), name).toBe(false);
      }

      // Prose = le corps rendu par le pipeline du site, images résolues à part.
      const prose = rest.filter((el) => classOf(el).split(' ').includes('prose'));
      expect(prose, name).toHaveLength(1);
      expect(fields.bodyHtml, name).not.toBe('');
      expect(html, name).toContain(`<div class="prose mt-[34px]">${resolveBodyImages(fields.bodyHtml!, {})}</div>`);
      if (!fields.bodyHtml!.includes('<img')) expect(html, name).toContain(`${fields.bodyHtml}</div>`);

      // Carte IA = AI_USAGE_META[aiUsage] ; absente sans aiUsage.
      const card = findAll([col], hasAttr('data-ai-card'));
      if (fields.aiUsage) {
        cards += 1;
        const meta = AI_USAGE_META[fields.aiUsage as AiUsage];
        expect(card, name).toHaveLength(1);
        expect(regionText(card), name).toBe(`${meta.emoji} ${meta.label} ${meta.description} ma règle sur l'IA →`);
        expect(findAll(card, hasAttr('data-ai-usage', fields.aiUsage)), name).toHaveLength(1);
        const link = findAll(card, (el) => el.tag === 'a');
        expect(
          link.map((el) => [el.attrs.href, textContent(el)]),
          name,
        ).toEqual([['/transparence-ia/', "ma règle sur l'IA →"]]);
      } else {
        expect(card, name).toHaveLength(0);
      }

      // Ordre de la page : chapô, couverture, prose, carte.
      expect(
        rest.map((el) => (el.tag === 'img' ? 'cover' : Object.hasOwn(el.attrs, 'data-ai-card') ? 'ai' : 'prose')),
        name,
      ).toEqual([...(fields.cover ? ['cover'] : []), 'prose', ...(fields.aiUsage ? ['ai'] : [])]);
    }
    // Le contenu réel exerce la couverture et la carte.
    expect(covers).toBeGreaterThan(0);
    expect(cards).toBeGreaterThan(0);
  });

  it('carte IA = AiMarkerCard du site (même texte, mêmes classes)', async () => {
    const container = await AstroContainer.create();
    for (const usage of Object.keys(AI_USAGE_META) as AiUsage[]) {
      const page = parseHtml(await container.renderToString(AiMarkerCard, { props: { usage } }));
      const preview = treeNodes(articlePreview({ aiUsage: usage }, treeH));
      const a = findAll(preview, hasAttr('data-ai-card'));
      const b = findAll(page, hasAttr('data-ai-card'));
      expect(a, usage).toHaveLength(1);
      expect(b, usage).toHaveLength(1);
      expect(regionText(a), usage).toBe(regionText(b));
      for (const hook of ['data-ai-card', 'data-ai-usage', 'data-tone']) {
        expect(
          findAll(a, hasAttr(hook)).map((el) => [classOf(el), el.attrs[hook]]),
          `${usage} [${hook}]`,
        ).toEqual(findAll(b, hasAttr(hook)).map((el) => [classOf(el), el.attrs[hook]]));
      }
      const tags = (nodes: readonly HtmlNode[]) => findAll(nodes, () => true).map((el) => `${el.tag}.${classOf(el)}`);
      expect(tags(a), usage).toEqual(tags(b));
    }
  });

  it('entrée neuve ou vide : chapô vide, ni couverture ni carte', () => {
    const col = column(treeNodes(articlePreview({}, treeH)), 'vide');
    expect(findAll([col], (el) => el.tag === 'img')).toHaveLength(0);
    expect(findAll([col], hasAttr('data-ai-card'))).toHaveLength(0);
    expect(regionText(col)).toBe('');
    // Un niveau inconnu (saisie en cours) ne produit pas de carte.
    expect(findAll(treeNodes(articlePreview({ aiUsage: 'beaucoup' }, treeH)), hasAttr('data-ai-card'))).toHaveLength(0);
  });

  it('couverture et images du corps : src seulement une fois résolue', () => {
    const data: ArticlePreviewData = {
      description: 'd',
      cover: './c.png',
      bodyHtml:
        '<p><img __ASTRO_IMAGE_="{&#x22;src&#x22;:&#x22;./x.png&#x22;,&#x22;alt&#x22;:&#x22;a&#x22;,&#x22;index&#x22;:0}"></p>',
    };
    const srcs = (images: Record<string, string | null>) =>
      findAll(treeNodes(articlePreview({ ...data, images }, treeH)), (el) => el.tag === 'img').map(
        (el) => el.attrs.src,
      );
    expect(srcs({})).toEqual([undefined, undefined]);
    expect(srcs({ './c.png': './c.png', './x.png': null })).toEqual([undefined, undefined]);
    expect(
      srcs({
        './c.png': 'blob:https://example.test/c',
        './x.png': 'blob:https://example.test/x',
      }),
    ).toEqual(['blob:https://example.test/c', 'blob:https://example.test/x']);
  });
});
