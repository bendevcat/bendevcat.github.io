import { describe, it, expect } from 'vitest';
import { findAll, hasAttr, parseHtml, regionText, renderToHtml, textContent, treeH } from './html';

/** Outils d'arbre des aperçus (plan 21, T3) : sérialisation, lecture, texte de région (R8). */
describe('outils d’arbre des aperçus', () => {
  it('sérialise les props comme React DOM', () => {
    const tree = treeH(
      'div',
      { key: 'k', className: 'a b', 'data-x': '', 'data-flag': true, 'aria-hidden': false, style: { boxShadow: 'var(--shadow)', '--v': '1' } },
      treeH('label', { htmlFor: 'f', hidden: true, title: undefined }, 'a < b & "c"'),
      [treeH('br', { key: 1 }), null, false, 'x', 2],
      treeH('div', { dangerouslySetInnerHTML: { __html: '<p>brut</p>' } }),
    );
    expect(tree.key).toBe('k');
    expect(renderToHtml(tree)).toBe(
      '<div class="a b" data-x="" data-flag="true" aria-hidden="false" style="box-shadow:var(--shadow);--v:1">' +
        '<label for="f" hidden="">a &lt; b &amp; "c"</label><br>x2<div><p>brut</p></div></div>',
    );
  });

  it('lit le HTML : attributs, entités, vides, SVG, script, commentaires', () => {
    const nodes = parseHtml(
      '<!DOCTYPE html><!-- c --><div data-a class="x" title=\'q > r\' data-b=v>a&amp;b&#x3C;&nbsp;c' +
        '<img src="i.png" alt="&quot;"><svg><path d="M0"/></svg><script>if (a < b) {}</script><p>t</p></div>',
    );
    expect(nodes).toHaveLength(1);
    const div = nodes[0] as Exclude<(typeof nodes)[number], string>;
    expect(div.attrs).toEqual({ 'data-a': '', class: 'x', title: 'q > r', 'data-b': 'v' });
    expect(div.children[0]).toBe('a&b< c');
    expect(findAll(nodes, (el) => el.tag === 'img')[0].attrs).toEqual({ src: 'i.png', alt: '"' });
    expect(findAll(nodes, (el) => el.tag === 'path')).toHaveLength(1);
    expect(textContent(findAll(nodes, (el) => el.tag === 'script')[0])).toBe('if (a < b) {}');
    expect(findAll(nodes, hasAttr('data-b', 'v'))).toHaveLength(1);
    expect(findAll(nodes, hasAttr('data-b', 'w'))).toHaveLength(0);
  });

  it('texte de région : sans button, [hidden], input, svg, script ; NBSP et blancs réduits', () => {
    const nodes = parseHtml(
      '<section><h2>Titre</h2>\n  <p>un&nbsp;deux<span>trois</span></p>' +
        '<button>Copier</button><p hidden>caché</p><input value="v"><svg><text>s</text></svg>' +
        '<script>x()</script><div><span>fin</span></div></section>',
    );
    expect(regionText(nodes)).toBe('Titre un deux trois fin');
    // Le blanc entre balises (build d'Astro) ne change pas le texte comparé.
    expect(regionText(parseHtml('<p>a</p>\n<p>b</p>'))).toBe(regionText(parseHtml('<p>a</p><p>b</p>')));
    // L'élément de départ lui-même peut être exclu.
    expect(regionText(parseHtml('<div hidden>x</div>'))).toBe('');
  });

  it('un arbre sérialisé se relit à l’identique', () => {
    const tree = treeH('pre', { className: 'p' }, treeH('code', null, ['a\n', treeH('span', { key: 's', 'data-v': 'n' }, '{n}'), '\nb']));
    const nodes = parseHtml(renderToHtml(tree));
    expect(textContent(nodes)).toBe('a\n{n}\nb');
    expect(findAll(nodes, hasAttr('data-v', 'n'))).toHaveLength(1);
  });
});
