// src/components/skill/SkillInfos.test.ts
//
// Panneau `infos` de la fiche skill (plan 17, F1 ; Reachability « tag chips ›
// `/tags/<tag>/` ») : chaque puce de tag est un lien vers `/tags/<tagSlug>/`,
// garde son ton (`data-tag` = slug, `data-tone`), et se pose dans un `<li>`
// d'une liste nommée par le libellé `tags` du `<dl>`.
import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import SkillInfos from './SkillInfos.astro';
import { tagSlug, tagTone } from '../../lib/tags';

const base = {
  type: 'claude-code',
  version: 'v1.0.0',
  license: 'MIT',
  summary: null,
  updated: null,
};

async function render(tags: string[]) {
  const container = await AstroContainer.create();
  return container.renderToString(SkillInfos, { props: { ...base, tags } });
}

describe('SkillInfos tag chips (plan 17, F1)', () => {
  it('links every tag chip to /tags/<tagSlug>/ with its tone', async () => {
    const tags = ['Claude Code', 'Sécurité', 'devops'];
    const html = await render(tags);
    const anchors = [...html.matchAll(/<a\b[^>]*\sdata-tag="[^"]*"[^>]*>/g)].map((m) => m[0]);
    expect(anchors).toHaveLength(tags.length);
    tags.forEach((tag, i) => {
      expect(anchors[i]).toContain(`href="/tags/${tagSlug(tag)}/"`);
      expect(anchors[i]).toContain(`data-tag="${tagSlug(tag)}"`);
      expect(anchors[i]).toContain(`data-tone="${tagTone(tag)}"`);
      expect(anchors[i]).toContain('rounded-pill');
    });
  });

  it('wraps each chip link in a list item of a list named by the tags label', async () => {
    const html = await render(['devops', 'terminal']);
    const list = html.match(/<ul\b[^>]*>[\s\S]*?<\/ul>/)?.[0] ?? '';
    expect(list).toMatch(/<ul\b[^>]*\saria-labelledby="([^"]+)"/);
    const id = list.match(/aria-labelledby="([^"]+)"/)?.[1];
    expect(html).toMatch(new RegExp(`<dt\\b[^>]*\\sid="${id}"[^>]*>tags</dt>`));
    expect(list.match(/<li\b[^>]*>\s*<a\b[^>]*href="\/tags\/[^"]+\/"/g)).toHaveLength(2);
    // Pas de puce `<li data-tag>` restante : une seule puce par tag.
    expect(list).not.toMatch(/<li\b[^>]*\sdata-tag=/);
  });

  it('renders no tags row without tags', async () => {
    const html = await render([]);
    expect(html).not.toContain('/tags/');
    expect(html).not.toMatch(/<ul\b/);
  });
});
