import { describe, it, expect } from 'vitest';
import { absolutizeCssUrls, registerSiteStyle } from './previewStyle';

/**
 * CSS du site dans l'aperçu Sveltia (plan 19, R8). `registerPreviewStyle(css,
 * { raw: true })` pose le CSS dans une feuille `blob:` : une `url(/_astro/…)`
 * racine n'y a pas d'origine et ne se résout pas — les polices ne chargeraient
 * pas. Le CSS est donc rendu absolu vers l'origine de la page avant d'être
 * enregistré.
 */
const ORIGIN = 'https://bencat.dev';

describe('CSS du site dans l’aperçu Sveltia', () => {
  it('rend absolues les url() racine vers l’origine', () => {
    const css = [
      '@font-face{font-family:Nebula Sans;src:url(/_astro/nebula-sans-latin-400-normal.abc.woff2) format("woff2")}',
      '.a{background:url("/img/a.png")}',
      ".b{background:url('/img/b.png')}",
      '.c{background:url( /img/c.png )}',
    ].join('\n');
    expect(absolutizeCssUrls(css, ORIGIN)).toBe(
      [
        '@font-face{font-family:Nebula Sans;src:url(https://bencat.dev/_astro/nebula-sans-latin-400-normal.abc.woff2) format("woff2")}',
        '.a{background:url("https://bencat.dev/img/a.png")}',
        ".b{background:url('https://bencat.dev/img/b.png')}",
        '.c{background:url( https://bencat.dev/img/c.png )}',
      ].join('\n'),
    );
    // Une origine donnée avec une barre finale ne double pas la barre.
    expect(absolutizeCssUrls('.a{src:url(/x.woff2)}', `${ORIGIN}/`)).toBe(
      '.a{src:url(https://bencat.dev/x.woff2)}',
    );
    // Dev (Vite) : chemins racine `/node_modules/…` et `/@fs/…`.
    expect(absolutizeCssUrls('.a{src:url(/@fs/x/y.woff2)}', 'http://localhost:4321')).toBe(
      '.a{src:url(http://localhost:4321/@fs/x/y.woff2)}',
    );
  });

  it('laisse intactes les url absolues, data: et relatives', () => {
    const css = [
      '.a{background:url(https://cdn.example/a.png)}',
      '.b{background:url("http://example.com/b.png")}',
      '.c{background:url(//cdn.example/c.png)}',
      '.d{background:url(data:image/svg+xml;utf8,<svg/>)}',
      ".e{background:url('data:image/png;base64,AAAA')}",
      '.f{background:url(./f.png)}',
      '.g{background:url(../g.png)}',
      '.h{background:url(h.png)}',
      '.i{background:url(#frag)}',
      '.j{content:"/not-a-url"}',
    ].join('\n');
    expect(absolutizeCssUrls(css, ORIGIN)).toBe(css);
  });

  it('enregistre le CSS du site en brut une seule fois', () => {
    const calls: [string, { raw?: boolean } | undefined][] = [];
    const cms = {
      registerPreviewStyle(style: string, options?: { raw?: boolean }) {
        calls.push([style, options]);
      },
    };
    registerSiteStyle(cms, '.prose{color:red}\n@font-face{src:url(/_astro/f.woff2)}', ORIGIN);
    expect(calls).toEqual([
      ['.prose{color:red}\n@font-face{src:url(https://bencat.dev/_astro/f.woff2)}', { raw: true }],
    ]);
  });
});
