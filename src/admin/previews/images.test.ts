import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { parseFrontmatter } from '@astrojs/markdown-remark';
import { bodyImagePaths, displayableSrc, imageSrc, resolveBodyImages } from './images';
import { renderBody } from './markdown';

/**
 * Images de l'aperçu (plan 21, T2, R12 ; D136, D138). Dans l'iframe de
 * Sveltia, `<base href="<origin>">` fait partir une `src` relative
 * (`./screenshot-….png`) vers l'origine → 404. Une `<img>` rendue n'a donc de
 * `src` que résolue : `blob:`, `data:` ou `http(s):` ; sinon, pas de `src`.
 */
const BLOG_DIR = new URL('../../content/blog/', import.meta.url);
const BIENVENUE = 'bienvenue-dans-mon-foutoir';

function readArticle(slug: string) {
  return parseFrontmatter(readFileSync(new URL(`${slug}/index.md`, BLOG_DIR), 'utf8'));
}

/** Balises `<img>` du HTML et leurs attributs (HTML de rehype-stringify / de resolveBodyImages). */
function imgs(html: string): Array<Record<string, string>> {
  return [...html.matchAll(IMG)].map(([, attrs]) =>
    Object.fromEntries([...attrs.matchAll(/([^\s=]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, v ?? ''])),
  );
}

/** Balise `<img>`, `>` permis dans une valeur entre guillemets. */
const IMG = /<img\b((?:[^>"']|"[^"]*"|'[^']*')*)>/g;

const ALLOWED = /^(blob:|data:|https?:)/;

describe('images de l’aperçu', () => {
  it('aucune <img> rendue n’a de src relative : blob:, data:, http(s): ou pas de src', async () => {
    const { content } = readArticle(BIENVENUE);
    const written = [...content.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)].map((m) => m[1]);
    expect(written).toHaveLength(3);

    const html = await renderBody(content);
    // Le corps rendu ne porte que des repères sans src (comme au build).
    expect(bodyImagePaths(html)).toEqual([...new Set(written)]);

    // Non résolues (état initial de getAsset : chemin relatif, ou rien) → pas de src.
    for (const images of [{}, Object.fromEntries(written.map((p) => [p, p])), Object.fromEntries(written.map((p) => [p, null]))]) {
      const tags = imgs(resolveBodyImages(html, images));
      expect(tags).toHaveLength(3);
      for (const tag of tags) {
        expect(tag).not.toHaveProperty('src');
        expect(tag).not.toHaveProperty('__ASTRO_IMAGE_');
      }
      expect(tags.map((t) => t.alt)).toEqual(['disclosure-full-ai', 'disclosure-partial-ai', 'disclosure-full-human']);
    }

    // Résolues → exactement l'URL donnée.
    const blobs = Object.fromEntries(written.map((p, i) => [p, `blob:http://localhost:4321/0000-${i}`]));
    const resolved = imgs(resolveBodyImages(html, blobs));
    expect(resolved.map((t) => t.src)).toEqual(written.map((p) => blobs[p]));

    // Une seule résolue : elle seule a une src.
    const one = imgs(resolveBodyImages(html, { [written[1]]: 'data:image/png;base64,AAAA' }));
    expect(one.map((t) => t.src)).toEqual([undefined, 'data:image/png;base64,AAAA', undefined]);

    // Couverture, même règle.
    const { frontmatter } = readArticle(BIENVENUE);
    const cover = frontmatter.cover as string;
    expect(cover).toMatch(/^\.\//);
    expect(imageSrc(cover, {})).toBeUndefined();
    expect(imageSrc(cover, { [cover]: cover })).toBeUndefined();
    expect(imageSrc(cover, { [cover]: null })).toBeUndefined();
    expect(imageSrc(cover, { [cover]: 'blob:http://localhost:4321/c' })).toBe('blob:http://localhost:4321/c');
    expect(imageSrc(undefined, {})).toBeUndefined();
    expect(imageSrc('https://example.com/a.png', {})).toBe('https://example.com/a.png');
  });

  it('chaque article sur le disque : pas de src relative une fois résolu à vide', async () => {
    const slugs = readdirSync(BLOG_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(new URL(`${d.name}/index.md`, BLOG_DIR)))
      .map((d) => d.name);
    expect(slugs).toContain(BIENVENUE);
    for (const slug of slugs) {
      const out = resolveBodyImages(await renderBody(readArticle(slug).content), {});
      for (const tag of imgs(out)) {
        if ('src' in tag) expect(tag.src, slug).toMatch(ALLOWED);
      }
      expect(out, slug).not.toContain('__ASTRO_IMAGE_');
    }
  });

  it('HTML brut, URL distantes et schémas refusés', () => {
    const html = [
      '<p><img src="./a.png" alt="brut > net"></p>',
      '<img src="/racine.png" alt="racine">',
      '<img src="https://example.com/x.png" alt="distante" title="t">',
      '<img src="javascript:alert(1)" alt="js">',
      '<img class="c" __ASTRO_IMAGE_="{&#x22;src&#x22;:&#x22;./b &#x26; c.png&#x22;,&#x22;alt&#x22;:&#x22;a \\&#x22;q\\&#x22; &#x3C;b>&#x22;,&#x22;index&#x22;:0}">',
    ].join('\n');
    expect(bodyImagePaths(html)).toEqual(['./a.png', '/racine.png', './b & c.png']);
    const out = resolveBodyImages(html, { './a.png': 'blob:x/1', './b & c.png': 'blob:x/2' });
    expect(imgs(out)).toEqual([
      { src: 'blob:x/1', alt: 'brut > net' },
      { alt: 'racine' },
      { src: 'https://example.com/x.png', alt: 'distante', title: 't' },
      { alt: 'js' },
      { class: 'c', src: 'blob:x/2', alt: 'a &#x22;q&#x22; &#x3C;b&#x3E;' },
    ]);
    // Le reste du HTML est intact.
    expect(out.replace(IMG, '<img>')).toBe(html.replace(IMG, '<img>'));
    expect(displayableSrc('blob:x')).toBe('blob:x');
    expect(displayableSrc('DATA:image/png;base64,A')).toBe('DATA:image/png;base64,A');
    expect(displayableSrc('http://a/b')).toBe('http://a/b');
    expect(displayableSrc('./x.png')).toBeUndefined();
    expect(displayableSrc('//evil/x.png')).toBeUndefined();
    expect(displayableSrc(null)).toBeUndefined();
  });
});
